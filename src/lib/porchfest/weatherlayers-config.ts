/**
 * Self-hosted weather overlay configuration (Lane 4 Tier 2).
 *
 * The overlay renders free NOAA GFS data converted to GeoTIFF frames by
 * scripts/fetch-gfs-weather.mjs and served as static files. No subscription,
 * no token: the frontend reads the manifest and loads each frame's textures.
 */

/** Static manifest written by the GFS pipeline (run, bounds, forecast frames). */
export const WEATHER_MANIFEST_URL = "/weather/manifest.json";

/**
 * Suspend the GPU-heavy particle + raster layers below this zoom. The wind
 * field reads best at a regional Great Lakes frame; at street zoom it is a
 * single flat cell, and at a continental frame the particle field is wasteful.
 */
export const WEATHER_MIN_ZOOM = 5;
