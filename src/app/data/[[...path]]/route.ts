import { NextResponse } from "next/server";

import confidenceCards from "@/data/open-flint-atlas/fixtures/read-model/confidence-cards.json";
import placesGeoJson from "@/data/open-flint-atlas/fixtures/read-model/places.json";
import spatialEventIndex from "@/data/open-flint-atlas/fixtures/spatial-event-index/seed-events.json";
import sourceRegistry from "@/data/open-flint-atlas/source-registry.json";
import { getStaticAtlasPackage } from "@/lib/atlas/static-package";
import type {
  ReviewStatus,
  TimeShape,
} from "@/lib/api/openFlintAtlas";

type JsonRecord = Record<string, unknown>;

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

type RawSpatialEvent = JsonRecord & {
  event_id: string;
  event_type: string;
  title: string;
  summary: string;
  time: TimeShape;
  place: { place_id: string; name?: string; label?: string };
  source: { source_ids: string[] };
  confidence: string | { label?: string; reason?: string };
  review: { status: ReviewStatus; reviewed_at?: string | null };
  model_output_status: string | null;
  public_caveat?: string | null;
};

function json(data: unknown, mediaType = "application/json") {
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": `${mediaType}; charset=utf-8`,
    },
  });
}

function notFound() {
  return NextResponse.json(
    { error: "Atlas data artifact not found" },
    { status: 404 },
  );
}

function normalizeEvent(event: RawSpatialEvent) {
  const confidence =
    typeof event.confidence === "string"
      ? event.confidence
      : event.confidence.label ?? "unknown";
  const publicCaveat =
    typeof event.public_caveat === "string"
      ? event.public_caveat
      : typeof event.confidence === "object"
        ? event.confidence.reason ?? null
        : null;

  return {
    ...event,
    confidence,
    public_caveat: publicCaveat,
    place: {
      ...event.place,
      name: event.place.name ?? event.place.label,
    },
  };
}

export async function GET(_: Request, { params }: RouteContext) {
  const { path = [] } = await params;
  const staticPackage = getStaticAtlasPackage();
  const [segment, child, grandchild] = path;

  if (!segment) return notFound();

  if (segment === "atlas-node.json") return json(staticPackage.atlasNode);
  if (segment === "node-catalog.json") return json(staticPackage.nodeCatalog);
  if (segment === "layer-catalog.json") return json(staticPackage.layerCatalog);
  if (segment === "read-model-catalog.json") return json(staticPackage.readModelCatalog);
  if (segment === "source-registry.json") return json(sourceRegistry);
  if (segment === "civic-objects.json") return json(staticPackage.civicObjects);
  if (segment === "places.geojson") return json(placesGeoJson, "application/geo+json");
  if (segment === "events.json") {
    const events = (spatialEventIndex as { events: RawSpatialEvent[] }).events;
    return json(events.map(normalizeEvent));
  }
  if (segment === "confidence-cards.json") return json(confidenceCards);
  if (segment === "mobile-runtime-profile.json") {
    return json(staticPackage.mobileRuntimeProfile);
  }
  if (segment === "viewport-vector-contracts.json") {
    return json(staticPackage.viewportVectorContracts);
  }
  if (segment === "scene-packet-compiler.json") {
    return json(staticPackage.scenePacketCompiler);
  }
  if (segment === "scene-packets") {
    if (child === "index.json") return json(staticPackage.scenePacketIndex);
    if (child === "flint-overview-mobile.json") {
      return json(staticPackage.scenePackets[0]);
    }
  }
  if (segment === "scene-manifests") {
    if (child === "index.json") return json(staticPackage.sceneManifests);
    if (child === "flint-overview.json") return json(staticPackage.sceneManifests[0]);
  }
  if (segment === "scenario-manifests") {
    if (child === "index.json") return json(staticPackage.scenarioManifests);
    if (child === "flint-starter.json") return json(staticPackage.scenarioManifests[0]);
  }
  if (segment === "well-known" && child === "our-civic-atlas.json" && !grandchild) {
    return json(staticPackage.discoveryManifest);
  }

  return notFound();
}
