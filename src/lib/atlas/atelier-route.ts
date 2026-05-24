/**
 * Atelier route helpers.
 *
 * The atelier route is `/open-flint-atlas/atelier/[parcelId]/[year]`
 * where `parcelId` is a `civic_object_id` (e.g., `building:carriage-town:1`)
 * and `year` is a 4-digit ISO year. Routes resolve to a `reconstructionId`
 * (e.g., `historical:carriage-town:whaley-house`) via the in-fixture lookup
 * in v1 and the GraphQL resolver in v1.x.
 *
 * Plan reference: PT-206 in `docs/plans/the-atelier/implementation-plan.md`.
 */

import {
  FLINT_LOST_RECONSTRUCTIONS,
  type HistoricalReconstruction,
} from "@/lib/atlas/historical-reconstruction";

export { FLINT_LOST_RECONSTRUCTIONS };

export type AtelierRouteParams = {
  parcelId: string;
  year: number;
};

export type AtelierResolvedRoute = {
  params: AtelierRouteParams;
  reconstructionId: string;
  reconstruction: HistoricalReconstruction;
};

/**
 * Find the reconstruction nearest to a given lng/lat within a
 * threshold (default ~150m). Returns null when no reconstruction is
 * close enough. Used by the dynamic island BuildingDossier
 * "Reconstruct historical view" wire (PT-501) to decide whether the
 * currently-selected building has an atelier to open.
 *
 * Distance is Euclidean in degrees; at Flint latitude (~43N) one
 * degree of longitude is ~80km and one degree of latitude is ~111km,
 * so 0.0015 degrees ≈ ~150m. Fine for the small Carriage Town fixture
 * cluster.
 */
export function findNearestReconstruction(
  position: readonly [number, number],
  thresholdDegrees = 0.0015,
): HistoricalReconstruction | null {
  let best: HistoricalReconstruction | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const reconstruction of FLINT_LOST_RECONSTRUCTIONS) {
    const dx = reconstruction.position[0] - position[0];
    const dy = reconstruction.position[1] - position[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < bestDistance && distance <= thresholdDegrees) {
      best = reconstruction;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Build the canonical atelier URL for a reconstruction + year.
 * URL-encodes the parcelId (which contains colons).
 */
export function buildAtelierHref(
  reconstruction: HistoricalReconstruction,
  year: number,
): string {
  return `/open-flint-atlas/atelier/${encodeURIComponent(reconstruction.civic_object_id)}/${year}`;
}

/**
 * Pick the year an atelier entry should open against.
 *
 * Resolution order (highest priority first):
 *   1. The active atlas year if the user is in time-travel mode
 *      (`atlasYear !== null`). Honors the user's current temporal
 *      context: if they have scrubbed to 1925, atelier opens at 1925.
 *   2. The reconstruction's `time_start` parsed as an integer (e.g.,
 *      "1885" for Whaley House).
 *   3. A 1925 fallback when neither signal is available. 1925 is the
 *      spec's worked example (`SPEC-THE-ATELIER.md` line 59).
 *
 * Shared by PT-501 (`BuildingDossier` "Reconstruct" link in the dynamic
 * island) and PT-504 (right-click / long-press atelier entry on the
 * map). Centralizing the rule keeps the two entry points consistent.
 */
export function resolveAtelierEntryYear(
  reconstruction: HistoricalReconstruction,
  atlasYear: number | null = null,
): number {
  if (atlasYear !== null) return atlasYear;
  if (reconstruction.time_start) {
    const parsed = Number.parseInt(reconstruction.time_start, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 1925;
}

/**
 * Decode the URL-encoded parcelId. Next.js delivers `params` already
 * decoded once; this is a defensive second decode in case the source
 * URL was double-encoded.
 */
export function decodeParcelId(rawParcelId: string): string {
  try {
    return decodeURIComponent(rawParcelId);
  } catch {
    return rawParcelId;
  }
}

/**
 * Parse a year string from the URL. Returns null when the value is not
 * a 4-digit integer in the plausible historic range (1700 to 2100).
 */
export function parseAtelierYear(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  const year = Number.parseInt(trimmed, 10);
  if (Number.isNaN(year) || year < 1700 || year > 2100) return null;
  return year;
}

/**
 * Resolve a parcelId + year into the matching reconstruction. v1 reads
 * from the in-repo `FLINT_LOST_RECONSTRUCTIONS` fixture; v1.x swaps to
 * a GraphQL resolver query without changing the caller signature.
 */
export function resolveAtelierRoute(
  rawParcelId: string,
  rawYear: string,
): AtelierResolvedRoute | null {
  const parcelId = decodeParcelId(rawParcelId);
  const year = parseAtelierYear(rawYear);
  if (year === null) return null;

  const reconstruction = FLINT_LOST_RECONSTRUCTIONS.find(
    (item) => item.civic_object_id === parcelId,
  );
  if (!reconstruction) return null;

  return {
    params: { parcelId, year },
    reconstructionId: reconstruction.id,
    reconstruction,
  };
}
