import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const fixtureRoot = path.join(
  root,
  "src/data/open-flint-atlas/fixtures",
);

const DOSSIER_TAB_IDS = [
  "overview",
  "sources",
  "history",
  "nearby",
  "interventions",
  "safety",
  "metrics",
  "evidence",
  "contribute",
];

const TAB_LABELS = {
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

const ACTION_STATUSES = ["available", "planned", "disabled"];
const TAB_STATUSES = ["available", "empty", "planned"];
const PRIVACY_LEVELS = ["public", "low", "medium", "high"];
const PRIVACY_FLAGS = ["info", "caution"];
const CONTRIBUTION_KINDS = ["correction", "source_link", "observation", "document"];
const REQUIRED_SUBJECT_TYPES = new Set([
  "atlas_node",
  "place",
  "parcel",
  "building_presence",
  "street",
  "road_segment",
  "corridor",
  "historical_event",
  "news_article",
  "source",
  "dataset",
  "observation",
  "intervention",
  "metric",
]);

const EVENT_TAB_BY_TYPE = {
  building_presence: "history",
  event: "history",
  source_update: "history",
  intervention: "interventions",
  crash_aggregate: "safety",
  metric: "metrics",
  observation: "contribute",
};

function parseOptions(argv) {
  const options = {
    baseUrl: null,
    failOnWarning: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fail-on-warning") {
      options.failOnWarning = true;
      continue;
    }
    if (arg === "--base-url") {
      options.baseUrl = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (options.baseUrl !== null && options.baseUrl.trim().length === 0) {
    throw new Error("--base-url must include a URL");
  }

  return options;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertString(value, pathLabel) {
  assert(typeof value === "string" && value.trim().length > 0, `${pathLabel} must be a non-empty string`);
}

function assertMaybeString(value, pathLabel) {
  assert(
    value === null || (typeof value === "string" && value.trim().length > 0),
    `${pathLabel} must be null or a non-empty string`,
  );
}

function assertStringArray(value, pathLabel) {
  assert(Array.isArray(value), `${pathLabel} must be an array`);
  for (const item of value) {
    assert(typeof item === "string", `${pathLabel} must contain only strings`);
  }
}

function assertNumber(value, pathLabel) {
  assert(Number.isFinite(value), `${pathLabel} must be a finite number`);
}

function assertInteger(value, pathLabel) {
  assertNumber(value, pathLabel);
  assert(Number.isInteger(value), `${pathLabel} must be an integer`);
}
function assertUrlLike(value, pathLabel) {
  assertString(value, pathLabel);
  assert(value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/"), `${pathLabel} must be a URL/path`);
}

async function readJson(relativePath) {
  const filePath = path.join(fixtureRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8"));
}

function readableLabel(value) {
  return value.replace(/_/g, " ");
}

function normalizeConfidenceLabel(label) {
  const normalized = String(label ?? "unknown").toLowerCase();
  return ["high", "medium", "low", "unknown", "pending"].includes(normalized)
    ? normalized
    : "unknown";
}

function confidenceScore(label) {
  const normalized = normalizeConfidenceLabel(label);
  if (normalized === "high") return 0.85;
  if (normalized === "medium") return 0.6;
  if (normalized === "low") return 0.32;
  if (normalized === "pending") return null;
  return null;
}

function readablePrivacy(rawPrivacy) {
  if (PRIVACY_LEVELS.includes(rawPrivacy)) return rawPrivacy;
  return "low";
}

function normalizeEvent(event) {
  return {
    event_id: event.event_id,
    event_type: event.event_type,
    title: event.title,
    summary: event.summary,
    time: event.time,
    place_id: event.place?.place_id,
    source_ids: event.source?.source_ids ?? [],
    confidence: normalizeConfidenceLabel(
      typeof event.confidence === "string" ? event.confidence : event.confidence?.label,
    ),
    review: {
      status: event.review?.status ?? "needs_review",
    },
    public_caveat: typeof event.public_caveat === "string" ? event.public_caveat : null,
    model_output_status: event.model_output_status ?? null,
  };
}

function formatDossierTime(time) {
  if (!time || typeof time !== "object") return "Unknown time";
  switch (time.shape) {
    case "instant":
      return time.date ?? "Unknown date";
    case "interval":
      return time.end == null ? `${time.start} to present` : `${time.start} to ${time.end}`;
    case "first_seen_last_seen":
      return time.last_seen == null
        ? `${time.first_seen} to present`
        : `${time.first_seen} to ${time.last_seen}`;
    case "period":
      return time.period;
    case "observed_at":
      return time.observed_at;
    default:
      return "Unknown time";
  }
}

function metricValueLabel(metric) {
  if (metric.value == null || metric.value === "") return "pending";
  const suffix = metric.unit ? ` ${metric.unit}` : "";
  return `${metric.value}${suffix}`;
}

function sourceLastChecked(sources) {
  const dates = sources
    .map((source) => source.last_checked)
    .filter((item) => typeof item === "string")
    .sort();
  return dates.at(-1) ?? null;
}

function subjectTypeForPlace(placeType) {
  if (placeType === "parcel") return "parcel";
  if (placeType === "corridor") return "corridor";
  if (placeType === "road_segment") return "road_segment";
  if (placeType === "street") return "street";
  return "place";
}

function sourceCardsForPlace(sources) {
  return sources.map((source) => ({
    id: source.source_id,
    name: source.name,
    trust_tier: source.trust_tier,
    public_use: source.public_use,
    freshness_label: source.source_update_label,
    last_checked_at: source.last_checked,
    known_limits: source.known_limits ?? [],
    url: source.homepage_url,
  }));
}

function timelineItems(events, sourceIdsForPlace) {
  return events.map((event) => {
    const normalized = normalizeEvent(event);
    const tab = EVENT_TAB_BY_TYPE[normalized.event_type] ?? "history";
    const eventSourceIds = Array.isArray(normalized.source_ids)
      ? normalized.source_ids.filter((id) => sourceIdsForPlace.has(id))
      : [];
    return {
      id: normalized.event_id,
      tab,
      title: normalized.title,
      summary: normalized.summary,
      time_label: formatDossierTime(normalized.time),
      confidence_label: normalized.confidence,
      review_state: normalized.review.status,
      caveat: normalized.public_caveat,
      source_ids: eventSourceIds,
    };
  });
}

function nearbyObjects(place, allPlaces) {
  const subjectId = place.properties.place_id;
  const subjectType = place.properties.place_type;
  return allPlaces
    .filter(
      (feature) =>
        feature.properties.place_id !== subjectId &&
        (feature.properties.place_type === subjectType ||
          feature.properties.privacy_class === place.properties.privacy_class),
    )
    .slice(0, 6)
    .map((feature) => ({
      id: feature.properties.place_id,
      type: subjectTypeForPlace(feature.properties.place_type),
      name: feature.properties.name,
      relation_label:
        feature.properties.place_type === subjectType
          ? `Same ${readableLabel(subjectType)} layer`
          : readableLabel(feature.properties.place_type),
      confidence_label: null,
    }));
}

function metricCards(metrics) {
  return metrics.slice(0, 18).map((metric, index) => ({
    id: metric.metric_id ?? `metric-${index}`,
    label: metric.metric_label ?? metric.metric_key ?? "Metric",
    value_label: metricValueLabel(metric),
    category: metric.category ?? "civic context",
    source_id: metric.source_id ?? null,
    release_year:
      metric.release_year != null ? Number(metric.release_year) : metric.estimate_year ?? null,
    caveat: metric.caveat ?? null,
  }));
}

function metricPlaceIds(place) {
  const ids = new Set([place.properties.place_id]);
  const wardNumber = place.properties.ward_number;
  if (wardNumber != null) ids.add(`ward:${Number(wardNumber)}`);
  const sampleWard = place.properties.place_id.match(/^ward_0?(\d+)_sample$/);
  if (sampleWard) ids.add(`ward:${Number(sampleWard[1])}`);
  return ids;
}

function dossierApiUrl(baseUrl, placeId) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  return `${normalizedBaseUrl}/api/v2/theseus/open-flint-atlas/dossiers/${encodeURIComponent(placeId)}/`;
}

async function fetchLiveDossierPayload(baseUrl, placeId) {
  const response = await fetch(dossierApiUrl(baseUrl, placeId));
  if (!response.ok) {
    throw new Error(`Live dossier fetch failed for ${placeId}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function buildDossierPayload({ place, allPlaces, allEvents, allSources, allMetrics }) {
  const eventList = allEvents.filter((event) => event.place?.place_id === place.properties.place_id);
  const metricIds = metricPlaceIds(place);
  const placeMetrics = allMetrics.filter((metric) => metricIds.has(metric.place_id));
  const sourceIds = new Set([
    ...((place.properties.source_ids ?? []).filter(Boolean)),
    ...eventList.flatMap((event) => event.source?.source_ids ?? []),
    ...placeMetrics.map((metric) => metric.source_id).filter(Boolean),
  ]);
  const placeSources = allSources.filter((source) => sourceIds.has(source.source_id));
  const cards = sourceCardsForPlace(placeSources);
  const timeline = timelineItems(
    eventList.map((event) => ({
      ...event,
      confidence:
        typeof event.confidence === "string" ? event.confidence : event.confidence?.label,
      public_caveat:
        typeof event.public_caveat === "string"
          ? event.public_caveat
          : typeof event.confidence === "object"
            ? event.confidence?.reason ?? null
            : null,
    })),
    sourceIds,
  );
  const nearby = nearbyObjects(place, allPlaces);
  const interventions = timeline.filter((item) => item.tab === "interventions");
  const safetyRecords = timeline.filter((item) => item.tab === "safety");
  const historicalEvents = timeline.filter((item) => item.tab === "history");
  const metrics = metricCards(placeMetrics);
  const sourceCount = cards.length;
  const eventCount = timeline.length;
  const confidenceLabel =
    timeline.find((item) => item.confidence_label !== "unknown")?.confidence_label ??
    (sourceCount > 0 ? "medium" : "unknown");

  const summaryTags = [
    readableLabel(place.properties.place_type),
    place.properties.ward_number != null ? `Ward ${place.properties.ward_number}` : null,
    readablePrivacy(place.properties.privacy_class),
  ].filter((tag) => typeof tag === "string");

  const countByTab = {
    overview: 1,
    sources: sourceCount,
    history: historicalEvents.length,
    nearby: nearby.length,
    interventions: interventions.length,
    safety: safetyRecords.length,
    metrics: metrics.length,
    evidence: sourceCount + eventCount,
    contribute: 1,
  };

  return {
    schema_version: "0.1",
    subject: {
      id: place.properties.place_id,
      type: subjectTypeForPlace(place.properties.place_type),
      name: place.properties.name,
      subtitle: readableLabel(place.properties.place_type),
      atlas_node_id: "atlas:flint-mi",
      geometry_ref: place.properties.geometry_ref,
      privacy_class: place.properties.privacy_class,
      source_ids: place.properties.source_ids ?? [],
    },
    summary: {
      description:
        eventCount > 0
          ? `${place.properties.name} has ${eventCount} source-linked civic record${eventCount === 1 ? "" : "s"} in the current public read model.`
          : `${place.properties.name} is present in the public place read model.`,
      status_label: sourceCount > 0 ? "Source-linked" : "Place shell",
      civic_context_tags: summaryTags,
      caveat:
        place.properties.privacy_class === "aggregate_only"
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
      ],
      review_state: eventList.some((event) => event.review?.status === "accepted")
        ? "accepted"
        : eventCount > 0
          ? "needs_review"
          : "place_shell",
      source_count: sourceCount,
      last_checked_at: sourceLastChecked(placeSources),
    },
    tabs: DOSSIER_TAB_IDS.map((id) => {
      return {
        id,
        label: TAB_LABELS[id],
        count: id === "overview" || id === "contribute" ? null : countByTab[id],
        status: countByTab[id] > 0 ? "available" : id === "contribute" ? "planned" : "empty",
      };
    }),
    source_cards: cards,
    timeline,
    metrics,
    nearby_objects: nearby,
    related_interventions: interventions,
    related_safety_records: safetyRecords,
    related_historical_events: historicalEvents,
    evidence_graph_ref: {
      node_id: place.properties.place_id,
      api_url: `/api/v2/theseus/open-flint-atlas/provenance/?place_id=${encodeURIComponent(place.properties.place_id)}`,
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
        label: `Privacy class: ${place.properties.privacy_class}`,
        severity: place.properties.privacy_class === "public_boundary" ? "info" : "caution",
      },
    ],
    download_citation: {
      label: "Download dossier JSON",
      url: `/api/v2/theseus/open-flint-atlas/dossiers/${encodeURIComponent(place.properties.place_id)}/`,
      format: "json",
    },
  };
}

function validateDossier(payload, index, sourceCardIds, allSourceIds, warn) {
  const prefix = `payloads[${index}] (${payload.subject?.id ?? "unknown"})`;
  assertString(payload.schema_version, `${prefix}.schema_version`);
  assert(payload.schema_version === "0.1", `${prefix}.schema_version must be "0.1"`);

  // Top-level keys
  const requiredTopLevel = [
    "subject",
    "summary",
    "confidence",
    "tabs",
    "source_cards",
    "timeline",
    "metrics",
    "nearby_objects",
    "related_interventions",
    "related_safety_records",
    "related_historical_events",
    "evidence_graph_ref",
    "scene_manifest_refs",
    "contribution_actions",
    "privacy_flags",
    "download_citation",
  ];
  for (const key of requiredTopLevel) {
    assert(Object.prototype.hasOwnProperty.call(payload, key), `${prefix} must include ${key}`);
  }

  // Subject contract
  assertString(payload.subject.id, `${prefix}.subject.id`);
  assert(REQUIRED_SUBJECT_TYPES.has(payload.subject.type), `${prefix}.subject.type must be a supported dossier subject type`);
  assertString(payload.subject.name, `${prefix}.subject.name`);
  assertString(payload.subject.subtitle, `${prefix}.subject.subtitle`);
  assertString(payload.subject.atlas_node_id, `${prefix}.subject.atlas_node_id`);
  assertMaybeString(payload.subject.geometry_ref, `${prefix}.subject.geometry_ref`);
  assertString(payload.subject.privacy_class, `${prefix}.subject.privacy_class`);
  assertStringArray(payload.subject.source_ids, `${prefix}.subject.source_ids`);

  // Summary contract
  assertString(payload.summary.description, `${prefix}.summary.description`);
  assertString(payload.summary.status_label, `${prefix}.summary.status_label`);
  assertStringArray(payload.summary.civic_context_tags, `${prefix}.summary.civic_context_tags`);
  assertMaybeString(payload.summary.caveat, `${prefix}.summary.caveat`);

  // Confidence contract
  assertString(payload.confidence.label, `${prefix}.confidence.label`);
  assert(
    payload.confidence.score === null || typeof payload.confidence.score === "number",
    `${prefix}.confidence.score must be number or null`,
  );
  assertStringArray(payload.confidence.reasons, `${prefix}.confidence.reasons`);
  assertString(payload.confidence.review_state, `${prefix}.confidence.review_state`);
  assertInteger(payload.confidence.source_count, `${prefix}.confidence.source_count`);
  assert(payload.confidence.source_count >= 0, `${prefix}.confidence.source_count must be >= 0`);
  assertMaybeString(payload.confidence.last_checked_at, `${prefix}.confidence.last_checked_at`);

  // Tabs
  assert(Array.isArray(payload.tabs), `${prefix}.tabs must be an array`);
  assert(payload.tabs.length === DOSSIER_TAB_IDS.length, `${prefix}.tabs must include nine items`);
  const tabIds = new Set();
  for (const item of payload.tabs) {
    assertString(item.id, `${prefix}.tabs[].id`);
    assert(!tabIds.has(item.id), `${prefix}.tabs item id must be unique`);
    tabIds.add(item.id);
    assert(item.id in TAB_LABELS, `${prefix}.tabs[].id must be recognized: ${item.id}`);
    assertString(item.label, `${prefix}.tabs[].label`);
    if (item.id === "overview" || item.id === "contribute") {
      assert(item.count === null, `${prefix}.tabs[${item.id}].count must be null`);
    } else {
      assert(
        Number.isInteger(item.count) && item.count >= 0,
        `${prefix}.tabs[${item.id}].count must be a non-negative integer`,
      );
    }
    assert(TAB_STATUSES.includes(item.status), `${prefix}.tabs[${item.id}].status must be available|empty|planned`);
  }
  for (const tabId of DOSSIER_TAB_IDS) {
    assert(tabIds.has(tabId), `${prefix}.tabs must include ${tabId}`);
  }

  // Source cards
  assertArrayPayload(payload.source_cards, `${prefix}.source_cards`);
  for (const card of payload.source_cards) {
    assertString(card.id, `${prefix}.source_cards[].id`);
    assertString(card.name, `${prefix}.source_cards[].name`);
    assertString(card.trust_tier, `${prefix}.source_cards[].trust_tier`);
    assertString(card.public_use, `${prefix}.source_cards[].public_use`);
    assertString(card.freshness_label, `${prefix}.source_cards[].freshness_label`);
    assertMaybeString(card.last_checked_at, `${prefix}.source_cards[].last_checked_at`);
    assertStringArray(card.known_limits, `${prefix}.source_cards[].known_limits`);
    assertUrlLike(card.url, `${prefix}.source_cards[].url`);
  }

  // Timeline
  assertArrayPayload(payload.timeline, `${prefix}.timeline`);
  for (const item of payload.timeline) {
    assertString(item.id, `${prefix}.timeline[].id`);
    assert(item.tab in TAB_LABELS, `${prefix}.timeline[].tab must be valid dossier tab`);
    assertString(item.title, `${prefix}.timeline[].title`);
    assertString(item.summary, `${prefix}.timeline[].summary`);
    assertString(item.time_label, `${prefix}.timeline[].time_label`);
    assertString(item.confidence_label, `${prefix}.timeline[].confidence_label`);
    assertString(item.review_state, `${prefix}.timeline[].review_state`);
    assertMaybeString(item.caveat, `${prefix}.timeline[].caveat`);
    assertStringArray(item.source_ids, `${prefix}.timeline[].source_ids`);
    for (const sourceId of item.source_ids) {
      if (!sourceCardIds.has(sourceId) && !allSourceIds.has(sourceId)) {
        warn(`${prefix}.timeline[].source_ids references unknown source ${sourceId}`);
      }
      if (!sourceCardIds.has(sourceId) && allSourceIds.has(sourceId)) {
        warn(`${prefix}.timeline[].source_ids references source ${sourceId} not in source_cards`);
      }
    }
  }

  // Metrics
  assertArrayPayload(payload.metrics, `${prefix}.metrics`);
  for (const item of payload.metrics) {
    assertString(item.id, `${prefix}.metrics[].id`);
    assertString(item.label, `${prefix}.metrics[].label`);
    assertString(item.value_label, `${prefix}.metrics[].value_label`);
    assertString(item.category, `${prefix}.metrics[].category`);
    assert(item.source_id == null || typeof item.source_id === "string", `${prefix}.metrics[].source_id must be string or null`);
    if (typeof item.source_id === "string") {
      assert(item.source_id.length > 0, `${prefix}.metrics[].source_id must be non-empty`);
      if (!allSourceIds.has(item.source_id)) {
        warn(`${prefix}.metrics[].source_id references unknown source ${item.source_id}`);
      } else if (!sourceCardIds.has(item.source_id)) {
        warn(
          `${prefix}.metrics[].source_id references source ${item.source_id} not included in source_cards`,
        );
      }
    }
    assert(
      item.release_year == null || Number.isInteger(item.release_year),
      `${prefix}.metrics[].release_year must be integer or null`,
    );
    assertMaybeString(item.caveat, `${prefix}.metrics[].caveat`);
  }

  // Related object arrays
  assertArrayPayload(payload.nearby_objects, `${prefix}.nearby_objects`);
  for (const item of payload.nearby_objects) {
    assertString(item.id, `${prefix}.nearby_objects[].id`);
    assertString(item.type, `${prefix}.nearby_objects[].type`);
    assertString(item.name, `${prefix}.nearby_objects[].name`);
    assertMaybeString(item.confidence_label, `${prefix}.nearby_objects[].confidence_label`);
    assertString(item.relation_label, `${prefix}.nearby_objects[].relation_label`);
  }
  assertArrayPayload(payload.related_interventions, `${prefix}.related_interventions`);
  assertArrayPayload(payload.related_safety_records, `${prefix}.related_safety_records`);
  assertArrayPayload(payload.related_historical_events, `${prefix}.related_historical_events`);

  // Evidence, scenes, contributions, privacy, citation
  assertString(payload.evidence_graph_ref.node_id, `${prefix}.evidence_graph_ref.node_id`);
  assertUrlLike(payload.evidence_graph_ref.api_url, `${prefix}.evidence_graph_ref.api_url`);
  assertString(payload.evidence_graph_ref.panel_label, `${prefix}.evidence_graph_ref.panel_label`);
  assertArrayPayload(payload.scene_manifest_refs, `${prefix}.scene_manifest_refs`);
  for (const ref of payload.scene_manifest_refs) {
    assertString(ref.id, `${prefix}.scene_manifest_refs[].id`);
    assertString(ref.label, `${prefix}.scene_manifest_refs[].label`);
    assertUrlLike(ref.url, `${prefix}.scene_manifest_refs[].url`);
    assert(ref.status === "available" || ref.status === "planned", `${prefix}.scene_manifest_refs[].status must be available|planned`);
  }
  assertArrayPayload(payload.contribution_actions, `${prefix}.contribution_actions`);
  for (const action of payload.contribution_actions) {
    assertString(action.id, `${prefix}.contribution_actions[].id`);
    assertString(action.label, `${prefix}.contribution_actions[].label`);
    assert(CONTRIBUTION_KINDS.includes(action.kind), `${prefix}.contribution_actions[].kind must be a known action kind`);
    assert(ACTION_STATUSES.includes(action.status), `${prefix}.contribution_actions[].status must be available|planned|disabled`);
    assert(action.reason === null || typeof action.reason === "string", `${prefix}.contribution_actions[].reason must be null|string`);
  }
  assertArrayPayload(payload.privacy_flags, `${prefix}.privacy_flags`);
  for (const flag of payload.privacy_flags) {
    assertString(flag.id, `${prefix}.privacy_flags[].id`);
    assertString(flag.label, `${prefix}.privacy_flags[].label`);
    assert(PRIVACY_FLAGS.includes(flag.severity), `${prefix}.privacy_flags[].severity must be info|caution`);
  }

  assertString(payload.download_citation.label, `${prefix}.download_citation.label`);
  assertUrlLike(payload.download_citation.url, `${prefix}.download_citation.url`);
  assertString(payload.download_citation.format, `${prefix}.download_citation.format`);
  assert(payload.download_citation.format === "json", `${prefix}.download_citation.format must be \"json\"`);
  const encodedSubjectId = encodeURIComponent(payload.subject.id);
  const citationPrefix = `/api/v2/theseus/open-flint-atlas/dossiers/${encodedSubjectId}/`;
  assert(
    payload.download_citation.url.startsWith(citationPrefix),
    `${prefix}.download_citation.url must include subject id in route`,
  );

  // Practical consistency checks
  for (const sourceId of payload.subject.source_ids) {
    if (!allSourceIds.has(sourceId)) {
      warn(`${prefix}.subject.source_ids references unknown source ${sourceId}`);
    }
    if (!sourceCardIds.has(sourceId)) {
      warn(`${prefix}.subject.source_ids references source ${sourceId} not included in source_cards`);
    }
  }
  assert(
    payload.confidence.source_count === payload.source_cards.length,
    `${prefix}.confidence.source_count must match source_cards.length`,
  );
  assert(
    payload.tabs.find((tab) => tab.id === "sources").count === payload.source_cards.length,
    `${prefix}.tabs.sources.count should match source_cards.length`,
  );
}

function assertArrayPayload(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
}

async function main(options) {
  const [placesFixture, sourcesFixture, metricsFixture, eventFixture] = await Promise.all([
    readJson("read-model/places.json"),
    readJson("read-model/sources.json"),
    readJson("read-model/metrics.json"),
    readJson("spatial-event-index/seed-events.json"),
  ]);

  const places = placesFixture.features ?? [];
  const allSources = Array.isArray(sourcesFixture) ? sourcesFixture : [];
  const allMetrics = Array.isArray(metricsFixture) ? metricsFixture : [];
  const allEvents = Array.isArray(eventFixture.events) ? eventFixture.events : [];

  assertArrayPayload(places, "places fixture features");
  assertArrayPayload(allSources, "sources fixture");
  assertArrayPayload(allMetrics, "metrics fixture");
  assertArrayPayload(allEvents, "events fixture");

  let valid = 0;
  let withErrors = 0;
  const warnings = [];
  const allSourceIds = new Set(allSources.map((source) => source.source_id));
  const warn = (message) => {
    if (!warnings.includes(message)) warnings.push(message);
  };

  for (const [index, feature] of places.entries()) {
    const payload = options.baseUrl
      ? await fetchLiveDossierPayload(options.baseUrl, feature.properties.place_id)
      : buildDossierPayload({
          place: feature,
          allPlaces: places,
          allEvents: allEvents,
          allSources: allSources,
          allMetrics: allMetrics,
        });
    const sourceCardIds = new Set(payload.source_cards.map((source) => source.id));

    try {
      validateDossier(payload, index, sourceCardIds, allSourceIds, warn);
      valid += 1;
    } catch (error) {
      withErrors += 1;
      console.error(error.message);
    }
  }

  if (warnings.length > 0) {
    const maxWarnings = 25;
    const shown = warnings.slice(0, maxWarnings);
    console.log(
      `Dossier payload validation found ${warnings.length} data warnings (showing first ${shown.length}):`,
    );
    for (const warning of shown) {
      console.log(`  - ${warning}`);
    }
    if (warnings.length > maxWarnings) {
      console.log(`  - ... plus ${warnings.length - maxWarnings} additional warnings`);
    }
  }

  console.log(
    `Dossier payload validation complete (${options.baseUrl ? "live API" : "fixture builder"}): ${valid}/${places.length} dossiers valid.`,
  );

  if (withErrors > 0) {
    throw new Error(`Validation failed for ${withErrors} dossiers.`);
  }
  if (options.failOnWarning && warnings.length > 0) {
    throw new Error(`Validation found ${warnings.length} warning${warnings.length === 1 ? "" : "s"} in strict mode.`);
  }
}

main(parseOptions(process.argv.slice(2))).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
