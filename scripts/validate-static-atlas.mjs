import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const staticPackageDir = path.join(
  root,
  "src/data/open-flint-atlas/fixtures/static-package",
);

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
  assert(typeof value === "string" && value.trim().length > 0, `${pathLabel} must be a non-empty string`);
}

function assertStringArray(value, pathLabel) {
  assert(Array.isArray(value), `${pathLabel} must be an array`);
  for (const item of value) {
    assert(typeof item === "string", `${pathLabel} must contain only strings`);
  }
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

    assert(
      typeof object.confidence_score === "number" &&
        object.confidence_score >= 0 &&
        object.confidence_score <= 1,
      `civic-objects.${index}.confidence_score must be between 0 and 1`,
    );

    for (const key of ["confidence_reasons", "source_ids", "claim_ids", "render_modes"]) {
      assertStringArray(object[key], `civic-objects.${index}.${key}`);
    }
  });
}

async function main() {
  const [discoveryManifest, atlasNode, nodeCatalog, layerCatalog, readModelCatalog, civicObjects, sceneManifest] =
    await Promise.all([
      readJson("well-known/our-civic-atlas.json"),
      readJson("data/atlas-node.json"),
      readJson("data/node-catalog.json"),
      readJson("data/layer-catalog.json"),
      readJson("data/read-model-catalog.json"),
      readJson("data/civic-objects.json"),
      readJson("data/scene-manifests/flint-overview.json"),
    ]);

  assertString(discoveryManifest.atlas_id, "well-known.atlas_id");
  assertString(discoveryManifest.atlas_node_url, "well-known.atlas_node_url");
  assertStringArray(discoveryManifest.capabilities, "well-known.capabilities");
  validateAtlasNode(atlasNode);

  assert(Array.isArray(nodeCatalog.nodes) && nodeCatalog.nodes.length > 0, "node-catalog.nodes must not be empty");
  assert(Array.isArray(layerCatalog.layers) && layerCatalog.layers.length > 0, "layer-catalog.layers must not be empty");
  assert(Array.isArray(readModelCatalog.files) && readModelCatalog.files.length > 0, "read-model-catalog.files must not be empty");
  validateCivicObjects(civicObjects);

  assertString(sceneManifest.scene_id, "scene-manifest.scene_id");
  assert(Array.isArray(sceneManifest.objects), "scene-manifest.objects must be an array");

  console.log(
    `Validated static atlas package: ${atlasNode.name}, ${civicObjects.length} civic objects, ${layerCatalog.layers.length} layers, ${nodeCatalog.nodes.length} nodes.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
