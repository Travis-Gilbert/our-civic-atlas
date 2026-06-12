/**
 * Static city-centroid lookup for the applicant origin-flow overlay (Lane 3).
 *
 * The plan calls for geocoding applicant home cities "once" rather than at
 * runtime: this is that table. It is centered on Genesee County (the Flint
 * metro the festival draws from) and widens to the rest of southeast and
 * mid Michigan. Unknown cities are skipped, never given an invented point, so
 * the flow map only ever draws origins we can actually place.
 *
 * Coordinates are [lon, lat] decimal degrees, approximate city centroids.
 */

export interface CityCentroid {
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
}

// Keyed by normalized city name (see normalizeCity). Names are display form.
const CENTROIDS: Readonly<Record<string, CityCentroid>> = {
  // Genesee County core
  flint: { name: "Flint", lat: 43.0125, lon: -83.6875 },
  burton: { name: "Burton", lat: 42.9994, lon: -83.6163 },
  "grand blanc": { name: "Grand Blanc", lat: 42.9275, lon: -83.6299 },
  flushing: { name: "Flushing", lat: 43.0631, lon: -83.8513 },
  davison: { name: "Davison", lat: 43.0353, lon: -83.518 },
  "swartz creek": { name: "Swartz Creek", lat: 42.9567, lon: -83.8302 },
  "mount morris": { name: "Mount Morris", lat: 43.1186, lon: -83.6938 },
  "mt morris": { name: "Mount Morris", lat: 43.1186, lon: -83.6938 },
  clio: { name: "Clio", lat: 43.1781, lon: -83.733 },
  montrose: { name: "Montrose", lat: 43.175, lon: -83.8888 },
  otisville: { name: "Otisville", lat: 43.1614, lon: -83.5252 },
  goodrich: { name: "Goodrich", lat: 42.9167, lon: -83.5069 },
  gaines: { name: "Gaines", lat: 42.8736, lon: -83.9166 },
  // Nearby counties
  fenton: { name: "Fenton", lat: 42.7975, lon: -83.705 },
  linden: { name: "Linden", lat: 42.8123, lon: -83.7822 },
  holly: { name: "Holly", lat: 42.7925, lon: -83.6244 },
  lapeer: { name: "Lapeer", lat: 43.0514, lon: -83.3188 },
  owosso: { name: "Owosso", lat: 42.9978, lon: -84.1764 },
  durand: { name: "Durand", lat: 42.9111, lon: -83.9858 },
  // Saginaw / Bay
  saginaw: { name: "Saginaw", lat: 43.4195, lon: -83.9508 },
  "bay city": { name: "Bay City", lat: 43.5945, lon: -83.8889 },
  frankenmuth: { name: "Frankenmuth", lat: 43.3317, lon: -83.738 },
  midland: { name: "Midland", lat: 43.6156, lon: -84.2472 },
  // Lansing / mid-Michigan
  lansing: { name: "Lansing", lat: 42.7325, lon: -84.5555 },
  "east lansing": { name: "East Lansing", lat: 42.737, lon: -84.4839 },
  // Metro Detroit / SE Michigan
  detroit: { name: "Detroit", lat: 42.3314, lon: -83.0458 },
  pontiac: { name: "Pontiac", lat: 42.6389, lon: -83.291 },
  "auburn hills": { name: "Auburn Hills", lat: 42.6875, lon: -83.2341 },
  rochester: { name: "Rochester", lat: 42.6806, lon: -83.1339 },
  "rochester hills": { name: "Rochester Hills", lat: 42.6584, lon: -83.15 },
  troy: { name: "Troy", lat: 42.6064, lon: -83.1498 },
  "royal oak": { name: "Royal Oak", lat: 42.4895, lon: -83.1446 },
  ferndale: { name: "Ferndale", lat: 42.4606, lon: -83.1346 },
  birmingham: { name: "Birmingham", lat: 42.5467, lon: -83.2113 },
  "ann arbor": { name: "Ann Arbor", lat: 42.2808, lon: -83.743 },
  ypsilanti: { name: "Ypsilanti", lat: 42.2411, lon: -83.613 },
  brighton: { name: "Brighton", lat: 42.5295, lon: -83.7802 },
  howell: { name: "Howell", lat: 42.6073, lon: -83.9294 },
  // West Michigan majors
  "grand rapids": { name: "Grand Rapids", lat: 42.9634, lon: -85.6681 },
  kalamazoo: { name: "Kalamazoo", lat: 42.2917, lon: -85.5872 },
};

/**
 * Normalize a free-text city field to a lookup key: lowercased, trimmed, with
 * a trailing state qualifier (", MI" / "Michigan") and surrounding noise
 * removed so "Grand Blanc, MI" and "grand blanc" resolve to one entry.
 */
export function normalizeCity(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(mi|michigan|usa|us)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve a free-text city to a centroid, or null if not in the table. */
export function resolveCityCentroid(
  raw: string | null | undefined,
): CityCentroid | null {
  if (!raw) return null;
  const key = normalizeCity(raw);
  if (!key) return null;
  return CENTROIDS[key] ?? null;
}
