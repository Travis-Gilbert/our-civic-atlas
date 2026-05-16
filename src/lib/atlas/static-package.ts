import discoveryManifest from "@/data/open-flint-atlas/fixtures/static-package/well-known/our-civic-atlas.json";
import atlasNode from "@/data/open-flint-atlas/fixtures/static-package/data/atlas-node.json";
import nodeCatalog from "@/data/open-flint-atlas/fixtures/static-package/data/node-catalog.json";
import layerCatalog from "@/data/open-flint-atlas/fixtures/static-package/data/layer-catalog.json";
import readModelCatalog from "@/data/open-flint-atlas/fixtures/static-package/data/read-model-catalog.json";
import civicObjects from "@/data/open-flint-atlas/fixtures/static-package/data/civic-objects.json";
import flintOverviewScene from "@/data/open-flint-atlas/fixtures/static-package/data/scene-manifests/flint-overview.json";
import flintStarterScenario from "@/data/open-flint-atlas/fixtures/static-package/data/scenario-manifests/flint-starter.json";
import primitiveLibrary from "@/data/open-flint-atlas/fixtures/static-package/data/primitive-library.json";
import geoComments from "@/data/open-flint-atlas/fixtures/static-package/data/geo-comments.json";
import layerRecipes from "@/data/open-flint-atlas/fixtures/static-package/data/layer-recipes.json";

import {
  validateStaticAtlasPackage,
  type AtlasNodeManifest,
  type CivicDesignPrimitive,
  type CivicObject,
  type GeoComment,
  type LayerCatalog,
  type LayerRecipe,
  type NodeCatalog,
  type ReadModelCatalog,
  type StaticAtlasPackage,
  type ScenarioManifest,
  type SceneManifest,
  type ValidationIssue,
  type WellKnownAtlasManifest,
} from "./contracts";
import { getRendererBoundaries } from "./renderer-registry";

type PrimitiveLibraryFixture = {
  primitives: CivicDesignPrimitive[];
};

type GeoCommentsFixture = {
  comments: GeoComment[];
};

type LayerRecipesFixture = {
  recipes: LayerRecipe[];
};

export function getSceneManifests(): SceneManifest[] {
  return [flintOverviewScene as SceneManifest];
}

export function getScenarioManifests(): ScenarioManifest[] {
  return [flintStarterScenario as ScenarioManifest];
}

export function getCivicDesignPrimitives(): CivicDesignPrimitive[] {
  return (primitiveLibrary as PrimitiveLibraryFixture).primitives;
}

export function getGeoComments(): GeoComment[] {
  return (geoComments as GeoCommentsFixture).comments;
}

export function getLayerRecipes(): LayerRecipe[] {
  return (layerRecipes as LayerRecipesFixture).recipes;
}

export function getStaticAtlasPackage(): StaticAtlasPackage {
  return {
    discoveryManifest: discoveryManifest as WellKnownAtlasManifest,
    atlasNode: atlasNode as AtlasNodeManifest,
    nodeCatalog: nodeCatalog as NodeCatalog,
    layerCatalog: layerCatalog as LayerCatalog,
    readModelCatalog: readModelCatalog as ReadModelCatalog,
    civicObjects: civicObjects as CivicObject[],
    sceneManifests: getSceneManifests(),
    scenarioManifests: getScenarioManifests(),
    civicDesignPrimitives: getCivicDesignPrimitives(),
    geoComments: getGeoComments(),
    layerRecipes: getLayerRecipes(),
    rendererBoundaries: getRendererBoundaries(),
  };
}

export function validateStaticAtlasPackageFixture(): ValidationIssue[] {
  return validateStaticAtlasPackage(getStaticAtlasPackage());
}
