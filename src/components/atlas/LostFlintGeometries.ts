/**
 * LostFlintGeometries — three Geometry factories for the procedural
 * Lost Flint dispatch.
 *
 * The dispatch in `AtlasLostFlintDeckLayer.ts` groups reconstructions
 * by `roof_form` and builds one `ConfidenceMixMeshLayer` per group,
 * each pointing at the matching geometry below.
 *
 * Coordinate convention (all three):
 *   - Unit cube footprint: x, y in [-0.5, +0.5]
 *   - z runs [-0.5, +0.5] so the per-fragment z-band shader in
 *     `ConfidenceMixMeshLayer` works uniformly across shapes.
 *
 * Body / roof split:
 *   - Body (walls): z in [-0.5, +0.35]
 *   - Roof cap:     z in [+0.35, +0.5]    (top 15%, matches the
 *                                          ROOF_BOT shader constant)
 *
 * Flat roof = the box's top face stays at z=+0.5 (existing
 *             CubeGeometry behaviour, exported here for symmetry).
 * Gable roof = ridge along the x axis (parallel to building width).
 *              Ridge endpoints at (±0.5, 0, +0.5).
 * Hipped roof = pyramid apex at (0, 0, +0.5).
 */

import { CubeGeometry, Geometry } from "@luma.gl/engine";

/** Where the body box ends and the roof cap begins, in mesh-local z. */
const ROOF_CAP_Z = 0.35;

/** Body box face vertex positions, identical for gable and hipped. */
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

type Vec3 = readonly [number, number, number];

/**
 * Append a triangulated quad (4 vertices, 2 triangles) with a flat
 * face normal. Mutates the positions and normals arrays.
 */
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
  // CCW winding: v0 -> v1 -> v2, v0 -> v2 -> v3
  indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
  indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
}

/**
 * Append a triangle (3 vertices, 1 triangle) with a flat face normal.
 */
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

/**
 * Compute a CCW face normal for a triangle (v0, v1, v2). The
 * direction follows the right-hand rule, so vertices must be wound
 * counter-clockwise when looking from outside the mesh.
 */
function triNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
  const ax = v1[0] - v0[0];
  const ay = v1[1] - v0[1];
  const az = v1[2] - v0[2];
  const bx = v2[0] - v0[0];
  const by = v2[1] - v0[1];
  const bz = v2[2] - v0[2];
  let nx = ay * bz - az * by;
  let ny = az * bx - ax * bz;
  let nz = ax * by - ay * bx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  return [nx, ny, nz] as const;
}

function appendBodyBox(
  positions: number[],
  normals: number[],
  indices: number[],
): void {
  const c = BODY_CORNERS;
  // Bottom face (normal -z), CCW from above looking down (so the
  // outward normal is -z). Winding: SW -> NW -> NE -> SE.
  pushQuad(
    positions, normals, indices,
    c.bottomSW, c.bottomNW, c.bottomNE, c.bottomSE,
    [0, 0, -1],
  );
  // South wall (normal -y): SW -> SE -> capSE -> capSW
  pushQuad(
    positions, normals, indices,
    c.bottomSW, c.bottomSE, c.capSE, c.capSW,
    [0, -1, 0],
  );
  // East wall (+x): SE -> NE -> capNE -> capSE
  pushQuad(
    positions, normals, indices,
    c.bottomSE, c.bottomNE, c.capNE, c.capSE,
    [1, 0, 0],
  );
  // North wall (+y): NE -> NW -> capNW -> capNE
  pushQuad(
    positions, normals, indices,
    c.bottomNE, c.bottomNW, c.capNW, c.capNE,
    [0, 1, 0],
  );
  // West wall (-x): NW -> SW -> capSW -> capNW
  pushQuad(
    positions, normals, indices,
    c.bottomNW, c.bottomSW, c.capSW, c.capNW,
    [-1, 0, 0],
  );
  // NOTE: no top face — the cap is added by the caller (flat / gable
  //       / hipped) so the body box is shared.
}

/**
 * Flat-roof box: unit cube. Identical to luma.gl's `CubeGeometry()`,
 * exported here as a function so the dispatch in
 * `AtlasLostFlintDeckLayer.ts` has one symmetric API for all three
 * roof forms.
 */
export function createFlatBoxGeometry(): Geometry {
  return new CubeGeometry();
}

/**
 * Gable-roofed box. Body box up to z=+0.35, then a triangular prism
 * cap with the ridge running along the x axis at z=+0.5. End walls
 * (gable triangles) face ±x.
 */
export function createGableRoofedBoxGeometry(): Geometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  appendBodyBox(positions, normals, indices);

  const c = BODY_CORNERS;
  const ridgeWest: Vec3 = [-0.5, 0, 0.5];
  const ridgeEast: Vec3 = [0.5, 0, 0.5];

  // South roof slope: capSW, capSE, ridgeEast, ridgeWest
  pushQuad(
    positions, normals, indices,
    c.capSW, c.capSE, ridgeEast, ridgeWest,
    triNormal(c.capSW, c.capSE, ridgeEast),
  );
  // North roof slope: capNE, capNW, ridgeWest, ridgeEast
  pushQuad(
    positions, normals, indices,
    c.capNE, c.capNW, ridgeWest, ridgeEast,
    triNormal(c.capNE, c.capNW, ridgeWest),
  );
  // West gable end wall (normal -x): capSW, capNW, ridgeWest
  pushTri(
    positions, normals, indices,
    c.capNW, c.capSW, ridgeWest,
    [-1, 0, 0],
  );
  // East gable end wall (normal +x): capSE, capNE, ridgeEast
  pushTri(
    positions, normals, indices,
    c.capSE, c.capNE, ridgeEast,
    [1, 0, 0],
  );

  return new Geometry({
    topology: "triangle-list",
    attributes: {
      POSITION: { size: 3, value: new Float32Array(positions) },
      NORMAL: { size: 3, value: new Float32Array(normals) },
    },
    indices: { size: 1, value: new Uint16Array(indices) },
  });
}

/**
 * Hipped-roof box. Body box up to z=+0.35, then a pyramidal cap with
 * its apex at (0, 0, +0.5). Four triangular roof faces meeting at
 * the apex.
 */
export function createHippedRoofedBoxGeometry(): Geometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  appendBodyBox(positions, normals, indices);

  const c = BODY_CORNERS;
  const apex: Vec3 = [0, 0, 0.5];

  // South roof face: capSW -> capSE -> apex
  pushTri(
    positions, normals, indices,
    c.capSW, c.capSE, apex,
    triNormal(c.capSW, c.capSE, apex),
  );
  // East roof face: capSE -> capNE -> apex
  pushTri(
    positions, normals, indices,
    c.capSE, c.capNE, apex,
    triNormal(c.capSE, c.capNE, apex),
  );
  // North roof face: capNE -> capNW -> apex
  pushTri(
    positions, normals, indices,
    c.capNE, c.capNW, apex,
    triNormal(c.capNE, c.capNW, apex),
  );
  // West roof face: capNW -> capSW -> apex
  pushTri(
    positions, normals, indices,
    c.capNW, c.capSW, apex,
    triNormal(c.capNW, c.capSW, apex),
  );

  return new Geometry({
    topology: "triangle-list",
    attributes: {
      POSITION: { size: 3, value: new Float32Array(positions) },
      NORMAL: { size: 3, value: new Float32Array(normals) },
    },
    indices: { size: 1, value: new Uint16Array(indices) },
  });
}
