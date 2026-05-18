/**
 * AtlasLostFlintDeckLayer — deck.gl renderer for historical Lost Flint
 * reconstructions.
 *
 * Three-tier render strategy, dispatched per reconstruction by what
 * artifact it carries:
 *
 *   1. **`geometry_url` ending in `.glb` / `.gltf`** → ScenegraphLayer
 *      loads the asset and renders it at the reconstruction's
 *      lng/lat with the same orientation contract as the procedural
 *      box. This is the path for Blender / Scene Foundry exports.
 *
 *   2. **`geometry_url` ending in `.splat` / `.ply`** (planned). Will
 *      be routed to a custom Gaussian-splat WebGL layer once Brush
 *      + Burn → WASM lands. Currently falls through to the
 *      procedural box so the reconstruction still shows up.
 *
 *   3. **`geometry_url === null`** → ConfidenceMixMeshLayer (a
 *      `SimpleMeshLayer` subclass) renders a procedural extruded
 *      box. The fragment shader scatters porcelain over faithful
 *      warm-stone via a hash-based noise threshold:
 *
 *          if (noise(localPos) < 1 - confidence) {
 *            fragment = porcelain
 *          } else {
 *            fragment = faithful
 *          }
 *
 *      With confidence = 0.9, ~90% of fragments fall on the
 *      faithful side. With confidence = 0.3, only ~30% do, so the
 *      building reads as mostly ghostly porcelain. This matches the
 *      visual-grammar contract: confidence drives the porcelain
 *      proportion, not the porcelain shade.
 *
 * Visibility contract:
 *   - Hidden when `view_mode === "atlas"` (2D flat view). Lost Flint
 *     belongs to the dimensional layer.
 *   - Hidden when `layerVisibility.lostFlint === false`.
 *
 * Coordinate convention (consistent across both procedural and glTF
 * layers):
 *   - `getPosition` returns `[longitude, latitude]`.
 *   - Local axes: x = east, y = north, z = up. Footprint width is x,
 *     depth is y, height is z. `getOrientation = [pitch, yaw, roll]`
 *     in degrees. Bearing is clockwise from north, so yaw is
 *     `90 - bearing_deg` (deck.gl yaw is CCW from +x).
 */

import { ScenegraphLayer, SimpleMeshLayer } from "@deck.gl/mesh-layers";
import type { Layer } from "@deck.gl/core";
import type { Geometry } from "@luma.gl/engine";

import {
  FLINT_LOST_RECONSTRUCTIONS,
  GHOST_PALETTE,
  type HistoricalReconstruction,
  type RoofForm,
} from "@/lib/atlas/historical-reconstruction";
import {
  createFlatBoxGeometry,
  createGableRoofedBoxGeometry,
  createHippedRoofedBoxGeometry,
} from "@/components/atlas/LostFlintGeometries";
import {
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
  type AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import { ATLAS_DECK_LAYER_IDS } from "@/lib/atlas/renderer-bridge";
import { reconstructionExistsInYear } from "@/lib/atlas/atlas-time";

/**
 * Pre-built roof-form geometry lookup. Each variant runs through the
 * same `ConfidenceMixMeshLayer` subclass but with a different mesh,
 * so a building's `roof_form` selects both the silhouette and (via
 * the shader's z-band masking) the roof confidence visualization.
 *
 * Built once at module load; shared across all instances of a given
 * form to keep deck.gl's draw-call batching effective.
 */
const ROOF_GEOMETRIES: Record<RoofForm, Geometry> = {
  flat: createFlatBoxGeometry(),
  gable: createGableRoofedBoxGeometry(),
  hipped: createHippedRoofedBoxGeometry(),
};

/** Default roof form when a reconstruction omits the field. Flat is
 * the most morphologically neutral and matches the previous behaviour
 * before per-form dispatch landed. */
const DEFAULT_ROOF_FORM: RoofForm = "flat";

/** Translate a CSS hex string like "#9CC0B8" into a deck.gl RGBA tuple
 * with the given alpha. Kept inline rather than imported from a util
 * so this module remains self-contained. */
function hexToRgba(
  hex: string,
  alpha = 255,
): [number, number, number, number] {
  const trimmed = hex.replace(/^#/, "");
  const r = parseInt(trimmed.slice(0, 2), 16);
  const g = parseInt(trimmed.slice(2, 4), 16);
  const b = parseInt(trimmed.slice(4, 6), 16);
  return [r, g, b, alpha];
}

/** Same faithful warm stone the OSM extrusions use, so the
 * confidence-mixed Lost Flint reads as part of the same civic-stone
 * family rather than a foreign material. */
const FAITHFUL_RGB: [number, number, number] = [122, 94, 74];
/** Porcelain mid-tone from GHOST_PALETTE. The "ghost" hue against the
 * civic stone. */
const PORCELAIN_HEX = GHOST_PALETTE.shadow;

function rgbToGlsl([r, g, b]: [number, number, number]): string {
  // GLSL `vec3` in 0..1 range. Four-digit precision is plenty for an
  // 8-bit color channel; this keeps the inline shader source compact.
  return `vec3(${(r / 255).toFixed(4)}, ${(g / 255).toFixed(4)}, ${(b / 255).toFixed(4)})`;
}

const FAITHFUL_GLSL = rgbToGlsl(FAITHFUL_RGB);
const PORCELAIN_GLSL = rgbToGlsl(
  hexToRgba(PORCELAIN_HEX).slice(0, 3) as [number, number, number],
);

/**
 * `SimpleMeshLayer` subclass that paints a per-part confidence
 * visualization onto the procedural box.
 *
 * Four per-instance attributes feed the fragment shader:
 *
 *   - `instanceMassConfidence`         (0..1)  Mass — the building's
 *                                                overall shape, dimensions,
 *                                                story count.
 *   - `instanceFacadeConfidence`       (0..1)  Facade — wall material,
 *                                                color, opening rhythm.
 *   - `instanceRoofConfidence`         (0..1)  Roof — form, material,
 *                                                pitch.
 *   - `instanceGroundFloorConfidence`  (0..1)  GroundFloor — entry,
 *                                                storefront, awning.
 *
 * The fragment shader picks a zone by the mesh-local z position
 * (`vMeshPos.z` in [-0.5, +0.5] for the unit cube):
 *
 *     zFraction = vMeshPos.z + 0.5                    (0..1)
 *     zFraction < 0.15            -> GroundFloor zone
 *     0.15 <= zFraction < 0.85    -> Facade zone (the building body)
 *     0.85 <= zFraction           -> Roof zone
 *
 * The effective confidence at any fragment is then the minimum of
 * the zone's confidence and the Mass confidence. Mass acts as a
 * **floor**: if Mass is contested ("we don't know how tall this
 * building was"), the entire box scatters regardless of how
 * well-documented the Facade is.
 *
 * The hash-based noise threshold + porcelain/faithful tint logic is
 * identical to the previous (single-confidence) implementation;
 * only the threshold input changed.
 *
 * The base `getColor` is set to white in the consumer (see
 * `createLostFlintDeckLayers` below) so the post-lighting `color.rgb`
 * arrives at the filter as a pure lighting factor; the filter
 * multiplies the chosen tint by that factor to preserve Phong
 * shading after the recolour.
 */
class ConfidenceMixMeshLayer extends SimpleMeshLayer<HistoricalReconstruction> {
  static layerName = "ConfidenceMixMeshLayer";

  initializeState() {
    super.initializeState();
    const attributeManager = this.getAttributeManager();
    if (!attributeManager) return;
    attributeManager.addInstanced({
      instanceMassConfidence: {
        size: 1,
        accessor: "getMassConfidence",
        defaultValue: 1,
      },
      instanceFacadeConfidence: {
        size: 1,
        accessor: "getFacadeConfidence",
        defaultValue: 1,
      },
      instanceRoofConfidence: {
        size: 1,
        accessor: "getRoofConfidence",
        defaultValue: 1,
      },
      instanceGroundFloorConfidence: {
        size: 1,
        accessor: "getGroundFloorConfidence",
        defaultValue: 1,
      },
    });
  }

  getShaders() {
    const base = super.getShaders() as {
      inject?: Record<string, string>;
      [key: string]: unknown;
    };
    return {
      ...base,
      inject: {
        ...(base.inject ?? {}),
        // Vertex stage: route the four per-part confidences plus the
        // mesh-local position out to the fragment shader. The
        // fragment shader picks which one to threshold against by
        // looking at vMeshPos.z.
        "vs:#decl": `
          in float instanceMassConfidence;
          in float instanceFacadeConfidence;
          in float instanceRoofConfidence;
          in float instanceGroundFloorConfidence;
          out float vMassConfidence;
          out float vFacadeConfidence;
          out float vRoofConfidence;
          out float vGroundFloorConfidence;
          out vec3 vMeshPos;
        `,
        "vs:#main-end": `
          vMassConfidence = instanceMassConfidence;
          vFacadeConfidence = instanceFacadeConfidence;
          vRoofConfidence = instanceRoofConfidence;
          vGroundFloorConfidence = instanceGroundFloorConfidence;
          vMeshPos = positions.xyz;
        `,
        // Fragment stage: hash-based 2-D value noise, sampled at a
        // frequency tuned so the "bricks" read at a believable
        // building-detail scale (roughly per-square-meter at the
        // boosted footprint scale). Tweak `NOISE_FREQ` if porcelain
        // dots feel too big or too small.
        //
        // Zone thresholds:
        //   GROUND_TOP = 0.15  bottom 15% of building height
        //   ROOF_BOT   = 0.85  top 15% of building height
        //   facade  = the 70% in between
        // Mass.confidence caps every zone (min).
        "fs:#decl": `
          in float vMassConfidence;
          in float vFacadeConfidence;
          in float vRoofConfidence;
          in float vGroundFloorConfidence;
          in vec3 vMeshPos;
          float lostFlintHash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
        `,
        "fs:DECKGL_FILTER_COLOR": `
          const float NOISE_FREQ = 28.0;
          const float GROUND_TOP = 0.15;
          const float ROOF_BOT   = 0.85;
          float zFraction = vMeshPos.z + 0.5;
          float zoneConfidence;
          if (zFraction < GROUND_TOP) {
            zoneConfidence = vGroundFloorConfidence;
          } else if (zFraction < ROOF_BOT) {
            zoneConfidence = vFacadeConfidence;
          } else {
            zoneConfidence = vRoofConfidence;
          }
          // Mass.confidence is a floor on every zone. The whole
          // building scatters at the higher of its zone uncertainty
          // and its overall mass uncertainty.
          float effective = min(zoneConfidence, vMassConfidence);
          float h = lostFlintHash(vMeshPos.xy * NOISE_FREQ + vMeshPos.z * (NOISE_FREQ * 0.7));
          float threshold = 1.0 - clamp(effective, 0.0, 1.0);
          vec3 tint = h < threshold ? ${PORCELAIN_GLSL} : ${FAITHFUL_GLSL};
          // color.rgb arrives as (white base * Phong lighting) so it
          // doubles as the lighting factor. Multiplying by tint
          // re-colours per fragment while preserving the directional
          // shading from the lights.
          color = vec4(tint * color.rgb, color.a);
        `,
      },
    };
  }
}

/**
 * Build the deck.gl layer(s) that render Lost Flint reconstructions.
 *
 * Returns a (possibly empty) array of layers so the call site can
 * spread it onto its layer composition directly.
 *
 * `atlasYear` filters the input set: when provided, only
 * reconstructions whose lifespan covers the year are dispatched to
 * a renderer. When `null` or omitted, all reconstructions pass
 * through — the caller decides whether to render at all (today-mode
 * skips this layer entirely in `AtlasMap`).
 */
export function createLostFlintDeckLayers({
  reconstructions = FLINT_LOST_RECONSTRUCTIONS,
  viewMode,
  visible = true,
  atlasYear = null,
}: {
  reconstructions?: HistoricalReconstruction[];
  viewMode: AtlasSceneViewModeId;
  visible?: boolean;
  atlasYear?: number | null;
}): Layer[] {
  if (!visible) return [];
  if (ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode].extrusionScale === 0) {
    return [];
  }

  // Time-travel filter. When no year is supplied the predicate is a
  // no-op so today-mode callers (which won't call this in the first
  // place under current chrome wiring) still get sensible behaviour
  // if invoked directly from tests or future flows.
  const candidates =
    atlasYear === null
      ? reconstructions
      : reconstructions.filter((r) => reconstructionExistsInYear(r, atlasYear));
  if (candidates.length === 0) return [];

  const proceduralByForm = new Map<RoofForm, HistoricalReconstruction[]>();
  const glTFGroups = new Map<string, HistoricalReconstruction[]>();

  for (const reconstruction of candidates) {
    const url = reconstruction.geometry_url ?? null;
    if (!url || !isGltfUrl(url)) {
      const form = reconstruction.roof_form ?? DEFAULT_ROOF_FORM;
      const bucket = proceduralByForm.get(form);
      if (bucket) {
        bucket.push(reconstruction);
      } else {
        proceduralByForm.set(form, [reconstruction]);
      }
      continue;
    }
    const existing = glTFGroups.get(url);
    if (existing) {
      existing.push(reconstruction);
    } else {
      glTFGroups.set(url, [reconstruction]);
    }
  }

  const layers: Layer[] = [];

  // One ConfidenceMixMeshLayer per roof form. Reconstructions sharing
  // a form batch into a single draw call against the matching
  // geometry. The confidence-mix shader is identical across all
  // three forms — only the mesh silhouette differs.
  for (const [form, items] of proceduralByForm) {
    layers.push(
      new ConfidenceMixMeshLayer({
        id: `${ATLAS_DECK_LAYER_IDS.lostFlint}-${form}`,
        data: items,
        mesh: ROOF_GEOMETRIES[form],
        // Slight exaggeration so the procedural placeholder is
        // legible against the dense OSM stone field at city-scale
        // zoom. Real splat/glTF assets render at literal scale via
        // their own layer and ignore this multiplier.
        sizeScale: 3,
        pickable: true,
        getPosition: (r: HistoricalReconstruction) => [r.position[0], r.position[1]],
        getScale: (r: HistoricalReconstruction) => [r.footprint.width_m, r.footprint.depth_m, r.height_m],
        getTranslation: (r: HistoricalReconstruction) => [0, 0, r.height_m * 0.5],
        getOrientation: (r: HistoricalReconstruction) => [0, 90 - r.bearing_deg, 0],
        // Pure white base color: the Phong-lit value of white is
        // the lighting factor, which the confidence filter uses to
        // re-tint per fragment without losing directional shading.
        getColor: () => [255, 255, 255, 235],
        // Custom accessors consumed by the four `instance*Confidence`
        // attributes added in `initializeState`. Each falls back to
        // the building's overall confidence (which IS Mass.confidence
        // per the type contract) so reconstructions that only carry
        // a top-level confidence still render sensibly.
        getMassConfidence: (r: HistoricalReconstruction) => r.confidence,
        getFacadeConfidence: (r: HistoricalReconstruction) =>
          r.facade_confidence ?? r.confidence,
        getRoofConfidence: (r: HistoricalReconstruction) =>
          r.roof_confidence ?? r.confidence,
        getGroundFloorConfidence: (r: HistoricalReconstruction) =>
          r.ground_floor_confidence ?? r.confidence,
        material: {
          ambient: 0.6,
          diffuse: 0.55,
          shininess: 32,
          specularColor: hexToRgba(GHOST_PALETTE.highlight, 255).slice(
            0,
            3,
          ) as [number, number, number],
        },
        updateTriggers: {
          getMassConfidence: [],
          getFacadeConfidence: [],
          getRoofConfidence: [],
          getGroundFloorConfidence: [],
        },
      // Cast through unknown because the `get*Confidence` accessors
      // are injected by our subclass and not part of SimpleMeshLayer's
      // typed prop surface; the runtime AttributeManager picks each
      // up by name via `accessor: "getMassConfidence"` etc.
      } as unknown as ConstructorParameters<typeof ConfidenceMixMeshLayer>[0]),
    );
  }

  // One ScenegraphLayer per unique glTF URL. Reconstructions that
  // share an asset (e.g. multiple instances of a "frame house" type)
  // batch into a single draw call. Each layer is rotated/scaled
  // per-feature so a single asset can stand in for many positions.
  let gltfLayerIndex = 0;
  for (const [url, items] of glTFGroups) {
    layers.push(
      new ScenegraphLayer<HistoricalReconstruction>({
        id: `${ATLAS_DECK_LAYER_IDS.lostFlint}-gltf-${gltfLayerIndex}`,
        data: items,
        scenegraph: url,
        sizeScale: 1,
        _animations: { "*": { speed: 0 } },
        pickable: true,
        getPosition: (r) => [r.position[0], r.position[1]],
        // glTF authoring convention: assets ship at real-world meter
        // scale already, so we don't multiply by footprint dimensions
        // — that would double-scale the model. The reconstruction's
        // `footprint` is used only by the procedural fallback.
        getScale: () => [1, 1, 1],
        getOrientation: (r) => [0, 90 - r.bearing_deg, 0],
        getColor: () => [255, 255, 255, 255],
      }),
    );
    gltfLayerIndex += 1;
  }

  return layers;
}

/** Loose URL test: anything we can hand to `ScenegraphLayer.scenegraph`
 * directly. Splat / PLY assets are NOT routed here yet; they fall
 * through to the procedural box until a dedicated splat layer
 * exists. */
function isGltfUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith(".glb") || lower.endsWith(".gltf");
}
