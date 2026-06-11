/**
 * Capture-ledger to planning-store mapping (SCHEMA-CONTRACT.md section
 * "Capture ledger and planning store reconciliation").
 *
 * The Postgres event_applications table is the durable intake ledger; the
 * BlockSuite/Yjs civic database is the planning store. This module maps a
 * ledger row (the EventApplications GraphQL shape) onto CivicObjectFields
 * for one-way ingestion keyed sourceKey == sourceId. Headless-safe: no
 * BlockSuite imports, so the Next client can bundle it directly.
 */

import {
  CIVIC_CATEGORIES,
  FLINT_BASED,
  IMPORT_FIELD_ALIASES,
  MULTI_SELECT_KEYS,
  PLANNING_STATUSES,
  serializeCivicLocation,
  type CivicCategory,
  type CivicFieldKey,
  type CivicObjectFields,
  type PlanningStatus,
} from './civic-object-schema';

/** The EventApplications query row shape this mapper consumes. */
export interface EventApplicationLedgerRow {
  id: string;
  category: string;
  displayName: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  city: string | null;
  bio: string | null;
  flintBased: boolean;
  accessNeeds: string | null;
  categoryPayload: Record<string, unknown>;
  planningPayload: Record<string, unknown>;
  status: string;
  location: Record<string, unknown> | null;
  setTime: string | null;
  sourceKey: string;
  createdAt: string | null;
}

const CATEGORY_TITLE_KEY: Record<CivicCategory, CivicFieldKey> = {
  musician: 'artistName',
  vendor: 'businessName',
  entertainer: 'actName',
  other: 'orgName',
  something_else: 'orgName',
};

function isCivicCategory(value: string): value is CivicCategory {
  return (CIVIC_CATEGORIES as readonly string[]).includes(value);
}

function isPlanningStatus(value: string): value is PlanningStatus {
  return (PLANNING_STATUSES as readonly string[]).includes(value);
}

/** Comma-split tolerance for forms that flattened multi-selects to text. */
function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value.filter(
      (v): v is string => typeof v === 'string' && v.trim() !== '',
    );
    return items.length ? items : undefined;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return undefined;
}

function geoJsonPointToLocation(
  geo: Record<string, unknown> | null,
): string | undefined {
  if (!geo) return undefined;
  const coords = (geo as { coordinates?: unknown }).coordinates;
  if (
    Array.isArray(coords) &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number'
  ) {
    return serializeCivicLocation({ lng: coords[0], lat: coords[1] });
  }
  return undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Map one ledger row onto the civic-object schema. categoryPayload keys are
 * taken verbatim when they are schema keys, routed through
 * IMPORT_FIELD_ALIASES when legacy, and reported in `droppedKeys` when
 * neither, so nothing disappears silently.
 */
export function mapEventApplicationToCivicFields(
  row: EventApplicationLedgerRow,
): { fields: CivicObjectFields; droppedKeys: string[] } {
  const category: CivicCategory = isCivicCategory(row.category)
    ? row.category
    : 'other';

  const fields: CivicObjectFields = {
    category,
    name: row.contactName ?? row.displayName,
    email: row.contactEmail,
    sourceId: row.sourceKey,
  };

  if (row.contactPhone) fields.phone = row.contactPhone;
  if (row.city) fields.city = row.city;
  if (row.bio) fields.bio = row.bio;
  if (row.accessNeeds) fields.accessNeeds = row.accessNeeds;
  if (row.createdAt) fields.submittedAt = row.createdAt;

  // flint_based boolean is lossy against the form tri-state; prefer the raw
  // flintConnection from categoryPayload, fall back to boolean true -> yes,
  // and leave false undefined rather than guessing nearby vs outside.
  const rawConnection = row.categoryPayload['flintConnection'];
  if (
    typeof rawConnection === 'string' &&
    (FLINT_BASED as readonly string[]).includes(rawConnection)
  ) {
    fields.flintBased = rawConnection as (typeof FLINT_BASED)[number];
  } else if (row.flintBased) {
    fields.flintBased = 'yes';
  }

  const droppedKeys: string[] = [];
  const mutableFields = fields as unknown as Record<string, unknown>;
  for (const [rawKey, rawValue] of Object.entries(row.categoryPayload)) {
    if (rawKey === 'flintConnection') continue;
    if (rawValue == null || rawValue === '') continue;
    const key = (IMPORT_FIELD_ALIASES[rawKey] ?? rawKey) as string;
    const isKnown =
      key in fields ||
      [
        'artistName', 'genre', 'musicLink', 'musicLink2', 'bandSize',
        'porchfestHistory', 'canDoThirty', 'equipment', 'ownPA', 'setLength',
        'businessName', 'foodDescription', 'foodType', 'vendorLink',
        'footprint', 'vendorNeeds', 'vendedBefore', 'actName', 'actType',
        'actDescription', 'workLink', 'orgName', 'proposal', 'otherLinks',
        'phone', 'city', 'bio', 'accessNeeds', 'name', 'email',
      ].includes(key);
    if (!isKnown) {
      droppedKeys.push(rawKey);
      continue;
    }
    if ((MULTI_SELECT_KEYS as readonly string[]).includes(key)) {
      const arr = toStringArray(rawValue);
      if (arr) mutableFields[key] = arr;
    } else if (typeof rawValue === 'boolean') {
      // Form booleans (canDoThirty, ownPA) land as yes/no selects.
      mutableFields[key] = rawValue ? 'yes' : 'no';
    } else {
      mutableFields[key] = String(rawValue);
    }
  }

  // Planning snapshot from capture time. The CRDT store owns planning state
  // after ingestion; these are initial values only.
  const planning = row.planningPayload;
  if (typeof planning['accepted'] === 'boolean' && planning['accepted']) {
    fields.accepted = true;
  }
  if (typeof planning['contacted'] === 'boolean' && planning['contacted']) {
    fields.contacted = true;
  }
  const square = objectValue(planning['square']);
  const squareAmountCents = square?.['amountCents'];
  const billingRequestId = square?.['billingRequestId'];
  if (typeof billingRequestId === 'string' && billingRequestId) {
    fields.billingRef = billingRequestId;
  }
  if (typeof squareAmountCents === 'number') {
    fields.feePaid = squareAmountCents / 100;
  } else if (typeof planning['fee'] === 'number') {
    fields.feePaid = planning['fee'];
  }
  if (typeof planning['payment_to_band'] === 'number') {
    fields.paymentToBand = planning['payment_to_band'];
  }
  if (typeof planning['set_time'] === 'string' && planning['set_time']) {
    fields.setTime = planning['set_time'];
  } else if (row.setTime) {
    fields.setTime = row.setTime;
  }

  fields.status = isPlanningStatus(row.status) ? row.status : 'submitted';

  const location = geoJsonPointToLocation(row.location);
  if (location) fields.location = location;

  // displayName is the public title; make sure the category title field
  // carries it when the payload did not.
  const titleKey = CATEGORY_TITLE_KEY[category];
  if (!mutableFields[titleKey] && row.displayName) {
    mutableFields[titleKey] = row.displayName;
  }

  return { fields, droppedKeys };
}
