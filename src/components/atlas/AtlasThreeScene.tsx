"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, Preload } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DoubleSide,
  InstancedMesh,
  MathUtils,
  Object3D,
  Path,
  Shape,
  Vector2,
  Vector3,
} from "three";
import {
  AtlasLostFlintLayer,
  AtlasOsmBuildingsLayer,
} from "@/components/atlas/AtlasBuildingsLayer";
import type { AtlasMapProps } from "@/components/atlas/AtlasMap";
import type {
  PlaceFeature,
  PlacesCollection,
  SpatialEvent,
} from "@/lib/api/openFlintAtlas";
import {
  compileAtlasAreaMeshes,
  type AtlasAreaMesh,
  type AtlasAreaPolygon,
} from "@/lib/atlas/geometry-compiler";
import type { NodeHorizonEntry } from "@/lib/atlas/node-horizon";
import {
  getAtlasSceneDetailPolicy,
  measureAtlasSceneCameraDistance,
  type AtlasSceneDetailPolicy,
} from "@/lib/atlas/scene-detail-policy";
import {
  ATLAS_SCENE_VIEW_MODE_LOOKUP,
  type AtlasLensId,
  type AtlasSceneViewModeId,
} from "@/lib/atlas/scene-view";
import {
  ATLAS_THREE_MATERIALS,
  getAtlasThreeAreaStyle,
  getAtlasThreeEventColor,
  getAtlasThreePlaceColor,
} from "@/lib/atlas/three-materials";
import {
  ATLAS_SCENE_SIZE,
  atlasBoundsFromPlaces,
  createAtlasWorldProjection,
  geometryCentroid,
  type AtlasWorldProjection,
} from "@/lib/atlas/world-projection";
import { cn } from "@/lib/utils";

type ProjectedPlace = {
  id: string;
  name: string;
  placeType: string;
  position: [number, number, number];
  radius: number;
  height: number;
  color: string;
};

type ProjectedEvent = {
  id: string;
  title: string;
  eventType: string;
  placeId: string;
  position: [number, number, number];
  height: number;
  color: string;
};

type AtlasThreeSceneProps = AtlasMapProps & {
  horizonNodes?: NodeHorizonEntry[];
  isMobileViewport?: boolean;
  onSceneCameraDistanceChange?: (distance: number) => void;
};

type AtlasSceneRuntimeStats = {
  areaMeshes: number;
  cameraDistance: number;
  drawCalls: number;
  eventBatches: number;
  eventInstances: number;
  geometries: number;
  labels: number;
  placeBatches: number;
  placeInstances: number;
  triangles: number;
};

const CAMERA_RIG: Record<
  AtlasSceneViewModeId,
  { position: [number, number, number]; lookAt: [number, number, number]; zoom: number }
> = {
  atlas: { position: [0, 70, 18], lookAt: [0, 0, 0], zoom: 15.5 },
  oblique: { position: [18, 38, 48], lookAt: [0, 0, 0], zoom: 14 },
  street: { position: [0, 9, 34], lookAt: [0, 0.4, -7], zoom: 20 },
  section: { position: [-24, 30, 42], lookAt: [0, 0.6, 0], zoom: 13.25 },
};

const LABEL_Z_INDEX_RANGE: [number, number] = [60, 0];
const WATER_ANCHOR_WAVE_POINTS = [
  new Vector3(-0.86, 0.12, -0.18),
  new Vector3(-0.34, 0.12, 0.14),
  new Vector3(0.2, 0.12, -0.12),
  new Vector3(0.78, 0.12, 0.16),
];

function placeHeight(
  placeType: string,
  viewMode: AtlasSceneViewModeId,
): number {
  const scale = ATLAS_SCENE_VIEW_MODE_LOOKUP[viewMode].extrusionScale;
  const base =
    {
      ward: 0.34,
      parcel: 0.5,
      building: 1.55,
      infrastructure: 1.1,
    }[placeType] ?? 0.72;

  return Math.max(0.18, base * (scale === 0 ? 0.28 : scale));
}

function placeRadius(placeType: string): number {
  return (
    {
      ward: 0.7,
      parcel: 0.48,
      building: 0.55,
      infrastructure: 0.42,
    }[placeType] ?? 0.45
  );
}

function projectPlaces(
  places: PlacesCollection | null,
  projection: AtlasWorldProjection,
  viewMode: AtlasSceneViewModeId,
  activeLens: AtlasLensId,
): ProjectedPlace[] {
  if (!places) return [];

  return places.features
    .map((feature: PlaceFeature) => {
      const centroid = geometryCentroid(feature.geometry);
      if (!centroid) return null;

      const placeType = feature.properties.place_type;
      return {
        id: feature.properties.place_id,
        name: feature.properties.name,
        placeType,
        position: projection.projectLngLat(centroid),
        radius: placeRadius(placeType),
        height: placeHeight(placeType, viewMode),
        color: getAtlasThreePlaceColor(placeType, activeLens),
      };
    })
    .filter((place): place is ProjectedPlace => place !== null);
}

function projectEvents(
  events: SpatialEvent[],
  places: ProjectedPlace[],
  activeLens: AtlasLensId,
): ProjectedEvent[] {
  const byPlaceId = new Map(places.map((place) => [place.id, place]));

  return events.flatMap((event, index) => {
    const place = byPlaceId.get(event.place.place_id);
    if (!place) return [];

    return [
      {
        id: event.event_id,
        title: event.title,
        eventType: event.event_type,
        placeId: event.place.place_id,
        position: place.position,
        height: 1.6 + (index % 5) * 0.28,
        color: getAtlasThreeEventColor(event.event_type, activeLens),
      },
    ];
  });
}

function isWaterAnchorEvent(event: ProjectedEvent): boolean {
  const text = `${event.title} ${event.eventType}`.toLowerCase();
  return (
    text.includes("water") ||
    text.includes("service line") ||
    text.includes("main replacement")
  );
}

function selectVisiblePlaceMarkers({
  detailPolicy,
  layerVisibility,
  places,
  selectedPlaceId,
}: {
  detailPolicy: AtlasSceneDetailPolicy;
  layerVisibility: Record<string, boolean>;
  places: ProjectedPlace[];
  selectedPlaceId: string | null;
}): ProjectedPlace[] {
  return places
    .filter((place) => {
      if (layerVisibility.places === false) return false;
      if (place.placeType === "ward" || place.placeType === "park") return false;
      if (
        place.placeType === "infrastructure" &&
        layerVisibility.infrastructure === false
      ) {
        return false;
      }
      return shouldRenderPlaceAtDetail(place, detailPolicy, selectedPlaceId);
    })
    .sort((a, b) => {
      const selectedDelta =
        selectedSortWeight(a, selectedPlaceId) - selectedSortWeight(b, selectedPlaceId);
      if (selectedDelta !== 0) return selectedDelta;
      return placeDetailPriority(a.placeType) - placeDetailPriority(b.placeType);
    })
    .slice(0, detailPolicy.placeLimit);
}

function shouldRenderPlaceAtDetail(
  place: ProjectedPlace,
  detailPolicy: AtlasSceneDetailPolicy,
  selectedPlaceId: string | null,
): boolean {
  if (place.id === selectedPlaceId) return true;
  if (detailPolicy.detailLevel === "object") return true;
  if (detailPolicy.detailLevel === "ward") return place.placeType !== "parcel";
  return (
    place.placeType === "city" ||
    place.placeType === "corridor" ||
    place.placeType === "infrastructure"
  );
}

function selectedSortWeight(
  place: ProjectedPlace,
  selectedPlaceId: string | null,
): number {
  return place.id === selectedPlaceId ? -10 : 0;
}

function placeDetailPriority(placeType: string): number {
  return (
    {
      city: 0,
      corridor: 1,
      infrastructure: 2,
      building: 3,
      parcel: 4,
    }[placeType] ?? 5
  );
}

function SceneCameraRig({
  onCameraDistanceChange,
  viewMode,
}: {
  onCameraDistanceChange: (distance: number) => void;
  viewMode: AtlasSceneViewModeId;
}) {
  const { camera } = useThree();
  const target = CAMERA_RIG[viewMode];
  const position = useMemo(() => new Vector3(...target.position), [target]);
  const lookAt = useMemo(() => new Vector3(...target.lookAt), [target]);
  const lastReportedDistanceRef = useRef(-1);
  const lastReportTimeRef = useRef(-1);

  // R3F camera rigs intentionally mutate the Three camera inside the frame loop.
  // eslint-disable-next-line react-hooks/immutability
  useFrame(({ clock }, delta) => {
    const ease = 1 - Math.exp(-delta * 4);
    camera.position.lerp(position, ease);
    // eslint-disable-next-line react-hooks/immutability
    camera.zoom = MathUtils.lerp(camera.zoom, target.zoom, ease);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();

    if (clock.elapsedTime - lastReportTimeRef.current < 0.25) return;
    lastReportTimeRef.current = clock.elapsedTime;

    const distance = Math.hypot(
      camera.position.x - lookAt.x,
      camera.position.y - lookAt.y,
      camera.position.z - lookAt.z,
    );
    if (Math.abs(distance - lastReportedDistanceRef.current) < 0.5) return;
    lastReportedDistanceRef.current = distance;
    onCameraDistanceChange(distance);
  });

  return null;
}

function SceneRuntimeTelemetry({
  cameraDistance,
  sceneStats,
  onStatsChange,
}: {
  cameraDistance: number;
  sceneStats: Omit<
    AtlasSceneRuntimeStats,
    "cameraDistance" | "drawCalls" | "geometries" | "triangles"
  >;
  onStatsChange: (stats: AtlasSceneRuntimeStats) => void;
}) {
  const { gl } = useThree();
  const lastReportTimeRef = useRef(-1);
  const lastDrawCallsRef = useRef(-1);
  const lastSceneSignatureRef = useRef("");

  useFrame(({ clock }) => {
    if (clock.elapsedTime - lastReportTimeRef.current < 0.5) return;
    lastReportTimeRef.current = clock.elapsedTime;

    const drawCalls = gl.info.render.calls;
    const sceneSignature = [
      sceneStats.areaMeshes,
      sceneStats.eventBatches,
      sceneStats.eventInstances,
      sceneStats.labels,
      sceneStats.placeBatches,
      sceneStats.placeInstances,
      cameraDistance.toFixed(1),
    ].join(":");
    if (
      drawCalls === lastDrawCallsRef.current &&
      sceneSignature === lastSceneSignatureRef.current
    ) {
      return;
    }
    lastDrawCallsRef.current = drawCalls;
    lastSceneSignatureRef.current = sceneSignature;

    onStatsChange({
      ...sceneStats,
      cameraDistance,
      drawCalls,
      geometries: gl.info.memory.geometries,
      triangles: gl.info.render.triangles,
    });
  });

  return null;
}

function SceneBaseLayer({
  anchors,
  detailPolicy,
  waterAnchors,
}: {
  anchors: ProjectedPlace[];
  detailPolicy: AtlasSceneDetailPolicy;
  waterAnchors: ProjectedEvent[];
}) {
  const lines = useMemo(() => {
    const count = 10;
    return Array.from({ length: count + 1 }, (_, index) => {
      const t = index / count - 0.5;
      return {
        id: index,
        x: t * ATLAS_SCENE_SIZE.width,
        z: t * ATLAS_SCENE_SIZE.depth,
      };
    });
  }, []);
  const baseWidth = ATLAS_SCENE_SIZE.width + 14;
  const baseDepth = ATLAS_SCENE_SIZE.depth + 12;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <planeGeometry args={[baseWidth, baseDepth]} />
        <meshBasicMaterial color={ATLAS_THREE_MATERIALS.base.paperDeep} />
      </mesh>
      <OutsideWorldVeil width={baseWidth} depth={baseDepth} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.065, 0]}>
        <planeGeometry args={[ATLAS_SCENE_SIZE.width, ATLAS_SCENE_SIZE.depth]} />
        <meshBasicMaterial color={ATLAS_THREE_MATERIALS.base.paper} />
      </mesh>
      {lines.map((line) => (
        <group key={line.id}>
          <mesh position={[line.x, 0.01, 0]}>
            <boxGeometry args={[0.025, 0.025, ATLAS_SCENE_SIZE.depth]} />
            <meshBasicMaterial
              color={ATLAS_THREE_MATERIALS.base.grid}
              transparent
              opacity={0.33}
            />
          </mesh>
          <mesh position={[0, 0.012, line.z]}>
            <boxGeometry args={[ATLAS_SCENE_SIZE.width, 0.025, 0.025]} />
            <meshBasicMaterial
              color={ATLAS_THREE_MATERIALS.base.grid}
              transparent
              opacity={0.33}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.04, -ATLAS_SCENE_SIZE.depth / 2]}>
        <boxGeometry args={[ATLAS_SCENE_SIZE.width, 0.08, 0.16]} />
        <meshBasicMaterial
          color={ATLAS_THREE_MATERIALS.base.rule}
          transparent
          opacity={0.34}
        />
      </mesh>
      <mesh position={[0, 0.04, ATLAS_SCENE_SIZE.depth / 2]}>
        <boxGeometry args={[ATLAS_SCENE_SIZE.width, 0.08, 0.16]} />
        <meshBasicMaterial
          color={ATLAS_THREE_MATERIALS.base.rule}
          transparent
          opacity={0.34}
        />
      </mesh>
      <mesh position={[-ATLAS_SCENE_SIZE.width / 2, 0.04, 0]}>
        <boxGeometry args={[0.16, 0.08, ATLAS_SCENE_SIZE.depth]} />
        <meshBasicMaterial
          color={ATLAS_THREE_MATERIALS.base.rule}
          transparent
          opacity={0.34}
        />
      </mesh>
      <mesh position={[ATLAS_SCENE_SIZE.width / 2, 0.04, 0]}>
        <boxGeometry args={[0.16, 0.08, ATLAS_SCENE_SIZE.depth]} />
        <meshBasicMaterial
          color={ATLAS_THREE_MATERIALS.base.rule}
          transparent
          opacity={0.34}
        />
      </mesh>
      <CivicAnchorLayer
        anchors={anchors}
        showLabels={detailPolicy.showAnchorLabels}
      />
      <WaterAnchorLayer events={waterAnchors} />
    </group>
  );
}

function OutsideWorldVeil({ depth, width }: { depth: number; width: number }) {
  const edgeWidth = (width - ATLAS_SCENE_SIZE.width) / 2;
  const edgeDepth = (depth - ATLAS_SCENE_SIZE.depth) / 2;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-ATLAS_SCENE_SIZE.width / 2 - edgeWidth / 2, -0.052, 0]}
      >
        <planeGeometry args={[edgeWidth, depth]} />
        <meshBasicMaterial
          color={ATLAS_THREE_MATERIALS.base.veil}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[ATLAS_SCENE_SIZE.width / 2 + edgeWidth / 2, -0.052, 0]}
      >
        <planeGeometry args={[edgeWidth, depth]} />
        <meshBasicMaterial
          color={ATLAS_THREE_MATERIALS.base.veil}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, -ATLAS_SCENE_SIZE.depth / 2 - edgeDepth / 2]}
      >
        <planeGeometry args={[ATLAS_SCENE_SIZE.width, edgeDepth]} />
        <meshBasicMaterial
          color={ATLAS_THREE_MATERIALS.base.veil}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, ATLAS_SCENE_SIZE.depth / 2 + edgeDepth / 2]}
      >
        <planeGeometry args={[ATLAS_SCENE_SIZE.width, edgeDepth]} />
        <meshBasicMaterial
          color={ATLAS_THREE_MATERIALS.base.veil}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function WaterAnchorLayer({ events }: { events: ProjectedEvent[] }) {
  if (events.length === 0) return null;

  return (
    <group>
      {events.map((event) => (
        <group key={event.id} position={event.position}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <torusGeometry args={[0.66, 0.026, 8, 34]} />
            <meshBasicMaterial
              color={ATLAS_THREE_MATERIALS.base.water}
              transparent
              opacity={0.56}
            />
          </mesh>
          <Line
            points={WATER_ANCHOR_WAVE_POINTS}
            color={ATLAS_THREE_MATERIALS.base.water}
            transparent
            opacity={0.7}
            lineWidth={1.5}
          />
        </group>
      ))}
    </group>
  );
}

function CivicAnchorLayer({
  anchors,
  showLabels,
}: {
  anchors: ProjectedPlace[];
  showLabels: boolean;
}) {
  const labelAnchorIds = useMemo(
    () => (showLabels ? selectAnchorLabels(anchors) : new Set<string>()),
    [anchors, showLabels],
  );

  return (
    <group>
      {anchors.map((anchor) => (
        <CivicAnchor
          key={anchor.id}
          anchor={anchor}
          showLabel={labelAnchorIds.has(anchor.id)}
        />
      ))}
    </group>
  );
}

function CivicAnchor({
  anchor,
  showLabel = true,
}: {
  anchor: ProjectedPlace;
  showLabel?: boolean;
}) {
  const isCorridor = anchor.placeType === "corridor";
  const color = isCorridor
    ? ATLAS_THREE_MATERIALS.base.corridor
    : ATLAS_THREE_MATERIALS.base.cityAnchor;

  return (
    <group position={anchor.position}>
      {isCorridor && (
        <Line
          points={[
            new Vector3(-1.8, 0.2, 0),
            new Vector3(1.8, 0.2, 0),
          ]}
          color={color}
          transparent
          opacity={0.66}
          lineWidth={2}
        />
      )}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <torusGeometry args={[isCorridor ? 0.46 : 0.58, 0.035, 10, 34]} />
        <meshBasicMaterial color={color} transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.72, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.42} />
      </mesh>
      {showLabel && (
        <Html
          position={[0, 1.05, 0]}
          center
          className="atlas-three-label atlas-three-label-anchor"
          zIndexRange={LABEL_Z_INDEX_RANGE}
        >
          {anchor.name}
        </Html>
      )}
    </group>
  );
}

function AtlasAreaSurfaces({
  areas,
  selectedPlaceId,
  activeLens,
  detailPolicy,
  viewMode,
  onSelect,
}: {
  areas: AtlasAreaMesh[];
  selectedPlaceId: string | null;
  activeLens: AtlasLensId;
  detailPolicy: AtlasSceneDetailPolicy;
  viewMode: AtlasSceneViewModeId;
  onSelect: (placeId: string) => void;
}) {
  const labelAreaIds = useMemo(
    () =>
      selectAreaLabels({
        areas,
        detailPolicy,
        selectedPlaceId,
        viewMode,
      }),
    [areas, detailPolicy, selectedPlaceId, viewMode],
  );

  return (
    <group>
      {areas.map((area) => (
        <AtlasAreaSurface
          key={area.id}
          area={area}
          selected={area.id === selectedPlaceId}
          activeLens={activeLens}
          showLabel={labelAreaIds.has(area.id)}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function AtlasAreaSurface({
  area,
  selected,
  activeLens,
  showLabel,
  onSelect,
}: {
  area: AtlasAreaMesh;
  selected: boolean;
  activeLens: AtlasLensId;
  showLabel: boolean;
  onSelect: (placeId: string) => void;
}) {
  const shapes = useMemo(
    () => area.polygons.map((polygon) => polygonToShape(polygon)),
    [area.polygons],
  );
  const style = getAtlasThreeAreaStyle(area.placeType, activeLens, selected);

  return (
    <group>
      {shapes.map((shape, index) => (
        <mesh
          key={`${area.id}:fill:${index}`}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, style.y, 0]}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(area.id);
          }}
          name={area.name}
        >
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial
            color={style.fill}
            transparent
            opacity={style.fillOpacity}
            side={DoubleSide}
            roughness={0.82}
            metalness={0.03}
            depthWrite={false}
          />
        </mesh>
      ))}
      {area.polygons.map((polygon, index) => (
        <AreaOutline
          key={`${area.id}:outline:${index}`}
          polygon={polygon}
          style={style}
        />
      ))}
      {showLabel && (
        <Html
          position={[area.centroid[0], 0.7, area.centroid[2]]}
          center
          className={cn(
            "atlas-three-label",
            area.placeType === "ward" && "atlas-three-label-ward",
            selected && "is-selected",
          )}
          zIndexRange={LABEL_Z_INDEX_RANGE}
        >
          {area.name}
        </Html>
      )}
    </group>
  );
}

function AreaOutline({
  polygon,
  style,
}: {
  polygon: AtlasAreaPolygon;
  style: ReturnType<typeof getAtlasThreeAreaStyle>;
}) {
  const outerPoints = useMemo(
    () => ringWorldPoints(polygon.outer, style.y + 0.055),
    [polygon.outer, style.y],
  );
  const holePoints = useMemo(
    () => polygon.holes.map((ring) => ringWorldPoints(ring, style.y + 0.045)),
    [polygon.holes, style.y],
  );

  return (
    <group>
      <Line
        points={outerPoints}
        color={style.line}
        transparent
        opacity={style.lineOpacity}
        lineWidth={style.lineWidth}
      />
      {holePoints.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#5f6674"
          transparent
          opacity={0.35}
          lineWidth={1}
        />
      ))}
    </group>
  );
}

function PlaceInstances({
  places,
  onSelect,
}: {
  places: ProjectedPlace[];
  onSelect: (placeId: string) => void;
}) {
  const colorGroups = useMemo(() => groupByColor(places), [places]);

  return (
    <group>
      {colorGroups.map((group) => (
        <PlaceInstanceGroup
          key={group.color}
          color={group.color}
          places={group.items}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function PlaceInstanceGroup({
  color,
  places,
  onSelect,
}: {
  color: string;
  places: ProjectedPlace[];
  onSelect: (placeId: string) => void;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObject = useMemo(() => new Object3D(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    places.forEach((place, index) => {
      const [x, , z] = place.position;
      tempObject.position.set(x, place.height / 2, z);
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(place.radius, place.height, place.radius);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    });

    mesh.count = places.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [places, tempObject]);

  if (places.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, places.length]}
      name="atlas-place-instances"
      onClick={(event) => {
        event.stopPropagation();
        const instanceId = event.instanceId;
        if (instanceId == null) return;
        const place = places[instanceId];
        if (place) onSelect(place.id);
      }}
    >
      <cylinderGeometry args={[1, 0.9, 1, 10]} />
      <meshStandardMaterial
        color={color}
        roughness={0.72}
        metalness={0.06}
      />
    </instancedMesh>
  );
}

function SelectedPlaceFocus({ place }: { place: ProjectedPlace | null }) {
  if (!place) return null;

  return (
    <group position={place.position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
        <torusGeometry args={[place.radius * 1.9, 0.045, 10, 40]} />
        <meshBasicMaterial
          color={ATLAS_THREE_MATERIALS.selected.glow}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={[0, place.height + 0.26, 0]}>
        <sphereGeometry args={[place.radius * 0.42, 16, 10]} />
        <meshStandardMaterial
          color={ATLAS_THREE_MATERIALS.selected.glow}
          emissive={ATLAS_THREE_MATERIALS.selected.glow}
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}

function polygonToShape(polygon: AtlasAreaPolygon): Shape {
  const shape = new Shape(projectedPointsToVector2(polygon.outer));
  for (const hole of polygon.holes) {
    const path = new Path(projectedPointsToVector2(hole));
    shape.holes.push(path);
  }
  return shape;
}

function projectedPointsToVector2(points: Array<[number, number]>): Vector2[] {
  return points.map(([x, z]) => new Vector2(x, z));
}

function ringWorldPoints(points: Array<[number, number]>, y: number): Vector3[] {
  const closed = points.length > 0 ? [...points, points[0]] : [];
  return closed.map(([x, z]) => new Vector3(x, y, z));
}

function shouldShowAreaLabel(
  area: AtlasAreaMesh,
  selected: boolean,
  viewMode: AtlasSceneViewModeId,
  detailPolicy: AtlasSceneDetailPolicy,
): boolean {
  if (selected) return true;
  if (!detailPolicy.showAreaLabels) return false;
  if (area.placeType !== "ward") return false;
  return viewMode === "atlas";
}

function selectAnchorLabels(anchors: ProjectedPlace[]): Set<string> {
  const selected = new Set<string>();
  const placed: Array<[number, number]> = [];
  const minDistance = 12;

  const sortedAnchors = [...anchors].sort(
    (a, b) => anchorLabelPriority(a) - anchorLabelPriority(b),
  );

  for (const anchor of sortedAnchors) {
    const [x, , z] = anchor.position;
    if (placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < minDistance)) {
      continue;
    }
    selected.add(anchor.id);
    placed.push([x, z]);
  }

  return selected;
}

function anchorLabelPriority(anchor: ProjectedPlace): number {
  if (anchor.name.toLowerCase().includes("city of flint")) return -1;
  if (anchor.placeType === "city") return 0;
  if (anchor.placeType === "corridor") return 1;
  return 2;
}

function selectAreaLabels({
  areas,
  detailPolicy,
  selectedPlaceId,
  viewMode,
}: {
  areas: AtlasAreaMesh[];
  detailPolicy: AtlasSceneDetailPolicy;
  selectedPlaceId: string | null;
  viewMode: AtlasSceneViewModeId;
}): Set<string> {
  const selected = new Set<string>();
  const placed: Array<[number, number]> = [];
  const minDistance = viewMode === "atlas" ? 4.8 : 3.6;

  for (const area of areas) {
    const isSelected = area.id === selectedPlaceId;
    if (!shouldShowAreaLabel(area, isSelected, viewMode, detailPolicy)) continue;
    const [x, , z] = area.centroid;
    if (!isSelected && placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < minDistance)) {
      continue;
    }
    selected.add(area.id);
    placed.push([x, z]);
  }

  return selected;
}

function EventInstances({
  events,
  onSelect,
}: {
  events: ProjectedEvent[];
  onSelect: (placeId: string) => void;
}) {
  const colorGroups = useMemo(() => groupByColor(events), [events]);

  return (
    <group>
      <SourceHaloInstances events={events} />
      {colorGroups.map((group) => (
        <EventInstanceGroup
          key={group.color}
          color={group.color}
          events={group.items}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function SourceHaloInstances({ events }: { events: ProjectedEvent[] }) {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObject = useMemo(() => new Object3D(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    events.forEach((event, index) => {
      const [x, , z] = event.position;
      const radius = 0.46 + Math.min(event.height * 0.07, 0.32);
      tempObject.position.set(x, 0.18, z);
      tempObject.rotation.set(Math.PI / 2, 0, 0);
      tempObject.scale.set(radius, radius, radius);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    });

    mesh.count = events.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [events, tempObject]);

  if (events.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, events.length]}
      name="atlas-source-support-halos"
    >
      <torusGeometry args={[1, 0.035, 8, 36]} />
      <meshBasicMaterial
        color={ATLAS_THREE_MATERIALS.selected.sourceHalo}
        transparent
        opacity={0.42}
      />
    </instancedMesh>
  );
}

function EventInstanceGroup({
  color,
  events,
  onSelect,
}: {
  color: string;
  events: ProjectedEvent[];
  onSelect: (placeId: string) => void;
}) {
  const stemMeshRef = useRef<InstancedMesh>(null);
  const headMeshRef = useRef<InstancedMesh>(null);
  const tempObject = useMemo(() => new Object3D(), []);

  useEffect(() => {
    const stemMesh = stemMeshRef.current;
    const headMesh = headMeshRef.current;
    if (!stemMesh || !headMesh) return;

    events.forEach((event, index) => {
      const [x, , z] = event.position;

      tempObject.position.set(x, event.height / 2, z);
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(0.035, event.height, 0.035);
      tempObject.updateMatrix();
      stemMesh.setMatrixAt(index, tempObject.matrix);

      tempObject.position.set(x, event.height, z);
      tempObject.scale.set(0.24, 0.24, 0.24);
      tempObject.updateMatrix();
      headMesh.setMatrixAt(index, tempObject.matrix);
    });

    for (const mesh of [stemMesh, headMesh]) {
      mesh.count = events.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [events, tempObject]);

  if (events.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={stemMeshRef}
        args={[undefined, undefined, events.length]}
        name="atlas-event-stems"
      >
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.58}
        />
      </instancedMesh>
      <instancedMesh
        ref={headMeshRef}
        args={[undefined, undefined, events.length]}
        name="atlas-event-heads"
        onClick={(event) => {
          event.stopPropagation();
          const instanceId = event.instanceId;
          if (instanceId == null) return;
          const beacon = events[instanceId];
          if (beacon) onSelect(beacon.placeId);
        }}
      >
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.28}
          roughness={0.48}
        />
      </instancedMesh>
    </group>
  );
}

function groupByColor<T extends { color: string }>(
  items: T[],
): Array<{ color: string; items: T[] }> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.color);
    if (group) {
      group.push(item);
    } else {
      groups.set(item.color, [item]);
    }
  }
  return Array.from(groups, ([color, groupedItems]) => ({
    color,
    items: groupedItems,
  }));
}

function HorizonPortals({ nodes }: { nodes: NodeHorizonEntry[] }) {
  const portals = nodes.slice(0, 7).map((node, index) => {
    const fallbackDegrees =
      (index / Math.max(nodes.length, 1)) * 360;
    const degrees = node.directionDegrees ?? fallbackDegrees;
    const radians = ((degrees - 90) * Math.PI) / 180;
    const radius =
      Math.max(ATLAS_SCENE_SIZE.width, ATLAS_SCENE_SIZE.depth) / 2 +
      2.2 +
      node.normalizedDistance * 5.6;
    return {
      node,
      x: Math.cos(radians) * radius,
      z: Math.sin(radians) * radius,
    };
  });

  return (
    <group>
      {portals.map(({ node, x, z }) => {
        const accent =
          node.relation === "child"
            ? "#c14a2c"
            : node.relation === "parent"
              ? "#5c6aa0"
              : "#7c7f8f";
        const yaw = Math.atan2(-x, -z);

        return (
          <group key={node.atlasId} position={[x, 0, z]} rotation={[0, yaw, 0]}>
            <mesh position={[0, 0.34, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.7, 6]} />
              <meshBasicMaterial color="#2a2419" transparent opacity={0.32} />
            </mesh>
            <mesh rotation={[-Math.PI / 2.75, 0, 0]} position={[0, 1.18, 0]}>
              <planeGeometry args={[2.7, 1.84]} />
              <meshStandardMaterial
                color="#f6f4ee"
                emissive="#f6f4ee"
                emissiveIntensity={0.08}
                roughness={0.88}
                metalness={0.02}
                side={DoubleSide}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2.75, 0, 0]} position={[0, 1.21, 0.02]}>
              <planeGeometry args={[2.16, 1.3]} />
              <meshBasicMaterial
                color={accent}
                transparent
                opacity={0.16}
                side={DoubleSide}
              />
            </mesh>
            <mesh position={[0, 2.02, 0.02]}>
              <boxGeometry args={[0.34, 0.1, 0.06]} />
              <meshStandardMaterial
                color={accent}
                emissive={accent}
                emissiveIntensity={0.22}
                roughness={0.42}
              />
            </mesh>
            <Line
              points={[
                [-0.96, 1.3, 0.03],
                [0.96, 1.3, 0.03],
              ]}
              color={accent}
              lineWidth={0.9}
              transparent
              opacity={0.82}
            />
            <Line
              points={[
                [-0.78, 0.95, 0.03],
                [0.78, 0.95, 0.03],
              ]}
              color="#2a2419"
              lineWidth={0.6}
              transparent
              opacity={0.24}
            />
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <torusGeometry args={[0.44, 0.042, 10, 28]} />
              <meshStandardMaterial
                color={accent}
                emissive={accent}
                emissiveIntensity={0.12}
                roughness={0.64}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function AtlasThreeScene({
  places,
  events,
  onPlaceSelect,
  selectedPlaceId,
  layerVisibility,
  isMobileViewport = false,
  viewMode = "oblique",
  activeLens = "explore",
  className,
  horizonNodes = [],
  onSceneCameraDistanceChange,
}: AtlasThreeSceneProps) {
  const targetCameraDistance = useMemo(
    () => measureAtlasSceneCameraDistance(CAMERA_RIG[viewMode]),
    [viewMode],
  );
  const [cameraDistance, setCameraDistance] = useState(targetCameraDistance);
  const [runtimeStats, setRuntimeStats] = useState<AtlasSceneRuntimeStats | null>(
    null,
  );

  useEffect(() => {
    setCameraDistance(targetCameraDistance);
  }, [targetCameraDistance]);

  const handleCameraDistanceChange = useCallback((distance: number) => {
    setCameraDistance((current) =>
      Math.abs(current - distance) < 0.35 ? current : distance,
    );
    onSceneCameraDistanceChange?.(distance);
  }, [onSceneCameraDistanceChange]);

  const detailPolicy = useMemo(
    () =>
      getAtlasSceneDetailPolicy({
        activeLens,
        cameraDistance,
        isMobileViewport,
        viewMode,
      }),
    [activeLens, cameraDistance, isMobileViewport, viewMode],
  );
  const bounds = useMemo(() => atlasBoundsFromPlaces(places), [places]);
  const projection = useMemo(() => createAtlasWorldProjection(bounds), [bounds]);
  const areaMeshes = useMemo(
    () =>
      compileAtlasAreaMeshes(places, projection, {
        includePlaceTypes: detailPolicy.showParkAreas
          ? ["ward", "park"]
          : ["ward"],
        minPointDistance: detailPolicy.areaMinPointDistance,
      }),
    [places, projection, detailPolicy.showParkAreas, detailPolicy.areaMinPointDistance],
  );
  const projectedPlaces = useMemo(
    () => projectPlaces(places, projection, viewMode, activeLens),
    [places, projection, viewMode, activeLens],
  );
  const projectedEvents = useMemo(
    () => projectEvents(events, projectedPlaces, activeLens),
    [events, projectedPlaces, activeLens],
  );

  const visibleAreas = useMemo(
    () =>
      areaMeshes.filter((area) => {
        if (area.placeType === "ward" && layerVisibility.wards === false) return false;
        if (area.placeType === "park" && layerVisibility.places === false) return false;
        return true;
      }),
    [areaMeshes, layerVisibility],
  );

  const visiblePlaces = useMemo(
    () =>
      selectVisiblePlaceMarkers({
        detailPolicy,
        layerVisibility,
        places: projectedPlaces,
        selectedPlaceId,
      }),
    [detailPolicy, layerVisibility, projectedPlaces, selectedPlaceId],
  );

  const showEvents =
    layerVisibility.events !== false && detailPolicy.showEventBeacons;
  const visibleEventBeacons = useMemo(
    () => (showEvents ? projectedEvents.slice(0, detailPolicy.eventLimit) : []),
    [detailPolicy.eventLimit, projectedEvents, showEvents],
  );
  const waterAnchors = useMemo(
    () =>
      showEvents
        ? projectedEvents.filter(isWaterAnchorEvent).slice(0, 4)
        : [],
    [projectedEvents, showEvents],
  );
  const selectedVisiblePlace =
    visiblePlaces.find((place) => place.id === selectedPlaceId) ?? null;
  const civicAnchors = useMemo(
    () =>
      projectedPlaces.filter(
        (place) => place.placeType === "city" || place.placeType === "corridor",
      ),
    [projectedPlaces],
  );
  const visibleAnchorLabelCount = useMemo(
    () =>
      detailPolicy.showAnchorLabels ? selectAnchorLabels(civicAnchors).size : 0,
    [civicAnchors, detailPolicy.showAnchorLabels],
  );
  const visibleAreaLabelCount = useMemo(
    () =>
      selectAreaLabels({
        areas: visibleAreas,
        detailPolicy,
        selectedPlaceId,
        viewMode,
      }).size,
    [detailPolicy, selectedPlaceId, viewMode, visibleAreas],
  );
  const sceneStats = useMemo(
    () => {
      const placeBatches = groupByColor(visiblePlaces).length;
      const eventBatches = groupByColor(visibleEventBeacons).length;
      return {
        areaMeshes: visibleAreas.reduce(
          (sum, area) => sum + area.polygons.length,
          0,
        ),
        eventBatches,
        eventInstances: visibleEventBeacons.length,
        labels: visibleAreaLabelCount + visibleAnchorLabelCount,
        placeBatches,
        placeInstances: visiblePlaces.length,
      };
    },
    [
      visibleAnchorLabelCount,
      visibleAreaLabelCount,
      visibleAreas,
      visibleEventBeacons,
      visiblePlaces,
    ],
  );
  const drawCalls = runtimeStats?.drawCalls ?? 0;
  const triangles = runtimeStats?.triangles ?? 0;
  const geometries = runtimeStats?.geometries ?? 0;

  return (
    <div
      className={cn("atlas-scene-map atlas-three-scene relative h-full w-full", className)}
      aria-label={`Three-dimensional Flint atlas scene, ${detailPolicy.detailLevel} detail, ${sceneStats.placeInstances} place markers, ${sceneStats.eventInstances} event markers`}
      data-atlas-view-mode={viewMode}
      data-atlas-lens={activeLens}
      data-atlas-detail={detailPolicy.detailLevel}
      data-atlas-camera-band={detailPolicy.cameraDistanceBand}
      data-atlas-camera-distance={cameraDistance.toFixed(1)}
      data-atlas-draw-calls={drawCalls}
      data-atlas-event-batches={sceneStats.eventBatches}
      data-atlas-event-instances={sceneStats.eventInstances}
      data-atlas-geometries={geometries}
      data-atlas-labels={sceneStats.labels}
      data-atlas-place-batches={sceneStats.placeBatches}
      data-atlas-place-instances={sceneStats.placeInstances}
      data-atlas-renderer="r3f"
      data-atlas-triangles={triangles}
      data-atlas-water-anchors={waterAnchors.length}
      role="region"
    >
      <Canvas
        orthographic
        dpr={detailPolicy.dpr}
        camera={{ position: [18, 38, 48], zoom: 14, near: 0.1, far: 600 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        fallback={<div className="atlas-three-fallback">Baseline renderer available.</div>}
      >
        <color attach="background" args={["#efe9dc"]} />
        <fog attach="fog" args={["#efe9dc", 54, 112]} />
        <Suspense fallback={null}>
          <SceneCameraRig
            onCameraDistanceChange={handleCameraDistanceChange}
            viewMode={viewMode}
          />
          <SceneRuntimeTelemetry
            cameraDistance={cameraDistance}
            sceneStats={sceneStats}
            onStatsChange={setRuntimeStats}
          />
          <ambientLight intensity={1.85} />
          <directionalLight position={[-12, 24, 18]} intensity={2.2} />
          <directionalLight position={[14, 10, -12]} intensity={0.78} color="#f0c27a" />

          <SceneBaseLayer
            anchors={civicAnchors}
            detailPolicy={detailPolicy}
            waterAnchors={waterAnchors}
          />
          <AtlasAreaSurfaces
            areas={visibleAreas}
            selectedPlaceId={selectedPlaceId}
            activeLens={activeLens}
            detailPolicy={detailPolicy}
            viewMode={viewMode}
            onSelect={onPlaceSelect}
          />
          <AtlasOsmBuildingsLayer projection={projection} />
          <AtlasLostFlintLayer projection={projection} />
          {detailPolicy.showHorizonPortals && <HorizonPortals nodes={horizonNodes} />}
          <PlaceInstances places={visiblePlaces} onSelect={onPlaceSelect} />
          <SelectedPlaceFocus place={selectedVisiblePlace} />
          <EventInstances events={visibleEventBeacons} onSelect={onPlaceSelect} />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}
