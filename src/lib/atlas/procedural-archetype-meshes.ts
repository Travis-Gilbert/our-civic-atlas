/**
 * Procedural archetype meshes for the Phase A.5 sketch-model render.
 *
 * For each BuildingFabricArchetype, this module produces a unit-cube
 * Geometry (positions in [-0.5, +0.5]^3, z = height) suitable for use
 * as the shared mesh on a deck.gl SimpleMeshLayer. The caller hands
 * per-instance position (centroid lng/lat), orientation (yaw = front
 * bearing), and non-uniform scale ([widthM, depthM, heightM]) to the
 * layer, and the GPU draws as many copies as there are buildings.
 *
 * Coordinate convention (shared with LostFlintGeometries.ts):
 *
 *   - Unit footprint: x, y in [-0.5, +0.5]; z in [-0.5, +0.5].
 *   - x axis aligns to the building's front edge (frontage). After the
 *     instance's yaw rotation, +x points along the street.
 *   - y axis aligns to the depth direction (front-to-back). The face
 *     at y = -0.5 is the street-facing front facade; y = +0.5 is the
 *     rear.
 *   - z is height. The body box ends at z = +0.35, leaving the top
 *     15% for roof caps. This matches LostFlintGeometries so a single
 *     z-band shader (if added later) can shade both data sources
 *     uniformly.
 *
 * Why a separate module from LostFlintGeometries:
 *
 *   - LostFlintGeometries is keyed by `roof_form` (flat / gable /
 *     hipped) for procedural Lost Flint historical reconstructions.
 *   - This module is keyed by `BuildingFabricArchetype` (six categories
 *     of present-day building) for the live atlas's sketch-model
 *     render. The dispatcher routes archetypes to either an existing
 *     LostFlint geometry (flat/gable/hipped) or one of three new
 *     archetype-specific shapes (sawtooth/parapet/storefront).
 *
 * Why three new shapes (not just flat/gable/hipped):
 *
 *   - Industrial buildings (factories, sheds): sawtooth roof with
 *     parallel ridges across the frontage. Reads as "factory" at a
 *     glance and matches Buick's pattern across Flint's east side.
 *   - Commercial buildings (downtown): flat roof with a raised parapet
 *     band on the perimeter. Reads as "commercial block" not "house."
 *   - Mixed-use storefronts: flat roof with a recessed band on the
 *     front facade at the ground floor (the storefront recess). Reads
 *     as "mixed-use" with retail at street level.
 *
 * The remaining three archetypes (residential_single, residential_multi,
 * present_civic) and the unknown fallback route to the existing
 * LostFlint shapes:
 *
 *   - residential_single -> gable (Carriage Town frame house default).
 *   - residential_multi  -> flat (apartment slab default).
 *   - present_civic      -> hipped (civic anchor with pyramidal roof).
 *   - present_unknown    -> flat (simple extruded box; matches the
 *                                  prior flat extrusion exactly).
 */

import { Geometry } from "@luma.gl/engine";

import {
  createFlatBoxGeometry,
  createGableRoofedBoxGeometry,
  createHippedRoofedBoxGeometry,
} from "../../components/atlas/LostFlintGeometries.ts";
import type { BuildingFabricArchetype } from "./building-fabric.ts";

/* ------------------------------------------------------------------ */
/*  Local helpers (mirror of LostFlintGeometries internals).           */
/*  Duplicated rather than imported so LostFlintGeometries stays an    */
/*  opaque, locked-in module. The two helper sets are intentionally    */
/*  identical so future deduplication is a mechanical refactor.        */
/* ------------------------------------------------------------------ */

type Vec3 = readonly [number, number, number];

const ROOF_CAP_Z = 0.35;

const BODY_CORNERS = {
  bottomSW: [-0.5, -0.5, -0.5] as const,
  bottomSE: [0.5, -0.5, -0.5] as const,
  bottomNE: [0.5, 0.5, -0.5] as const,
  bottomNW: [-0.5, 0.5, -0.5] as const,
  capSW: [-0.5, -0.5, ROOF_CAP_Z] as const,
  capSE: [0.5, -0.5, ROOF_CAP_Z] as const,
  capNE: [0.5, 0.5, ROOF_CAP_Z] as const,
  capNW: [-0.5, 0.5, ROOF_CAP_Z] as const,
};

function pushQuad(
  positions: number[],
  normals: number[],
  indices: number[],
  v0: Vec3,
  v1: Vec3,
  v2: Vec3,
  v3: Vec3,
  normal: Vec3,
): void {
  const baseIndex = positions.length / 3;
  for (const v of [v0, v1, v2, v3]) {
    positions.push(v[0], v[1], v[2]);
    normals.push(normal[0], normal[1], normal[2]);
  }
  indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
  indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
}

function pushTri(
  positions: number[],
  normals: number[],
  indices: number[],
  v0: Vec3,
  v1: Vec3,
  v2: Vec3,
  normal: Vec3,
): void {
  const baseIndex = positions.length / 3;
  for (const v of [v0, v1, v2]) {
    positions.push(v[0], v[1], v[2]);
    normals.push(normal[0], normal[1], normal[2]);
  }
  indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
}

function triNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
  const ax = v1[0] - v0[0];
  const ay = v1[1] - v0[1];
  const az = v1[2] - v0[2];
  const bx = v2[0] - v0[0];
  const by = v2[1] - v0[1];
  const bz = v2[2] - v0[2];
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len] as const;
}

function appendBodyBoxWalls(
  positions: number[],
  normals: number[],
  indices: number[],
  capZ: number = ROOF_CAP_Z,
): void {
  const c = {
    bottomSW: [-0.5, -0.5, -0.5] as const,
    bottomSE: [0.5, -0.5, -0.5] as const,
    bottomNE: [0.5, 0.5, -0.5] as const,
    bottomNW: [-0.5, 0.5, -0.5] as const,
    capSW: [-0.5, -0.5, capZ] as const,
    capSE: [0.5, -0.5, capZ] as const,
    capNE: [0.5, 0.5, capZ] as const,
    capNW: [-0.5, 0.5, capZ] as const,
  };
  // Bottom face (outward normal -z). Wound CCW viewed from below.
  pushQuad(
    positions, normals, indices,
    c.bottomSW, c.bottomNW, c.bottomNE, c.bottomSE,
    [0, 0, -1],
  );
  // South wall (-y).
  pushQuad(
    positions, normals, indices,
    c.bottomSW, c.bottomSE, c.capSE, c.capSW,
    [0, -1, 0],
  );
  // East wall (+x).
  pushQuad(
    positions, normals, indices,
    c.bottomSE, c.bottomNE, c.capNE, c.capSE,
    [1, 0, 0],
  );
  // North wall (+y).
  pushQuad(
    positions, normals, indices,
    c.bottomNE, c.bottomNW, c.capNW, c.capNE,
    [0, 1, 0],
  );
  // West wall (-x).
  pushQuad(
    positions, normals, indices,
    c.bottomNW, c.bottomSW, c.capSW, c.capNW,
    [-1, 0, 0],
  );
}

function buildGeometry(
  positions: number[],
  normals: number[],
  indices: number[],
): Geometry {
  return new Geometry({
    topology: "triangle-list",
    attributes: {
      POSITION: { size: 3, value: new Float32Array(positions) },
      NORMAL: { size: 3, value: new Float32Array(normals) },
    },
    indices: { size: 1, value: new Uint32Array(indices) },
  });
}

/* ------------------------------------------------------------------ */
/*  Sawtooth roof (industrial sheds + factories).                      */
/*                                                                     */
/*  Three parallel sawtooth ridges across the x axis. Each tooth has   */
/*  a steep face on its +x side (vertical glazing in the real shed)    */
/*  and a shallow back slope on its -x side (the actual roof plane).   */
/*  Ridges run along the y axis (perpendicular to the street). This    */
/*  matches the canonical "factory roof" silhouette readable from      */
/*  satellite views: the saw teeth point away from the street so the   */
/*  glazing faces are out of the sun. Reads as "industrial" at a       */
/*  glance.                                                            */
/* ------------------------------------------------------------------ */

export function createSawtoothRoofedBoxGeometry(
  toothCount: number = 4,
): Geometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Lower the cap so the saw teeth have room to read.
  const sawCapZ = 0.15;
  appendBodyBoxWalls(positions, normals, indices, sawCapZ);

  const peakZ = 0.5;
  const valleyZ = sawCapZ;
  // Stripe the x axis [-0.5, +0.5] into `toothCount` teeth.
  const stripeWidth = 1 / toothCount;
  for (let i = 0; i < toothCount; i += 1) {
    const x0 = -0.5 + i * stripeWidth;
    const x1 = x0 + stripeWidth;
    // Each tooth: shallow back slope from (x0, valleyZ) up to (x1, peakZ),
    // then a vertical face from (x1, peakZ) down to (x1, valleyZ) where
    // the next tooth's valley begins.
    const v_backSW: Vec3 = [x0, -0.5, valleyZ];
    const v_backSE: Vec3 = [x1, -0.5, peakZ];
    const v_backNE: Vec3 = [x1, 0.5, peakZ];
    const v_backNW: Vec3 = [x0, 0.5, valleyZ];
    // Back slope (sloped roof face, normal tilted up + west).
    pushQuad(
      positions, normals, indices,
      v_backSW, v_backSE, v_backNE, v_backNW,
      triNormal(v_backSW, v_backSE, v_backNE),
    );
    // Vertical face at x1, dropping from peakZ to valleyZ.
    // Skip the last tooth's vertical face (it would clip outside the
    // unit cube at x=+0.5; the east wall already closes that edge).
    if (i < toothCount - 1) {
      const v_frontSE: Vec3 = [x1, -0.5, peakZ];
      const v_frontSE_low: Vec3 = [x1, -0.5, valleyZ];
      const v_frontNE_low: Vec3 = [x1, 0.5, valleyZ];
      const v_frontNE: Vec3 = [x1, 0.5, peakZ];
      pushQuad(
        positions, normals, indices,
        v_frontSE, v_frontSE_low, v_frontNE_low, v_frontNE,
        [1, 0, 0],
      );
    }
    // South gable triangle at -y face: closes the tooth's end wall.
    pushTri(
      positions, normals, indices,
      [x0, -0.5, valleyZ] as const,
      [x1, -0.5, valleyZ] as const,
      [x1, -0.5, peakZ] as const,
      [0, -1, 0],
    );
    // North gable triangle at +y face.
    pushTri(
      positions, normals, indices,
      [x0, 0.5, valleyZ] as const,
      [x1, 0.5, peakZ] as const,
      [x1, 0.5, valleyZ] as const,
      [0, 1, 0],
    );
  }

  // Close the east wall top (the last tooth's peak meets the east wall
  // at x=+0.5, z=peakZ, so we need a triangle from the body-box's
  // east cap-corners up to that peak across the -y to +y span). The
  // body-box east wall already runs floor-to-sawCapZ; we add a thin
  // triangular gable on top from (sawCapZ) up to (peakZ) at x=+0.5.
  pushTri(
    positions, normals, indices,
    [0.5, -0.5, valleyZ] as const,
    [0.5, -0.5, peakZ] as const,
    [0.5, 0.5, peakZ] as const,
    [1, 0, 0],
  );
  pushTri(
    positions, normals, indices,
    [0.5, -0.5, valleyZ] as const,
    [0.5, 0.5, peakZ] as const,
    [0.5, 0.5, valleyZ] as const,
    [1, 0, 0],
  );

  return buildGeometry(positions, normals, indices);
}

/* ------------------------------------------------------------------ */
/*  Parapet roof (commercial blocks).                                  */
/*                                                                     */
/*  Flat body box up to z=+0.30, then a flat roof plate at z=+0.30,    */
/*  with a thin (height ~0.08) raised parapet band around the          */
/*  perimeter that tops out at z=+0.5. Reads as "commercial street     */
/*  wall" at sketch resolution: distinctly NOT a house roof, distinctly */
/*  NOT a factory.                                                     */
/* ------------------------------------------------------------------ */

export function createParapetBoxGeometry(): Geometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const roofZ = 0.30; // flat roof plane
  const parapetZ = 0.50; // parapet top
  const parapetInset = 0.04; // parapet thickness as fraction of unit width

  appendBodyBoxWalls(positions, normals, indices, roofZ);

  // Inner roof plate (the flat, walkable roof surface). Normal +z.
  const inner = 0.5 - parapetInset;
  pushQuad(
    positions, normals, indices,
    [-inner, -inner, roofZ] as const,
    [inner, -inner, roofZ] as const,
    [inner, inner, roofZ] as const,
    [-inner, inner, roofZ] as const,
    [0, 0, 1],
  );

  // Parapet band: four ring quads (outer wall + inner wall + top cap)
  // around the perimeter between [inner, 0.5] and [roofZ, parapetZ].
  // South parapet (outer face -y, runs west-to-east).
  pushQuad(
    positions, normals, indices,
    [-0.5, -0.5, roofZ] as const,
    [0.5, -0.5, roofZ] as const,
    [0.5, -0.5, parapetZ] as const,
    [-0.5, -0.5, parapetZ] as const,
    [0, -1, 0],
  );
  // South parapet inner face (+y).
  pushQuad(
    positions, normals, indices,
    [inner, -inner, roofZ] as const,
    [-inner, -inner, roofZ] as const,
    [-inner, -inner, parapetZ] as const,
    [inner, -inner, parapetZ] as const,
    [0, 1, 0],
  );
  // South parapet top cap (+z).
  pushQuad(
    positions, normals, indices,
    [-0.5, -0.5, parapetZ] as const,
    [0.5, -0.5, parapetZ] as const,
    [inner, -inner, parapetZ] as const,
    [-inner, -inner, parapetZ] as const,
    [0, 0, 1],
  );

  // East parapet (outer face +x).
  pushQuad(
    positions, normals, indices,
    [0.5, -0.5, roofZ] as const,
    [0.5, 0.5, roofZ] as const,
    [0.5, 0.5, parapetZ] as const,
    [0.5, -0.5, parapetZ] as const,
    [1, 0, 0],
  );
  // East parapet inner face (-x).
  pushQuad(
    positions, normals, indices,
    [inner, 0.5, roofZ] as const,
    [inner, -0.5, roofZ] as const,
    [inner, -inner, parapetZ] as const,
    [inner, inner, parapetZ] as const,
    [-1, 0, 0],
  );
  // East parapet top cap (+z).
  pushQuad(
    positions, normals, indices,
    [0.5, -0.5, parapetZ] as const,
    [0.5, 0.5, parapetZ] as const,
    [inner, inner, parapetZ] as const,
    [inner, -inner, parapetZ] as const,
    [0, 0, 1],
  );

  // North parapet (outer face +y).
  pushQuad(
    positions, normals, indices,
    [0.5, 0.5, roofZ] as const,
    [-0.5, 0.5, roofZ] as const,
    [-0.5, 0.5, parapetZ] as const,
    [0.5, 0.5, parapetZ] as const,
    [0, 1, 0],
  );
  // North parapet inner face (-y).
  pushQuad(
    positions, normals, indices,
    [-inner, inner, roofZ] as const,
    [inner, inner, roofZ] as const,
    [inner, inner, parapetZ] as const,
    [-inner, inner, parapetZ] as const,
    [0, -1, 0],
  );
  // North parapet top cap (+z).
  pushQuad(
    positions, normals, indices,
    [0.5, 0.5, parapetZ] as const,
    [-0.5, 0.5, parapetZ] as const,
    [-inner, inner, parapetZ] as const,
    [inner, inner, parapetZ] as const,
    [0, 0, 1],
  );

  // West parapet (outer face -x).
  pushQuad(
    positions, normals, indices,
    [-0.5, 0.5, roofZ] as const,
    [-0.5, -0.5, roofZ] as const,
    [-0.5, -0.5, parapetZ] as const,
    [-0.5, 0.5, parapetZ] as const,
    [-1, 0, 0],
  );
  // West parapet inner face (+x).
  pushQuad(
    positions, normals, indices,
    [-inner, -0.5, roofZ] as const,
    [-inner, 0.5, roofZ] as const,
    [-inner, inner, parapetZ] as const,
    [-inner, -inner, parapetZ] as const,
    [1, 0, 0],
  );
  // West parapet top cap (+z).
  pushQuad(
    positions, normals, indices,
    [-0.5, 0.5, parapetZ] as const,
    [-0.5, -0.5, parapetZ] as const,
    [-inner, -inner, parapetZ] as const,
    [-inner, inner, parapetZ] as const,
    [0, 0, 1],
  );

  return buildGeometry(positions, normals, indices);
}

/* ------------------------------------------------------------------ */
/*  Storefront box (mixed-use street wall).                            */
/*                                                                     */
/*  Flat-topped box with a recessed band on the front facade (-y face) */
/*  at the ground floor. The recess reads as "storefront under the     */
/*  residential floors above." Body box from z=-0.5 to z=+0.5 except   */
/*  the bottom third of the -y face, which is set back by 0.08 in y.   */
/*  Roof is flat (no parapet) to keep the silhouette distinct from     */
/*  pure-commercial (which has a parapet band).                        */
/* ------------------------------------------------------------------ */

export function createStorefrontBoxGeometry(): Geometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const storefrontTopZ = -0.18; // top of the recessed band (ground floor ceiling)
  const recessDepth = 0.06; // how far the storefront sets back from -y face

  // Bottom face (-z).
  pushQuad(
    positions, normals, indices,
    [-0.5, -0.5 + recessDepth, -0.5] as const,
    [-0.5, 0.5, -0.5] as const,
    [0.5, 0.5, -0.5] as const,
    [0.5, -0.5 + recessDepth, -0.5] as const,
    [0, 0, -1],
  );

  // Recessed -y face (the storefront window plane). Top at storefrontTopZ.
  pushQuad(
    positions, normals, indices,
    [-0.5, -0.5 + recessDepth, -0.5] as const,
    [0.5, -0.5 + recessDepth, -0.5] as const,
    [0.5, -0.5 + recessDepth, storefrontTopZ] as const,
    [-0.5, -0.5 + recessDepth, storefrontTopZ] as const,
    [0, -1, 0],
  );

  // Underside of the cantilevered upper floors (faces -z, just above
  // storefrontTopZ). This is the "soffit" of the recess.
  pushQuad(
    positions, normals, indices,
    [-0.5, -0.5 + recessDepth, storefrontTopZ] as const,
    [0.5, -0.5 + recessDepth, storefrontTopZ] as const,
    [0.5, -0.5, storefrontTopZ] as const,
    [-0.5, -0.5, storefrontTopZ] as const,
    [0, 0, -1],
  );

  // Main -y face (from storefrontTopZ up to z=+0.5).
  pushQuad(
    positions, normals, indices,
    [-0.5, -0.5, storefrontTopZ] as const,
    [0.5, -0.5, storefrontTopZ] as const,
    [0.5, -0.5, 0.5] as const,
    [-0.5, -0.5, 0.5] as const,
    [0, -1, 0],
  );

  // East side wall (+x). Split at storefrontTopZ to keep the recess
  // visible as a step in the side profile.
  pushQuad(
    positions, normals, indices,
    [0.5, -0.5 + recessDepth, -0.5] as const,
    [0.5, 0.5, -0.5] as const,
    [0.5, 0.5, 0.5] as const,
    [0.5, -0.5 + recessDepth, 0.5] as const,
    [1, 0, 0],
  );
  // East side wall step (the little triangle that closes the recess).
  pushQuad(
    positions, normals, indices,
    [0.5, -0.5 + recessDepth, storefrontTopZ] as const,
    [0.5, -0.5 + recessDepth, 0.5] as const,
    [0.5, -0.5, 0.5] as const,
    [0.5, -0.5, storefrontTopZ] as const,
    [1, 0, 0],
  );

  // North wall (+y).
  pushQuad(
    positions, normals, indices,
    [0.5, 0.5, -0.5] as const,
    [-0.5, 0.5, -0.5] as const,
    [-0.5, 0.5, 0.5] as const,
    [0.5, 0.5, 0.5] as const,
    [0, 1, 0],
  );

  // West side wall (-x), mirror of east.
  pushQuad(
    positions, normals, indices,
    [-0.5, 0.5, -0.5] as const,
    [-0.5, -0.5 + recessDepth, -0.5] as const,
    [-0.5, -0.5 + recessDepth, 0.5] as const,
    [-0.5, 0.5, 0.5] as const,
    [-1, 0, 0],
  );
  pushQuad(
    positions, normals, indices,
    [-0.5, -0.5 + recessDepth, storefrontTopZ] as const,
    [-0.5, -0.5, storefrontTopZ] as const,
    [-0.5, -0.5, 0.5] as const,
    [-0.5, -0.5 + recessDepth, 0.5] as const,
    [-1, 0, 0],
  );

  // Flat top (+z).
  pushQuad(
    positions, normals, indices,
    [-0.5, -0.5, 0.5] as const,
    [0.5, -0.5, 0.5] as const,
    [0.5, 0.5, 0.5] as const,
    [-0.5, 0.5, 0.5] as const,
    [0, 0, 1],
  );

  return buildGeometry(positions, normals, indices);
}

/* ------------------------------------------------------------------ */
/*  Archetype dispatcher with module-scoped cache.                     */
/*                                                                     */
/*  SimpleMeshLayer reads the Geometry once when the layer mounts and  */
/*  uploads it to the GPU. Caching the Geometry instances at module    */
/*  scope means React re-renders don't rebuild buffers: the same       */
/*  Geometry pointer flows back through every render.                  */
/* ------------------------------------------------------------------ */

const geometryCache = new Map<BuildingFabricArchetype, Geometry>();

/**
 * Return the cached unit-cube Geometry for an archetype. Builds the
 * geometry on first call; subsequent calls hit the cache.
 *
 * The returned Geometry is in unit coordinates: the caller scales it
 * per-instance via SimpleMeshLayer's `getScale = [widthM, depthM, heightM]`
 * and translates via `getPosition = [lng, lat]`. The layer's
 * coordinate system must be METER_OFFSETS or default (lng/lat) and the
 * caller must set `_instancePickingColorMode` correctly for picking.
 */
export function getArchetypeGeometry(
  archetype: BuildingFabricArchetype,
): Geometry {
  const cached = geometryCache.get(archetype);
  if (cached) return cached;

  let geometry: Geometry;
  switch (archetype) {
    case "present_residential_single":
      geometry = createGableRoofedBoxGeometry();
      break;
    case "present_civic":
      geometry = createHippedRoofedBoxGeometry();
      break;
    case "present_industrial":
      geometry = createSawtoothRoofedBoxGeometry();
      break;
    case "present_commercial":
      geometry = createParapetBoxGeometry();
      break;
    case "present_mixed_use":
      geometry = createStorefrontBoxGeometry();
      break;
    case "present_residential_multi":
    case "present_unknown":
    default:
      // Flat extruded box. Matches the prior GeoJsonLayer extrusion
      // exactly so the "no signal" fallback is visually identical to
      // the deferred state and the user can read it as "we didn't
      // pick an archetype here."
      geometry = createFlatBoxGeometry();
      break;
  }
  geometryCache.set(archetype, geometry);
  return geometry;
}

/**
 * Test-only helper: drop the geometry cache. Lets unit tests verify
 * that geometry builders are deterministic across calls.
 */
export function _resetArchetypeGeometryCacheForTest(): void {
  geometryCache.clear();
}
