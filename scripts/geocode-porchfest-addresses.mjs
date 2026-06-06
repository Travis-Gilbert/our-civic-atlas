#!/usr/bin/env node
/**
 * Reverse-geocode PorchFest placement points into street addresses.
 *
 * The fixture placements carry only a GeoJSON Point (lng/lat) and a
 * label. This script asks OSM Nominatim for the nearest street address
 * to each point and writes it back into the fixture as an `address`
 * field, so the planner chrome can show "where is this porch".
 *
 * Architecture note: this is a BUILD-TIME script, not a runtime path.
 * It holds no service-tier credential and runs locally (same posture as
 * scripts/fetch-osm-buildings.mjs). The frontend never calls a geocoder
 * at request time; it reads the baked `address` from the fixture (and,
 * once the backend adds an address column, from GraphQL).
 *
 * Nominatim usage policy: max 1 request/second, a real User-Agent, no
 * heavy bulk use. We honor it with a 1.1s delay and a descriptive UA.
 * Idempotent: placements that already have a non-empty `address` are
 * skipped unless --force is passed, so re-runs do not re-hit the API.
 *
 * Usage:
 *   node scripts/geocode-porchfest-addresses.mjs [--force] [--fixture PATH]
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE = resolve(
  __dirname,
  "../src/data/open-flint-atlas/fixtures/porchfest-2026.json",
);

const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT =
  "open-flint-atlas-porchfest-geocoder/1.0 (Our Civic Atlas; civic planning tool)";
const DELAY_MS = 1100; // Nominatim policy: <= 1 req/sec.

function parseArgs(argv) {
  const args = { force: false, fixture: DEFAULT_FIXTURE };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--force") args.force = true;
    else if (argv[i] === "--fixture") args.fixture = resolve(argv[(i += 1)]);
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Build a compact "123 Road Street, City, ZIP" line from a Nominatim address. */
function formatAddress(payload) {
  const a = payload?.address ?? {};
  const line1 = [a.house_number, a.road].filter(Boolean).join(" ");
  const city = a.city || a.town || a.village || a.hamlet || a.suburb || "Flint";
  const parts = [line1 || a.road || a.neighbourhood, city, a.postcode].filter(
    Boolean,
  );
  if (parts.length > 0) return parts.join(", ");
  // Fall back to Nominatim's display_name first two segments, or null.
  if (typeof payload?.display_name === "string") {
    return payload.display_name.split(",").slice(0, 2).join(",").trim() || null;
  }
  return null;
}

async function reverseGeocode(lng, lat) {
  const url = `${NOMINATIM}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Nominatim ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  const args = parseArgs(process.argv);
  const raw = await readFile(args.fixture, "utf8");
  const fixture = JSON.parse(raw);
  const placements = fixture.placements ?? [];

  console.log(
    `Geocoding ${placements.length} placement(s) from ${args.fixture}` +
      (args.force ? " (force: re-geocode all)" : " (skip ones already addressed)"),
  );

  let geocoded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < placements.length; i += 1) {
    const p = placements[i];
    if (!args.force && typeof p.address === "string" && p.address.trim()) {
      skipped += 1;
      continue;
    }
    const coords = p.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      console.warn(`  [${i}] ${p.label}: no point geometry, skipping`);
      p.address = p.address ?? null;
      failed += 1;
      continue;
    }
    const [lng, lat] = coords;
    try {
      const payload = await reverseGeocode(lng, lat);
      const address = formatAddress(payload);
      p.address = address;
      geocoded += 1;
      console.log(`  [${i + 1}/${placements.length}] ${p.label} -> ${address ?? "(no match)"}`);
    } catch (error) {
      p.address = p.address ?? null;
      failed += 1;
      console.warn(`  [${i + 1}/${placements.length}] ${p.label}: ${error.message}`);
    }
    if (i < placements.length - 1) await sleep(DELAY_MS);
  }

  // Preserve the fixture's 2-space formatting + trailing newline.
  await writeFile(args.fixture, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");

  console.log(
    `Done. Geocoded ${geocoded}, skipped ${skipped} (already addressed), ` +
      `${failed} without a match. Wrote ${args.fixture}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
