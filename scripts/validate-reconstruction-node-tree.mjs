import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const reconstructionUrl = pathToFileURL(
  `${process.cwd()}/src/lib/atlas/historical-reconstruction.ts`,
).href;
const nodeTreeUrl = pathToFileURL(
  `${process.cwd()}/src/lib/atlas/reconstruction-node-tree.ts`,
).href;

const { FLINT_LOST_RECONSTRUCTIONS } = await import(reconstructionUrl);
const {
  applyNodeTreeToHistoricalReconstruction,
  createReconstructionNodeTree,
  diffReconstructionNodeTrees,
  getReconstructionNodePath,
} = await import(nodeTreeUrl);

const tree = createReconstructionNodeTree(FLINT_LOST_RECONSTRUCTIONS, {
  siteId: "site:lost-flint:carriage-town",
  siteLabel: "Lost Flint: Carriage Town",
});

const site = tree.nodes["reconstruction-node:site:lost-flint:carriage-town"];
assert.equal(site.type, "site");
assert.equal(site.children.length, FLINT_LOST_RECONSTRUCTIONS.length);

const whaley = FLINT_LOST_RECONSTRUCTIONS[0];
const whaleyBuildingId = `reconstruction-node:${whaley.id}:building`;
const whaleyRoofId = `reconstruction-node:${whaley.id}:roof`;
const whaleyFacadeId = `reconstruction-node:${whaley.id}:facade`;
const whaleyOpeningGridId = `reconstruction-node:${whaley.id}:opening_grid`;

assert.equal(tree.nodes[whaleyBuildingId].type, "building");
assert.equal(tree.nodes[whaleyRoofId].type, "roof");
assert.equal(tree.nodes[whaleyRoofId].data.form, "hipped");
assert.equal(tree.nodes[whaleyFacadeId].children.includes(whaleyOpeningGridId), true);

const path = getReconstructionNodePath(tree, whaleyOpeningGridId).map(
  (node) => node.type,
);
assert.deepEqual(path, ["site", "building", "level", "facade", "opening_grid"]);

const editedTree = structuredClone(tree);
editedTree.nodes[whaleyRoofId].data.form = "gable";
editedTree.nodes[whaleyRoofId].data.confidence = 0.5;

const patches = diffReconstructionNodeTrees(tree, editedTree);
assert.equal(patches.length, 1);
assert.equal(patches[0].op, "update");
assert.equal(patches[0].nodeId, whaleyRoofId);

const editedWhaley = applyNodeTreeToHistoricalReconstruction(
  whaley,
  editedTree,
);
assert.equal(editedWhaley.roof_form, "gable");
assert.equal(editedWhaley.roof_confidence, 0.5);

console.log(
  `validated ${Object.keys(tree.nodes).length} reconstruction nodes across `
    + `${FLINT_LOST_RECONSTRUCTIONS.length} Lost Flint reconstructions`,
);
