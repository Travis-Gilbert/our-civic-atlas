"use client";

/**
 * AtelierProceduralHouse - procedural grammar prototype.
 *
 * Slice proving the "more powerful engine" direction: instead of extruding the
 * reconstruction into a parametric box, compose a recognizable period building
 * from a rule-based grammar driven by the reconstruction attributes.
 *
 * This prototype implements the 1885 American gable-front frame house archetype
 * (the Whaley House case): a steep overhanging gable roof, a full-width front
 * porch, a chimney, and tall trimmed windows, all in the GHOST porcelain
 * register. The grammar is PARAMETERIZED so the output visibly responds to
 * data: footprint -> size + bay count, height -> storeys + window rows. A
 * 3-storey 5-bay record produces a 3-storey 5-bay house; that
 * data-responsiveness is the point of the slice.
 *
 * World frame matches BuildingMesh: meters, building centered in x/z, y up,
 * walls y in [0, wallH], front (gable end + porch) at +z toward the camera.
 *
 * Not photoreal: a porcelain MODEL of a specific building, articulated enough to
 * read as "an 1885 frame house" rather than a generic block. Material realism
 * (clapboard, brick) is a deliberate later layer.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import { ExtrudeGeometry, Matrix4, Quaternion, Shape, Vector3 } from "three";
import type { InstancedMesh } from "three";

import { GHOST_PALETTE } from "@/lib/atlas/historical-reconstruction";
import type { AtelierDossier } from "@/lib/atlas/use-reconstruction-dossier";

type Box = {
  position: [number, number, number];
  scale: [number, number, number];
};

const PORCELAIN = {
  color: GHOST_PALETTE.shadow,
  emissive: GHOST_PALETTE.mid,
  emissiveIntensity: 0.18,
  roughness: 0.62,
  metalness: 0.04,
} as const;
const GLASS = { color: "#14100b", roughness: 0.5, metalness: 0.1 } as const;
const TRIM = { color: GHOST_PALETTE.highlight, roughness: 0.7, metalness: 0.02 } as const;

type HouseGrammar = {
  wallH: number;
  roofRise: number;
  eaveOverhang: number;
  porcelain: Box[];
  trim: Box[];
  glass: Box[];
  porchRoof: { position: [number, number, number]; scale: [number, number, number]; rotX: number };
};

/**
 * The grammar: pure function from massing dimensions to a parts list. Every
 * count here is data-derived (storeys from height, bays from footprint), which
 * is what makes this an engine rather than a fixed model.
 */
function buildHouseGrammar(W: number, D: number, H: number): HouseGrammar {
  const wallH = H * 0.62; // eave height; the rest is a steep roof
  const roofRise = Math.max(2.2, H - wallH);
  const storeys = Math.max(1, Math.round(wallH / 3.3));
  const floorH = wallH / storeys;
  const eaveOverhang = Math.min(0.7, 0.3 + W * 0.04);

  const THK = 0.12; // opening panel thickness
  const proud = 0.04;
  const winH = Math.min(1.9, floorH * 0.55);
  const winW = Math.min(1.15, 0.9);
  const framePad = 0.2;

  const rowYs = Array.from({ length: storeys }, (_, s) => (s + 0.5) * floorH);
  const colCenters = (len: number, n: number) =>
    Array.from({ length: n }, (_, j) => ((j + 0.5) / n) * len - len / 2);
  const baysX = Math.max(2, Math.round(W / 3.0)); // across the width (gable ends)
  const baysZ = Math.max(2, Math.round(D / 3.0)); // across the depth (eave sides)

  const frames: Box[] = [];
  const glass: Box[] = [];
  const sills: Box[] = [];

  const addWindow = (cx: number, cy: number, cz: number, facing: "x" | "z") => {
    if (facing === "z") {
      const sgn = Math.sign(cz) || 1;
      const z0 = cz + sgn * proud;
      frames.push({ position: [cx, cy, z0], scale: [winW + framePad, winH + framePad, THK] });
      glass.push({ position: [cx, cy, z0 + sgn * 0.03], scale: [winW, winH, THK] });
      sills.push({
        position: [cx, cy - winH / 2 - 0.09, z0 + sgn * 0.05],
        scale: [winW + framePad + 0.12, 0.1, 0.18],
      });
    } else {
      const sgn = Math.sign(cx) || 1;
      const x0 = cx + sgn * proud;
      frames.push({ position: [x0, cy, cz], scale: [THK, winH + framePad, winW + framePad] });
      glass.push({ position: [x0 + sgn * 0.03, cy, cz], scale: [THK, winH, winW] });
      sills.push({
        position: [x0 + sgn * 0.05, cy - winH / 2 - 0.09, cz],
        scale: [0.18, 0.1, winW + framePad + 0.12],
      });
    }
  };

  // Side walls (eave sides): every storey, every bay.
  for (const x of [W / 2, -W / 2]) {
    for (const z of colCenters(D, baysZ)) for (const y of rowYs) addWindow(x, y, z, "x");
  }
  // Back gable end: every storey, every bay.
  for (const x of colCenters(W, baysX)) for (const y of rowYs) addWindow(x, y, -D / 2, "z");
  // Front gable end: upper storeys only (ground floor carries the door under the porch).
  for (const x of colCenters(W, baysX)) {
    rowYs.forEach((y, s) => {
      if (s > 0) addWindow(x, y, D / 2, "z");
    });
  }
  // Gable-peak window, on the front roof gable cap.
  addWindow(0, wallH + roofRise * 0.42, D / 2 + 0.26, "z");

  // Door, centered on the front ground floor under the porch.
  const doorH = Math.min(2.3, floorH * 0.95);
  const doorW = Math.min(1.35, winW + 0.35);
  const door: Box = { position: [0, doorH / 2, D / 2 + proud + 0.03], scale: [doorW, doorH, THK] };
  const doorFrame: Box = {
    position: [0, doorH / 2 + 0.06, D / 2 + proud],
    scale: [doorW + framePad, doorH + framePad / 2, THK],
  };

  // Porch across the front.
  const porchDepth = Math.min(2.8, Math.max(1.8, D * 0.3));
  const porchW = W * 0.98;
  const porchZc = D / 2 + porchDepth / 2;
  const porchRoofH = Math.min(wallH - 0.4, floorH + 0.5);
  const deck: Box = { position: [0, 0.15, porchZc], scale: [porchW, 0.3, porchDepth] };
  const postH = porchRoofH - 0.3;
  const postZ = D / 2 + porchDepth - 0.18;
  const posts: Box[] = [porchW * 0.46, porchW * 0.16, -porchW * 0.16, -porchW * 0.46].map((x) => ({
    position: [x, 0.3 + postH / 2, postZ] as [number, number, number],
    scale: [0.16, postH, 0.16] as [number, number, number],
  }));
  const stepFront = D / 2 + porchDepth;
  const steps: Box[] = [
    { position: [0, 0.1, stepFront + 0.22], scale: [porchW * 0.5, 0.2, 0.42] },
    { position: [0, -0.02, stepFront + 0.58], scale: [porchW * 0.5, 0.16, 0.42] },
  ];
  const porchRoof = {
    position: [0, porchRoofH, porchZc] as [number, number, number],
    scale: [porchW + 0.4, 0.16, porchDepth + 0.5] as [number, number, number],
    rotX: -0.11,
  };

  // Chimney, straddling the ridge, offset to one side.
  const chimneyH = roofRise + 1.4;
  const chimney: Box = {
    position: [W * 0.22, wallH + chimneyH / 2 - 0.2, -D * 0.12],
    scale: [0.8, chimneyH, 0.8],
  };

  // Water table band around the base.
  const wt = 0.36;
  const waterTable: Box[] = [
    { position: [0, wt / 2, D / 2 + 0.04], scale: [W + 0.2, wt, 0.1] },
    { position: [0, wt / 2, -D / 2 - 0.04], scale: [W + 0.2, wt, 0.1] },
    { position: [W / 2 + 0.04, wt / 2, 0], scale: [0.1, wt, D + 0.2] },
    { position: [-W / 2 - 0.04, wt / 2, 0], scale: [0.1, wt, D + 0.2] },
  ];

  // Corner boards.
  const cb = 0.16;
  const cornerBoards: Box[] = [];
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      cornerBoards.push({
        position: [sx * (W / 2), wallH / 2, sz * (D / 2)],
        scale: [cb, wallH, cb],
      });
    }
  }

  const body: Box = { position: [0, wallH / 2, 0], scale: [W, wallH, D] };

  return {
    wallH,
    roofRise,
    eaveOverhang,
    porcelain: [body, chimney, deck, ...posts, ...steps],
    trim: [...frames, ...sills, ...waterTable, ...cornerBoards, doorFrame],
    glass: [...glass, door],
    porchRoof,
  };
}

/** Render unit-box instances under one material (axis-aligned). */
function InstancedBoxes({
  instances,
  color,
  roughness,
  metalness,
  emissive = "#000000",
  emissiveIntensity = 0,
}: {
  instances: Box[];
  color: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  emissiveIntensity?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const q = new Quaternion();
    const p = new Vector3();
    const s = new Vector3();
    instances.forEach((inst, i) => {
      p.set(...inst.position);
      s.set(...inst.scale);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances]);
  if (instances.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, instances.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </instancedMesh>
  );
}

export function AtelierProceduralHouse({
  reconstruction,
}: {
  reconstruction: AtelierDossier["reconstruction"];
}) {
  const { widthMeters: W, depthMeters: D } = reconstruction.footprint;
  const H = reconstruction.heightMeters;

  const grammar = useMemo(() => buildHouseGrammar(W, D, H), [W, D, H]);

  // Steep gable roof: a triangular prism (ridge along z), eaves overhanging the
  // long walls so the directional light casts the eave shadow line that reads as
  // "roof sheltering walls".
  const roofGeo = useMemo(() => {
    const halfW = W / 2 + grammar.eaveOverhang;
    const shape = new Shape();
    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);
    shape.lineTo(0, grammar.roofRise);
    shape.closePath();
    const depth = D + 0.5;
    const geo = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geo.translate(0, 0, -depth / 2);
    geo.computeVertexNormals();
    return geo;
  }, [W, D, grammar.eaveOverhang, grammar.roofRise]);

  return (
    <group>
      <InstancedBoxes
        instances={grammar.porcelain}
        color={PORCELAIN.color}
        emissive={PORCELAIN.emissive}
        emissiveIntensity={PORCELAIN.emissiveIntensity}
        roughness={PORCELAIN.roughness}
        metalness={PORCELAIN.metalness}
      />
      <mesh geometry={roofGeo} position={[0, grammar.wallH, 0]} castShadow receiveShadow>
        <meshStandardMaterial
          color={PORCELAIN.color}
          emissive={PORCELAIN.emissive}
          emissiveIntensity={PORCELAIN.emissiveIntensity}
          roughness={PORCELAIN.roughness}
          metalness={PORCELAIN.metalness}
          flatShading
        />
      </mesh>
      <mesh
        position={grammar.porchRoof.position}
        rotation={[grammar.porchRoof.rotX, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={grammar.porchRoof.scale} />
        <meshStandardMaterial
          color={PORCELAIN.color}
          emissive={PORCELAIN.emissive}
          emissiveIntensity={PORCELAIN.emissiveIntensity}
          roughness={PORCELAIN.roughness}
          metalness={PORCELAIN.metalness}
          flatShading
        />
      </mesh>
      <InstancedBoxes
        instances={grammar.trim}
        color={TRIM.color}
        roughness={TRIM.roughness}
        metalness={TRIM.metalness}
      />
      <InstancedBoxes
        instances={grammar.glass}
        color={GLASS.color}
        roughness={GLASS.roughness}
        metalness={GLASS.metalness}
      />
    </group>
  );
}
