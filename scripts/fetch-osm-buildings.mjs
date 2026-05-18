#!/usr/bin/env node
/**
 * One-shot fetcher: Flint building footprints from OpenStreetMap.
 *
 * Pulls all `building=*` ways within a bbox covering the wider Carriage Town
 * / downtown Flint area, converts to a GeoJSON FeatureCollection, and writes
 * to `src/data/open-flint-atlas/fixtures/osm-buildings.json` for the R3F
 * scene to extrude.
 *
 * Run:   node scripts/fetch-osm-buildings.mjs
 * Re-run on schema-bumps; output is checked into the repo for repeatable
 * dev startup without depending on Overpass at runtime.
 *
 * License: data © OpenStreetMap contributors, ODbL.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const OUT_PATH = path.join(
  repoRoot,
  "src/data/open-flint-atlas/fixtures/osm-buildings.json",
);

// City of Flint, MI bounding box. South, West, North, East (Overpass
// convention). Covers the full city limits (~33 sq mi) with a small
// buffer on each side so footprints exactly on the boundary aren't
// clipped. Genesee County / Burton / Mt Morris / Flint Township are
// intentionally outside this box — when those atlases land they'll be
// fetched into their own fixtures.
const BBOX = [42.965, -83.795, 43.085, -83.595];

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
// Overpass timeout extended because the wider Flint bbox returns
// significantly more ways than the Carriage Town slice.
const QUERY = `
[out:json][timeout:90];
(
  way["building"](${BBOX.join(",")});
);
out geom;
`.trim();

function osmWayToFeature(way) {
  const nodes = way.geometry ?? [];
  if (nodes.length < 3) return null;
  // GeoJSON polygons need a closed ring. Overpass guarantees first/last
  // node match for closed ways, but we double-check.
  const ring = nodes.map((n) => [n.lon, n.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }

  const tags = way.tags ?? {};
  const levels = tags["building:levels"];
  const heightMeters = parseHeight(tags.height) ?? (levels ? Number(levels) * 3 : null);

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {
      osm_id: way.id,
      building: tags.building,
      name: tags.name ?? null,
      address: composeAddress(tags),
      height_meters: heightMeters,
      levels: levels ? Number(levels) : null,
      year_built: tags.start_date ?? tags["building:start_date"] ?? null,
      use: tags["building:use"] ?? null,
    },
  };
}

function parseHeight(raw) {
  if (!raw) return null;
  const num = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function composeAddress(tags) {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.join(", ") || null;
}

async function main() {
  const body = `data=${encodeURIComponent(QUERY)}`;
  console.log(`Querying Overpass for buildings in bbox ${BBOX.join(", ")}...`);
  const start = Date.now();
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "User-Agent": "open-flint-atlas/0.1 (https://github.com/Travis-Gilbert/our-civic-atlas)",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Overpass returned ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const elapsed = Math.round((Date.now() - start) / 100) / 10;

  const ways = (data.elements ?? []).filter((el) => el.type === "way");
  const features = ways
    .map(osmWayToFeature)
    .filter((f) => f !== null);

  const collection = {
    type: "FeatureCollection",
    metadata: {
      generated_at: new Date().toISOString(),
      generator: "scripts/fetch-osm-buildings.mjs",
      source: "OpenStreetMap (ODbL)",
      bbox: BBOX,
      query_elapsed_s: elapsed,
    },
    features,
  };

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${features.length} building footprints (${elapsed}s) to ${path.relative(repoRoot, OUT_PATH)}.`,
  );
}

main().catch((err) => {
  console.error(`fetch-osm-buildings failed: ${err.message}`);
  process.exitCode = 1;
});
