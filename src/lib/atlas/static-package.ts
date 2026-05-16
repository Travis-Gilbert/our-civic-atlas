import discoveryManifest from "@/data/open-flint-atlas/fixtures/static-package/well-known/our-civic-atlas.json";
import atlasNode from "@/data/open-flint-atlas/fixtures/static-package/data/atlas-node.json";
import nodeCatalog from "@/data/open-flint-atlas/fixtures/static-package/data/node-catalog.json";
import layerCatalog from "@/data/open-flint-atlas/fixtures/static-package/data/layer-catalog.json";
import readModelCatalog from "@/data/open-flint-atlas/fixtures/static-package/data/read-model-catalog.json";
import civicObjects from "@/data/open-flint-atlas/fixtures/static-package/data/civic-objects.json";
import flintOverviewScene from "@/data/open-flint-atlas/fixtures/static-package/data/scene-manifests/flint-overview.json";

import {
  validateStaticAtlasPackage,
  type AtlasNodeManifest,
  type CivicObject,
  type LayerCatalog,
  type NodeCatalog,
  type ReadModelCatalog,
  type SceneManifest,
  type StaticAtlasPackage,
  type ValidationIssue,
  type WellKnownAtlasManifest,
} from "./contracts";

export function getStaticAtlasPackage(): StaticAtlasPackage {
  return {
    discoveryManifest: discoveryManifest as WellKnownAtlasManifest,
    atlasNode: atlasNode as AtlasNodeManifest,
    nodeCatalog: nodeCatalog as NodeCatalog,
    layerCatalog: layerCatalog as LayerCatalog,
    readModelCatalog: readModelCatalog as ReadModelCatalog,
    civicObjects: civicObjects as CivicObject[],
    sceneManifests: [flintOverviewScene as unknown as SceneManifest],
  };
}

export function validateStaticAtlasPackageFixture(): ValidationIssue[] {
  return validateStaticAtlasPackage(getStaticAtlasPackage());
}
