import { readFile } from "node:fs/promises";

let failures = 0;

function check(label, ok) {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures += 1;
}

async function readSource(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const [porchfestClient, atlasMap, taskRail] = await Promise.all([
  readSource("src/app/porchfest/PorchfestPlannerClient.tsx"),
  readSource("src/components/atlas/AtlasMap.tsx"),
  readSource("src/components/atlas/PlannerTaskRail.tsx"),
]);

console.log("1. mobile basemap restores pickable OSM buildings");
check(
  "mobile enables the raw OSM building layer",
  porchfestClient.includes("osmBuildings: true"),
);
check(
  "mobile keeps the heavier urban model disabled",
  porchfestClient.includes("urbanDesignModel: false"),
);
check(
  "AtlasMap can extrude OSM buildings outside non-atlas view mode",
  atlasMap.includes("if (osmBuildingsVisible)") &&
    atlasMap.includes("forceOsmBuildingExtrusion"),
);
check(
  "mobile atlas-mode OSM buildings reuse oblique building heights",
  atlasMap.includes("extruded: osmBuildingsExtruded") &&
    atlasMap.includes("osmBuildingElevationViewMode") &&
    atlasMap.includes("? \"oblique\" : viewMode"),
);
check(
  "PorchFest opts mobile into raw OSM building extrusion",
  porchfestClient.includes("forceOsmBuildingExtrusion={isMobile}"),
);

console.log("2. mobile address selection is wired");
check(
  "selected building state reaches ResponsiveAtlasMap",
  porchfestClient.includes("selectedBuilding={buildingForEdit}"),
);
check(
  "mobile taps can select buildings for addresses",
  porchfestClient.includes("isMobile || addressEditMode ? handleBuildingSelect : undefined"),
);
check(
  "mobile has an address card surface",
  porchfestClient.includes("data-mobile-building-address-card=\"true\""),
);

console.log("3. geographic task affordances survive the mobile rail");
check(
  "building and point task labels are passed to the rail",
  porchfestClient.includes("taskLocationDetails={taskLocationDetails}"),
);
check(
  "building and point tasks can fly to their anchor",
  porchfestClient.includes("handleFlyToTask(task.id)") &&
    taskRail.includes("onFlyToTask?.(task.id)"),
);
check(
  "rail exposes a stable marker for anchored task links",
  taskRail.includes("data-geo-task-anchor=\"true\""),
);

if (failures > 0) {
  console.error(`\nvalidate-porchfest-mobile-map: ${failures} check(s) failed`);
  process.exit(1);
}

console.log("\nvalidate-porchfest-mobile-map: all checks passed");
