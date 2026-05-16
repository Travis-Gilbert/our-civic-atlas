import { NextResponse } from "next/server";

import manifest from "@/data/open-flint-atlas/fixtures/read-model/build-manifest.json";
import metrics from "@/data/open-flint-atlas/fixtures/read-model/metrics.json";
import places from "@/data/open-flint-atlas/fixtures/read-model/places.json";
import sources from "@/data/open-flint-atlas/fixtures/read-model/sources.json";
import spatialEventIndex from "@/data/open-flint-atlas/fixtures/spatial-event-index/seed-events.json";
import provenanceGraph from "@/data/open-flint-atlas/fixtures/provenance/provenance-graph.json";
import sourceRegistry from "@/data/open-flint-atlas/source-registry.json";
import {
  buildPlaceDossierPayload,
  type RawAtlasMetric,
} from "@/lib/atlas/dossier-payload";
import type {
  AtlasSource,
  ReviewStatus,
  SpatialEvent,
  TimeShape,
} from "@/lib/api/openFlintAtlas";
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
    ward_number?: number | null;
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
  time: TimeShape;
  place: { place_id: string; name?: string; label?: string; geometry_status?: string };
  source: { source_ids: string[]; rights_note?: string };
  confidence: string | { label?: string; reason?: string };
  review: { status: ReviewStatus; reviewed_at?: string | null };
  model_output_status: string | null;
};

type AtlasSignal = {
  signal_id: string;
  signal_kind: "public_record" | "candidate";
  artifact_id: string | null;
  source_id: string | null;
  source_label: string;
  title: string;
  summary: string;
  published_at: string | null;
  received_at: string | null;
  event_type: string;
  signal_type: string;
  review_status: ReviewStatus;
  status: ReviewStatus;
  resolution_level: string;
  visibility_level: "public" | "review_only";
  confidence_label: string;
  why_mapped_here: string;
  place_id: string;
  place_label: string;
  geometry: GeoJSON.Geometry | null;
  source_ids: string[];
  dossier_url: string | null;
  expires_at: string | null;
  warning_copy: string | null;
  metadata: JsonRecord;
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

function normalizeEvent(event: RawSpatialEvent): SpatialEvent {
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

function allRawEvents() {
  return (spatialEventIndex as { events: RawSpatialEvent[] }).events;
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

function metricPlaceIds(place: PlaceFeature) {
  const ids = new Set([place.properties.place_id]);
  const wardNumber = place.properties.ward_number;
  if (wardNumber != null) ids.add(`ward:${wardNumber}`);

  const sampleWard = place.properties.place_id.match(/^ward_0?(\d+)_sample$/);
  if (sampleWard) ids.add(`ward:${Number(sampleWard[1])}`);

  return ids;
}

function metricsForPlace(place: PlaceFeature) {
  const ids = metricPlaceIds(place);
  return (metrics as RawAtlasMetric[]).filter((metric) =>
    metric.place_id ? ids.has(metric.place_id) : false,
  );
}

function sourceLabel(sourceId: string | null) {
  if (!sourceId) return "";
  const source = (sources as AtlasSource[]).find((item) => item.source_id === sourceId);
  return source?.name ?? sourceId;
}

function timeLabel(time: TimeShape) {
  if ("date" in time) return time.date;
  if ("start" in time) return time.end ? `${time.start}/${time.end}` : time.start;
  if ("first_seen" in time) {
    return time.last_seen ? `${time.first_seen}/${time.last_seen}` : time.first_seen;
  }
  if ("period" in time) return time.period;
  if ("observed_at" in time) return time.observed_at;
  return null;
}

function nearbyPlacesFor(place: PlaceFeature) {
  const placeType = place.properties.place_type;
  return allPlaces().features.filter((feature) => {
    if (feature.properties.place_id === place.properties.place_id) return false;
    return (
      feature.properties.place_type === placeType ||
      feature.properties.privacy_class === place.properties.privacy_class
    );
  });
}

function placeDossierPayload(place: PlaceFeature) {
  const events = allEvents().filter((event) => event.place.place_id === place.properties.place_id);
  const placeMetrics = metricsForPlace(place);
  const sourceIds = sourceIdsForPlace(place, events);
  for (const metric of placeMetrics) {
    if (metric.source_id) sourceIds.add(metric.source_id);
  }
  const placeSources = (sources as AtlasSource[]).filter((source) =>
    sourceIds.has(source.source_id),
  );
  const payload = buildPlaceDossierPayload({
    place,
    events,
    sources: placeSources,
    metrics: placeMetrics,
    nearbyPlaces: nearbyPlacesFor(place),
  });

  return {
    place,
    events,
    sources: placeSources,
    metrics: placeMetrics,
    payload,
    observations: [],
    event_count: events.length,
    source_count: placeSources.length,
    metric_count: placeMetrics.length,
    observation_count: 0,
  };
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

function signalFromEvent(event: RawSpatialEvent): AtlasSignal {
  const normalized = normalizeEvent(event);
  const sourceIds = event.source.source_ids ?? [];
  const sourceId = sourceIds[0] ?? null;
  const reviewStatus = event.review.status;
  const isPublic = reviewStatus === "accepted";

  return {
    signal_id: event.event_id,
    signal_kind: isPublic ? "public_record" : "candidate",
    artifact_id: null,
    source_id: sourceId,
    source_label: sourceLabel(sourceId),
    title: event.title,
    summary: event.summary,
    published_at: timeLabel(event.time),
    received_at: event.review.reviewed_at ?? null,
    event_type: event.event_type,
    signal_type: event.event_type,
    review_status: reviewStatus,
    status: reviewStatus,
    resolution_level: event.place.geometry_status === "unresolved" ? "unresolved" : "place_resolved",
    visibility_level: isPublic ? "public" : "review_only",
    confidence_label: normalized.confidence,
    why_mapped_here: normalized.public_caveat ?? "",
    place_id: event.place.place_id,
    place_label: event.place.name ?? event.place.label ?? event.place.place_id,
    geometry: null,
    source_ids: sourceIds,
    dossier_url: `/open-flint-atlas/place/${encodeURIComponent(event.place.place_id)}`,
    expires_at: null,
    warning_copy: normalized.public_caveat ?? null,
    metadata: {
      model_output_status: event.model_output_status,
      rights_note: event.source.rights_note,
      time: event.time as unknown as JsonRecord,
    },
  };
}

function allSignals() {
  return allRawEvents().map(signalFromEvent);
}

function signalsPayload(params: URLSearchParams) {
  const sourceId = params.get("source_id");
  const placeId = params.get("place_id");
  const signalType = params.get("signal_type") ?? params.get("event_type");
  const reviewStatus = params.get("review_status") ?? params.get("status");
  const candidateVisibility = params.get("candidate_visibility");
  const includeCandidates =
    candidateVisibility === "with_candidates" ||
    candidateVisibility === "include_candidates" ||
    candidateVisibility === "all";
  const limit = readLimit(params, 100);

  const signals = allSignals().filter((signal) => {
    if (!includeCandidates && signal.visibility_level !== "public") return false;
    if (sourceId && !signal.source_ids.includes(sourceId)) return false;
    if (placeId && signal.place_id !== placeId) return false;
    if (signalType && signal.signal_type !== signalType) return false;
    if (reviewStatus && signal.review_status !== reviewStatus) return false;
    return true;
  });

  return {
    signals: signals.slice(0, limit),
    total: signals.length,
    telemetry: signalTelemetry(allSignals()),
  };
}

function signalTelemetry(signals: AtlasSignal[]) {
  const reviewStatusCounts: Record<string, number> = {};
  const signalTypeCounts: Record<string, number> = {};
  const sourceIds = new Set<string>();

  for (const signal of signals) {
    reviewStatusCounts[signal.review_status] = (reviewStatusCounts[signal.review_status] ?? 0) + 1;
    signalTypeCounts[signal.signal_type] = (signalTypeCounts[signal.signal_type] ?? 0) + 1;
    for (const sourceId of signal.source_ids) sourceIds.add(sourceId);
  }

  return {
    generated_from: "spatial-event-index-fixture",
    total_signals: signals.length,
    public_signals: signals.filter((signal) => signal.visibility_level === "public").length,
    candidate_signals: signals.filter((signal) => signal.visibility_level !== "public").length,
    source_count: sourceIds.size,
    review_status_counts: reviewStatusCounts,
    signal_type_counts: signalTypeCounts,
  };
}

function signalStream(signals: AtlasSignal[]) {
  const chunks = signals.map((signal) => {
    return `event: signal.created\ndata: ${JSON.stringify(signal)}\n\n`;
  });
  chunks.push("event: heartbeat\ndata: {}\n\n");
  chunks.push("event: done\ndata: {}\n\n");
  return new Response(chunks.join(""), {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
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

    return json(placeDossierPayload(place));
  }

  if (segment === "dossiers" && id) {
    const place = placeById(decodeURIComponent(id));
    if (!place) return notFound("Dossier subject not found");
    return json(placeDossierPayload(place).payload);
  }

  if (segment === "events") {
    const events = allEvents().filter((event) => eventMatches(event, searchParams));
    const limit = readLimit(searchParams, events.length || 100);
    return json({ events: events.slice(0, limit), total: events.length });
  }

  if (segment === "signals" && (!id || id === "telemetry" || id === "stream")) {
    if (id === "telemetry") return json(signalTelemetry(allSignals()));
    const payload = signalsPayload(searchParams);
    if (id === "stream") return signalStream(payload.signals);
    return json(payload);
  }

  if (segment === "signals" && id) {
    const signal = allSignals().find((item) => item.signal_id === decodeURIComponent(id));
    if (!signal) return notFound("Signal not found");
    return json(signal);
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
