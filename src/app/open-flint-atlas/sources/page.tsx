import type { Metadata } from "next";
import { AtlasRouteShell } from "@/components/atlas/AtlasRouteShell";
import {
  SourceRegistrySurface,
  type SourceRegistryRecord,
  type SourceRegistryUsageItem,
} from "@/components/atlas/SourceRegistrySurface";
import type { AtlasSource } from "@/lib/api/openFlintAtlas";
import {
  getAtlasEventFixtures,
  getAtlasPlaces,
  getAtlasSources,
  getCivicObjects,
  getSourceRegistryEntries,
  type SourceRegistryEntry,
} from "@/lib/atlas/route-lookups";

export const metadata: Metadata = {
  title: "Sources | Flint Atlas | Our Civic Atlas",
  description:
    "Scan-first public source registry for Flint Atlas, including trust, freshness, use limits, and fixture-backed object links.",
};

const MAX_USAGE_PREVIEW = 8;

type SourceUsageCounts = {
  places: number;
  events: number;
  objects: number;
  total: number;
};

type SourceUsageAccumulator = {
  preview: SourceRegistryUsageItem[];
  counts: SourceUsageCounts;
};

function createUsageAccumulator(): SourceUsageAccumulator {
  return {
    preview: [],
    counts: {
      places: 0,
      events: 0,
      objects: 0,
      total: 0,
    },
  };
}

function addUsagePreview(
  accumulator: SourceUsageAccumulator,
  item: SourceRegistryUsageItem,
) {
  if (
    accumulator.preview.length >= MAX_USAGE_PREVIEW ||
    accumulator.preview.some((preview) => preview.id === item.id)
  ) {
    return;
  }

  accumulator.preview.push(item);
}

function registerUsage(
  usageBySource: Map<string, SourceUsageAccumulator>,
  sourceIds: string[],
  kind: keyof SourceUsageCounts,
  item: SourceRegistryUsageItem,
) {
  for (const sourceId of sourceIds) {
    const accumulator = usageBySource.get(sourceId);
    if (!accumulator) {
      continue;
    }

    accumulator.counts.total += 1;
    if (kind !== "total") {
      accumulator.counts[kind] += 1;
    }
    addUsagePreview(accumulator, item);
  }
}

function deriveRiskLevel(
  source: AtlasSource,
  registry: SourceRegistryEntry | undefined,
): SourceRegistryRecord["riskLevel"] {
  const policyText = [
    source.public_use,
    registry?.current_status,
    registry?.update_cadence,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    source.contains_personal_data ||
    policyText.includes("address_level") ||
    policyText.includes("do_not_scrape")
  ) {
    return "privacy_review";
  }

  if (
    policyText.includes("review") ||
    policyText.includes("probe") ||
    policyText.includes("request")
  ) {
    return "terms_review";
  }

  return "public_reference";
}

function buildSourceRegistryRecords(): SourceRegistryRecord[] {
  const sourceCards = getAtlasSources();
  const registryById = new Map(
    getSourceRegistryEntries().map((entry) => [entry.id, entry]),
  );
  const usageBySource = new Map<string, SourceUsageAccumulator>(
    sourceCards.map((source) => [source.source_id, createUsageAccumulator()]),
  );

  for (const object of getCivicObjects()) {
    registerUsage(usageBySource, object.source_ids, "objects", {
      id: object.id,
      label: object.name,
      kind: "object",
      detailLabel: object.review_state,
    });
  }

  for (const event of getAtlasEventFixtures()) {
    registerUsage(usageBySource, event.source.source_ids, "events", {
      id: event.event_id,
      label: event.title,
      kind: "event",
      detailLabel: event.event_type,
    });
  }

  for (const place of getAtlasPlaces()) {
    registerUsage(usageBySource, place.properties.source_ids, "places", {
      id: place.properties.place_id,
      label: place.properties.name,
      kind: "place",
      detailLabel: place.properties.place_type,
    });
  }

  return sourceCards
    .map((source) => {
      const registry = registryById.get(source.source_id);
      const usage = usageBySource.get(source.source_id) ?? createUsageAccumulator();

      return {
        id: source.source_id,
        name: source.name,
        homepageUrl: source.homepage_url,
        trustTier: source.trust_tier,
        publicUse: source.public_use,
        sourceUpdateLabel: source.source_update_label,
        lastChecked: source.last_checked,
        containsPersonalData: source.contains_personal_data,
        knownLimits: source.known_limits,
        sourceType: registry?.source_type ?? "source_registry_pending",
        geography: registry?.geography ?? "Flint Atlas",
        steward: registry?.steward ?? "Atlas registry pending",
        currentStatus: registry?.current_status ?? "source_registry_pending",
        updateCadence: registry?.update_cadence ?? "pending",
        ingestionPriority: registry?.ingestion_priority ?? null,
        initialLayers: registry?.initial_layers ?? [],
        firstChecks: registry?.first_checks ?? [],
        usedInPreview: usage.preview,
        usedCounts: usage.counts,
        riskLevel: deriveRiskLevel(source, registry),
      } satisfies SourceRegistryRecord;
    })
    .sort((left, right) => {
      const priorityDelta =
        (left.ingestionPriority ?? Number.MAX_SAFE_INTEGER) -
        (right.ingestionPriority ?? Number.MAX_SAFE_INTEGER);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const usageDelta = right.usedCounts.total - left.usedCounts.total;
      if (usageDelta !== 0) {
        return usageDelta;
      }

      return left.name.localeCompare(right.name);
    });
}

export default function SourcesPage() {
  return (
    <AtlasRouteShell
      eyebrow="Public Source Registry"
      title="Sources"
      description="Scan the Flint Atlas source registry by trust, freshness, review boundary, and linked public objects before you decide what belongs in a dossier or scene."
      actions={[{ href: "/open-flint-atlas/methodology", label: "Review method" }]}
    >
      <SourceRegistrySurface records={buildSourceRegistryRecords()} />
    </AtlasRouteShell>
  );
}
