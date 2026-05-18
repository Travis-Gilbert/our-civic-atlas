/**
 * Lost Flint — historical reconstruction contract.
 *
 * A `HistoricalReconstruction` is a single past-tense civic object positioned
 * in geography, rendered through the porcelain ghost-palette material (see
 * `docs/design/visual-grammar-v1.md`).
 *
 * Per-part confidence (Mass / Facade / Roof / GroundFloor) drives a z-band
 * masking pass in the fragment shader. Different vertical regions of the
 * building scatter at different rates so a visitor reads at a glance which
 * parts of the reconstruction are well-documented and which are inferred.
 *
 * Mass acts as a floor on the other three: any zone's effective confidence
 * is `min(zone, mass)`. If Mass is contested, the whole building scatters
 * regardless of how well-documented the facade or roof are individually.
 *
 * Geometry is expressed as a procedural box parameterized by Mass dimensions
 * + Roof.form (flat / gable / hipped). When a real glTF asset is available,
 * `geometry_url` overrides the procedural path. Splat support lands later
 * via the Brush pipeline.
 *
 * Source registry: every reconstruction lists source ids so the dossier
 * can name what backs it.
 */

export type RoofForm = "flat" | "gable" | "hipped";

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
  /** Above-ground height in meters (includes roof cap if any). */
  height_m: number;
  /** Bearing of the building's long axis, degrees clockwise from north. */
  bearing_deg: number;
  /**
   * Overall (Mass) confidence in [0, 1]. Used as the floor on the per-part
   * confidences below: any zone's effective confidence is
   * `min(zone, confidence)`. If Mass is contested, the whole building scatters.
   *
   * Maps to `ReconstructionSpec.mass.provenance.confidence` in the backend.
   */
  confidence: number;
  /**
   * Per-part confidences. Each in [0, 1]. When omitted, the shader falls
   * back to `confidence` (the Mass value) for that zone, so a Mass-only
   * record still renders sensibly.
   *
   * Maps to `ReconstructionSpec.{facades[0],roof,ground_floor}.provenance.confidence`.
   */
  facade_confidence?: number;
  roof_confidence?: number;
  ground_floor_confidence?: number;
  /**
   * Roof form drives the mesh dispatch: which of the three pre-built
   * geometries (flat box, gable cap, hipped cap) the reconstruction is
   * rendered against. Mass.height_m is the total including the cap.
   *
   * Maps to `ReconstructionSpec.roof.form`. Defaults to "flat" when omitted.
   */
  roof_form?: RoofForm;
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
 * Carriage Town reconstruction seed.
 *
 * Five buildings mirror `our-civic-atlas-backend/migrations/
 * 0004_seed_carriage_town_specs.sql` — positions are parcel centroids
 * along East Kearsley Street (~43.0125N, -83.7000W), heights come from
 * the migration's `story_count * 3.0m`, and per-part confidences are
 * authored here to surface where each building's documentation is strong
 * vs inferred.
 *
 * General authorship rule (also applied in the migration):
 *   - Mass usually highest (footprint + story count are easiest to verify
 *     from extant land records + Sanborn maps).
 *   - Facade slightly lower (material + color often photographed but with
 *     gaps).
 *   - Roof always lowest (roofs are re-clad over time; original material
 *     is rarely documented).
 *   - GroundFloor middling (entries and porches change frequently).
 *
 * These are fixture values pending live GraphQL fetch from the Civic Atlas
 * backend; the structural shape (per-part PartProvenance) is what Phase 6
 * inference will eventually fill in.
 */
export const FLINT_LOST_RECONSTRUCTIONS: HistoricalReconstruction[] = [
  // Positions are clustered just north of the `carriage-town` camera
  // bookmark (-83.708, 43.0108) so the buildings appear in the forward
  // frustum at pitch 58 / bearing 0. Real Carriage Town historic
  // district is bounded by Grand Traverse / Beach / Flint River /
  // I-475; the cluster sits inside that district. Migration 0004's
  // SQL geometry uses a synthetic grid; the frontend fixture takes
  // visible-from-camera positions until live GraphQL ships and the
  // two sources reconcile.
  {
    id: "historical:carriage-town:whaley-house",
    civic_object_id: "building:carriage-town:1",
    name: "Whaley House (1885)",
    description:
      "Three-story italianate brick mansion in the Carriage Town historic "
      + "district. HABS-documented footprint and elevations; slate vs "
      + "asphalt roof material remains contested.",
    position: [-83.7082, 43.0118],
    footprint: { width_m: 14, depth_m: 18 },
    height_m: 12.5,
    bearing_deg: 0,
    confidence: 0.95, // Mass — well documented
    facade_confidence: 0.92,
    roof_confidence: 0.65, // re-clad history
    ground_floor_confidence: 0.82,
    roof_form: "hipped",
    time_start: "1885",
    time_end: null,
    source_ids: ["habs:mi-318", "loc:sanborn:flint:1899:s18"],
    geometry_url: null,
    foundry_asset_url: null,
  },
  {
    id: "historical:carriage-town:628-kearsley",
    civic_object_id: "building:carriage-town:2",
    name: "628 E Kearsley Frame House",
    description:
      "Wood-frame Queen Anne dwelling. Two stories with side gable, asphalt "
      + "shingle (likely original wood shake). Standard late-19th-century "
      + "Carriage Town typology.",
    position: [-83.7076, 43.0119],
    footprint: { width_m: 9, depth_m: 13 },
    height_m: 7.5,
    bearing_deg: 0,
    confidence: 0.85,
    facade_confidence: 0.78,
    roof_confidence: 0.55,
    ground_floor_confidence: 0.70,
    roof_form: "gable",
    time_start: "1892",
    time_end: null,
    source_ids: ["loc:sanborn:flint:1899:s18"],
    geometry_url: null,
    foundry_asset_url: null,
  },
  {
    id: "historical:carriage-town:storefront",
    civic_object_id: "building:carriage-town:3",
    name: "Carriage Town Storefront",
    description:
      "Two-story main-street brick commercial block. Flat parapet roof, tar "
      + "and gravel cover. Storefront type and awning configuration "
      + "uncertain across the building's lifespan.",
    position: [-83.7072, 43.0121],
    footprint: { width_m: 11, depth_m: 16 },
    height_m: 7,
    bearing_deg: 0,
    confidence: 0.78,
    facade_confidence: 0.65,
    roof_confidence: 0.45,
    ground_floor_confidence: 0.50,
    roof_form: "flat",
    time_start: "1905",
    time_end: "1968",
    source_ids: ["sloan:storefront-1925", "loc:sanborn:flint:1899:s18"],
    geometry_url: null,
    foundry_asset_url: null,
  },
  {
    id: "historical:carriage-town:workers-cottage",
    civic_object_id: "building:carriage-town:4",
    name: "Worker's Cottage (1898)",
    description:
      "Single-story wood-frame cottage typical of the post-Buick boom. "
      + "Side gable, wood shingle. Footprint visible on Sanborn 1899 but "
      + "detailed facade documentation is thin.",
    position: [-83.7086, 43.0123],
    footprint: { width_m: 7, depth_m: 10 },
    height_m: 4.5,
    bearing_deg: 0,
    confidence: 0.70,
    facade_confidence: 0.55,
    roof_confidence: 0.40,
    ground_floor_confidence: 0.50,
    roof_form: "gable",
    time_start: "1898",
    time_end: "1962",
    source_ids: ["loc:sanborn:flint:1899:s18"],
    geometry_url: null,
    foundry_asset_url: null,
  },
  {
    id: "historical:carriage-town:stockton-house",
    civic_object_id: "building:carriage-town:5",
    name: "Stockton House (1872)",
    description:
      "Two-story Greek Revival timber-frame residence. Pre-dates the "
      + "Buick-era cottages around it. Documented in genealogical records "
      + "but no surviving photographs.",
    position: [-83.7079, 43.0125],
    footprint: { width_m: 10, depth_m: 14 },
    height_m: 7.5,
    bearing_deg: 0,
    confidence: 0.80,
    facade_confidence: 0.65,
    roof_confidence: 0.50,
    ground_floor_confidence: 0.60,
    roof_form: "gable",
    time_start: "1872",
    time_end: "1955",
    source_ids: ["loc:sanborn:flint:1899:s18", "genesee:stockton-genealogy"],
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
