"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FilterX } from "lucide-react";
import {
  AtlasMetaGrid,
  AtlasMetaItem,
  AtlasPillList,
  AtlasSection,
} from "@/components/atlas/AtlasRouteShell";

type SourceUsageKind = "place" | "event" | "object";
type SourceRiskLevel =
  | "privacy_review"
  | "terms_review"
  | "public_reference";

export type SourceRegistryUsageItem = {
  id: string;
  label: string;
  kind: SourceUsageKind;
  detailLabel: string | null;
};

export type SourceRegistryRecord = {
  id: string;
  name: string;
  homepageUrl: string;
  trustTier: string;
  publicUse: string;
  sourceUpdateLabel: string;
  lastChecked: string | null;
  containsPersonalData: boolean;
  knownLimits: string[];
  sourceType: string;
  geography: string;
  steward: string;
  currentStatus: string;
  updateCadence: string;
  ingestionPriority: number | null;
  initialLayers: string[];
  firstChecks: string[];
  usedInPreview: SourceRegistryUsageItem[];
  usedCounts: {
    places: number;
    events: number;
    objects: number;
    total: number;
  };
  riskLevel: SourceRiskLevel;
};

const USAGE_KIND_LABEL: Record<SourceUsageKind, string> = {
  place: "Place",
  event: "Event",
  object: "Object",
};

const RISK_LABEL: Record<SourceRiskLevel, string> = {
  privacy_review: "privacy review",
  terms_review: "terms review",
  public_reference: "public reference",
};

const RISK_TONE: Record<
  SourceRiskLevel,
  { border: string; background: string; color: string }
> = {
  privacy_review: {
    border: "rgba(169, 68, 66, 0.18)",
    background: "rgba(169, 68, 66, 0.08)",
    color: "#7a2f2d",
  },
  terms_review: {
    border: "rgba(176, 124, 27, 0.18)",
    background: "rgba(176, 124, 27, 0.08)",
    color: "#7a5f1f",
  },
  public_reference: {
    border: "rgba(49, 92, 70, 0.16)",
    background: "rgba(49, 92, 70, 0.08)",
    color: "#315c46",
  },
};

function humanizeToken(value: string): string {
  return value.replace(/_/g, " ");
}

function formatDate(value: string | null): string {
  if (!value) {
    return "not checked yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function countLabel(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

function usageSummary(record: SourceRegistryRecord): string {
  if (record.usedCounts.total === 0) {
    return "Not linked yet";
  }

  const parts = [];
  if (record.usedCounts.objects > 0) {
    parts.push(countLabel(record.usedCounts.objects, "object"));
  }
  if (record.usedCounts.events > 0) {
    parts.push(countLabel(record.usedCounts.events, "event"));
  }
  if (record.usedCounts.places > 0) {
    parts.push(countLabel(record.usedCounts.places, "place"));
  }

  return parts.join(" / ");
}

function matchesQuery(record: SourceRegistryRecord, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    record.name,
    record.id,
    record.steward,
    record.geography,
    record.sourceType,
    record.currentStatus,
    record.publicUse,
    record.trustTier,
    ...record.initialLayers,
    ...record.usedInPreview.map((item) => item.label),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function SourceRegistrySurface({
  records,
}: {
  records: SourceRegistryRecord[];
}) {
  const [query, setQuery] = useState("");
  const [trustFilter, setTrustFilter] = useState("all");
  const [freshnessFilter, setFreshnessFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [layerFilter, setLayerFilter] = useState("all");
  const [usageFilter, setUsageFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    records[0]?.id ?? null,
  );

  const trustOptions = Array.from(
    new Set(records.map((record) => record.trustTier)),
  ).sort();
  const freshnessOptions = Array.from(
    new Set(records.map((record) => record.sourceUpdateLabel)),
  ).sort();
  const layerOptions = Array.from(
    new Set(records.flatMap((record) => record.initialLayers)),
  ).sort();

  const filteredRecords = records.filter((record) => {
    if (!matchesQuery(record, query)) {
      return false;
    }
    if (trustFilter !== "all" && record.trustTier !== trustFilter) {
      return false;
    }
    if (
      freshnessFilter !== "all" &&
      record.sourceUpdateLabel !== freshnessFilter
    ) {
      return false;
    }
    if (riskFilter !== "all" && record.riskLevel !== riskFilter) {
      return false;
    }
    if (
      layerFilter !== "all" &&
      !record.initialLayers.includes(layerFilter)
    ) {
      return false;
    }
    if (usageFilter === "place" && record.usedCounts.places === 0) {
      return false;
    }
    if (usageFilter === "event" && record.usedCounts.events === 0) {
      return false;
    }
    if (usageFilter === "object" && record.usedCounts.objects === 0) {
      return false;
    }
    if (usageFilter === "unlinked" && record.usedCounts.total > 0) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (
      filteredRecords.length > 0 &&
      !filteredRecords.some((record) => record.id === selectedId)
    ) {
      setSelectedId(filteredRecords[0]?.id ?? null);
    }
    if (filteredRecords.length === 0 && selectedId !== null) {
      setSelectedId(null);
    }
  }, [filteredRecords, selectedId]);

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedId) ?? null;

  const reviewLimitedCount = filteredRecords.filter(
    (record) => record.riskLevel !== "public_reference",
  ).length;
  const prioritySourceCount = filteredRecords.filter(
    (record) => record.ingestionPriority === 1,
  ).length;
  const linkedUsageCount = filteredRecords.reduce(
    (total, record) => total + record.usedCounts.total,
    0,
  );

  function clearFilters() {
    setQuery("");
    setTrustFilter("all");
    setFreshnessFilter("all");
    setRiskFilter("all");
    setLayerFilter("all");
    setUsageFilter("all");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
      <AtlasSection title={`${filteredRecords.length} registry entries`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div
            className="rounded-[4px] border p-3"
            style={{
              borderColor: "rgba(42, 36, 25, 0.1)",
              background: "rgba(255, 255, 255, 0.34)",
            }}
          >
            <p
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Filtered sources
            </p>
            <p className="mt-2 text-2xl font-semibold">{filteredRecords.length}</p>
            <p
              className="mt-1 text-[12px] leading-[1.5]"
              style={{ color: "var(--ctx-ink-soft)" }}
            >
              Source cards with public-use and freshness metadata.
            </p>
          </div>

          <div
            className="rounded-[4px] border p-3"
            style={{
              borderColor: "rgba(42, 36, 25, 0.1)",
              background: "rgba(255, 255, 255, 0.34)",
            }}
          >
            <p
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Review-limited
            </p>
            <p className="mt-2 text-2xl font-semibold">{reviewLimitedCount}</p>
            <p
              className="mt-1 text-[12px] leading-[1.5]"
              style={{ color: "var(--ctx-ink-soft)" }}
            >
              Sources that still carry privacy or terms-review constraints.
            </p>
          </div>

          <div
            className="rounded-[4px] border p-3"
            style={{
              borderColor: "rgba(42, 36, 25, 0.1)",
              background: "rgba(255, 255, 255, 0.34)",
            }}
          >
            <p
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Source links
            </p>
            <p className="mt-2 text-2xl font-semibold">{linkedUsageCount}</p>
            <p
              className="mt-1 text-[12px] leading-[1.5]"
              style={{ color: "var(--ctx-ink-soft)" }}
            >
              Place, event, and civic-object links derived from the public fixtures.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="xl:col-span-2">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Search
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="name, steward, geography, or linked object"
              className="mt-2 w-full rounded-[4px] border px-3 py-2 text-[13px]"
              style={{
                borderColor: "rgba(42, 36, 25, 0.12)",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            />
          </label>

          <label>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Trust tier
            </span>
            <select
              value={trustFilter}
              onChange={(event) => setTrustFilter(event.target.value)}
              className="mt-2 w-full rounded-[4px] border px-3 py-2 text-[13px]"
              style={{
                borderColor: "rgba(42, 36, 25, 0.12)",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <option value="all">All tiers</option>
              {trustOptions.map((option) => (
                <option key={option} value={option}>
                  {humanizeToken(option)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Freshness
            </span>
            <select
              value={freshnessFilter}
              onChange={(event) => setFreshnessFilter(event.target.value)}
              className="mt-2 w-full rounded-[4px] border px-3 py-2 text-[13px]"
              style={{
                borderColor: "rgba(42, 36, 25, 0.12)",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <option value="all">All freshness</option>
              {freshnessOptions.map((option) => (
                <option key={option} value={option}>
                  {humanizeToken(option)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Risk
            </span>
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="mt-2 w-full rounded-[4px] border px-3 py-2 text-[13px]"
              style={{
                borderColor: "rgba(42, 36, 25, 0.12)",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <option value="all">All review states</option>
              {Object.entries(RISK_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Layer type
            </span>
            <select
              value={layerFilter}
              onChange={(event) => setLayerFilter(event.target.value)}
              className="mt-2 w-full rounded-[4px] border px-3 py-2 text-[13px]"
              style={{
                borderColor: "rgba(42, 36, 25, 0.12)",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <option value="all">All layer types</option>
              {layerOptions.map((option) => (
                <option key={option} value={option}>
                  {humanizeToken(option)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Used in
            </span>
            <select
              value={usageFilter}
              onChange={(event) => setUsageFilter(event.target.value)}
              className="mt-2 w-full rounded-[4px] border px-3 py-2 text-[13px]"
              style={{
                borderColor: "rgba(42, 36, 25, 0.12)",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <option value="all">Any linked surface</option>
              <option value="object">Linked civic objects</option>
              <option value="event">Linked events</option>
              <option value="place">Linked places</option>
              <option value="unlinked">No linked objects yet</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p
            className="text-[12px] leading-[1.5]"
            style={{ color: "var(--ctx-ink-soft)" }}
          >
            {prioritySourceCount} priority-one sources remain visible in this view.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-2 rounded-[4px] border px-3 py-2 text-[12px] font-medium"
            style={{
              borderColor: "rgba(42, 36, 25, 0.12)",
              color: "var(--ctx-ink-soft)",
            }}
          >
            <FilterX className="h-4 w-4" />
            Clear filters
          </button>
        </div>

        {filteredRecords.length === 0 ? (
          <div
            className="mt-5 rounded-[4px] border px-4 py-5"
            style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
          >
            <p className="text-[13px] leading-[1.55]">
              No source registry entries match the current filter set.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 md:hidden">
              {filteredRecords.map((record) => {
                const isSelected = record.id === selectedId;
                const riskTone = RISK_TONE[record.riskLevel];

                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedId(record.id)}
                    className="rounded-[4px] border p-4 text-left"
                    style={{
                      borderColor: isSelected
                        ? "var(--ctx-accent)"
                        : "rgba(42, 36, 25, 0.1)",
                      background: isSelected
                        ? "rgba(121, 89, 52, 0.07)"
                        : "rgba(255, 255, 255, 0.3)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold">{record.name}</p>
                        <p
                          className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em]"
                          style={{ color: "var(--ctx-ink-mute)" }}
                        >
                          {record.id}
                        </p>
                      </div>
                      <span
                        className="rounded-[999px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
                        style={riskTone}
                      >
                        {RISK_LABEL[record.riskLevel]}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p
                          className="font-mono text-[10px] uppercase tracking-[0.14em]"
                          style={{ color: "var(--ctx-ink-mute)" }}
                        >
                          Trust
                        </p>
                        <p className="mt-1 text-[12px] leading-[1.5]">
                          {humanizeToken(record.trustTier)}
                        </p>
                      </div>
                      <div>
                        <p
                          className="font-mono text-[10px] uppercase tracking-[0.14em]"
                          style={{ color: "var(--ctx-ink-mute)" }}
                        >
                          Freshness
                        </p>
                        <p className="mt-1 text-[12px] leading-[1.5]">
                          {humanizeToken(record.sourceUpdateLabel)}
                        </p>
                      </div>
                    </div>

                    <p
                      className="mt-3 text-[12px] leading-[1.5]"
                      style={{ color: "var(--ctx-ink-soft)" }}
                    >
                      {usageSummary(record)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    {[
                      "Source",
                      "Trust",
                      "Freshness",
                      "Public status",
                      "Risk",
                      "Used in",
                    ].map((label) => (
                      <th
                        key={label}
                        className="border-b px-3 py-3 font-mono text-[10px] uppercase tracking-[0.14em]"
                        style={{
                          borderColor: "rgba(42, 36, 25, 0.1)",
                          color: "var(--ctx-ink-mute)",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => {
                    const isSelected = record.id === selectedId;
                    const riskTone = RISK_TONE[record.riskLevel];

                    return (
                      <tr
                        key={record.id}
                        style={{
                          background: isSelected
                            ? "rgba(121, 89, 52, 0.07)"
                            : "transparent",
                        }}
                      >
                        <td
                          className="border-b px-3 py-3 align-top"
                          style={{ borderColor: "rgba(42, 36, 25, 0.08)" }}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedId(record.id)}
                            aria-pressed={isSelected}
                            className="w-full text-left"
                          >
                            <span className="block text-[14px] font-semibold">
                              {record.name}
                            </span>
                            <span
                              className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em]"
                              style={{ color: "var(--ctx-ink-mute)" }}
                            >
                              {record.id}
                            </span>
                          </button>
                        </td>
                        <td
                          className="border-b px-3 py-3 align-top text-[12px] leading-[1.5]"
                          style={{ borderColor: "rgba(42, 36, 25, 0.08)" }}
                        >
                          {humanizeToken(record.trustTier)}
                        </td>
                        <td
                          className="border-b px-3 py-3 align-top"
                          style={{ borderColor: "rgba(42, 36, 25, 0.08)" }}
                        >
                          <p className="text-[12px] leading-[1.5]">
                            {humanizeToken(record.sourceUpdateLabel)}
                          </p>
                          <p
                            className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em]"
                            style={{ color: "var(--ctx-ink-mute)" }}
                          >
                            checked {formatDate(record.lastChecked)}
                          </p>
                        </td>
                        <td
                          className="border-b px-3 py-3 align-top"
                          style={{ borderColor: "rgba(42, 36, 25, 0.08)" }}
                        >
                          <p className="max-w-[16rem] text-[12px] leading-[1.5]">
                            {humanizeToken(record.publicUse)}
                          </p>
                          <p
                            className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em]"
                            style={{ color: "var(--ctx-ink-mute)" }}
                          >
                            {humanizeToken(record.currentStatus)}
                          </p>
                        </td>
                        <td
                          className="border-b px-3 py-3 align-top"
                          style={{ borderColor: "rgba(42, 36, 25, 0.08)" }}
                        >
                          <span
                            className="rounded-[999px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
                            style={riskTone}
                          >
                            {RISK_LABEL[record.riskLevel]}
                          </span>
                        </td>
                        <td
                          className="border-b px-3 py-3 align-top text-[12px] leading-[1.5]"
                          style={{ borderColor: "rgba(42, 36, 25, 0.08)" }}
                        >
                          {usageSummary(record)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AtlasSection>

      <section
        className="rounded-[6px] border p-5 xl:sticky xl:top-5"
        style={{
          borderColor: "rgba(42, 36, 25, 0.12)",
          background: "rgba(246, 244, 238, 0.78)",
          boxShadow: "var(--ctx-shadow-card)",
        }}
        aria-live="polite"
      >
        {selectedRecord ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.16em]"
                  style={{ color: "var(--ctx-ink-mute)" }}
                >
                  Selected source
                </p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight">
                  {selectedRecord.name}
                </h2>
                <p
                  className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                  style={{ color: "var(--ctx-ink-mute)" }}
                >
                  {selectedRecord.id}
                </p>
              </div>
              <a
                href={selectedRecord.homepageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[4px] border px-3 py-2 text-[12px] font-medium"
                style={{
                  borderColor: "rgba(42, 36, 25, 0.12)",
                  color: "var(--ctx-ink-soft)",
                }}
              >
                Visit source
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-5">
              <AtlasMetaGrid>
                <AtlasMetaItem
                  label="Trust tier"
                  value={humanizeToken(selectedRecord.trustTier)}
                />
                <AtlasMetaItem
                  label="Public use"
                  value={humanizeToken(selectedRecord.publicUse)}
                />
                <AtlasMetaItem
                  label="Registry status"
                  value={humanizeToken(selectedRecord.currentStatus)}
                />
                <AtlasMetaItem
                  label="Freshness"
                  value={humanizeToken(selectedRecord.sourceUpdateLabel)}
                />
                <AtlasMetaItem
                  label="Last checked"
                  value={formatDate(selectedRecord.lastChecked)}
                />
                <AtlasMetaItem
                  label="Update cadence"
                  value={humanizeToken(selectedRecord.updateCadence)}
                />
                <AtlasMetaItem
                  label="Source type"
                  value={humanizeToken(selectedRecord.sourceType)}
                />
                <AtlasMetaItem
                  label="Steward"
                  value={selectedRecord.steward}
                />
                <AtlasMetaItem
                  label="Geography"
                  value={selectedRecord.geography}
                />
              </AtlasMetaGrid>
            </div>

            <div
              className="mt-5 border-t pt-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ color: "var(--ctx-ink-mute)" }}
              >
                Layer focus
              </p>
              <div className="mt-3">
                {selectedRecord.initialLayers.length > 0 ? (
                  <AtlasPillList
                    items={selectedRecord.initialLayers.map(humanizeToken)}
                  />
                ) : (
                  <p
                    className="text-[13px] leading-[1.55]"
                    style={{ color: "var(--ctx-ink-soft)" }}
                  >
                    No initial layer tags are recorded yet.
                  </p>
                )}
              </div>
            </div>

            <div
              className="mt-5 border-t pt-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ color: "var(--ctx-ink-mute)" }}
              >
                Used in public objects
              </p>
              <p
                className="mt-3 text-[13px] leading-[1.55]"
                style={{ color: "var(--ctx-ink-soft)" }}
              >
                {countLabel(selectedRecord.usedCounts.total, "source link")} across{" "}
                {countLabel(selectedRecord.usedCounts.objects, "civic object")},{" "}
                {countLabel(selectedRecord.usedCounts.events, "event")}, and{" "}
                {countLabel(selectedRecord.usedCounts.places, "place")}.
              </p>

              {selectedRecord.usedInPreview.length > 0 ? (
                <ul className="mt-3">
                  {selectedRecord.usedInPreview.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 border-b py-2.5 last:border-b-0"
                      style={{ borderColor: "rgba(42, 36, 25, 0.08)" }}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] leading-[1.45] font-medium">
                          {item.label}
                        </p>
                        <p
                          className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em]"
                          style={{ color: "var(--ctx-ink-mute)" }}
                        >
                          {USAGE_KIND_LABEL[item.kind]}
                        </p>
                      </div>
                      {item.detailLabel ? (
                        <span
                          className="text-[11px] leading-[1.45]"
                          style={{ color: "var(--ctx-ink-soft)" }}
                        >
                          {humanizeToken(item.detailLabel)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className="mt-3 text-[13px] leading-[1.55]"
                  style={{ color: "var(--ctx-ink-soft)" }}
                >
                  No linked public objects are recorded for this source yet.
                </p>
              )}
            </div>

            <div
              className="mt-5 border-t pt-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ color: "var(--ctx-ink-mute)" }}
              >
                Known limits
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {selectedRecord.knownLimits.map((limit) => (
                  <li
                    key={limit}
                    className="text-[13px] leading-[1.55]"
                    style={{ color: "var(--ctx-ink-soft)" }}
                  >
                    {limit}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="mt-5 border-t pt-4"
              style={{ borderColor: "rgba(42, 36, 25, 0.1)" }}
            >
              <p
                className="font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ color: "var(--ctx-ink-mute)" }}
              >
                Next checks
              </p>
              {selectedRecord.firstChecks.length > 0 ? (
                <ol className="mt-3 list-decimal space-y-2 pl-5">
                  {selectedRecord.firstChecks.map((check) => (
                    <li
                      key={check}
                      className="text-[13px] leading-[1.55]"
                      style={{ color: "var(--ctx-ink-soft)" }}
                    >
                      {check}
                    </li>
                  ))}
                </ol>
              ) : (
                <p
                  className="mt-3 text-[13px] leading-[1.55]"
                  style={{ color: "var(--ctx-ink-soft)" }}
                >
                  No follow-up checks are recorded for this source yet.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-[13px] leading-[1.55]">
            Choose a source row to inspect trust, public-use, and linked-object
            details.
          </p>
        )}
      </section>
    </div>
  );
}
