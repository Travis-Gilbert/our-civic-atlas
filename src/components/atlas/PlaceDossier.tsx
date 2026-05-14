"use client";

import { useEffect, useState } from "react";
import { Tag, Skeleton, Empty } from "antd";
import type {
  PlaceDossier,
  SpatialEvent,
  AtlasSource,
  TimeShape,
} from "@/lib/api/openFlintAtlas";
import { fetchPlaceDossier } from "@/lib/api/openFlintAtlas";

/* ------------------------------------------------------------------ */
/*  Time formatting                                                    */
/* ------------------------------------------------------------------ */

function formatTime(time: TimeShape): string {
  switch (time.shape) {
    case "instant":
      return new Date(time.date).toLocaleDateString();
    case "interval": {
      const start = new Date(time.start).toLocaleDateString();
      if (time.end === null) return `${start} to present`;
      return `${start} to ${new Date(time.end).toLocaleDateString()}`;
    }
    case "first_seen_last_seen": {
      const first = new Date(time.first_seen).toLocaleDateString();
      if (time.last_seen === null) return `${first} to present`;
      return `${first} to ${new Date(time.last_seen).toLocaleDateString()}`;
    }
    case "period":
      // Human-readable bucket: "1980s" / "2024-01" / "2025". Show
      // verbatim; collapsing to a Date loses the bucket granularity.
      return time.period;
    case "observed_at": {
      const stamp = time.observed_at;
      // "1924" -> "1924"; "2026-05-12" -> locale date.
      if (/^\d{4}$/.test(stamp)) return stamp;
      return new Date(stamp).toLocaleDateString();
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Place type colors                                                  */
/* ------------------------------------------------------------------ */

const PLACE_TYPE_TAG_COLOR: Record<string, string> = {
  ward: "blue",
  parcel: "gold",
  building: "default",
  infrastructure: "cyan",
};

const EVENT_TYPE_TAG_COLOR: Record<string, string> = {
  infrastructure_change: "blue",
  environmental: "cyan",
  policy: "gold",
  health: "red",
  community: "purple",
};

const TRUST_TIER_TAG_COLOR: Record<string, string> = {
  official: "green",
  community: "gold",
  automated: "default",
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function EventCard({ event }: { event: SpatialEvent }) {
  return (
    <div
      className="py-3 border-b last:border-b-0"
      style={{ borderColor: "var(--ctx-rule-soft)" }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span
          className="text-[13px] leading-[1.4] font-medium"
          style={{ color: "var(--ctx-ink)" }}
        >
          {event.title}
        </span>
        <Tag
          color={EVENT_TYPE_TAG_COLOR[event.event_type] ?? "default"}
          className="shrink-0"
        >
          {event.event_type.replace(/_/g, " ")}
        </Tag>
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          {formatTime(event.time)}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          {event.confidence}
        </span>
      </div>
      {event.public_caveat && (
        <p
          className="mt-1.5 text-[12px] leading-[1.5] italic"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          {event.public_caveat}
        </p>
      )}
    </div>
  );
}

function SourceRow({ source }: { source: AtlasSource }) {
  return (
    <div
      className="py-2.5 border-b last:border-b-0 flex items-center justify-between gap-2"
      style={{ borderColor: "var(--ctx-rule-soft)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-[13px] leading-[1.4] truncate"
          style={{ color: "var(--ctx-ink)" }}
        >
          {source.name}
        </span>
        <Tag color={TRUST_TIER_TAG_COLOR[source.trust_tier] ?? "default"}>
          {source.trust_tier}
        </Tag>
      </div>
      <span
        className="font-mono text-[10px] tracking-[0.06em] shrink-0"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        {new Date(source.last_checked).toLocaleDateString()}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PlaceDossierPanel                                                  */
/* ------------------------------------------------------------------ */

export type PlaceDossierProps = {
  placeId: string | null;
  onClose: () => void;
};

export function PlaceDossierPanel({ placeId, onClose }: PlaceDossierProps) {
  const [dossier, setDossier] = useState<PlaceDossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (placeId === null) {
      setDossier(null);
      setError(null);
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
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [placeId]);

  /* -- Empty state -------------------------------------------------- */
  if (placeId === null) {
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

  /* -- Loading state ------------------------------------------------ */
  if (loading) {
    return (
      <div className="px-5 py-6">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  /* -- Error state -------------------------------------------------- */
  if (error) {
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

  if (dossier === null) return null;

  const props = dossier.place.properties;

  /* -- Loaded state ------------------------------------------------- */
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--ctx-rule-soft)" }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2
            className="text-[16px] leading-[1.3] font-medium m-0"
            style={{ color: "var(--ctx-ink)" }}
          >
            {props.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dossier"
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-[3px] cursor-pointer"
            style={{
              color: "var(--ctx-ink-mute)",
              background: "transparent",
              border: "none",
            }}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3 h-3">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Tag color={PLACE_TYPE_TAG_COLOR[props.place_type] ?? "default"}>
            {props.place_type}
          </Tag>
          {props.ward_number !== null && (
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Ward {props.ward_number}
            </span>
          )}
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {props.privacy_class}
          </span>
        </div>

        {/* Counts */}
        <div className="flex items-center gap-4 mt-3">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {dossier.source_count} source{dossier.source_count !== 1 ? "s" : ""}
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {dossier.event_count} event{dossier.event_count !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Body (scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Events section */}
        <div className="px-5 py-4">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.14em] mb-2"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            Events
          </p>
          {dossier.events.length === 0 ? (
            <p
              className="text-[13px] leading-[1.55]"
              style={{ color: "var(--ctx-ink-soft)" }}
            >
              No events recorded for this place.
            </p>
          ) : (
            <div>
              {dossier.events.map((ev) => (
                <EventCard key={ev.event_id} event={ev} />
              ))}
            </div>
          )}
        </div>

        {/* Sources section */}
        <div
          className="px-5 py-4 border-t"
          style={{ borderColor: "var(--ctx-rule-soft)" }}
        >
          <p
            className="font-mono text-[10px] uppercase tracking-[0.14em] mb-2"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            Sources
          </p>
          {dossier.sources.length === 0 ? (
            <p
              className="text-[13px] leading-[1.55]"
              style={{ color: "var(--ctx-ink-soft)" }}
            >
              No sources linked.
            </p>
          ) : (
            <div>
              {dossier.sources.map((src) => (
                <SourceRow key={src.source_id} source={src} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
