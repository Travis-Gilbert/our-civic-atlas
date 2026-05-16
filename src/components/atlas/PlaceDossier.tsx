"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Empty, Skeleton, Tag } from "antd";
import type { PlaceDossier } from "@/lib/api/openFlintAtlas";
import { fetchPlaceDossier } from "@/lib/api/openFlintAtlas";
import {
  DOSSIER_TAB_IDS,
  type DossierMetric,
  type DossierPayload,
  type DossierRelatedObject,
  type DossierSourceCard,
  type DossierTabId,
  type DossierTimelineItem,
} from "@/lib/atlas/dossier-payload";

type DossierLoadState = {
  dossier: PlaceDossier | null;
  loading: boolean;
  error: string | null;
};

const PLACE_TYPE_TAG_COLOR: Record<string, string> = {
  city: "blue",
  corridor: "cyan",
  ward: "blue",
  parcel: "gold",
  building: "default",
  infrastructure: "cyan",
};

const CONFIDENCE_TAG_COLOR: Record<string, string> = {
  high: "green",
  medium: "gold",
  low: "orange",
  unknown: "default",
};

const TRUST_TIER_TAG_COLOR: Record<string, string> = {
  official: "green",
  official_spatial: "green",
  official_statistical: "green",
  curated_public_reference: "blue",
  community: "gold",
  automated: "default",
};

const MOBILE_SNAP_HEIGHTS = {
  peek: "176px",
  half: "54vh",
  full: "calc(100vh - 86px)",
} as const;

const SUPPORT_LABEL: Record<string, string> = {
  high: "strong support",
  medium: "some support",
  low: "needs review",
  unknown: "support pending",
};

type MobileSnap = keyof typeof MOBILE_SNAP_HEIGHTS;

function supportLabel(value: string): string {
  return SUPPORT_LABEL[value] ?? value.replace(/_/g, " ");
}

function usePlaceDossier(placeId: string | null): DossierLoadState {
  const [dossier, setDossier] = useState<PlaceDossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (placeId === null) {
      setDossier(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPlaceDossier(placeId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setDossier(result.data);
      } else {
        setDossier(null);
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [placeId]);

  return { dossier, loading, error };
}

function DossierEmptyState() {
  return (
    <div className="px-5 py-8 flex flex-col items-center justify-center h-full">
      <Empty
        description={
          <span
            className="text-[13px] leading-[1.55]"
            style={{ color: "var(--ctx-ink-soft)" }}
          >
            Select a place on the map to view its dossier
          </span>
        }
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </div>
  );
}

function DossierLoadingState() {
  return (
    <div className="px-5 py-6">
      <Skeleton active paragraph={{ rows: 8 }} />
    </div>
  );
}

function DossierErrorState({ error }: { error: string }) {
  return (
    <div className="px-5 py-6">
      <p
        className="font-mono text-[10px] uppercase tracking-[0.14em] mb-2"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        Error
      </p>
      <p className="text-[13px] leading-[1.55]" style={{ color: "var(--ctx-ink-soft)" }}>
        {error}
      </p>
    </div>
  );
}

function DossierSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="px-5 py-4">
      <p
        className="font-mono text-[10px] uppercase tracking-[0.14em] mb-2"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        {label}
      </p>
      {children}
    </section>
  );
}

function EmptyCopy({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[13px] leading-[1.55]"
      style={{ color: "var(--ctx-ink-soft)" }}
    >
      {children}
    </p>
  );
}

function DossierTabRail({
  payload,
  activeTab,
  onTabChange,
}: {
  payload: DossierPayload;
  activeTab: DossierTabId;
  onTabChange: (tab: DossierTabId) => void;
}) {
  return (
    <div className="atlas-dossier-tabs" role="tablist" aria-label="Dossier sections">
      {payload.tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className="atlas-dossier-tab"
          data-active={activeTab === tab.id ? "true" : "false"}
          onClick={() => onTabChange(tab.id)}
        >
          <span>{tab.label}</span>
          {tab.count !== null && <span className="atlas-dossier-tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

function TimelineCard({ item }: { item: DossierTimelineItem }) {
  return (
    <article
      className="py-3 border-b last:border-b-0"
      style={{ borderColor: "var(--ctx-rule-soft)" }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span
          className="text-[13px] leading-[1.4] font-medium"
          style={{ color: "var(--ctx-ink)" }}
        >
          {item.title}
        </span>
        <Tag color={CONFIDENCE_TAG_COLOR[item.confidence_label] ?? "default"}>
          {supportLabel(item.confidence_label)}
        </Tag>
      </div>
      <p className="text-[12px] leading-[1.5] mb-1" style={{ color: "var(--ctx-ink-soft)" }}>
        {item.summary}
      </p>
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          {item.time_label}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          {item.review_state.replace(/_/g, " ")}
        </span>
      </div>
      {item.caveat && (
        <p
          className="mt-1.5 text-[12px] leading-[1.5] italic"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          {item.caveat}
        </p>
      )}
    </article>
  );
}

function SourceCard({ source }: { source: DossierSourceCard }) {
  return (
    <article
      className="py-3 border-b last:border-b-0"
      style={{ borderColor: "var(--ctx-rule-soft)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] leading-[1.4] font-medium min-w-0"
          style={{ color: "var(--ctx-ink)" }}
        >
          {source.name}
        </a>
        <Tag color={TRUST_TIER_TAG_COLOR[source.trust_tier] ?? "default"}>
          {source.trust_tier.replace(/_/g, " ")}
        </Tag>
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          {source.freshness_label.replace(/_/g, " ")}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          {source.last_checked_at}
        </span>
      </div>
      {source.known_limits[0] && (
        <p className="mt-2 text-[12px] leading-[1.5]" style={{ color: "var(--ctx-ink-soft)" }}>
          {source.known_limits[0]}
        </p>
      )}
    </article>
  );
}

function MetricCard({ metric }: { metric: DossierMetric }) {
  return (
    <article
      className="py-3 border-b last:border-b-0"
      style={{ borderColor: "var(--ctx-rule-soft)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] leading-[1.4] font-medium m-0" style={{ color: "var(--ctx-ink)" }}>
            {metric.label}
          </p>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.14em] mt-1"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {metric.category}
            {metric.release_year ? ` / ${metric.release_year}` : ""}
          </p>
        </div>
        <span className="text-[16px] leading-[1.1] font-semibold" style={{ color: "var(--ctx-ink)" }}>
          {metric.value_label}
        </span>
      </div>
      {metric.caveat && (
        <p className="mt-2 text-[12px] leading-[1.5]" style={{ color: "var(--ctx-ink-soft)" }}>
          {metric.caveat}
        </p>
      )}
    </article>
  );
}

function RelatedObjectRow({ item }: { item: DossierRelatedObject }) {
  return (
    <div
      className="py-2.5 border-b last:border-b-0 flex items-center justify-between gap-3"
      style={{ borderColor: "var(--ctx-rule-soft)" }}
    >
      <div className="min-w-0">
        <p className="text-[13px] leading-[1.4] truncate m-0" style={{ color: "var(--ctx-ink)" }}>
          {item.name}
        </p>
        <p
          className="font-mono text-[10px] uppercase tracking-[0.14em] mt-1"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          {item.relation_label}
        </p>
      </div>
      <Tag>{item.type.replace(/_/g, " ")}</Tag>
    </div>
  );
}

function OverviewTab({ payload }: { payload: DossierPayload }) {
  return (
    <>
      <DossierSection label="Summary">
        <p className="text-[13px] leading-[1.55] mb-3" style={{ color: "var(--ctx-ink-soft)" }}>
          {payload.summary.description}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {payload.summary.civic_context_tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
        {payload.summary.caveat && (
          <p className="mt-3 text-[12px] leading-[1.5] italic" style={{ color: "var(--ctx-ink-soft)" }}>
            {payload.summary.caveat}
          </p>
        )}
      </DossierSection>
      <DossierSection label="Support progress">
        <div className="flex items-center gap-3 mb-2">
          <Tag color={CONFIDENCE_TAG_COLOR[payload.confidence.label] ?? "default"}>
            {supportLabel(payload.confidence.label)}
          </Tag>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {payload.confidence.review_state.replace(/_/g, " ")}
          </span>
        </div>
        <ul className="space-y-1.5 m-0 pl-4">
          {payload.confidence.reasons.map((reason) => (
            <li
              key={reason}
              className="text-[12px] leading-[1.5]"
              style={{ color: "var(--ctx-ink-soft)" }}
            >
              {reason}
            </li>
          ))}
        </ul>
      </DossierSection>
    </>
  );
}

function TimelineList({
  items,
  empty,
}: {
  items: DossierTimelineItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return <EmptyCopy>{empty}</EmptyCopy>;
  }
  return (
    <div>
      {items.map((item) => (
        <TimelineCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function DossierTabContent({
  payload,
  activeTab,
}: {
  payload: DossierPayload;
  activeTab: DossierTabId;
}) {
  if (activeTab === "overview") return <OverviewTab payload={payload} />;

  if (activeTab === "sources") {
    return (
      <DossierSection label="Sources">
        {payload.source_cards.length === 0 ? (
          <EmptyCopy>No sources linked.</EmptyCopy>
        ) : (
          payload.source_cards.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))
        )}
      </DossierSection>
    );
  }

  if (activeTab === "history") {
    return (
      <DossierSection label="History">
        <TimelineList
          items={payload.related_historical_events}
          empty="No historical records are published for this subject yet."
        />
      </DossierSection>
    );
  }

  if (activeTab === "nearby") {
    return (
      <DossierSection label="Nearby">
        {payload.nearby_objects.length === 0 ? (
          <EmptyCopy>No nearby public objects are linked yet.</EmptyCopy>
        ) : (
          payload.nearby_objects.map((item) => (
            <RelatedObjectRow key={item.id} item={item} />
          ))
        )}
      </DossierSection>
    );
  }

  if (activeTab === "interventions") {
    return (
      <DossierSection label="Interventions">
        <TimelineList
          items={payload.related_interventions}
          empty="No public intervention records are linked to this subject yet."
        />
      </DossierSection>
    );
  }

  if (activeTab === "safety") {
    return (
      <DossierSection label="Safety">
        <TimelineList
          items={payload.related_safety_records}
          empty="No aggregate street-safety records are linked to this subject yet."
        />
      </DossierSection>
    );
  }

  if (activeTab === "metrics") {
    return (
      <DossierSection label="Metrics">
        {payload.metrics.length === 0 ? (
          <EmptyCopy>No metrics are published for this subject yet.</EmptyCopy>
        ) : (
          payload.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))
        )}
      </DossierSection>
    );
  }

  if (activeTab === "evidence") {
    return (
      <DossierSection label="Source support">
        <p className="text-[13px] leading-[1.55] mb-3" style={{ color: "var(--ctx-ink-soft)" }}>
          {payload.evidence_graph_ref.panel_label} is available for this subject
          through the public provenance endpoint.
        </p>
        <a
          href={payload.evidence_graph_ref.api_url}
          className="font-mono text-[11px] tracking-[0.04em]"
          style={{ color: "var(--ctx-ink)" }}
        >
          {payload.evidence_graph_ref.node_id}
        </a>
      </DossierSection>
    );
  }

  return (
    <DossierSection label="Contribute">
      <div className="space-y-3">
        {payload.contribution_actions.map((action) => (
          <div
            key={action.id}
            className="rounded-[6px] px-3 py-3"
            style={{
              border: "1px solid var(--ctx-rule-soft)",
              background: "rgba(255, 255, 255, 0.28)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium" style={{ color: "var(--ctx-ink)" }}>
                {action.label}
              </span>
              <Tag>{action.status}</Tag>
            </div>
            {action.reason && (
              <p className="text-[12px] leading-[1.5] mt-2" style={{ color: "var(--ctx-ink-soft)" }}>
                {action.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </DossierSection>
  );
}

function DossierContent({
  dossier,
  onClose,
  showCloseButton = true,
  variant,
}: {
  dossier: PlaceDossier;
  onClose: () => void;
  showCloseButton?: boolean;
  variant: "panel" | "sheet";
}) {
  const [activeTab, setActiveTab] = useState<DossierTabId>("overview");
  const payload = dossier.payload;
  const subjectType = payload.subject.type.replace(/_/g, " ");

  useEffect(() => {
    setActiveTab("overview");
  }, [payload.subject.id]);

  const visibleTabs = useMemo(
    () =>
      DOSSIER_TAB_IDS.filter((id) =>
        payload.tabs.some((tab) => tab.id === id),
      ),
    [payload.tabs],
  );

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab("overview");
  }, [activeTab, visibleTabs]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--ctx-rule-soft)" }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h2
              className="text-[16px] leading-[1.3] font-medium m-0"
              style={{ color: "var(--ctx-ink)" }}
            >
              {payload.subject.name}
            </h2>
            <p
              className="font-mono text-[10px] uppercase tracking-[0.14em] mt-1"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              {payload.summary.status_label}
            </p>
          </div>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dossier"
              className="atlas-dossier-close"
            >
              <svg
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                className="w-3 h-3"
              >
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Tag color={PLACE_TYPE_TAG_COLOR[payload.subject.type] ?? "default"}>
            {subjectType}
          </Tag>
          <Tag color={CONFIDENCE_TAG_COLOR[payload.confidence.label] ?? "default"}>
            {supportLabel(payload.confidence.label)}
          </Tag>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {payload.confidence.source_count} source
            {payload.confidence.source_count === 1 ? "" : "s"}
          </span>
        </div>

        <DossierTabRail
          payload={payload}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <div
        className={
          variant === "sheet"
            ? "flex-1 overflow-y-auto min-h-0 pb-3"
            : "flex-1 overflow-y-auto min-h-0"
        }
      >
        <DossierTabContent payload={payload} activeTab={activeTab} />
      </div>
    </div>
  );
}

export type PlaceDossierProps = {
  placeId: string | null;
  onClose: () => void;
  showCloseButton?: boolean;
};

export function PlaceDossierPanel({
  placeId,
  onClose,
  showCloseButton = true,
}: PlaceDossierProps) {
  const { dossier, loading, error } = usePlaceDossier(placeId);

  if (placeId === null) return <DossierEmptyState />;
  if (loading) return <DossierLoadingState />;
  if (error) return <DossierErrorState error={error} />;
  if (dossier === null) return null;

  return (
    <DossierContent
      dossier={dossier}
      onClose={onClose}
      showCloseButton={showCloseButton}
      variant="panel"
    />
  );
}

export function MobileDossierSheet({ placeId, onClose }: PlaceDossierProps) {
  const [snap, setSnap] = useState<MobileSnap>("half");
  const { dossier, loading, error } = usePlaceDossier(placeId);

  useEffect(() => {
    if (placeId !== null) setSnap("half");
  }, [placeId]);

  if (placeId === null) return null;

  const style = {
    height: MOBILE_SNAP_HEIGHTS[snap],
  } satisfies CSSProperties;

  return (
    <aside
      className="atlas-mobile-dossier-sheet"
      style={style}
      aria-label="Place dossier"
      data-snap={snap}
    >
      <div className="atlas-mobile-dossier-grip" aria-hidden="true" />
      <div className="atlas-mobile-dossier-snaps" aria-label="Dossier height controls">
        {(["peek", "half", "full"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-label={`Set dossier ${id} height`}
            aria-pressed={snap === id}
            data-active={snap === id ? "true" : "false"}
            onClick={() => setSnap(id)}
          >
            <span />
          </button>
        ))}
      </div>
      {loading && <DossierLoadingState />}
      {error && <DossierErrorState error={error} />}
      {!loading && !error && dossier && (
        <DossierContent dossier={dossier} onClose={onClose} variant="sheet" />
      )}
    </aside>
  );
}
