/**
 * KML -> event-layer category rules, shared between the build-time importer
 * (scripts/kml-to-event-layer.mjs, the original home of these rules) and
 * the browser drop-target flow (Feature 2 deliverable 5). The rules are the
 * proven mapping for Google My Maps exports of the Carriage Town map; the
 * 2026-06-11 KMZ audit (docs/plans/porchfest-planner/) confirmed the live
 * payload shape: 92 Point placemarks + 9 LineString placemarks across the
 * folders matched below.
 *
 * Category strategy (priority order, same as the script):
 *   1. Immediate parent folder name ("Music" -> music, "Vendors" -> vendor).
 *   2. Label heuristics inside mixed folders ("After Party" -> after_party).
 *   3. Fallback: vendor + a TODO note for human review.
 *
 * The XML walk is split from the text parse: `collectKmlPlacemarks` takes a
 * DOM Document (browser DOMParser), while the pure pieces (`categoryFor`,
 * `parseKmlCoordinates`) are Node-testable without a DOM. Line features are
 * PRESERVED as GeoJSON LineStrings (the original script skipped them; the
 * audit's implementation consequence is that closures and barrier runs must
 * import too).
 */

export type KmlEventCategory =
  | 'music'
  | 'vendor'
  | 'parking'
  | 'restroom'
  | 'kid_zone'
  | 'food_court'
  | 'rest_area'
  | 'after_party'
  | 'amenity';

export interface KmlCategoryResult {
  readonly category: KmlEventCategory;
  /** Set when the fallback fired and a human should review the category. */
  readonly note: string | null;
}

/**
 * Folder name -> category. Case-insensitive substring match against the
 * immediate parent folder name; null means "mixed folder, use label rules".
 */
const FOLDER_TO_CATEGORY: ReadonlyArray<{
  match: string;
  category: KmlEventCategory | null;
}> = [
  { match: 'amenties', category: null },
  { match: 'amenities', category: null },
  { match: 'misc', category: null },
  { match: 'music', category: 'music' },
  { match: 'vendor', category: 'vendor' },
  { match: 'restroom', category: 'restroom' },
  { match: 'parking', category: 'parking' },
  { match: 'closure', category: 'amenity' },
  { match: 'cone', category: 'amenity' },
  { match: 'barrier', category: 'amenity' },
  { match: 'trees', category: 'amenity' },
  { match: 'landmark', category: 'amenity' },
  { match: 'walkway', category: 'amenity' },
  { match: 'opening', category: 'amenity' },
];

/** Label-based fallback for placemarks in mixed folders. Order matters. */
const LABEL_RULES: ReadonlyArray<{
  pattern: RegExp;
  category: KmlEventCategory;
}> = [
  { pattern: /\b(after.?party)\b/i, category: 'after_party' },
  {
    pattern: /\b(rest.?and.?dinn?ing|rest.?area|shade|seating|parachute)\b/i,
    category: 'rest_area',
  },
  {
    pattern: /\b(food.?court|food.?truck|dinn?ing|dinn?ing.?area)\b/i,
    category: 'food_court',
  },
  { pattern: /\b(kid|child|playground)/i, category: 'kid_zone' },
  { pattern: /\b(restroom|toilet|porta|bathroom)/i, category: 'restroom' },
  { pattern: /\b(parking|lot|ada)\b/i, category: 'parking' },
  {
    pattern: /\b(music|porch|band|trio|choir|jazz|blues|folk|stage)/i,
    category: 'music',
  },
];

export function categoryFor(
  folderPath: readonly string[],
  label: string,
): KmlCategoryResult {
  // Most specific folder first: walk from the immediate parent outward.
  for (let i = folderPath.length - 1; i >= 0; i -= 1) {
    const lower = folderPath[i].toLowerCase();
    for (const rule of FOLDER_TO_CATEGORY) {
      if (!lower.includes(rule.match)) continue;
      if (rule.category) return { category: rule.category, note: null };
      // Mixed folder: fall through to the label rules below.
      i = -1;
      break;
    }
  }
  for (const rule of LABEL_RULES) {
    if (rule.pattern.test(label)) return { category: rule.category, note: null };
  }
  return {
    category: 'vendor',
    note: 'TODO_CATEGORY: no folder or label rule matched; review.',
  };
}

export type KmlFeatureGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] };

export interface KmlEventFeature {
  readonly label: string;
  readonly folderPath: readonly string[];
  readonly category: KmlEventCategory;
  readonly note: string | null;
  readonly geometry: KmlFeatureGeometry;
}

/** "lng,lat[,alt] lng,lat[,alt] ..." -> [lng, lat][] (altitude dropped). */
export function parseKmlCoordinates(text: string): [number, number][] {
  return text
    .trim()
    .split(/\s+/)
    .map((tuple) => tuple.split(',').map((n) => Number(n.trim())))
    .filter(
      (parts) =>
        parts.length >= 2 &&
        Number.isFinite(parts[0]) &&
        Number.isFinite(parts[1]),
    )
    .map((parts) => [parts[0], parts[1]] as [number, number]);
}

/**
 * Walk a parsed KML Document and return categorized event features. Browser
 * callers parse with `new DOMParser().parseFromString(text, 'text/xml')`;
 * the walk itself only uses the cross-environment DOM surface.
 */
export function collectKmlPlacemarks(doc: Document): KmlEventFeature[] {
  const features: KmlEventFeature[] = [];

  const directChildText = (el: Element, tag: string): string => {
    for (const child of Array.from(el.children)) {
      if (child.tagName === tag || child.localName === tag) {
        return child.textContent?.trim() ?? '';
      }
    }
    return '';
  };

  const walk = (node: Element, folderPath: string[]): void => {
    for (const child of Array.from(node.children)) {
      const name = child.localName || child.tagName;
      if (name === 'Folder' || name === 'Document') {
        const folderName = directChildText(child, 'name');
        walk(child, folderName ? [...folderPath, folderName] : folderPath);
        continue;
      }
      if (name !== 'Placemark') continue;

      const label = directChildText(child, 'name') || 'Unnamed feature';
      const point = child.getElementsByTagName('Point')[0];
      const line = child.getElementsByTagName('LineString')[0];
      let geometry: KmlFeatureGeometry | null = null;
      if (point) {
        const coords = parseKmlCoordinates(
          point.getElementsByTagName('coordinates')[0]?.textContent ?? '',
        );
        if (coords.length > 0) geometry = { type: 'Point', coordinates: coords[0] };
      } else if (line) {
        const coords = parseKmlCoordinates(
          line.getElementsByTagName('coordinates')[0]?.textContent ?? '',
        );
        if (coords.length >= 2) geometry = { type: 'LineString', coordinates: coords };
      }
      if (!geometry) continue;

      const { category, note } = categoryFor(folderPath, label);
      features.push({ label, folderPath: [...folderPath], category, note, geometry });
    }
  };

  walk(doc.documentElement, []);
  return features;
}
