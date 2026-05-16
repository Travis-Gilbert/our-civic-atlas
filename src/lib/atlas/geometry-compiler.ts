import type {
  PlaceFeature,
  PlacesCollection,
} from "@/lib/api/openFlintAtlas";
import {
  geometryCentroid,
  type AtlasLngLat,
  type AtlasProjectedPoint,
  type AtlasWorldPoint,
  type AtlasWorldProjection,
} from "@/lib/atlas/world-projection";

export type AtlasAreaPolygon = {
  outer: AtlasProjectedPoint[];
  holes: AtlasProjectedPoint[][];
};

export type AtlasAreaMesh = {
  id: string;
  name: string;
  placeType: string;
  polygons: AtlasAreaPolygon[];
  centroid: AtlasWorldPoint;
  sourceFeature: PlaceFeature;
};

export type CompileAtlasAreaMeshesOptions = {
  includePlaceTypes?: readonly string[];
  minPointDistance?: number;
};

const DEFAULT_AREA_TYPES = ["ward"] as const;
const DEFAULT_MIN_POINT_DISTANCE = 0.08;

export function compileAtlasAreaMeshes(
  places: PlacesCollection | null,
  projection: AtlasWorldProjection,
  options: CompileAtlasAreaMeshesOptions = {},
): AtlasAreaMesh[] {
  if (!places) return [];

  const includePlaceTypes = new Set(
    options.includePlaceTypes ?? DEFAULT_AREA_TYPES,
  );
  const minPointDistance =
    options.minPointDistance ?? DEFAULT_MIN_POINT_DISTANCE;

  return places.features.flatMap((feature) => {
    if (!includePlaceTypes.has(feature.properties.place_type)) return [];

    const polygons = geometryToPolygons(feature.geometry)
      .map((rings) => compilePolygon(rings, projection, minPointDistance))
      .filter((polygon): polygon is AtlasAreaPolygon => polygon !== null);

    if (polygons.length === 0) return [];

    const centroidLngLat = geometryCentroid(feature.geometry);
    const centroid = centroidLngLat
      ? projection.projectLngLat(centroidLngLat)
      : polygonCentroid(polygons[0]);

    return [
      {
        id: feature.properties.place_id,
        name: feature.properties.name,
        placeType: feature.properties.place_type,
        polygons,
        centroid,
        sourceFeature: feature,
      },
    ];
  });
}

function compilePolygon(
  rings: AtlasLngLat[][],
  projection: AtlasWorldProjection,
  minPointDistance: number,
): AtlasAreaPolygon | null {
  const [outerRing, ...holeRings] = rings;
  if (!outerRing || outerRing.length < 4) return null;

  const outer = simplifyProjectedRing(
    outerRing.map((point) => projection.projectLngLat2(point)),
    minPointDistance,
  );
  if (outer.length < 3) return null;

  const holes = holeRings
    .map((ring) =>
      simplifyProjectedRing(
        ring.map((point) => projection.projectLngLat2(point)),
        minPointDistance,
      ),
    )
    .filter((ring) => ring.length >= 3);

  return { outer, holes };
}

function geometryToPolygons(
  geometry: GeoJSON.Geometry | null,
): AtlasLngLat[][][] {
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    return [toLngLatRings(geometry.coordinates)];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map(toLngLatRings);
  }

  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap(geometryToPolygons);
  }

  return [];
}

function toLngLatRings(rings: GeoJSON.Position[][]): AtlasLngLat[][] {
  return rings.map((ring) =>
    ring.flatMap((position) => {
      const [lng, lat] = position;
      if (typeof lng !== "number" || typeof lat !== "number") return [];
      return [[lng, lat] satisfies AtlasLngLat];
    }),
  );
}

function simplifyProjectedRing(
  points: AtlasProjectedPoint[],
  minDistance: number,
): AtlasProjectedPoint[] {
  const simplified: AtlasProjectedPoint[] = [];

  for (const point of points) {
    const previous = simplified.at(-1);
    if (!previous || distance(previous, point) >= minDistance) {
      simplified.push(point);
    }
  }

  if (simplified.length >= 2 && distance(simplified[0], simplified.at(-1)!) < minDistance) {
    simplified.pop();
  }

  return simplified;
}

function distance(a: AtlasProjectedPoint, b: AtlasProjectedPoint): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function polygonCentroid(polygon: AtlasAreaPolygon): AtlasWorldPoint {
  const [xTotal, zTotal] = polygon.outer.reduce(
    ([xAcc, zAcc], [x, z]) => [xAcc + x, zAcc + z],
    [0, 0],
  );
  return [xTotal / polygon.outer.length, 0, zTotal / polygon.outer.length];
}
