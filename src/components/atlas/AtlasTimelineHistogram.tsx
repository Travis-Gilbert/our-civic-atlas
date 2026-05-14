"use client";

/**
 * AtlasTimelineHistogram — vgplot timeline histogram bound to the
 * shared Mosaic Coordinator.
 *
 * Replaces the static Observable Plot timeline strip with a brushable
 * histogram. The brush is an ``intervalX`` selection that publishes
 * its range into the atlas's shared ``timeFilter`` Crossfilter
 * Selection. Other Mosaic-connected consumers (the map's event list,
 * the dossier event count, the provenance edge filter) see the
 * filtered slice automatically once they query ``atlas_events`` with
 * ``filterBy: timeFilter`` (or the JS-side ``useFilteredEvents`` hook).
 *
 * The component mounts inside the AtlasShell's timeline slot and
 * renders nothing until ``loadAtlasTables`` has populated DuckDB. It
 * polls a single ``SELECT COUNT(*)`` to know whether the load is
 * done — cheap because DuckDB-WASM is in-process.
 */

import { useEffect, useRef, useState } from "react";
import * as vg from "@uwdata/vgplot";
import type { AtlasMosaic } from "@/lib/atlas/mosaic";

interface AtlasTimelineHistogramProps {
  mosaic: AtlasMosaic | null;
  /** Incremented by the page after DuckDB tables are reloaded. */
  dataVersion?: number;
  /** Render this label when DuckDB hasn't been populated yet. */
  emptyLabel?: string;
}

export function AtlasTimelineHistogram({
  mosaic,
  dataVersion = 0,
  emptyLabel = "Loading timeline…",
}: AtlasTimelineHistogramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Watch the row count so the chart re-mounts after data loads. The
     ``mosaic`` reference changes when the singleton initializes, and
     the row count flips from 0 -> N after loadAtlasTables resolves. */
  useEffect(() => {
    if (!mosaic || dataVersion <= 0) {
      setRowCount(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await mosaic.conn.query(
          "SELECT count(*) AS n FROM atlas_events",
        );
        if (cancelled) return;
        const row = result.toArray()[0];
        setRowCount(Number(row?.n ?? 0));
      } catch (err) {
        if (cancelled) return;
        // Table missing on first paint is expected; suppress error
        if (String(err).includes("Catalog Error")) {
          setRowCount(0);
        } else {
          setError(String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mosaic, dataVersion]);

  /* Mount the vgplot spec once data is present. */
  useEffect(() => {
    if (!mosaic || !rowCount || !containerRef.current) return;
    const container = containerRef.current;
    container.replaceChildren(); // clear any prior chart

    let cancelled = false;
    (async () => {
      try {
        const chart = await vg.plot(
          vg.rectY(
            vg.from("atlas_events", { filterBy: mosaic.timeFilter }),
            {
              x: vg.bin("time_start"),
              y: vg.count(),
              fill: "var(--ctx-accent)",
              fillOpacity: 0.78,
            },
          ),
          vg.intervalX({ as: mosaic.timeFilter }),
          vg.xLabel("Event date"),
          vg.yLabel("Events"),
          vg.width(720),
          vg.height(140),
          vg.marginLeft(40),
          vg.marginBottom(34),
          vg.marginRight(20),
          vg.marginTop(10),
          vg.style({
            backgroundColor: "transparent",
            color: "var(--ctx-ink-soft)",
            fontFamily: "var(--font-mono, monospace)",
          }),
        );
        if (cancelled) return;
        container.appendChild(chart);
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mosaic, rowCount]);

  if (error) {
    return (
      <div
        className="px-4 py-3 font-mono text-[11px]"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        Timeline chart error: {error}
      </div>
    );
  }

  if (!mosaic || rowCount === null) {
    return (
      <div
        className="px-4 py-3 font-mono text-[11px]"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        {emptyLabel}
      </div>
    );
  }

  if (rowCount === 0) {
    return (
      <div
        className="px-4 py-3 font-mono text-[11px]"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        No events to display
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="atlas-timeline-histogram px-2 py-1"
      data-atlas-timeline-histogram="true"
    />
  );
}
