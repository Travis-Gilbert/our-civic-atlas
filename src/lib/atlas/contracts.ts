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
  geometry_ref: string | null;
  time_start: string | null;
  time_end: string | null;
  render_mode: RenderMode;
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

export type PrimitiveParameterType = "number" | "string" | "boolean" | "enum";

export type CivicPrimitiveParameter = {
  key: string;
  label: string;
  type: PrimitiveParameterType;
  required: boolean;
  unit?: string | null;
  default_value?: string | number | boolean | null;
  options?: string[];
};

export type CivicPrimitiveRenderRecipe = {
  renderer: "maplibre" | "deck.gl" | "r3f" | "kepler";
  geometry_type: "point" | "line" | "polygon" | "volume";
  style_token: string;
  label: string;
};

export type CivicPrimitiveMetric = {
  key: string;
  label: string;
  unit: string | null;
  direction: "increase" | "decrease" | "target";
};

export type CivicDesignPrimitive = {
  primitive_id: string;
  atlas_node_id: string;
  name: string;
  category: string;
  description: string;
  geometry_rule: string;
  parameters: CivicPrimitiveParameter[];
  render_recipes: CivicPrimitiveRenderRecipe[];
  accessibility_text: string;
  metrics: CivicPrimitiveMetric[];
  export_formats: ExportFormat[];
  source_ids: string[];
  status: "draft" | "reviewed" | "public";
};

export type GeoCommentTargetType =
  | "point"
  | "line"
  | "polygon"
  | "street"
  | "parcel"
  | "building"
  | "scenario"
  | "poll"
  | "document"
  | "node";

export type GeoCommentAnchor = {
  target_type: GeoCommentTargetType;
  target_id: string;
  geometry_type: "point" | "line" | "polygon" | "none";
  geometry_ref: string | null;
};

export type GeoComment = {
  comment_id: string;
  atlas_node_id: string;
  title: string;
  body: string;
  author_role: string;
  anchor: GeoCommentAnchor;
  moderation_state:
    | "candidate"
    | "review_only"
    | "public_reviewed"
    | "rejected";
  privacy_class: PrivacyClass;
  visibility: SceneVisibility;
  source_ids: string[];
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LayerRecipeFieldMapping = {
  source_field: string;
  target_field: string;
  required: boolean;
};

export type LayerRecipe = {
  recipe_id: string;
  atlas_node_id: string;
  name: string;
  description: string;
  layer_ids: string[];
  geometry_type: "point" | "line" | "polygon" | "mixed";
  legend_label: string;
  default_renderer: "deck.gl" | "kepler";
  compatible_renderers: string[];
  field_mappings: LayerRecipeFieldMapping[];
  source_ids: string[];
  default_visible: boolean;
  export_formats: ExportFormat[];
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
  civicDesignPrimitives: CivicDesignPrimitive[];
  geoComments: GeoComment[];
  layerRecipes: LayerRecipe[];
  rendererBoundaries: RendererBoundary[];
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
  if (value !== null && typeof value !== "string") {
    issues.push({
      path,
      message: "Value must be a string or null.",
    });
  }
}

function pushNullableMetricValueIssue(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (
    value !== null &&
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    issues.push({
      path,
      message: "Metric value must be a string, number, or null.",
    });
  }
}

function pushScoreIssue(
  issues: ValidationIssue[],
  path: string,
  value: unknown,
) {
  if (typeof value !== "number" || value < 0 || value > 1) {
    issues.push({
      path,
      message: "Confidence score must be a number from 0 to 1.",
    });
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

  pushScoreIssue(issues, `${path}.confidence_score`, value.confidence_score);
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

  if (!isRecord(value.time) || !hasString(value.time, "mode")) {
    issues.push({ path: `${path}.time`, message: "Scene time must include a mode string." });
  } else {
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

export function validateCivicDesignPrimitive(
  value: unknown,
  path = "civicDesignPrimitive",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Civic design primitive must be an object." }];
  }

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
    pushMissingString(issues, value, path, key);
  }

  for (const key of ["export_formats", "source_ids"]) {
    pushMissingStringArray(issues, value, path, key);
  }

  if (!Array.isArray(value.parameters) || value.parameters.length === 0) {
    issues.push({ path: `${path}.parameters`, message: "Primitive parameters must not be empty." });
  } else {
    value.parameters.forEach((parameter, index) => {
      if (!isRecord(parameter)) {
        issues.push({ path: `${path}.parameters.${index}`, message: "Primitive parameter must be an object." });
        return;
      }
      for (const key of ["key", "label", "type"]) {
        pushMissingString(issues, parameter, `${path}.parameters.${index}`, key);
      }
      pushMissingBoolean(issues, parameter, `${path}.parameters.${index}`, "required");
    });
  }

  if (!Array.isArray(value.render_recipes) || value.render_recipes.length === 0) {
    issues.push({ path: `${path}.render_recipes`, message: "Primitive render recipes must not be empty." });
  } else {
    value.render_recipes.forEach((recipe, index) => {
      if (!isRecord(recipe)) {
        issues.push({ path: `${path}.render_recipes.${index}`, message: "Primitive render recipe must be an object." });
        return;
      }
      for (const key of ["renderer", "geometry_type", "style_token", "label"]) {
        pushMissingString(issues, recipe, `${path}.render_recipes.${index}`, key);
      }
    });
  }

  if (!Array.isArray(value.metrics) || value.metrics.length === 0) {
    issues.push({ path: `${path}.metrics`, message: "Primitive metrics must not be empty." });
  } else {
    value.metrics.forEach((metric, index) => {
      if (!isRecord(metric)) {
        issues.push({ path: `${path}.metrics.${index}`, message: "Primitive metric must be an object." });
        return;
      }
      for (const key of ["key", "label", "direction"]) {
        pushMissingString(issues, metric, `${path}.metrics.${index}`, key);
      }
    });
  }

  return issues;
}

export function validateGeoComment(
  value: unknown,
  path = "geoComment",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Geo comment must be an object." }];
  }

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
    pushMissingString(issues, value, path, key);
  }

  pushMissingStringArray(issues, value, path, "source_ids");

  if (!isRecord(value.anchor)) {
    issues.push({ path: `${path}.anchor`, message: "Geo comment anchor must be an object." });
  } else {
    for (const key of ["target_type", "target_id", "geometry_type"]) {
      pushMissingString(issues, value.anchor, `${path}.anchor`, key);
    }
    pushNullableStringIssue(
      issues,
      `${path}.anchor.geometry_ref`,
      value.anchor.geometry_ref,
    );
  }

  pushNullableStringIssue(issues, `${path}.review_notes`, value.review_notes);

  return issues;
}

export function validateLayerRecipe(
  value: unknown,
  path = "layerRecipe",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Layer recipe must be an object." }];
  }

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
    pushMissingString(issues, value, path, key);
  }

  for (const key of ["layer_ids", "compatible_renderers", "source_ids", "export_formats"]) {
    pushMissingStringArray(issues, value, path, key);
  }

  pushMissingBoolean(issues, value, path, "default_visible");

  if (!Array.isArray(value.field_mappings) || value.field_mappings.length === 0) {
    issues.push({ path: `${path}.field_mappings`, message: "Layer recipe field mappings must not be empty." });
  } else {
    value.field_mappings.forEach((mapping, index) => {
      if (!isRecord(mapping)) {
        issues.push({ path: `${path}.field_mappings.${index}`, message: "Layer recipe mapping must be an object." });
        return;
      }
      for (const key of ["source_field", "target_field"]) {
        pushMissingString(issues, mapping, `${path}.field_mappings.${index}`, key);
      }
      pushMissingBoolean(
        issues,
        mapping,
        `${path}.field_mappings.${index}`,
        "required",
      );
    });
  }

  return issues;
}

export function validateRendererBoundary(
  value: unknown,
  path = "rendererBoundary",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "Renderer boundary must be an object." }];
  }

  for (const key of [
    "renderer_id",
    "label",
    "runtime",
    "role",
    "mobile_strategy",
    "status",
  ]) {
    pushMissingString(issues, value, path, key);
  }

  for (const key of ["owns", "must_not_own"]) {
    pushMissingStringArray(issues, value, path, key);
  }

  pushMissingBoolean(issues, value, path, "default_surface");
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

  if (
    !Array.isArray(pkg.civicDesignPrimitives) ||
    pkg.civicDesignPrimitives.length === 0
  ) {
    issues.push({ path: "civicDesignPrimitives", message: "At least one civic design primitive is required." });
  } else {
    pkg.civicDesignPrimitives.forEach((primitive, index) => {
      issues.push(
        ...validateCivicDesignPrimitive(
          primitive,
          `civicDesignPrimitives.${index}`,
        ),
      );
    });
  }

  if (!Array.isArray(pkg.geoComments) || pkg.geoComments.length === 0) {
    issues.push({ path: "geoComments", message: "At least one geo comment is required." });
  } else {
    pkg.geoComments.forEach((comment, index) => {
      issues.push(...validateGeoComment(comment, `geoComments.${index}`));
    });
  }

  if (!Array.isArray(pkg.layerRecipes) || pkg.layerRecipes.length === 0) {
    issues.push({ path: "layerRecipes", message: "At least one layer recipe is required." });
  } else {
    pkg.layerRecipes.forEach((recipe, index) => {
      issues.push(...validateLayerRecipe(recipe, `layerRecipes.${index}`));
    });
  }

  if (!Array.isArray(pkg.rendererBoundaries) || pkg.rendererBoundaries.length === 0) {
    issues.push({ path: "rendererBoundaries", message: "At least one renderer boundary is required." });
  } else {
    pkg.rendererBoundaries.forEach((boundary, index) => {
      issues.push(
        ...validateRendererBoundary(boundary, `rendererBoundaries.${index}`),
      );
    });
  }

  return issues;
}
