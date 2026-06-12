#!/usr/bin/env node
/**
 * Self-hosted GFS weather pipeline for the porchfest planner (Lane 4 Tier 2).
 *
 * Replaces the paid WeatherLayers Cloud subscription with free NOAA data:
 *   1. Pull a small Great Lakes subset of the latest GFS run from NOMADS
 *      grib_filter (UGRD/VGRD at 10 m + PRATE at the surface). Server-side
 *      subsetting keeps each frame around 10 KB, never a full global file.
 *   2. Convert each GRIB2 frame to float GeoTIFFs with GDAL: a 2-band wind
 *      tiff (U, V -> weatherlayers VECTOR) and a 1-band precip tiff (PRATE ->
 *      SCALAR). Float values mean imageUnscale is null (raw m/s, kg/m2/s).
 *   3. Write public/weather/manifest.json so the frontend can loadTextureData
 *      each frame and scrub the forecast hours.
 *
 * The output is public weather data, served as static files (no credential,
 * no GraphQL boundary involved). Run with: npm run weather:fetch
 *
 * Requires GDAL (gdal_translate, gdalinfo) on PATH.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Great Lakes / Michigan frame the festival sits inside.
const BBOX = { left: -93, right: -80, top: 49, bottom: 40 };
// Rolling forecast window: f000..f048 every 3h (the near-term animation).
const FRAME_HOURS = Array.from({ length: 17 }, (_, i) => i * 3);

const OUT_DIR = join(process.cwd(), "public", "weather");
const TMP_DIR = join(tmpdir(), "gfs-weather");

const pad = (n, w = 2) => String(n).padStart(w, "0");

function gfsFilterUrl(dateStr, hh, fff) {
  const params = new URLSearchParams({
    dir: `/gfs.${dateStr}/${hh}/atmos`,
    file: `gfs.t${hh}z.pgrb2.0p25.f${fff}`,
    var_UGRD: "on",
    var_VGRD: "on",
    var_PRATE: "on",
    lev_10_m_above_ground: "on",
    lev_surface: "on",
    subregion: "",
    leftlon: String(BBOX.left),
    rightlon: String(BBOX.right),
    toplat: String(BBOX.top),
    bottomlat: String(BBOX.bottom),
  });
  return `https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?${params.toString()}`;
}

function download(url, dest) {
  execFileSync("curl", ["-sS", "--max-time", "120", "-o", dest, url], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (!existsSync(dest)) return false;
  // grib_filter returns 200 with a tiny HTML/error body on bad params; a real
  // GRIB2 message starts with the ASCII magic "GRIB".
  const head = readFileSync(dest).subarray(0, 4).toString("latin1");
  return head === "GRIB";
}

/** Map GRIB messages to band indices by element + level. */
function bandIndices(gribPath) {
  const info = JSON.parse(
    execFileSync("gdalinfo", ["-json", gribPath], { encoding: "utf8" }),
  );
  let u, v, p;
  for (const band of info.bands ?? []) {
    const meta = band.metadata?.[""] ?? {};
    const element = meta.GRIB_ELEMENT;
    const level = meta.GRIB_SHORT_NAME ?? "";
    if (element === "UGRD" && level.includes("10-HTGL")) u = band.band;
    else if (element === "VGRD" && level.includes("10-HTGL")) v = band.band;
    else if (element === "PRATE") p = band.band;
  }
  return { u, v, p, size: [info.size?.[0], info.size?.[1]], corner: info.cornerCoordinates };
}

function translate(gribPath, bands, outPath) {
  const bandArgs = bands.flatMap((b) => ["-b", String(b)]);
  execFileSync(
    "gdal_translate",
    ["-q", ...bandArgs, "-ot", "Float32", "-of", "GTiff", "-co", "COMPRESS=DEFLATE", gribPath, outPath],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
}

/** Most recent GFS cycle (UTC) at least `lagHours` old, floored to 6h. */
function cycleAt(lagHours) {
  const now = Date.now();
  const floored = Math.floor((now - lagHours * 3600_000) / (6 * 3600_000)) * (6 * 3600_000);
  return new Date(floored);
}

function isoDate(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function main() {
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(TMP_DIR, { recursive: true });
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // Pick the newest cycle whose f000 is actually posted (GFS f000 lands ~3.5h
  // after the cycle; fall back a cycle or two if NOMADS has not published yet).
  let cycle = null;
  for (const lag of [5, 11, 17]) {
    const candidate = cycleAt(lag);
    const probe = join(TMP_DIR, "probe.grib2");
    const dateStr = isoDate(candidate);
    const hh = pad(candidate.getUTCHours());
    process.stdout.write(`Probing GFS ${dateStr} ${hh}Z ... `);
    if (download(gfsFilterUrl(dateStr, hh, "000"), probe)) {
      console.log("available");
      cycle = candidate;
      break;
    }
    console.log("not yet");
  }
  if (!cycle) throw new Error("No GFS cycle available from NOMADS");

  const dateStr = isoDate(cycle);
  const hh = pad(cycle.getUTCHours());
  let bounds = null;
  const frames = [];

  for (const hour of FRAME_HOURS) {
    const fff = pad(hour, 3);
    const grib = join(TMP_DIR, `f${fff}.grib2`);
    process.stdout.write(`  f${fff} ... `);
    if (!download(gfsFilterUrl(dateStr, hh, fff), grib)) {
      console.log("skip (not posted)");
      continue;
    }
    const { u, v, p, corner } = bandIndices(grib);
    if (!u || !v || !p) {
      console.log("skip (missing bands)");
      continue;
    }
    translate(grib, [u, v], join(OUT_DIR, `wind_f${fff}.tif`));
    translate(grib, [p], join(OUT_DIR, `precip_f${fff}.tif`));
    if (!bounds && corner) {
      // weatherlayers bounds: [west, south, east, north]
      bounds = [
        corner.upperLeft[0],
        corner.lowerRight[1],
        corner.lowerRight[0],
        corner.upperLeft[1],
      ];
    }
    const datetime = new Date(cycle.getTime() + hour * 3600_000).toISOString();
    frames.push({
      datetime,
      forecastHour: hour,
      wind: `/weather/wind_f${fff}.tif`,
      precip: `/weather/precip_f${fff}.tif`,
    });
    console.log("ok");
  }

  if (frames.length === 0) throw new Error("No frames converted");

  const manifest = {
    generatedAt: new Date().toISOString(),
    run: cycle.toISOString(),
    source: "NOAA GFS 0.25deg (NOMADS), GDAL GeoTIFF",
    bounds,
    frames,
  };
  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  rmSync(TMP_DIR, { recursive: true, force: true });
  console.log(`\nWrote ${frames.length} frames to public/weather (run ${cycle.toISOString()})`);
}

main();
