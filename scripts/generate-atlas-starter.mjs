#!/usr/bin/env node
// Generate a minimal atlas node starter from a config JSON.
//
// Usage:
//   node scripts/generate-atlas-starter.mjs --config <path> [--output-dir <path>] [--dry-run]
//   node scripts/generate-atlas-starter.mjs --validate-only --output-dir <path>
//   node scripts/generate-atlas-starter.mjs --help
//   node scripts/generate-atlas-starter.mjs --sample-config
//
// Config fields:
//   atlas_id        required, e.g. "atlas:detroit-mi"
//   name            required, e.g. "Detroit Atlas"
//   slug            required, lowercase short label
//   canonical_url   required, "https://detroit.ourcivicatlas.org"
//   bbox            required, [west, south, east, north]
//   centroid        required, [lon, lat]
//   scope_type      optional, defaults to "city"
//   federation_status optional, defaults to "seed"
//   maintainer_name optional, defaults to "<name> maintainers"
//
// The starter writes a backend-free atlas node directory:
//   <output-dir>/well-known/our-civic-atlas.json
//   <output-dir>/data/atlas-node.json
//   <output-dir>/data/node-catalog.json
//   <output-dir>/data/layer-catalog.json
//   <output-dir>/data/read-model-catalog.json
//   <output-dir>/data/civic-objects.json
//   <output-dir>/data/scene-manifests/<slug>-overview.json
//   <output-dir>/data/scenario-manifests/<slug>-starter.json
//   <output-dir>/data/mobile-runtime-profile.json
//   <output-dir>/data/viewport-vector-contracts.json
//   <output-dir>/data/scene-packet-compiler.json
//   <output-dir>/data/scene-packets/index.json
//   <output-dir>/data/scene-packets/<slug>-overview-mobile.json
//   <output-dir>/data/read-model-formats.json
//   <output-dir>/data/scene-foundry-export-manifest.json
//   <output-dir>/data/source-registry.json
//
// The starter does not include a basemap. The basemap is the operator's
// choice and must be added before public release.

import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const HELP_TEXT = `Generate or validate an atlas node starter.

Usage:
  generate-atlas-starter.mjs --config <path> --output-dir <path> [--dry-run]
  generate-atlas-starter.mjs --validate-only --output-dir <path>
  generate-atlas-starter.mjs --sample-config
  generate-atlas-starter.mjs --help

The starter is backend-free. It does not include a basemap or live ingestion.
`;

const SAMPLE_CONFIG = {
  atlas_id: "atlas:detroit-mi",
  name: "Detroit Atlas",
  slug: "detroit",
  canonical_url: "https://detroit.ourcivicatlas.org",
  scope_type: "city",
  federation_status: "seed",
  bbox: [-83.288, 42.255, -82.91, 42.45],
  centroid: [-83.099, 42.3505],
  maintainer_name: "Detroit Atlas maintainers",
};

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token === "--validate-only") {
      args.validateOnly = true;
    } else if (token === "--sample-config") {
      args.sampleConfig = true;
    } else if (token === "--config") {
      args.config = argv[i + 1];
      i += 1;
    } else if (token === "--output-dir") {
      args.outputDir = argv[i + 1];
      i += 1;
    } else if (token.startsWith("--")) {
      throw new Error(`Unknown flag: ${token}`);
    } else {
      args._.push(token);
    }
  }
  return args;
}

function assertConfig(config) {
  const requiredStrings = ["atlas_id", "name", "slug", "canonical_url"];
  for (const key of requiredStrings) {
    if (typeof config[key] !== "string" || config[key].trim().length === 0) {
      throw new Error(`Config field ${key} must be a non-empty string.`);
    }
  }
  if (!Array.isArray(config.bbox) || config.bbox.length !== 4) {
    throw new Error("Config field bbox must be an array of four numbers.");
  }
  if (!Array.isArray(config.centroid) || config.centroid.length !== 2) {
    throw new Error("Config field centroid must be an array of two numbers.");
  }
}

function withDefaults(config) {
  return {
    scope_type: "city",
    federation_status: "seed",
    maintainer_name: `${config.name} maintainers`,
    ...config,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function buildArtifacts(config) {
  const ts = nowIso();
  const dataOrigin = "/data";
  const slug = config.slug;

  const discovery = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    name: config.name,
    canonical_url: config.canonical_url,
    atlas_node_url: `${dataOrigin}/atlas-node.json`,
    node_catalog_url: `${dataOrigin}/node-catalog.json`,
    source_registry_url: `${dataOrigin}/source-registry.json`,
    layer_catalog_url: `${dataOrigin}/layer-catalog.json`,
    read_model_catalog_url: `${dataOrigin}/read-model-catalog.json`,
    contribution_policy_url: "/contribute",
    federation_status: config.federation_status,
    capabilities: ["static_only"],
    generated_at: ts,
  };

  const atlasNode = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    name: config.name,
    slug,
    canonical_url: config.canonical_url,
    scope_type: config.scope_type,
    parent_node_ids: [],
    child_node_ids: [],
    neighbor_node_ids: [],
    boundary_geojson_url: `${dataOrigin}/boundaries/${slug}.geojson`,
    bbox: config.bbox,
    centroid: config.centroid,
    maintainers: [
      {
        name: config.maintainer_name,
        role: "public-interest atlas steward",
      },
    ],
    public_contact:
      "Public contribution and correction routes will be published at /contribute.",
    license:
      "Original atlas code and documentation are intended for open reuse; source data retains source-specific terms.",
    data_license:
      "Mixed public-source terms. See /data/source-registry.json before reuse.",
    contribution_policy_url: "/contribute",
    source_registry_url: `${dataOrigin}/source-registry.json`,
    layer_catalog_url: `${dataOrigin}/layer-catalog.json`,
    node_catalog_url: `${dataOrigin}/node-catalog.json`,
    read_model_catalog_url: `${dataOrigin}/read-model-catalog.json`,
    capabilities: ["static_only"],
    federation_status: config.federation_status,
    last_updated_at: ts,
  };

  const readModelCatalog = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    files: [
      { id: "atlas-node", name: "Atlas node manifest", url: `${dataOrigin}/atlas-node.json`, media_type: "application/json", description: "Identity, boundary, capabilities, and federation links." },
      { id: "source-registry", name: "Source registry", url: `${dataOrigin}/source-registry.json`, media_type: "application/json", description: "Reviewed source list with public-use and privacy notes." },
      { id: "layer-catalog", name: "Layer catalog", url: `${dataOrigin}/layer-catalog.json`, media_type: "application/json", description: "Public layer inventory and data roles." },
      { id: "node-catalog", name: "Node catalog", url: `${dataOrigin}/node-catalog.json`, media_type: "application/json", description: "Self, parent, child, and neighbor atlas node references." },
      { id: "civic-objects", name: "Civic objects", url: `${dataOrigin}/civic-objects.json`, media_type: "application/json", description: "Source-backed civic object table starter." },
      { id: "scene-manifests", name: "Scene manifests", url: `${dataOrigin}/scene-manifests/${slug}-overview.json`, media_type: "application/json", description: "Renderable scene contracts for Atlas Scene and Scene Foundry." },
      { id: "scenario-manifests", name: "Scenario manifests", url: `${dataOrigin}/scenario-manifests/${slug}-starter.json`, media_type: "application/json", description: "Forkable civic scenarios." },
      { id: "mobile-runtime-profile", name: "Mobile runtime profile", url: `${dataOrigin}/mobile-runtime-profile.json`, media_type: "application/json", description: "Mobile runtime profile starter." },
      { id: "viewport-vector-contracts", name: "Viewport vector contracts", url: `${dataOrigin}/viewport-vector-contracts.json`, media_type: "application/json", description: "Viewport-bounded binary vector contracts." },
      { id: "scene-packet-compiler", name: "Scene packet compiler", url: `${dataOrigin}/scene-packet-compiler.json`, media_type: "application/json", description: "Renderer-agnostic compiler contract for typed mobile scene packets." },
      { id: "scene-packets", name: "Scene packets", url: `${dataOrigin}/scene-packets/index.json`, media_type: "application/json", description: "Published example packet sketches." },
      { id: "read-model-formats", name: "Read model formats", url: `${dataOrigin}/read-model-formats.json`, media_type: "application/json", description: "Role assignments for GeoParquet, Arrow, PMTiles, FlatGeobuf, and JSON." },
      { id: "scene-foundry-export-manifest", name: "Scene Foundry export manifest", url: `${dataOrigin}/scene-foundry-export-manifest.json`, media_type: "application/json", description: "Offline-only manifest describing USD/GLB/Brush outputs." },
      { id: "spatial-runtime-contract", name: "Spatial runtime contract", url: `${dataOrigin}/spatial-runtime-contract.json`, media_type: "application/json", description: "Indexing family, viewport cache key, Rusty Red boundaries, and Rust lanes." },
    ],
  };

  const nodeCatalog = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    nodes: [
      {
        atlas_id: config.atlas_id,
        name: config.name,
        scope_type: config.scope_type,
        relation: "self",
        manifest_url: `${dataOrigin}/atlas-node.json`,
        boundary_geojson_url: `${dataOrigin}/boundaries/${slug}.geojson`,
        federation_status: config.federation_status,
        last_updated_at: ts,
        capabilities: ["static_only"],
      },
    ],
  };

  const layerCatalog = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    layers: [
      {
        id: "starter_boundary",
        name: "Atlas boundary (starter)",
        civic_object_types: ["place"],
        geometry_type: "polygon",
        source_ids: [],
        read_model_url: `${dataOrigin}/civic-objects.json`,
        temporal: false,
        confidence: true,
        privacy_class: "public_aggregate",
      },
    ],
  };

  const civicObjects = [];

  const sceneManifest = {
    schema_version: "1.0.0",
    scene_id: `scene:${slug}-overview`,
    atlas_node_id: config.atlas_id,
    name: `${config.name} overview scene`,
    description: "Starter scene placeholder. Replace with reviewed civic objects before public release.",
    bbox: config.bbox,
    time: { start: null, end: null, mode: "current_with_history" },
    objects: [],
    source_ids: [],
    confidence: { score: 0, reasons: ["Starter scene has no reviewed objects yet."] },
    assets: [],
    dossier_links: [],
    renderer_boundary_ids: ["geospatial_base"],
    review_state: "needs_review",
    updated_at: ts,
  };

  const scenarioManifest = {
    schema_version: "0.1.0",
    scenario_id: `scenario:${slug}-starter`,
    scene_id: `scene:${slug}-overview`,
    atlas_node_id: config.atlas_id,
    name: `${config.name} starter scenario`,
    description: "Starter scenario placeholder.",
    permissions: ["public_read"],
    export_formats: ["json"],
    source_ids: [],
    review_state: "needs_review",
    updated_at: ts,
  };

  const mobileRuntimeProfile = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    default_mobile_surface: "leaflet_baseline",
    candidate_mobile_surface: "deck_mobile_candidate",
    current_status: "baseline_only",
    promotion_summary: "Starter node uses the Leaflet baseline until a deck.gl mobile candidate has been reviewed.",
    baseline_reference_route: "/",
    reversible_boundary: "ResponsiveAtlasMap mobile branch",
    dynamic_viewport_contracts_url: `${dataOrigin}/viewport-vector-contracts.json`,
    scene_packet_compiler_url: `${dataOrigin}/scene-packet-compiler.json`,
    scene_packet_index_url: `${dataOrigin}/scene-packets/index.json`,
    binary_read_model_defaults: {
      preferred_formats: ["geoparquet", "flatgeobuf", "pmtiles"],
      json_allowed_for: ["dossier_record", "fixture_fallback"],
      notes: ["Starter node prefers binary formats once hosting supports them."],
    },
    tile_publication: {
      default_archive_format: "pmtiles",
      basemap_archive_url: `${dataOrigin}/basemap.pmtiles`,
      overlay_archive_pattern: `${dataOrigin}/overlays/{layer_id}.pmtiles`,
      metadata_url: null,
      cache_strategy: "long-lived range request cache",
      rebuild_trigger: "Source freshness change",
      status: "planned",
    },
    worker_boundaries: [
      {
        boundary_id: "duckdb_worker",
        label: "DuckDB-WASM worker",
        stage: "analysis",
        owner: "renderer",
        runtime: "web worker",
        required_on_mobile: true,
        fallback_behavior: "Static JSON fallback",
        status: "planned",
      },
    ],
    promotion_gates: [
      {
        gate_id: "starter_first_review",
        label: "Starter first review",
        requirement: "Maintainer reviews the starter manifest before public release.",
        validator: "manual",
        pass_condition: "Maintainer note recorded.",
        status: "planned",
      },
    ],
    notes: ["Starter node ships with placeholder runtime config. Tune before public release."],
  };

  const viewportVectorContracts = {
    schema_version: "0.1.0",
    atlas_node_id: config.atlas_id,
    contracts: [],
  };

  const scenePacketCompiler = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    accepts: { layer_ids: [], render_modes: [] },
    produces: { artifact_format: "json", buffer_layout: [] },
    notes: ["Starter compiler entry. Replace once reviewed layers exist."],
    status: "planned",
  };

  const scenePacketIndex = {
    schema_version: "0.1.0",
    atlas_node_id: config.atlas_id,
    packets: [],
  };

  const readModelFormats = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    assignments: [
      { role: "basemap_archive", label: "Basemap archive", description: "Pre-tiled basemap.", default_format: "pmtiles", acceptable_fallbacks: [], fallback_url: `${dataOrigin}/basemap-fallback.geojson`, notes: ["Replace fallback when basemap lands."] },
      { role: "bulk_query", label: "Bulk query read model", description: "Tabular features.", default_format: "geoparquet", acceptable_fallbacks: ["parquet", "geojson", "json"], fallback_url: `${dataOrigin}/civic-objects.json`, notes: ["Starter falls back to civic-objects.json."] },
      { role: "viewport_packet", label: "Viewport packet", description: "Range-streamed features.", default_format: "flatgeobuf", acceptable_fallbacks: ["geojson", "json"], fallback_url: `${dataOrigin}/scene-packets/index.json`, notes: ["No packets yet; falls back to index."] },
      { role: "runtime_transfer", label: "Runtime transfer", description: "Worker transfer.", default_format: "arrow", acceptable_fallbacks: ["json"], fallback_url: null, notes: ["Runtime only."] },
      { role: "fixture_fallback", label: "Fixture fallback", description: "Static fixtures.", default_format: "json", acceptable_fallbacks: ["geojson"], fallback_url: null, notes: ["Repo-checked-in fixtures."] },
      { role: "dossier_record", label: "Dossier record", description: "Per-object record.", default_format: "json", acceptable_fallbacks: [], fallback_url: null, notes: ["Dossiers stay JSON."] },
    ],
    notes: ["Starter role assignments. Replace fallback URLs as real read models land."],
  };

  const sceneFoundryExports = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    offline_only: true,
    generator_inventory: [
      { generator_id: "glb_export_pipeline", label: "GLB scene export pipeline", runtime: "node", accepts_renderer: ["r3f", "deck.gl"], produces_formats: ["glb"] },
    ],
    targets: [],
    assets: [],
    notes: ["Starter Foundry manifest. Add USD/Brush generators when needed."],
  };

  const sourceRegistry = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    sources: [],
    notes: ["Starter source registry. Add reviewed sources before any public read model goes live."],
  };

  const spatialRuntime = {
    schema_version: "0.1.0",
    atlas_id: config.atlas_id,
    indexing_family: {
      name: "h3",
      library: "h3-js",
      resolutions: [6, 8, 10, 12],
      rationale: "Starter node proposes H3 hex cells for active JS/WASM support and zoom-aware resolutions.",
      status: "proposed",
    },
    viewport_cache_key: {
      fields: ["atlas_node_id", "layer_id", "h3_index", "resolution", "time_range", "filters_hash"],
      canonical_form: "Stable JSON serialization of the fields above, hashed to a short opaque key.",
      ttl_seconds: 300,
      invalidation_triggers: [
        "Source freshness change",
        "Read-model rebuild",
        "Review-state transition",
      ],
    },
    rusty_red_boundaries: [
      {
        boundary_id: "viewport_cache",
        label: "Viewport cache (hot)",
        hot_state_kind: "viewport_cache",
        canonical_source: "/data/civic-objects.json and the read-model-formats role assignments",
        rebuild_on: ["viewport_cache_key TTL expiry", "Source freshness change"],
        ttl_seconds: 300,
        status: "proposed",
        notes: ["Starter boundary; replace with real worker code before promoting."],
      },
    ],
    rust_preprocessing_lanes: [],
    notes: ["Starter spatial runtime contract. Tune indexing family and lanes before promoting beyond proposed."],
  };

  return {
    "well-known/our-civic-atlas.json": discovery,
    "data/atlas-node.json": atlasNode,
    "data/node-catalog.json": nodeCatalog,
    "data/layer-catalog.json": layerCatalog,
    "data/read-model-catalog.json": readModelCatalog,
    "data/civic-objects.json": civicObjects,
    [`data/scene-manifests/${slug}-overview.json`]: sceneManifest,
    [`data/scenario-manifests/${slug}-starter.json`]: scenarioManifest,
    "data/mobile-runtime-profile.json": mobileRuntimeProfile,
    "data/viewport-vector-contracts.json": viewportVectorContracts,
    "data/scene-packet-compiler.json": scenePacketCompiler,
    "data/scene-packets/index.json": scenePacketIndex,
    [`data/scene-packets/${slug}-overview-mobile.json`]: { schema_version: "0.1.0", packet_id: `packet:${slug}-overview-mobile`, scene_id: `scene:${slug}-overview`, viewport: { bbox: config.bbox, zoom_range: [10, 14] }, buffers: [], notes: ["Starter packet placeholder."] },
    "data/read-model-formats.json": readModelFormats,
    "data/scene-foundry-export-manifest.json": sceneFoundryExports,
    "data/source-registry.json": sourceRegistry,
    "data/spatial-runtime-contract.json": spatialRuntime,
  };
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeArtifacts(outputDir, artifacts, dryRun) {
  const written = [];
  for (const [relativePath, payload] of Object.entries(artifacts)) {
    const target = path.join(outputDir, relativePath);
    const dir = path.dirname(target);
    if (dryRun) {
      written.push(target);
      continue;
    }
    await mkdir(dir, { recursive: true });
    await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    written.push(target);
  }
  return written;
}

async function validateStarter(outputDir) {
  const requiredFiles = [
    "well-known/our-civic-atlas.json",
    "data/atlas-node.json",
    "data/node-catalog.json",
    "data/layer-catalog.json",
    "data/read-model-catalog.json",
    "data/civic-objects.json",
    "data/mobile-runtime-profile.json",
    "data/viewport-vector-contracts.json",
    "data/scene-packet-compiler.json",
    "data/scene-packets/index.json",
    "data/read-model-formats.json",
    "data/scene-foundry-export-manifest.json",
    "data/source-registry.json",
    "data/spatial-runtime-contract.json",
  ];
  const missing = [];
  for (const relative of requiredFiles) {
    const target = path.join(outputDir, relative);
    if (!(await exists(target))) {
      missing.push(relative);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Starter is missing files:\n  - ${missing.join("\n  - ")}`);
  }

  const catalog = JSON.parse(
    await readFile(path.join(outputDir, "data/read-model-catalog.json"), "utf8"),
  );
  const catalogIds = new Set(catalog.files.map((f) => f.id));
  const requiredIds = [
    "atlas-node",
    "source-registry",
    "layer-catalog",
    "node-catalog",
    "civic-objects",
    "scene-manifests",
    "scenario-manifests",
    "mobile-runtime-profile",
    "viewport-vector-contracts",
    "scene-packet-compiler",
    "scene-packets",
    "read-model-formats",
    "scene-foundry-export-manifest",
    "spatial-runtime-contract",
  ];
  const missingIds = requiredIds.filter((id) => !catalogIds.has(id));
  if (missingIds.length > 0) {
    throw new Error(`read-model-catalog is missing ids: ${missingIds.join(", ")}`);
  }

  return { fileCount: requiredFiles.length, catalogFiles: catalog.files.length };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || (!args.config && !args.validateOnly && !args.sampleConfig)) {
    console.log(HELP_TEXT);
    return;
  }
  if (args.sampleConfig) {
    console.log(JSON.stringify(SAMPLE_CONFIG, null, 2));
    return;
  }
  if (args.validateOnly) {
    if (!args.outputDir) {
      throw new Error("--validate-only requires --output-dir");
    }
    const summary = await validateStarter(path.resolve(args.outputDir));
    console.log(
      `Starter at ${args.outputDir} looks structurally valid (${summary.fileCount} required files, ${summary.catalogFiles} catalog entries).`,
    );
    return;
  }

  const configPath = path.resolve(args.config);
  const config = withDefaults(JSON.parse(await readFile(configPath, "utf8")));
  assertConfig(config);

  const outputDir = path.resolve(args.outputDir ?? path.join(repoRoot, "tmp", `${config.slug}-starter`));
  const artifacts = buildArtifacts(config);

  const written = await writeArtifacts(outputDir, artifacts, Boolean(args.dryRun));
  if (args.dryRun) {
    console.log(`Dry run for ${config.atlas_id}:`);
  } else {
    console.log(`Wrote starter for ${config.atlas_id} to ${outputDir}:`);
  }
  for (const file of written) {
    console.log(`  ${file}`);
  }
  if (!args.dryRun) {
    const summary = await validateStarter(outputDir);
    console.log(
      `Validated ${summary.fileCount} required files; read-model-catalog lists ${summary.catalogFiles} files.`,
    );
  }
}

main().catch((error) => {
  console.error(`generate-atlas-starter: ${error.message}`);
  process.exitCode = 1;
});
