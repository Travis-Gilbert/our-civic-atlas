#!/usr/bin/env node
/**
 * KML/KMZ -> event-layer JSON importer for Porchfest Planner Phase 1.
 *
 * Usage:
 *   node scripts/kml-to-event-layer.mjs \
 *     --in path/to/porchfest.kmz   \
 *     --out src/data/open-flint-atlas/fixtures/porchfest-2026.json \
 *     [--slug porchfest-2026] [--title "Carriage Town Porchfest 2026"] \
 *     [--follow-networklink]
 *
 * Accepts either:
 *   - Raw KML (.kml) text file
 *   - KMZ (.kmz) zip archive whose root `doc.kml` is the canonical
 *     My Maps export
 *   - KMZ shortcut whose `doc.kml` is a single <NetworkLink> pointing
 *     at https://www.google.com/maps/d/u/1/kml?mid=... — the script
 *     follows the link automatically and re-processes the response.
 *     This is what Google My Maps gives you when "Keep data up to date"
 *     is left ON during export.
 *
 * Category strategy (priority order):
 *   1. Immediate parent <Folder> name: "Music" -> music, "Vendors" ->
 *      vendor, "Trees and Landmarks" -> amenity, "Walkways and
 *      Openings" -> (skip, lines not points).
 *   2. Label heuristics inside mixed folders like "Amenties & Misc":
 *      "After Party" -> after_party, "Parking" -> parking, etc.
 *   3. Fallback: vendor + TODO_CATEGORY note so a human can review.
 *
 * Why folder beats style/icon for GMM exports: My Maps assigns icon
 * URLs like `images/icon-3.png` inside the KMZ — these are local
 * references with no semantic meaning. Style IDs encode the icon
 * catalog number ("icon-1684-...") but decoding 1684 requires the
 * Google Maps icon catalog. Folder names are the user's own labels
 * and survive icon-swap edits.
 *
 * Requirements: xml2js + adm-zip are devDependencies. Install with
 * `npm install` after pulling the branch.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseStringPromise } from "xml2js";
import AdmZip from "adm-zip";

/* ------------------------------------------------------------------ */
/*  Category strategy                                                  */
/* ------------------------------------------------------------------ */

// Folder name -> category. Case-insensitive substring match against
// the immediate parent <Folder><name>. The most specific match wins
// (longer substrings first).
const FOLDER_TO_CATEGORY = [
  { match: "amenties", category: null }, // mixed; resolved by label rules below
  { match: "amenities", category: null },
  { match: "misc", category: null },
  { match: "music", category: "music" },
  { match: "vendor", category: "vendor" },
  { match: "trees", category: "amenity" },
  { match: "landmark", category: "amenity" },
  { match: "walkway", category: "amenity" },
  { match: "opening", category: "amenity" },
];

// Label-based fallback for placemarks inside a mixed-bag folder
// (e.g., "Amenties & Misc"). Order matters: most specific first.
// `dinn?ing` accepts the common GMM typo "Dinning" (double-n) in
// addition to the standard "Dining". Order matters: the most specific
// pattern wins ("rest and dining" -> rest_area, not food_court).
const LABEL_RULES = [
  { pattern: /\b(after.?party)\b/i, category: "after_party" },
  { pattern: /\b(rest.?and.?dinn?ing|rest.?area|shade|seating|parachute)\b/i, category: "rest_area" },
  { pattern: /\b(food.?court|food.?truck|dinn?ing|dinn?ing.?area)\b/i, category: "food_court" },
  { pattern: /\b(kid|child|playground)/i, category: "kid_zone" },
  { pattern: /\b(restroom|toilet|porta|bathroom)/i, category: "restroom" },
  { pattern: /\b(parking|lot|ada)/i, category: "parking" },
  { pattern: /\b(music|porch|band|trio|choir|jazz|blues|folk|stage)/i, category: "music" },
];

function categoryFor({ folderPath, label }) {
  // Walk the folder chain from innermost to outermost so a deeply
  // nested vendor in "Vendors / Sidewalk Green Space" still resolves
  // to "vendor". `null` in FOLDER_TO_CATEGORY means "this folder is
  // mixed; fall through to label rules" — e.g., "Amenties & Misc".
  for (const folderName of [...folderPath].reverse()) {
    const lower = folderName.toLowerCase();
    for (const rule of FOLDER_TO_CATEGORY) {
      if (lower.includes(rule.match)) {
        if (rule.category != null) return { category: rule.category, todo: false };
        break; // mixed folder; bail out and try label rules
      }
    }
  }
  for (const rule of LABEL_RULES) {
    if (rule.pattern.test(label ?? "")) {
      return { category: rule.category, todo: false };
    }
  }
  return { category: "vendor", todo: true };
}

/* ------------------------------------------------------------------ */
/*  KML parsing                                                        */
/* ------------------------------------------------------------------ */

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseCoordinates(text) {
  // KML coordinates: "lng,lat,alt" tuples separated by whitespace.
  // For Point geometries there is exactly one tuple.
  if (!text) return null;
  const tuple = text.trim().split(/\s+/)[0];
  if (!tuple) return null;
  const parts = tuple.split(",").map((n) => Number(n.trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return null;
  }
  return [parts[0], parts[1]]; // [lng, lat]
}

function placemarkGeometry(placemark) {
  // Phase 1 cares about Points. LineString/Polygon land here too if
  // future phases add them, but we report them as skipped today.
  const point = placemark?.Point?.[0] ?? placemark?.Point;
  if (point) {
    const coords = parseCoordinates(point?.coordinates?.[0] ?? point?.coordinates);
    if (!coords) return null;
    return { type: "Point", coordinates: coords };
  }
  return null;
}

function placemarkDescription(placemark) {
  const description =
    (placemark?.description?.[0] ?? placemark?.description ?? "").toString().trim();
  return description;
}

function placemarkLabel(placemark) {
  const raw = placemark?.name?.[0] ?? placemark?.name ?? "";
  // Names can be CDATA-wrapped or contain leading/trailing whitespace
  // and newlines (the live KML has a few "River and Willow\n" rows).
  return String(raw).replace(/\s+/g, " ").trim();
}

/**
 * Walk the tree depth-first, accumulating the folder path as we
 * descend so each Placemark knows the chain of folder names that
 * contains it. Returns a flat array of { placemark, folderPath }.
 */
function collectPlacemarks(node, folderPath = [], acc = []) {
  if (!node || typeof node !== "object") return acc;
  for (const placemark of asArray(node.Placemark)) {
    acc.push({ placemark, folderPath });
  }
  for (const folder of asArray(node.Folder)) {
    const folderName =
      String(folder?.name?.[0] ?? folder?.name ?? "").trim() || "(unnamed)";
    collectPlacemarks(folder, [...folderPath, folderName], acc);
  }
  return acc;
}

/* ------------------------------------------------------------------ */
/*  KMZ + NetworkLink loading                                          */
/* ------------------------------------------------------------------ */

function isZipBuffer(buffer) {
  // ZIP local-file-header signature: bytes "PK\x03\x04".
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

function extractDocKmlFromKmz(buffer) {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry("doc.kml");
  if (!entry) {
    throw new Error(
      "KMZ archive does not contain a doc.kml entry. Is this a Google My Maps export?",
    );
  }
  return entry.getData().toString("utf8");
}

function findNetworkLinkHref(documentNode) {
  // The shortcut form of a GMM export contains a single <NetworkLink>
  // at the document root with a single <Link><href>...</href>.
  const networkLink = documentNode?.NetworkLink?.[0] ?? documentNode?.NetworkLink;
  if (!networkLink) return null;
  const link = networkLink?.Link?.[0] ?? networkLink?.Link;
  const href = link?.href?.[0] ?? link?.href ?? null;
  return href ? String(href).trim() : null;
}

async function fetchUrl(url) {
  // Node 18+ ships global fetch. Use it to follow the NetworkLink so
  // we don't take a curl dependency.
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Returns the parsed KML object (xml2js shape) plus the `<Document>`
 * node, handling all three input flavors:
 *   - raw KML text
 *   - KMZ with inlined placemarks
 *   - KMZ shortcut with a NetworkLink (when followLink=true)
 */
async function loadKmlDocument(filePath, { followLink }) {
  const initialBuffer = await readFile(filePath);
  const kmlText = isZipBuffer(initialBuffer)
    ? extractDocKmlFromKmz(initialBuffer)
    : initialBuffer.toString("utf8");

  const parsed = await parseStringPromise(kmlText, {
    explicitArray: true,
    trim: true,
  });
  const document = parsed?.kml?.Document?.[0];
  if (!document) {
    throw new Error(
      "KML does not contain a <Document> root. Is this a Google My Maps export?",
    );
  }

  const networkLinkHref = findNetworkLinkHref(document);
  if (networkLinkHref && asArray(document.Placemark).length === 0 && asArray(document.Folder).length === 0) {
    if (!followLink) {
      throw new Error(
        `KML is a NetworkLink shortcut (no inlined placemarks). Re-run with --follow-networklink to fetch ${networkLinkHref} automatically, or re-export from Google My Maps with "Keep data up to date" turned OFF.`,
      );
    }
    console.log(`Following NetworkLink: ${networkLinkHref}`);
    const liveBuffer = await fetchUrl(networkLinkHref);
    const liveText = isZipBuffer(liveBuffer)
      ? extractDocKmlFromKmz(liveBuffer)
      : liveBuffer.toString("utf8");
    const liveParsed = await parseStringPromise(liveText, {
      explicitArray: true,
      trim: true,
    });
    const liveDocument = liveParsed?.kml?.Document?.[0];
    if (!liveDocument) {
      throw new Error(
        "NetworkLink target did not return a KML <Document>. Aborting.",
      );
    }
    return { parsed: liveParsed, document: liveDocument };
  }

  return { parsed, document };
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = {
    in: null,
    out: null,
    slug: "porchfest-2026",
    title: "Carriage Town Porchfest 2026",
    followLink: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--in") {
      args.in = value;
      i += 1;
    } else if (flag === "--out") {
      args.out = value;
      i += 1;
    } else if (flag === "--slug") {
      args.slug = value;
      i += 1;
    } else if (flag === "--title") {
      args.title = value;
      i += 1;
    } else if (flag === "--follow-networklink") {
      args.followLink = true;
    } else if (flag === "--help" || flag === "-h") {
      console.error(
        "Usage: node scripts/kml-to-event-layer.mjs --in <kml|kmz> --out <json> [--slug ...] [--title ...] [--follow-networklink]",
      );
      process.exit(0);
    }
  }
  if (!args.in || !args.out) {
    console.error(
      "Error: --in and --out are required.\n" +
        "Usage: node scripts/kml-to-event-layer.mjs --in <kml|kmz> --out <json> [--slug ...] [--title ...] [--follow-networklink]",
    );
    process.exit(2);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const { document } = await loadKmlDocument(args.in, {
    followLink: args.followLink,
  });

  const placemarks = collectPlacemarks(document);

  let counted = 0;
  let skippedNonPoint = 0;
  const placements = [];
  for (const { placemark, folderPath } of placemarks) {
    const label = placemarkLabel(placemark);
    const geometry = placemarkGeometry(placemark);
    if (!geometry) {
      skippedNonPoint += 1;
      continue;
    }
    const { category, todo } = categoryFor({ folderPath, label });
    const description = placemarkDescription(placemark);
    const noteParts = [];
    if (todo) noteParts.push("TODO_CATEGORY");
    if (folderPath.length > 0) noteParts.push(`folder=${folderPath.join(" > ")}`);
    if (description) noteParts.push(description);
    placements.push({
      category,
      sublabel: "",
      label: label || "(untitled)",
      geometry,
      notes: noteParts.join(" | "),
    });
    counted += 1;
  }

  // Stable order for clean diffs across re-imports.
  placements.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.label.localeCompare(b.label);
  });

  const payload = {
    event_layer: {
      slug: args.slug,
      title: args.title,
    },
    placements,
  };

  const outPath = resolve(args.out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const byCategory = new Map();
  for (const p of placements) {
    byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + 1);
  }
  const summary = [...byCategory.entries()]
    .sort()
    .map(([cat, n]) => `${cat}=${n}`)
    .join(", ");
  console.log(
    `Imported ${counted} placement(s) -> ${outPath} (${summary})${
      skippedNonPoint ? ` skipped ${skippedNonPoint} non-Point feature(s)` : ""
    }`,
  );

  const todoCount = placements.filter((p) => p.notes.startsWith("TODO_CATEGORY")).length;
  if (todoCount > 0) {
    console.log(
      `⚠️  ${todoCount} placement(s) need human review (search the output JSON for TODO_CATEGORY).`,
    );
  }
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? err);
  process.exit(1);
});
