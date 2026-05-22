import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const modelUrl = pathToFileURL(
  `${process.cwd()}/src/lib/atlas/urban-design-model.ts`,
).href;
const fabricUrl = pathToFileURL(
  `${process.cwd()}/src/lib/atlas/building-fabric.ts`,
).href;

const {
  createUrbanDesignModelCollection,
  summarizeUrbanDesignModel,
} = await import(modelUrl);
const {
  BUILDING_FABRIC_HEIGHT_PRIORS,
  stableHash,
} = await import(fabricUrl);

const source = JSON.parse(
  readFileSync(
    `${process.cwd()}/src/data/open-flint-atlas/fixtures/osm-buildings.json`,
    "utf8",
  ),
);
const places = JSON.parse(
  readFileSync(
    `${process.cwd()}/src/data/open-flint-atlas/fixtures/read-model/places.json`,
    "utf8",
  ),
);

const flintWardMask = {
  type: "GeometryCollection",
  geometries: places.features
    .filter((feature) => feature.properties?.place_id?.startsWith("ward:"))
    .map((feature) => feature.geometry)
    .filter(
      (geometry) =>
        geometry?.type === "Polygon" || geometry?.type === "MultiPolygon",
    ),
};

const collection = createUrbanDesignModelCollection(source, {
  clipGeometry: flintWardMask,
});
const summary = summarizeUrbanDesignModel(source.features.length, collection);
const formTypes = new Set(
  collection.features.map((feature) => feature.properties.form_type),
);
const partRoles = new Set(
  collection.features.map((feature) => feature.properties.part_role),
);
const fabricArchetypes = new Set(
  collection.features.map((feature) => feature.properties.fabric_archetype),
);
const fabricDetailLevels = new Set(
  collection.features.map((feature) => feature.properties.fabric_detail_level),
);

assert.ok(
  collection.features.length > source.features.length * 3,
  "urban model should split in-boundary OSM footprints into multiple design parts",
);
assert.ok(
  formTypes.size >= 8,
  `expected at least 8 form types, got ${formTypes.size}`,
);

for (const formType of [
  "courtyard_compact",
  "courtyard_open",
  "industrial_shed",
  "mixed_use_street_wall",
  "row_infill",
  "single_lot",
  "slab",
  "tower_podium",
]) {
  assert.ok(formTypes.has(formType), `missing generated form type ${formType}`);
}

for (const partRole of [
  "cornice_band",
  "courtyard_ring",
  "courtyard_yard",
  "facade_rhythm",
  "front_porch",
  "party_wall",
  "podium",
  "porch_step",
  "roof_monitor",
  "roof_plane",
  "roof_ridge",
  "row_roof",
  "row_unit",
  "sawtooth_roof",
  "street_wall",
  "storefront_bay",
  "tower",
]) {
  assert.ok(partRoles.has(partRole), `missing generated part role ${partRole}`);
}

for (const archetype of [
  "present_residential_single",
  "present_residential_multi",
  "present_commercial",
  "present_industrial",
  "present_civic",
  "present_mixed_use",
]) {
  assert.ok(
    fabricArchetypes.has(archetype),
    `missing building fabric archetype ${archetype}`,
  );
  assert.ok(
    BUILDING_FABRIC_HEIGHT_PRIORS.archetypes[archetype],
    `height prior missing for ${archetype}`,
  );
}

for (const detailLevel of ["mass", "roof", "facade", "site"]) {
  assert.ok(
    fabricDetailLevels.has(detailLevel),
    `missing fabric detail level ${detailLevel}`,
  );
}

const courtyard = collection.features.find(
  (feature) => feature.properties.part_role === "courtyard_ring",
);
assert.ok(
  courtyard?.geometry.coordinates.length === 2,
  "compact courtyard blocks should include a courtyard void",
);

assert.ok(
  collection.features.filter(
    (feature) => feature.properties.part_role === "roof_ridge",
  ).length > 10_000,
  "residential fabric should expose thousands of roof ridges, not only mass boxes",
);

assert.ok(
  collection.features.filter(
    (feature) => feature.properties.fabric_detail_level !== "mass",
  ).length > source.features.length,
  "building fabric should add a citywide roof/facade detail layer",
);

assert.ok(
  collection.features.some(
    (feature) => feature.properties.fabric_feature_completeness < 0.5,
  ),
  "inferred rows should honestly expose low feature completeness",
);

assert.ok(
  !collection.features.some(
    (feature) => feature.properties.source_name === "For-mar Nature Preserve",
  ),
  "default urban model should be clipped to Flint wards, not outside-city context",
);

for (const feature of collection.features) {
  assert.ok(
    Number.isFinite(feature.properties.height_m) && feature.properties.height_m > 0,
    `feature ${feature.properties.model_id} has invalid height`,
  );
  assert.ok(
    feature.geometry.type === "Polygon",
    `feature ${feature.properties.model_id} should be a polygon`,
  );
  assert.equal(
    feature.properties.fabric_variation_seed,
    stableHash(feature.properties.source_osm_id),
    `variation seed must derive solely from osm_id for ${feature.properties.model_id}`,
  );
  assert.equal(
    feature.properties.fabric_model_version,
    BUILDING_FABRIC_HEIGHT_PRIORS.model_version,
    `fabric model version drift for ${feature.properties.model_id}`,
  );
  assert.ok(
    feature.properties.fabric_glb_uri.endsWith(
      `${feature.properties.fabric_params_hash}.glb`,
    ),
    `fabric glb uri is not content-keyed for ${feature.properties.model_id}`,
  );

  for (const ring of feature.geometry.coordinates) {
    assert.ok(ring.length >= 4, "polygon rings should have at least 4 points");
    assert.deepEqual(
      ring[0],
      ring[ring.length - 1],
      `polygon ring is not closed for ${feature.properties.model_id}`,
    );
    for (const coordinate of ring) {
      assert.ok(
        Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]),
        `invalid coordinate in ${feature.properties.model_id}`,
      );
    }
  }
}

const heightPriorYaml = readFileSync(
  `${process.cwd()}/packs/us/mi/flint/archetypes/present/height_priors.yaml`,
  "utf8",
);
assert.ok(
  heightPriorYaml.includes(BUILDING_FABRIC_HEIGHT_PRIORS.model_version),
  "city-pack YAML should carry the active fabric model version",
);

console.log(
  `validated urban design model: ${summary.generatedPartCount} parts from `
    + `${summary.sourceFeatureCount} OSM buildings across ${formTypes.size} forms`,
);
