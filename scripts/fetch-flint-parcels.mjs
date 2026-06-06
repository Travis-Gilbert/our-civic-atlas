#!/usr/bin/env node
/**
 * fetch-flint-parcels.mjs
 *
 * Step 2 of the Carriage Town address effort: pull REAL addresses from the
 * City of Flint's own GIS, then attach each address to the building it
 * belongs to.
 *
 * Source (authoritative, public, no auth): the City of Flint ArcGIS Online
 * organization (org id lqqWNtSxx8Akj04A), layer "Main_COF_Parcel_view".
 * This is the city's parcel/assessing layer. Every parcel polygon carries a
 * site address (Prop_Add) plus assessing attributes (Year_Built, Use_Type,
 * Prop_Class, Owner_Type, Zoning). It covers the whole Carriage Town extent.
 *
 * Why parcels and a point-in-polygon join (not a geocoder):
 *   - A geocoder GUESSES a coordinate for an address string. That is exactly
 *     what produced the wrong labels we deleted. Here we do the inverse and
 *     trustworthy direction: take the building footprint we already have,
 *     find the city parcel polygon that physically contains it, and read that
 *     parcel's recorded address. No guessing.
 *   - Parcels are larger than buildings, so the building's bbox center lands
 *     squarely inside its parcel. The match is geometric, not fuzzy.
 *
 * Honesty contract (matches the rest of the atlas):
 *   - A parcel with Prop_Num === 0 or a blank Prop_Add is a vacant / unaddressed
 *     lot (often Genesee County Land Bank). We record NO address for it rather
 *     than fabricate one. Accurate-or-absent.
 *   - Every emitted address carries source = "City of Flint GIS" and the parcel
 *     id, so provenance is auditable.
 *
 * Output:
 *   src/data/open-flint-atlas/fixtures/flint-building-addresses.json
 *     { meta, addresses: { "<osm_id>": { address, city, zip, fullAddress,
 *       yearBuilt, useType, propClass, ownerType, zoning, parcelId, source } } }
 *   src/data/open-flint-atlas/fixtures/flint-parcels-carriage-town.geojson
 *     The raw parcels pulled from the city (coords rounded to 6dp) for
 *     provenance and for Step 3 (the edit form can suggest real CT addresses).
 *
 * Run: node scripts/fetch-flint-parcels.mjs
 */

import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIXTURES = join(ROOT, "src/data/open-flint-atlas/fixtures");
const BUILDINGS_PATH = join(FIXTURES, "osm-buildings.json");
const OUT_ADDRESSES = join(FIXTURES, "flint-building-addresses.json");
const OUT_PARCELS = join(FIXTURES, "flint-parcels-carriage-town.geojson");

const LAYER_URL =
  "https://services5.arcgis.com/lqqWNtSxx8Akj04A/arcgis/rest/services/Main_COF_Parcel_view/FeatureServer/0";
const SOURCE_LABEL = "City of Flint GIS";

// Carriage Town extent, matching CARRIAGE_TOWN_BOUNDS in
// src/app/porchfest/PorchfestPlannerClient.tsx: [[W,S],[E,N]].
const CT = { west: -83.7125, south: 43.0145, east: -83.6925, north: 43.0265 };
// Pad the PARCEL fetch so every building inside the CT extent has its
// containing parcel available even at the very edge (~150m of slack).
const PAD = 0.0015;

const OUT_FIELDS = [
  "PIDText",
  "Prop_Add",
  "Prop_Num",
  "Prop_Dir",
  "Prop_Stree",
  "Prop_Unit",
  "Prop_City",
  "Prop_Zip",
  "Full_Prop",
  "Year_Built",
  "Use_Type",
  "Prop_Class",
  "Owner_Type",
  "Zoning",
  "LandUse",
];

const PAGE = 1000;

function envelope({ west, south, east, north }) {
  return `${west},${south},${east},${north}`;
}

async function fetchParcels() {
  const bbox = {
    west: CT.west - PAD,
    south: CT.south - PAD,
    east: CT.east + PAD,
    north: CT.north + PAD,
  };
  const features = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      where: "1=1",
      geometry: envelope(bbox),
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      outSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: OUT_FIELDS.join(","),
      returnGeometry: "true",
      f: "geojson",
      resultRecordCount: String(PAGE),
      resultOffset: String(offset),
    });
    const url = `${LAYER_URL}/query?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ArcGIS query failed: HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) {
      throw new Error(`ArcGIS error: ${JSON.stringify(data.error).slice(0, 200)}`);
    }
    const batch = data.features ?? [];
    features.push(...batch);
    process.stdout.write(`  fetched ${features.length} parcels\r`);
    const more =
      data.exceededTransferLimit === true ||
      data.properties?.exceededTransferLimit === true ||
      batch.length === PAGE;
    if (!more || batch.length === 0) break;
    offset += batch.length;
  }
  process.stdout.write("\n");
  return features;
}

// ---- geometry helpers (no deps) ------------------------------------------

function ringBbox(ring) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

// Ray-casting: is point inside this single ring?
function pointInRing([px, py], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// A GeoJSON Polygon = [outerRing, ...holes]. Inside outer, not inside any hole.
function pointInPolygonRings([outer, ...holes], pt) {
  if (!pointInRing(pt, outer)) return false;
  for (const hole of holes) if (pointInRing(pt, hole)) return false;
  return true;
}

function pointInGeometry(pt, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return pointInPolygonRings(geometry.coordinates, pt);
  if (geometry.type === "MultiPolygon")
    return geometry.coordinates.some((poly) => pointInPolygonRings(poly, pt));
  return false;
}

function bboxCenterOf(geometry) {
  // building outer ring center; robust query point for parcel containment.
  let ring;
  if (geometry.type === "Polygon") ring = geometry.coordinates[0];
  else if (geometry.type === "MultiPolygon") ring = geometry.coordinates[0][0];
  else return null;
  const [minX, minY, maxX, maxY] = ringBbox(ring);
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}
function roundCoords(coords) {
  if (typeof coords[0] === "number") return [round6(coords[0]), round6(coords[1])];
  return coords.map(roundCoords);
}

function str(v) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

// A parcel has a real street address only if it has a positive house number
// and a non-blank Prop_Add that begins with that number.
function addressFromParcel(props) {
  const num = Number(props.Prop_Num) || 0;
  const propAdd = str(props.Prop_Add);
  if (num <= 0 || !propAdd) return null;
  if (!/^\d/.test(propAdd)) return null; // "CONCORD ST" with no number
  const city = str(props.Prop_City) || "FLINT";
  const zip = str(props.Prop_Zip);
  const fullAddress = `${propAdd}, ${city}, MI${zip ? " " + zip : ""}`;
  const yearBuilt = Number(props.Year_Built) || null;
  return {
    address: propAdd,
    city,
    zip: zip || null,
    fullAddress,
    yearBuilt: yearBuilt && yearBuilt > 1800 ? yearBuilt : null,
    useType: str(props.Use_Type) || null,
    propClass: Number(props.Prop_Class) || null,
    ownerType: str(props.Owner_Type) || null,
    zoning: str(props.Zoning) || null,
    parcelId: str(props.PIDText) || null,
    source: SOURCE_LABEL,
  };
}

function inBbox([x, y], b) {
  return x >= b.west && x <= b.east && y >= b.south && y <= b.north;
}

async function main() {
  console.log("Step 2: pulling real Carriage Town addresses from City of Flint GIS");
  console.log(`  layer: ${LAYER_URL}`);
  const rawParcels = await fetchParcels();
  console.log(`  total parcels fetched: ${rawParcels.length}`);

  // Pre-index parcels with their bbox for fast containment tests.
  const parcels = rawParcels
    .filter((f) => f.geometry)
    .map((f) => ({
      bbox: f.geometry.type === "Polygon"
        ? ringBbox(f.geometry.coordinates[0])
        : ringBbox(f.geometry.coordinates[0][0]),
      geometry: f.geometry,
      address: addressFromParcel(f.properties ?? {}),
    }));
  const addressableParcels = parcels.filter((p) => p.address).length;
  console.log(`  parcels with a real street address: ${addressableParcels}`);

  console.log("Loading building footprints...");
  const buildings = JSON.parse(readFileSync(BUILDINGS_PATH, "utf8")).features ?? [];
  const ctBuildings = buildings.filter((b) => {
    const c = bboxCenterOf(b.geometry);
    return c && inBbox(c, CT);
  });
  console.log(`  buildings in Carriage Town extent: ${ctBuildings.length}`);

  const addresses = {};
  let matched = 0;
  let alreadyHadOsm = 0;
  for (const b of ctBuildings) {
    const osmId = b.properties?.osm_id;
    if (osmId == null) continue;
    if (str(b.properties?.address)) alreadyHadOsm += 1;
    const pt = bboxCenterOf(b.geometry);
    if (!pt) continue;
    // find containing parcel (bbox prefilter, then precise ring test)
    let hit = null;
    for (const p of parcels) {
      if (!p.address) continue;
      const [minX, minY, maxX, maxY] = p.bbox;
      if (pt[0] < minX || pt[0] > maxX || pt[1] < minY || pt[1] > maxY) continue;
      if (pointInGeometry(pt, p.geometry)) {
        hit = p;
        break;
      }
    }
    if (hit) {
      addresses[String(osmId)] = hit.address;
      matched += 1;
    }
  }

  const meta = {
    source: SOURCE_LABEL,
    sourceUrl: LAYER_URL,
    sourceOrg: "City of Flint ArcGIS Online org lqqWNtSxx8Akj04A",
    method:
      "point-in-polygon: each building footprint's center matched to the city parcel polygon containing it; address read from the parcel's Prop_Add (accurate-or-absent, no geocoding)",
    bbox: CT,
    parcelsFetched: rawParcels.length,
    addressableParcels,
    buildingsInExtent: ctBuildings.length,
    matchedBuildings: matched,
    buildingsWithPriorOsmAddress: alreadyHadOsm,
    fetchedAt: new Date().toISOString(),
  };

  writeFileSync(OUT_ADDRESSES, JSON.stringify({ meta, addresses }, null, 2));
  console.log(`\nWrote ${OUT_ADDRESSES}`);
  console.log(`  matched ${matched}/${ctBuildings.length} buildings to a city address`);

  // Raw parcels (rounded) for provenance + Step 3 address suggestions.
  const parcelFC = {
    type: "FeatureCollection",
    metadata: { source: SOURCE_LABEL, sourceUrl: LAYER_URL, bbox: CT, fetchedAt: meta.fetchedAt },
    features: rawParcels.map((f) => ({
      type: "Feature",
      properties: f.properties,
      geometry: f.geometry
        ? { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) }
        : null,
    })),
  };
  writeFileSync(OUT_PARCELS, JSON.stringify(parcelFC));
  console.log(`Wrote ${OUT_PARCELS} (${rawParcels.length} parcels)`);

  // Sample so the run is auditable at a glance.
  const sample = Object.entries(addresses).slice(0, 6);
  console.log("\nSample matched addresses:");
  for (const [osmId, a] of sample) {
    console.log(`  osm ${osmId} -> ${a.address}${a.yearBuilt ? ` (built ${a.yearBuilt})` : ""}`);
  }
}

main().catch((err) => {
  console.error("\nfetch-flint-parcels failed:", err.message);
  process.exit(1);
});
