import places from "@/data/open-flint-atlas/fixtures/read-model/places.json";
import seedEvents from "@/data/open-flint-atlas/fixtures/spatial-event-index/seed-events.json";
import sources from "@/data/open-flint-atlas/fixtures/read-model/sources.json";
import sourceRegistry from "@/data/open-flint-atlas/source-registry.json";
import type {
  AtlasSource,
  PlaceFeature,
  PlacesCollection,
} from "@/lib/api/openFlintAtlas";
import type {
  CivicObject,
  NodeCatalogEntry,
  SceneManifest,
} from "@/lib/atlas/contracts";
import { getStaticAtlasPackage } from "@/lib/atlas/static-package";

export type SourceRegistryEntry = {
  id: string;
  name: string;
  homepage_url: string;
  source_type: string;
  steward: string;
  geography: string;
  current_status: string;
  update_cadence: string;
  trust_tier: string;
  public_use: string;
  contains_personal_data: boolean;
  ingestion_priority: number;
  initial_layers: string[];
  known_limits: string[];
  first_checks: string[];
};

export type AtlasEventFixture = {
  event_id: string;
  event_type: string;
  title: string;
  source: {
    source_ids: string[];
  };
  review: {
    status: string | null;
  };
};

export function getAtlasSources(): AtlasSource[] {
  return sources as AtlasSource[];
}

export function getSourceRegistryEntries(): SourceRegistryEntry[] {
  return (sourceRegistry as { sources: SourceRegistryEntry[] }).sources;
}

export function getAtlasPlaces(): PlaceFeature[] {
  return (places as PlacesCollection).features;
}

export function getAtlasEventFixtures(): AtlasEventFixture[] {
  return (seedEvents as { events: AtlasEventFixture[] }).events;
}

export function getNodeCatalogEntries(): NodeCatalogEntry[] {
  return getStaticAtlasPackage().nodeCatalog.nodes;
}

export function getCivicObjects(): CivicObject[] {
  return getStaticAtlasPackage().civicObjects;
}

export function getSceneManifests(): SceneManifest[] {
  return getStaticAtlasPackage().sceneManifests;
}

export function findAtlasNode(atlasId: string) {
  return getNodeCatalogEntries().find((node) => node.atlas_id === atlasId);
}

export function findPlace(placeId: string) {
  return getAtlasPlaces().find((place) => place.properties.place_id === placeId);
}

export function findCivicObject(objectId: string) {
  return getCivicObjects().find((object) => object.id === objectId);
}

export function findSceneManifest(sceneId: string) {
  return getSceneManifests().find((scene) => scene.scene_id === sceneId);
}
