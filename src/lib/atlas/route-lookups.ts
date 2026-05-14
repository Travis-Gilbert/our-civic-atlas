import places from "@/data/open-flint-atlas/fixtures/read-model/places.json";
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
} from "@/lib/atlas/contracts";
import { getStaticAtlasPackage } from "@/lib/atlas/static-package";

export type SourceRegistryEntry = {
  id: string;
  name: string;
  homepage_url: string;
  source_type: string;
  steward: string;
  current_status: string;
  update_cadence: string;
  trust_tier: string;
  public_use: string;
  contains_personal_data: boolean;
  known_limits: string[];
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

export function getNodeCatalogEntries(): NodeCatalogEntry[] {
  return getStaticAtlasPackage().nodeCatalog.nodes;
}

export function getCivicObjects(): CivicObject[] {
  return getStaticAtlasPackage().civicObjects;
}

export function getSceneManifests() {
  return getStaticAtlasPackage().sceneManifests as Array<{
    scene_id: string;
    atlas_node_id: string;
    name: string;
    description: string;
    bbox: number[];
    objects: Array<{
      object_id: string;
      render_mode: string;
      geometry_ref: string | null;
      style_token: string;
    }>;
    source_ids: string[];
    confidence: {
      score: number;
      reasons: string[];
    };
    dossier_links: string[];
    review_state: string;
    updated_at: string;
  }>;
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
