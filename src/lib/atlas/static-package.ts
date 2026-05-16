import discoveryManifest from "@/data/open-flint-atlas/fixtures/static-package/well-known/our-civic-atlas.json";
import atlasNode from "@/data/open-flint-atlas/fixtures/static-package/data/atlas-node.json";
import nodeCatalog from "@/data/open-flint-atlas/fixtures/static-package/data/node-catalog.json";
import layerCatalog from "@/data/open-flint-atlas/fixtures/static-package/data/layer-catalog.json";
import readModelCatalog from "@/data/open-flint-atlas/fixtures/static-package/data/read-model-catalog.json";
import civicObjects from "@/data/open-flint-atlas/fixtures/static-package/data/civic-objects.json";
import flintOverviewScene from "@/data/open-flint-atlas/fixtures/static-package/data/scene-manifests/flint-overview.json";
import flintStarterScenario from "@/data/open-flint-atlas/fixtures/static-package/data/scenario-manifests/flint-starter.json";
import mobileRuntimeProfile from "@/data/open-flint-atlas/fixtures/static-package/data/mobile-runtime-profile.json";
import viewportVectorContracts from "@/data/open-flint-atlas/fixtures/static-package/data/viewport-vector-contracts.json";
import scenePacketCompiler from "@/data/open-flint-atlas/fixtures/static-package/data/scene-packet-compiler.json";
import scenePacketIndex from "@/data/open-flint-atlas/fixtures/static-package/data/scene-packets/index.json";
import flintOverviewMobilePacket from "@/data/open-flint-atlas/fixtures/static-package/data/scene-packets/flint-overview-mobile.json";

import {
  validateStaticAtlasPackage,
  type AtlasNodeManifest,
  type CivicObject,
  type LayerCatalog,
  type MobileRuntimeProfile,
  type NodeCatalog,
  type ReadModelCatalog,
  type ScenePacket,
  type ScenePacketCompiler,
  type ScenePacketIndex,
  type SceneManifest,
  type ScenarioManifest,
  type StaticAtlasPackage,
  type ValidationIssue,
  type ViewportVectorContracts,
  type WellKnownAtlasManifest,
} from "./contracts";

export function getSceneManifests(): SceneManifest[] {
  return [flintOverviewScene as SceneManifest];
}

export function getScenarioManifests(): ScenarioManifest[] {
  return [flintStarterScenario as ScenarioManifest];
}

export function getViewportVectorContracts(): ViewportVectorContracts {
  return viewportVectorContracts as ViewportVectorContracts;
}

export function getScenePacketCompiler(): ScenePacketCompiler {
  return scenePacketCompiler as ScenePacketCompiler;
}

export function getScenePacketIndex(): ScenePacketIndex {
  return scenePacketIndex as ScenePacketIndex;
}

export function getScenePackets(): ScenePacket[] {
  return [flintOverviewMobilePacket as ScenePacket];
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
    viewportVectorContracts: getViewportVectorContracts(),
    scenePacketCompiler: getScenePacketCompiler(),
    scenePacketIndex: getScenePacketIndex(),
    scenePackets: getScenePackets(),
    mobileRuntimeProfile: mobileRuntimeProfile as MobileRuntimeProfile,
  };
}

export function validateStaticAtlasPackageFixture(): ValidationIssue[] {
  return validateStaticAtlasPackage(getStaticAtlasPackage());
}
