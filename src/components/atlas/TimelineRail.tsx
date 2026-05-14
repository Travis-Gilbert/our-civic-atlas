"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import * as Plot from "@observablehq/plot";
import type { SpatialEvent, TimeShape } from "@/lib/api/openFlintAtlas";

/* ------------------------------------------------------------------ */
/*  Color palette (matches AtlasMap EVENT_TYPE_COLOR)                   */
/* ------------------------------------------------------------------ */

const EVENT_TYPE_HEX: Record<string, string> = {
  infrastructure_change: "#3b82f6",
  environmental: "#2da699",
  policy: "#d9a23b",
  health: "#dc5050",
  community: "#a064dc",
};
const EVENT_TYPE_HEX_DEFAULT = "#8c8c96";

/* ------------------------------------------------------------------ */
/*  Time extraction                                                    */
/* ------------------------------------------------------------------ */

function timeToDate(time: TimeShape): Date | null {
  switch (time.shape) {
    case "instant":
      return new Date(time.date);
    case "interval":
      return new Date(time.start);
    case "first_seen_last_seen":
      return new Date(time.first_seen);
    case "period": {
      // "1980s" -> 1980; "2024-01" / "2025" pass through to Date.
      const decade = time.period.match(/^(\d{4})s$/);
      if (decade) return new Date(decade[1]);
      return new Date(time.period);
    }
    case "observed_at":
      return new Date(time.observed_at);
  }
}

/* ------------------------------------------------------------------ */
/*  Datum projected into the plot                                      */
/* ------------------------------------------------------------------ */

type PlotDatum = {
  date: Date;
  type: string;
  title: string;
  eventId: string;
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type TimelineRailProps = {
  events: SpatialEvent[];
  onEventSelect?: (eventId: string) => void;
  selectedEventId?: string | null;
};

/* ------------------------------------------------------------------ */
/*  TimelineRail                                                       */
/* ------------------------------------------------------------------ */

export function TimelineRail({
  events,
  onEventSelect,
  selectedEventId,
}: TimelineRailProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /* ---- Project events into plot data -------------------------------- */
  const data = useMemo<PlotDatum[]>(() => {
    const result: PlotDatum[] = [];
    for (const ev of events) {
      const date = timeToDate(ev.time);
      if (date === null || isNaN(date.getTime())) continue;
      result.push({
        date,
        type: ev.event_type,
        title: ev.title,
        eventId: ev.event_id,
      });
    }
    return result;
  }, [events]);

  /* ---- Color scale -------------------------------------------------- */
  const colorDomain = useMemo(() => {
    const types = Array.from(new Set(data.map((d) => d.type)));
    types.sort();
    return types;
  }, [data]);

  const colorRange = useMemo(
    () => colorDomain.map((t) => EVENT_TYPE_HEX[t] ?? EVENT_TYPE_HEX_DEFAULT),
    [colorDomain],
  );

  /* ---- Click handler ------------------------------------------------ */
  const handleClick = useCallback(
    (ev: Event) => {
      if (!onEventSelect) return;
      const target = (ev as MouseEvent).target as Element | null;
      if (!target) return;
      /* Observable Plot marks SVG circles; walk up to find data-event-id. */
      const circle = target.closest("[data-event-id]");
      if (circle) {
        const id = circle.getAttribute("data-event-id");
        if (id) onEventSelect(id);
      }
    },
    [onEventSelect],
  );

  /* ---- Render Observable Plot --------------------------------------- */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length === 0) return;

    const width = container.clientWidth || 600;

    const plot = Plot.plot({
      width,
      height: 130,
      marginLeft: 100,
      marginBottom: 30,
      marginTop: 10,
      marginRight: 16,
      style: {
        background: "transparent",
        color: "var(--ctx-ink-soft)",
        fontSize: "10px",
        fontFamily: "var(--font-mono)",
      },
      x: {
        type: "utc",
        label: null,
        grid: true,
      },
      y: {
        label: null,
        domain: colorDomain,
      },
      color: {
        type: "categorical",
        domain: colorDomain,
        range: colorRange,
      },
      marks: [
        Plot.ruleY(colorDomain, {
          stroke: "var(--ctx-rule-soft)",
          strokeWidth: 0.5,
        }),
        Plot.dot(data, {
          x: "date",
          y: "type",
          fill: "type",
          r: 4,
          stroke: (d: PlotDatum) =>
            d.eventId === selectedEventId
              ? "var(--ctx-accent)"
              : "var(--ctx-paper)",
          strokeWidth: (d: PlotDatum) =>
            d.eventId === selectedEventId ? 2 : 0.8,
          title: "title",
          render: (index, scales, values, _dimensions, context) => {
            const g = context.document.createElementNS(
              "http://www.w3.org/2000/svg",
              "g",
            );
            for (const i of index) {
              const circle = context.document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle",
              );
              const cx = values.channels?.x?.value?.[i];
              const cy = values.channels?.y?.value?.[i];
              if (cx == null || cy == null) continue;
              circle.setAttribute("cx", String(cx));
              circle.setAttribute("cy", String(cy));
              circle.setAttribute("r", String(values.channels?.r?.value?.[i] ?? 4));
              const fillVal = values.channels?.fill?.value?.[i];
              circle.setAttribute("fill", fillVal != null ? String(fillVal) : EVENT_TYPE_HEX_DEFAULT);
              const strokeVal = values.channels?.stroke?.value?.[i];
              circle.setAttribute("stroke", strokeVal != null ? String(strokeVal) : "var(--ctx-paper)");
              const swVal = values.channels?.strokeWidth?.value?.[i];
              circle.setAttribute("stroke-width", swVal != null ? String(swVal) : "0.8");
              circle.setAttribute("data-event-id", data[i].eventId);
              circle.setAttribute("cursor", "pointer");

              const titleEl = context.document.createElementNS(
                "http://www.w3.org/2000/svg",
                "title",
              );
              titleEl.textContent = data[i].title;
              circle.appendChild(titleEl);
              g.appendChild(circle);
            }
            return g;
          },
        }),
      ],
    });

    container.replaceChildren(plot);
    plot.addEventListener("click", handleClick);

    return () => {
      plot.removeEventListener("click", handleClick);
      plot.remove();
    };
  }, [data, colorDomain, colorRange, selectedEventId, handleClick]);

  /* ---- Empty state -------------------------------------------------- */
  if (events.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: 130 }}
      >
        <span
          className="font-mono text-[11px] tracking-[0.04em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          No events to display
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ height: 130 }}
    />
  );
}
