"use client";

/**
 * Atlas 3D buildings.
 *
 * Two layers, both R3F sub-components of the AtlasThreeScene canvas:
 *
 * 1. AtlasOsmBuildingsLayer — current (or recent) Flint buildings extruded
 *    from OpenStreetMap footprints. Standard warm-stone material. The OSM
 *    GeoJSON fixture is committed to the repo so dev startup doesn't depend
 *    on Overpass; refresh by running `node scripts/fetch-osm-buildings.mjs`.
 *
 * 2. AtlasLostFlintLayer — historical reconstructions rendered with the
 *    porcelain ghost-palette material from Visual Grammar v1. Procedural
 *    extruded boxes for now, sourced from `historical-reconstruction.ts`
 *    seed data. Future iterations will load Brush splats / Blender meshes
 *    when Scene Foundry assets exist.
 *
 * Both layers use the scene's `AtlasWorldProjection` to convert WGS84
 * coordinates into scene-space [x, y, z]. Height meters are scaled by
 * HEIGHT_SCALE to read at the existing scene's stylized height range.
 */

import { useMemo } from "react";
import {
  BufferGeometry,
  ExtrudeGeometry,
  MathUtils,
  Shape,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import osmBuildings from "@/data/open-flint-atlas/fixtures/osm-buildings.json";
import {
  FLINT_LOST_RECONSTRUCTIONS,
  GHOST_PALETTE,
  type HistoricalReconstruction,
} from "@/lib/atlas/historical-reconstruction";
import type { AtlasWorldProjection } from "@/lib/atlas/world-projection";

/** Scene units per real-world meter for vertical extrusion. The horizontal
 * projection lives in `createAtlasWorldProjection`. The atlas is a city-
 * scale scene (54 units ≈ 28 km), so individual building heights would be
 * sub-pixel at literal proportion. We stylize vertically so 6 m buildings
 * read at the same silhouette range as place markers. */
const HEIGHT_SCALE = 0.6;
/** Horizontal stylization multiplier applied to OSM building footprints.
 * At atlas scale a 12 m building projects to ~0.03 scene units — invisible
 * from oblique camera. We expand each footprint around its own centroid
 * so individual buildings are legible while geographic position is
 * preserved. 3.5x balances legibility against z-fighting density. */
const OSM_FOOTPRINT_BOOST = 3.5;
/** Horizontal stylization multiplier for the Lost Flint placeholder boxes.
 * Real building footprints (~10 m) project to ~0.02 scene units at this
 * scene scale — invisible from oblique view. Bump aggressively so the
 * placeholder reads as a distinct landmark rather than a brick lost in
 * the OSM cluster, until real splat/mesh data lands. */
const LOST_FLINT_FOOTPRINT_BOOST = 18;
/** Default extruded height for OSM buildings missing tags. */
const DEFAULT_BUILDING_M = 6;
/** Upper cap for OSM building height in meters. OSM's `building:levels`
 * tag is occasionally absurd (a 1-story warehouse tagged `levels=50`).
 * Capping at 80m suits Flint's actual skyline — tallest is the Mott
 * Foundation Building (~65m). */
const MAX_BUILDING_M = 80;
/** Per-frame ceiling on building count rendered. Keeps the merged geometry
 * inside a comfortable triangle budget for mid-range laptops. */
const OSM_BUILDING_LIMIT = 4000;

type OsmFeature = {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: number[][][] };
  properties: {
    osm_id: number;
    building: string | null;
    name: string | null;
    address: string | null;
    height_meters: number | null;
    levels: number | null;
    year_built: string | null;
    use: string | null;
  };
};

type OsmCollection = {
  type: "FeatureCollection";
  features: OsmFeature[];
};

function buildExtrudedShape(
  ringLngLat: number[][],
  projection: AtlasWorldProjection,
): Shape | null {
  if (ringLngLat.length < 3) return null;
  // First pass: project + collect Vector2s. Shape Y = -world Z because we
  // rotateX(-PI/2) later (Three's Shape lives in the XY plane).
  const points: Vector2[] = [];
  for (const point of ringLngLat) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const [lng, lat] = point as [number, number];
    const [x, , z] = projection.projectLngLat([lng, lat]);
    points.push(new Vector2(x, -z));
  }
  if (points.length < 3) return null;
  // Compute footprint centroid and scale points outward by OSM_FOOTPRINT_BOOST.
  // Geographic position is preserved (centroid unchanged); only the
  // building's own width/depth grow so it's legible at city zoom.
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;
  for (const p of points) {
    p.x = cx + (p.x - cx) * OSM_FOOTPRINT_BOOST;
    p.y = cy + (p.y - cy) * OSM_FOOTPRINT_BOOST;
  }
  const shape = new Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].y);
  }
  return shape;
}

function extrudeBuilding(
  feature: OsmFeature,
  projection: AtlasWorldProjection,
): BufferGeometry | null {
  const ring = feature.geometry.coordinates[0];
  if (!ring) return null;
  const shape = buildExtrudedShape(ring, projection);
  if (!shape) return null;
  const rawHeightMeters =
    feature.properties.height_meters ??
    (feature.properties.levels ? feature.properties.levels * 3 : DEFAULT_BUILDING_M);
  const heightMeters = Math.min(MAX_BUILDING_M, rawHeightMeters);
  const depth = Math.max(0.04, heightMeters * HEIGHT_SCALE);
  const geom = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  // Shape's plane is xy (with our world x, z baked in). Rotate so the
  // extruded depth points up along world y.
  geom.rotateX(-Math.PI / 2);
  return geom;
}

function isFeatureInBounds(
  feature: OsmFeature,
  bounds: AtlasWorldProjection["bounds"],
): boolean {
  const ring = feature.geometry.coordinates[0];
  if (!ring || ring.length === 0) return false;
  // Cheap test against centroid of first 3 vertices.
  let lng = 0;
  let lat = 0;
  let n = 0;
  for (let i = 0; i < Math.min(3, ring.length); i++) {
    const pt = ring[i];
    if (Array.isArray(pt) && pt.length >= 2) {
      lng += pt[0] as number;
      lat += pt[1] as number;
      n++;
    }
  }
  if (n === 0) return false;
  lng /= n;
  lat /= n;
  return (
    lng >= bounds.minLng &&
    lng <= bounds.maxLng &&
    lat >= bounds.minLat &&
    lat <= bounds.maxLat
  );
}

/** Current Flint buildings extruded from OSM footprints. */
export function AtlasOsmBuildingsLayer({
  projection,
  visible = true,
}: {
  projection: AtlasWorldProjection;
  visible?: boolean;
}) {
  const merged = useMemo(() => {
    const features = (osmBuildings as OsmCollection).features
      .filter((f) => isFeatureInBounds(f, projection.bounds))
      .slice(0, OSM_BUILDING_LIMIT);
    const geometries: BufferGeometry[] = [];
    for (const feature of features) {
      const geom = extrudeBuilding(feature, projection);
      if (geom) geometries.push(geom);
    }
    if (geometries.length === 0) return null;
    const out = mergeGeometries(geometries);
    // mergeGeometries may return null if attribute layouts mismatch — rare
    // here since every input is ExtrudeGeometry, but guard anyway.
    geometries.forEach((g) => g.dispose());
    return out;
  }, [projection]);

  if (!visible || !merged) return null;

  return (
    <mesh geometry={merged} position={[0, 0.001, 0]} receiveShadow castShadow>
      <meshStandardMaterial
        color="#7a5e4a"
        roughness={0.84}
        metalness={0.05}
        flatShading
      />
    </mesh>
  );
}

/** Lost Flint historical reconstructions rendered in the porcelain palette. */
export function AtlasLostFlintLayer({
  projection,
  visible = true,
  reconstructions = FLINT_LOST_RECONSTRUCTIONS,
}: {
  projection: AtlasWorldProjection;
  visible?: boolean;
  reconstructions?: HistoricalReconstruction[];
}) {
  if (!visible) return null;

  return (
    <group>
      {reconstructions.map((r) => {
        const [x, , z] = projection.projectLngLat(r.position);
        // Project footprint corners through the projection so building
        // extent scales with the same lng/lat math. Then multiply by
        // LOST_FLINT_FOOTPRINT_BOOST so the placeholder is legible from
        // oblique view — real city scale would put a 14m building at
        // 0.02 scene units, well below pixel size at zoom 12.
        const halfW = r.footprint.width_m * 0.5;
        const halfD = r.footprint.depth_m * 0.5;
        const metersPerDegLat = 111_000;
        const metersPerDegLng =
          metersPerDegLat * Math.cos((r.position[1] * Math.PI) / 180);
        const dLng = halfW / metersPerDegLng;
        const dLat = halfD / metersPerDegLat;
        const [x0, , z0] = projection.projectLngLat([
          r.position[0] - dLng,
          r.position[1] - dLat,
        ]);
        const [x1, , z1] = projection.projectLngLat([
          r.position[0] + dLng,
          r.position[1] + dLat,
        ]);
        const width = Math.abs(x1 - x0) * LOST_FLINT_FOOTPRINT_BOOST;
        const depth = Math.abs(z1 - z0) * LOST_FLINT_FOOTPRINT_BOOST;
        // Lost Flint placeholders need to peek above the OSM cluster so they
        // read as their own thing — porcelain teal embedded in faithful
        // warm stone. Slight vertical lift (0.4 units) prevents z-fighting
        // when the procedural box overlaps an existing OSM footprint.
        const height = Math.max(0.4, r.height_m * HEIGHT_SCALE * 1.15);
        return (
          <mesh
            key={r.id}
            position={[x, height * 0.5 + 0.4, z]}
            rotation={[0, MathUtils.degToRad(r.bearing_deg), 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial
              color={GHOST_PALETTE.shadow}
              emissive={GHOST_PALETTE.mid}
              emissiveIntensity={0.22}
              roughness={0.38}
              metalness={0.04}
            />
          </mesh>
        );
      })}
    </group>
  );
}
