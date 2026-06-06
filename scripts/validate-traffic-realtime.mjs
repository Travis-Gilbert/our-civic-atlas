import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * validate-traffic-realtime
 *
 * Enforces the traffic-domain calibration discipline (per the handoff and
 * docs/plans/traffic-domain-realtime/): every flow estimate carries provenance,
 * and the snapshot never presents fixture / inferred flow as a live feed. A flow
 * estimate with no provenance is a bug, not a feature.
 *
 * Default: validates the in-repo seed fixture
 *   src/data/open-flint-atlas/fixtures/traffic/realtime-flint.json
 * (skipped with a notice if absent, so a clean checkout still passes).
 *
 * --base-url <origin>: also fetch and validate the live/route-shim snapshot at
 *   <origin>/api/v2/theseus/open-flint-atlas/traffic/realtime
 *
 * --fail-on-warning: treat warnings as failures.
 *
 * Mirrors the contract in docs/design/flint-graphql-schema-v1.graphql Extension 8
 * (TrafficEstimateBasis / TrafficSourceStatus / TrafficFeedStatus).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const FIXTURE = path.join(
  root,
  "src/data/open-flint-atlas/fixtures/traffic/realtime-flint.json",
);

const ESTIMATE_BASIS = new Set(["live_feed", "hourly_pattern", "scenario_model"]);
const SOURCE_STATUS = new Set(["live", "fixture", "pending_live_source"]);
const FEED_STATUS = new Set(["live", "fixture_fallback", "unavailable"]);
// Generous bounding box around Flint, MI (sanity check on segment geometry).
const FLINT_BBOX = { west: -83.95, south: 42.9, east: -83.55, north: 43.1 };

const args = process.argv.slice(2);
const failOnWarning = args.includes("--fail-on-warning");
const baseUrlIdx = args.indexOf("--base-url");
const baseUrl = baseUrlIdx >= 0 ? args[baseUrlIdx + 1] : null;

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function validateSnapshot(snap, label) {
  if (!snap || typeof snap !== "object") {
    err(`${label}: not an object`);
    return 0;
  }
  if (!snap.feed_id) err(`${label}: missing feed_id`);
  if (!FEED_STATUS.has(snap.status)) {
    err(`${label}: invalid snapshot status '${snap.status}'`);
  }
  if (!(Number(snap.refresh_interval_seconds) > 0)) {
    warn(`${label}: refresh_interval_seconds not a positive number`);
  }

  const features = snap.segments?.features;
  if (!Array.isArray(features)) {
    err(`${label}: segments.features is not an array`);
    return 0;
  }
  if (features.length === 0) warn(`${label}: snapshot has zero segments`);

  let liveSegments = 0;

  features.forEach((feature, i) => {
    const p = feature?.properties ?? {};
    const tag = `${label} segment[${i}] ${p.segment_id ?? "(no id)"}`;

    if (!p.segment_id) err(`${tag}: missing segment_id`);
    if (!p.corridor_name) warn(`${tag}: missing corridor_name`);

    // Provenance is mandatory (the calibration discipline).
    if (!ESTIMATE_BASIS.has(p.estimate_basis)) {
      err(`${tag}: invalid/missing estimate_basis '${p.estimate_basis}'`);
    }
    if (!SOURCE_STATUS.has(p.source_status)) {
      err(`${tag}: invalid/missing source_status '${p.source_status}'`);
    }
    if (p.source_status === "live") liveSegments += 1;
    if (!p.source_label) warn(`${tag}: missing source_label`);
    if (!p.support_note || String(p.support_note).trim().length < 8) {
      warn(`${tag}: thin/missing support_note (provenance prose)`);
    }

    const conf = p.confidence;
    if (typeof conf !== "number" || conf < 0 || conf > 1) {
      err(`${tag}: confidence out of [0,1]: ${conf}`);
    }

    // Seed fixtures carry base_* values; computed snapshots carry the live names.
    const speed = p.speed_mph ?? p.base_speed_mph;
    const volume = p.volume_per_hour ?? p.base_volume_per_hour;
    const freeFlow = p.free_flow_speed_mph;
    if (!(Number(speed) > 0)) err(`${tag}: speed not a positive number`);
    if (!(Number(volume) >= 0)) warn(`${tag}: volume not >= 0`);
    if (typeof freeFlow === "number" && Number(speed) > freeFlow + 0.5) {
      warn(`${tag}: speed ${speed} exceeds free-flow ${freeFlow}`);
    }

    const geom = feature?.geometry;
    if (
      !geom ||
      geom.type !== "LineString" ||
      !Array.isArray(geom.coordinates) ||
      geom.coordinates.length < 2
    ) {
      err(`${tag}: geometry is not a LineString with >= 2 positions`);
    } else {
      geom.coordinates.forEach((c, j) => {
        const [lon, lat] = Array.isArray(c) ? c : [];
        if (typeof lon !== "number" || typeof lat !== "number") {
          err(`${tag}: coordinate[${j}] is not [lon, lat]`);
        } else if (
          lon < FLINT_BBOX.west ||
          lon > FLINT_BBOX.east ||
          lat < FLINT_BBOX.south ||
          lat > FLINT_BBOX.north
        ) {
          warn(`${tag}: coordinate[${j}] (${lon}, ${lat}) is outside the Flint bbox`);
        }
      });
    }
  });

  // The honesty invariant: never present non-live flow as live.
  if (snap.status !== "live" && liveSegments > 0) {
    err(
      `${label}: HONESTY violation - snapshot status '${snap.status}' but ` +
        `${liveSegments} segment(s) claim source_status='live'`,
    );
  }

  return features.length;
}

// --- Fixture (offline) ------------------------------------------------------
try {
  const raw = await readFile(FIXTURE, "utf8");
  const fixture = JSON.parse(raw);
  const n = validateSnapshot(fixture, "fixture realtime-flint.json");
  console.log(
    `Validated traffic fixture: ${n} segments, status '${fixture.status}'.`,
  );
} catch (e) {
  if (e.code === "ENOENT") {
    console.log(
      "Traffic fixture realtime-flint.json not present (skipping fixture check).",
    );
  } else {
    err(`fixture parse error: ${e.message}`);
  }
}

// --- Live / route-shim snapshot (optional) ----------------------------------
if (baseUrl) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/v2/theseus/open-flint-atlas/traffic/realtime`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      err(`live: HTTP ${res.status} from ${url}`);
    } else {
      const snap = await res.json();
      const n = validateSnapshot(snap, `live ${url}`);
      console.log(
        `Validated live traffic snapshot: ${n} segments, status '${snap.status}'.`,
      );
    }
  } catch (e) {
    err(`live fetch error from ${url}: ${e.message}`);
  }
}

// --- Report -----------------------------------------------------------------
for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);

if (errors.length > 0 || (failOnWarning && warnings.length > 0)) {
  console.error(
    `Traffic realtime validation FAILED: ${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Traffic realtime validation passed (${warnings.length} warning(s)).`,
  );
}
