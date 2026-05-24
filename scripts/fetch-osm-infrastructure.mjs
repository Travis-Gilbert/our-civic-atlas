#!/usr/bin/env node
/**
 * One-shot fetcher: Flint infrastructure layers from OpenStreetMap.
 *
 * Pulls four feature classes within the same Flint bbox used by
 * `fetch-osm-buildings.mjs`:
 *
 *   - parks / green space: `leisure=park|garden`,
 *       `landuse=recreation_ground|cemetery`
 *   - water: `waterway=*`, `natural=water`
 *   - rail: `railway=rail|disused|abandoned`
 *   - highway corridors: `highway=motorway|trunk` (just those — `primary`
 *       and below are basemap raster's job)
 *
 * Writes to `src/data/open-flint-atlas/fixtures/osm-infrastructure.json`
 * as a FeatureCollection with one feature per OSM way/relation; the
 * `properties.layer_class` tag distinguishes which downstream renderer
 * layer the feature belongs to. The renderer in `AtlasMap.tsx`
 * partitions by `layer_class` and styles each accordingly. Spec:
 * docs/design-2026-05-map-body-discipline.md Change 3.
 *
 * Run:   node scripts/fetch-osm-infrastructure.mjs
 * Re-run when the city pack changes; output is checked into the repo
 * for repeatable dev startup.
 *
 * License: data (c) OpenStreetMap contributors, ODbL.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const OUT_PATH = path.join(
  repoRoot,
  "src/data/open-flint-atlas/fixtures/osm-infrastructure.json",
);

// Same Flint bbox as fetch-osm-buildings.mjs. South, West, North, East.
const BBOX = [42.965, -83.795, 43.085, -83.595];

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
// One union query covers all layer classes. `out geom` returns
// inlined geometry per way/relation, sparing us the second-pass
// node-resolution loop. Highway tiers extended PR 5 (buildings-as-sketch)
// from motorway/trunk only to three tiers: arterial, collector, local.
const QUERY = `
[out:json][timeout:180];
(
  way["leisure"~"^(park|garden)$"](${BBOX.join(",")});
  way["landuse"~"^(recreation_ground|cemetery)$"](${BBOX.join(",")});
  way["waterway"](${BBOX.join(",")});
  way["natural"="water"](${BBOX.join(",")});
  way["railway"~"^(rail|disused|abandoned)$"](${BBOX.join(",")});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|service)$"](${BBOX.join(",")});
);
out geom;
`.trim();

function layerClassFor(tags) {
  if (tags.leisure === "park" || tags.leisure === "garden") return "park";
  if (tags.landuse === "recreation_ground" || tags.landuse === "cemetery") return "park";
  if (tags.natural === "water") return "water_body";
  if (typeof tags.waterway === "string" && tags.waterway.length > 0) return "water_way";
  if (typeof tags.railway === "string" && tags.railway.length > 0) {
    if (tags.railway === "disused" || tags.railway === "abandoned") {
      return "rail_disused";
    }
    return "rail_active";
  }
  if (typeof tags.highway === "string" && tags.highway.length > 0) {
    if (tags.highway === "motorway" || tags.highway === "trunk" || tags.highway === "primary") {
      return "highway_arterial";
    }
    if (tags.highway === "secondary" || tags.highway === "tertiary") {
      return "highway_collector";
    }
    if (
      tags.highway === "residential" ||
      tags.highway === "unclassified" ||
      tags.highway === "service"
    ) {
      return "highway_local";
    }
  }
  return null;
}

function isClosedRing(nodes) {
  if (nodes.length < 4) return false;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  return first.lon === last.lon && first.lat === last.lat;
}

function osmWayToFeature(way) {
  const nodes = way.geometry ?? [];
  if (nodes.length < 2) return null;

  const tags = way.tags ?? {};
  const layerClass = layerClassFor(tags);
  if (!layerClass) return null;

  // Polygon for closed-ring features (parks, water bodies). Linestring
  // for the rest (waterways, rail, highways).
  const ring = nodes.map((n) => [n.lon, n.lat]);
  const polygonClass = layerClass === "park" || layerClass === "water_body";
  let geometry;
  if (polygonClass && nodes.length >= 3 && isClosedRing(nodes)) {
    geometry = { type: "Polygon", coordinates: [ring] };
  } else if (polygonClass && nodes.length >= 3) {
    // Force-close polygon rings if Overpass returned an open polygon
    // (rare but happens with sloppy edits).
    ring.push([ring[0][0], ring[0][1]]);
    geometry = { type: "Polygon", coordinates: [ring] };
  } else {
    geometry = { type: "LineString", coordinates: ring };
  }

  return {
    type: "Feature",
    geometry,
    properties: {
      osm_id: way.id,
      layer_class: layerClass,
      name: tags.name ?? null,
      // Original tag values are kept so future renderer revisions can
      // re-partition without going back to Overpass.
      leisure: tags.leisure ?? null,
      landuse: tags.landuse ?? null,
      waterway: tags.waterway ?? null,
      natural: tags.natural ?? null,
      railway: tags.railway ?? null,
      highway: tags.highway ?? null,
    },
  };
}

async function main() {
  const body = `data=${encodeURIComponent(QUERY)}`;
  console.log(`Querying Overpass for infrastructure in bbox ${BBOX.join(", ")}...`);
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
  // Sort by osm_id so the JSON output is order-stable across refetches.
  // Without this the diff balloons every regenerate because Overpass
  // doesn't guarantee response order.
  const features = ways
    .map(osmWayToFeature)
    .filter((f) => f !== null)
    .sort((a, b) => a.properties.osm_id - b.properties.osm_id);

  const classCounts = features.reduce((acc, f) => {
    acc[f.properties.layer_class] = (acc[f.properties.layer_class] ?? 0) + 1;
    return acc;
  }, {});

  const collection = {
    type: "FeatureCollection",
    metadata: {
      generated_at: new Date().toISOString(),
      generator: "scripts/fetch-osm-infrastructure.mjs",
      source: "OpenStreetMap (ODbL)",
      bbox: BBOX,
      query_elapsed_s: elapsed,
      class_counts: classCounts,
    },
    features,
  };

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${features.length} infrastructure features (${elapsed}s) to ${path.relative(repoRoot, OUT_PATH)}.`,
  );
  console.log(`Class counts: ${JSON.stringify(classCounts)}`);
}

main().catch((err) => {
  console.error(`fetch-osm-infrastructure failed: ${err.message}`);
  process.exitCode = 1;
});
