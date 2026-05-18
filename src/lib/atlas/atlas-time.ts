/**
 * Atlas time travel — derive an "atlas year" from the search input
 * and decide which features were standing in that year.
 *
 * The trigger is the existing dynamic-island search field. Typing a
 * four-digit year (e.g. `1925`) flips the atlas into a time-travel
 * filter: the basemap stays, but OSM buildings built after that year
 * disappear and Lost Flint reconstructions whose lifespan covers the
 * year appear in their place. Clearing the field returns to today.
 *
 * The "year" is intentionally a soft contract — we don't have build
 * dates on every OSM feature, and historical reconstructions carry
 * uncertain start/end dates. The predicates below are conservative
 * about what we hide and generous about what we show, biased toward
 * preserving spatial context.
 */

/** Earliest year the atlas will accept as a time-travel target.
 * Flint was founded ~1819; anything earlier is curiosity, not data. */
export const ATLAS_TIME_MIN_YEAR = 1800;
/** Latest year accepted. Pinning slightly forward lets future planned
 * projects (e.g. proposed scenarios for 2030) get drawn the same way
 * as historical ones. */
export const ATLAS_TIME_MAX_YEAR = 2099;

/**
 * Detect a year token in the search input. Returns the year as a
 * number when the entire trimmed input is a four-digit year in the
 * allowed range; `null` otherwise.
 *
 * Strict: we only flip into time-travel mode when the user has
 * unambiguously typed a year — no leading text, no trailing words,
 * no other characters. This avoids accidentally triggering on
 * "ward 4" or "I-475".
 */
export function parseAtlasYear(input: string | null | undefined): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  const year = Number(trimmed);
  if (!Number.isFinite(year)) return null;
  if (year < ATLAS_TIME_MIN_YEAR || year > ATLAS_TIME_MAX_YEAR) return null;
  return year;
}

/**
 * Parse a heterogeneous year field on a historical reconstruction.
 * Accepts integers, 4-digit strings, and decade approximations like
 * "c. 1900" or "1900s" (the leading four digits win). Null and
 * unparseable input both return null; callers treat null as an
 * unknown boundary.
 */
export function parseHistoricalYear(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  const match = /(\d{4})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

/**
 * Does an OSM building exist in the given atlas year?
 *
 *   - `year_built > atlasYear`  -> not yet built, hide
 *   - `year_built <= atlasYear` -> standing, show
 *   - `year_built == null`      -> unknown construction date; we
 *     assume it could exist (most undated OSM buildings are older
 *     housing stock that probably predates whatever year you typed).
 *     Switch to a stricter rule if the atlas grows enough data to
 *     justify it.
 */
export function osmBuildingExistsInYear(
  properties: { year_built?: string | number | null },
  atlasYear: number,
): boolean {
  const built = parseHistoricalYear(properties.year_built ?? null);
  if (built === null) return true;
  return built <= atlasYear;
}

/**
 * Does a historical reconstruction exist in the given atlas year?
 *
 * A reconstruction is visible when the typed year falls inside its
 * recorded lifespan: `time_start <= atlasYear <= time_end`. Unknown
 * boundaries are treated permissively (null start = always old
 * enough; null end = still standing).
 */
export function reconstructionExistsInYear(
  reconstruction: {
    time_start?: string | number | null;
    time_end?: string | number | null;
  },
  atlasYear: number,
): boolean {
  const start = parseHistoricalYear(reconstruction.time_start ?? null);
  const end = parseHistoricalYear(reconstruction.time_end ?? null);
  if (start !== null && atlasYear < start) return false;
  if (end !== null && atlasYear > end) return false;
  return true;
}
