import { BUILDING_FABRIC_HEIGHT_PRIOR_CATALOG } from "../../data/open-flint-atlas/fixtures/building-fabric/height-priors.ts";

export type BuildingFabricArchetype =
  | "present_residential_single"
  | "present_residential_multi"
  | "present_commercial"
  | "present_industrial"
  | "present_civic"
  | "present_mixed_use"
  | "present_unknown";

export type RoofMaterial = "asphalt" | "metal" | "tile" | "membrane";

export type BuildingFabricDetailLevel = "mass" | "roof" | "facade" | "site";

export type BuildingFabricParams = {
  footprint_polygon: [number, number][];
  height_m: number;
  stories: number;
  front_edge_bearing_degrees: number;
  roof_pitch_degrees: number;
  cornice_height_m: number;
  window_spacing_m: number;
  variation_seed: number;
  facade_color: string;
  roof_material: RoofMaterial;
};

export type BuildingFabricSpec = {
  archetype: BuildingFabricArchetype;
  city_pack: string;
  model_version: string;
  params: BuildingFabricParams;
  params_hash: string;
  glb_uri: string;
  glb_sha256: string | null;
  glb_status: "pending_offline_generation";
  feature_completeness: number;
  completeness_flags: string[];
};

type HeightPriorStep = {
  min_area_m2: number;
  stories: number;
};

type HeightPrior = {
  label: string;
  baseline_stories: number;
  area_story_steps: HeightPriorStep[];
  height_m_override?: number;
  roof_pitch_default_degrees: number;
  roof_pitch_variation_degrees: number;
  cornice_height_m: number;
  window_spacing_range_m: [number, number];
  facade_color: string;
  roof_material: RoofMaterial;
};

type HeightPriorCatalog = {
  city_pack: string;
  model_version: string;
  story_height_m: number;
  archetypes: Record<BuildingFabricArchetype, HeightPrior>;
};

type BuildingFabricInput = {
  sourceOsmId: string;
  buildingTag: string | null;
  name: string | null;
  use: string | null;
  heightMeters: number | null;
  levels: number | null;
  footprintRing: [number, number][];
  footprintAreaM2: number;
  footprintRatio: number;
  /**
   * Real parcel-front bearing in compass degrees, when known. Written
   * by the Phase A pipeline's parcel-edge classifier (OSMnx
   * nearest-road derived). Null/undefined means the caller has no
   * real parcel signal, and `front_edge_bearing_degrees` falls back
   * to `longestEdgeBearingDegrees(ring)`. The longest-edge proxy is
   * correct for rectangular buildings whose long edge happens to
   * face the street and fails on L-shaped footprints + corner lots.
   */
  parcelFrontBearingDegrees?: number | null;
  hasParcelFrontEdge?: boolean;
};

export const BUILDING_FABRIC_LOD = {
  blockRollupMaxZoom: 13,
  extrusionMinZoom: 13,
  fabricFadeStartZoom: 15.2,
  fabricFullZoom: 16,
} as const;

export const BUILDING_FABRIC_HEIGHT_PRIORS =
  BUILDING_FABRIC_HEIGHT_PRIOR_CATALOG as unknown as HeightPriorCatalog;

export function deriveBuildingFabricSpec(
  input: BuildingFabricInput,
): BuildingFabricSpec {
  const normalizedTag = input.buildingTag?.toLowerCase() ?? null;
  const normalizedUse = input.use?.toLowerCase() ?? null;
  const normalizedName = input.name?.toLowerCase() ?? null;
  const variationSeed = stableHash(input.sourceOsmId);
  const archetype = classifyPresentArchetype({
    buildingTag: normalizedTag,
    footprintAreaM2: input.footprintAreaM2,
    footprintRatio: input.footprintRatio,
    name: normalizedName,
    seed: variationSeed,
    use: normalizedUse,
  });
  const prior = BUILDING_FABRIC_HEIGHT_PRIORS.archetypes[archetype];
  const stories = inferStories({
    areaM2: input.footprintAreaM2,
    heightMeters: input.heightMeters,
    levels: input.levels,
    prior,
    storyHeightM: BUILDING_FABRIC_HEIGHT_PRIORS.story_height_m,
  });
  const heightM =
    input.heightMeters && input.heightMeters > 0
      ? input.heightMeters
      : prior.height_m_override ?? stories * BUILDING_FABRIC_HEIGHT_PRIORS.story_height_m;
  const roofPitchDegrees = inferRoofPitch(prior, variationSeed);
  const windowSpacingM = inferWindowSpacing(prior, variationSeed);
  // Prefer the real parcel-front bearing when the caller has it
  // (Phase A pipeline output); fall back to the longest-edge proxy
  // otherwise. Either way, OrientedFootprint downstream uses
  // params.front_edge_bearing_degrees with no special-case branching.
  const frontEdgeBearingDegrees =
    typeof input.parcelFrontBearingDegrees === "number"
      ? input.parcelFrontBearingDegrees
      : longestEdgeBearingDegrees(input.footprintRing);
  const params: BuildingFabricParams = {
    footprint_polygon: normalizeRing(input.footprintRing),
    height_m: Number(clamp(heightM, 2.5, 80).toFixed(2)),
    stories,
    front_edge_bearing_degrees: Number(frontEdgeBearingDegrees.toFixed(2)),
    roof_pitch_degrees: roofPitchDegrees,
    cornice_height_m: prior.cornice_height_m,
    window_spacing_m: windowSpacingM,
    variation_seed: variationSeed,
    facade_color: prior.facade_color,
    roof_material: prior.roof_material,
  };
  const paramsHash = paramsHashFor(archetype, params);

  return {
    archetype,
    city_pack: BUILDING_FABRIC_HEIGHT_PRIORS.city_pack,
    model_version: BUILDING_FABRIC_HEIGHT_PRIORS.model_version,
    params,
    params_hash: paramsHash,
    glb_uri: `s3://civic-atlas/fabric/${paramsHash}.glb`,
    glb_sha256: null,
    glb_status: "pending_offline_generation",
    feature_completeness: featureCompleteness(input),
    completeness_flags: completenessFlags(input),
  };
}

/**
 * Map an OSM footprint to a present-day archetype using ONLY signals that
 * actually correlate with building use: explicit OSM tags, the building's
 * declared name, and footprint shape. The prior version of this function
 * scattered `seed % N` branches across the area-based fallback, which made
 * the archetype a deterministic-but-arbitrary function of `osm_id` rather
 * than of the building. Every "courtyard" or "tower" produced by that path
 * was structural noise wearing the costume of classification.
 *
 * Until Phase A's real LightGBM classifier ships, the honest answer for
 * any footprint without a real tag signal is `"present_unknown"`, which
 * renders as a plain extruded mass. We keep the shape-based fallback only
 * for the cases where the geometry itself is the signal (very large
 * footprints with a long, narrow ratio look industrial; large square
 * footprints look civic).
 */
function classifyPresentArchetype(input: {
  buildingTag: string | null;
  footprintAreaM2: number;
  footprintRatio: number;
  name: string | null;
  seed: number;
  use: string | null;
}): BuildingFabricArchetype {
  const combined = `${input.buildingTag ?? ""} ${input.name ?? ""} ${input.use ?? ""}`;
  const area = input.footprintAreaM2;

  if (/(church|school|college|university|library|hospital|clinic|city|county|government|courthouse|museum|theatre|theater)/.test(combined)) {
    return "present_civic";
  }
  if (/(industrial|warehouse|manufacturing|hangar|depot|plant|factory)/.test(combined)) {
    return "present_industrial";
  }
  if (/(apartments|apartment|multifamily|multi-family|dormitory)/.test(combined)) {
    return "present_residential_multi";
  }
  if (/(retail|commercial|office|hotel|shop|store|restaurant|bank)/.test(combined)) {
    return "present_commercial";
  }
  if (/(house|detached|semidetached|terrace|residential|garage)/.test(combined)) {
    return area > 600 ? "present_residential_multi" : "present_residential_single";
  }
  if (area > 5600 && input.footprintRatio > 2.2) {
    return "present_industrial";
  }
  return "present_unknown";
}

function inferStories(input: {
  areaM2: number;
  heightMeters: number | null;
  levels: number | null;
  prior: HeightPrior;
  storyHeightM: number;
}): number {
  if (input.levels && input.levels > 0) {
    return Math.max(1, Math.min(12, Math.round(input.levels)));
  }
  if (input.heightMeters && input.heightMeters > 0) {
    return Math.max(1, Math.min(12, Math.round(input.heightMeters / input.storyHeightM)));
  }

  return input.prior.area_story_steps.reduce((stories, step) => {
    return input.areaM2 > step.min_area_m2 ? step.stories : stories;
  }, input.prior.baseline_stories);
}

function inferRoofPitch(prior: HeightPrior, seed: number): number {
  if (prior.roof_pitch_variation_degrees === 0) {
    return prior.roof_pitch_default_degrees;
  }
  const unit = seededUnit(seed, "roof_pitch");
  const delta = (unit * 2 - 1) * prior.roof_pitch_variation_degrees;
  return Number((prior.roof_pitch_default_degrees + delta).toFixed(2));
}

function inferWindowSpacing(prior: HeightPrior, seed: number): number {
  const [min, max] = prior.window_spacing_range_m;
  return Number((min + (max - min) * seededUnit(seed, "window_spacing")).toFixed(2));
}

function featureCompleteness(input: BuildingFabricInput): number {
  let score = 0.96;
  if (!input.heightMeters && !input.levels) score -= 0.18;
  if (!input.hasParcelFrontEdge) score -= 0.32;
  if (!input.buildingTag || input.buildingTag === "yes") score -= 0.14;
  if (input.sourceOsmId.startsWith("source-index-")) score -= 0.18;
  return Number(clamp(score, 0.24, 0.98).toFixed(2));
}

function completenessFlags(input: BuildingFabricInput): string[] {
  const flags: string[] = [];
  if (!input.heightMeters && !input.levels) flags.push("height_inferred_from_city_pack");
  if (!input.hasParcelFrontEdge) flags.push("front_edge_from_longest_footprint_edge");
  if (!input.buildingTag || input.buildingTag === "yes") flags.push("generic_osm_building_tag");
  if (input.sourceOsmId.startsWith("source-index-")) flags.push("osm_id_fallback_seed");
  return flags;
}

function paramsHashFor(
  archetype: BuildingFabricArchetype,
  params: BuildingFabricParams,
): string {
  const hash = stableHash(JSON.stringify([
    archetype,
    params.footprint_polygon,
    params.height_m,
    params.stories,
    params.front_edge_bearing_degrees,
    params.roof_pitch_degrees,
    params.cornice_height_m,
    params.window_spacing_m,
    params.variation_seed,
    params.facade_color,
    params.roof_material,
    BUILDING_FABRIC_HEIGHT_PRIORS.model_version,
  ]));
  return `fnv1a-${hash.toString(16).padStart(8, "0")}`;
}

function longestEdgeBearingDegrees(ring: [number, number][]): number {
  let longestDistance = 0;
  let bearing = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = ring[index];
    const end = ring[index + 1];
    if (!start || !end) continue;
    const distance = approximateDistanceMeters(start, end);
    if (distance > longestDistance) {
      longestDistance = distance;
      bearing = bearingDegrees(start, end);
    }
  }
  return bearing;
}

function approximateDistanceMeters(
  [lngA, latA]: [number, number],
  [lngB, latB]: [number, number],
): number {
  const centerLat = ((latA + latB) / 2) * Math.PI / 180;
  const dx = (lngB - lngA) * Math.cos(centerLat) * 111_320;
  const dy = (latB - latA) * 111_320;
  return Math.hypot(dx, dy);
}

function bearingDegrees(
  [lngA, latA]: [number, number],
  [lngB, latB]: [number, number],
): number {
  const lat1 = latA * Math.PI / 180;
  const lat2 = latB * Math.PI / 180;
  const deltaLng = (lngB - lngA) * Math.PI / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function normalizeRing(ring: [number, number][]): [number, number][] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || (first[0] === last[0] && first[1] === last[1])) {
    return ring;
  }
  return [...ring, first];
}

function seededUnit(seed: number, salt: string): number {
  return stableHash(`${seed}:${salt}`) / 0xffffffff;
}

export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
