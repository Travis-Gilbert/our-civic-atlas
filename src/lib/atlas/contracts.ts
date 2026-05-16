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
  render_mode: RenderMode;
  geometry_ref: string | null;
  style_token: string;
  asset_refs?: string[];
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
  review_state: ReviewState;
  updated_at: string;
};

export type StaticAtlasPackage = {
  discoveryManifest: WellKnownAtlasManifest;
  atlasNode: AtlasNodeManifest;
  nodeCatalog: NodeCatalog;
  layerCatalog: LayerCatalog;
  readModelCatalog: ReadModelCatalog;
  civicObjects: CivicObject[];
  sceneManifests: SceneManifest[];
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

  for (const key of ["source_ids", "dossier_links"]) {
    pushMissingStringArray(issues, value, path, key);
  }

  if (!Array.isArray(value.bbox) || value.bbox.length !== 4) {
    issues.push({ path: `${path}.bbox`, message: "Scene bbox must contain four numbers." });
  }

  if (!Array.isArray(value.objects) || value.objects.length === 0) {
    issues.push({ path: `${path}.objects`, message: "At least one scene object is required." });
  } else {
    value.objects.forEach((object, index) => {
      if (!isRecord(object)) {
        issues.push({ path: `${path}.objects.${index}`, message: "Scene object must be an object." });
        return;
      }
      for (const key of ["object_id", "render_mode", "style_token"]) {
        pushMissingString(issues, object, `${path}.objects.${index}`, key);
      }
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

  return issues;
}
