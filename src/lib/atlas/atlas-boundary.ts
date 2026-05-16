import flintBoundary from "@/data/open-flint-atlas/fixtures/static-package/data/boundaries/flint-city.json";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
} from "geojson";
import { getStaticAtlasPackage } from "./static-package";

export type AtlasBBox = [number, number, number, number];

export type AtlasViewportState = {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
};

export type AtlasCameraPresetId =
  | "county"
  | "city"
  | "neighborhood"
  | "corridor"
  | "parcel";

type BoundaryGeometry = Polygon | MultiPolygon;

type BoundaryFeatureProperties = {
  place_id?: string;
  place_type?: string;
};

const atlasNode = getStaticAtlasPackage().atlasNode;
const boundaryFeatureCollection = flintBoundary as FeatureCollection<
  Geometry | null,
  BoundaryFeatureProperties
>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function bboxRing([west, south, east, north]: AtlasBBox) {
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ] as [number, number][];
}

function isBoundaryGeometry(geometry: Geometry | null): geometry is BoundaryGeometry {
  return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
}

function getAtlasBoundaryGeometries(): BoundaryGeometry[] {
  const geometries =
    boundaryFeatureCollection.features?.flatMap((feature) =>
      isBoundaryGeometry(feature.geometry) ? [feature.geometry] : [],
    ) ?? [];

  if (geometries.length > 0) return geometries;

  return [
    {
      type: "Polygon",
      coordinates: [bboxRing(getAtlasBoundaryBbox())],
    },
  ];
}

function getBoundaryOuterRings(geometry: BoundaryGeometry): [number, number][][] {
  if (geometry.type === "Polygon") {
    return [geometry.coordinates[0] as [number, number][]];
  }

  return geometry.coordinates.map((polygon) => polygon[0] as [number, number][]);
}

export function getAtlasBoundaryBbox(): AtlasBBox {
  return [...atlasNode.bbox] as AtlasBBox;
}

export function getAtlasBoundaryCentroid() {
  return {
    longitude: atlasNode.centroid[0],
    latitude: atlasNode.centroid[1],
  };
}

export function expandAtlasBbox(
  [west, south, east, north]: AtlasBBox,
  factor: number,
): AtlasBBox {
  const lngPad = (east - west) * factor;
  const latPad = (north - south) * factor;
  return [west - lngPad, south - latPad, east + lngPad, north + latPad];
}

export function getAtlasContextBbox(): AtlasBBox {
  return expandAtlasBbox(getAtlasBoundaryBbox(), 0.7);
}

export function getAtlasBoundaryOutlineFeature(): FeatureCollection<
  BoundaryGeometry,
  { atlasId: string; kind: "boundary-outline" }
> {
  return {
    type: "FeatureCollection",
    features: getAtlasBoundaryGeometries().map((geometry) => ({
      type: "Feature",
      properties: {
        atlasId: atlasNode.atlas_id,
        kind: "boundary-outline",
      },
      geometry,
    })),
  };
}

export function getAtlasBoundaryMaskFeature(): Feature<
  Polygon,
  { atlasId: string; kind: "boundary-mask" }
> {
  const interiorRings = getAtlasBoundaryGeometries().flatMap((geometry) =>
    getBoundaryOuterRings(geometry).map((ring) => [...ring].reverse()),
  );

  return {
    type: "Feature",
    properties: {
      atlasId: atlasNode.atlas_id,
      kind: "boundary-mask",
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        bboxRing(expandAtlasBbox(getAtlasBoundaryBbox(), 1.05)),
        ...interiorRings,
      ],
    },
  };
}

function baseCityZoom([west, south, east, north]: AtlasBBox) {
  const widestSpan = Math.max(east - west, north - south);
  return clamp(9.6 - Math.log2(Math.max(widestSpan, 0.02)), 10.1, 12.2);
}

export function getAtlasCameraPreset(id: AtlasCameraPresetId): AtlasViewportState {
  const bbox = getAtlasBoundaryBbox();
  const center = getAtlasBoundaryCentroid();
  const lngSpan = bbox[2] - bbox[0];
  const latSpan = bbox[3] - bbox[1];
  const cityZoom = baseCityZoom(bbox);

  switch (id) {
    case "county":
      return {
        ...center,
        zoom: clamp(cityZoom - 0.8, 9.1, 11.4),
        bearing: 0,
        pitch: 0,
      };
    case "city":
      return {
        ...center,
        zoom: cityZoom,
        bearing: 0,
        pitch: 0,
      };
    case "neighborhood":
      return {
        longitude: center.longitude - lngSpan * 0.04,
        latitude: center.latitude + latSpan * 0.035,
        zoom: clamp(cityZoom + 0.9, 11.3, 13.3),
        bearing: 0,
        pitch: 12,
      };
    case "corridor":
      return {
        longitude: center.longitude - lngSpan * 0.017,
        latitude: center.latitude + latSpan * 0.014,
        zoom: clamp(cityZoom + 2.55, 13.1, 14.8),
        bearing: -18,
        pitch: 54,
      };
    case "parcel":
      return {
        longitude: center.longitude - lngSpan * 0.012,
        latitude: center.latitude + latSpan * 0.01,
        zoom: clamp(cityZoom + 3.35, 14.4, 16.2),
        bearing: -24,
        pitch: 62,
      };
  }
}

export function getAtlasViewCamera(
  viewMode: "atlas" | "oblique" | "street" | "section",
): AtlasViewportState {
  const bbox = getAtlasBoundaryBbox();
  const center = getAtlasBoundaryCentroid();
  const lngSpan = bbox[2] - bbox[0];
  const latSpan = bbox[3] - bbox[1];

  switch (viewMode) {
    case "atlas":
      return getAtlasCameraPreset("city");
    case "oblique": {
      const city = getAtlasCameraPreset("city");
      return {
        ...city,
        zoom: clamp(city.zoom + 0.45, 10.8, 12.8),
        bearing: -22,
        pitch: 58,
      };
    }
    case "street": {
      const corridor = getAtlasCameraPreset("corridor");
      return {
        ...corridor,
        longitude: center.longitude - lngSpan * 0.02,
        latitude: center.latitude + latSpan * 0.012,
        bearing: -30,
        pitch: 70,
      };
    }
    case "section": {
      const neighborhood = getAtlasCameraPreset("neighborhood");
      return {
        ...neighborhood,
        longitude: center.longitude - lngSpan * 0.038,
        latitude: center.latitude + latSpan * 0.062,
        bearing: 30,
        pitch: 46,
      };
    }
  }
}
