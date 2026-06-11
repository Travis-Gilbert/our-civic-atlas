/**
 * Civic-object export (Feature 2 deliverable 6).
 *
 * Two formats, two audiences:
 *
 *  - CSV: the organizer-internal round trip. Headers are the schema column
 *    KEYS (not display names): every key normalizes back to itself through
 *    formspree-import's FIELD_KEY_BY_NORMALIZED, so re-importing an export
 *    maps 1:1 and dedups to zero new records (acceptance 4). All columns
 *    export, planning fields included, because the CSV is the data backup.
 *  - GeoJSON: the sharing format for GIS (acceptance 5). PLACED objects
 *    only, and properties are deliberately minimal (title, category,
 *    status, setTime, figure key): an export meant for sharing must not
 *    leak applicant emails and phone numbers. The CSV carries those for
 *    the team; the GeoJSON does not.
 *
 * Multi-select values join with "; " which splitList() splits back apart
 * on import; booleans export as yes/no which yesNoString() reads back.
 */

import {
  CIVIC_OBJECT_COLUMNS,
  parseCivicLocation,
  type CivicObjectFields,
} from './civic-object-schema';
import { effectiveCivicFigureKey } from './civic-figure-resolver';
import type { ExistingCivicRow } from './planner-import';

const EXPORT_KEYS = CIVIC_OBJECT_COLUMNS.map((column) => column.key);

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cellFor(fields: Partial<CivicObjectFields>, key: string): string {
  const value = fields[key as keyof CivicObjectFields];
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return String(value);
  return String(value);
}

/** All civic objects as a schema-keyed CSV string (with trailing newline). */
export function civicRowsToCsv(rows: readonly ExistingCivicRow[]): string {
  const lines: string[] = [EXPORT_KEYS.join(',')];
  for (const row of rows) {
    lines.push(
      EXPORT_KEYS.map((key) => csvEscape(cellFor(row.fields, key))).join(','),
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

export interface CivicGeoJsonFeature {
  readonly type: 'Feature';
  readonly geometry: { readonly type: 'Point'; readonly coordinates: [number, number] };
  readonly properties: {
    readonly title: string;
    readonly category: string;
    readonly status: string;
    readonly setTime: string | null;
    readonly figureKey: string;
  };
}

export interface CivicGeoJsonExport {
  readonly type: 'FeatureCollection';
  readonly features: readonly CivicGeoJsonFeature[];
}

/** Placed civic objects as a GeoJSON FeatureCollection (minimal, no PII). */
export function placedCivicRowsToGeoJson(
  rows: readonly ExistingCivicRow[],
): CivicGeoJsonExport {
  const features: CivicGeoJsonFeature[] = [];
  for (const row of rows) {
    const location = parseCivicLocation(row.fields.location);
    if (!location) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
      properties: {
        title: row.title,
        category: row.fields.category ?? 'other',
        status: row.fields.status ?? 'submitted',
        setTime: row.fields.setTime ?? null,
        figureKey: effectiveCivicFigureKey(row.fields),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Browser download helper: writes `content` as a file the user receives. */
export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
