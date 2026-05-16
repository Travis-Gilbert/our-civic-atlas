import type { PlacesCollection } from "@/lib/api/openFlintAtlas";

export type AtlasLngLat = readonly [number, number];

export type AtlasBounds = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type AtlasSceneSize = {
  width: number;
  depth: number;
};

export type AtlasProjectedPoint = [number, number];
export type AtlasWorldPoint = [number, number, number];

export type AtlasWorldProjection = {
  bounds: AtlasBounds;
  size: AtlasSceneSize;
  projectLngLat: (lngLat: AtlasLngLat) => AtlasWorldPoint;
  projectLngLat2: (lngLat: AtlasLngLat) => AtlasProjectedPoint;
};

export const ATLAS_SCENE_SIZE: AtlasSceneSize = {
  width: 54,
  depth: 41,
};

export const FALLBACK_FLINT_BOUNDS: AtlasBounds = {
  minLng: -83.83,
  minLat: 42.94,
  maxLng: -83.58,
  maxLat: 43.13,
};

export function createAtlasWorldProjection(
  bounds: AtlasBounds = FALLBACK_FLINT_BOUNDS,
  size: AtlasSceneSize = ATLAS_SCENE_SIZE,
): AtlasWorldProjection {
  const lngSpan = bounds.maxLng - bounds.minLng || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;

  function projectLngLat2([lng, lat]: AtlasLngLat): AtlasProjectedPoint {
    const x = ((lng - bounds.minLng) / lngSpan - 0.5) * size.width;
    const z = -(((lat - bounds.minLat) / latSpan - 0.5) * size.depth);
    return [x, z];
  }

  return {
    bounds,
    size,
    projectLngLat(lngLat) {
      const [x, z] = projectLngLat2(lngLat);
      return [x, 0, z];
    },
    projectLngLat2,
  };
}

export function collectGeometryLngLats(
  geometry: GeoJSON.Geometry | null | undefined,
): AtlasLngLat[] {
  if (!geometry) return [];
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap((child) => collectGeometryLngLats(child));
  }

  const coordinates: AtlasLngLat[] = [];
  collectLngLat(geometry.coordinates, coordinates);
  return coordinates;
}

export function geometryCentroid(
  geometry: GeoJSON.Geometry | null | undefined,
): AtlasLngLat | null {
  const coordinates = collectGeometryLngLats(geometry);
  if (coordinates.length === 0) return null;

  const [lngSum, latSum] = coordinates.reduce(
    ([lngTotal, latTotal], [lng, lat]) => [lngTotal + lng, latTotal + lat],
    [0, 0],
  );

  return [lngSum / coordinates.length, latSum / coordinates.length];
}

export function atlasBoundsFromPlaces(
  places: PlacesCollection | null,
): AtlasBounds {
  if (!places) return FALLBACK_FLINT_BOUNDS;

  const coordinates = places.features.flatMap((feature) =>
    collectGeometryLngLats(feature.geometry),
  );
  if (coordinates.length === 0) return FALLBACK_FLINT_BOUNDS;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  if (
    !Number.isFinite(minLng) ||
    maxLng - minLng < 0.04 ||
    maxLat - minLat < 0.04
  ) {
    return FALLBACK_FLINT_BOUNDS;
  }

  return { minLng, minLat, maxLng, maxLat };
}

function collectLngLat(value: unknown, acc: AtlasLngLat[]): void {
  if (!Array.isArray(value)) return;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    acc.push([value[0], value[1]]);
    return;
  }

  for (const child of value) {
    collectLngLat(child, acc);
  }
}
