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

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import type { BufferGeometry, Group } from "three";

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
