/**
 * Local two-way geocoder for the festival footprint.
 *
 * Backs the planner's address mirroring: a placed object resolves the nearest
 * City-of-Flint building address (reverse), and editing an address resolves it
 * back to a building location so the object moves (forward). The data is the
 * precomputed carriage-town-geocode-index.json (750 Carriage Town buildings,
 * built by scripts/build-geocode-index.mjs) so neither path hits an external
 * service or loads the full building set.
 */

import indexData from "@/data/open-flint-atlas/fixtures/carriage-town-geocode-index.json";
import { formatStreetAddress } from "./flint-building-addresses";

interface GeocodeEntry {
  readonly osmId: string;
  readonly address: string;
  readonly fullAddress: string;
  readonly lng: number;
  readonly lat: number;
}

const ENTRIES: GeocodeEntry[] = (indexData as { entries: GeocodeEntry[] }).entries;

// Beyond this, a placed object is not "at" any building (a park, a street
// median) and gets no mirrored address rather than a misleading nearest one.
const MAX_REVERSE_METERS = 120;

// Common street-type words collapsed to one canonical token so "Garland
// Street" and "GARLAND ST" match.
const STREET_TYPES: Record<string, string> = {
  STREET: "ST",
  AVENUE: "AVE",
  AV: "AVE",
  BOULEVARD: "BLVD",
  DRIVE: "DR",
  ROAD: "RD",
  LANE: "LN",
  COURT: "CT",
  PLACE: "PL",
  PARKWAY: "PKWY",
  HIGHWAY: "HWY",
  TERRACE: "TER",
  CIRCLE: "CIR",
};

function normalize(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((token) => STREET_TYPES[token] ?? token)
    .join(" ");
}

const NORMALIZED: { norm: string; tokens: Set<string>; entry: GeocodeEntry }[] =
  ENTRIES.map((entry) => {
    const norm = normalize(entry.address);
    return { norm, tokens: new Set(norm.split(" ")), entry };
  });

/** Approximate metres between two lng/lat points (equirectangular, fine at city scale). */
function metersBetween(
  aLng: number,
  aLat: number,
  bLng: number,
  bLat: number,
): number {
  const meanLat = ((aLat + bLat) / 2) * (Math.PI / 180);
  const x = (bLng - aLng) * Math.cos(meanLat);
  const y = bLat - aLat;
  return Math.sqrt(x * x + y * y) * 111_320;
}

export interface NearestAddress {
  readonly address: string;
  readonly fullAddress: string;
  readonly osmId: string;
  readonly meters: number;
}

/** Reverse: the nearest building address to a point, or null if none is close. */
export function nearestAddress(lng: number, lat: number): NearestAddress | null {
  let best: GeocodeEntry | null = null;
  let bestMeters = Number.POSITIVE_INFINITY;
  for (const entry of ENTRIES) {
    const meters = metersBetween(lng, lat, entry.lng, entry.lat);
    if (meters < bestMeters) {
      bestMeters = meters;
      best = entry;
    }
  }
  if (!best || bestMeters > MAX_REVERSE_METERS) return null;
  return {
    address: formatStreetAddress(best.address),
    fullAddress: best.fullAddress,
    osmId: best.osmId,
    meters: bestMeters,
  };
}

export interface GeocodedAddress {
  readonly lng: number;
  readonly lat: number;
  readonly address: string;
  readonly osmId: string;
}

/**
 * Forward: resolve a typed address to a building location. Exact normalized
 * match first, then a token-subset match (every query token present in the
 * building's address, so "725 Garland" resolves "725 GARLAND ST"). Returns the
 * most specific (shortest) match, or null when nothing matches.
 */
export function geocodeAddress(text: string): GeocodedAddress | null {
  const q = normalize(text);
  if (!q) return null;
  const qTokens = q.split(" ");

  let exact: GeocodeEntry | null = null;
  let subset: { entry: GeocodeEntry; len: number } | null = null;

  for (const candidate of NORMALIZED) {
    if (candidate.norm === q) {
      exact = candidate.entry;
      break;
    }
    const covered = qTokens.every((token) => candidate.tokens.has(token));
    if (covered && (!subset || candidate.norm.length < subset.len)) {
      subset = { entry: candidate.entry, len: candidate.norm.length };
    }
  }

  const match = exact ?? subset?.entry ?? null;
  if (!match) return null;
  return {
    lng: match.lng,
    lat: match.lat,
    address: formatStreetAddress(match.address),
    osmId: match.osmId,
  };
}
