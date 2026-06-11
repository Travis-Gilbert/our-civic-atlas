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

import { useEffect, useMemo, useState } from "react";
import { Map, NavigationControl, useControl } from "react-map-gl/maplibre";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import type { Layer as DeckLayer } from "@deck.gl/core";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { CardRenderer } from "@/components/atlas/CardRenderer";
import { useLayers } from "@/lib/atlas/use-layer-catalog";
import { useLayerView } from "@/lib/atlas/use-layer-view";
import { createDeckLayerFromRecipe } from "@/lib/atlas/layer-recipe";
import { getAtlasMosaic, type AtlasMosaic } from "@/lib/atlas/mosaic";
import type { LayerRecipe, LayerView } from "@/lib/atlas/contracts";
import type { CardSpec } from "@/lib/atlas/analytical-workbench";

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

  const layerLabCard = useMemo<CardSpec>(
    () => ({
      id: `layer-lab-${selectedLayerId}`,
      title: "Layer records by observation",
      layer: { kind: "layerView", layerId: selectedLayerId },
      rendererBoundaryId: "analytics",
      renderer: "vgplot",
      chartType: "rect",
      encoding: {
        x: "observed_ms",
        y: "count",
        bin: "hour",
        aggregate: "count",
        fields: ["id", "observed_ms", "category", "corridor", "confidence"],
      },
      selections: {
        reads: ["timeFilter"],
        writes: ["timeFilter"],
      },
      scope: {
        modes: ["explore"],
        hideWhenEmpty: false,
      },
      honesty: {
        statusSource: "layerView",
        inferredPolicy: "showStatus",
      },
      mobileStrategy: "compact",
    }),
    [selectedLayerId],
  );

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
        className="absolute left-4 top-4 z-10 max-h-[calc(100%-2rem)] w-[340px] overflow-auto rounded-lg border border-black/10 bg-[var(--ctx-paper,#ffffff)]/95 p-4 text-[13px] shadow-lg backdrop-blur"
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
        {view && (
          <div data-testid="layer-histogram" className="mt-1">
            <CardRenderer
              spec={layerLabCard}
              mosaic={mosaic}
              layerView={view as unknown as LayerView}
              compact
              onBrushIdsChange={setBrushedIds}
            />
          </div>
        )}
        {mosaicNote && (
          <p className="mt-1 text-[11px] opacity-70">{mosaicNote}</p>
        )}
      </div>
    </div>
  );
}
