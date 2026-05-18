/**
 * Lost Flint — historical reconstruction contract.
 *
 * A `HistoricalReconstruction` is a single past-tense civic object positioned
 * in geography, intended for rendering inside the R3F Atlas Scene with the
 * porcelain ghost-palette material (see `docs/design/visual-grammar-v1.md`).
 *
 * Confidence drives the porcelain-vs-faithful ratio at render time. The shader
 * (TODO) scatters porcelain over the mesh using noise weighted by this score —
 * no per-element data needed in the contract itself.
 *
 * Geometry is currently expressed as a procedural footprint + height. As the
 * Brush pipeline produces real Gaussian splats, this contract will extend with
 * an optional `splat_url` pointer; the renderer will prefer the splat when
 * present and fall back to the procedural box otherwise.
 *
 * Source registry: every reconstruction must list source ids so the dossier
 * (expanded island place page) can name what backs it.
 */

export type HistoricalReconstruction = {
  /** Stable id for this reconstruction. Prefix: `historical:`. */
  id: string;
  /** Civic object this belongs to (the place / building it reconstructs). */
  civic_object_id: string;
  /** Resident-facing name. */
  name: string;
  /** Plain-language description for the place page. */
  description: string;
  /** WGS84 anchor point: [longitude, latitude]. */
  position: [number, number];
  /** Procedural footprint in meters, used until a real mesh/splat is available. */
  footprint: { width_m: number; depth_m: number };
  /** Above-ground height in meters. */
  height_m: number;
  /** Bearing of the building's long axis, degrees clockwise from north. */
  bearing_deg: number;
  /** 0..1; drives porcelain coverage at render time. */
  confidence: number;
  /** Year the structure was built (string for human readability). */
  time_start: string | null;
  /** Year the structure was demolished or vanished, or null if still standing. */
  time_end: string | null;
  /** Source ids backing this reconstruction (must exist in source-registry). */
  source_ids: string[];
  /**
   * Optional URL to a real geometry artifact. Routed to a renderer
   * by `createLostFlintDeckLayers` (`AtlasLostFlintDeckLayer.ts`):
   *   - `.glb` / `.gltf`  → `ScenegraphLayer`, one draw call per unique URL
   *   - `.splat` / `.ply` → falls through to the procedural confidence-mix
   *     box until a dedicated Gaussian-splat layer ships
   *   - `null`            → procedural extruded box with per-fragment
   *     confidence-driven faithful/porcelain scatter
   *
   * Asset hosting convention: place glTF assets at
   * `public/atlas/historical/<slug>/<file>.glb` and reference them as
   * `/atlas/historical/<slug>/<file>.glb`. Same-origin keeps CORS out
   * of the loader path; deck.gl reads from the standard Next.js
   * static asset pipeline.
   */
  geometry_url: string | null;
  /** Optional URL to a Scene Foundry asset metadata record (provenance). */
  foundry_asset_url: string | null;
};

/**
 * Seed data for the first Lost Flint slice. Single hardcoded Carriage Town
 * landmark so the R3F scene has something to render before the Theseus
 * retrieval pipeline brings live data online.
 *
 * Hubbard & Co. is illustrative — historical record needs verification before
 * this surfaces in any public route. Treat as a development placeholder.
 */
export const FLINT_LOST_RECONSTRUCTIONS: HistoricalReconstruction[] = [
  {
    id: "historical:carriage-town:hubbard-drug",
    civic_object_id: "place:carriage-town",
    name: "Hubbard & Co. Drug Store (placeholder)",
    description:
      "Two-story commercial block at approximately W. 2nd & Detroit Street. " +
      "Placeholder reconstruction until the Theseus historical pipeline lands " +
      "verified sources.",
    position: [-83.7035, 43.0185],
    footprint: { width_m: 14, depth_m: 22 },
    height_m: 12,
    bearing_deg: 0,
    confidence: 0.85,
    time_start: "1898",
    time_end: "1971",
    source_ids: ["mapflint"],
    geometry_url: null,
    foundry_asset_url: null,
  },
  {
    id: "historical:carriage-town:industrial-shed",
    civic_object_id: "place:carriage-town",
    name: "Industrial outbuilding (placeholder)",
    description:
      "Sawtooth-roof factory outbuilding near the rail corridor, low " +
      "documentation. Placeholder until verified.",
    position: [-83.7045, 43.0175],
    footprint: { width_m: 32, depth_m: 18 },
    height_m: 9,
    bearing_deg: 12,
    confidence: 0.3,
    time_start: "1910",
    time_end: "1948",
    source_ids: ["mapflint"],
    geometry_url: null,
    foundry_asset_url: null,
  },
  {
    id: "historical:carriage-town:bungalow",
    civic_object_id: "place:carriage-town",
    name: "Worker's bungalow (placeholder)",
    description:
      "Single-story wood-frame residence typical of the post-Buick boom. " +
      "Placeholder until verified.",
    position: [-83.703, 43.019],
    footprint: { width_m: 9, depth_m: 12 },
    height_m: 5,
    bearing_deg: 0,
    confidence: 0.6,
    time_start: "1908",
    time_end: "1965",
    source_ids: ["mapflint"],
    geometry_url: null,
    foundry_asset_url: null,
  },
];

/**
 * Ghost palette constants mirrored from `visual-grammar-v1.md`. Source of
 * truth lives in that doc; we duplicate the values here so the R3F scene can
 * apply them without importing CSS variables.
 */
export const GHOST_PALETTE = {
  highlight: "#F2F8F7",
  mid: "#CFE0DC",
  shadow: "#9CC0B8",
} as const;

/**
 * Helper: render-time porcelain ratio. For the first iteration the whole
 * structure renders in the porcelain palette regardless of confidence. The
 * future shader will read this value as a uniform and scatter porcelain vs
 * a faithful material based on noise.
 */
export function porcelainRatio(confidence: number): number {
  return 1 - Math.max(0, Math.min(1, confidence));
}
