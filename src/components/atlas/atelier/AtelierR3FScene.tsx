"use client";

/**
 * AtelierR3FScene - PT-204
 *
 * R3F scene for the atelier surface. Replaces `AtelierScenePlaceholder`.
 *
 * Contents (v1):
 *   - Perspective camera at oblique drone-shot angle (spec line 43)
 *   - Three-point lighting from camera-right (spec line 35 "lit from
 *     camera-right as if on a museum pedestal")
 *   - Paper-grid ground plane (drei Grid helper sized to scene)
 *   - Single chipboard building mesh extruded from reconstruction footprint
 *     using `atelier-building-geometry` (flat / gable / hipped)
 *   - Ghost-palette material per visual-grammar-v1 (porcelain shadow tone)
 *
 * Lands later:
 *   - PT-301-311 choreographer + camera glide quarter-orbit Stage 6
 *   - PT-402 conflict markers in 3D (R3F Html anchored to building parts)
 *   - PT-205 dust motes (particle field)
 *   - PT-403 graduates from DOM SVG lines to R3F lines once card positions
 *     are computed in scene space
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import { Matrix4, Quaternion, Vector3 } from "three";
import type { BufferGeometry, Group, InstancedMesh } from "three";

import {
  createFlatBoxGeometry,
  createGableRoofedBoxGeometry,
  createHippedRoofedBoxGeometry,
} from "@/components/atlas/LostFlintGeometries";
import { lumaGeometryToBufferGeometry } from "@/lib/atlas/luma-geometry-to-three";
import { GHOST_PALETTE } from "@/lib/atlas/historical-reconstruction";
import type { AtelierDossier } from "@/lib/atlas/use-reconstruction-dossier";
import { AtelierDustMotes } from "@/components/atlas/atelier/AtelierDustMotes";
import { AtelierConflictMarkers } from "@/components/atlas/atelier/AtelierConflictMarkers";
import type { ChoreographerState } from "@/lib/atlas/atelier-choreographer";

type AtelierR3FSceneProps = {
  reconstruction: AtelierDossier["reconstruction"];
  conflicts?: AtelierDossier["conflicts"];
  choreographyState?: ChoreographerState;
};

const BUILDING_GEOMETRY_BY_ROOF = {
  FLAT: () => lumaGeometryToBufferGeometry(createFlatBoxGeometry()),
  GABLE: () => lumaGeometryToBufferGeometry(createGableRoofedBoxGeometry()),
  HIPPED: () => lumaGeometryToBufferGeometry(createHippedRoofedBoxGeometry()),
} as const;

function pickBuildingGeometry(
  roofForm: AtelierDossier["reconstruction"]["roofForm"],
): BufferGeometry {
  const factory =
    BUILDING_GEOMETRY_BY_ROOF[roofForm ?? "FLAT"] ??
    BUILDING_GEOMETRY_BY_ROOF.FLAT;
  return factory();
}

function BuildingMesh({
  reconstruction,
}: {
  reconstruction: AtelierDossier["reconstruction"];
}) {
  const geometry = useMemo(
    () => pickBuildingGeometry(reconstruction.roofForm),
    [reconstruction.roofForm],
  );

  const { widthMeters, depthMeters } = reconstruction.footprint;
  const heightMeters = reconstruction.heightMeters;

  return (
    <mesh
      geometry={geometry}
      position={[0, heightMeters * 0.5, 0]}
      scale={[widthMeters, heightMeters, depthMeters]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={GHOST_PALETTE.shadow}
        emissive={GHOST_PALETTE.mid}
        emissiveIntensity={0.18}
        roughness={0.62}
        metalness={0.04}
        flatShading
      />
    </mesh>
  );
}

type FacadeBox = {
  position: [number, number, number];
  scale: [number, number, number];
};

/**
 * Derive a plausible facade from the massing dimensions alone.
 *
 * The reconstruction spec is usually sparse (footprint + height + roof form
 * only; bays, openings, and material are typically "not documented"). Rather
 * than render a blank block we synthesize a regular facade with three
 * elements, all sized from the footprint and height:
 *   - window openings, one per bay per floor on every wall;
 *   - a ground-level door on the center bay of the frontage (the z-facing
 *     walls, per the LostFlintGeometries frontage convention);
 *   - a slim string-course band wrapping the building at the ground-floor head.
 * This reads as a building, not a box, with zero extra spec data; richer
 * per-opening data can refine it later.
 *
 * Coordinate frame matches `BuildingMesh` (world meters, building at origin,
 * no rotation applied):
 *   x in [-width/2, +width/2], y in [0, height], z in [-depth/2, +depth/2].
 * Walls span y in [0, wallTop] where wallTop = 0.85 * height (the roof cap
 * occupies the top 15% per LostFlintGeometries), so nothing punches the roof.
 *
 * Returns two instance sets: `openings` (dark recesses: windows + door) and
 * `trim` (pale string course), rendered as separate InstancedMeshes because a
 * single InstancedMesh carries exactly one material.
 */
function computeFacade(
  widthMeters: number,
  depthMeters: number,
  heightMeters: number,
): { openings: FacadeBox[]; trim: FacadeBox[] } {
  const wallTop = 0.85 * heightMeters;
  // Degenerate footprints (data missing or a sliver) get no facade rather
  // than a single distorted panel.
  if (wallTop < 1.5 || widthMeters < 1.5 || depthMeters < 1.5) {
    return { openings: [], trim: [] };
  }

  const FLOOR_H = 3.4; // meters per storey
  const BAY = 2.8; // meters between opening centers
  const THICK = 0.12; // panel depth; pokes ~half-proud of the wall

  const rows = Math.max(1, Math.round(wallTop / FLOOR_H));
  const rowYs = Array.from(
    { length: rows },
    (_, i) => ((i + 0.5) / rows) * wallTop,
  );
  const winH = Math.min(1.9, (wallTop / rows) * 0.55);
  const winW = Math.min(1.4, BAY * 0.5);
  const doorH = Math.min(2.2, wallTop * 0.85);
  const doorW = Math.min(1.5, BAY * 0.62);

  const colCenters = (wallLength: number): number[] => {
    const cols = Math.max(1, Math.round(wallLength / BAY));
    return Array.from(
      { length: cols },
      (_, j) => ((j + 0.5) / cols) * wallLength - wallLength / 2,
    );
  };

  const openings: FacadeBox[] = [];

  // Front and back walls (normal along z = the frontage). Windows on every
  // bay/floor, except the ground-floor center bay, which becomes a door
  // (anchored to the ground, so its center sits at doorH / 2).
  for (const z of [depthMeters / 2, -depthMeters / 2]) {
    const proud = Math.sign(z) * (THICK / 2 - 0.01);
    const cols = colCenters(widthMeters);
    const centerCol = Math.floor(cols.length / 2);
    cols.forEach((x, ci) => {
      rowYs.forEach((y, ri) => {
        if (ri === 0 && ci === centerCol) {
          openings.push({
            position: [x, doorH / 2, z + proud],
            scale: [doorW, doorH, THICK],
          });
        } else {
          openings.push({
            position: [x, y, z + proud],
            scale: [winW, winH, THICK],
          });
        }
      });
    });
  }

  // Left and right walls (normal along x): windows only.
  for (const x of [widthMeters / 2, -widthMeters / 2]) {
    const proud = Math.sign(x) * (THICK / 2 - 0.01);
    for (const z of colCenters(depthMeters)) {
      for (const y of rowYs) {
        openings.push({
          position: [x + proud, y, z],
          scale: [THICK, winH, winW],
        });
      }
    }
  }

  // String course: a slim pale band wrapping all four walls. Between storeys
  // for a multi-floor building, just under the eave for a single-storey
  // cottage, so it always reads as a water table rather than floating.
  const bandY = rows >= 2 ? FLOOR_H : wallTop * 0.92;
  const bandH = 0.18;
  const bandThick = 0.16;
  const trim: FacadeBox[] = [];
  for (const z of [depthMeters / 2, -depthMeters / 2]) {
    const proud = Math.sign(z) * (bandThick / 2 - 0.02);
    trim.push({
      position: [0, bandY, z + proud],
      scale: [widthMeters * 0.98, bandH, bandThick],
    });
  }
  for (const x of [widthMeters / 2, -widthMeters / 2]) {
    const proud = Math.sign(x) * (bandThick / 2 - 0.02);
    trim.push({
      position: [x + proud, bandY, 0],
      scale: [bandThick, bandH, depthMeters * 0.98],
    });
  }

  return { openings, trim };
}

/**
 * Renders a set of unit-box instances under one shared material as a single
 * InstancedMesh. Matrices are composed once in a layout effect (before paint,
 * so instances never flash at the origin on first mount).
 */
function InstancedBoxes({
  instances,
  color,
  roughness,
  metalness,
}: {
  instances: FacadeBox[];
  color: string;
  roughness: number;
  metalness: number;
}) {
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const position = new Vector3();
    const scale = new Vector3();
    instances.forEach((instance, i) => {
      position.set(...instance.position);
      scale.set(...instance.scale);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, instances.length]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
      />
    </instancedMesh>
  );
}

/**
 * Procedural facade overlay: window/door openings (dark recesses) plus a pale
 * string course, sized from the footprint and height. Sibling of BuildingMesh
 * in world space (BuildingMesh applies no rotation), so panels stay square and
 * wall-aligned. Renders nothing for degenerate footprints so a missing-data
 * building stays a clean block.
 */
function BuildingFacade({
  reconstruction,
}: {
  reconstruction: AtelierDossier["reconstruction"];
}) {
  const { widthMeters, depthMeters } = reconstruction.footprint;
  const heightMeters = reconstruction.heightMeters;
  const { openings, trim } = useMemo(
    () => computeFacade(widthMeters, depthMeters, heightMeters),
    [widthMeters, depthMeters, heightMeters],
  );

  if (openings.length === 0 && trim.length === 0) return null;

  return (
    <>
      {/* Openings: darker than GHOST_PALETTE.shadow so they read as recesses
          against the porcelain massing; a touch of metalness for a faint
          glassy catch under the key light. */}
      <InstancedBoxes
        instances={openings}
        color="#14100b"
        roughness={0.5}
        metalness={0.1}
      />
      {/* String course: the lightest ghost tone, reading as a raised molding. */}
      <InstancedBoxes
        instances={trim}
        color={GHOST_PALETTE.highlight}
        roughness={0.7}
        metalness={0.02}
      />
    </>
  );
}

/**
 * Camera choreography. During Stage 6 (asset_generation, spec lines
 * 148-160) the camera glides slowly through a 90deg quarter-orbit around
 * the building. Other stages: subtle idle sway so the chipboard model
 * reads as physical. After settled: holds at quarter-orbit final
 * position.
 *
 * Implementation: a `<group>` wraps the scene contents (rotation about
 * world Y); the camera in `<Canvas>` is positioned at a fixed point
 * and the world rotates around it. Equivalent to orbiting the camera
 * around a fixed scene but cheaper (no camera tween).
 */
function ChoreographedCameraGroup({
  children,
  choreographyState,
}: {
  children: React.ReactNode;
  choreographyState?: ChoreographerState;
}) {
  const groupRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const idle = Math.sin(t * 0.1) * 0.035;

    if (!choreographyState) {
      groupRef.current.rotation.y = idle;
      return;
    }

    if (choreographyState.skipped || choreographyState.stage === "settled") {
      // Hold at Stage 6 final orbit position.
      groupRef.current.rotation.y = Math.PI / 4;
      return;
    }

    if (choreographyState.stage === "asset_generation") {
      // Quarter-orbit: 0 to 90deg over Stage 6.
      const eased =
        choreographyState.stageProgress < 0.5
          ? 2 * choreographyState.stageProgress * choreographyState.stageProgress
          : 1 -
            Math.pow(-2 * choreographyState.stageProgress + 2, 2) / 2;
      groupRef.current.rotation.y = (Math.PI / 4) * eased;
      return;
    }

    // Earlier stages: idle sway.
    groupRef.current.rotation.y = idle;
  });
  return <group ref={groupRef}>{children}</group>;
}

export function AtelierR3FScene({
  reconstruction,
  conflicts = [],
  choreographyState,
}: AtelierR3FSceneProps) {
  const { widthMeters, depthMeters } = reconstruction.footprint;
  const heightMeters = reconstruction.heightMeters;
  // Camera positioned so the building fills ~60% of the frame at oblique
  // angle. Distance scales with building diagonal so a small worker's
  // cottage (~7m) and the Whaley House (~18m) both frame consistently.
  const diagonal = Math.hypot(widthMeters, depthMeters, heightMeters);
  const cameraDistance = diagonal * 2.6;
  const cameraHeight = diagonal * 1.4;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
      }}
    >
      <Canvas
        shadows
        camera={{
          position: [cameraDistance, cameraHeight, cameraDistance],
          fov: 32,
          near: 0.1,
          far: cameraDistance * 6,
        }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <color attach="background" args={["#26221c"]} />
        {/* Key light from camera-right (spec line 35). */}
        <directionalLight
          position={[diagonal * 3, diagonal * 4, diagonal * 1.5]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-diagonal * 2}
          shadow-camera-right={diagonal * 2}
          shadow-camera-top={diagonal * 2}
          shadow-camera-bottom={-diagonal * 2}
          shadow-camera-near={0.1}
          shadow-camera-far={diagonal * 10}
        />
        {/* Fill light from camera-left, dimmer warm tone. */}
        <directionalLight
          position={[-diagonal * 2, diagonal * 2, diagonal * 0.5]}
          intensity={0.4}
          color="#f0d4b0"
        />
        {/* Ambient. */}
        <ambientLight intensity={0.45} />

        {/* Paper-grid ground plane. drei Grid sized to comfortable
            surround of the building. Cell color matches atelier.css
            --atelier-grid (warm-cream vellum). */}
        <Grid
          args={[diagonal * 12, diagonal * 12]}
          cellSize={1}
          cellThickness={0.6}
          cellColor="#6b5a45"
          sectionSize={5}
          sectionThickness={1.0}
          sectionColor="#8a7155"
          fadeDistance={diagonal * 8}
          fadeStrength={1.4}
          infiniteGrid
          position={[0, 0, 0]}
        />

        <ChoreographedCameraGroup choreographyState={choreographyState}>
          <BuildingMesh reconstruction={reconstruction} />
          <BuildingFacade reconstruction={reconstruction} />
          <AtelierConflictMarkers
            conflicts={conflicts}
            widthMeters={widthMeters}
            depthMeters={depthMeters}
            heightMeters={heightMeters}
            choreographyState={choreographyState}
          />
          <AtelierDustMotes extent={diagonal * 5} />
        </ChoreographedCameraGroup>
      </Canvas>
    </div>
  );
}
