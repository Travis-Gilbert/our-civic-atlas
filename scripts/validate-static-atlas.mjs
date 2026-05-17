import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const staticPackageDir = path.join(
  root,
  "src/data/open-flint-atlas/fixtures/static-package",
);

function parseOptions(argv) {
  const options = { target: "all" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target") {
      const value = argv[index + 1];
      if (!value) throw new Error("--target requires a value");
      options.target = value;
      index += 1;
    } else if (arg.startsWith("--target=")) {
      options.target = arg.slice("--target=".length);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

async function readJson(relativePath) {
  const filePath = path.join(staticPackageDir, relativePath);
  return JSON.parse(await readFile(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertString(value, pathLabel) {
  assert(
    typeof value === "string" && value.trim().length > 0,
    `${pathLabel} must be a non-empty string`,
  );
}

function assertNullableString(value, pathLabel) {
  assert(
    value === null || typeof value === "string",
    `${pathLabel} must be a string or null`,
  );
}

function assertStringArray(value, pathLabel) {
  assert(Array.isArray(value), `${pathLabel} must be an array`);
  for (const item of value) {
    assert(typeof item === "string", `${pathLabel} must contain only strings`);
  }
}

function assertBoolean(value, pathLabel) {
  assert(typeof value === "boolean", `${pathLabel} must be a boolean`);
}

function assertScore(value, pathLabel) {
  assert(
    typeof value === "number" && value >= 0 && value <= 1,
    `${pathLabel} must be a number between 0 and 1`,
  );
}

function assertNullableMetricValue(value, pathLabel) {
  assert(
    value === null || typeof value === "string" || typeof value === "number",
    `${pathLabel} must be a string, number, or null`,
  );
}

function validateAtlasNode(atlasNode) {
  for (const key of [
    "schema_version",
    "atlas_id",
    "name",
    "slug",
    "canonical_url",
    "scope_type",
    "boundary_geojson_url",
    "public_contact",
    "license",
    "data_license",
    "contribution_policy_url",
    "source_registry_url",
    "layer_catalog_url",
    "node_catalog_url",
    "read_model_catalog_url",
    "federation_status",
    "last_updated_at",
  ]) {
    assertString(atlasNode[key], `atlas-node.${key}`);
  }

  for (const key of ["parent_node_ids", "child_node_ids", "neighbor_node_ids", "capabilities"]) {
    assertStringArray(atlasNode[key], `atlas-node.${key}`);
  }

  assert(Array.isArray(atlasNode.bbox) && atlasNode.bbox.length === 4, "atlas-node.bbox must contain four numbers");
  assert(Array.isArray(atlasNode.centroid) && atlasNode.centroid.length === 2, "atlas-node.centroid must contain two numbers");
  assert(Array.isArray(atlasNode.maintainers) && atlasNode.maintainers.length > 0, "atlas-node.maintainers must not be empty");
}

function validateCivicObjects(civicObjects) {
  assert(Array.isArray(civicObjects) && civicObjects.length > 0, "civic-objects must be a non-empty array");

  civicObjects.forEach((object, index) => {
    for (const key of [
      "id",
      "atlas_node_id",
      "object_type",
      "name",
      "description",
      "temporal_status",
      "current_status",
      "review_state",
      "dossier_url",
      "public_visibility",
      "privacy_class",
      "updated_at",
    ]) {
      assertString(object[key], `civic-objects.${index}.${key}`);
    }

    assertScore(object.confidence_score, `civic-objects.${index}.confidence_score`);
    for (const key of ["confidence_reasons", "source_ids", "claim_ids", "render_modes"]) {
      assertStringArray(object[key], `civic-objects.${index}.${key}`);
    }
  });
}

function validateNodeCatalog(nodeCatalog) {
  assertString(nodeCatalog.schema_version, "node-catalog.schema_version");
  assertString(nodeCatalog.atlas_id, "node-catalog.atlas_id");
  assert(Array.isArray(nodeCatalog.nodes) && nodeCatalog.nodes.length > 0, "node-catalog.nodes must not be empty");

  nodeCatalog.nodes.forEach((node, index) => {
    for (const key of ["atlas_id", "name", "scope_type", "relation", "federation_status"]) {
      assertString(node[key], `node-catalog.nodes.${index}.${key}`);
    }
    assertStringArray(node.capabilities, `node-catalog.nodes.${index}.capabilities`);
  });
}

function validateSceneManifest(sceneManifest) {
  for (const key of [
    "schema_version",
    "scene_id",
    "atlas_node_id",
    "name",
    "description",
    "review_state",
    "updated_at",
  ]) {
    assertString(sceneManifest[key], `scene-manifest.${key}`);
  }

  assert(Array.isArray(sceneManifest.bbox) && sceneManifest.bbox.length === 4, "scene-manifest.bbox must contain four numbers");
  assert(sceneManifest.time && typeof sceneManifest.time === "object", "scene-manifest.time must be an object");
  assertString(sceneManifest.time.mode, "scene-manifest.time.mode");
  assertNullableString(sceneManifest.time.start, "scene-manifest.time.start");
  assertNullableString(sceneManifest.time.end, "scene-manifest.time.end");
  assertStringArray(sceneManifest.source_ids, "scene-manifest.source_ids");
  assertStringArray(sceneManifest.dossier_links, "scene-manifest.dossier_links");
  assertStringArray(sceneManifest.renderer_boundary_ids, "scene-manifest.renderer_boundary_ids");
  assertScore(sceneManifest.confidence?.score, "scene-manifest.confidence.score");
  assertStringArray(sceneManifest.confidence?.reasons, "scene-manifest.confidence.reasons");
  assert(Array.isArray(sceneManifest.objects) && sceneManifest.objects.length > 0, "scene-manifest.objects must be a non-empty array");
  sceneManifest.objects.forEach((object, index) => {
    for (const key of [
      "object_id",
      "civic_object_id",
      "render_mode",
      "style_token",
      "visual_recipe_id",
      "dossier_url",
      "visibility",
      "privacy_class",
    ]) {
      assertString(object[key], `scene-manifest.objects.${index}.${key}`);
    }
    assertNullableString(object.geometry_ref, `scene-manifest.objects.${index}.geometry_ref`);
    assertNullableString(object.time_start, `scene-manifest.objects.${index}.time_start`);
    assertNullableString(object.time_end, `scene-manifest.objects.${index}.time_end`);
    assertStringArray(object.source_ids, `scene-manifest.objects.${index}.source_ids`);
    assertStringArray(object.asset_refs, `scene-manifest.objects.${index}.asset_refs`);
  });

  assert(Array.isArray(sceneManifest.assets), "scene-manifest.assets must be an array");
  sceneManifest.assets.forEach((asset, index) => {
    for (const key of [
      "asset_id",
      "object_id",
      "kind",
      "renderer",
      "fallback_render_mode",
      "support_state",
      "review_state",
    ]) {
      assertString(asset[key], `scene-manifest.assets.${index}.${key}`);
    }
    assertNullableString(asset.href, `scene-manifest.assets.${index}.href`);
    assertStringArray(asset.source_ids, `scene-manifest.assets.${index}.source_ids`);
  });
}

function validateScenarioManifest(scenarioManifest) {
  for (const key of [
    "schema_version",
    "scenario_id",
    "atlas_node_id",
    "name",
    "slug",
    "description",
    "base_scene_id",
    "base_snapshot_at",
    "visibility",
    "review_state",
    "updated_at",
  ]) {
    assertString(scenarioManifest[key], `scenario-manifest.${key}`);
  }

  for (const key of [
    "proposed_object_ids",
    "comparison_object_ids",
    "lineage_ids",
    "permissions",
    "export_formats",
    "source_ids",
  ]) {
    assertStringArray(scenarioManifest[key], `scenario-manifest.${key}`);
  }
  assert(Array.isArray(scenarioManifest.metrics) && scenarioManifest.metrics.length > 0, "scenario-manifest.metrics must not be empty");
  scenarioManifest.metrics.forEach((metric, index) => {
    assertString(metric.key, `scenario-manifest.metrics.${index}.key`);
    assertString(metric.label, `scenario-manifest.metrics.${index}.label`);
    assertNullableMetricValue(metric.value, `scenario-manifest.metrics.${index}.value`);
    assertNullableString(metric.unit, `scenario-manifest.metrics.${index}.unit`);
    assertStringArray(metric.source_ids, `scenario-manifest.metrics.${index}.source_ids`);
    assertScore(metric.confidence_score, `scenario-manifest.metrics.${index}.confidence_score`);
  });

  assertNullableString(
    scenarioManifest.forked_from_scenario_id,
    "scenario-manifest.forked_from_scenario_id",
  );
}

function validatePrimitiveLibrary(library) {
  assertString(library.schema_version, "primitive-library.schema_version");
  assertString(library.atlas_node_id, "primitive-library.atlas_node_id");
  assert(Array.isArray(library.primitives) && library.primitives.length >= 20, "primitive-library.primitives must contain at least 20 primitives");

  library.primitives.forEach((primitive, index) => {
    for (const key of [
      "primitive_id",
      "atlas_node_id",
      "name",
      "category",
      "description",
      "geometry_rule",
      "accessibility_text",
      "status",
    ]) {
      assertString(primitive[key], `primitive-library.primitives.${index}.${key}`);
    }
    assert(Array.isArray(primitive.parameters) && primitive.parameters.length > 0, `primitive-library.primitives.${index}.parameters must not be empty`);
    assert(Array.isArray(primitive.render_recipes) && primitive.render_recipes.length > 0, `primitive-library.primitives.${index}.render_recipes must not be empty`);
    assert(Array.isArray(primitive.metrics) && primitive.metrics.length > 0, `primitive-library.primitives.${index}.metrics must not be empty`);
    assertStringArray(primitive.export_formats, `primitive-library.primitives.${index}.export_formats`);
    assertStringArray(primitive.source_ids, `primitive-library.primitives.${index}.source_ids`);
  });
}

function validateGeoComments(commentsFixture) {
  assertString(commentsFixture.schema_version, "geo-comments.schema_version");
  assertString(commentsFixture.atlas_node_id, "geo-comments.atlas_node_id");
  assert(Array.isArray(commentsFixture.comments) && commentsFixture.comments.length > 0, "geo-comments.comments must not be empty");

  commentsFixture.comments.forEach((comment, index) => {
    for (const key of [
      "comment_id",
      "atlas_node_id",
      "title",
      "body",
      "author_role",
      "moderation_state",
      "privacy_class",
      "visibility",
      "created_at",
      "updated_at",
    ]) {
      assertString(comment[key], `geo-comments.comments.${index}.${key}`);
    }
    assert(comment.anchor && typeof comment.anchor === "object", `geo-comments.comments.${index}.anchor must be an object`);
    for (const key of ["target_type", "target_id", "geometry_type"]) {
      assertString(comment.anchor[key], `geo-comments.comments.${index}.anchor.${key}`);
    }
    assertNullableString(
      comment.anchor.geometry_ref,
      `geo-comments.comments.${index}.anchor.geometry_ref`,
    );
    assertStringArray(comment.source_ids, `geo-comments.comments.${index}.source_ids`);
    assertNullableString(
      comment.review_notes,
      `geo-comments.comments.${index}.review_notes`,
    );
  });
}

function validateLayerRecipes(recipesFixture) {
  assertString(recipesFixture.schema_version, "layer-recipes.schema_version");
  assertString(recipesFixture.atlas_node_id, "layer-recipes.atlas_node_id");
  assert(Array.isArray(recipesFixture.recipes) && recipesFixture.recipes.length > 0, "layer-recipes.recipes must not be empty");

  recipesFixture.recipes.forEach((recipe, index) => {
    for (const key of [
      "recipe_id",
      "atlas_node_id",
      "name",
      "description",
      "geometry_type",
      "legend_label",
      "default_renderer",
      "updated_at",
    ]) {
      assertString(recipe[key], `layer-recipes.recipes.${index}.${key}`);
    }
    for (const key of ["layer_ids", "compatible_renderers", "source_ids", "export_formats"]) {
      assertStringArray(recipe[key], `layer-recipes.recipes.${index}.${key}`);
    }
    assertBoolean(recipe.default_visible, `layer-recipes.recipes.${index}.default_visible`);
    assert(Array.isArray(recipe.field_mappings) && recipe.field_mappings.length > 0, `layer-recipes.recipes.${index}.field_mappings must not be empty`);
  });
}

function validateViewportVectorContracts(contracts) {
  assertString(
    contracts.schema_version,
    "viewport-vector-contracts.schema_version",
  );
  assertString(
    contracts.atlas_node_id,
    "viewport-vector-contracts.atlas_node_id",
  );
  assert(
    Array.isArray(contracts.contracts) && contracts.contracts.length > 0,
    "viewport-vector-contracts.contracts must not be empty",
  );
}

function validateScenePacketCompiler(compiler) {
  for (const key of [
    "schema_version",
    "atlas_node_id",
    "compiler_id",
    "packet_schema_version",
    "preferred_transport",
    "worker_boundary_id",
  ]) {
    assertString(compiler[key], `scene-packet-compiler.${key}`);
  }

  for (const key of [
    "supports_renderers",
    "viewport_parameters",
    "example_packet_urls",
    "notes",
  ]) {
    assertStringArray(compiler[key], `scene-packet-compiler.${key}`);
  }

  assert(
    Array.isArray(compiler.stages) && compiler.stages.length > 0,
    "scene-packet-compiler.stages must not be empty",
  );
}

function validateScenePacketIndex(index) {
  assertString(index.schema_version, "scene-packets.index.schema_version");
  assertString(index.atlas_node_id, "scene-packets.index.atlas_node_id");
  assertString(
    index.compiler_contract_url,
    "scene-packets.index.compiler_contract_url",
  );
  assertStringArray(index.notes, "scene-packets.index.notes");
  assert(
    Array.isArray(index.packets) && index.packets.length > 0,
    "scene-packets.index.packets must not be empty",
  );
}

function validateScenePacket(packet) {
  for (const key of [
    "schema_version",
    "packet_id",
    "atlas_node_id",
    "scene_id",
    "viewport_key",
  ]) {
    assertString(packet[key], `scene-packet.${key}`);
  }

  assert(
    Array.isArray(packet.zoom_range) && packet.zoom_range.length === 2,
    "scene-packet.zoom_range must contain two numbers",
  );
  assertStringArray(packet.cache_tags, "scene-packet.cache_tags");
  assertStringArray(packet.notes, "scene-packet.notes");
  assert(
    Array.isArray(packet.layer_packets) && packet.layer_packets.length > 0,
    "scene-packet.layer_packets must not be empty",
  );
}

const READ_MODEL_FORMAT_VALUES = new Set([
  "json",
  "geojson",
  "csv",
  "parquet",
  "geoparquet",
  "glb",
  "arrow",
  "flatgeobuf",
  "pmtiles",
]);

const BINARY_READ_MODEL_ROLE_VALUES = new Set([
  "basemap_archive",
  "bulk_query",
  "viewport_packet",
  "runtime_transfer",
  "fixture_fallback",
  "dossier_record",
]);

const BINARY_ROLES_REQUIRING_FALLBACK_URL = new Set([
  "basemap_archive",
  "bulk_query",
  "viewport_packet",
]);

const SPATIAL_INDEX_FAMILY_VALUES = new Set(["h3", "s2", "geohash"]);
const SPATIAL_CONTRACT_STATUS_VALUES = new Set(["proposed", "current", "deprecated"]);
const RUSTY_RED_HOT_STATE_KIND_VALUES = new Set([
  "viewport_cache",
  "session",
  "scene_hydration",
  "nearby_lookup",
]);
const RUST_LANE_RUNTIME_VALUES = new Set(["rust_cli", "rust_wasm"]);

function validateSpatialRuntimeContract(contract) {
  assertString(contract.schema_version, "spatial-runtime-contract.schema_version");
  assertString(contract.atlas_id, "spatial-runtime-contract.atlas_id");
  assertStringArray(contract.notes, "spatial-runtime-contract.notes");

  assert(
    contract.indexing_family && typeof contract.indexing_family === "object",
    "spatial-runtime-contract.indexing_family must be an object",
  );
  assert(
    SPATIAL_INDEX_FAMILY_VALUES.has(contract.indexing_family.name),
    "spatial-runtime-contract.indexing_family.name must be h3, s2, or geohash",
  );
  assertString(contract.indexing_family.library, "spatial-runtime-contract.indexing_family.library");
  assertString(
    contract.indexing_family.rationale,
    "spatial-runtime-contract.indexing_family.rationale",
  );
  assert(
    SPATIAL_CONTRACT_STATUS_VALUES.has(contract.indexing_family.status),
    "spatial-runtime-contract.indexing_family.status must be a SpatialContractStatus",
  );
  assert(
    Array.isArray(contract.indexing_family.resolutions) &&
      contract.indexing_family.resolutions.length > 0 &&
      contract.indexing_family.resolutions.every(
        (r) => typeof r === "number" && Number.isFinite(r),
      ),
    "spatial-runtime-contract.indexing_family.resolutions must be a non-empty array of finite numbers",
  );

  assert(
    contract.viewport_cache_key && typeof contract.viewport_cache_key === "object",
    "spatial-runtime-contract.viewport_cache_key must be an object",
  );
  assertStringArray(
    contract.viewport_cache_key.fields,
    "spatial-runtime-contract.viewport_cache_key.fields",
  );
  assertString(
    contract.viewport_cache_key.canonical_form,
    "spatial-runtime-contract.viewport_cache_key.canonical_form",
  );
  assertStringArray(
    contract.viewport_cache_key.invalidation_triggers,
    "spatial-runtime-contract.viewport_cache_key.invalidation_triggers",
  );
  assert(
    typeof contract.viewport_cache_key.ttl_seconds === "number" &&
      Number.isFinite(contract.viewport_cache_key.ttl_seconds) &&
      contract.viewport_cache_key.ttl_seconds >= 0,
    "spatial-runtime-contract.viewport_cache_key.ttl_seconds must be a non-negative finite number",
  );

  assert(
    Array.isArray(contract.rusty_red_boundaries) && contract.rusty_red_boundaries.length > 0,
    "spatial-runtime-contract.rusty_red_boundaries must not be empty",
  );
  contract.rusty_red_boundaries.forEach((boundary, index) => {
    const label = `spatial-runtime-contract.rusty_red_boundaries[${index}]`;
    assertString(boundary.boundary_id, `${label}.boundary_id`);
    assertString(boundary.label, `${label}.label`);
    assertString(boundary.canonical_source, `${label}.canonical_source`);
    assertStringArray(boundary.rebuild_on, `${label}.rebuild_on`);
    assertStringArray(boundary.notes, `${label}.notes`);
    assert(
      RUSTY_RED_HOT_STATE_KIND_VALUES.has(boundary.hot_state_kind),
      `${label}.hot_state_kind must be a RustyRedHotStateKind`,
    );
    assert(
      SPATIAL_CONTRACT_STATUS_VALUES.has(boundary.status),
      `${label}.status must be a SpatialContractStatus`,
    );
    assert(
      boundary.ttl_seconds === null ||
        (typeof boundary.ttl_seconds === "number" &&
          Number.isFinite(boundary.ttl_seconds) &&
          boundary.ttl_seconds >= 0),
      `${label}.ttl_seconds must be null or a non-negative finite number`,
    );
  });

  assert(
    Array.isArray(contract.rust_preprocessing_lanes),
    "spatial-runtime-contract.rust_preprocessing_lanes must be an array",
  );
  contract.rust_preprocessing_lanes.forEach((lane, index) => {
    const label = `spatial-runtime-contract.rust_preprocessing_lanes[${index}]`;
    assertString(lane.lane_id, `${label}.lane_id`);
    assertString(lane.label, `${label}.label`);
    assertStringArray(lane.notes, `${label}.notes`);
    assert(
      READ_MODEL_FORMAT_VALUES.has(lane.input_format),
      `${label}.input_format must be a ReadModelFormat`,
    );
    assert(
      READ_MODEL_FORMAT_VALUES.has(lane.output_format),
      `${label}.output_format must be a ReadModelFormat`,
    );
    assert(
      RUST_LANE_RUNTIME_VALUES.has(lane.runtime),
      `${label}.runtime must be rust_cli or rust_wasm`,
    );
    assert(
      SPATIAL_CONTRACT_STATUS_VALUES.has(lane.status),
      `${label}.status must be a SpatialContractStatus`,
    );
  });
}

const SCENE_FOUNDRY_FORMAT_VALUES = new Set(["usd", "usdz", "glb", "ply", "splat"]);
const SCENE_FOUNDRY_STATUS_VALUES = new Set([
  "planned",
  "reviewed",
  "exported",
  "retired",
]);

function validateSceneFoundryExportManifest(manifest) {
  assertString(manifest.schema_version, "scene-foundry-export-manifest.schema_version");
  assertString(manifest.atlas_id, "scene-foundry-export-manifest.atlas_id");
  assertStringArray(manifest.notes, "scene-foundry-export-manifest.notes");
  assert(
    manifest.offline_only === true,
    "scene-foundry-export-manifest.offline_only must be true",
  );

  assert(
    Array.isArray(manifest.generator_inventory) && manifest.generator_inventory.length > 0,
    "scene-foundry-export-manifest.generator_inventory must not be empty",
  );
  manifest.generator_inventory.forEach((generator, index) => {
    const label = `scene-foundry-export-manifest.generator_inventory[${index}]`;
    assertString(generator.generator_id, `${label}.generator_id`);
    assertString(generator.label, `${label}.label`);
    assertString(generator.runtime, `${label}.runtime`);
    assertStringArray(generator.accepts_renderer, `${label}.accepts_renderer`);
    assert(
      Array.isArray(generator.produces_formats) && generator.produces_formats.length > 0,
      `${label}.produces_formats must not be empty`,
    );
    generator.produces_formats.forEach((format, formatIndex) => {
      assert(
        SCENE_FOUNDRY_FORMAT_VALUES.has(format),
        `${label}.produces_formats[${formatIndex}] must be a SceneFoundryExportFormat`,
      );
    });
  });

  assert(
    Array.isArray(manifest.targets),
    "scene-foundry-export-manifest.targets must be an array",
  );
  manifest.targets.forEach((target, index) => {
    const label = `scene-foundry-export-manifest.targets[${index}]`;
    assertString(target.target_id, `${label}.target_id`);
    assertString(target.scene_id, `${label}.scene_id`);
    assertString(target.output_path_pattern, `${label}.output_path_pattern`);
    assertString(target.rebuild_trigger, `${label}.rebuild_trigger`);
    assertStringArray(target.notes, `${label}.notes`);
    assert(
      SCENE_FOUNDRY_FORMAT_VALUES.has(target.export_format),
      `${label}.export_format must be a SceneFoundryExportFormat`,
    );
    assert(
      SCENE_FOUNDRY_STATUS_VALUES.has(target.status),
      `${label}.status must be a SceneFoundryExportStatus`,
    );
    assert(
      target.offline_only === true,
      `${label}.offline_only must be true`,
    );
  });

  assert(
    Array.isArray(manifest.assets),
    "scene-foundry-export-manifest.assets must be an array",
  );
  manifest.assets.forEach((asset, index) => {
    const label = `scene-foundry-export-manifest.assets[${index}]`;
    assertString(asset.asset_id, `${label}.asset_id`);
    assertString(asset.scene_id, `${label}.scene_id`);
    assertString(asset.object_id, `${label}.object_id`);
    assertString(asset.generator_id, `${label}.generator_id`);
    assertString(asset.generator_version, `${label}.generator_version`);
    assertStringArray(asset.source_ids, `${label}.source_ids`);
    assertStringArray(asset.notes, `${label}.notes`);
    assert(
      SCENE_FOUNDRY_FORMAT_VALUES.has(asset.export_format),
      `${label}.export_format must be a SceneFoundryExportFormat`,
    );
    assert(
      SCENE_FOUNDRY_STATUS_VALUES.has(asset.status),
      `${label}.status must be a SceneFoundryExportStatus`,
    );
    assert(
      asset.href === null ||
        (typeof asset.href === "string" && asset.href.trim().length > 0),
      `${label}.href must be null or a non-empty string`,
    );
    assert(
      asset.byte_size === null ||
        (typeof asset.byte_size === "number" && asset.byte_size >= 0),
      `${label}.byte_size must be null or a non-negative number`,
    );
    assert(
      asset.generated_at === null ||
        (typeof asset.generated_at === "string" && asset.generated_at.trim().length > 0),
      `${label}.generated_at must be null or a non-empty string`,
    );
  });
}

function validateReadModelFormats(manifest) {
  assertString(manifest.schema_version, "read-model-formats.schema_version");
  assertString(manifest.atlas_id, "read-model-formats.atlas_id");
  assertStringArray(manifest.notes, "read-model-formats.notes");
  assert(
    Array.isArray(manifest.assignments) && manifest.assignments.length > 0,
    "read-model-formats.assignments must not be empty",
  );

  const seenRoles = new Set();
  manifest.assignments.forEach((assignment, index) => {
    const label = `read-model-formats.assignments[${index}]`;
    assertString(assignment.label, `${label}.label`);
    assertString(assignment.description, `${label}.description`);
    assertStringArray(assignment.notes, `${label}.notes`);

    assert(
      BINARY_READ_MODEL_ROLE_VALUES.has(assignment.role),
      `${label}.role must be a valid BinaryReadModelRole`,
    );
    assert(
      !seenRoles.has(assignment.role),
      `${label}.role ${assignment.role} is assigned more than once`,
    );
    seenRoles.add(assignment.role);

    assert(
      READ_MODEL_FORMAT_VALUES.has(assignment.default_format),
      `${label}.default_format must be a valid ReadModelFormat`,
    );

    assert(
      Array.isArray(assignment.acceptable_fallbacks),
      `${label}.acceptable_fallbacks must be an array`,
    );
    assignment.acceptable_fallbacks.forEach((fallback, fallbackIndex) => {
      assert(
        READ_MODEL_FORMAT_VALUES.has(fallback),
        `${label}.acceptable_fallbacks[${fallbackIndex}] must be a valid ReadModelFormat`,
      );
    });

    if (BINARY_ROLES_REQUIRING_FALLBACK_URL.has(assignment.role)) {
      assert(
        typeof assignment.fallback_url === "string" && assignment.fallback_url.trim().length > 0,
        `${label}.fallback_url must be a non-empty string for role ${assignment.role}`,
      );
    } else {
      assert(
        assignment.fallback_url === null ||
          (typeof assignment.fallback_url === "string" && assignment.fallback_url.trim().length > 0),
        `${label}.fallback_url must be null or a non-empty string`,
      );
    }
  });
}

function validateMobileRuntimeProfile(profile) {
  for (const key of [
    "schema_version",
    "atlas_id",
    "default_mobile_surface",
    "candidate_mobile_surface",
    "current_status",
    "promotion_summary",
    "baseline_reference_route",
    "reversible_boundary",
    "dynamic_viewport_contracts_url",
    "scene_packet_compiler_url",
    "scene_packet_index_url",
  ]) {
    assertString(profile[key], `mobile-runtime-profile.${key}`);
  }

  assertStringArray(profile.notes, "mobile-runtime-profile.notes");
  assert(
    Array.isArray(profile.worker_boundaries) &&
      profile.worker_boundaries.length > 0,
    "mobile-runtime-profile.worker_boundaries must not be empty",
  );
  assert(
    Array.isArray(profile.promotion_gates) &&
      profile.promotion_gates.length > 0,
    "mobile-runtime-profile.promotion_gates must not be empty",
  );
  assert(
    typeof profile.binary_read_model_defaults === "object" &&
      profile.binary_read_model_defaults !== null,
    "mobile-runtime-profile.binary_read_model_defaults must be an object",
  );
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const target = options.target;

  if (target === "all") {
    const [
      discoveryManifest,
      atlasNode,
      nodeCatalog,
      layerCatalog,
      readModelCatalog,
      civicObjects,
      sceneManifest,
      scenarioManifest,
      primitiveLibrary,
      geoComments,
      layerRecipes,
      viewportVectorContracts,
      scenePacketCompiler,
      scenePacketIndex,
      scenePacket,
      mobileRuntimeProfile,
      readModelFormats,
      sceneFoundryExports,
      spatialRuntime,
    ] = await Promise.all([
      readJson("well-known/our-civic-atlas.json"),
      readJson("data/atlas-node.json"),
      readJson("data/node-catalog.json"),
      readJson("data/layer-catalog.json"),
      readJson("data/read-model-catalog.json"),
      readJson("data/civic-objects.json"),
      readJson("data/scene-manifests/flint-overview.json"),
      readJson("data/scenario-manifests/flint-starter.json"),
      readJson("data/primitive-library.json"),
      readJson("data/geo-comments.json"),
      readJson("data/layer-recipes.json"),
      readJson("data/viewport-vector-contracts.json"),
      readJson("data/scene-packet-compiler.json"),
      readJson("data/scene-packets/index.json"),
      readJson("data/scene-packets/flint-overview-mobile.json"),
      readJson("data/mobile-runtime-profile.json"),
      readJson("data/read-model-formats.json"),
      readJson("data/scene-foundry-export-manifest.json"),
      readJson("data/spatial-runtime-contract.json"),
    ]);

    assertString(discoveryManifest.atlas_id, "well-known.atlas_id");
    assertString(discoveryManifest.atlas_node_url, "well-known.atlas_node_url");
    assertStringArray(discoveryManifest.capabilities, "well-known.capabilities");
    validateAtlasNode(atlasNode);
    validateNodeCatalog(nodeCatalog);
    assert(
      Array.isArray(layerCatalog.layers) && layerCatalog.layers.length > 0,
      "layer-catalog.layers must not be empty",
    );
    assert(
      Array.isArray(readModelCatalog.files) && readModelCatalog.files.length > 0,
      "read-model-catalog.files must not be empty",
    );
    const readModelIds = new Set(readModelCatalog.files.map((file) => file.id));
    for (const id of [
      "scenario-manifests",
      "primitive-library",
      "geo-comments",
      "layer-recipes",
      "renderer-boundaries",
      "mobile-runtime-profile",
      "viewport-vector-contracts",
      "scene-packet-compiler",
      "scene-packets",
      "read-model-formats",
      "scene-foundry-export-manifest",
      "spatial-runtime-contract",
    ]) {
      assert(readModelIds.has(id), `read-model-catalog must include ${id}`);
    }
    validateCivicObjects(civicObjects);
    validateSceneManifest(sceneManifest);
    validateScenarioManifest(scenarioManifest);
    validatePrimitiveLibrary(primitiveLibrary);
    validateGeoComments(geoComments);
    validateLayerRecipes(layerRecipes);
    validateViewportVectorContracts(viewportVectorContracts);
    validateScenePacketCompiler(scenePacketCompiler);
    validateScenePacketIndex(scenePacketIndex);
    validateScenePacket(scenePacket);
    validateMobileRuntimeProfile(mobileRuntimeProfile);
    validateReadModelFormats(readModelFormats);
    validateSceneFoundryExportManifest(sceneFoundryExports);
    validateSpatialRuntimeContract(spatialRuntime);

    console.log(
      `Validated static atlas package: ${atlasNode.name}, ${civicObjects.length} civic objects, ${layerCatalog.layers.length} layers, ${nodeCatalog.nodes.length} nodes, ${primitiveLibrary.primitives.length} primitives, ${scenePacketIndex.packets.length} packet sketch.`,
    );
    return;
  }

  if (target === "scene-manifest") {
    const sceneManifest = await readJson(
      "data/scene-manifests/flint-overview.json",
    );
    validateSceneManifest(sceneManifest);
    console.log(`Validated scene manifest: ${sceneManifest.scene_id}`);
    return;
  }

  if (target === "scenario-manifest") {
    const scenarioManifest = await readJson(
      "data/scenario-manifests/flint-starter.json",
    );
    validateScenarioManifest(scenarioManifest);
    console.log(`Validated scenario manifest: ${scenarioManifest.scenario_id}`);
    return;
  }

  if (target === "primitive-library") {
    const primitiveLibrary = await readJson("data/primitive-library.json");
    validatePrimitiveLibrary(primitiveLibrary);
    console.log(
      `Validated primitive library: ${primitiveLibrary.primitives.length} primitives`,
    );
    return;
  }

  if (target === "geo-comments") {
    const geoComments = await readJson("data/geo-comments.json");
    validateGeoComments(geoComments);
    console.log(`Validated geo comments: ${geoComments.comments.length} comments`);
    return;
  }

  if (target === "layer-recipes") {
    const layerRecipes = await readJson("data/layer-recipes.json");
    validateLayerRecipes(layerRecipes);
    console.log(
      `Validated layer recipes: ${layerRecipes.recipes.length} recipes`,
    );
    return;
  }

  if (target === "viewport-vector-contracts") {
    const viewportVectorContracts = await readJson(
      "data/viewport-vector-contracts.json",
    );
    validateViewportVectorContracts(viewportVectorContracts);
    console.log(
      `Validated viewport vector contracts: ${viewportVectorContracts.contracts.length} contracts`,
    );
    return;
  }

  if (target === "scene-packet-compiler") {
    const scenePacketCompiler = await readJson("data/scene-packet-compiler.json");
    validateScenePacketCompiler(scenePacketCompiler);
    console.log(
      `Validated scene packet compiler: ${scenePacketCompiler.compiler_id}`,
    );
    return;
  }

  if (target === "scene-packets") {
    const [scenePacketIndex, scenePacket] = await Promise.all([
      readJson("data/scene-packets/index.json"),
      readJson("data/scene-packets/flint-overview-mobile.json"),
    ]);
    validateScenePacketIndex(scenePacketIndex);
    validateScenePacket(scenePacket);
    console.log(
      `Validated scene packets: ${scenePacketIndex.packets.length} published packet(s)`,
    );
    return;
  }

  if (target === "mobile-runtime-profile") {
    const mobileRuntimeProfile = await readJson("data/mobile-runtime-profile.json");
    validateMobileRuntimeProfile(mobileRuntimeProfile);
    console.log(
      `Validated mobile runtime profile: ${mobileRuntimeProfile.current_status}`,
    );
    return;
  }

  throw new Error(`Unknown validation target: ${target}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
