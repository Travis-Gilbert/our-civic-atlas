#!/usr/bin/env node
/**
 * Build the Carriage Town geocode index.
 *
 * Joins the City of Flint parcel addresses (flint-building-addresses.json,
 * keyed by OSM building id) with the OSM building footprints
 * (osm-buildings.json) to produce a compact { osmId, address, fullAddress,
 * lng, lat } list scoped to the festival footprint. This is the local data
 * the planner geocodes against in both directions (nearest-address on place,
 * address-to-location on edit) so neither path needs an external service or
 * loads the full 21k-feature building set in the browser.
 *
 * Output: src/data/open-flint-atlas/fixtures/carriage-town-geocode-index.json
 * Run with: npm run atlas:geocode-index
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURES = join(process.cwd(), "src", "data", "open-flint-atlas", "fixtures");
const ADDRESSES = JSON.parse(
  readFileSync(join(FIXTURES, "flint-building-addresses.json"), "utf8"),
).addresses;
const BUILDINGS = JSON.parse(
  readFileSync(join(FIXTURES, "osm-buildings.json"), "utf8"),
).features;

/** Centroid (vertex average of the exterior ring) of a Polygon/MultiPolygon. */
function centroid(geometry) {
  let ring;
  if (geometry.type === "Polygon") ring = geometry.coordinates[0];
  else if (geometry.type === "MultiPolygon") ring = geometry.coordinates[0][0];
  else return null;
  if (!ring || ring.length === 0) return null;
  // Drop the closing vertex (== first) so it does not double-weight.
  const pts = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring;
  let lng = 0;
  let lat = 0;
  for (const [x, y] of pts) {
    lng += x;
    lat += y;
  }
  return [lng / pts.length, lat / pts.length];
}

// Index building footprints by osm_id, but only the ones we have an address
// for, so we walk the big set once and keep ~750 centroids.
const centroidById = new Map();
for (const feature of BUILDINGS) {
  const id = feature.properties?.osm_id;
  if (id == null) continue;
  const key = String(id);
  if (!(key in ADDRESSES) || centroidById.has(key)) continue;
  const c = centroid(feature.geometry);
  if (c) centroidById.set(key, c);
}

const entries = [];
let missing = 0;
for (const [osmId, record] of Object.entries(ADDRESSES)) {
  const c = centroidById.get(osmId);
  if (!c) {
    missing += 1;
    continue;
  }
  entries.push({
    osmId,
    address: record.address,
    fullAddress: record.fullAddress ?? record.address,
    lng: Number(c[0].toFixed(6)),
    lat: Number(c[1].toFixed(6)),
  });
}

const out = {
  meta: {
    source: "Join of flint-building-addresses.json (City of Flint GIS) and osm-buildings.json centroids",
    generatedBy: "scripts/build-geocode-index.mjs",
    count: entries.length,
    missingCentroid: missing,
  },
  entries,
};

const outPath = join(FIXTURES, "carriage-town-geocode-index.json");
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${entries.length} geocode entries (${missing} addresses had no footprint) to ${outPath}`);
