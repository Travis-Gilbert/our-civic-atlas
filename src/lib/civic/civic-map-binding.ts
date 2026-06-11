/**
 * Civic-object <-> map placement adapter.
 *
 * Phase 5 bridge: the planning workspace stores civic objects, while the
 * existing PorchFest map layers already render "placements". This module
 * keeps the binding pure and headless so the map, validators, and future
 * CRDT live bridge can agree on one translation.
 */

import {
  civicObjectTitle,
  parseCivicLocation,
  serializeCivicLocation,
  type CivicCategory,
  type CivicFigureKey,
  type CivicLocation,
  type CivicObjectFields,
} from './civic-object-schema';
import { effectiveCivicFigureKey } from './civic-figure-resolver';

export type CivicMapCategory =
  | 'vendor'
  | 'music'
  | 'parking'
  | 'restroom'
  | 'kid_zone'
  | 'food_court'
  | 'rest_area'
  | 'after_party'
  | 'amenity';

export interface CivicMapRow {
  readonly rowId: string;
  readonly title: string;
  readonly fields: Partial<CivicObjectFields>;
}

export interface CivicMapPlacement {
  readonly id: string;
  readonly eventLayerId: string;
  readonly category: CivicMapCategory;
  readonly sublabel: string | null;
  readonly label: string;
  readonly geometry: { type: 'Point'; coordinates: [number, number] };
  readonly status: string;
  readonly notes: string | null;
  readonly civicRowId: string;
  readonly sourceId: string | null;
  /** Override-first figure key; the mesh layer picks geometry from it. */
  readonly figureKey: CivicFigureKey;
  /**
   * Direct image URL found on the submission's link fields, if any. Drives
   * the per-submission billboard (Feature 1 deliverable 5); null falls
   * back to category color + name label.
   */
  readonly imageUrl: string | null;
}

export interface CivicMapBindingResult {
  readonly placed: CivicMapPlacement[];
  readonly unplaced: CivicMapRow[];
}

const DEFAULT_CATEGORY_MAP: Record<CivicCategory, CivicMapCategory> = {
  musician: 'music',
  vendor: 'vendor',
  entertainer: 'amenity',
  other: 'amenity',
};

export interface CivicMapBindingOptions {
  readonly eventLayerId?: string;
  readonly categoryMap?: Partial<Record<CivicCategory, CivicMapCategory>>;
}

function civicCategoryToMapCategory(
  category: CivicCategory | undefined,
  overrides?: Partial<Record<CivicCategory, CivicMapCategory>>,
): CivicMapCategory {
  if (!category) return 'amenity';
  return overrides?.[category] ?? DEFAULT_CATEGORY_MAP[category];
}

function placementIdFor(row: CivicMapRow): string {
  return row.fields.sourceId ?? `civic-row:${row.rowId}`;
}

function sublabelFor(fields: Partial<CivicObjectFields>): string | null {
  if (fields.setTime && fields.status) {
    return `${fields.status} · ${fields.setTime}`;
  }
  return fields.setTime ?? fields.status ?? null;
}

/**
 * Direct image URLs only: the schema's link fields usually hold band pages
 * and socials, which an IconLayer cannot rasterize. A link counts as the
 * submission's image when it is an http(s) URL ending in a raster
 * extension; everything else falls back to name + category color.
 */
const IMAGE_LINK_KEYS = [
  'musicLink',
  'musicLink2',
  'vendorLink',
  'workLink',
  'otherLinks',
] as const;
const IMAGE_URL_PATTERN = /^https?:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?$/i;

export function civicImageUrl(
  fields: Partial<CivicObjectFields>,
): string | null {
  for (const key of IMAGE_LINK_KEYS) {
    const value = fields[key];
    if (typeof value === 'string' && IMAGE_URL_PATTERN.test(value.trim())) {
      return value.trim();
    }
  }
  return null;
}

function notesFor(fields: Partial<CivicObjectFields>): string | null {
  const parts = [
    fields.city,
    fields.accessNeeds ? `Access: ${fields.accessNeeds}` : null,
  ].filter((part): part is string => typeof part === 'string' && part !== '');
  return parts.length > 0 ? parts.join(' | ') : null;
}

export function civicLocationToPointGeometry(
  location: CivicLocation,
): CivicMapPlacement['geometry'] {
  return { type: 'Point', coordinates: [location.lng, location.lat] };
}

export function pointGeometryToCivicLocation(
  geometry: Record<string, unknown>,
): string | null {
  const coords = geometry.coordinates;
  if (
    geometry.type !== 'Point' ||
    !Array.isArray(coords) ||
    typeof coords[0] !== 'number' ||
    typeof coords[1] !== 'number'
  ) {
    return null;
  }
  return serializeCivicLocation({ lng: coords[0], lat: coords[1] });
}

export function civicRowToMapPlacement(
  row: CivicMapRow,
  options: CivicMapBindingOptions = {},
): CivicMapPlacement | null {
  const location = parseCivicLocation(row.fields.location);
  if (!location) return null;
  const label = civicObjectTitle(row.fields);
  return {
    id: placementIdFor(row),
    eventLayerId: options.eventLayerId ?? 'civic:porchfest-2026',
    category: civicCategoryToMapCategory(row.fields.category, options.categoryMap),
    sublabel: sublabelFor(row.fields),
    label,
    geometry: civicLocationToPointGeometry(location),
    status: row.fields.status ?? 'submitted',
    notes: notesFor(row.fields),
    civicRowId: row.rowId,
    sourceId: row.fields.sourceId ?? null,
    figureKey: effectiveCivicFigureKey(row.fields),
    imageUrl: civicImageUrl(row.fields),
  };
}

export function bindCivicRowsToMap(
  rows: readonly CivicMapRow[],
  options: CivicMapBindingOptions = {},
): CivicMapBindingResult {
  const placed: CivicMapPlacement[] = [];
  const unplaced: CivicMapRow[] = [];
  for (const row of rows) {
    const placement = civicRowToMapPlacement(row, options);
    if (placement) {
      placed.push(placement);
    } else {
      unplaced.push(row);
    }
  }
  return { placed, unplaced };
}
