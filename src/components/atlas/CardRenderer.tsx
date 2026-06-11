"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as vg from "@uwdata/vgplot";
import type { LayerView } from "@/lib/atlas/contracts";
import {
  loadLayerViewIntoAtlasTables,
  tableNameForLayer,
} from "@/lib/atlas/atlas-data";
import type { AtlasMosaic } from "@/lib/atlas/mosaic";
import type {
  AnalyticalSelectionId,
  CardSpec,
} from "@/lib/atlas/analytical-workbench";

type CardRendererProps = {
  spec: CardSpec;
  mosaic: AtlasMosaic | null;
  layerView?: LayerView | null;
  dataVersion?: number;
  selectedPlaceId?: string | null;
  compact?: boolean;
  onBrushIdsChange?: (ids: Set<string> | null) => void;
};

type LoadedTableState = {
  tableName: string | null;
  rowCount: number | null;
  dataVersion: number;
  error: string | null;
};

export function CardRenderer({
  spec,
  mosaic,
  layerView = null,
  dataVersion = 0,
  selectedPlaceId = null,
  compact = false,
  onBrushIdsChange,
}: CardRendererProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState<LoadedTableState>({
    tableName:
      spec.layer.kind === "atlasTable"
        ? spec.layer.tableName
        : layerView
          ? tableNameForLayer(layerView.layerId)
          : null,
    rowCount: null,
    dataVersion,
    error: null,
  });

  const statusLabel =
    spec.layer.kind === "atlasTable"
      ? spec.layer.statusLabel
      : layerView?.status ?? "UNAVAILABLE";

  useEffect(() => {
    if (!mosaic) return;
    const layerSource = spec.layer;
    if (layerSource.kind === "atlasTable") {
      setLoaded((prev) => ({
        ...prev,
        tableName: layerSource.tableName,
        dataVersion,
        error: null,
      }));
      return;
    }
    if (!layerView) return;

    let cancelled = false;
    setLoaded((prev) => ({ ...prev, error: null }));
    loadLayerViewIntoAtlasTables(mosaic, layerView)
      .then((result) => {
        if (cancelled) return;
        setLoaded({
          tableName: result.tableName,
          rowCount: result.recordCount,
          dataVersion: result.dataVersion,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoaded({
          tableName: null,
          rowCount: 0,
          dataVersion,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [mosaic, spec.layer, layerView, dataVersion]);

  useEffect(() => {
    if (!mosaic || !loaded.tableName) return;
    let cancelled = false;
    const q = quoteIdentifier(loaded.tableName);
    const where = selectedPlaceId
      ? ` WHERE place_id = ${quoteSqlText(selectedPlaceId)}`
      : "";
    mosaic.conn
      .query(`SELECT count(*) AS n FROM ${q}${where}`)
      .then((result) => {
        if (cancelled) return;
        const row = result.toArray()[0];
        setLoaded((prev) => ({ ...prev, rowCount: Number(row?.n ?? 0) }));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Catalog Error") && spec.scope.hideWhenEmpty) {
          setLoaded((prev) => ({ ...prev, rowCount: 0 }));
          return;
        }
        setLoaded((prev) => ({ ...prev, error: message }));
      });
    return () => {
      cancelled = true;
    };
  }, [
    mosaic,
    loaded.tableName,
    loaded.dataVersion,
    selectedPlaceId,
    spec.scope.hideWhenEmpty,
  ]);

  const readSelection = useMemo(() => {
    if (!mosaic) return null;
    const selections = spec.selections.reads
      .map((id) => selectionForId(mosaic, id))
      .filter((selection): selection is vg.SelectionHandle => selection != null);
    if (selections.length === 0) return null;
    if (selections.length === 1) return selections[0];
    return vg.Selection.intersect({ include: selections });
  }, [mosaic, spec.selections.reads]);

  useEffect(() => {
    if (!mosaic) return;
    const source = { cardId: "atlas-place-selection" };
    mosaic.placeFilter.update({
      source,
      value: selectedPlaceId ?? undefined,
      predicate: selectedPlaceId
        ? vg.eq("place_id", vg.literal(selectedPlaceId))
        : null,
    });
  }, [mosaic, selectedPlaceId]);

  useEffect(() => {
    if (
      !mosaic ||
      !layerView ||
      !onBrushIdsChange ||
      !spec.selections.writes.includes("timeFilter")
    ) {
      return;
    }
    const tf = mosaic.timeFilter;
    const currentView = layerView;
    const emitBrushIds = onBrushIdsChange;

    function recompute() {
      const range = activeIntervalValue(tf);
      if (!range) {
        emitBrushIds(null);
        return;
      }
      const [lo, hi] = range;
      const ids = new Set<string>();
      for (const record of currentView.records) {
        const raw = record.observedAt ?? record.properties.observed_at;
        if (typeof raw !== "string") continue;
        const time = Date.parse(raw);
        if (!Number.isNaN(time) && time >= lo && time <= hi) ids.add(record.id);
      }
      emitBrushIds(ids);
    }

    const unlisten = tf.addEventListener("value", recompute) as unknown;
    recompute();
    return () => {
      if (typeof unlisten === "function") unlisten();
    };
  }, [mosaic, layerView, onBrushIdsChange, spec.selections.writes]);

  useEffect(() => {
    const tableName = loaded.tableName;
    if (!mosaic || !tableName || !chartRef.current || !loaded.rowCount) {
      return;
    }
    let cancelled = false;
    const container = chartRef.current;
    container.replaceChildren();

    (async () => {
      try {
        const chart =
          spec.renderer === "observablePlot"
            ? await renderObservablePlot(spec, mosaic, tableName, compact)
            : await renderVgplot(spec, mosaic, tableName, readSelection, compact);
        if (cancelled) return;
        container.replaceChildren(chart);
      } catch (error: unknown) {
        if (cancelled) return;
        setLoaded((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    })();

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [
    mosaic,
    loaded.tableName,
    loaded.rowCount,
    loaded.dataVersion,
    compact,
    readSelection,
    spec,
  ]);

  if (loaded.error) {
    return (
      <article className={cardClassName(compact)} data-card-id={spec.id}>
        <CardHeader spec={spec} statusLabel="UNAVAILABLE" />
        <p className="px-3 pb-3 font-mono text-[11px] text-[var(--ctx-danger,#b1442b)]">
          {loaded.error}
        </p>
      </article>
    );
  }

  if (loaded.rowCount === 0 && spec.scope.hideWhenEmpty) return null;

  return (
    <article
      className={cardClassName(compact)}
      data-card-id={spec.id}
      data-layer-id={spec.layer.layerId}
      data-renderer-boundary={spec.rendererBoundaryId}
    >
      <CardHeader spec={spec} statusLabel={statusLabel} />
      <div
        ref={chartRef}
        className={compact ? "h-[96px] px-1 pb-1" : "h-[132px] px-1 pb-2"}
      />
    </article>
  );
}

function CardHeader({
  spec,
  statusLabel,
}: {
  spec: CardSpec;
  statusLabel: string;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-3 py-2">
      <h3 className="text-[12px] font-semibold leading-tight text-[var(--ctx-ink,#27231d)]">
        {spec.title}
      </h3>
      <span className="rounded border border-black/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-[var(--ctx-ink-mute,#71685f)]">
        {statusLabel.replaceAll("_", " ")}
      </span>
    </header>
  );
}

async function renderVgplot(
  spec: CardSpec,
  mosaic: AtlasMosaic,
  tableName: string,
  readSelection: vg.SelectionHandle | null,
  compact: boolean,
): Promise<Element> {
  const source = vg.from(tableName, readSelection ? { filterBy: readSelection } : {});
  const markOptions: Record<string, unknown> = {
    x: spec.encoding.bin ? vg.bin(spec.encoding.x) : spec.encoding.x,
    y: spec.encoding.aggregate === "avg" ? vg.avg("numeric_value") : vg.count(),
    fill: "var(--ctx-accent, #c14a2c)",
    fillOpacity: 0.78,
  };
  if (spec.encoding.colorField) {
    markOptions.fill = spec.encoding.colorField;
  }

  const mark =
    spec.chartType === "dot"
      ? vg.dot(source, markOptions)
      : spec.chartType === "line"
        ? vg.lineY(source, markOptions)
        : spec.chartType === "area"
          ? vg.areaY(source, markOptions)
          : vg.rectY(source, markOptions);

  const interaction = interactionForCard(spec, mosaic);
  return vg.plot(
    mark,
    ...(interaction ? [interaction] : []),
    vg.xLabel(labelForField(spec.encoding.x)),
    vg.yLabel(spec.encoding.aggregate === "avg" ? "Average" : "Records"),
    vg.width(compact ? 300 : 620),
    vg.height(compact ? 96 : 128),
    vg.marginLeft(36),
    vg.marginBottom(30),
    vg.marginRight(12),
    vg.marginTop(8),
    vg.style({
      backgroundColor: "transparent",
      color: "var(--ctx-ink-soft, #4a463f)",
      fontFamily: "var(--font-mono, monospace)",
      fontSize: compact ? "10px" : "11px",
    }),
  );
}

async function renderObservablePlot(
  spec: CardSpec,
  mosaic: AtlasMosaic,
  tableName: string,
  compact: boolean,
): Promise<Element> {
  const Plot = await import("@observablehq/plot");
  const field = spec.encoding.x;
  const q = quoteIdentifier(tableName);
  const result = await mosaic.conn.query(
    `SELECT COALESCE(${quoteIdentifier(field)}, 'unknown') AS label,
            CAST(COUNT(*) AS INTEGER) AS n
     FROM ${q}
     GROUP BY 1
     ORDER BY n DESC
     LIMIT 8`,
  );
  const rows = result.toArray().map((row) => ({
    label: String(row.label ?? "unknown"),
    n: Number(row.n ?? 0),
  }));
  return Plot.plot({
    width: compact ? 300 : 620,
    height: compact ? 96 : 128,
    marginLeft: 96,
    marginRight: 12,
    marginTop: 8,
    marginBottom: 24,
    style: {
      background: "transparent",
      color: "var(--ctx-ink-soft, #4a463f)",
      fontFamily: "var(--font-mono, monospace)",
      fontSize: compact ? "10px" : "11px",
    },
    marks: [
      Plot.barX(rows, {
        x: "n",
        y: "label",
        fill: "var(--ctx-accent, #c14a2c)",
        fillOpacity: 0.78,
      }),
    ],
  });
}

function interactionForCard(spec: CardSpec, mosaic: AtlasMosaic) {
  if (spec.selections.writes.includes("timeFilter")) {
    return vg.intervalX({ as: mosaic.timeFilter });
  }
  const facet = spec.selections.writes.find((id) => id.endsWith("Facet"));
  const selection = facet ? selectionForId(mosaic, facet) : null;
  return selection ? vg.toggleX({ as: selection }) : null;
}

function selectionForId(mosaic: AtlasMosaic, id: AnalyticalSelectionId) {
  switch (id) {
    case "timeFilter":
      return mosaic.timeFilter;
    case "placeFilter":
      return mosaic.placeFilter;
    case "eventTypeFacet":
      return mosaic.facetFilters.eventType;
    case "severityFacet":
      return mosaic.facetFilters.severity;
    case "corridorFacet":
      return mosaic.facetFilters.corridor;
    case "sourceTierFacet":
      return mosaic.facetFilters.sourceTier;
    case "statusFacet":
      return mosaic.facetFilters.status;
  }
}

function activeIntervalValue(selection: vg.SelectionHandle): [number, number] | null {
  const clauses = selection.clauses ?? [];
  for (const clause of clauses) {
    const value = (clause as { value?: unknown }).value;
    if (!Array.isArray(value) || value.length !== 2) continue;
    const a = value[0] instanceof Date ? value[0].getTime() : Number(value[0]);
    const b = value[1] instanceof Date ? value[1].getTime() : Number(value[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return [Math.min(a, b), Math.max(a, b)];
    }
  }
  return null;
}

function labelForField(field: string): string {
  return field.replaceAll("_", " ");
}

function cardClassName(compact: boolean): string {
  return [
    "min-w-0 overflow-hidden rounded-md border border-black/10 bg-[var(--ctx-paper,#f2f1ec)]/92 shadow-sm backdrop-blur",
    compact ? "h-[132px]" : "h-[172px]",
  ].join(" ");
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteSqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
