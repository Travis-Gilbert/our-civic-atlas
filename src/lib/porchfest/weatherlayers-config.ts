/**
 * WeatherLayers Cloud configuration for the planner weather overlay (Lane 4
 * Tier 2). The data is a paid WeatherLayers Cloud subscription; the access
 * token is a browser-facing public env value (no service-tier secret), so it
 * is read at build time like the sync URL. When the token is absent the
 * overlay degrades to an honest "needs a data token" note and renders nothing.
 *
 * Dataset slugs default to GFS but are env-overridable so the organizer can
 * point them at the exact slugs from their WeatherLayers Cloud catalog
 * without a code change.
 */

export const WEATHERLAYERS_TOKEN =
  process.env.NEXT_PUBLIC_WEATHERLAYERS_TOKEN ?? "";

export const WEATHERLAYERS_WIND_DATASET =
  process.env.NEXT_PUBLIC_WEATHERLAYERS_WIND_DATASET ??
  "gfs/wind_10m_above_ground";

export const WEATHERLAYERS_PRECIP_DATASET =
  process.env.NEXT_PUBLIC_WEATHERLAYERS_PRECIP_DATASET ??
  "gfs/precipitation_surface";

/**
 * Suspend the GPU-heavy particle + raster layers below this zoom: a regional
 * weather field is meaningful at city/regional zoom but wasteful at a
 * continental frame, so the overlay only draws once the map is zoomed in to
 * at least this level.
 */
export const WEATHER_MIN_ZOOM = 8;

export function hasWeatherLayersToken(): boolean {
  return WEATHERLAYERS_TOKEN.trim().length > 0;
}
