import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const modelUrl = pathToFileURL(
  `${process.cwd()}/src/lib/atlas/urban-design-model.ts`,
).href;

const {
  createUrbanDesignModelCollection,
  summarizeUrbanDesignModel,
} = await import(modelUrl);

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

assert.ok(
  collection.features.length > source.features.length * 1.5,
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
  "courtyard_ring",
  "podium",
  "roof_monitor",
  "row_unit",
  "street_wall",
  "tower",
]) {
  assert.ok(partRoles.has(partRole), `missing generated part role ${partRole}`);
}

const courtyard = collection.features.find(
  (feature) => feature.properties.part_role === "courtyard_ring",
);
assert.ok(
  courtyard?.geometry.coordinates.length === 2,
  "compact courtyard blocks should include a courtyard void",
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

console.log(
  `validated urban design model: ${summary.generatedPartCount} parts from `
    + `${summary.sourceFeatureCount} OSM buildings across ${formTypes.size} forms`,
);
