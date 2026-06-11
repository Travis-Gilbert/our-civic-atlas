/**
 * Procedural PorchFest affordance meshes.
 *
 * Sibling of `procedural-archetype-meshes.ts`. Where that module keys
 * unit-cube building masses by `BuildingFabricArchetype`, this module
 * keys recognizable event-affordance masses by the planner's placement
 * category (`AtlasEventPlannerCategory`): a food truck reads as a small
 * truck, a band as a small cluster of figures with an instrument, a
 * vendor as a market stall, a restroom as a portable-toilet form, and
 * so on.
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
/*  music: a small band (a cluster of performers).                     */
/*  Four slim figures at slightly different heights and positions, the */
/*  front-left one holding a guitar. Reads as "a band here," not one    */
/*  giant person. Consumer scale keeps it human-height, not building-   */
/*  height.                                                            */
/* ------------------------------------------------------------------ */

export function createMusicBandGeometry(): Geometry {
  const m = emptyArrays();
  // Each figure is a slim torso box + a head box. Heights and footprint
  // positions vary a little so the group reads as several people.
  type Figure = { x: number; y: number; halfW: number; torsoTop: number };
  const figures: Figure[] = [
    { x: -0.18, y: -0.06, halfW: 0.07, torsoTop: 0.12 }, // front-left (guitarist)
    { x: 0.12, y: -0.02, halfW: 0.07, torsoTop: 0.06 }, // front-right
    { x: -0.08, y: 0.2, halfW: 0.06, torsoTop: 0.02 }, // back-left
    { x: 0.16, y: 0.22, halfW: 0.06, torsoTop: 0.1 }, // back-right
  ];
  for (const f of figures) {
    // Torso.
    pushBox(
      m.positions, m.normals, m.indices,
      [f.x - f.halfW, f.y - f.halfW, -0.5],
      [f.x + f.halfW, f.y + f.halfW, f.torsoTop],
    );
    // Head.
    const hw = f.halfW * 0.8;
    pushBox(
      m.positions, m.normals, m.indices,
      [f.x - hw, f.y - hw, f.torsoTop],
      [f.x + hw, f.y + hw, f.torsoTop + 0.16],
    );
  }
  // Guitar on the front-left figure: body slab + neck, held across the
  // front (-y) so the group is unmistakably musicians.
  const g = figures[0];
  pushBox(
    m.positions, m.normals, m.indices,
    [g.x - 0.02, g.y - 0.16, -0.16], [g.x + 0.12, g.y - 0.06, -0.02],
  );
  pushBox(
    m.positions, m.normals, m.indices,
    [g.x + 0.1, g.y - 0.14, -0.06], [g.x + 0.26, g.y - 0.08, 0.0],
  );
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  vendor: a street-market stall (open-counter bar).                  */
/*                                                                     */
/*  Modelled on the timber market-bar silhouette: a tall solid back    */
/*  wall and side walls, a mono-pitch (pent) roof that slopes from the */
/*  high back down to the front and cantilevers out as a deep overhang,*/
/*  an open serving counter on the front (-y) with an overhanging bar  */
/*  lip, front posts carrying the overhang, and a fold-down awning flap*/
/*  propped open above the counter. The roofed, taller-than-it-is-flat */
/*  massing reads as a stall, not the low slab ("bed") the earlier     */
/*  canopy form produced. Front (open) face is -y; +x is the bar's     */
/*  long axis.                                                         */
/* ------------------------------------------------------------------ */

export function createVendorStandGeometry(): Geometry {
  const m = emptyArrays();

  const backTopZ = 0.42; // top of back wall / high edge of roof
  const frontTopZ = 0.26; // low (front) edge of roof -> pent slope
  const roofT = 0.06; // roof slab thickness
  const counterTopZ = -0.04; // bar surface height
  const counterUnderZ = -0.14; // underside of bar slab

  // Solid back wall (+y), full height up to where the roof lands.
  pushBox(m.positions, m.normals, m.indices, [-0.5, 0.4, -0.5], [0.5, 0.5, backTopZ - roofT]);
  // Side walls (partial depth: back of the stall to the counter line).
  pushBox(m.positions, m.normals, m.indices, [-0.5, -0.34, -0.5], [-0.42, 0.5, 0.28]);
  pushBox(m.positions, m.normals, m.indices, [0.42, -0.34, -0.5], [0.5, 0.5, 0.28]);
  // Solid kick panel under the counter (set back so the bar lip overhangs).
  pushBox(m.positions, m.normals, m.indices, [-0.46, -0.4, -0.5], [0.46, -0.3, counterUnderZ]);
  // Counter / bar top, overhanging the kick panel toward the customer.
  pushBox(m.positions, m.normals, m.indices, [-0.48, -0.5, counterUnderZ], [0.48, -0.3, counterTopZ]);
  // Front posts (left, centre, right) carrying the roof overhang.
  for (const px of [-0.45, -0.03, 0.39] as const) {
    pushBox(
      m.positions, m.normals, m.indices,
      [px, -0.4, counterTopZ], [px + 0.06, -0.34, frontTopZ],
    );
  }

  // Pent roof: a sloped slab, high at the back (+y) and low at the front
  // (-y), cantilevering out to the front edge as a deep overhang. Built
  // as top + underside + four edge quads (same slope technique as the
  // gable/sawtooth roofs above).
  const TbL: Vec3 = [-0.5, 0.5, backTopZ];
  const TbR: Vec3 = [0.5, 0.5, backTopZ];
  const TfL: Vec3 = [-0.5, -0.5, frontTopZ];
  const TfR: Vec3 = [0.5, -0.5, frontTopZ];
  const BbL: Vec3 = [-0.5, 0.5, backTopZ - roofT];
  const BbR: Vec3 = [0.5, 0.5, backTopZ - roofT];
  const BfL: Vec3 = [-0.5, -0.5, frontTopZ - roofT];
  const BfR: Vec3 = [0.5, -0.5, frontTopZ - roofT];
  pushQuad(m.positions, m.normals, m.indices, TfL, TfR, TbR, TbL, triNormal(TfL, TfR, TbR)); // top
  pushQuad(m.positions, m.normals, m.indices, BbL, BbR, BfR, BfL, triNormal(BbL, BbR, BfR)); // underside
  pushQuad(m.positions, m.normals, m.indices, TfR, TfL, BfL, BfR, triNormal(TfR, TfL, BfL)); // front edge
  pushQuad(m.positions, m.normals, m.indices, TbL, TbR, BbR, BbL, triNormal(TbL, TbR, BbR)); // back edge
  pushQuad(m.positions, m.normals, m.indices, TbL, BbL, BfL, TfL, triNormal(TbL, BbL, BfL)); // left edge
  pushQuad(m.positions, m.normals, m.indices, TfR, BfR, BbR, TbR, triNormal(TfR, BfR, BbR)); // right edge

  // Fold-down awning flap: hinged at the counter's front edge and propped
  // open up-and-inward over the bar (the signature market-stall shutter).
  const flByZ = counterTopZ; // hinge at the counter front lip
  const fl0: Vec3 = [-0.42, -0.5, flByZ];
  const fl1: Vec3 = [0.42, -0.5, flByZ];
  const fl2: Vec3 = [0.42, -0.4, 0.16];
  const fl3: Vec3 = [-0.42, -0.4, 0.16];
  pushQuad(m.positions, m.normals, m.indices, fl0, fl1, fl2, fl3, triNormal(fl0, fl1, fl2));
  pushQuad(m.positions, m.normals, m.indices, fl3, fl2, fl1, fl0, triNormal(fl3, fl2, fl1));

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

/* ================================================================== */
/*  Figure-library variants (porchfest-two-feature-specs.md Feature 1) */
/*                                                                     */
/*  Submission-specific figures resolved per civic object by           */
/*  src/lib/civic/civic-figure-resolver.ts and registered in           */
/*  src/lib/atlas/porchfest-figure-library.ts. Same discipline as the  */
/*  category forms above: simple massing, identifying detail only      */
/*  where it disambiguates one figure from its siblings.               */
/* ================================================================== */

/** Slim torso + head, the shared person primitive for the variants. */
function pushFigure(
  m: MeshArrays,
  x: number,
  y: number,
  halfW: number,
  torsoTop: number,
  baseZ = -0.5,
): void {
  pushBox(
    m.positions, m.normals, m.indices,
    [x - halfW, y - halfW, baseZ],
    [x + halfW, y + halfW, torsoTop],
  );
  const hw = halfW * 0.8;
  pushBox(
    m.positions, m.normals, m.indices,
    [x - hw, y - hw, torsoTop],
    [x + hw, y + hw, torsoTop + 0.16],
  );
}

/* ------------------------------------------------------------------ */
/*  musician-solo: one performer with a guitar and a small amp.        */
/*  The single figure (vs the band cluster) is the discriminator.      */
/* ------------------------------------------------------------------ */

export function createMusicianSoloGeometry(): Geometry {
  const m = emptyArrays();
  pushFigure(m, 0, 0, 0.09, 0.12);
  // Guitar across the front (-y): body slab + neck.
  pushBox(m.positions, m.normals, m.indices, [-0.02, -0.16, -0.16], [0.12, -0.06, -0.02]);
  pushBox(m.positions, m.normals, m.indices, [0.1, -0.14, -0.06], [0.26, -0.08, 0.0]);
  // Practice amp beside the performer.
  pushBox(m.positions, m.normals, m.indices, [-0.34, -0.1, -0.5], [-0.16, 0.08, -0.28]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  musician-dj: a deck table with a console wedge, performer behind.  */
/* ------------------------------------------------------------------ */

export function createMusicianDjGeometry(): Geometry {
  const m = emptyArrays();
  // Deck table top + legs.
  pushBox(m.positions, m.normals, m.indices, [-0.34, -0.3, -0.16], [0.34, -0.02, -0.08]);
  pushBox(m.positions, m.normals, m.indices, [-0.32, -0.28, -0.5], [-0.26, -0.06, -0.16]);
  pushBox(m.positions, m.normals, m.indices, [0.26, -0.28, -0.5], [0.32, -0.06, -0.16]);
  // Console wedge on the table.
  pushBox(m.positions, m.normals, m.indices, [-0.14, -0.22, -0.08], [0.1, -0.08, -0.02]);
  // DJ behind the table (+y side).
  pushFigure(m, 0, 0.16, 0.08, 0.14);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  vendor-table: a flat market table with goods, seller behind.       */
/*  Distinct from the roofed stall: no roof, no counter overhang.      */
/* ------------------------------------------------------------------ */

export function createVendorTableGeometry(): Geometry {
  const m = emptyArrays();
  // Tabletop + side panels.
  pushBox(m.positions, m.normals, m.indices, [-0.4, -0.3, -0.2], [0.4, 0.0, -0.12]);
  pushBox(m.positions, m.normals, m.indices, [-0.4, -0.28, -0.5], [-0.34, -0.02, -0.2]);
  pushBox(m.positions, m.normals, m.indices, [0.34, -0.28, -0.5], [0.4, -0.02, -0.2]);
  // Goods on the table.
  pushBox(m.positions, m.normals, m.indices, [-0.28, -0.26, -0.12], [-0.08, -0.1, 0.0]);
  pushBox(m.positions, m.normals, m.indices, [0.04, -0.24, -0.12], [0.24, -0.12, -0.04]);
  // Seller behind the table.
  pushFigure(m, 0, 0.18, 0.07, 0.1);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  vendor-cart: a hand cart, wheels at one end and a push handle at   */
/*  the other. Smaller and barer than the food cart (no umbrella).     */
/* ------------------------------------------------------------------ */

export function createVendorCartGeometry(): Geometry {
  const m = emptyArrays();
  // Cart bed.
  pushBox(m.positions, m.normals, m.indices, [-0.3, -0.22, -0.3], [0.26, 0.22, 0.06]);
  // Wheels at the -x end.
  pushBox(m.positions, m.normals, m.indices, [-0.24, -0.3, -0.5], [-0.08, -0.22, -0.3]);
  pushBox(m.positions, m.normals, m.indices, [-0.24, 0.22, -0.5], [-0.08, 0.3, -0.3]);
  // Rest legs at the +x end.
  pushBox(m.positions, m.normals, m.indices, [0.18, -0.2, -0.5], [0.24, -0.14, -0.3]);
  pushBox(m.positions, m.normals, m.indices, [0.18, 0.14, -0.5], [0.24, 0.2, -0.3]);
  // Push handle: two rails + crossbar.
  pushBox(m.positions, m.normals, m.indices, [0.26, -0.16, -0.02], [0.44, -0.1, 0.04]);
  pushBox(m.positions, m.normals, m.indices, [0.26, 0.1, -0.02], [0.44, 0.16, 0.04]);
  pushBox(m.positions, m.normals, m.indices, [0.44, -0.16, -0.02], [0.5, 0.16, 0.06]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  food-cart: a serving cart under a flat parasol. The umbrella is    */
/*  the identifying silhouette.                                        */
/* ------------------------------------------------------------------ */

export function createFoodCartGeometry(): Geometry {
  const m = emptyArrays();
  // Cart body + front counter lip.
  pushBox(m.positions, m.normals, m.indices, [-0.28, -0.2, -0.34], [0.24, 0.2, 0.0]);
  pushBox(m.positions, m.normals, m.indices, [-0.28, -0.26, -0.06], [0.24, -0.2, 0.0]);
  // Wheels.
  pushBox(m.positions, m.normals, m.indices, [-0.24, -0.26, -0.5], [-0.06, -0.18, -0.34]);
  pushBox(m.positions, m.normals, m.indices, [-0.24, 0.18, -0.5], [-0.06, 0.26, -0.34]);
  // Parasol pole + flat canopy.
  pushBox(m.positions, m.normals, m.indices, [-0.03, -0.03, 0.0], [0.03, 0.03, 0.34]);
  pushBox(m.positions, m.normals, m.indices, [-0.3, -0.3, 0.34], [0.3, 0.3, 0.42]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  food-grill: a barrel grill with hood, chimney, side shelf, and a   */
/*  cook beside it.                                                    */
/* ------------------------------------------------------------------ */

export function createFoodGrillGeometry(): Geometry {
  const m = emptyArrays();
  // Grill body + hood.
  pushBox(m.positions, m.normals, m.indices, [-0.3, -0.16, -0.28], [0.14, 0.16, -0.04]);
  pushBox(m.positions, m.normals, m.indices, [-0.28, -0.14, -0.04], [0.12, 0.14, 0.1]);
  // Chimney.
  pushBox(m.positions, m.normals, m.indices, [0.0, -0.04, 0.1], [0.08, 0.04, 0.24]);
  // Legs.
  pushBox(m.positions, m.normals, m.indices, [-0.28, -0.14, -0.5], [-0.22, -0.08, -0.28]);
  pushBox(m.positions, m.normals, m.indices, [-0.28, 0.08, -0.5], [-0.22, 0.14, -0.28]);
  pushBox(m.positions, m.normals, m.indices, [0.06, -0.14, -0.5], [0.12, -0.08, -0.28]);
  pushBox(m.positions, m.normals, m.indices, [0.06, 0.08, -0.5], [0.12, 0.14, -0.28]);
  // Side shelf.
  pushBox(m.positions, m.normals, m.indices, [0.14, -0.12, -0.12], [0.3, 0.12, -0.06]);
  // The cook.
  pushFigure(m, -0.4, 0, 0.07, 0.1);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  entertainer-stage: a performer on a low platform with a mic stand. */
/* ------------------------------------------------------------------ */

export function createEntertainerStageGeometry(): Geometry {
  const m = emptyArrays();
  // Platform.
  pushBox(m.positions, m.normals, m.indices, [-0.4, -0.3, -0.5], [0.4, 0.3, -0.36]);
  // Performer on the platform.
  pushFigure(m, 0, 0.02, 0.08, 0.2, -0.36);
  // Mic stand: pole + mic.
  pushBox(m.positions, m.normals, m.indices, [0.16, -0.18, -0.36], [0.2, -0.14, 0.16]);
  pushBox(m.positions, m.normals, m.indices, [0.15, -0.19, 0.16], [0.21, -0.13, 0.22]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  entertainer-dance: two figures mid-move, arms out. The paired      */
/*  arms-out silhouette is the discriminator.                          */
/* ------------------------------------------------------------------ */

export function createEntertainerDanceGeometry(): Geometry {
  const m = emptyArrays();
  pushFigure(m, -0.18, -0.02, 0.08, 0.1);
  pushBox(m.positions, m.normals, m.indices, [-0.34, -0.06, 0.0], [-0.02, 0.02, 0.08]);
  pushFigure(m, 0.18, 0.06, 0.08, 0.16);
  pushBox(m.positions, m.normals, m.indices, [0.02, 0.02, 0.06], [0.34, 0.1, 0.14]);
  return buildGeometry(m.positions, m.normals, m.indices);
}

/* ------------------------------------------------------------------ */
/*  entertainer-art: an easel with a tilted canvas and the artist      */
/*  beside it.                                                         */
/* ------------------------------------------------------------------ */

export function createEntertainerArtGeometry(): Geometry {
  const m = emptyArrays();
  // Easel posts + crossbar.
  pushBox(m.positions, m.normals, m.indices, [-0.3, -0.06, -0.5], [-0.24, 0.0, 0.3]);
  pushBox(m.positions, m.normals, m.indices, [-0.06, -0.06, -0.5], [0.0, 0.0, 0.3]);
  pushBox(m.positions, m.normals, m.indices, [-0.32, -0.04, 0.0], [0.02, 0.02, 0.06]);
  // Tilted canvas: double-sided quad leaning back toward the posts.
  const c0: Vec3 = [-0.34, -0.12, -0.14];
  const c1: Vec3 = [0.04, -0.12, -0.14];
  const c2: Vec3 = [0.04, -0.02, 0.3];
  const c3: Vec3 = [-0.34, -0.02, 0.3];
  pushQuad(m.positions, m.normals, m.indices, c0, c1, c2, c3, triNormal(c0, c1, c2));
  pushQuad(m.positions, m.normals, m.indices, c3, c2, c1, c0, triNormal(c3, c2, c1));
  // The artist.
  pushFigure(m, 0.24, 0, 0.08, 0.12);
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
      geometry = createMusicBandGeometry();
      break;
    case "vendor":
      geometry = createVendorStandGeometry();
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
