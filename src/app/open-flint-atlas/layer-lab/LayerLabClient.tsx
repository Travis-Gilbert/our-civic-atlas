"use client";

/**
 * Layer Lab client: the Data Platform Slice 1 verification surface.
 *
 * Everything here CONSUMES the slice-1 contract; it does not redefine it. The
 * map mount (CARTO raster basemap + react-map-gl <Map> + MapboxOverlay) mirrors
 * src/components/atlas/AtlasMap.tsx so the recipe-driven render can be compared
 * for visual parity against the bespoke traffic layer. The time-brush reuses the
 * proven mosaic.timeFilter consumption pattern from OpenFlintAtlasScene.tsx.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, NavigationControl, useControl } from "react-map-gl/maplibre";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import type { Layer as DeckLayer } from "@deck.gl/core";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as vg from "@uwdata/vgplot";

import { useLayers } from "@/lib/atlas/use-layer-catalog";
import { useLayerView } from "@/lib/atlas/use-layer-view";
import {
  createDeckLayerFromRecipe,
  loadLayerViewIntoMosaic,
} from "@/lib/atlas/layer-recipe";
import { getAtlasMosaic, type AtlasMosaic } from "@/lib/atlas/mosaic";
import type { LayerRecipe, LayerView } from "@/lib/atlas/contracts";

// CARTO basemap + Flint bounds copied from AtlasMap.tsx so the verification
// render sits on the same cartographic substrate as the live atlas (parity).
const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [
    {
      id: "carto-base",
      type: "raster",
      source: "carto",
      paint: {
        "raster-opacity": 0.74,
        "raster-saturation": -0.18,
        "raster-contrast": 0.08,
      },
    },
  ],
};

const ATLAS_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-83.92, 42.88],
  [-83.5, 43.18],
];

const INITIAL_VIEW = {
  longitude: -83.692,
  latitude: 43.012,
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

/**
 * deck.gl overlay wrapped as a MapLibre control. Same pattern as
 * AtlasMap.tsx's DeckGLOverlay so layers render on the MapLibre canvas.
 */
function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

const DEFAULT_LAYER_ID = "layer:traffic:flint-downtown";

export function LayerLabClient() {
  const hydrated = useHydrated();
  const { layers, loading: catalogLoading, error: catalogError } = useLayers();
  const [selectedLayerId, setSelectedLayerId] = useState<string>(DEFAULT_LAYER_ID);
  const { view, recipe, loading: viewLoading, error: viewError } = useLayerView(
    hydrated ? selectedLayerId : null,
  );

  const [mosaic, setMosaic] = useState<AtlasMosaic | null>(null);
  const [brushedIds, setBrushedIds] = useState<Set<string> | null>(null);
  const [mosaicNote, setMosaicNote] = useState<string>("");
  const histogramRef = useRef<HTMLDivElement | null>(null);

  // Bring up the Mosaic/DuckDB-WASM coordinator once on the client.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    getAtlasMosaic()
      .then((m) => {
        if (!cancelled) setMosaic(m);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMosaicNote(
            `DuckDB-WASM unavailable: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  // D5 cross-filter: load the recipe-driven view's records into DuckDB, render a
  // vgplot time histogram bound to mosaic.timeFilter, and refilter the deck
  // layer from the brushed range. The histogram itself hits DuckDB via
  // vg.from(table, { filterBy: timeFilter }); the layer reacts to the shared
  // Selection (the proven OpenFlintAtlasScene.tsx pattern).
  useEffect(() => {
    if (!mosaic || !view) return;
    const container = histogramRef.current;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    let chartEl: HTMLElement | null = null;

    const tf = mosaic.timeFilter;
    const records = view.records;

    function recompute() {
      const clauses = (tf as unknown as { clauses?: unknown[] }).clauses ?? [];
      if (!Array.isArray(clauses) || clauses.length === 0) {
        setBrushedIds(null);
        return;
      }
      let lo: number | null = null;
      let hi: number | null = null;
      for (const c of clauses) {
        const value = (c as { value?: unknown }).value;
        if (Array.isArray(value) && value.length === 2) {
          const a = value[0] instanceof Date ? value[0].getTime() : Number(value[0]);
          const b = value[1] instanceof Date ? value[1].getTime() : Number(value[1]);
          if (!Number.isNaN(a) && !Number.isNaN(b)) {
            lo = Math.min(a, b);
            hi = Math.max(a, b);
            break;
          }
        }
      }
      if (lo == null || hi == null) {
        setBrushedIds(null);
        return;
      }
      const ids = new Set<string>();
      for (const record of records) {
        const iso = record.observedAt;
        if (!iso) continue;
        const t = new Date(iso).getTime();
        if (!Number.isNaN(t) && t >= lo && t <= hi) ids.add(record.id);
      }
      setBrushedIds(ids);
    }

    (async () => {
      try {
        const { tableName, recordCount } = await loadLayerViewIntoMosaic(
          view as unknown as LayerView,
        );
        if (cancelled) return;
        if (recordCount === 0) {
          setMosaicNote("Layer has no public records to load into DuckDB.");
          return;
        }
        // observed_at is stored VARCHAR; add a TIMESTAMP column so vgplot can
        // bin it on a time axis without editing the shared loader.
        const q = `"${tableName.replaceAll('"', '""')}"`;
        // Numeric epoch-ms column so the histogram bins on a non-degenerate
        // numeric axis. Binning a TIMESTAMP whose values are all identical makes
        // DuckDB derive a zero time-bucket period ("Period must be greater than
        // 0"); a numeric bin over a padded domain renders cleanly even for a
        // single-observation fixture.
        await mosaic.conn.query(
          `ALTER TABLE ${q} ADD COLUMN IF NOT EXISTS observed_ms BIGINT`,
        );
        await mosaic.conn.query(
          `UPDATE ${q} SET observed_ms = epoch_ms(TRY_CAST(observed_at AS TIMESTAMP))`,
        );
        if (cancelled || !container) return;

        const distinct = await mosaic.conn.query(
          `SELECT COUNT(DISTINCT observed_ms) AS n FROM ${q}`,
        );
        const distinctCount = Number(distinct.toArray()[0]?.n ?? 0);
        setMosaicNote(
          distinctCount <= 1
            ? `${recordCount} records loaded into DuckDB table ${tableName}. ` +
                "Fixture records share one observation time, so the histogram is " +
                "a single bin; brushing it still toggles the layer (mechanism " +
                "verified). Varied-time data lands with the live feed."
            : `${recordCount} records across ${distinctCount} observation times ` +
                `loaded into DuckDB table ${tableName}. Brush the histogram to ` +
                "cross-filter the layer.",
        );

        // Pre-bucket into hour buckets in DuckDB with explicit x1/x2 columns, so
        // the chart never relies on vgplot deriving a bin step from the data
        // extent (which is zero for a single-observation fixture and throws
        // "Period must be greater than 0"). One honest bar per occupied hour.
        const histName = `${tableName}_hist`;
        const hq = `"${histName.replaceAll('"', '""')}"`;
        await mosaic.conn.query(`DROP TABLE IF EXISTS ${hq}`);
        await mosaic.conn.query(
          `CREATE TABLE ${hq} AS
           SELECT (observed_ms - (observed_ms % 3600000)) AS bucket_lo,
                  (observed_ms - (observed_ms % 3600000)) + 3600000 AS bucket_hi,
                  CAST(COUNT(*) AS INTEGER) AS n
           FROM ${q} WHERE observed_ms IS NOT NULL GROUP BY 1, 2`,
        );
        if (cancelled) return;
        // The brush (intervalX) publishes its range into timeFilter; the deck
        // layer reacts via the addEventListener recompute below. The bar itself
        // is static (no filterBy) so it renders robustly regardless of how
        // intervalX binds its predicate field for an x1/x2 rect.
        const chart = await (
          vg.plot as (...args: unknown[]) => Promise<HTMLElement>
        )(
          vg.rectY(vg.from(histName), {
            x1: "bucket_lo",
            x2: "bucket_hi",
            y: "n",
            fill: "var(--ctx-accent, #c14a2c)",
            fillOpacity: 0.78,
          }),
          vg.intervalX({ as: tf }),
          vg.xLabel("Observation time (epoch ms, hour buckets)"),
          vg.yLabel("Records"),
          vg.width(360),
          vg.height(120),
          vg.marginLeft(36),
          vg.marginBottom(30),
          vg.style({
            backgroundColor: "transparent",
            color: "var(--ctx-ink-soft, #4a463f)",
            fontFamily: "var(--font-mono, monospace)",
          }),
        );
        if (cancelled) return;
        container.replaceChildren(chart);
        chartEl = chart;

        unlisten = tf.addEventListener("value", recompute) as unknown as
          | (() => void)
          | undefined;
        recompute();
      } catch (error: unknown) {
        if (!cancelled) {
          setMosaicNote(
            `Mosaic load failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (typeof unlisten === "function") unlisten();
      if (chartEl && chartEl.parentNode) chartEl.parentNode.removeChild(chartEl);
      setBrushedIds(null);
    };
  }, [mosaic, view]);

  // Recipe-driven deck.gl layer, refiltered to the brushed record set.
  const deckLayers: DeckLayer[] = useMemo(() => {
    if (!view || !recipe) return [];
    const filteredView =
      brushedIds == null
        ? view
        : { ...view, records: view.records.filter((r) => brushedIds.has(r.id)) };
    const layer = createDeckLayerFromRecipe({
      // Generated query types and the hand-authored contracts types both mirror
      // the same SDL; bridge the codegen/contracts boundary structurally.
      view: filteredView as unknown as LayerView,
      recipe: recipe as unknown as LayerRecipe,
    });
    return layer ? [layer] : [];
  }, [view, recipe, brushedIds]);

  const shownCount =
    brushedIds == null ? view?.records.length ?? 0 : brushedIds.size;

  return (
    // fixed inset-0 so the map always gets the full viewport size. A plain
    // h-full collapses here because this standalone route does not establish a
    // height chain to the html/body element, leaving MapLibre at its 400x300
    // default.
    <div className="fixed inset-0">
      {hydrated && (
        <Map
          initialViewState={INITIAL_VIEW}
          maxBounds={ATLAS_MAX_BOUNDS}
          minZoom={10.5}
          maxZoom={19}
          maxPitch={75}
          mapStyle={BASEMAP_STYLE}
          style={{ position: "absolute", inset: 0 }}
          attributionControl={false}
          onLoad={(e) => e.target.resize()}
          reuseMaps
        >
          <DeckGLOverlay interleaved layers={deckLayers} />
          <NavigationControl position="bottom-right" />
        </Map>
      )}

      {/* Verification panel */}
      <div
        className="absolute left-4 top-4 z-10 max-h-[calc(100%-2rem)] w-[340px] overflow-auto rounded-lg border border-black/10 bg-[var(--ctx-paper,#f2f1ec)]/95 p-4 text-[13px] shadow-lg backdrop-blur"
        data-testid="layer-lab-panel"
      >
        <h1 className="text-sm font-semibold tracking-tight">
          Layer Lab <span className="font-normal opacity-60">slice 1</span>
        </h1>
        <p className="mt-1 text-xs opacity-70">
          Generic recipe-driven render of registered layers. Catalog -&gt;
          LayerView -&gt; LayerRecipe -&gt; deck.gl, cross-filtered through
          DuckDB/Mosaic.
        </p>

        <h2 className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-60">
          Catalog
        </h2>
        {catalogLoading && <p className="opacity-60">Loading catalog…</p>}
        {catalogError && (
          <p className="text-[var(--ctx-danger,#b1442b)]">
            Catalog error: {catalogError}
          </p>
        )}
        <ul className="mt-1 space-y-1" data-testid="layer-catalog">
          {layers.map((layer) => (
            <li key={layer.id}>
              <button
                type="button"
                onClick={() => setSelectedLayerId(layer.id)}
                className={`w-full rounded border px-2 py-1 text-left text-xs ${
                  layer.id === selectedLayerId
                    ? "border-black/40 bg-black/5 font-medium"
                    : "border-black/10 hover:bg-black/5"
                }`}
              >
                <span className="font-mono">{layer.kind}</span> · {layer.title}
                <span className="block opacity-60">
                  {layer.lifecycleState} · {layer.recordCount} rec ·{" "}
                  {layer.rendererBoundaryId}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <h2 className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-60">
          Selected view
        </h2>
        {viewLoading && <p className="opacity-60">Loading view…</p>}
        {viewError && (
          <p className="text-[var(--ctx-danger,#b1442b)]">View error: {viewError}</p>
        )}
        {view && (
          <div className="text-xs" data-testid="layer-view-summary">
            <p>
              status:{" "}
              <span className="font-mono font-semibold">{view.status}</span>
            </p>
            <p>
              records shown: <span className="font-mono">{shownCount}</span> /{" "}
              {view.records.length}
              {brushedIds != null && " (brushed)"}
            </p>
            {recipe && (
              <p className="opacity-70">
                recipe: {recipe.displayEncoding.deckGlLayerType} on{" "}
                {recipe.displayEncoding.rendererBoundaryId}, color by{" "}
                {recipe.displayEncoding.colorField ?? "n/a"}
              </p>
            )}
          </div>
        )}

        <h2 className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-60">
          Time brush (Mosaic / DuckDB)
        </h2>
        <div ref={histogramRef} data-testid="layer-histogram" className="mt-1" />
        {mosaicNote && (
          <p className="mt-1 text-[11px] opacity-70">{mosaicNote}</p>
        )}
      </div>
    </div>
  );
}
