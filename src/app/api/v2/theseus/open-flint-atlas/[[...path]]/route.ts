import { NextResponse } from "next/server";

import manifest from "@/data/open-flint-atlas/fixtures/read-model/build-manifest.json";
import places from "@/data/open-flint-atlas/fixtures/read-model/places.json";
import sources from "@/data/open-flint-atlas/fixtures/read-model/sources.json";
import spatialEventIndex from "@/data/open-flint-atlas/fixtures/spatial-event-index/seed-events.json";
import provenanceGraph from "@/data/open-flint-atlas/fixtures/provenance/provenance-graph.json";
import sourceRegistry from "@/data/open-flint-atlas/source-registry.json";
import {
  getStaticAtlasPackage,
  validateStaticAtlasPackageFixture,
} from "@/lib/atlas/static-package";

type JsonRecord = Record<string, unknown>;

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

type PlaceFeature = {
  type: "Feature";
  geometry: GeoJSON.Geometry | null;
  properties: {
    place_id: string;
    name: string;
    place_type: string;
    ward_number: number | null;
    privacy_class: string;
    geometry_ref: string;
    source_ids: string[];
  };
};

type PlacesCollection = {
  type: "FeatureCollection";
  features: PlaceFeature[];
};

type RawSpatialEvent = JsonRecord & {
  event_id: string;
  event_type: string;
  title: string;
  summary: string;
  place: { place_id: string; name?: string; label?: string };
  source: { source_ids: string[] };
  confidence: string | { label?: string; reason?: string };
  review: { status: string };
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function notFound(message = "Open Flint Atlas endpoint not found") {
  return json({ error: message }, { status: 404 });
}

function getSearchParams(request: Request) {
  return new URL(request.url).searchParams;
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

function allEvents() {
  const raw = (spatialEventIndex as { events: RawSpatialEvent[] }).events;
  return raw.map(normalizeEvent);
}

function allPlaces() {
  return places as PlacesCollection;
}

function placeById(placeId: string) {
  return allPlaces().features.find((feature) => feature.properties.place_id === placeId);
}

function sourceIdsForPlace(place: PlaceFeature, events: ReturnType<typeof allEvents>) {
  const ids = new Set(place.properties.source_ids ?? []);
  for (const event of events) {
    if (event.place.place_id !== place.properties.place_id) continue;
    for (const sourceId of event.source.source_ids ?? []) ids.add(sourceId);
  }
  return ids;
}

function readLimit(params: URLSearchParams, fallback = 100) {
  const value = Number(params.get("limit") ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.trunc(value), 500));
}

function eventMatches(event: ReturnType<typeof normalizeEvent>, params: URLSearchParams) {
  const eventType = params.get("event_type");
  const placeId = params.get("place_id");
  const sourceId = params.get("source_id");
  const status = params.get("status");

  if (eventType && event.event_type !== eventType) return false;
  if (placeId && event.place.place_id !== placeId) return false;
  if (sourceId && !(event.source.source_ids ?? []).includes(sourceId)) return false;
  if (status && event.review.status !== status) return false;
  return true;
}

function provenancePayload(params: URLSearchParams) {
  const placeId = params.get("place_id");
  const sourceId = params.get("source_id");
  const nodeId = params.get("node_id");
  const limit = readLimit(params, 180);

  const graph = provenanceGraph as {
    nodes: { id: string; labels: string[]; properties: JsonRecord }[];
    edges: { source: string; target: string; type: string }[];
  };

  if (!placeId && !sourceId && !nodeId) {
    const nodes = graph.nodes.slice(0, limit);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = graph.edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .slice(0, limit * 2);
    return { nodes, edges, node_count: nodes.length, edge_count: edges.length };
  }

  const seedIds = new Set([placeId, sourceId, nodeId].filter(Boolean) as string[]);
  const relatedEdges = graph.edges.filter(
    (edge) => seedIds.has(edge.source) || seedIds.has(edge.target),
  );
  const relatedIds = new Set(seedIds);
  for (const edge of relatedEdges) {
    relatedIds.add(edge.source);
    relatedIds.add(edge.target);
  }

  const nodes = graph.nodes
    .filter((node) => relatedIds.has(node.id))
    .slice(0, limit);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = relatedEdges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .slice(0, limit * 2);

  if (nodes.length === 0) {
    const fallbackNodes = graph.nodes.slice(0, limit);
    const fallbackIds = new Set(fallbackNodes.map((node) => node.id));
    const fallbackEdges = graph.edges
      .filter((edge) => fallbackIds.has(edge.source) && fallbackIds.has(edge.target))
      .slice(0, limit * 2);
    return {
      nodes: fallbackNodes,
      edges: fallbackEdges,
      node_count: fallbackNodes.length,
      edge_count: fallbackEdges.length,
    };
  }

  return { nodes, edges, node_count: nodes.length, edge_count: edges.length };
}

function searchPayload(params: URLSearchParams) {
  const query = (params.get("q") ?? "").trim().toLowerCase();
  const limit = readLimit(params, 20);
  if (!query) return { results: [], total: 0, query: "" };

  const results = [
    ...allPlaces().features
      .filter((place) => place.properties.name.toLowerCase().includes(query))
      .map((place) => ({
        type: "place" as const,
        id: place.properties.place_id,
        label: place.properties.name,
      })),
    ...(sources as { source_id: string; name: string }[])
      .filter((source) => source.name.toLowerCase().includes(query))
      .map((source) => ({
        type: "source" as const,
        id: source.source_id,
        label: source.name,
      })),
    ...allEvents()
      .filter((event) => `${event.title} ${event.summary}`.toLowerCase().includes(query))
      .map((event) => ({
        type: "event" as const,
        id: event.event_id,
        label: event.title,
      })),
  ];

  return { results: results.slice(0, limit), total: results.length, query };
}

export async function GET(request: Request, { params }: RouteContext) {
  const { path = [] } = await params;
  const [segment, id] = path;
  const searchParams = getSearchParams(request);
  const staticPackage = getStaticAtlasPackage();

  if (!segment || segment === "manifest") return json(manifest);
  if (segment === "well-known" && id === "our-civic-atlas.json") {
    return json(staticPackage.discoveryManifest);
  }
  if (segment === "atlas-node") return json(staticPackage.atlasNode);
  if (segment === "node-catalog") return json(staticPackage.nodeCatalog);
  if (segment === "layer-catalog") return json(staticPackage.layerCatalog);
  if (segment === "read-model-catalog") return json(staticPackage.readModelCatalog);
  if (segment === "civic-objects") {
    return json({
      civic_objects: staticPackage.civicObjects,
      total: staticPackage.civicObjects.length,
    });
  }
  if (segment === "scene-manifests") {
    return json({
      scene_manifests: staticPackage.sceneManifests,
      total: staticPackage.sceneManifests.length,
    });
  }
  if (segment === "static-package") {
    const validationIssues = validateStaticAtlasPackageFixture();
    return json({
      ...staticPackage,
      validation: {
        ok: validationIssues.length === 0,
        issues: validationIssues,
      },
    });
  }
  if (segment === "sources") return json(sources);
  if (segment === "places" && !id) return json(places);

  if (segment === "places" && id) {
    const place = placeById(decodeURIComponent(id));
    if (!place) return notFound("Place not found");

    const events = allEvents().filter((event) => event.place.place_id === place.properties.place_id);
    const sourceIds = sourceIdsForPlace(place, events);
    const placeSources = (sources as { source_id: string }[]).filter((source) =>
      sourceIds.has(source.source_id),
    );

    return json({
      place,
      events,
      sources: placeSources,
      observations: [],
      event_count: events.length,
      source_count: placeSources.length,
      observation_count: 0,
    });
  }

  if (segment === "events") {
    const events = allEvents().filter((event) => eventMatches(event, searchParams));
    const limit = readLimit(searchParams, events.length || 100);
    return json({ events: events.slice(0, limit), total: events.length });
  }

  if (segment === "provenance") return json(provenancePayload(searchParams));
  if (segment === "search") return json(searchPayload(searchParams));

  if (segment === "capture" && id === "sources") {
    const captureSources = (sourceRegistry as { sources: JsonRecord[] }).sources.map((source) => ({
      id: source.id,
      name: source.name,
      seed_urls: [source.homepage_url].filter(Boolean),
      fetcher: source.source_type ?? "public_source",
      robots_policy: "respect_robots_txt",
      public_use_policy: source.public_use,
    }));
    return json(captureSources);
  }

  if (segment === "capture" || segment === "review") {
    return json(
      {
        error:
          "Capture and review writes are not enabled in the standalone public atlas yet.",
      },
      { status: 501 },
    );
  }

  return notFound();
}

export async function POST() {
  return json(
    {
      error:
        "Writes are intentionally disabled in this first standalone atlas slice.",
    },
    { status: 501 },
  );
}
