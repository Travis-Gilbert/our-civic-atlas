/**
 * Open Flint Atlas API client.
 *
 * Typed fetch wrappers for the civic atlas public read endpoints and
 * admin capture endpoints. All calls go through the Next.js rewrite
 * proxy at /api/v2/theseus/open-flint-atlas/.
 */

import type {
  AtlasNodeManifest,
  CivicObject,
  LayerCatalog,
  MobileRuntimeProfile,
  NodeCatalog,
  ReadModelFormat,
  ReadModelCatalog,
  ScenePacket,
  ScenePacketLayer,
  ScenePacketCompiler,
  ScenePacketIndex,
  ScenarioManifest,
  SceneManifest,
  StaticAtlasPackage,
  ViewportVectorContracts,
  WellKnownAtlasManifest,
} from "@/lib/atlas/contracts";
import type { DossierPayload } from "@/lib/atlas/dossier-payload";

const BASE = "/api/v2/theseus/open-flint-atlas";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/**
 * Canonical TimeShape from spatial-event-index.schema.json. The
 * discriminator is `shape` (matching the schema and fixture payload),
 * not `type`. An optional `certainty` string travels with every
 * variant (e.g. "monthly_aggregate", "source_year",
 * "atlas_probe_date"); consumers can render it as a small caveat
 * label, but it is not required for SQL ingestion.
 *
 * `period` carries a single human-readable bucket like "1980s",
 * "2024-01", or "2025". For Mosaic / DuckDB ingest we resolve it
 * to the start of the bucket; partial ISO ("2024-01") is parsed by
 * the standard Date constructor.
 *
 * `observed_at` is a single timestamp at variable granularity
 * ("2026-05-12", "1924"). It is treated as instant-like.
 */
export type TimeShape =
  | { shape: "instant"; date: string; certainty?: string }
  | { shape: "interval"; start: string; end: string | null; certainty?: string }
  | { shape: "first_seen_last_seen"; first_seen: string; last_seen: string | null; certainty?: string }
  | { shape: "period"; period: string; certainty?: string }
  | { shape: "observed_at"; observed_at: string; certainty?: string };

export type ReviewStatus =
  | "pending"
  | "candidate"
  | "accepted"
  | "rejected"
  | "needs_review";

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export type AtlasManifest = {
  project: string;
  schema_version: number;
  built_at: string;
  counts: Record<string, number>;
  outputs: Record<string, string>;
  privacy_notes: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export type AtlasSource = {
  source_id: string;
  name: string;
  homepage_url: string;
  trust_tier: string;
  public_use: string;
  source_update_label: string;
  last_checked: string;
  known_limits: string[];
  contains_personal_data: boolean;
};

// ---------------------------------------------------------------------------
// Places (GeoJSON)
// ---------------------------------------------------------------------------

export type PlaceProperties = {
  place_id: string;
  name: string;
  place_type: string;
  ward_number?: number | null;
  privacy_class: string;
  geometry_ref: string;
  source_ids: string[];
};

export type PlaceFeature = GeoJSON.Feature<
  GeoJSON.Geometry | null,
  PlaceProperties
>;
export type PlacesCollection = GeoJSON.FeatureCollection<
  GeoJSON.Geometry | null,
  PlaceProperties
>;

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type SpatialEvent = {
  event_id: string;
  event_type: string;
  title: string;
  summary: string;
  time: TimeShape;
  place: { place_id: string; name?: string };
  source: { source_ids: string[] };
  confidence: string;
  public_caveat: string | null;
  review: { status: ReviewStatus };
  model_output_status: string | null;
};

export type EventsResponse = {
  events: SpatialEvent[];
  total: number;
};

export type AtlasSignal = {
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
  metadata: Record<string, unknown>;
};

export type SignalTelemetry = {
  generated_from: string;
  total_signals: number;
  public_signals: number;
  candidate_signals: number;
  source_count: number;
  review_status_counts: Record<string, number>;
  signal_type_counts: Record<string, number>;
};

export type SignalsResponse = {
  signals: AtlasSignal[];
  total: number;
  telemetry: SignalTelemetry;
};

export type FreshSignal = AtlasSignal;

export type FreshSignalsResponse = SignalsResponse;

export type AtlasMetric = {
  metric_id: string;
  metric_key?: string;
  metric_label: string;
  place_id: string;
  category: string;
  value: number | string | null;
  unit?: string | null;
  source_id?: string;
  release_year?: number | null;
  estimate_year?: number | null;
  caveat?: string | null;
};

export type EventFilters = {
  event_type?: string;
  place_id?: string;
  source_id?: string;
  status?: string;
};

export type SignalFilters = {
  event_type?: string;
  signal_type?: string;
  place_id?: string;
  source_id?: string;
  review_status?: string;
  candidate_visibility?: "with_candidates" | "include_candidates" | "all";
  limit?: number;
};

export type FreshSignalFilters = SignalFilters & {
  bbox?: string;
  since?: string;
  until?: string;
};

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export type ProvenanceNode = {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
};

export type ProvenanceEdge = {
  source: string;
  target: string;
  type: string;
};

export type ProvenanceResponse = {
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
  node_count: number;
  edge_count: number;
};

export type ProvenanceFilters = {
  source_id?: string;
  place_id?: string;
  node_id?: string;
  limit?: number;
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type SearchResult = {
  type: "place" | "source" | "event";
  id: string;
  label: string;
};

export type SearchResponse = {
  results: SearchResult[];
  total: number;
  query: string;
};

// ---------------------------------------------------------------------------
// Federation/static package
// ---------------------------------------------------------------------------

export type CivicObjectsResponse = {
  civic_objects: CivicObject[];
  total: number;
};

export type SceneManifestsResponse = {
  scene_manifests: SceneManifest[];
  total: number;
};

export type ScenarioManifestsResponse = {
  scenario_manifests: ScenarioManifest[];
  total: number;
};

export type ViewportVectorContractsResponse = ViewportVectorContracts;

export type ScenePacketCompilerResponse = ScenePacketCompiler;

export type ScenePacketIndexResponse = ScenePacketIndex;

export type ScenePacketResponse = ScenePacket;

export type MobileRuntimeProfileResponse = MobileRuntimeProfile;

export type AtlasLngLatBounds = [[number, number], [number, number]];

export type MobileCandidateLayerSource = {
  layer_id: string;
  source_contract_id: string;
  url: string;
  format: ReadModelFormat;
  availability: "available" | "fallback";
  semantic_role: string;
};

export type MobileCandidateSceneRuntime = {
  runtimeProfile: MobileRuntimeProfile;
  scenePacketIndex: ScenePacketIndex;
  scenePacket: ScenePacket;
  places: PlacesCollection;
  events: SpatialEvent[];
  layerSources: MobileCandidateLayerSource[];
  viewportBounds: AtlasLngLatBounds | null;
};

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

export type SourceRegistryResponse = {
  sources: SourceRegistryEntry[];
};

export type StaticAtlasPackageResponse = StaticAtlasPackage & {
  validation: {
    ok: boolean;
    issues: { path: string; message: string }[];
  };
};

// ---------------------------------------------------------------------------
// Place dossier
// ---------------------------------------------------------------------------

export type PlaceDossier = {
  place: PlaceFeature;
  events: SpatialEvent[];
  sources: AtlasSource[];
  metrics: AtlasMetric[];
  payload: DossierPayload;
  event_count: number;
  source_count: number;
  metric_count: number;
  observation_count: number;
};

// ---------------------------------------------------------------------------
// Capture types (admin)
// ---------------------------------------------------------------------------

export type CaptureSource = {
  id: string;
  name: string;
  seed_urls: string[];
  fetcher: string;
  robots_policy: string;
  public_use_policy: string;
};

export type CrawlPlanPreview = {
  source_id: string;
  source_name: string;
  seed_urls: string[];
  page_budget: number;
  fetcher: string;
  robots_policy: string;
  public_use_policy: string;
  freshness_reason: string | null;
  status: "preview_only";
};

export type CrawlJobResponse = {
  job_id: string;
  source_id: string;
  page_budget: number;
  status: string;
  message: string;
};

export type RawArtifact = {
  artifact_id: string;
  source_id: string;
  seed_url: string;
  canonical_url: string;
  fetched_at: string;
  fetcher: string;
  content_type: string;
  byte_size: number;
  sha256: string;
  storage_ref: string;
  rights_note: string;
  robots_policy: string;
  privacy_class: string;
  candidate_status: string;
  blocked_public_uses: string[];
  review_metadata: {
    reviewed_at: string;
    reviewer_role: string;
    promotion_target: string;
  } | null;
};

export type ArtifactsResponse = {
  artifacts: RawArtifact[];
  total: number;
};

export type PromoteResponse = {
  artifact_id: string;
  promotion_target: string;
  status: string;
  message: string;
};

// ---------------------------------------------------------------------------
// API error shape
// ---------------------------------------------------------------------------

export type AtlasApiError = {
  ok: false;
  status: number;
  error: string;
};

type AtlasResult<T> = { ok: true; data: T } | AtlasApiError;

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string | number] => e[1] !== undefined,
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

function normalizeArtifactUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

async function getDirect<T>(url: string): Promise<AtlasResult<T>> {
  try {
    const res = await fetch(normalizeArtifactUrl(url));
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      return { ok: false, status: res.status, error: body.error ?? res.statusText };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

function parsePacketViewportBounds(viewportKey: string): AtlasLngLatBounds | null {
  const bboxPart = viewportKey
    .split("|")
    .find((part) => part.startsWith("bbox:"));
  if (!bboxPart) return null;

  const numbers = bboxPart
    .slice("bbox:".length)
    .split(",")
    .map((value) => Number(value.trim()));

  if (numbers.length !== 4 || numbers.some((value) => !Number.isFinite(value))) {
    return null;
  }

  const [minLng, minLat, maxLng, maxLat] = numbers;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function isJsonCompatibleFormat(format: ReadModelFormat) {
  return format === "json" || format === "geojson";
}

function resolveScenePacketLayerSource(
  layer: ScenePacketLayer,
  preferredFormats: ReadModelFormat[],
): MobileCandidateLayerSource {
  const preferredArtifact = preferredFormats
    .flatMap((format) =>
      layer.artifacts.filter(
        (artifact) =>
          artifact.format === format &&
          artifact.availability === "available" &&
          isJsonCompatibleFormat(artifact.format),
      ),
    )[0];
  const availableArtifact =
    preferredArtifact ??
    layer.artifacts.find(
      (artifact) =>
        artifact.availability === "available" &&
        isJsonCompatibleFormat(artifact.format),
    ) ??
    layer.artifacts.find((artifact) => artifact.availability === "fallback");

  if (availableArtifact) {
    return {
      layer_id: layer.layer_id,
      source_contract_id: layer.source_contract_id,
      url: normalizeArtifactUrl(availableArtifact.url),
      format: availableArtifact.format,
      availability:
        availableArtifact.availability === "available" ? "available" : "fallback",
      semantic_role: availableArtifact.semantic_role,
    };
  }

  return {
    layer_id: layer.layer_id,
    source_contract_id: layer.source_contract_id,
    url: normalizeArtifactUrl(layer.fallback_url),
    format: layer.fallback_url.endsWith(".geojson") ? "geojson" : "json",
    availability: "fallback",
    semantic_role: "fallback_features",
  };
}

async function get<T>(path: string): Promise<AtlasResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      return { ok: false, status: res.status, error: body.error ?? res.statusText };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

async function post<T>(path: string, body: unknown): Promise<AtlasResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      return { ok: false, status: res.status, error: data.error ?? res.statusText };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Public read endpoints
// ---------------------------------------------------------------------------

export function fetchManifest() {
  return get<AtlasManifest>("/manifest/");
}

export function fetchSources() {
  return get<AtlasSource[]>("/sources/");
}

export function fetchWellKnownAtlasManifest() {
  return get<WellKnownAtlasManifest>("/well-known/our-civic-atlas.json/");
}

export function fetchAtlasNode() {
  return get<AtlasNodeManifest>("/atlas-node/");
}

export function fetchNodeCatalog() {
  return get<NodeCatalog>("/node-catalog/");
}

export function fetchLayerCatalog() {
  return get<LayerCatalog>("/layer-catalog/");
}

export function fetchReadModelCatalog() {
  return get<ReadModelCatalog>("/read-model-catalog/");
}

export function fetchSourceRegistry() {
  return get<SourceRegistryResponse>("/source-registry/");
}

export function fetchCivicObjects() {
  return get<CivicObjectsResponse>("/civic-objects/");
}

export function fetchSceneManifests() {
  return get<SceneManifestsResponse>("/scene-manifests/");
}

export function fetchScenarioManifests() {
  return get<ScenarioManifestsResponse>("/scenario-manifests/");
}

export function fetchViewportVectorContracts() {
  return get<ViewportVectorContractsResponse>("/viewport-vector-contracts/");
}

export function fetchScenePacketCompiler() {
  return get<ScenePacketCompilerResponse>("/scene-packet-compiler/");
}

export function fetchScenePackets() {
  return get<ScenePacketIndexResponse>("/scene-packets/");
}

export function fetchScenePacket(packetId: string) {
  return get<ScenePacketResponse>(`/scene-packets/${encodeURIComponent(packetId)}/`);
}

export function fetchMobileRuntimeProfile() {
  return get<MobileRuntimeProfileResponse>("/mobile-runtime-profile/");
}

export async function fetchMobileCandidateSceneRuntime() {
  const runtimeProfile = await fetchMobileRuntimeProfile();
  if (!runtimeProfile.ok) return runtimeProfile as AtlasResult<MobileCandidateSceneRuntime>;

  const packetIndex = await getDirect<ScenePacketIndex>(
    runtimeProfile.data.scene_packet_index_url,
  );
  if (!packetIndex.ok) return packetIndex as AtlasResult<MobileCandidateSceneRuntime>;

  const packetEntry =
    packetIndex.data.packets.find(
      (packet) => packet.scene_id === "scene:flint-overview",
    ) ?? packetIndex.data.packets[0];

  if (!packetEntry) {
    return {
      ok: false,
      status: 0,
      error: "No scene packet entries were published for the mobile candidate.",
    };
  }

  const scenePacket = await getDirect<ScenePacket>(packetEntry.packet_url);
  if (!scenePacket.ok) return scenePacket as AtlasResult<MobileCandidateSceneRuntime>;

  const preferredFormats =
    runtimeProfile.data.binary_read_model_defaults.preferred_formats;
  const placesLayer = scenePacket.data.layer_packets.find(
    (layer) => layer.layer_id === "places",
  );
  const eventsLayer =
    scenePacket.data.layer_packets.find(
      (layer) => layer.layer_id === "street-safety",
    ) ??
    scenePacket.data.layer_packets.find((layer) => layer.layer_id === "events");

  if (!placesLayer || !eventsLayer) {
    return {
      ok: false,
      status: 0,
      error:
        "The mobile candidate scene packet is missing the places or events layer fallback.",
    };
  }

  const placeSource = resolveScenePacketLayerSource(placesLayer, preferredFormats);
  const eventSource = resolveScenePacketLayerSource(eventsLayer, preferredFormats);
  const [places, events] = await Promise.all([
    getDirect<PlacesCollection>(placeSource.url),
    getDirect<SpatialEvent[]>(eventSource.url),
  ]);

  if (!places.ok) return places as AtlasResult<MobileCandidateSceneRuntime>;
  if (!events.ok) return events as AtlasResult<MobileCandidateSceneRuntime>;

  return {
    ok: true,
    data: {
      runtimeProfile: runtimeProfile.data,
      scenePacketIndex: packetIndex.data,
      scenePacket: scenePacket.data,
      places: places.data,
      events: events.data,
      layerSources: [placeSource, eventSource],
      viewportBounds: parsePacketViewportBounds(scenePacket.data.viewport_key),
    },
  };
}

export function fetchStaticAtlasPackage() {
  return get<StaticAtlasPackageResponse>("/static-package/");
}

export function fetchPlaces() {
  return get<PlacesCollection>("/places/");
}

export function fetchPlaceDossier(placeId: string) {
  return get<PlaceDossier>(`/places/${encodeURIComponent(placeId)}/`);
}

export function fetchDossierPayload(placeId: string) {
  return get<DossierPayload>(`/dossiers/${encodeURIComponent(placeId)}/`);
}

export function fetchEvents(filters?: EventFilters) {
  return get<EventsResponse>(`/events/${qs(filters ?? {})}`);
}

export function fetchSignals(filters?: SignalFilters) {
  return get<SignalsResponse>(`/signals/${qs(filters ?? {})}`);
}

export function fetchSignal(signalId: string) {
  return get<AtlasSignal>(`/signals/${encodeURIComponent(signalId)}/`);
}

export function fetchSignalTelemetry() {
  return get<SignalTelemetry>("/signals/telemetry/");
}

export function fetchProvenance(filters?: ProvenanceFilters) {
  return get<ProvenanceResponse>(`/provenance/${qs(filters ?? {})}`);
}

export function searchAtlas(q: string, limit = 20) {
  return get<SearchResponse>(`/search/${qs({ q, limit })}`);
}

// ---------------------------------------------------------------------------
// Admin capture endpoints
// ---------------------------------------------------------------------------

export function fetchCaptureSources() {
  return get<CaptureSource[]>("/capture/sources/");
}

export function previewCrawlPlan(sourceId: string, pageBudget = 50, freshnessReason?: string) {
  return post<CrawlPlanPreview>("/capture/plan/", {
    source_id: sourceId,
    page_budget: pageBudget,
    freshness_reason: freshnessReason,
  });
}

export function enqueueCrawlJob(
  sourceId: string,
  pageBudget: number,
  freshnessReason: string,
  rightsNote: string,
) {
  return post<CrawlJobResponse>("/capture/jobs/", {
    source_id: sourceId,
    page_budget: pageBudget,
    freshness_reason: freshnessReason,
    rights_note: rightsNote,
  });
}

export function fetchCrawlJobStatus(jobId: string) {
  return get<CrawlJobResponse>(`/capture/jobs/${encodeURIComponent(jobId)}/`);
}

export function fetchArtifacts(filters?: { source_id?: string; candidate_status?: string; limit?: number }) {
  return get<ArtifactsResponse>(`/capture/artifacts/${qs(filters ?? {})}`);
}

export function promoteArtifact(artifactId: string, promotionTarget: string, reviewerRole = "atlas_editor") {
  return post<PromoteResponse>("/review/promote/", {
    artifact_id: artifactId,
    promotion_target: promotionTarget,
    reviewer_role: reviewerRole,
  });
}
