/**
 * Civic-object schema: the single shared contract for the Civic Atlas
 * event-planning platform (first run: Porchfest 2026).
 *
 * One civic object per applicant, discriminated by `category`. Intake (the
 * public form), the planning workspace (BlockSuite database), and the
 * geospatial layer all read and write THIS field set. The backend intake
 * resolver binds to the same keys via SCHEMA-CONTRACT.md in the planner
 * folder (our-civic-atlas-backend/docs/"Planning the planner ").
 *
 * Field keys are bound to the REAL CTHNA form fields (porchfest-2026 at
 * a27715e), per the build plan's grounding contract: "bound to the real form
 * fields rather than invented ones." Where the high-level spec named fields
 * the live form does not collect (setLength, history), they are retained as
 * optional columns so the surviving Formspree export imports without loss.
 *
 * Categories are the four real ones from the form. The spec's three-way
 * split collapsed vendor into "organization or vendor"; the form separates
 * them and vendors carry businessName/foodDescription, so vendor is its own
 * category here and `other` carries orgName/proposal.
 */

export const CIVIC_CATEGORIES = [
  'musician',
  'vendor',
  'entertainer',
  'other',
  // Open-ended fifth intake lane (2026-06-11): 'other' presents as "Goods
  // and Services" on the form; something_else is the true catch-all with
  // contact intake plus a "tell us what you do" pitch. It reuses the
  // other-scope columns (orgName, proposal), so no new schema columns.
  'something_else',
  // Sponsor interest (2026-06-12): the brand-site sponsor form submits the
  // same submitEventApplication mutation as every other intake, with category
  // 'sponsor'. Sponsor-specific fields (tier, sponsoringAs) ride in
  // categoryPayload; this value just lets the workspace surface them as
  // sponsors instead of folding them into the 'other' catch-all.
  'sponsor',
] as const;
export type CivicCategory = (typeof CIVIC_CATEGORIES)[number];

/** Option lists, verbatim from CTHNA porchfest-2026 src/porchfest-data.jsx. */
export const BAND_SIZES = [
  'Solo',
  'Duo',
  '3-5 members',
  '6+ members',
  'DJ / electronic',
] as const;

export const SETUP_NEEDS = [
  'Power outlet',
  'Extra chairs',
  'Shade / canopy',
  'Parking for van',
  'Ground-level access',
  'Table',
] as const;

export const FOOD_TYPES = [
  'BBQ / Grill',
  'Soul Food',
  'Coney / Hot Dogs',
  'Burgers / Fries',
  'Sandwiches / Subs',
  'Pizza',
  'Mexican / Tex-Mex',
  'Asian / Stir Fry',
  'Caribbean',
  'Mediterranean / Middle Eastern',
  'Polish / European',
  'Seafood',
  'Vegan / Vegetarian',
  'Desserts / Baked Goods',
  'Ice Cream / Frozen Treats',
  'Coffee / Tea',
  'Beverages',
  'Snacks / Concessions',
  'Other',
] as const;

export const VENDOR_NEEDS = [
  'Power outlet',
  'Water access',
  'Extra table',
  'Shade / canopy',
  'Parking for truck',
  'Waste disposal',
] as const;

export const ENT_TYPES = [
  'Comedy / Stand-up',
  'Dance',
  'Spoken Word / Poetry',
  'Visual Art / Chalk',
  'Magic / Circus',
  'Theater / Improv',
  'Other',
] as const;

export const PORCHFEST_HISTORY = ['first', 'returning'] as const;
export const FLINT_BASED = ['yes', 'nearby', 'outside'] as const;
export const YES_NO = ['yes', 'no'] as const;

/**
 * Planning workflow states. `submitted` is the intake-time value; everything
 * else is organizer-set. The kanban view groups on this column.
 */
export const PLANNING_STATUSES = [
  'submitted',
  'in-review',
  'contacted',
  'accepted',
  'payment_requested',
  'declined',
  'waitlisted',
] as const;
export type PlanningStatus = (typeof PLANNING_STATUSES)[number];

/**
 * Figure-library keys: every renderable figure the planner map can show for
 * a civic object. The list lives HERE (not beside the geometry) because it
 * is contract: the `figureKey` planning column's select options, the
 * resolver's output domain, and the atlas figure library all bind to it.
 * Geometry stays in src/lib/atlas/porchfest-figure-library.ts so the civic
 * editor bundle never imports luma.gl. Adding a figure = add the key here
 * plus its geometry entry in the library (the library is typed exhaustive
 * over these keys, so forgetting the entry fails the typecheck).
 */
export const CIVIC_FIGURE_KEYS = [
  'musician-solo',
  'musician-band',
  'musician-dj',
  'vendor-tent',
  'vendor-table',
  'vendor-cart',
  'food-truck',
  'food-cart',
  'food-grill',
  'entertainer-stage',
  'entertainer-dance',
  'entertainer-art',
  'marker',
] as const;
export type CivicFigureKey = (typeof CIVIC_FIGURE_KEYS)[number];

/**
 * Column value types, mapped 1:1 onto BlockSuite 0.22.4 property presets
 * (@blocksuite/data-view propertyPresets + database link/rich-text configs):
 *
 *   text         -> propertyPresets.textPropertyConfig
 *   select       -> propertyPresets.selectPropertyConfig
 *   multi-select -> propertyPresets.multiSelectPropertyConfig
 *   checkbox     -> propertyPresets.checkboxPropertyConfig
 *   number       -> propertyPresets.numberPropertyConfig
 *   date         -> propertyPresets.datePropertyConfig
 *   link         -> databaseBlockProperties.linkColumnConfig
 */
export type CivicColumnType =
  | 'text'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'number'
  | 'date'
  | 'link';

/** Which records carry a column. */
export type CivicColumnScope = 'shared' | 'planning' | CivicCategory;

export interface CivicColumnSpec {
  /** Stable field key: intake payload key AND workspace column identity. */
  key: string;
  /** Human label shown as the database column name. */
  name: string;
  type: CivicColumnType;
  /** Allowed values for select / multi-select columns. */
  options?: readonly string[];
  /** Who carries the field. Shared and planning columns exist on every record. */
  scope: CivicColumnScope;
  /** Categories whose intake validation requires the field. */
  requiredFor?: readonly CivicCategory[];
  note?: string;
}

/**
 * The civic-object column set, in workspace display order.
 *
 * Planning columns exist on every record from creation (empty except
 * status='submitted') and are organizer-editable per FR-008. Payment fields
 * are amounts only; billing records live in the separate Postgres store and
 * are referenced by `billingRef` (FR-014).
 */
export const CIVIC_OBJECT_COLUMNS: readonly CivicColumnSpec[] = [
  // Shared contact + provenance
  { key: 'category', name: 'Category', type: 'select', options: CIVIC_CATEGORIES, scope: 'shared', requiredFor: [...CIVIC_CATEGORIES] },
  { key: 'name', name: 'Contact Name', type: 'text', scope: 'shared', requiredFor: [...CIVIC_CATEGORIES] },
  { key: 'email', name: 'Email', type: 'text', scope: 'shared', requiredFor: [...CIVIC_CATEGORIES], note: 'Duplicate detection key (edge case: repeat submissions).' },
  { key: 'phone', name: 'Phone', type: 'text', scope: 'shared' },
  { key: 'city', name: 'City', type: 'text', scope: 'shared' },
  { key: 'bio', name: 'Bio', type: 'text', scope: 'shared', requiredFor: ['musician'] },
  { key: 'flintBased', name: 'Flint Based', type: 'select', options: FLINT_BASED, scope: 'shared' },
  { key: 'accessNeeds', name: 'Accessibility Needs', type: 'text', scope: 'shared' },
  { key: 'submittedAt', name: 'Submitted At', type: 'date', scope: 'shared', note: 'ISO datetime at intake; import keeps the original timestamp.' },
  { key: 'submissionFlag', name: 'Submission Flag', type: 'text', scope: 'shared' },
  { key: 'sourceId', name: 'Source Id', type: 'text', scope: 'shared', note: 'Provenance, e.g. formspree:<id> for imported records; dedup aid.' },

  // Musician
  { key: 'artistName', name: 'Artist / Band', type: 'text', scope: 'musician', requiredFor: ['musician'] },
  { key: 'genre', name: 'Genre', type: 'text', scope: 'musician', requiredFor: ['musician'] },
  { key: 'musicLink', name: 'Music Link', type: 'link', scope: 'musician', requiredFor: ['musician'] },
  { key: 'musicLink2', name: 'Second Link', type: 'link', scope: 'musician' },
  { key: 'bandSize', name: 'Band Size', type: 'select', options: BAND_SIZES, scope: 'musician' },
  { key: 'porchfestHistory', name: 'Porchfest History', type: 'select', options: PORCHFEST_HISTORY, scope: 'musician', requiredFor: ['musician'] },
  { key: 'canDoThirty', name: 'Can Do 30 Min', type: 'select', options: YES_NO, scope: 'musician', requiredFor: ['musician'] },
  { key: 'equipment', name: 'Equipment Needs', type: 'multi-select', options: SETUP_NEEDS, scope: 'musician' },
  { key: 'ownPA', name: 'Own PA', type: 'select', options: YES_NO, scope: 'musician' },
  { key: 'setLength', name: 'Set Length', type: 'text', scope: 'musician', note: 'Not on the live form; retained for spec parity and legacy import.' },

  // Vendor (real form fields; the spec collapsed these into org/vendor)
  { key: 'businessName', name: 'Business Name', type: 'text', scope: 'vendor', requiredFor: ['vendor'] },
  { key: 'foodDescription', name: 'What They Serve', type: 'text', scope: 'vendor', requiredFor: ['vendor'] },
  { key: 'foodType', name: 'Food Type', type: 'multi-select', options: FOOD_TYPES, scope: 'vendor' },
  { key: 'vendorLink', name: 'Vendor Link', type: 'link', scope: 'vendor' },
  { key: 'footprint', name: 'Space Footprint', type: 'text', scope: 'vendor' },
  { key: 'vendorNeeds', name: 'On-Site Needs', type: 'multi-select', options: VENDOR_NEEDS, scope: 'vendor' },
  { key: 'vendedBefore', name: 'Vended Before', type: 'select', options: YES_NO, scope: 'vendor' },

  // Entertainer
  { key: 'actName', name: 'Act / Artist Name', type: 'text', scope: 'entertainer', requiredFor: ['entertainer'] },
  { key: 'actType', name: 'Act Type', type: 'multi-select', options: ENT_TYPES, scope: 'entertainer' },
  { key: 'actDescription', name: 'Act Description', type: 'text', scope: 'entertainer', requiredFor: ['entertainer'] },
  { key: 'workLink', name: 'Work Link', type: 'link', scope: 'entertainer' },

  // Other (organizations, proposals)
  { key: 'orgName', name: 'Name / Organization', type: 'text', scope: 'other', requiredFor: ['other'] },
  { key: 'proposal', name: 'Proposal', type: 'text', scope: 'other', requiredFor: ['other'] },
  { key: 'otherLinks', name: 'Links', type: 'link', scope: 'other' },

  // Sponsor (brand-site sponsor form: which level, and who they sponsor as)
  { key: 'tier', name: 'Sponsorship Level', type: 'text', scope: 'sponsor' },
  { key: 'tierPrice', name: 'Sponsorship Amount', type: 'text', scope: 'sponsor' },
  { key: 'sponsoringAs', name: 'Sponsoring As', type: 'text', scope: 'sponsor' },

  // Planning (every record, organizer-editable, FR-008)
  { key: 'status', name: 'Status', type: 'select', options: PLANNING_STATUSES, scope: 'planning', note: 'Kanban grouping column. Intake sets submitted.' },
  { key: 'accepted', name: 'Accepted', type: 'checkbox', scope: 'planning' },
  { key: 'contacted', name: 'Contacted', type: 'checkbox', scope: 'planning' },
  { key: 'feePaid', name: 'Fee Paid ($)', type: 'number', scope: 'planning', note: 'Amount recorded from Square outcome; never gates intake or acceptance (FR-012/013).' },
  { key: 'paymentToBand', name: 'Payment To Band ($)', type: 'number', scope: 'planning' },
  { key: 'location', name: 'Location', type: 'text', scope: 'planning', note: 'JSON {"lng":number,"lat":number}; first-class, consumed by the geospatial layer. Empty means unplaced, never hidden.' },
  { key: 'address', name: 'Address', type: 'text', scope: 'planning', note: 'Mirrored nearest Carriage Town building address (City of Flint parcel GIS), a plain string, NOT a Postgres relation. Placing or dragging the object refills it; editing it moves the object to that address.' },
  { key: 'setTime', name: 'Set Time', type: 'text', scope: 'planning', note: 'Free text, e.g. "14:00-14:45".' },
  { key: 'billingRef', name: 'Billing Ref', type: 'text', scope: 'planning', note: 'Identifier of the billing record in the Postgres billing store (FR-014).' },
  { key: 'figureKey', name: 'Figure', type: 'select', options: CIVIC_FIGURE_KEYS, scope: 'planning', note: 'Organizer override for the rendered map figure. Empty means auto: civic-figure-resolver.ts picks from category + discriminating fields.' },
] as const;

export type CivicFieldKey = (typeof CIVIC_OBJECT_COLUMNS)[number]['key'];

/** Multi-select keys store string arrays; everything else is scalar. */
export const MULTI_SELECT_KEYS = CIVIC_OBJECT_COLUMNS.filter(
  (c) => c.type === 'multi-select',
).map((c) => c.key);

/** A civic object's fields as plain data (intake payload / import row). */
export interface CivicObjectFields {
  category: CivicCategory;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  bio?: string;
  flintBased?: (typeof FLINT_BASED)[number];
  accessNeeds?: string;
  submittedAt?: string;
  submissionFlag?: string;
  sourceId?: string;
  artistName?: string;
  genre?: string;
  musicLink?: string;
  musicLink2?: string;
  bandSize?: (typeof BAND_SIZES)[number];
  porchfestHistory?: (typeof PORCHFEST_HISTORY)[number];
  canDoThirty?: (typeof YES_NO)[number];
  equipment?: string[];
  ownPA?: (typeof YES_NO)[number];
  setLength?: string;
  businessName?: string;
  foodDescription?: string;
  foodType?: string[];
  vendorLink?: string;
  footprint?: string;
  vendorNeeds?: string[];
  vendedBefore?: (typeof YES_NO)[number];
  actName?: string;
  actType?: string[];
  actDescription?: string;
  workLink?: string;
  orgName?: string;
  proposal?: string;
  otherLinks?: string;
  tier?: string;
  tierPrice?: string;
  sponsoringAs?: string;
  status?: PlanningStatus;
  accepted?: boolean;
  contacted?: boolean;
  feePaid?: number;
  paymentToBand?: number;
  location?: string;
  address?: string;
  setTime?: string;
  billingRef?: string;
  figureKey?: CivicFigureKey;
}

/** Geospatial location encoding helpers (planning `location` column). */
export interface CivicLocation {
  lng: number;
  lat: number;
}

export function parseCivicLocation(value: string | undefined | null): CivicLocation | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as CivicLocation).lng === 'number' &&
      typeof (parsed as CivicLocation).lat === 'number'
    ) {
      return { lng: (parsed as CivicLocation).lng, lat: (parsed as CivicLocation).lat };
    }
  } catch {
    // Malformed location stays unplaced rather than crashing a view.
  }
  return null;
}

export function serializeCivicLocation(location: CivicLocation): string {
  return JSON.stringify({ lng: location.lng, lat: location.lat });
}

/**
 * Row title shown in the workspace and on map cards: the act's public name,
 * falling back to the contact name.
 */
export function civicObjectTitle(fields: Partial<CivicObjectFields>): string {
  return (
    fields.artistName ||
    fields.businessName ||
    fields.actName ||
    fields.orgName ||
    fields.name ||
    'Untitled application'
  );
}

/** Intake validation, mirroring the CTHNA Apply.jsx rules per category. */
export function missingRequiredFields(
  fields: Partial<CivicObjectFields>,
): CivicFieldKey[] {
  const category = fields.category;
  const missing: CivicFieldKey[] = [];
  for (const column of CIVIC_OBJECT_COLUMNS) {
    if (!column.requiredFor || !category) continue;
    if (!column.requiredFor.includes(category)) continue;
    const value = fields[column.key as keyof CivicObjectFields];
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0);
    if (empty) missing.push(column.key);
  }
  return missing;
}

/**
 * Legacy/import field aliases: spec-named or Formspree-era keys mapped onto
 * schema keys so the 108-record export imports without silent drops. Vendor
 * rows in old exports may carry orgName/history; musicians may carry history.
 */
export const IMPORT_FIELD_ALIASES: Readonly<Record<string, CivicFieldKey>> = {
  history: 'porchfestHistory',
  vendorHistory: 'vendedBefore',
  business: 'businessName',
  businessname: 'businessName',
  artist: 'artistName',
  band: 'artistName',
};
