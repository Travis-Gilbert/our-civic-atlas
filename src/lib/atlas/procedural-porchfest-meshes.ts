/**
 * Procedural PorchFest affordance meshes.
 *
 * Sibling of `procedural-archetype-meshes.ts`. Where that module keys
 * unit-cube building masses by `BuildingFabricArchetype`, this module
 * keys recognizable event-affordance masses by the planner's placement
 * category (`AtlasEventPlannerCategory`): a food truck reads as a small
 * truck, a band as a figure with an instrument, a vendor as a canopy
 * tent, a restroom as a portable-toilet form, and so on.
 *
 * Coordinate convention (shared with procedural-archetype-meshes.ts and
 * LostFlintGeometries.ts):
 *
 *   - Unit form: x, y, z in [-0.5, +0.5].
 *   - The base sits at z = -0.5. The consumer (PorchfestAffordanceMeshLayer)
 *     scales per axis by a per-category size in meters, then translates
 *     up by height/2 so the base rests on the ground (z = 0).
 *   - +x is the form's facing direction after the instance yaw rotation
 *     (a stage faces +x toward its audience, a food truck's serving side
 *     is the -y face). Default orientation leaves +x pointing east.
 *
 * Discipline (matches the building meshes): intentionally simple massing,
 * recognizable silhouettes at a glance, not detailed models. The
 * figure-with-instrument and food-truck forms carry the most identifying
 * detail because they are the placements a planner most needs to tell
 * apart; the rest are simpler.
 */

import { Geometry } from "@luma.gl/engine";

import type { AtlasEventPlannerCategory } from "../../components/atlas/AtlasEventPlannerLayer.ts";

type Vec3 = readonly [number, number, number];

/* ------------------------------------------------------------------ */
/*  Primitives (mirror of procedural-archetype-meshes.ts internals).   */
/* ------------------------------------------------------------------ */

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

/**
 * Append an axis-aligned box spanning [min, max] with outward normals on
 * all six faces. The workhorse for composite forms (figures, wheels,
 * posts, canopies) that are unions of simple boxes.
 */
function pushBox(
  positions: number[],
  normals: number[],
  indices: number[],
  min: Vec3,
  max: Vec3,
): void {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  // Top (+z) and bottom (-z).
  pushQuad(
    positions, normals, indices,
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    [0, 0, 1],
  );
  pushQuad(
    positions, normals, indices,
    [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0],
    [0, 0, -1],
  );
  // Front (-y) and back (+y).
  pushQuad(
    positions, normals, indices,
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [0, -1, 0],
  );
  pushQuad(
    positions, normals, indices,
    [x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1],
    [0, 1, 0],
  );
  // Left (-x) and right (+x).
  pushQuad(
    positions, normals, indices,
    [x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1],
    [-1, 0, 0],
  );
  pushQuad(
    positions, normals, indices,
    [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1],
    [1, 0, 0],
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

type MeshArrays = {
  positions: number[];
  normals: number[];
  indices: number[];
};

function emptyArrays(): MeshArrays {
  return { positions: [], normals: [], indices: [] };
}

/* ------------------------------------------------------------------ */
/*  music: a performer with an instrument.                             */
/*  Vertical body box + head + an angular guitar slab held at the      */
/*  front. Reads as "a performer here."                                */
/* ------------------------------------------------------------------ */

export function createMusicFigureGeometry(): Geometry {
  const m = emptyArrays();
  // Torso.
  pushBox(m.positions, m.normals, m.indices, [-0.12, -0.1, -0.5], [0.12, 0.1, 0.16]);
  // Head.
  pushBox(m.positions, m.normals, m.indices, [-0.09, -0.09, 0.16], [0.09, 0.09, 0.4]);
  // Guitar body: an angular slab across the front (-y), tilted by being
  // offset in z so it reads as held, not lying flat.
  pushBox(m.positions, m.normals, m.indices, [-0.04, -0.2, -0.18], [0.22, -0.08, 0.04]);
  // Guitar neck: thin bar extending up-and-out from the body.
  pushBox(m.positions, m.normals, m.indices, [0.18, -0.16, 0.0], [0.34, -0.1, 0.06]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  vendor: a market tent / pop-up canopy.                             */
/*  Low body box + a peaked canopy roof wider than the body (the       */
/*  canopy overhang). The most common category, so it stays clean and  */
/*  unmistakable. Ridge runs along x; gable ends face +/-x.            */
/* ------------------------------------------------------------------ */

export function createVendorTentGeometry(): Geometry {
  const m = emptyArrays();
  // Counter / body under the canopy.
  pushBox(m.positions, m.normals, m.indices, [-0.32, -0.3, -0.5], [0.32, 0.3, -0.08]);
  const eaveZ = 0.02;
  const ridgeZ = 0.5;
  // South slope (-y).
  const sSW: Vec3 = [-0.5, -0.5, eaveZ];
  const sSE: Vec3 = [0.5, -0.5, eaveZ];
  const sRE: Vec3 = [0.5, 0, ridgeZ];
  const sRW: Vec3 = [-0.5, 0, ridgeZ];
  pushQuad(m.positions, m.normals, m.indices, sSW, sSE, sRE, sRW, triNormal(sSW, sSE, sRE));
  // North slope (+y).
  const nNE: Vec3 = [0.5, 0.5, eaveZ];
  const nNW: Vec3 = [-0.5, 0.5, eaveZ];
  pushQuad(m.positions, m.normals, m.indices, nNE, nNW, sRW, sRE, triNormal(nNE, nNW, sRW));
  // Gable end triangles at x = -0.5 and x = +0.5.
  pushTri(m.positions, m.normals, m.indices, sSW, sRW, nNW, [-1, 0, 0]);
  pushTri(m.positions, m.normals, m.indices, sSE, nNE, sRE, [1, 0, 0]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  food_court / food: a food truck.                                   */
/*  Long box body with a raised serving awning on the -y side, a lower */
/*  cab at the +x end, and four wheels at the base. Reads as "a truck  */
/*  that serves food."                                                 */
/* ------------------------------------------------------------------ */

export function createFoodTruckGeometry(): Geometry {
  const m = emptyArrays();
  const wheelZ0 = -0.5;
  const chassisZ = -0.34;
  // Box body (serving area).
  pushBox(m.positions, m.normals, m.indices, [-0.5, -0.24, chassisZ], [0.18, 0.24, 0.2]);
  // Lower cab at +x.
  pushBox(m.positions, m.normals, m.indices, [0.18, -0.22, chassisZ], [0.5, 0.22, -0.02]);
  // Serving awning: a thin slab cantilevered out over the -y serving window.
  pushBox(m.positions, m.normals, m.indices, [-0.44, -0.32, 0.04], [0.08, -0.24, 0.1]);
  // Serving window opening reads as a recessed panel just under the awning.
  pushBox(m.positions, m.normals, m.indices, [-0.4, -0.26, -0.14], [0.04, -0.24, 0.02]);
  // Four wheels.
  const wy = 0.2;
  pushBox(m.positions, m.normals, m.indices, [-0.42, -wy - 0.04, wheelZ0], [-0.26, -wy + 0.04, chassisZ]);
  pushBox(m.positions, m.normals, m.indices, [-0.42, wy - 0.04, wheelZ0], [-0.26, wy + 0.04, chassisZ]);
  pushBox(m.positions, m.normals, m.indices, [0.24, -wy - 0.04, wheelZ0], [0.4, -wy + 0.04, chassisZ]);
  pushBox(m.positions, m.normals, m.indices, [0.24, wy - 0.04, wheelZ0], [0.4, wy + 0.04, chassisZ]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  kid_zone: a playful cluster.                                       */
/*  A low platform, an angled slide ramp, and a small arch. Reads as   */
/*  "the kids' area."                                                  */
/* ------------------------------------------------------------------ */

export function createKidZoneGeometry(): Geometry {
  const m = emptyArrays();
  // Platform.
  pushBox(m.positions, m.normals, m.indices, [-0.3, -0.22, -0.5], [0.08, 0.22, -0.16]);
  // Slide ramp: a sloped slab from the platform top down to the ground.
  const rSW: Vec3 = [0.08, -0.16, -0.16];
  const rNW: Vec3 = [0.08, 0.16, -0.16];
  const rSE: Vec3 = [0.46, -0.16, -0.5];
  const rNE: Vec3 = [0.46, 0.16, -0.5];
  pushQuad(m.positions, m.normals, m.indices, rSW, rSE, rNE, rNW, triNormal(rSW, rSE, rNE));
  // Arch: two posts + a top bar (a swing-set silhouette).
  pushBox(m.positions, m.normals, m.indices, [-0.46, -0.04, -0.5], [-0.4, 0.04, 0.28]);
  pushBox(m.positions, m.normals, m.indices, [-0.18, -0.04, -0.5], [-0.12, 0.04, 0.28]);
  pushBox(m.positions, m.normals, m.indices, [-0.46, -0.04, 0.22], [-0.12, 0.04, 0.3]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  parking: a simple car form.                                        */
/*  Low body, a raised cabin with a sloped windshield, four wheels.    */
/*  Reads as "a vehicle / parking here."                               */
/* ------------------------------------------------------------------ */

export function createParkingCarGeometry(): Geometry {
  const m = emptyArrays();
  const wheelZ0 = -0.5;
  const chassisZ = -0.34;
  // Body.
  pushBox(m.positions, m.normals, m.indices, [-0.5, -0.26, chassisZ], [0.5, 0.26, -0.06]);
  // Cabin.
  pushBox(m.positions, m.normals, m.indices, [-0.18, -0.22, -0.06], [0.2, 0.22, 0.14]);
  // Sloped windshield at +x end of the cabin.
  const wSW: Vec3 = [0.2, -0.22, -0.06];
  const wNW: Vec3 = [0.2, 0.22, -0.06];
  const wST: Vec3 = [0.2, -0.22, 0.14];
  const wNT: Vec3 = [0.2, 0.22, 0.14];
  const wSE: Vec3 = [0.34, -0.22, -0.06];
  const wNE: Vec3 = [0.34, 0.22, -0.06];
  pushQuad(m.positions, m.normals, m.indices, wST, wSE, wNE, wNT, triNormal(wST, wSE, wNE));
  pushTri(m.positions, m.normals, m.indices, wSW, wSE, wST, [0, -1, 0]);
  pushTri(m.positions, m.normals, m.indices, wNW, wNT, wNE, [0, 1, 0]);
  // Wheels.
  const wy = 0.24;
  pushBox(m.positions, m.normals, m.indices, [-0.4, -wy - 0.04, wheelZ0], [-0.24, -wy + 0.04, chassisZ]);
  pushBox(m.positions, m.normals, m.indices, [-0.4, wy - 0.04, wheelZ0], [-0.24, wy + 0.04, chassisZ]);
  pushBox(m.positions, m.normals, m.indices, [0.24, -wy - 0.04, wheelZ0], [0.4, -wy + 0.04, chassisZ]);
  pushBox(m.positions, m.normals, m.indices, [0.24, wy - 0.04, wheelZ0], [0.4, wy + 0.04, chassisZ]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  restroom: a portable-toilet form.                                  */
/*  Tall narrow box with a door panel suggested on the front face.     */
/* ------------------------------------------------------------------ */

export function createRestroomGeometry(): Geometry {
  const m = emptyArrays();
  // Cabin.
  pushBox(m.positions, m.normals, m.indices, [-0.22, -0.2, -0.5], [0.22, 0.2, 0.46]);
  // Roof cap.
  pushBox(m.positions, m.normals, m.indices, [-0.24, -0.22, 0.46], [0.24, 0.22, 0.5]);
  // Door panel on -y (raised slightly so it casts a seam).
  pushBox(m.positions, m.normals, m.indices, [-0.15, -0.22, -0.46], [0.15, -0.2, 0.3]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  rest_area: a bench under a shade canopy.                           */
/*  Low seat slab on legs + a flat shade roof on four thin posts.      */
/*  Reads as "a place to sit."                                         */
/* ------------------------------------------------------------------ */

export function createRestAreaGeometry(): Geometry {
  const m = emptyArrays();
  // Seat slab.
  pushBox(m.positions, m.normals, m.indices, [-0.4, -0.1, -0.34], [0.4, 0.1, -0.24]);
  // Backrest.
  pushBox(m.positions, m.normals, m.indices, [-0.4, 0.08, -0.24], [0.4, 0.12, -0.04]);
  // Legs.
  pushBox(m.positions, m.normals, m.indices, [-0.36, -0.08, -0.5], [-0.3, 0.08, -0.34]);
  pushBox(m.positions, m.normals, m.indices, [0.3, -0.08, -0.5], [0.36, 0.08, -0.34]);
  // Shade posts.
  pushBox(m.positions, m.normals, m.indices, [-0.42, -0.28, -0.34], [-0.36, -0.22, 0.32]);
  pushBox(m.positions, m.normals, m.indices, [0.36, -0.28, -0.34], [0.42, -0.22, 0.32]);
  pushBox(m.positions, m.normals, m.indices, [-0.42, 0.22, -0.34], [-0.36, 0.28, 0.32]);
  pushBox(m.positions, m.normals, m.indices, [0.36, 0.22, -0.34], [0.42, 0.28, 0.32]);
  // Flat shade roof.
  pushBox(m.positions, m.normals, m.indices, [-0.46, -0.32, 0.32], [0.46, 0.32, 0.4]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  after_party: a stage with a marquee header and a forward canopy.   */
/*  Distinct from the music figure: a wide low stage deck, a back      */
/*  marquee wall, and a canopy roof carried on two front posts.        */
/* ------------------------------------------------------------------ */

export function createAfterPartyStageGeometry(): Geometry {
  const m = emptyArrays();
  // Stage deck.
  pushBox(m.positions, m.normals, m.indices, [-0.5, -0.3, -0.5], [0.5, 0.3, -0.28]);
  // Back marquee wall (+y).
  pushBox(m.positions, m.normals, m.indices, [-0.5, 0.22, -0.28], [0.5, 0.3, 0.42]);
  // Two front posts (-y).
  pushBox(m.positions, m.normals, m.indices, [-0.48, -0.3, -0.28], [-0.4, -0.22, 0.34]);
  pushBox(m.positions, m.normals, m.indices, [0.4, -0.3, -0.28], [0.48, -0.22, 0.34]);
  // Canopy roof: sloped from the tall marquee back down toward the front.
  const cBW: Vec3 = [-0.5, 0.3, 0.42];
  const cBE: Vec3 = [0.5, 0.3, 0.42];
  const cFE: Vec3 = [0.5, -0.32, 0.32];
  const cFW: Vec3 = [-0.5, -0.32, 0.32];
  pushQuad(m.positions, m.normals, m.indices, cFW, cFE, cBE, cBW, triNormal(cFW, cFE, cBE));
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  amenity: the fallback marker post.                                 */
/*  A base, a slim post, and a flag, matching the "we didn't assign a  */
/*  specific affordance" role that present_unknown plays in the        */
/*  building catalog.                                                  */
/* ------------------------------------------------------------------ */

export function createAmenityMarkerGeometry(): Geometry {
  const m = emptyArrays();
  // Base.
  pushBox(m.positions, m.normals, m.indices, [-0.18, -0.18, -0.5], [0.18, 0.18, -0.4]);
  // Post.
  pushBox(m.positions, m.normals, m.indices, [-0.06, -0.06, -0.4], [0.06, 0.06, 0.32]);
  // Flag.
  pushBox(m.positions, m.normals, m.indices, [0.06, -0.02, 0.14], [0.32, 0.02, 0.32]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  Dispatcher with module-scoped cache.                               */
/*                                                                     */
/*  SimpleMeshLayer reads the Geometry once when the layer mounts and  */
/*  uploads it to the GPU. Caching the Geometry instances at module    */
/*  scope means React re-renders don't rebuild buffers: the same       */
/*  Geometry pointer flows back through every render.                  */
/* ------------------------------------------------------------------ */

const geometryCache = new Map<AtlasEventPlannerCategory, Geometry>();

/**
 * Return the cached unit-form Geometry for a placement category. Builds
 * the geometry on first call; subsequent calls hit the cache. Unknown
 * categories fall back to the amenity marker (the building catalog's
 * present_unknown discipline) so a new category never renders invisible.
 */
export function getPorchfestAffordanceGeometry(
  category: AtlasEventPlannerCategory | string,
): Geometry {
  const key = category as AtlasEventPlannerCategory;
  const cached = geometryCache.get(key);
  if (cached) return cached;

  let geometry: Geometry;
  switch (key) {
    case "music":
      geometry = createMusicFigureGeometry();
      break;
    case "vendor":
      geometry = createVendorTentGeometry();
      break;
    case "food_court":
      geometry = createFoodTruckGeometry();
      break;
    case "kid_zone":
      geometry = createKidZoneGeometry();
      break;
    case "parking":
      geometry = createParkingCarGeometry();
      break;
    case "restroom":
      geometry = createRestroomGeometry();
      break;
    case "rest_area":
      geometry = createRestAreaGeometry();
      break;
    case "after_party":
      geometry = createAfterPartyStageGeometry();
      break;
    case "amenity":
    default:
      geometry = createAmenityMarkerGeometry();
      break;
  }
  geometryCache.set(key, geometry);
  return geometry;
}

/**
 * Test-only helper: drop the geometry cache. Lets unit tests verify
 * that geometry builders are deterministic across calls.
 */
export function _resetPorchfestGeometryCacheForTest(): void {
  geometryCache.clear();
}
