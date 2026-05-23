import {
  deriveBuildingFabricSpec,
  type BuildingFabricArchetype,
  type BuildingFabricDetailLevel,
  type BuildingFabricSpec,
  type RoofMaterial,
} from "./building-fabric.ts";

export type UrbanDesignFormType =
  | "courtyard_compact"
  | "courtyard_open"
  | "slab"
  | "row_infill"
  | "single_lot"
  | "industrial_shed"
  | "civic_anchor"
  | "mixed_use_street_wall"
  | "tower_podium"
  /**
   * Honest fallback when no tag or shape signal supports a specific form.
   * Renders as a plain extruded mass with no part decomposition. Existed
   * implicitly in the prior code as the `hash % N` lottery's default; now
   * surfaced as a first-class form so the renderer can stop pretending
   * unclassified buildings are courtyards or towers.
   */
  | "unknown";

export type UrbanDesignPartRole =
  | "courtyard_ring"
  | "street_wall"
  | "side_wing"
  | "rear_wing"
  | "slab_bar"
  | "row_unit"
  | "row_roof"
  | "party_wall"
  | "house_body"
  | "front_porch"
  | "porch_or_rear_ell"
  | "roof_plane"
  | "roof_ridge"
  | "courtyard_yard"
  | "cornice_band"
  | "civic_entry"
  | "civic_roof"
  | "dormer"
  | "facade_rhythm"
  | "parapet"
  | "porch_step"
  | "sawtooth_roof"
  | "storefront_bay"
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
  fabric: BuildingFabricSpec;
  /** Phase A classifier outputs, threaded through from OSM source. */
  typology_class: string | null;
  typology_confidence: number | null;
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
  fabric_archetype: BuildingFabricArchetype;
  fabric_model_version: string;
  fabric_params_hash: string;
  fabric_variation_seed: number;
  fabric_feature_completeness: number;
  fabric_completeness_flags: string[];
  fabric_detail_level: BuildingFabricDetailLevel;
  fabric_height_m: number;
  fabric_stories: number;
  fabric_front_edge_bearing_degrees: number;
  fabric_roof_pitch_degrees: number;
  fabric_cornice_height_m: number;
  fabric_window_spacing_m: number;
  fabric_facade_color: string;
  fabric_roof_material: RoofMaterial;
  fabric_glb_uri: string;
  fabric_glb_sha256: string | null;
  fabric_glb_status: BuildingFabricSpec["glb_status"];
  /**
   * Phase A classifier outputs, threaded through from the OSM source
   * properties. Null until the Phase A backend writes
   * `building_typology` rows and the OSM fixture is enriched via
   * `osm_id` join. The renderer reads these to compute effective
   * confidence (taking min with `fabric_feature_completeness`) and
   * to support the opt-in typology overlay's coloring.
   */
  typology_class: string | null;
  typology_confidence: number | null;
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
  /**
   * Phase A typology classifier outputs. These are written by the
   * backend pipeline that joins `building_typology` rows onto the OSM
   * footprint collection (via `osm_id`). Today the join doesn't yet
   * happen — the OSM fixture has these absent — and the frontend
   * reads `null` everywhere. The renderer's low-confidence styling
   * (`applyFabricCompletenessAlpha`) is wired to consult
   * `typology_confidence` when present and take the minimum with
   * `fabric_feature_completeness`, so the moment the backend writes
   * these fields they take effect without a renderer change.
   *
   * `typology_class` is the classifier's argmax label (residential /
   * commercial / industrial / civic / mixed_use / unknown per Phase A
   * §2). It is intentionally NOT the same enum as `UrbanDesignFormType`,
   * which is the geometric/spatial form taxonomy used for part
   * decomposition. A building can be `typology_class="commercial"`
   * (Phase A says: commercial use) and `form_type="mixed_use_street_wall"`
   * (urban-design says: this footprint reads as a street wall) at the
   * same time. The two answers don't conflict; they're separate
   * dimensions.
   */
  typology_class?: string | null;
  typology_confidence?: number | null;
  /**
   * Parcel-front bearing in compass degrees (0 = N, 90 = E). Written
   * by the Phase A pipeline's parcel-edge classifier — derived from
   * the bearing of the parcel front edge nearest the building
   * centroid (OSMnx nearest-road). Today the pipeline doesn't run, so
   * this field is absent and the frontend falls back to
   * `longestEdgeBearingDegrees(ring)`. The longest-edge proxy works
   * for rectangular buildings whose long edge happens to face the
   * street; it fails for L-shaped footprints and corner lots. When
   * the parcel-front field is present, the OrientedFootprint frame
   * (and therefore all part placement) uses it directly.
   */
  parcel_front_bearing_degrees?: number | null;
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

/**
 * A footprint expressed in a local (u, v) frame whose u-axis is aligned to
 * the front-edge bearing (street-parallel) and v-axis is perpendicular
 * (front-to-back). Part-placement helpers operate on (u, v) ∈ [0, 1]² and
 * project back to (lng, lat) via `projectUV`.
 *
 * Replaces the prior `bounds.widthM >= bounds.depthM` axis-picking branch
 * with a single canonical local frame. Two consequences:
 *
 *  1. Parts orient to the actual front edge, not to the lng-aligned
 *     bounding box's longer axis. A house at 30° to the cardinals now
 *     puts its porch on the front edge instead of whichever bbox diagonal
 *     happens to be longer.
 *
 *  2. Every part-placement helper that previously had a widthM >= depthM
 *     conditional collapses to a single (u, v) layout — the rotation
 *     handles what the conditional was approximating.
 *
 * The front bearing comes from `spec.fabric.params.front_edge_bearing_degrees`,
 * which today defaults to the longest-edge bearing of the OSM footprint.
 * Once Phase A's parcel-edge classifier ships, this gets replaced with the
 * actual parcel-front bearing (closest road from OSMnx), which is the
 * geometrically correct answer.
 */
type OrientedFootprint = {
  center: [number, number]; // lng, lat
  bearingRad: number; // front-edge compass bearing (0 = north, π/2 = east)
  frontageM: number; // extent along u
  depthM: number; // extent along v
  metersPerLng: number;
  metersPerLat: number;
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
  unknown: "Unclassified",
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
    const oriented = getOrientedFootprint(
      spec.fabric.params.footprint_polygon,
      spec.fabric.params.front_edge_bearing_degrees,
      bounds,
    );
    features.push(...createFormParts(spec, bounds, oriented));
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
  // Phase A typology fields are absent until the backend join lands.
  // Reading them as `?? null` here means every feature carries them
  // through the renderer with no special-case branching.
  const typologyClass = props.typology_class ?? null;
  const typologyConfidence =
    typeof props.typology_confidence === "number"
      ? props.typology_confidence
      : null;
  // Parcel-front bearing: when the Phase A pipeline writes it (from
  // OSMnx nearest-road analysis), the bearing-aware OrientedFootprint
  // frame uses it directly. Otherwise deriveBuildingFabricSpec falls
  // back to longestEdgeBearingDegrees(ring).
  const parcelFrontBearingDegrees =
    typeof props.parcel_front_bearing_degrees === "number"
      ? props.parcel_front_bearing_degrees
      : null;
  const hash = stableHash(`${sourceOsmId}:${buildingTag ?? ""}:${normalizedName}`);
  const sourceHeightM =
    typeof props.height_meters === "number"
      ? props.height_meters
      : typeof props.levels === "number"
        ? props.levels * 3
        : null;
  const fabric = deriveBuildingFabricSpec({
    sourceOsmId,
    buildingTag,
    name,
    use: props.use?.toLowerCase() ?? null,
    heightMeters: typeof props.height_meters === "number" ? props.height_meters : null,
    levels: typeof props.levels === "number" ? props.levels : null,
    footprintRing: getPlanRing(feature.geometry),
    footprintAreaM2: bounds.areaM2,
    footprintRatio: bounds.ratio,
    parcelFrontBearingDegrees,
    hasParcelFrontEdge: parcelFrontBearingDegrees != null,
    typologyClass,
    typologyConfidence,
  });
  const formType = classifyUrbanForm({
    buildingTag,
    bounds,
    hash,
    name: normalizedName,
    use: props.use?.toLowerCase() ?? null,
    typologyClass,
    typologyConfidence,
  });
  const generatedHeightM = fabric.params.height_m;

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
    fabric,
    typology_class: typologyClass,
    typology_confidence: typologyConfidence,
  };
}

/**
 * Map an OSM footprint to an urban-design form.
 *
 * Hierarchy of signals (most-reliable first):
 *
 *  1. Phase A typology classifier output (`typology_class` +
 *     `typology_confidence`). When confidence ≥ 0.6, the classifier's
 *     answer narrows the form to its compatible family
 *     (residential → {single_lot, row_infill, courtyard_*, slab};
 *     commercial → {mixed_use_street_wall, tower_podium}; etc.) and
 *     footprint geometry picks the specific form within that family.
 *     This is the path the classifier improvements feed into — better
 *     classifier means more buildings get the right shape decomposition.
 *
 *  2. OSM tag / name regex on the few high-precision signals we trust
 *     directly (school, church, warehouse, factory, etc.). Same signals
 *     the classifier already trained on, used here as a backup for the
 *     ~20% of buildings without a parcel match OR low-confidence
 *     classifier output.
 *
 *  3. Shape-only fallback (very large + long-narrow → industrial_shed).
 *
 *  4. Honest `"unknown"` when nothing supports a specific form.
 *
 * The prior version (before this commit) only used signal #2. Buildings
 * with `building=yes` (the OSM catch-all, ~87% of Flint's fixture) fell
 * straight to `single_lot` regardless of what the classifier knew.
 * Civic buildings without an OSM tag, large commercial buildings
 * without an `office`/`retail` tag, industrial warehouses tagged `yes`
 * — all rendered as single-family houses. The wiring fixes that.
 *
 * Procedural variation is preserved: each typology_class fans out to
 * MULTIPLE form_types depending on area, ratio, and neighbor density.
 * The classifier narrows the family; geometry picks the specific form.
 */
const TYPOLOGY_CONFIDENCE_FLOOR = 0.6;

// Below this footprint area, no archetype decomposition makes sense
// (garages, sheds, awnings). These render as plain `single_lot`
// regardless of classifier output to avoid civic-anchor-on-a-shed
// artifacts at the edge of the data.
const MIN_AREA_FOR_TYPOLOGY_OVERRIDE_M2 = 60;

function classifyUrbanForm(input: {
  buildingTag: string | null;
  bounds: PlanBounds;
  hash: number;
  name: string;
  use: string | null;
  typologyClass: string | null;
  typologyConfidence: number | null;
}): UrbanDesignFormType {
  const tag = input.buildingTag ?? "";
  const combined = `${tag} ${input.name} ${input.use ?? ""}`;
  const area = input.bounds.areaM2;
  const ratio = input.bounds.ratio;

  // ── Tier 1: classifier-driven path ──────────────────────────────
  // When the Phase A classifier is confident, its answer narrows the
  // form family and geometry picks the specific form. The shape
  // variation is preserved — same typology_class still produces
  // different form_types depending on area + ratio.
  const useTypology =
    typeof input.typologyConfidence === "number" &&
    input.typologyConfidence >= TYPOLOGY_CONFIDENCE_FLOOR &&
    input.typologyClass != null &&
    area >= MIN_AREA_FOR_TYPOLOGY_OVERRIDE_M2;

  if (useTypology) {
    switch (input.typologyClass) {
      case "civic":
        return "civic_anchor";
      case "industrial":
        // Very long/narrow industrial reads as a slab (assembly line);
        // anything else as a shed (the more common Flint pattern).
        return ratio > 2.6 && area > 1200 ? "slab" : "industrial_shed";
      case "commercial":
        // Tall + large commercial = downtown tower. Otherwise main-
        // street pattern.
        if (area > 2400) return "tower_podium";
        return "mixed_use_street_wall";
      case "residential":
        // Residential fans out by scale + density:
        //   tiny single-family    → single_lot
        //   row of attached units → row_infill (high ratio, mid area)
        //   small apartment slab  → slab (high ratio, large)
        //   walkup courtyard      → courtyard_compact / _open (very large)
        if (area > 5600) {
          return ratio > 1.6 ? "courtyard_open" : "courtyard_compact";
        }
        if (area > 1800 && ratio > 2.6) return "slab";
        if (area > 700 && ratio > 2.4) return "row_infill";
        return "single_lot";
      // Note: typology_class "mixed_use" isn't predicted in v0.1.x but
      // the case exists for forward compatibility. Maps to the
      // mixed_use_street_wall form which already encodes ground-floor
      // commercial + residential above.
      case "mixed_use":
        return area > 2400 ? "tower_podium" : "mixed_use_street_wall";
      // "unknown" falls through to the regex tier — the classifier
      // explicitly said "I don't know", so use whatever direct signal
      // we have instead of forcing a guess.
    }
  }

  // ── Tier 2: regex on high-precision OSM signals ─────────────────
  // The Phase A classifier already learned from these signals, but for
  // the ~20% of buildings without a parcel match (and the small
  // minority with low-confidence classifier output), reading the tag
  // directly is still useful.

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
    return "mixed_use_street_wall";
  }

  // ── Tier 3: shape-only fallback ─────────────────────────────────
  // Very large, long-and-narrow footprints look industrial even when
  // untagged. Everything else with no real tag is honest "unknown."
  if (area > 5600 && ratio > 2.2) {
    return "industrial_shed";
  }

  if (/(house|residential|detached|semidetached|terrace|apartments)/.test(tag)) {
    return "single_lot";
  }

  return "unknown";
}

function confidenceForForm(
  formType: UrbanDesignFormType,
  buildingTag: string | null,
  sourceHeightM: number | null,
): number {
  // "unknown" must report low confidence so the renderer can treat it
  // honestly. Once Phase A's real classifier writes per-row probabilities,
  // this scalar gets replaced with `max(per_class_proba)` and the
  // hand-tuned tag/height bumps go away.
  if (formType === "unknown") {
    let confidence = 0.18;
    if (buildingTag && buildingTag !== "yes") confidence += 0.04;
    if (sourceHeightM != null) confidence += 0.02;
    return Math.min(0.32, Number(confidence.toFixed(2)));
  }

  let confidence = 0.56;
  if (buildingTag && buildingTag !== "yes") confidence += 0.12;
  if (sourceHeightM != null) confidence += 0.08;
  if (formType === "single_lot" || formType === "row_infill") confidence += 0.04;
  return Math.min(0.84, Number(confidence.toFixed(2)));
}

function createFormParts(
  spec: BuildingFormSpec,
  bounds: PlanBounds,
  oriented: OrientedFootprint,
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
        fabric_archetype: spec.fabric.archetype,
        fabric_model_version: spec.fabric.model_version,
        fabric_params_hash: spec.fabric.params_hash,
        fabric_variation_seed: spec.fabric.params.variation_seed,
        fabric_feature_completeness: spec.fabric.feature_completeness,
        fabric_completeness_flags: spec.fabric.completeness_flags,
        fabric_detail_level: detailLevelForPartRole(partRole),
        fabric_height_m: spec.fabric.params.height_m,
        fabric_stories: spec.fabric.params.stories,
        fabric_front_edge_bearing_degrees:
          spec.fabric.params.front_edge_bearing_degrees,
        fabric_roof_pitch_degrees: spec.fabric.params.roof_pitch_degrees,
        fabric_cornice_height_m: spec.fabric.params.cornice_height_m,
        fabric_window_spacing_m: spec.fabric.params.window_spacing_m,
        fabric_facade_color: spec.fabric.params.facade_color,
        fabric_roof_material: spec.fabric.params.roof_material,
        fabric_glb_uri: spec.fabric.glb_uri,
        fabric_glb_sha256: spec.fabric.glb_sha256,
        fabric_glb_status: spec.fabric.glb_status,
        typology_class: spec.typology_class,
        typology_confidence: spec.typology_confidence,
      },
    });
  };

  // All (u, v) values below are in the front-edge-aligned local frame:
  //   u = 0..1 from left to right along the front edge (street-parallel)
  //   v = 0..1 from front (street side) to back
  // `orientedRect` rotates + translates these back into (lng, lat) using
  // the building's actual bearing.
  switch (spec.form_type) {
    case "courtyard_compact":
      add(
        orientedRectWithHole(oriented, 0.06, 0.06, 0.94, 0.94, 0.32, 0.32, 0.68, 0.68),
        "courtyard_ring",
        "Perimeter block around a courtyard",
      );
      add(
        orientedRect(oriented, 0.34, 0.34, 0.66, 0.66),
        "courtyard_yard",
        "Courtyard yard",
        spec.generated_height_m * 0.08,
      );
      break;
    case "courtyard_open":
      add(orientedRect(oriented, 0.06, 0.08, 0.94, 0.3), "street_wall", "Street wall");
      add(orientedRect(oriented, 0.06, 0.3, 0.28, 0.9), "side_wing", "Left courtyard wing");
      add(orientedRect(oriented, 0.72, 0.3, 0.94, 0.9), "side_wing", "Right courtyard wing");
      add(
        orientedRect(oriented, 0.32, 0.34, 0.68, 0.84),
        "courtyard_yard",
        "Open courtyard yard",
        spec.generated_height_m * 0.08,
      );
      break;
    case "slab":
      // Slab runs along the front (u-axis), thin across depth — the long
      // axis of a slab points along the street. The prior code had two
      // branches that approximated this with bounding-box axis-picking;
      // rotation handles it without a conditional.
      add(orientedRect(oriented, 0.05, 0.36, 0.95, 0.64), "slab_bar", "Long slab");
      break;
    case "row_infill":
      // Spec PR 2: 3 parts max. The per-unit decomposition (3-5 row
      // bodies, 3-5 roofs, 2-4 party walls = up to 14 parts) is the
      // worst paper-craft offender in the old model. Replace with:
      //   1. ONE continuous row body
      //   2. ONE continuous row roof
      //   3. ONE single vertical party-wall hint line (the centerline,
      //      a thin u-sliver standing in for the whole row's rhythm)
      // The `createOrientedRowParts` helper is no longer called for
      // this form, but kept in the file for the fabric detail pass and
      // future per-unit re-introduction if needed.
      add(
        orientedRect(oriented, 0.05, 0.12, 0.95, 0.88),
        "row_unit",
        "Row body",
      );
      add(
        orientedRect(oriented, 0.06, 0.22, 0.94, 0.78),
        "row_roof",
        "Row roof",
        spec.generated_height_m + 0.3,
      );
      add(
        orientedRect(oriented, 0.498, 0.12, 0.502, 0.88),
        "party_wall",
        "Party wall hint",
        spec.generated_height_m + 0.3,
      );
      break;
    case "single_lot":
      // Spec PR 2: 3 parts max. Mass (house body) + Roof (gable plane
      // and ridge collapsed into ONE topping plane, lifted +0.3m) +
      // Detail (front porch). The prior 5-part decomposition (body,
      // roof plane, separate ridge, front porch, rear ell) read as a
      // paper-craft kit instead of a basswood chipboard model.
      add(orientedRect(oriented, 0.2, 0.18, 0.8, 0.76), "house_body", "House body");
      add(
        orientedRect(oriented, 0.18, 0.32, 0.82, 0.62),
        "roof_plane",
        "Gable roof",
        spec.generated_height_m + 0.3,
      );
      // Detail: porch on the front edge (low v), centered along u
      // (street-frontage). One signature detail per the spec table.
      add(
        orientedRect(oriented, 0.36, 0.08, 0.64, 0.22),
        "front_porch",
        "Front porch",
        spec.generated_height_m * 0.34,
      );
      break;
    case "industrial_shed":
      add(orientedRect(oriented, 0.04, 0.06, 0.96, 0.94), "shed_body", "Industrial shed body");
      add(
        orientedRect(oriented, 0.18, 0.44, 0.82, 0.56),
        "roof_monitor",
        "Roof monitor",
        spec.generated_height_m + 2,
      );
      break;
    case "civic_anchor":
      add(orientedRect(oriented, 0.18, 0.16, 0.82, 0.84), "civic_body", "Civic body");
      // Civic cross wing runs along the front (u-axis): the dominant
      // facade gesture for a civic anchor is street-parallel breadth.
      add(
        orientedRect(oriented, 0.06, 0.42, 0.94, 0.58),
        "civic_wing",
        "Civic cross wing",
        spec.generated_height_m * 0.72,
      );
      break;
    case "mixed_use_street_wall":
      add(
        orientedRect(oriented, 0.06, 0.06, 0.94, 0.38),
        "street_wall",
        "Mixed-use street wall",
      );
      add(
        orientedRect(oriented, 0.12, 0.1, 0.88, 0.18),
        "roof_ridge",
        "Street-wall cornice",
        spec.generated_height_m + 0.8,
      );
      add(
        orientedRect(oriented, 0.36, 0.38, 0.66, 0.9),
        "rear_wing",
        "Rear wing",
        spec.generated_height_m * 0.72,
      );
      break;
    case "tower_podium":
      add(
        orientedRect(oriented, 0.08, 0.08, 0.92, 0.92),
        "podium",
        "Podium",
        spec.generated_height_m * 0.45,
      );
      add(
        orientedRect(oriented, 0.34, 0.34, 0.66, 0.72),
        "tower",
        "Tower",
        spec.generated_height_m,
      );
      break;
    case "unknown":
      // The honest answer for buildings without a real classification: emit
      // the actual footprint outline as a single mass extrusion. No porch,
      // no roof plane, no cornice — the chipboard model says "this is a
      // building shape with a height, and we don't yet know what's inside."
      add(
        footprintAsPolygon(spec.fabric.params.footprint_polygon, bounds),
        "house_body",
        "Unclassified mass",
      );
      break;
  }

  // Skip fabric decoration entirely for unclassified buildings. The fabric
  // detail pass expects the form switch above to have laid down body parts
  // its dormers / cornices / sawtooths can land on; for "unknown" there's
  // no body to decorate, only the raw footprint mass.
  if (spec.form_type !== "unknown") {
    createFabricDetailParts(spec, oriented, add);
  }

  return parts;
}

/**
 * Convert the OSM-derived footprint ring into a GeoJSON polygon. Falls back
 * to a bounding-box rectangle if the ring is empty or degenerate (which
 * `getPlanBounds` would have already rejected upstream, but defensive).
 */
function footprintAsPolygon(
  ring: [number, number][],
  bounds: PlanBounds,
): GeoJSON.Polygon {
  if (ring.length < 4) {
    return rect(bounds, 0.02, 0.02, 0.98, 0.98);
  }
  return {
    type: "Polygon",
    coordinates: [ring.map(([lng, lat]) => [lng, lat] as [number, number])],
  };
}

type AddUrbanDesignPart = (
  geometry: GeoJSON.Polygon,
  partRole: UrbanDesignPartRole,
  partLabel: string,
  heightM?: number,
) => void;

function createFabricDetailParts(
  spec: BuildingFormSpec,
  oriented: OrientedFootprint,
  add: AddUrbanDesignPart,
) {
  const baseHeight = spec.generated_height_m;
  const bayCount = facadeBayCount(oriented, spec);

  switch (spec.fabric.archetype) {
    case "present_residential_single":
      addFrontBand(oriented, add, "porch_step", "Porch step", 0.08, 0.13, baseHeight * 0.16);
      if (spec.fabric.params.variation_seed % 3 !== 0) {
        addDormers(oriented, add, baseHeight + 1.15);
      }
      break;
    case "present_residential_multi":
      addFrontBand(oriented, add, "cornice_band", "Apartment cornice", 0.18, 0.23, baseHeight + 0.45);
      addFacadeBays(oriented, add, "facade_rhythm", "Apartment facade bay", bayCount, 0.28, 0.36, baseHeight + 0.2);
      break;
    case "present_commercial":
      addFrontBand(oriented, add, "parapet", "Commercial parapet", 0.08, 0.13, baseHeight + 0.9);
      addFacadeBays(oriented, add, "storefront_bay", "Storefront bay", bayCount, 0.13, 0.25, baseHeight * 0.42);
      addFrontBand(oriented, add, "cornice_band", "Commercial cornice", 0.25, 0.3, baseHeight + 0.35);
      break;
    case "present_industrial":
      addSawtoothRoof(oriented, add, baseHeight + 1.2, spec.fabric.params.roof_pitch_degrees);
      break;
    case "present_civic":
      addCenterFront(oriented, add, "civic_entry", "Civic entry", 0.16, 0.26, baseHeight * 0.72);
      addCenterRoof(oriented, add, "civic_roof", "Civic roof", baseHeight + 1.15);
      break;
    case "present_mixed_use":
      addFacadeBays(oriented, add, "storefront_bay", "Ground-floor storefront bay", bayCount, 0.1, 0.22, baseHeight * 0.36);
      addFacadeBays(oriented, add, "facade_rhythm", "Upper-floor facade rhythm", bayCount, 0.34, 0.42, baseHeight + 0.18);
      addFrontBand(oriented, add, "cornice_band", "Mixed-use cornice", 0.22, 0.27, baseHeight + 0.5);
      break;
    case "present_unknown":
      // No decoration on unclassified buildings — handled by the caller
      // skipping createFabricDetailParts. This case present only for
      // type-exhaustiveness; never reached at runtime.
      break;
  }
}

function facadeBayCount(oriented: OrientedFootprint, spec: BuildingFormSpec): number {
  // Bay count is now scaled by the bearing-aligned frontage (along the
  // front edge, the street-parallel extent), not the lng-aligned bbox max.
  // For a building diagonal to the cardinals, the old `Math.max(widthM,
  // depthM)` would overestimate frontage by up to √2, producing too many
  // bays for the visible facade.
  return Math.max(
    2,
    Math.min(8, Math.floor(oriented.frontageM / spec.fabric.params.window_spacing_m)),
  );
}

function addFacadeBays(
  oriented: OrientedFootprint,
  add: AddUrbanDesignPart,
  role: UrbanDesignPartRole,
  label: string,
  count: number,
  depth0: number,
  depth1: number,
  heightM: number,
) {
  // Bays distributed evenly along the front edge (u-axis), with v-extent
  // pinned at the requested depth band. No more "horizontalFront" branch:
  // u is always along the front by construction.
  const step = 0.72 / count;
  for (let index = 0; index < count; index += 1) {
    const start = 0.14 + index * step + 0.008;
    const end = 0.14 + (index + 1) * step - 0.008;
    add(
      orientedRect(oriented, start, depth0, end, depth1),
      role,
      `${label} ${index + 1}`,
      heightM,
    );
  }
}

function addFrontBand(
  oriented: OrientedFootprint,
  add: AddUrbanDesignPart,
  role: UrbanDesignPartRole,
  label: string,
  depth0: number,
  depth1: number,
  heightM: number,
) {
  // Full-width band at front depth (low v). u spans most of the frontage.
  add(orientedRect(oriented, 0.12, depth0, 0.88, depth1), role, label, heightM);
}

function addCenterFront(
  oriented: OrientedFootprint,
  add: AddUrbanDesignPart,
  role: UrbanDesignPartRole,
  label: string,
  depth0: number,
  depth1: number,
  heightM: number,
) {
  // Centered band at front depth — used for civic entries (one prominent
  // central door) rather than the full storefront-bay distribution.
  add(orientedRect(oriented, 0.4, depth0, 0.6, depth1), role, label, heightM);
}

function addCenterRoof(
  oriented: OrientedFootprint,
  add: AddUrbanDesignPart,
  role: UrbanDesignPartRole,
  label: string,
  heightM: number,
) {
  add(orientedRect(oriented, 0.28, 0.28, 0.72, 0.72), role, label, heightM);
}

function addDormers(
  oriented: OrientedFootprint,
  add: AddUrbanDesignPart,
  heightM: number,
) {
  // Two front dormers, both on the front roof slope (low v), spaced along
  // the front edge (u). Front-edge placement makes residential houses
  // read with their roof articulation FACING the street, not facing
  // whichever bounding-box axis was longer.
  add(
    orientedRect(oriented, 0.34, 0.28, 0.42, 0.38),
    "dormer",
    "Front dormer",
    heightM,
  );
  add(
    orientedRect(oriented, 0.58, 0.28, 0.66, 0.38),
    "dormer",
    "Front dormer",
    heightM,
  );
}

function addSawtoothRoof(
  oriented: OrientedFootprint,
  add: AddUrbanDesignPart,
  heightM: number,
  roofPitchDegrees: number,
) {
  // Industrial sawtooth bays distributed along the long axis (frontage,
  // u). Each bay is a thin slice along u, spanning roughly half the depth
  // (v in [0.28, 0.72]). The lift parameter encodes roof-pitch elevation.
  const count = Math.max(
    2,
    Math.min(7, Math.floor(Math.max(oriented.frontageM, oriented.depthM) / 18)),
  );
  const lift = Math.max(0.4, roofPitchDegrees / 12);
  const step = 0.78 / count;
  for (let index = 0; index < count; index += 1) {
    const start = 0.11 + index * step;
    const end = Math.min(0.89, start + step * 0.42);
    add(
      orientedRect(oriented, start, 0.28, end, 0.72),
      "sawtooth_roof",
      `Sawtooth roof bay ${index + 1}`,
      heightM + lift,
    );
  }
}

type RowPart = {
  body: GeoJSON.Polygon;
  roof: GeoJSON.Polygon;
  partyWall: GeoJSON.Polygon | null;
};

/**
 * Row units distributed along the front edge (u-axis). Each unit's body
 * fills the depth (v in [0.12, 0.88]); party walls are thin u-slivers
 * between adjacent units. The prior implementation had two layouts
 * (widthM >= depthM vs. else); under the oriented frame these collapse
 * to one, because u is always the street-parallel axis.
 */
function createOrientedRowParts(
  oriented: OrientedFootprint,
  count: number,
): RowPart[] {
  const parts: RowPart[] = [];
  const gap = 0.028;
  const step = 0.9 / count;
  for (let index = 0; index < count; index += 1) {
    const start = 0.05 + index * step + gap;
    const end = 0.05 + (index + 1) * step - gap;
    parts.push({
      body: orientedRect(oriented, start, 0.12, end, 0.88),
      roof: orientedRect(oriented, start + 0.012, 0.22, end - 0.012, 0.78),
      partyWall:
        index === 0
          ? null
          : orientedRect(oriented, start - 0.008, 0.12, start + 0.008, 0.88),
    });
  }
  return parts;
}

function detailLevelForPartRole(
  partRole: UrbanDesignPartRole,
): BuildingFabricDetailLevel {
  switch (partRole) {
    case "courtyard_yard":
      return "site";
    case "roof_plane":
    case "roof_ridge":
    case "row_roof":
    case "roof_monitor":
    case "sawtooth_roof":
    case "civic_roof":
    case "dormer":
    case "parapet":
      return "roof";
    case "front_porch":
    case "porch_or_rear_ell":
    case "porch_step":
    case "party_wall":
    case "cornice_band":
    case "civic_entry":
    case "facade_rhythm":
    case "storefront_bay":
      return "facade";
    default:
      return "mass";
  }
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

function getPlanRing(
  geometry: GeoJSON.Geometry | null | undefined,
): [number, number][] {
  const ring =
    geometry?.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry?.type === "MultiPolygon"
        ? geometry.coordinates[0]?.[0]
        : null;
  if (!ring) return [];
  return ring
    .filter((coordinate): coordinate is [number, number] => {
      return (
        Array.isArray(coordinate) &&
        typeof coordinate[0] === "number" &&
        typeof coordinate[1] === "number"
      );
    })
    .map(([lng, lat]): [number, number] => [lng, lat]);
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

/**
 * Build the front-aligned local coordinate frame for a footprint. Projects
 * every vertex onto the bearing axis (u, along front) and its perpendicular
 * (v, front-to-back) to derive the rotated-bbox extents `frontageM` and
 * `depthM`. These are the dimensions a part-placement helper actually
 * cares about — the lng-aligned `bounds.widthM` / `bounds.depthM` are
 * irrelevant once we know the building's orientation.
 *
 * The bearing comes from `front_edge_bearing_degrees` upstream, which today
 * is the longest-edge bearing (an OK proxy because most rectangular
 * buildings have their longest edge along the street). Once Phase A's
 * parcel-front classifier writes per-row bearings, this function reads
 * those instead, with no API change.
 */
function getOrientedFootprint(
  ring: [number, number][],
  bearingDegrees: number,
  bounds: PlanBounds,
): OrientedFootprint {
  const centerLat = (bounds.south + bounds.north) / 2;
  const metersPerLat = 111_320;
  const metersPerLng = Math.cos((centerLat * Math.PI) / 180) * metersPerLat;
  const center: [number, number] = [
    bounds.west + bounds.widthLng / 2,
    bounds.south + bounds.heightLat / 2,
  ];
  const bearingRad = (bearingDegrees * Math.PI) / 180;
  const sinB = Math.sin(bearingRad);
  const cosB = Math.cos(bearingRad);

  let uMin = Number.POSITIVE_INFINITY;
  let uMax = Number.NEGATIVE_INFINITY;
  let vMin = Number.POSITIVE_INFINITY;
  let vMax = Number.NEGATIVE_INFINITY;

  for (const [lng, lat] of ring) {
    if (typeof lng !== "number" || typeof lat !== "number") continue;
    const east = (lng - center[0]) * metersPerLng;
    const north = (lat - center[1]) * metersPerLat;
    // Compass bearing 0 = north, π/2 = east. u-axis points "along bearing":
    //   u =  east·sin(b) + north·cos(b)
    // v-axis is 90° clockwise from u (so v points into the building from
    // the front edge when the front lies along bearing):
    //   v =  east·cos(b) - north·sin(b)
    const u = east * sinB + north * cosB;
    const v = east * cosB - north * sinB;
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }

  // Defensive: if the ring was empty or degenerate, fall back to the
  // lng-aligned bounds so part placement still has finite extents.
  const frontageM =
    Number.isFinite(uMax - uMin) && uMax > uMin
      ? uMax - uMin
      : Math.max(bounds.widthM, bounds.depthM);
  const depthM =
    Number.isFinite(vMax - vMin) && vMax > vMin
      ? vMax - vMin
      : Math.min(bounds.widthM, bounds.depthM);

  return {
    center,
    bearingRad,
    frontageM,
    depthM,
    metersPerLng,
    metersPerLat,
  };
}

/**
 * Project (u, v) ∈ [0, 1]² local coordinates back to (lng, lat). u=0 is the
 * left edge of the front face, u=1 the right edge; v=0 is the front edge,
 * v=1 the back.
 */
function projectUV(
  o: OrientedFootprint,
  u: number,
  v: number,
): [number, number] {
  const localU = (u - 0.5) * o.frontageM;
  const localV = (v - 0.5) * o.depthM;
  const sinB = Math.sin(o.bearingRad);
  const cosB = Math.cos(o.bearingRad);
  const east = localU * sinB + localV * cosB;
  const north = localU * cosB - localV * sinB;
  return [
    o.center[0] + east / o.metersPerLng,
    o.center[1] + north / o.metersPerLat,
  ];
}

function orientedRect(
  o: OrientedFootprint,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
): GeoJSON.Polygon {
  const cu0 = clamp01(u0);
  const cu1 = clamp01(u1);
  const cv0 = clamp01(v0);
  const cv1 = clamp01(v1);
  return {
    type: "Polygon",
    coordinates: [
      [
        projectUV(o, cu0, cv0),
        projectUV(o, cu1, cv0),
        projectUV(o, cu1, cv1),
        projectUV(o, cu0, cv1),
        projectUV(o, cu0, cv0),
      ],
    ],
  };
}

function orientedRectWithHole(
  o: OrientedFootprint,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  hu0: number,
  hv0: number,
  hu1: number,
  hv1: number,
): GeoJSON.Polygon {
  const cu0 = clamp01(u0);
  const cu1 = clamp01(u1);
  const cv0 = clamp01(v0);
  const cv1 = clamp01(v1);
  const chu0 = clamp01(hu0);
  const chu1 = clamp01(hu1);
  const chv0 = clamp01(hv0);
  const chv1 = clamp01(hv1);
  return {
    type: "Polygon",
    coordinates: [
      [
        projectUV(o, cu0, cv0),
        projectUV(o, cu1, cv0),
        projectUV(o, cu1, cv1),
        projectUV(o, cu0, cv1),
        projectUV(o, cu0, cv0),
      ],
      // Hole ring with reversed winding for GeoJSON convention.
      [
        projectUV(o, chu0, chv0),
        projectUV(o, chu0, chv1),
        projectUV(o, chu1, chv1),
        projectUV(o, chu1, chv0),
        projectUV(o, chu0, chv0),
      ],
    ],
  };
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
