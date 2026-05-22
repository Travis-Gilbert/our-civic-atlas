export type UrbanDesignFormType =
  | "courtyard_compact"
  | "courtyard_open"
  | "slab"
  | "row_infill"
  | "single_lot"
  | "industrial_shed"
  | "civic_anchor"
  | "mixed_use_street_wall"
  | "tower_podium";

export type UrbanDesignPartRole =
  | "courtyard_ring"
  | "street_wall"
  | "side_wing"
  | "rear_wing"
  | "slab_bar"
  | "row_unit"
  | "house_body"
  | "porch_or_rear_ell"
  | "shed_body"
  | "roof_monitor"
  | "civic_body"
  | "civic_wing"
  | "podium"
  | "tower";

export type BuildingFormSpec = {
  spec_id: string;
  source_osm_id: string;
  source_name: string | null;
  source_building_tag: string | null;
  form_type: UrbanDesignFormType;
  form_label: string;
  rule_id: string;
  confidence: number;
  source_height_m: number | null;
  generated_height_m: number;
  footprint_area_m2: number;
  footprint_ratio: number;
};

export type UrbanDesignModelProperties = {
  model_id: string;
  spec_id: string;
  source_osm_id: string;
  source_name: string | null;
  source_building_tag: string | null;
  form_type: UrbanDesignFormType;
  form_label: string;
  part_role: UrbanDesignPartRole;
  part_label: string;
  part_index: number;
  height_m: number;
  source_height_m: number | null;
  confidence: number;
  rule_id: string;
  footprint_area_m2: number;
  footprint_ratio: number;
};

export type UrbanDesignModelFeature = GeoJSON.Feature<
  GeoJSON.Polygon,
  UrbanDesignModelProperties
>;

export type UrbanDesignModelCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon,
  UrbanDesignModelProperties
>;

export type UrbanDesignModelSummary = {
  sourceFeatureCount: number;
  generatedPartCount: number;
  formCounts: Record<UrbanDesignFormType, number>;
};

export type UrbanDesignGeneratorOptions = {
  clipGeometry?: GeoJSON.Geometry | null;
  maxSourceFeatures?: number;
};

type OsmBuildingProperties = {
  osm_id?: number | string | null;
  building?: string | null;
  name?: string | null;
  height_meters?: number | null;
  levels?: number | null;
  use?: string | null;
};

type SourceBuildingFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  OsmBuildingProperties
>;

type PlanBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
  widthLng: number;
  heightLat: number;
  widthM: number;
  depthM: number;
  areaM2: number;
  ratio: number;
};

export const URBAN_DESIGN_FORM_LABELS: Record<UrbanDesignFormType, string> = {
  civic_anchor: "Civic anchor",
  courtyard_compact: "Courtyard compact",
  courtyard_open: "Courtyard open",
  industrial_shed: "Industrial shed",
  mixed_use_street_wall: "Mixed-use street wall",
  row_infill: "Row infill",
  single_lot: "Single-lot house",
  slab: "Slab",
  tower_podium: "Tower and podium",
};

export function createUrbanDesignModelCollection(
  source: GeoJSON.FeatureCollection,
  options: UrbanDesignGeneratorOptions = {},
): UrbanDesignModelCollection {
  const maxSourceFeatures = options.maxSourceFeatures ?? source.features.length;
  const features: UrbanDesignModelFeature[] = [];
  const sourceFeatures = source.features.slice(0, maxSourceFeatures);

  sourceFeatures.forEach((rawFeature, sourceIndex) => {
    const feature = rawFeature as SourceBuildingFeature;
    const bounds = getPlanBounds(feature.geometry);
    if (!bounds) return;
    if (
      options.clipGeometry &&
      !pointInGeometry(planCenter(bounds), options.clipGeometry)
    ) {
      return;
    }

    const spec = createBuildingFormSpec(feature, bounds, sourceIndex);
    features.push(...createFormParts(spec, bounds));
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

export function summarizeUrbanDesignModel(
  sourceFeatureCount: number,
  collection: UrbanDesignModelCollection,
): UrbanDesignModelSummary {
  const formCounts = Object.fromEntries(
    Object.keys(URBAN_DESIGN_FORM_LABELS).map((key) => [key, 0]),
  ) as Record<UrbanDesignFormType, number>;

  for (const feature of collection.features) {
    formCounts[feature.properties.form_type] += 1;
  }

  return {
    sourceFeatureCount,
    generatedPartCount: collection.features.length,
    formCounts,
  };
}

function createBuildingFormSpec(
  feature: SourceBuildingFeature,
  bounds: PlanBounds,
  sourceIndex: number,
): BuildingFormSpec {
  const props = feature.properties ?? {};
  const sourceOsmId = String(props.osm_id ?? `source-index-${sourceIndex}`);
  const buildingTag = props.building?.toLowerCase() ?? null;
  const name = props.name ?? null;
  const normalizedName = name?.toLowerCase() ?? "";
  const hash = stableHash(`${sourceOsmId}:${buildingTag ?? ""}:${normalizedName}`);
  const sourceHeightM =
    typeof props.height_meters === "number"
      ? props.height_meters
      : typeof props.levels === "number"
        ? props.levels * 3
        : null;
  const formType = classifyUrbanForm({
    buildingTag,
    bounds,
    hash,
    name: normalizedName,
    use: props.use?.toLowerCase() ?? null,
  });
  const generatedHeightM = generatedHeightForForm(
    formType,
    bounds,
    hash,
    sourceHeightM,
  );

  return {
    spec_id: `urban-form-spec:${sourceOsmId}`,
    source_osm_id: sourceOsmId,
    source_name: name,
    source_building_tag: buildingTag,
    form_type: formType,
    form_label: URBAN_DESIGN_FORM_LABELS[formType],
    rule_id: `rule:${formType}`,
    confidence: confidenceForForm(formType, buildingTag, sourceHeightM),
    source_height_m: sourceHeightM,
    generated_height_m: generatedHeightM,
    footprint_area_m2: Math.round(bounds.areaM2),
    footprint_ratio: Number(bounds.ratio.toFixed(2)),
  };
}

function classifyUrbanForm(input: {
  buildingTag: string | null;
  bounds: PlanBounds;
  hash: number;
  name: string;
  use: string | null;
}): UrbanDesignFormType {
  const tag = input.buildingTag ?? "";
  const combined = `${tag} ${input.name} ${input.use ?? ""}`;
  const area = input.bounds.areaM2;
  const ratio = input.bounds.ratio;

  if (
    /(church|school|college|university|library|hospital|clinic|city|county|government|courthouse|museum|theatre|theater)/.test(
      combined,
    )
  ) {
    return "civic_anchor";
  }

  if (/(industrial|warehouse|manufacturing|hangar|depot|plant)/.test(combined)) {
    return "industrial_shed";
  }

  if (/(retail|commercial|office|hotel|apartments|mixed|store)/.test(combined)) {
    return area > 2400 || input.hash % 7 === 0
      ? "tower_podium"
      : "mixed_use_street_wall";
  }

  if (area > 5600) {
    if (input.hash % 5 === 0) return "courtyard_compact";
    return ratio > 2.2 ? "industrial_shed" : "civic_anchor";
  }

  if (area > 2200) {
    if (input.hash % 4 === 0) return "courtyard_open";
    if (input.hash % 3 === 0) return "tower_podium";
    return ratio > 2.1 ? "slab" : "courtyard_compact";
  }

  if (area > 900) {
    if (ratio > 2.6) return "slab";
    if (input.hash % 5 === 0) return "courtyard_open";
    return input.hash % 2 === 0 ? "mixed_use_street_wall" : "row_infill";
  }

  if (/(house|residential|detached|semidetached|terrace|apartments)/.test(tag)) {
    return input.hash % 4 === 0 ? "row_infill" : "single_lot";
  }

  return input.hash % 5 === 0 ? "row_infill" : "single_lot";
}

function generatedHeightForForm(
  formType: UrbanDesignFormType,
  bounds: PlanBounds,
  hash: number,
  sourceHeightM: number | null,
): number {
  if (sourceHeightM != null) return Math.max(4, Math.min(64, sourceHeightM));
  const noise = hash % 3;
  const large = bounds.areaM2 > 2200;
  switch (formType) {
    case "civic_anchor":
      return large ? 18 + noise * 2 : 12 + noise * 2;
    case "courtyard_compact":
      return 15 + noise * 3;
    case "courtyard_open":
      return 12 + noise * 2;
    case "industrial_shed":
      return 9 + noise * 2;
    case "mixed_use_street_wall":
      return 12 + noise * 3;
    case "row_infill":
      return 8 + noise;
    case "single_lot":
      return 6 + noise;
    case "slab":
      return 16 + noise * 3;
    case "tower_podium":
      return 28 + noise * 4;
  }
}

function confidenceForForm(
  formType: UrbanDesignFormType,
  buildingTag: string | null,
  sourceHeightM: number | null,
): number {
  let confidence = 0.56;
  if (buildingTag && buildingTag !== "yes") confidence += 0.12;
  if (sourceHeightM != null) confidence += 0.08;
  if (formType === "single_lot" || formType === "row_infill") confidence += 0.04;
  return Math.min(0.84, Number(confidence.toFixed(2)));
}

function createFormParts(
  spec: BuildingFormSpec,
  bounds: PlanBounds,
): UrbanDesignModelFeature[] {
  const parts: UrbanDesignModelFeature[] = [];
  const add = (
    geometry: GeoJSON.Polygon,
    partRole: UrbanDesignPartRole,
    partLabel: string,
    heightM = spec.generated_height_m,
  ) => {
    parts.push({
      type: "Feature",
      geometry,
      properties: {
        model_id: `${spec.spec_id}:${parts.length}`,
        spec_id: spec.spec_id,
        source_osm_id: spec.source_osm_id,
        source_name: spec.source_name,
        source_building_tag: spec.source_building_tag,
        form_type: spec.form_type,
        form_label: spec.form_label,
        part_role: partRole,
        part_label: partLabel,
        part_index: parts.length,
        height_m: Number(heightM.toFixed(2)),
        source_height_m: spec.source_height_m,
        confidence: spec.confidence,
        rule_id: spec.rule_id,
        footprint_area_m2: spec.footprint_area_m2,
        footprint_ratio: spec.footprint_ratio,
      },
    });
  };

  switch (spec.form_type) {
    case "courtyard_compact":
      add(
        rectWithHole(bounds, 0.06, 0.06, 0.94, 0.94, 0.32, 0.32, 0.68, 0.68),
        "courtyard_ring",
        "Perimeter block around a courtyard",
      );
      break;
    case "courtyard_open":
      add(rect(bounds, 0.06, 0.08, 0.94, 0.3), "street_wall", "Street wall");
      add(rect(bounds, 0.06, 0.3, 0.28, 0.9), "side_wing", "Left courtyard wing");
      add(rect(bounds, 0.72, 0.3, 0.94, 0.9), "side_wing", "Right courtyard wing");
      break;
    case "slab":
      if (bounds.widthM >= bounds.depthM) {
        add(rect(bounds, 0.05, 0.36, 0.95, 0.64), "slab_bar", "Long slab");
      } else {
        add(rect(bounds, 0.36, 0.05, 0.64, 0.95), "slab_bar", "Long slab");
      }
      break;
    case "row_infill":
      createRowParts(bounds, 3 + (stableHash(spec.source_osm_id) % 3)).forEach(
        (geometry, index) =>
          add(geometry, "row_unit", `Row unit ${index + 1}`, spec.generated_height_m),
      );
      break;
    case "single_lot":
      add(rect(bounds, 0.2, 0.18, 0.8, 0.76), "house_body", "House body");
      add(
        rect(bounds, 0.34, 0.7, 0.66, 0.92),
        "porch_or_rear_ell",
        "Porch or rear ell",
        spec.generated_height_m * 0.62,
      );
      break;
    case "industrial_shed":
      add(rect(bounds, 0.04, 0.06, 0.96, 0.94), "shed_body", "Industrial shed body");
      if (bounds.widthM >= bounds.depthM) {
        add(
          rect(bounds, 0.18, 0.44, 0.82, 0.56),
          "roof_monitor",
          "Roof monitor",
          spec.generated_height_m + 2,
        );
      } else {
        add(
          rect(bounds, 0.44, 0.18, 0.56, 0.82),
          "roof_monitor",
          "Roof monitor",
          spec.generated_height_m + 2,
        );
      }
      break;
    case "civic_anchor":
      add(rect(bounds, 0.18, 0.16, 0.82, 0.84), "civic_body", "Civic body");
      add(
        rect(bounds, 0.06, 0.42, 0.94, 0.58),
        "civic_wing",
        "Civic cross wing",
        spec.generated_height_m * 0.72,
      );
      break;
    case "mixed_use_street_wall":
      add(rect(bounds, 0.06, 0.06, 0.94, 0.38), "street_wall", "Mixed-use street wall");
      add(
        rect(bounds, 0.36, 0.38, 0.66, 0.9),
        "rear_wing",
        "Rear wing",
        spec.generated_height_m * 0.72,
      );
      break;
    case "tower_podium":
      add(rect(bounds, 0.08, 0.08, 0.92, 0.92), "podium", "Podium", spec.generated_height_m * 0.45);
      add(rect(bounds, 0.34, 0.34, 0.66, 0.72), "tower", "Tower", spec.generated_height_m);
      break;
  }

  return parts;
}

function createRowParts(bounds: PlanBounds, count: number): GeoJSON.Polygon[] {
  const parts: GeoJSON.Polygon[] = [];
  const gap = 0.018;
  if (bounds.widthM >= bounds.depthM) {
    const step = 0.9 / count;
    for (let index = 0; index < count; index += 1) {
      const start = 0.05 + index * step + gap;
      const end = 0.05 + (index + 1) * step - gap;
      parts.push(rect(bounds, start, 0.12, end, 0.88));
    }
  } else {
    const step = 0.9 / count;
    for (let index = 0; index < count; index += 1) {
      const start = 0.05 + index * step + gap;
      const end = 0.05 + (index + 1) * step - gap;
      parts.push(rect(bounds, 0.12, start, 0.88, end));
    }
  }
  return parts;
}

function getPlanBounds(
  geometry: GeoJSON.Geometry | null | undefined,
): PlanBounds | null {
  if (!geometry) return null;
  const ring =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates[0]?.[0]
        : null;
  if (!ring || ring.length < 4) return null;

  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  for (const [lng, lat] of ring) {
    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
  }

  if (!Number.isFinite(west) || !Number.isFinite(south) || west === east || south === north) {
    return null;
  }

  const centerLat = (south + north) / 2;
  const metersPerLat = 111_320;
  const metersPerLng = Math.cos((centerLat * Math.PI) / 180) * metersPerLat;
  const widthLng = east - west;
  const heightLat = north - south;
  const widthM = Math.abs(widthLng * metersPerLng);
  const depthM = Math.abs(heightLat * metersPerLat);

  return {
    west,
    south,
    east,
    north,
    widthLng,
    heightLat,
    widthM,
    depthM,
    areaM2: Math.max(1, widthM * depthM),
    ratio: Math.max(widthM, depthM) / Math.max(1, Math.min(widthM, depthM)),
  };
}

function planCenter(bounds: PlanBounds): [number, number] {
  return [
    bounds.west + bounds.widthLng / 2,
    bounds.south + bounds.heightLat / 2,
  ];
}

function pointInGeometry(
  point: [number, number],
  geometry: GeoJSON.Geometry,
): boolean {
  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.some((entry) => pointInGeometry(point, entry));
  }
  return false;
}

function pointInPolygon(
  point: [number, number],
  polygon: GeoJSON.Position[][],
): boolean {
  if (!pointInRing(point, polygon[0] ?? [])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

function pointInRing(
  [x, y]: [number, number],
  ring: GeoJSON.Position[],
): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [xi, yi] = ring[index] ?? [];
    const [xj, yj] = ring[previous] ?? [];
    if (
      typeof xi !== "number" ||
      typeof yi !== "number" ||
      typeof xj !== "number" ||
      typeof yj !== "number"
    ) {
      continue;
    }
    const crosses = yi > y !== yj > y;
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function rect(
  bounds: PlanBounds,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: [rectRing(bounds, x0, y0, x1, y1)],
  };
}

function rectWithHole(
  bounds: PlanBounds,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  hx0: number,
  hy0: number,
  hx1: number,
  hy1: number,
): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: [
      rectRing(bounds, x0, y0, x1, y1),
      rectRing(bounds, hx0, hy0, hx1, hy1).reverse(),
    ],
  };
}

function rectRing(
  bounds: PlanBounds,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): [number, number][] {
  const west = bounds.west + clamp01(x0) * bounds.widthLng;
  const east = bounds.west + clamp01(x1) * bounds.widthLng;
  const south = bounds.south + clamp01(y0) * bounds.heightLat;
  const north = bounds.south + clamp01(y1) * bounds.heightLat;
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp01(value: number): number {
  return Math.min(0.98, Math.max(0.02, value));
}
