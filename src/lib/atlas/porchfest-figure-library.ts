/**
 * PorchFest figure library (porchfest-two-feature-specs.md Feature 1
 * deliverable 1).
 *
 * The registry keyed by `figureKey`: each entry resolves to renderable
 * geometry by one of two paths, a procedural builder (SimpleMeshLayer) or a
 * GLB asset URL (ScenegraphLayer). Adding a figure is adding one key to
 * `CIVIC_FIGURE_KEYS` (schema side) plus one entry here; the Record is
 * typed exhaustive over the keys, so forgetting either half fails the
 * typecheck. No layer-code change is ever needed (acceptance 3).
 *
 * The split with the civic side is deliberate: the schema and resolver
 * (src/lib/civic) know KEYS only and stay luma.gl-free so the BlockSuite
 * bundle never pulls GL; this module owns geometry and sizes and is only
 * imported by the deck.gl render path.
 *
 * Sizes are meters [widthX, depthY, heightZ], tuned against the category
 * sizes in PorchfestAffordanceMeshLayer so variants read at street zoom:
 * a solo performer is human-scale, a food truck is vehicle-scale, and a
 * variant never dwarfs its category siblings.
 */

import type { Geometry } from "@luma.gl/engine";

import type { CivicFigureKey } from "../civic/civic-object-schema";
import {
  createAmenityMarkerGeometry,
  createEntertainerArtGeometry,
  createEntertainerDanceGeometry,
  createEntertainerStageGeometry,
  createFoodCartGeometry,
  createFoodGrillGeometry,
  createFoodTruckGeometry,
  createMusicBandGeometry,
  createMusicianDjGeometry,
  createMusicianSoloGeometry,
  createVendorCartGeometry,
  createVendorStandGeometry,
  createVendorTableGeometry,
} from "./procedural-porchfest-meshes";

export type FigureSizeM = readonly [number, number, number];

export type FigureLibraryEntry =
  | {
      readonly kind: "procedural";
      readonly build: () => Geometry;
      readonly sizeM: FigureSizeM;
    }
  | {
      readonly kind: "glb";
      /** URL of a .glb asset, served from public/ or remote. */
      readonly url: string;
      readonly sizeM: FigureSizeM;
    };

export const FIGURE_LIBRARY: Record<CivicFigureKey, FigureLibraryEntry> = {
  "musician-solo": {
    kind: "procedural",
    build: createMusicianSoloGeometry,
    sizeM: [2.2, 2.2, 2.0],
  },
  "musician-band": {
    kind: "procedural",
    build: createMusicBandGeometry,
    sizeM: [3.5, 3.5, 2.4],
  },
  "musician-dj": {
    kind: "procedural",
    build: createMusicianDjGeometry,
    sizeM: [3.0, 2.6, 2.2],
  },
  "vendor-tent": {
    kind: "procedural",
    build: createVendorStandGeometry,
    sizeM: [3.5, 3.0, 3.2],
  },
  "vendor-table": {
    kind: "procedural",
    build: createVendorTableGeometry,
    sizeM: [3.0, 2.4, 2.2],
  },
  "vendor-cart": {
    kind: "procedural",
    build: createVendorCartGeometry,
    sizeM: [2.2, 1.6, 1.8],
  },
  "food-truck": {
    kind: "procedural",
    build: createFoodTruckGeometry,
    sizeM: [7.0, 3.2, 3.8],
  },
  "food-cart": {
    kind: "procedural",
    build: createFoodCartGeometry,
    sizeM: [2.4, 2.0, 2.6],
  },
  "food-grill": {
    kind: "procedural",
    build: createFoodGrillGeometry,
    sizeM: [2.6, 2.0, 2.0],
  },
  "entertainer-stage": {
    kind: "procedural",
    build: createEntertainerStageGeometry,
    sizeM: [4.0, 3.0, 2.6],
  },
  "entertainer-dance": {
    kind: "procedural",
    build: createEntertainerDanceGeometry,
    sizeM: [3.0, 2.6, 2.2],
  },
  "entertainer-art": {
    kind: "procedural",
    build: createEntertainerArtGeometry,
    sizeM: [2.4, 2.0, 2.2],
  },
  marker: {
    kind: "procedural",
    build: createAmenityMarkerGeometry,
    sizeM: [2.5, 2.5, 4.0],
  },
};

/**
 * Geometry cache for procedural figure entries, mirroring the category
 * cache in procedural-porchfest-meshes: SimpleMeshLayer uploads a Geometry
 * once per pointer, so re-renders must receive the same instance.
 */
const figureGeometryCache = new Map<CivicFigureKey, Geometry>();

export function getFigureGeometry(key: CivicFigureKey): Geometry | null {
  const entry = FIGURE_LIBRARY[key];
  if (entry.kind !== "procedural") return null;
  const cached = figureGeometryCache.get(key);
  if (cached) return cached;
  const geometry = entry.build();
  figureGeometryCache.set(key, geometry);
  return geometry;
}

/** Test-only: drop the cache so builders can be re-verified. */
export function _resetFigureGeometryCacheForTest(): void {
  figureGeometryCache.clear();
}
