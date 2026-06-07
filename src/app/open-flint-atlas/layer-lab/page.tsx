import type { Metadata } from "next";

import { LayerLabClient } from "./LayerLabClient";

/**
 * Data Platform Slice 1 verification surface ("Layer Lab").
 *
 * Mounts the generic Layer path end to end so D5/D6 can be verified by eye:
 *   - useLayers()        -> the layer catalog (D6)
 *   - useLayerView()     -> the public projection for the selected layer (D3/D6)
 *   - createDeckLayerFromRecipe() -> the recipe-driven deck.gl layer (D5),
 *     rendered on the same CARTO basemap + MapboxOverlay the atlas uses, for
 *     visual parity with the bespoke traffic render.
 *   - loadLayerViewIntoMosaic() + a vgplot histogram bound to mosaic.timeFilter
 *     -> the Mosaic/DuckDB cross-filter (D5): brushing the time histogram
 *     refilters the recipe-driven layer.
 *
 * This is a verification harness, not a product surface: the visual target is
 * parity with the existing render, so it introduces no new visual design. It is
 * deliberately additive and does not touch the live atlas map.
 */
export const metadata: Metadata = {
  title: "Layer Lab | Flint Atlas",
  description:
    "Slice 1 verification: render registered layers through the generic recipe-driven path with a Mosaic time-brush.",
};

export default function LayerLabPage() {
  return <LayerLabClient />;
}
