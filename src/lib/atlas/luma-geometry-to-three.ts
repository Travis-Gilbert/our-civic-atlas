/**
 * lumaGeometryToBufferGeometry — bridge from @luma.gl Geometry (deck.gl)
 * to three.js BufferGeometry (R3F).
 *
 * The atelier R3F scene reuses the building geometry that the deck.gl
 * Lost Flint layer renders (see `src/components/atlas/LostFlintGeometries.ts`).
 * Single source of truth ensures the chipboard mass the user sees during
 * the atelier reconstruction animation is identical to the chipboard mass
 * the user sees in the Lost Flint overlay after exiting the atelier
 * (spec line 246 exit transition).
 *
 * Axis convention:
 *   - luma.gl uses z-up: (x = width, y = depth, z = height)
 *   - three.js uses y-up: (x = width, y = height, z = depth)
 *
 * Transform applied per vertex: (x, y, z)_luma -> (x, z, y)_three.
 * That swap has determinant -1 (improper rotation), so the adapter ALSO
 * reverses triangle winding order to keep front faces facing outward
 * (preserves CCW-from-outside convention).
 *
 * Normals receive the same y<->z swap as positions; they remain unit
 * length and continue to point outward from the surface.
 *
 * KNOWN UPSTREAM ISSUE (surfaced 2026-05-24 during PT-204 quality pass):
 *   LostFlintGeometries.createFlatBoxGeometry() returns @luma.gl
 *   CubeGeometry which spans [-1, +1]^3 (side length 2). The gable and
 *   hipped variants use BODY_CORNERS at [-0.5, +0.5]^3 (side length 1).
 *   Result: flat-roof buildings render 2x larger than gable/hipped at the
 *   same reconstruction.scale parameters. This adapter ports the
 *   discrepancy faithfully; fixing it requires changing
 *   LostFlintGeometries.createFlatBoxGeometry to use the [-0.5, +0.5]
 *   convention (and rebalancing deck.gl AtlasLostFlintDeckLayer
 *   sizeScale to keep the existing visual size in the Lost Flint
 *   overlay constant).
 */

import { BufferGeometry, BufferAttribute } from "three";
import type { Geometry as LumaGeometry } from "@luma.gl/engine";

export function lumaGeometryToBufferGeometry(
  geom: LumaGeometry,
): BufferGeometry {
  const posLuma = geom.attributes.POSITION?.value;
  if (!posLuma) {
    throw new Error(
      "lumaGeometryToBufferGeometry: source Geometry has no POSITION attribute",
    );
  }
  const nrmLuma = geom.attributes.NORMAL?.value ?? null;
  const idxLuma = geom.indices?.value ?? null;

  // Swap y and z per vertex (luma z-up -> three y-up).
  const posThree = new Float32Array(posLuma.length);
  for (let i = 0; i < posLuma.length; i += 3) {
    posThree[i] = posLuma[i];         // x stays
    posThree[i + 1] = posLuma[i + 2]; // y_three = z_luma (height)
    posThree[i + 2] = posLuma[i + 1]; // z_three = y_luma (depth)
  }

  let nrmThree: Float32Array | null = null;
  if (nrmLuma) {
    nrmThree = new Float32Array(nrmLuma.length);
    for (let i = 0; i < nrmLuma.length; i += 3) {
      nrmThree[i] = nrmLuma[i];
      nrmThree[i + 1] = nrmLuma[i + 2];
      nrmThree[i + 2] = nrmLuma[i + 1];
    }
  }

  // Reverse triangle winding to compensate for the y<->z reflection.
  // Without this, every face renders with its back side toward the
  // camera and three's culling drops them entirely.
  let idxThree: Uint16Array | Uint32Array | null = null;
  if (idxLuma) {
    const ctor =
      idxLuma instanceof Uint32Array ? Uint32Array : Uint16Array;
    idxThree = new ctor(idxLuma.length);
    for (let i = 0; i < idxLuma.length; i += 3) {
      idxThree[i] = idxLuma[i];
      idxThree[i + 1] = idxLuma[i + 2];
      idxThree[i + 2] = idxLuma[i + 1];
    }
  }

  const out = new BufferGeometry();
  out.setAttribute("position", new BufferAttribute(posThree, 3));
  if (nrmThree) {
    out.setAttribute("normal", new BufferAttribute(nrmThree, 3));
  }
  if (idxThree) {
    out.setIndex(new BufferAttribute(idxThree, 1));
  }
  return out;
}
