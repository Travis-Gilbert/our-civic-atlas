import type {
  AtlasSource,
  PlaceFeature,
  SpatialEvent,
  TimeShape,
} from "@/lib/api/openFlintAtlas";

export const DOSSIER_TAB_IDS = [
  "overview",
  "sources",
  "history",
  "nearby",
  "interventions",
  "safety",
  "metrics",
  "evidence",
  "contribute",
] as const;

export type DossierTabId = (typeof DOSSIER_TAB_IDS)[number];

export type DossierSubjectType =
  | "atlas_node"
  | "place"
  | "parcel"
  | "building_presence"
  | "street"
  | "road_segment"
  | "corridor"
  | "historical_event"
  | "news_article"
  | "source"
  | "dataset"
  | "observation"
  | "intervention"
  | "metric";

export type DossierSubject = {
  id: string;
  type: DossierSubjectType;
  name: string;
  subtitle: string;
  atlas_node_id: string;
  geometry_ref: string | null;
  privacy_class: string;
  source_ids: string[];
};

export type DossierConfidence = {
  label: string;
  score: number | null;
  reasons: string[];
  review_state: string;
  source_count: number;
  last_checked_at: string | null;
};

export type DossierSourceCard = {
  id: string;
  name: string;
  trust_tier: string;
  public_use: string;
  freshness_label: string;
  last_checked_at: string;
  known_limits: string[];
  url: string;
};

export type DossierTimelineItem = {
  id: string;
  tab: DossierTabId;
  title: string;
  summary: string;
  time_label: string;
  confidence_label: string;
  review_state: string;
  caveat: string | null;
  source_ids: string[];
};

export type DossierMetric = {
  id: string;
  label: string;
  value_label: string;
  category: string;
  source_id: string | null;
  release_year: number | null;
  caveat: string | null;
};

export type DossierRelatedObject = {
  id: string;
  type: DossierSubjectType;
  name: string;
  relation_label: string;
  confidence_label: string | null;
};

export type DossierEvidenceGraphRef = {
  node_id: string;
  api_url: string;
  panel_label: string;
};

export type DossierSceneManifestRef = {
  id: string;
  label: string;
  url: string;
  status: "available" | "planned";
};

export type DossierContributionAction = {
  id: string;
  label: string;
  kind: "correction" | "source_link" | "observation" | "document";
  status: "available" | "planned" | "disabled";
  reason: string | null;
};

export type DossierPrivacyFlag = {
  id: string;
  label: string;
  severity: "info" | "caution";
};

export type DossierTabSummary = {
  id: DossierTabId;
  label: string;
  count: number | null;
  status: "available" | "empty" | "planned";
};

export type DossierPayload = {
  schema_version: "0.1";
  subject: DossierSubject;
  summary: {
    description: string;
    status_label: string;
    civic_context_tags: string[];
    caveat: string | null;
  };
  confidence: DossierConfidence;
  tabs: DossierTabSummary[];
  source_cards: DossierSourceCard[];
  timeline: DossierTimelineItem[];
  metrics: DossierMetric[];
  nearby_objects: DossierRelatedObject[];
  related_interventions: DossierTimelineItem[];
  related_safety_records: DossierTimelineItem[];
  related_historical_events: DossierTimelineItem[];
  evidence_graph_ref: DossierEvidenceGraphRef;
  scene_manifest_refs: DossierSceneManifestRef[];
  contribution_actions: DossierContributionAction[];
  privacy_flags: DossierPrivacyFlag[];
  download_citation: {
    label: string;
    url: string;
    format: "json";
  };
};

export type RawAtlasMetric = {
  metric_id?: string;
  metric_label?: string;
  metric_key?: string;
  place_id?: string;
  value?: number | string | null;
  unit?: string | null;
  category?: string;
  source_id?: string;
  release_year?: number | null;
  estimate_year?: number | null;
  caveat?: string | null;
};

export type BuildPlaceDossierPayloadInput = {
  place: PlaceFeature;
  events: SpatialEvent[];
  sources: AtlasSource[];
  metrics: RawAtlasMetric[];
  nearbyPlaces: PlaceFeature[];
};

const TAB_LABELS: Record<DossierTabId, string> = {
  overview: "Overview",
  sources: "Sources",
  history: "History",
  nearby: "Nearby",
  interventions: "Interventions",
  safety: "Safety",
  metrics: "Metrics",
  evidence: "Support",
  contribute: "Contribute",
};

const EVENT_TAB_BY_TYPE: Record<string, DossierTabId> = {
  building_presence: "history",
  event: "history",
  source_update: "history",
  intervention: "interventions",
  crash_aggregate: "safety",
  metric: "metrics",
  observation: "contribute",
};

export function formatDossierTime(time: TimeShape): string {
  switch (time.shape) {
    case "instant":
      return time.date;
    case "interval":
      return time.end === null ? `${time.start} to present` : `${time.start} to ${time.end}`;
    case "first_seen_last_seen":
      return time.last_seen === null
        ? `${time.first_seen} to present`
        : `${time.first_seen} to ${time.last_seen}`;
    case "period":
      return time.period;
    case "observed_at":
      return time.observed_at;
  }
}

function subjectTypeForPlace(placeType: string): DossierSubjectType {
  if (placeType === "parcel") return "parcel";
  if (placeType === "corridor") return "corridor";
  if (placeType === "road_segment") return "road_segment";
  if (placeType === "street") return "street";
  return "place";
}

function readableLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function confidenceScore(label: string): number | null {
  const normalized = label.toLowerCase();
  if (normalized === "high") return 0.85;
  if (normalized === "medium") return 0.6;
  if (normalized === "low") return 0.32;
  return null;
}

function metricValueLabel(metric: RawAtlasMetric): string {
  if (metric.value == null || metric.value === "") return "pending";
  const suffix = metric.unit ? ` ${metric.unit}` : "";
  return `${metric.value}${suffix}`;
}

function sourceLastChecked(sources: AtlasSource[]): string | null {
  const dates = sources
    .map((source) => source.last_checked)
    .filter(Boolean)
    .sort();
  return dates.at(-1) ?? null;
}

function sourceCards(sources: AtlasSource[]): DossierSourceCard[] {
  return sources.map((source) => ({
    id: source.source_id,
    name: source.name,
    trust_tier: source.trust_tier,
    public_use: source.public_use,
    freshness_label: source.source_update_label,
    last_checked_at: source.last_checked,
    known_limits: source.known_limits,
    url: source.homepage_url,
  }));
}

function timelineItems(
  events: SpatialEvent[],
  resolvedSourceIds: Set<string>,
): DossierTimelineItem[] {
  return events.map((event) => {
    const tab = EVENT_TAB_BY_TYPE[event.event_type] ?? "history";
    return {
      id: event.event_id,
      tab,
      title: event.title,
      summary: event.summary,
      time_label: formatDossierTime(event.time),
      confidence_label: event.confidence,
      review_state: event.review.status,
      caveat: event.public_caveat,
      source_ids: event.source.source_ids.filter((sourceId) =>
        resolvedSourceIds.has(sourceId),
      ),
    };
  });
}

function metricCards(
  metrics: RawAtlasMetric[],
  resolvedSourceIds: Set<string>,
): DossierMetric[] {
  return metrics.slice(0, 18).map((metric, index) => ({
    id: metric.metric_id ?? `metric-${index}`,
    label: metric.metric_label ?? metric.metric_key ?? "Metric",
    value_label: metricValueLabel(metric),
    category: metric.category ?? "civic context",
    source_id:
      metric.source_id && resolvedSourceIds.has(metric.source_id)
        ? metric.source_id
        : null,
    release_year: metric.release_year ?? metric.estimate_year ?? null,
    caveat: metric.caveat ?? null,
  }));
}

function nearbyObjects(
  subject: PlaceFeature,
  nearbyPlaces: PlaceFeature[],
): DossierRelatedObject[] {
  const subjectId = subject.properties.place_id;
  const subjectType = subject.properties.place_type;
  return nearbyPlaces
    .filter((place) => place.properties.place_id !== subjectId)
    .slice(0, 6)
    .map((place) => ({
      id: place.properties.place_id,
      type: subjectTypeForPlace(place.properties.place_type),
      name: place.properties.name,
      relation_label:
        place.properties.place_type === subjectType
          ? `Same ${readableLabel(subjectType)} layer`
          : readableLabel(place.properties.place_type),
      confidence_label: null,
    }));
}

function tabStatus(count: number, plannedWhenEmpty = false): "available" | "empty" | "planned" {
  if (count > 0) return "available";
  return plannedWhenEmpty ? "planned" : "empty";
}

export function buildPlaceDossierPayload({
  place,
  events,
  sources,
  metrics,
  nearbyPlaces,
}: BuildPlaceDossierPayloadInput): DossierPayload {
  const props = place.properties;
  const sourceCount = sources.length;
  const eventCount = events.length;
  const resolvedSourceIds = new Set(sources.map((source) => source.source_id));
  const timeline = timelineItems(events, resolvedSourceIds);
  const metricList = metricCards(metrics, resolvedSourceIds);
  const interventionItems = timeline.filter((item) => item.tab === "interventions");
  const safetyItems = timeline.filter((item) => item.tab === "safety");
  const historicalItems = timeline.filter((item) => item.tab === "history");
  const nearby = nearbyObjects(place, nearbyPlaces);
  const confidenceLabel =
    timeline.find((item) => item.confidence_label !== "unknown")?.confidence_label ??
    (sourceCount > 0 ? "medium" : "unknown");

  const summaryTags = [
    readableLabel(props.place_type),
    props.ward_number != null ? `Ward ${props.ward_number}` : null,
    props.privacy_class,
  ].filter((tag): tag is string => Boolean(tag));

  return {
    schema_version: "0.1",
    subject: {
      id: props.place_id,
      type: subjectTypeForPlace(props.place_type),
      name: props.name,
      subtitle: readableLabel(props.place_type),
      atlas_node_id: "atlas:flint-mi",
      geometry_ref: props.geometry_ref ?? null,
      privacy_class: props.privacy_class,
      source_ids: (props.source_ids ?? []).filter((sourceId) =>
        resolvedSourceIds.has(sourceId),
      ),
    },
    summary: {
      description:
        eventCount > 0
          ? `${props.name} has ${eventCount} source-linked civic record${eventCount === 1 ? "" : "s"} in the current public read model.`
          : `${props.name} is present in the public place read model. Source-backed history, safety, and intervention records can attach here as they are reviewed.`,
      status_label: sourceCount > 0 ? "Source-linked" : "Place shell",
      civic_context_tags: summaryTags,
      caveat:
        props.privacy_class === "aggregate_only"
          ? "This public view is aggregate-only; raw parcel, address, or household fields are not exposed."
          : null,
    },
    confidence: {
      label: confidenceLabel,
      score: confidenceScore(confidenceLabel),
      reasons: [
        `${sourceCount} linked public source${sourceCount === 1 ? "" : "s"}.`,
        eventCount > 0
          ? `${eventCount} reviewed or reviewable civic timeline item${eventCount === 1 ? "" : "s"}.`
          : "No timeline claims are published for this subject yet.",
        props.privacy_class === "aggregate_only"
          ? "Aggregate-only privacy class keeps sensitive raw fields out of the public dossier."
          : "Public dossier fields are limited to checked read-model data.",
      ],
      review_state: events.some((event) => event.review.status === "accepted")
        ? "accepted"
        : eventCount > 0
          ? "needs_review"
          : "place_shell",
      source_count: sourceCount,
      last_checked_at: sourceLastChecked(sources),
    },
    tabs: DOSSIER_TAB_IDS.map((id) => {
      const countByTab: Record<DossierTabId, number> = {
        overview: 1,
        sources: sourceCount,
        history: historicalItems.length,
        nearby: nearby.length,
        interventions: interventionItems.length,
        safety: safetyItems.length,
        metrics: metricList.length,
        evidence: sourceCount + eventCount,
        contribute: 1,
      };
      return {
        id,
        label: TAB_LABELS[id],
        count: id === "overview" || id === "contribute" ? null : countByTab[id],
        status: tabStatus(countByTab[id], id === "contribute"),
      };
    }),
    source_cards: sourceCards(sources),
    timeline,
    metrics: metricList,
    nearby_objects: nearby,
    related_interventions: interventionItems,
    related_safety_records: safetyItems,
    related_historical_events: historicalItems,
    evidence_graph_ref: {
      node_id: props.place_id,
      api_url: `/api/v2/theseus/open-flint-atlas/provenance/?place_id=${encodeURIComponent(
        props.place_id,
      )}`,
      panel_label: "Source support graph",
    },
    scene_manifest_refs: [
      {
        id: "scene:flint-overview",
        label: "Flint overview SceneManifest",
        url: "/api/v2/theseus/open-flint-atlas/scene-manifests/",
        status: "available",
      },
    ],
    contribution_actions: [
      {
        id: "suggest-correction",
        label: "Suggest a correction",
        kind: "correction",
        status: "disabled",
        reason: "Public write intake is planned, but standalone atlas writes still return 501.",
      },
      {
        id: "link-source",
        label: "Add a source link",
        kind: "source_link",
        status: "disabled",
        reason: "Source suggestions need the contribution receipt flow before publication.",
      },
    ],
    privacy_flags: [
      {
        id: "privacy-class",
        label: `Privacy class: ${props.privacy_class}`,
        severity: props.privacy_class === "public_boundary" ? "info" : "caution",
      },
    ],
    download_citation: {
      label: "Download dossier JSON",
      url: `/api/v2/theseus/open-flint-atlas/dossiers/${encodeURIComponent(props.place_id)}/`,
      format: "json",
    },
  };
}
