/**
 * Planner drop-target import core (Feature 2 deliverables 1-4).
 *
 * Headless on purpose: file-kind detection, the CSV preview plan (counts,
 * per-category split, email dedup against the live store), and the commit
 * step are all pure or store-API-driven so validators prove them without a
 * browser. The panel component owns only presentation.
 *
 * Contract decisions, recorded:
 *  - Dedup key is normalized `email` (the schema's documented dedup key),
 *    with `sourceId` as the secondary key so email-less rows still round
 *    trip: civic-export writes `civic-row:<rowId>` for rows that never had
 *    a sourceId, and the plan matches both real sourceIds and that synth
 *    form back to their store rows instead of duplicating them.
 *  - Nothing writes until commit; the plan object is inert (deliverable 3).
 *  - Collisions resolve per row: `skip` writes nothing; `update` writes only
 *    NON-EMPTY incoming INTAKE fields (shared + category scopes). Planning
 *    fields (status, location, figureKey, ...) are organizer-owned CRDT
 *    state and are never clobbered by an import, matching the ledger-ingest
 *    rule that existing rows win.
 *  - CSV parsing + field mapping reuse formspree-import.ts verbatim, so the
 *    legacy Formspree export's headers map through the same aliases the
 *    one-time importer used (deliverable 2).
 */

import {
  mapFormspreeRowsToApplications,
  parseFormspreeCsv,
  type FormspreeImportCandidate,
} from './formspree-import';
import {
  CIVIC_OBJECT_COLUMNS,
  type CivicCategory,
  type CivicObjectFields,
} from './civic-object-schema';
import {
  categoryFor,
  type KmlEventCategory,
  type KmlEventFeature,
} from './kml-event-layer-rules';

/* ------------------------------------------------------------------ */
/*  File-kind detection (deliverable 1: type detected from the file).  */
/* ------------------------------------------------------------------ */

export type ImportKind = 'csv' | 'kml' | 'geojson';

export function detectImportKind(
  fileName: string,
  text: string,
): ImportKind | null {
  const name = fileName.toLowerCase();
  const head = text.slice(0, 2000);
  if (name.endsWith('.kml') || /<kml[\s>]/i.test(head)) return 'kml';
  if (name.endsWith('.geojson') || name.endsWith('.json')) {
    return looksLikeGeoJson(text) ? 'geojson' : null;
  }
  if (looksLikeGeoJson(head) && head.trimStart().startsWith('{')) {
    return 'geojson';
  }
  if (name.endsWith('.csv')) return 'csv';
  // Header sniff: a comma-separated first line with at least two columns.
  const firstLine = head.split(/\r?\n/, 1)[0] ?? '';
  if (firstLine.includes(',') && !head.trimStart().startsWith('<')) {
    return 'csv';
  }
  return null;
}

function looksLikeGeoJson(text: string): boolean {
  try {
    const parsed: unknown = JSON.parse(text);
    const type = (parsed as { type?: string } | null)?.type;
    // Bare Features count too; parseGeoJsonEventFeatures wraps them, so
    // detection and parsing agree.
    return type === 'FeatureCollection' || type === 'Feature';
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  CSV plan (deliverables 2 + 3).                                     */
/* ------------------------------------------------------------------ */

export interface ExistingCivicRow {
  readonly rowId: string;
  readonly title: string;
  readonly fields: Partial<CivicObjectFields>;
}

export interface CsvImportCollision {
  readonly candidate: FormspreeImportCandidate;
  readonly existingRowId: string;
  readonly existingTitle: string;
}

export interface CsvImportPlan {
  readonly recordCount: number;
  readonly perCategory: Readonly<Record<CivicCategory, number>>;
  readonly newCandidates: readonly FormspreeImportCandidate[];
  readonly collisions: readonly CsvImportCollision[];
  /** Candidates with intake-required fields missing (organizer review). */
  readonly issueCount: number;
}

function normalizedEmail(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function buildCsvImportPlan(
  csvText: string,
  existingRows: readonly ExistingCivicRow[],
): CsvImportPlan {
  const rows = parseFormspreeCsv(csvText);
  const candidates = mapFormspreeRowsToApplications(rows);

  const existingByEmail = new Map<string, ExistingCivicRow>();
  const existingBySourceId = new Map<string, ExistingCivicRow>();
  const existingByRowId = new Map<string, ExistingCivicRow>();
  for (const row of existingRows) {
    const email = normalizedEmail(row.fields.email);
    if (email && !existingByEmail.has(email)) existingByEmail.set(email, row);
    const sourceId = row.fields.sourceId?.trim();
    if (sourceId && !existingBySourceId.has(sourceId)) {
      existingBySourceId.set(sourceId, row);
    }
    existingByRowId.set(row.rowId, row);
  }
  // Secondary dedup: a real sourceId, or the civic-row:<rowId> form the
  // export synthesizes for rows that never had one.
  const existingForSourceId = (
    sourceId: string | undefined,
  ): ExistingCivicRow | undefined => {
    const trimmed = sourceId?.trim();
    if (!trimmed) return undefined;
    return (
      existingBySourceId.get(trimmed) ??
      (trimmed.startsWith('civic-row:')
        ? existingByRowId.get(trimmed.slice('civic-row:'.length))
        : undefined)
    );
  };

  const perCategory: Record<CivicCategory, number> = {
    musician: 0,
    vendor: 0,
    entertainer: 0,
    other: 0,
    something_else: 0,
  };
  const newCandidates: FormspreeImportCandidate[] = [];
  const collisions: CsvImportCollision[] = [];
  let issueCount = 0;
  // Emails already claimed by an earlier candidate in the SAME file count
  // as collisions too (the surviving export has known duplicate rows).
  const seenInFile = new Map<string, FormspreeImportCandidate>();

  for (const candidate of candidates) {
    perCategory[candidate.civicObject.category] += 1;
    if (candidate.missingFields.length > 0) issueCount += 1;
    const email = normalizedEmail(candidate.civicObject.email);
    // In-file duplicates FIRST: only the first occurrence of an email gets
    // a real (resolvable) collision or new-row slot. Later occurrences
    // downgrade to a fixed-skip pending collision, so the resolutions map
    // (keyed by existingRowId) never covers two candidates with one key,
    // where a single update choice would silently apply both, last writer
    // per field.
    if (email && seenInFile.has(email)) {
      collisions.push({
        candidate,
        existingRowId: `pending:${seenInFile.get(email)!.rowNumber}`,
        existingTitle: `Row ${seenInFile.get(email)!.rowNumber} in this file`,
      });
      continue;
    }
    if (email) seenInFile.set(email, candidate);
    const existing =
      (email ? existingByEmail.get(email) : undefined) ??
      existingForSourceId(candidate.civicObject.sourceId);
    if (existing) {
      collisions.push({
        candidate,
        existingRowId: existing.rowId,
        existingTitle: existing.title,
      });
      continue;
    }
    newCandidates.push(candidate);
  }

  return {
    recordCount: candidates.length,
    perCategory,
    newCandidates,
    collisions,
    issueCount,
  };
}

/* ------------------------------------------------------------------ */
/*  Commit (deliverable 4).                                            */
/* ------------------------------------------------------------------ */

/** The subset of CivicStoreApi the commit step needs. */
export interface CivicStoreWriter {
  insert(fields: CivicObjectFields): string;
  update(rowId: string, key: string, value: unknown): void;
}

export type CollisionResolution = 'skip' | 'update';

export interface CsvCommitResult {
  readonly inserted: number;
  readonly updated: number;
  readonly skipped: number;
}

/** Intake-scope keys: shared + per-category. Planning keys excluded. */
const INTAKE_FIELD_KEYS = CIVIC_OBJECT_COLUMNS.filter(
  (column) => column.scope !== 'planning',
).map((column) => column.key);

export function commitCsvImportPlan(
  store: CivicStoreWriter,
  plan: CsvImportPlan,
  resolutions: ReadonlyMap<string, CollisionResolution> | CollisionResolution = 'skip',
): CsvCommitResult {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const candidate of plan.newCandidates) {
    store.insert(candidate.civicObject);
    inserted += 1;
  }

  for (const collision of plan.collisions) {
    const resolution =
      typeof resolutions === 'string'
        ? resolutions
        : resolutions.get(collision.existingRowId) ?? 'skip';
    if (resolution !== 'update' || collision.existingRowId.startsWith('pending:')) {
      skipped += 1;
      continue;
    }
    let wroteAny = false;
    for (const key of INTAKE_FIELD_KEYS) {
      const value = collision.candidate.civicObject[key as keyof CivicObjectFields];
      const empty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);
      if (empty) continue;
      store.update(collision.existingRowId, key, value);
      wroteAny = true;
    }
    if (wroteAny) {
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  return { inserted, updated, skipped };
}

/* ------------------------------------------------------------------ */
/*  GeoJSON geometry path (deliverable 5's sibling format).            */
/* ------------------------------------------------------------------ */

const KML_CATEGORY_SET = new Set<string>([
  'music',
  'vendor',
  'parking',
  'restroom',
  'kid_zone',
  'food_court',
  'rest_area',
  'after_party',
  'amenity',
]);

/**
 * GeoJSON FeatureCollection -> categorized event features, the same shape
 * the KML walk produces so the preview + commit paths are format-agnostic.
 * `properties.category` wins when it is already a planner category; labels
 * fall back to the shared rules.
 */
export function parseGeoJsonEventFeatures(text: string): KmlEventFeature[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  type RawFeature = {
    type?: string;
    geometry?: { type?: string; coordinates?: unknown };
    properties?: Record<string, unknown>;
  };
  const collection = parsed as { type?: string; features?: RawFeature[] };
  // A bare Feature wraps into a one-element collection so detection
  // (looksLikeGeoJson accepts both) and parsing agree.
  const features =
    collection.type === 'FeatureCollection' && Array.isArray(collection.features)
      ? collection.features
      : collection.type === 'Feature'
        ? [collection as RawFeature]
        : [];
  const out: KmlEventFeature[] = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    const label =
      (typeof feature.properties?.name === 'string' && feature.properties.name) ||
      (typeof feature.properties?.label === 'string' && feature.properties.label) ||
      'Unnamed feature';
    const declared =
      typeof feature.properties?.category === 'string'
        ? feature.properties.category
        : null;
    const resolved =
      declared && KML_CATEGORY_SET.has(declared)
        ? { category: declared as KmlEventCategory, note: null }
        : categoryFor([], label);
    if (
      geometry.type === 'Point' &&
      Array.isArray(geometry.coordinates) &&
      typeof geometry.coordinates[0] === 'number' &&
      typeof geometry.coordinates[1] === 'number'
    ) {
      out.push({
        label,
        folderPath: [],
        category: resolved.category,
        note: resolved.note,
        geometry: {
          type: 'Point',
          coordinates: [geometry.coordinates[0], geometry.coordinates[1]],
        },
      });
      continue;
    }
    const coordPairs = (raw: unknown): [number, number][] =>
      Array.isArray(raw)
        ? (raw as unknown[])
            .filter(
              (pair): pair is [number, number] =>
                Array.isArray(pair) &&
                typeof pair[0] === 'number' &&
                typeof pair[1] === 'number',
            )
            .map((pair) => [pair[0], pair[1]] as [number, number])
        : [];
    if (geometry.type === 'LineString') {
      const coords = coordPairs(geometry.coordinates);
      if (coords.length >= 2) {
        out.push({
          label,
          folderPath: [],
          category: resolved.category,
          note: resolved.note,
          geometry: { type: 'LineString', coordinates: coords },
        });
      }
      continue;
    }
    if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
      // Outer ring only, matching the KML walk: zones and boundaries.
      const ring = coordPairs((geometry.coordinates as unknown[])[0]);
      if (ring.length >= 3) {
        out.push({
          label,
          folderPath: [],
          category: resolved.category,
          note: resolved.note,
          geometry: { type: 'Polygon', coordinates: [ring] },
        });
      }
    }
  }
  return out;
}
