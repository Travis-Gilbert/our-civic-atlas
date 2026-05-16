export type AtlasScopeType =
  | "neighborhood"
  | "city"
  | "county"
  | "region"
  | "state"
  | "corridor"
  | "watershed"
  | "custom";

export type AtlasCapability =
  | "static_only"
  | "accepts_contributions"
  | "has_review_queue"
  | "has_provenance_graph"
  | "has_scene_manifests"
  | "has_lost_buildings"
  | "has_safety_lab"
  | "has_interventions"
  | "has_public_api"
  | "has_ml_predictions";

export type AtlasFederationStatus =
  | "seed"
  | "active"
  | "stale"
  | "candidate"
  | "archived";

export type CivicObjectType =
  | "atlas_node"
  | "place"
  | "parcel"
  | "building_presence"
  | "street"
  | "road_segment"
  | "corridor"
  | "historical_event"
  | "news_article"
  | "source"
  | "dataset"
  | "claim"
  | "observation"
  | "intervention"
  | "metric"
  | "scene_object"
  | "brush_asset"
  | "ifc_asset";

export type ReviewState =
  | "submitted"
  | "needs_review"
  | "needs_more_evidence"
  | "corroborated"
  | "conflicting"
  | "accepted"
  | "rejected"
  | "superseded"
  | "withdrawn";

export type TemporalStatus =
  | "current"
  | "historical"
  | "vanished"
  | "inferred"
  | "disputed"
  | "unknown";

export type CurrentStatus =
  | "active"
  | "inactive"
  | "not_currently_present"
  | "unknown"
  | "not_applicable";

export type RenderMode =
  | "current_confirmed"
  | "current_low_confidence"
  | "vanished_confirmed"
  | "vanished_inferred"
  | "historical_event"
  | "public_intervention"
  | "community_observation_pending"
  | "community_observation_reviewed"
  | "disputed_claim"
  | "model_prediction"
  | "source_stale"
  | "source_high_confidence"
  | "brush_reconstruction"
  | "ifc_semantic_model";

export type PrivacyClass =
  | "public"
  | "public_aggregate"
  | "public_reviewed"
  | "private_pending"
  | "sensitive_location"
  | "restricted";

export type SceneVisibility = "public" | "review_only" | "private";
export type ExportFormat =
  | "json"
  | "geojson"
  | "csv"
  | "parquet"
  | "geoparquet"
  | "glb";

export type ReadModelFormat =
  | ExportFormat
  | "arrow"
  | "flatgeobuf"
  | "pmtiles";

export type MobileRuntimeSurfaceId =
  | "leaflet_baseline"
  | "deck_mobile_candidate";

export type MobileRuntimeStatus =
  | "baseline_only"
  | "candidate_defined"
  | "candidate_available"
  | "promoted";

export type MobilePromotionGateStatus = "planned" | "ready" | "blocked";
export type CatalogLink = {
  id: string;
  name: string;
  url: string;
  media_type: string;
  description?: string;
};

export type AtlasMaintainer = {
  name: string;
  role: string;
  url?: string;
};

export type AtlasNodeManifest = {
  schema_version: string;
  atlas_id: string;
  name: string;
  slug: string;
  canonical_url: string;
  scope_type: AtlasScopeType;
  parent_node_ids: string[];
  child_node_ids: string[];
  neighbor_node_ids: string[];
  boundary_geojson_url: string;
  bbox: [number, number, number, number];
  centroid: [number, number];
  maintainers: AtlasMaintainer[];
  public_contact: string;
  license: string;
  data_license: string;
  contribution_policy_url: string;
  source_registry_url: string;
  layer_catalog_url: string;
  node_catalog_url: string;
  read_model_catalog_url: string;
  capabilities: AtlasCapability[];
  federation_status: AtlasFederationStatus;
  last_updated_at: string;
};

export type CivicObject = {
  id: string;
  atlas_node_id: string;
  object_type: CivicObjectType;
  name: string;
  description: string;
  geometry_ref: string | null;
  time_start: string | null;
  time_end: string | null;
  temporal_status: TemporalStatus;
  current_status: CurrentStatus;
  confidence_score: number;
  confidence_reasons: string[];
  review_state: ReviewState;
  source_ids: string[];
  claim_ids: string[];
  render_modes: RenderMode[];
  dossier_url: string;
  public_visibility: "public" | "private" | "restricted";
  privacy_class: PrivacyClass;
  last_checked_at: string | null;
  updated_at: string;
};

export type NodeCatalogEntry = {
  atlas_id: string;
  name: string;
  scope_type: AtlasScopeType;
  relation: "self" | "parent" | "child" | "neighbor";
  manifest_url: string | null;
  boundary_geojson_url: string | null;
  federation_status: AtlasFederationStatus;
  last_updated_at: string | null;
  capabilities: AtlasCapability[];
  description?: string;
  distance_label?: string;
  direction_label?: string;
  maintainer_label?: string;
  source_count?: number;
  contribution_status?: string;
  freshness_label?: string;
  preview_place_id?: string;
  compare_available?: boolean;
};

export type NodeCatalog = {
  schema_version: string;
  atlas_id: string;
  nodes: NodeCatalogEntry[];
};

export type LayerCatalogEntry = {
  id: string;
  name: string;
  civic_object_types: CivicObjectType[];
  geometry_type: "point" | "line" | "polygon" | "mixed" | "none";
  source_ids: string[];
  read_model_url: string;
  temporal: boolean;
  confidence: boolean;
  privacy_class: PrivacyClass;
};

export type LayerCatalog = {
  schema_version: string;
  atlas_id: string;
  layers: LayerCatalogEntry[];
};

export type ReadModelCatalog = {
  schema_version: string;
  atlas_id: string;
  files: CatalogLink[];
};

export type WellKnownAtlasManifest = {
  schema_version: string;
  atlas_id: string;
  name: string;
  canonical_url: string;
  atlas_node_url: string;
  node_catalog_url: string;
  source_registry_url: string;
  layer_catalog_url: string;
  read_model_catalog_url: string;
  contribution_policy_url: string;
  federation_status: AtlasFederationStatus;
  capabilities: AtlasCapability[];
  generated_at: string;
};

export type MobileRuntimeWorkerBoundary = {
  boundary_id: string;
  label: string;
  stage: string;
  owner: string;
  runtime: string;
  required_on_mobile: boolean;
  fallback_behavior: string;
  status: "current" | "planned";
};

export type MobilePromotionGate = {
  gate_id: string;
  label: string;
  requirement: string;
  validator: string;
  pass_condition: string;
  status: MobilePromotionGateStatus;
};

export type MobileTilePublicationContract = {
  default_archive_format: "pmtiles";
  basemap_archive_url: string;
  overlay_archive_pattern: string;
  metadata_url: string | null;
  cache_strategy: string;
  rebuild_trigger: string;
  status: "planned" | "active";
};

export type MobileRuntimeProfile = {
  schema_version: string;
  atlas_id: string;
  default_mobile_surface: MobileRuntimeSurfaceId;
  candidate_mobile_surface: MobileRuntimeSurfaceId;
  current_status: MobileRuntimeStatus;
  promotion_summary: string;
  baseline_reference_route: string;
  reversible_boundary: string;
  dynamic_viewport_contracts_url: string;
  scene_packet_compiler_url: string;
  scene_packet_index_url: string;
  binary_read_model_defaults: {
    preferred_formats: ReadModelFormat[];
    json_allowed_for: string[];
    notes: string[];
  };
  tile_publication: MobileTilePublicationContract;
  worker_boundaries: MobileRuntimeWorkerBoundary[];
  promotion_gates: MobilePromotionGate[];
  notes: string[];
};

export type ViewportGeometryGranularity =
  | "centroid_only"
  | "simplified_geometry"
  | "full_geometry";

export type ViewportVectorSelectionRule = {
  contract_id: string;
  layer_id: string;
  label: string;
  description: string;
  preferred_format: "flatgeobuf";
  endpoint_pattern: string;
  query_parameters: string[];
  range_request_capable: boolean;
  cache_strategy: string;
  fallback_url: string;
  selection_rule: {
    min_zoom: number;
    max_zoom: number;
    packet_handoff_zoom: number;
    max_feature_count_hint: number;
    geometry_granularity: ViewportGeometryGranularity;
    reasons: string[];
  };
  source_ids: string[];
  status: "current" | "planned";
  notes: string[];
};

export type ViewportVectorContracts = {
  schema_version: string;
  atlas_node_id: string;
  contracts: ViewportVectorSelectionRule[];
};

export type ScenePacketScalarType = "float32" | "uint16" | "uint8";

export type ScenePacketGeometryEncoding =
  | "positions+indices"
  | "positions-only"
  | "point-sprites";

export type ScenePacketAttributeBuffer = {
  buffer_id: string;
  source_field: string;
  semantic_role: string;
  scalar_type: ScenePacketScalarType;
  components: number;
  item_count: number;
  normalized: boolean;
};

export type ScenePacketArtifact = {
  artifact_id: string;
  url: string;
  media_type: string;
  format: ReadModelFormat;
  availability: "available" | "planned" | "fallback";
  range_request_capable: boolean;
  semantic_role: string;
};

export type ScenePacketLayer = {
  layer_id: string;
  label: string;
  renderer_role: string;
  geometry_encoding: ScenePacketGeometryEncoding;
  object_count: number;
  attribute_buffers: ScenePacketAttributeBuffer[];
  artifacts: ScenePacketArtifact[];
  fallback_url: string;
  source_contract_id: string;
};

export type ScenePacket = {
  schema_version: string;
  packet_id: string;
  atlas_node_id: string;
  scene_id: string;
  viewport_key: string;
  zoom_range: [number, number];
  derived_from: {
    scene_manifest_id: string;
    contract_ids: string[];
    worker_boundary_id: string;
  };
  layer_packets: ScenePacketLayer[];
  cache_tags: string[];
  notes: string[];
};

export type ScenePacketCompilerStage = {
  stage_id: string;
  label: string;
  worker_boundary_id: string;
  inputs: string[];
  output: string;
  fallback_behavior: string;
  status: "current" | "planned";
};

export type ScenePacketCompiler = {
  schema_version: string;
  atlas_node_id: string;
  compiler_id: string;
  packet_schema_version: string;
  preferred_transport: "typed-array-packet";
  supports_renderers: string[];
  viewport_parameters: string[];
  worker_boundary_id: string;
  example_packet_urls: string[];
  stages: ScenePacketCompilerStage[];
  notes: string[];
};

export type ScenePacketIndexEntry = {
  packet_id: string;
  scene_id: string;
  label: string;
  packet_url: string;
  min_zoom: number;
  max_zoom: number;
  status: "example" | "planned";
};

export type ScenePacketIndex = {
  schema_version: string;
  atlas_node_id: string;
  compiler_contract_url: string;
  packets: ScenePacketIndexEntry[];
  notes: string[];
};

export type SceneAssetKind =
  | "brush_splat"
  | "brush_splat_placeholder"
  | "ifc_model"
  | "glb_model"
  | "raster_reference"
  | "vector_reference";

export type SceneAssetSupportState =
  | "reviewed"
  | "candidate"
  | "placeholder"
  | "unavailable";

export type SceneManifestObject = {
  object_id: string;
  civic_object_id: string;
  render_mode: RenderMode;
  geometry_ref: string | null;
  time_start: string | null;
  time_end: string | null;
  style_token: string;
  visual_recipe_id: string;
  source_ids: string[];
  dossier_url: string;
  visibility: SceneVisibility;
  privacy_class: PrivacyClass;
  asset_refs: string[];
  fallback_render_mode?: RenderMode;
  support_state?: SceneAssetSupportState;
};

export type SceneManifestAsset = {
  asset_id: string;
  object_id: string;
  kind: SceneAssetKind;
  renderer: "r3f" | "brush" | "ifc" | "deck.gl" | "maplibre";
  href: string | null;
  fallback_render_mode: RenderMode;
  support_state: SceneAssetSupportState;
  source_ids: string[];
  review_state: ReviewState;
  notes?: string;
};

export type SceneManifest = {
  schema_version: string;
  scene_id: string;
  atlas_node_id: string;
  name: string;
  description: string;
  bbox: [number, number, number, number];
  time: {
    start: string | null;
    end: string | null;
    mode: string;
  };
  objects: SceneManifestObject[];
  source_ids: string[];
  confidence: {
    score: number;
    reasons: string[];
  };
  assets: SceneManifestAsset[];
  dossier_links: string[];
  renderer_boundary_ids: string[];
  review_state: ReviewState;
  updated_at: string;
};

export type ScenarioMetric = {
  key: string;
  label: string;
  value: number | string | null;
  unit: string | null;
  source_ids: string[];
  confidence_score: number;
};

export type ScenarioManifest = {
  schema_version: string;
  scenario_id: string;
  atlas_node_id: string;
  name: string;
  slug: string;
  description: string;
  base_scene_id: string;
  base_snapshot_at: string;
  proposed_object_ids: string[];
  comparison_object_ids: string[];
  metrics: ScenarioMetric[];
  visibility: SceneVisibility;
  forked_from_scenario_id: string | null;
  lineage_ids: string[];
  permissions: string[];
  export_formats: ExportFormat[];
  source_ids: string[];
  review_state: ReviewState;
  updated_at: string;
};

export type RendererBoundary = {
  renderer_id: string;
  label: string;
  runtime: "maplibre" | "deck.gl" | "r3f" | "mosaic" | "kepler" | "offline";
  role: string;
  owns: string[];
  must_not_own: string[];
  default_surface: boolean;
  mobile_strategy: string;
  status: "primary" | "secondary" | "planned" | "offline";
};

export type StaticAtlasPackage = {
  discoveryManifest: WellKnownAtlasManifest;
  atlasNode: AtlasNodeManifest;
  nodeCatalog: NodeCatalog;
  layerCatalog: LayerCatalog;
  readModelCatalog: ReadModelCatalog;
  civicObjects: CivicObject[];
  sceneManifests: SceneManifest[];
  scenarioManifests: ScenarioManifest[];
  viewportVectorContracts: ViewportVectorContracts;
  scenePacketCompiler: ScenePacketCompiler;
  scenePacketIndex: ScenePacketIndex;
  scenePackets: ScenePacket[];
  mobileRuntimeProfile: MobileRuntimeProfile;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string" && String(record[key]).trim().length > 0;
}

function hasStringArray(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasBoolean(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "boolean";
}

function pushMissingString(
  issues: ValidationIssue[],
  record: Record<string, unknown>,
  path: string,
  key: string,
) {
  if (!hasString(record, key)) {
    issues.push({ path: `${path}.${key}`, message: "Required string is missing." });
  }
}

function pushMissingStringArray(
  issues: ValidationIssue[],
  record: Record<string, unknown>,
  path: string,
  key: string,
) {
  if (!hasStringArray(record, key)) {
    issues.push({ path: `${path}.${key}`, message: "Required string array is missing." });
  }
}

function pushMissingBoolean(
  issues: ValidationIssue[],
  record: Record<string, unknown>,
  path: string,
  key: string,
) {
  if (!hasBoolean(record, key)) {
    issues.push({ path: `${path}.${key}`, message: "Required boolean is missing." });
  }
}

function pushNullableStringIssue(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (!(value === null || (typeof value === "string" && value.trim().length > 0))) {
    issues.push({ path, message: "Value must be null or a non-empty string." });
  }
}

function pushNullableMetricValueIssue(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (
    !(
      value === null ||
      typeof value === "number" ||
      (typeof value === "string" && value.trim().length > 0)
    )
  ) {
    issues.push({ path, message: "Metric value must be null, a number, or a non-empty string." });
  }
}

function pushScoreIssue(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (typeof value !== "number" || value < 0 || value > 1) {
    issues.push({ path, message: "Score must be a number from 0 to 1." });
  }
}

export function validateAtlasNodeManifest(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path: "atlasNode", message: "Atlas node manifest must be an object." }];
  }

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
    pushMissingString(issues, value, "atlasNode", key);
  }

  for (const key of ["parent_node_ids", "child_node_ids", "neighbor_node_ids", "capabilities"]) {
    pushMissingStringArray(issues, value, "atlasNode", key);
  }

  if (!Array.isArray(value.bbox) || value.bbox.length !== 4) {
    issues.push({ path: "atlasNode.bbox", message: "Bounding box must contain four numbers." });
  }

  if (!Array.isArray(value.centroid) || value.centroid.length !== 2) {
    issues.push({ path: "atlasNode.centroid", message: "Centroid must contain two numbers." });
  }

  if (!Array.isArray(value.maintainers) || value.maintainers.length === 0) {
    issues.push({ path: "atlasNode.maintainers", message: "At least one maintainer is required." });
  }

  return issues;
}

export function validateCivicObject(value: unknown, path = "civicObject"): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Civic object must be an object." }];
  }

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
    pushMissingString(issues, value, path, key);
  }

  for (const key of ["confidence_reasons", "source_ids", "claim_ids", "render_modes"]) {
    pushMissingStringArray(issues, value, path, key);
  }

  if (typeof value.confidence_score !== "number" || value.confidence_score < 0 || value.confidence_score > 1) {
    issues.push({ path: `${path}.confidence_score`, message: "Confidence score must be a number from 0 to 1." });
  }

  return issues;
}

export function validateSceneManifest(value: unknown, path = "sceneManifest"): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Scene manifest must be an object." }];
  }

  for (const key of [
    "schema_version",
    "scene_id",
    "atlas_node_id",
    "name",
    "description",
    "review_state",
    "updated_at",
  ]) {
    pushMissingString(issues, value, path, key);
  }

  for (const key of ["source_ids", "dossier_links", "renderer_boundary_ids"]) {
    pushMissingStringArray(issues, value, path, key);
  }

  if (!Array.isArray(value.bbox) || value.bbox.length !== 4) {
    issues.push({ path: `${path}.bbox`, message: "Scene bbox must contain four numbers." });
  }

  if (!isRecord(value.time)) {
    issues.push({ path: `${path}.time`, message: "Scene time must be an object." });
  } else {
    pushMissingString(issues, value.time, `${path}.time`, "mode");
    pushNullableStringIssue(issues, `${path}.time.start`, value.time.start);
    pushNullableStringIssue(issues, `${path}.time.end`, value.time.end);
  }

  if (!isRecord(value.confidence)) {
    issues.push({ path: `${path}.confidence`, message: "Scene confidence must be an object." });
  } else {
    pushScoreIssue(issues, `${path}.confidence.score`, value.confidence.score);
    pushMissingStringArray(issues, value.confidence, `${path}.confidence`, "reasons");
  }

  if (!Array.isArray(value.objects) || value.objects.length === 0) {
    issues.push({ path: `${path}.objects`, message: "At least one scene object is required." });
  } else {
    value.objects.forEach((object, index) => {
      if (!isRecord(object)) {
        issues.push({ path: `${path}.objects.${index}`, message: "Scene object must be an object." });
        return;
      }
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
        pushMissingString(issues, object, `${path}.objects.${index}`, key);
      }
      for (const key of ["source_ids", "asset_refs"]) {
        pushMissingStringArray(issues, object, `${path}.objects.${index}`, key);
      }
      pushNullableStringIssue(
        issues,
        `${path}.objects.${index}.geometry_ref`,
        object.geometry_ref,
      );
      pushNullableStringIssue(
        issues,
        `${path}.objects.${index}.time_start`,
        object.time_start,
      );
      pushNullableStringIssue(
        issues,
        `${path}.objects.${index}.time_end`,
        object.time_end,
      );
    });
  }

  if (!Array.isArray(value.assets)) {
    issues.push({ path: `${path}.assets`, message: "Scene assets must be an array." });
  } else {
    value.assets.forEach((asset, index) => {
      if (!isRecord(asset)) {
        issues.push({ path: `${path}.assets.${index}`, message: "Scene asset must be an object." });
        return;
      }
      for (const key of [
        "asset_id",
        "object_id",
        "kind",
        "renderer",
        "fallback_render_mode",
        "support_state",
        "review_state",
      ]) {
        pushMissingString(issues, asset, `${path}.assets.${index}`, key);
      }
      pushMissingStringArray(issues, asset, `${path}.assets.${index}`, "source_ids");
      pushNullableStringIssue(
        issues,
        `${path}.assets.${index}.href`,
        asset.href,
      );
    });
  }

  return issues;
}

export function validateScenarioManifest(
  value: unknown,
  path = "scenarioManifest",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Scenario manifest must be an object." }];
  }

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
    pushMissingString(issues, value, path, key);
  }

  for (const key of [
    "proposed_object_ids",
    "comparison_object_ids",
    "lineage_ids",
    "permissions",
    "export_formats",
    "source_ids",
  ]) {
    pushMissingStringArray(issues, value, path, key);
  }

  if (!Array.isArray(value.metrics) || value.metrics.length === 0) {
    issues.push({ path: `${path}.metrics`, message: "At least one scenario metric is required." });
  } else {
    value.metrics.forEach((metric, index) => {
      if (!isRecord(metric)) {
        issues.push({ path: `${path}.metrics.${index}`, message: "Scenario metric must be an object." });
        return;
      }
      for (const key of ["key", "label"]) {
        pushMissingString(issues, metric, `${path}.metrics.${index}`, key);
      }
      pushMissingStringArray(issues, metric, `${path}.metrics.${index}`, "source_ids");
      pushNullableMetricValueIssue(
        issues,
        `${path}.metrics.${index}.value`,
        metric.value,
      );
      pushNullableStringIssue(
        issues,
        `${path}.metrics.${index}.unit`,
        metric.unit,
      );
      pushScoreIssue(
        issues,
        `${path}.metrics.${index}.confidence_score`,
        metric.confidence_score,
      );
    });
  }

  pushNullableStringIssue(
    issues,
    `${path}.forked_from_scenario_id`,
    value.forked_from_scenario_id,
  );

  return issues;
}

export function validateViewportVectorContracts(
  value: unknown,
  path = "viewportVectorContracts",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Viewport vector contracts must be an object." }];
  }

  for (const key of ["schema_version", "atlas_node_id"]) {
    pushMissingString(issues, value, path, key);
  }

  if (!Array.isArray(value.contracts) || value.contracts.length === 0) {
    issues.push({ path: `${path}.contracts`, message: "At least one viewport vector contract is required." });
    return issues;
  }

  value.contracts.forEach((contract, index) => {
    if (!isRecord(contract)) {
      issues.push({ path: `${path}.contracts.${index}`, message: "Viewport contract must be an object." });
      return;
    }
    for (const key of [
      "contract_id",
      "layer_id",
      "label",
      "description",
      "preferred_format",
      "endpoint_pattern",
      "cache_strategy",
      "fallback_url",
      "status",
    ]) {
      pushMissingString(issues, contract, `${path}.contracts.${index}`, key);
    }
    for (const key of ["query_parameters", "source_ids", "notes"]) {
      pushMissingStringArray(issues, contract, `${path}.contracts.${index}`, key);
    }
    pushMissingBoolean(
      issues,
      contract,
      `${path}.contracts.${index}`,
      "range_request_capable",
    );
    if (!isRecord(contract.selection_rule)) {
      issues.push({
        path: `${path}.contracts.${index}.selection_rule`,
        message: "Selection rule must be an object.",
      });
      return;
    }
    for (const key of [
      "min_zoom",
      "max_zoom",
      "packet_handoff_zoom",
      "max_feature_count_hint",
    ]) {
      if (typeof contract.selection_rule[key] !== "number") {
        issues.push({
          path: `${path}.contracts.${index}.selection_rule.${key}`,
          message: "Selection rule numeric field is missing.",
        });
      }
    }
    pushMissingString(
      issues,
      contract.selection_rule,
      `${path}.contracts.${index}.selection_rule`,
      "geometry_granularity",
    );
    pushMissingStringArray(
      issues,
      contract.selection_rule,
      `${path}.contracts.${index}.selection_rule`,
      "reasons",
    );
  });

  return issues;
}

export function validateScenePacketCompiler(
  value: unknown,
  path = "scenePacketCompiler",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Scene packet compiler must be an object." }];
  }

  for (const key of [
    "schema_version",
    "atlas_node_id",
    "compiler_id",
    "packet_schema_version",
    "preferred_transport",
    "worker_boundary_id",
  ]) {
    pushMissingString(issues, value, path, key);
  }

  for (const key of [
    "supports_renderers",
    "viewport_parameters",
    "example_packet_urls",
    "notes",
  ]) {
    pushMissingStringArray(issues, value, path, key);
  }

  if (!Array.isArray(value.stages) || value.stages.length === 0) {
    issues.push({ path: `${path}.stages`, message: "At least one compiler stage is required." });
  } else {
    value.stages.forEach((stage, index) => {
      if (!isRecord(stage)) {
        issues.push({ path: `${path}.stages.${index}`, message: "Compiler stage must be an object." });
        return;
      }
      for (const key of [
        "stage_id",
        "label",
        "worker_boundary_id",
        "output",
        "fallback_behavior",
        "status",
      ]) {
        pushMissingString(issues, stage, `${path}.stages.${index}`, key);
      }
      pushMissingStringArray(issues, stage, `${path}.stages.${index}`, "inputs");
    });
  }

  return issues;
}

export function validateScenePacketIndex(
  value: unknown,
  path = "scenePacketIndex",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Scene packet index must be an object." }];
  }

  for (const key of [
    "schema_version",
    "atlas_node_id",
    "compiler_contract_url",
  ]) {
    pushMissingString(issues, value, path, key);
  }
  pushMissingStringArray(issues, value, path, "notes");

  if (!Array.isArray(value.packets) || value.packets.length === 0) {
    issues.push({ path: `${path}.packets`, message: "At least one scene packet index entry is required." });
  } else {
    value.packets.forEach((packet, index) => {
      if (!isRecord(packet)) {
        issues.push({ path: `${path}.packets.${index}`, message: "Scene packet index entry must be an object." });
        return;
      }
      for (const key of ["packet_id", "scene_id", "label", "packet_url", "status"]) {
        pushMissingString(issues, packet, `${path}.packets.${index}`, key);
      }
      for (const key of ["min_zoom", "max_zoom"]) {
        if (typeof packet[key] !== "number") {
          issues.push({
            path: `${path}.packets.${index}.${key}`,
            message: "Zoom boundary must be numeric.",
          });
        }
      }
    });
  }

  return issues;
}

export function validateScenePacket(
  value: unknown,
  path = "scenePacket",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Scene packet must be an object." }];
  }

  for (const key of [
    "schema_version",
    "packet_id",
    "atlas_node_id",
    "scene_id",
    "viewport_key",
  ]) {
    pushMissingString(issues, value, path, key);
  }
  for (const key of ["cache_tags", "notes"]) {
    pushMissingStringArray(issues, value, path, key);
  }

  if (!Array.isArray(value.zoom_range) || value.zoom_range.length !== 2) {
    issues.push({ path: `${path}.zoom_range`, message: "Scene packet zoom range must contain two numbers." });
  }

  if (!isRecord(value.derived_from)) {
    issues.push({ path: `${path}.derived_from`, message: "Scene packet derivation must be an object." });
  } else {
    for (const key of ["scene_manifest_id", "worker_boundary_id"]) {
      pushMissingString(issues, value.derived_from, `${path}.derived_from`, key);
    }
    pushMissingStringArray(
      issues,
      value.derived_from,
      `${path}.derived_from`,
      "contract_ids",
    );
  }

  if (!Array.isArray(value.layer_packets) || value.layer_packets.length === 0) {
    issues.push({ path: `${path}.layer_packets`, message: "At least one scene packet layer is required." });
  } else {
    value.layer_packets.forEach((layer, index) => {
      if (!isRecord(layer)) {
        issues.push({ path: `${path}.layer_packets.${index}`, message: "Scene packet layer must be an object." });
        return;
      }
      for (const key of [
        "layer_id",
        "label",
        "renderer_role",
        "geometry_encoding",
        "fallback_url",
        "source_contract_id",
      ]) {
        pushMissingString(issues, layer, `${path}.layer_packets.${index}`, key);
      }
      if (typeof layer.object_count !== "number") {
        issues.push({
          path: `${path}.layer_packets.${index}.object_count`,
          message: "Scene packet object count must be numeric.",
        });
      }
      if (!Array.isArray(layer.attribute_buffers) || layer.attribute_buffers.length === 0) {
        issues.push({
          path: `${path}.layer_packets.${index}.attribute_buffers`,
          message: "Layer packet attribute buffers must not be empty.",
        });
      }
      if (!Array.isArray(layer.artifacts) || layer.artifacts.length === 0) {
        issues.push({
          path: `${path}.layer_packets.${index}.artifacts`,
          message: "Layer packet artifacts must not be empty.",
        });
      }
    });
  }

  return issues;
}

export function validateMobileRuntimeProfile(
  value: unknown,
  path = "mobileRuntimeProfile",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Mobile runtime profile must be an object." }];
  }

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
    pushMissingString(issues, value, path, key);
  }

  pushMissingStringArray(issues, value, path, "notes");

  if (!isRecord(value.binary_read_model_defaults)) {
    issues.push({
      path: `${path}.binary_read_model_defaults`,
      message: "Binary read model defaults must be an object.",
    });
  } else {
    for (const key of ["preferred_formats", "json_allowed_for", "notes"]) {
      pushMissingStringArray(
        issues,
        value.binary_read_model_defaults,
        `${path}.binary_read_model_defaults`,
        key,
      );
    }
  }

  if (!isRecord(value.tile_publication)) {
    issues.push({
      path: `${path}.tile_publication`,
      message: "Tile publication contract must be an object.",
    });
  } else {
    for (const key of [
      "default_archive_format",
      "basemap_archive_url",
      "overlay_archive_pattern",
      "cache_strategy",
      "rebuild_trigger",
      "status",
    ]) {
      pushMissingString(issues, value.tile_publication, `${path}.tile_publication`, key);
    }
    pushNullableStringIssue(
      issues,
      `${path}.tile_publication.metadata_url`,
      value.tile_publication.metadata_url,
    );
  }

  if (!Array.isArray(value.worker_boundaries) || value.worker_boundaries.length === 0) {
    issues.push({
      path: `${path}.worker_boundaries`,
      message: "At least one worker boundary is required.",
    });
  } else {
    value.worker_boundaries.forEach((boundary, index) => {
      if (!isRecord(boundary)) {
        issues.push({
          path: `${path}.worker_boundaries.${index}`,
          message: "Worker boundary must be an object.",
        });
        return;
      }
      for (const key of [
        "boundary_id",
        "label",
        "stage",
        "owner",
        "runtime",
        "fallback_behavior",
        "status",
      ]) {
        pushMissingString(issues, boundary, `${path}.worker_boundaries.${index}`, key);
      }
      pushMissingBoolean(
        issues,
        boundary,
        `${path}.worker_boundaries.${index}`,
        "required_on_mobile",
      );
    });
  }

  if (!Array.isArray(value.promotion_gates) || value.promotion_gates.length === 0) {
    issues.push({
      path: `${path}.promotion_gates`,
      message: "At least one promotion gate is required.",
    });
  } else {
    value.promotion_gates.forEach((gate, index) => {
      if (!isRecord(gate)) {
        issues.push({
          path: `${path}.promotion_gates.${index}`,
          message: "Promotion gate must be an object.",
        });
        return;
      }
      for (const key of [
        "gate_id",
        "label",
        "requirement",
        "validator",
        "pass_condition",
        "status",
      ]) {
        pushMissingString(issues, gate, `${path}.promotion_gates.${index}`, key);
      }
    });
  }

  return issues;
}

export function validateStaticAtlasPackage(pkg: StaticAtlasPackage): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateAtlasNodeManifest(pkg.atlasNode));

  if (!isRecord(pkg.discoveryManifest)) {
    issues.push({ path: "discoveryManifest", message: "Discovery manifest must be an object." });
  } else {
    for (const key of [
      "schema_version",
      "atlas_id",
      "name",
      "canonical_url",
      "atlas_node_url",
      "node_catalog_url",
      "source_registry_url",
      "layer_catalog_url",
      "read_model_catalog_url",
      "contribution_policy_url",
      "federation_status",
      "generated_at",
    ]) {
      pushMissingString(issues, pkg.discoveryManifest, "discoveryManifest", key);
    }
    pushMissingStringArray(issues, pkg.discoveryManifest, "discoveryManifest", "capabilities");
  }

  if (!Array.isArray(pkg.civicObjects) || pkg.civicObjects.length === 0) {
    issues.push({ path: "civicObjects", message: "At least one civic object is required." });
  } else {
    pkg.civicObjects.forEach((object, index) => {
      issues.push(...validateCivicObject(object, `civicObjects.${index}`));
    });
  }

  if (!Array.isArray(pkg.nodeCatalog.nodes) || pkg.nodeCatalog.nodes.length === 0) {
    issues.push({ path: "nodeCatalog.nodes", message: "At least one atlas node catalog entry is required." });
  }

  if (!Array.isArray(pkg.layerCatalog.layers) || pkg.layerCatalog.layers.length === 0) {
    issues.push({ path: "layerCatalog.layers", message: "At least one layer catalog entry is required." });
  }

  if (!Array.isArray(pkg.readModelCatalog.files) || pkg.readModelCatalog.files.length === 0) {
    issues.push({ path: "readModelCatalog.files", message: "At least one read-model file entry is required." });
  }

  if (!Array.isArray(pkg.sceneManifests) || pkg.sceneManifests.length === 0) {
    issues.push({ path: "sceneManifests", message: "At least one scene manifest is required." });
  } else {
    pkg.sceneManifests.forEach((manifest, index) => {
      issues.push(...validateSceneManifest(manifest, `sceneManifests.${index}`));
    });
  }

  if (!Array.isArray(pkg.scenarioManifests) || pkg.scenarioManifests.length === 0) {
    issues.push({ path: "scenarioManifests", message: "At least one scenario manifest is required." });
  } else {
    pkg.scenarioManifests.forEach((manifest, index) => {
      issues.push(...validateScenarioManifest(manifest, `scenarioManifests.${index}`));
    });
  }

  issues.push(
    ...validateViewportVectorContracts(
      pkg.viewportVectorContracts,
      "viewportVectorContracts",
    ),
  );
  issues.push(
    ...validateScenePacketCompiler(
      pkg.scenePacketCompiler,
      "scenePacketCompiler",
    ),
  );
  issues.push(...validateScenePacketIndex(pkg.scenePacketIndex, "scenePacketIndex"));

  if (!Array.isArray(pkg.scenePackets) || pkg.scenePackets.length === 0) {
    issues.push({ path: "scenePackets", message: "At least one scene packet is required." });
  } else {
    pkg.scenePackets.forEach((packet, index) => {
      issues.push(...validateScenePacket(packet, `scenePackets.${index}`));
    });
  }

  issues.push(
    ...validateMobileRuntimeProfile(
      pkg.mobileRuntimeProfile,
      "mobileRuntimeProfile",
    ),
  );

  return issues;
}
