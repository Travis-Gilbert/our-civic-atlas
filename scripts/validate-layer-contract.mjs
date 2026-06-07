import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const schemaPath = path.join(root, "docs/design/flint-graphql-schema-v1.graphql");
const operationsPath = path.join(root, "src/lib/api/graphql/queries/layers.graphql");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertContains(source, needle, label) {
  assert(source.includes(needle), `${label} missing ${needle}`);
}

const [schema, operations] = await Promise.all([
  readFile(schemaPath, "utf8"),
  readFile(operationsPath, "utf8"),
]);

for (const needle of [
  "enum LayerKind",
  "enum LayerSourceAction",
  "enum LayerLifecycleState",
  "enum LayerViewStatus",
  "type Layer ",
  "type LayerRecord",
  "type LayerView",
  "type LayerRecipe",
  "layers(",
  "layerView(",
  "layerRecipe(",
]) {
  assertContains(schema, needle, "GraphQL schema");
}

for (const needle of [
  "query Layers",
  "query LayerView",
  "query LayerRecipe",
  "provenanceSummary",
  "rendererBoundaryId",
  "displayEncoding",
]) {
  assertContains(operations, needle, "Layer GraphQL operations");
}

console.log("Validated Layer GraphQL contract and operations.");
