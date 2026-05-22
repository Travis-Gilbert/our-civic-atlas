export const BUILDING_FABRIC_HEIGHT_PRIOR_CATALOG = {
  city_pack: "us/mi/flint",
  source_yaml: "packs/us/mi/flint/archetypes/present/height_priors.yaml",
  model_version: "present-fabric-v0.1.0",
  story_height_m: 3.5,
  archetypes: {
    present_residential_single: {
      label: "Residential single",
      baseline_stories: 1,
      area_story_steps: [
        { min_area_m2: 200, stories: 2 },
      ],
      roof_pitch_default_degrees: 25,
      roof_pitch_variation_degrees: 10,
      cornice_height_m: 0,
      window_spacing_range_m: [2.4, 3.3],
      facade_color: "#d8c7aa",
      roof_material: "asphalt",
    },
    present_residential_multi: {
      label: "Residential multi",
      baseline_stories: 3,
      area_story_steps: [
        { min_area_m2: 600, stories: 4 },
        { min_area_m2: 1200, stories: 5 },
      ],
      roof_pitch_default_degrees: 5,
      roof_pitch_variation_degrees: 5,
      cornice_height_m: 0.45,
      window_spacing_range_m: [2.8, 4.1],
      facade_color: "#cfc7b8",
      roof_material: "membrane",
    },
    present_commercial: {
      label: "Commercial",
      baseline_stories: 1,
      area_story_steps: [
        { min_area_m2: 400, stories: 2 },
      ],
      roof_pitch_default_degrees: 0,
      roof_pitch_variation_degrees: 0,
      cornice_height_m: 0.65,
      window_spacing_range_m: [3, 4.8],
      facade_color: "#d6c2a5",
      roof_material: "membrane",
    },
    present_industrial: {
      label: "Industrial",
      baseline_stories: 1,
      height_m_override: 10,
      area_story_steps: [],
      roof_pitch_default_degrees: 8,
      roof_pitch_variation_degrees: 4,
      cornice_height_m: 0.2,
      window_spacing_range_m: [5.5, 8],
      facade_color: "#c3c1ba",
      roof_material: "metal",
    },
    present_civic: {
      label: "Civic",
      baseline_stories: 2,
      area_story_steps: [],
      roof_pitch_default_degrees: 20,
      roof_pitch_variation_degrees: 10,
      cornice_height_m: 0.8,
      window_spacing_range_m: [3.2, 4.6],
      facade_color: "#ddd2bd",
      roof_material: "tile",
    },
    present_mixed_use: {
      label: "Mixed use",
      baseline_stories: 3,
      area_story_steps: [],
      roof_pitch_default_degrees: 0,
      roof_pitch_variation_degrees: 0,
      cornice_height_m: 0.7,
      window_spacing_range_m: [2.9, 4.2],
      facade_color: "#d9cab0",
      roof_material: "membrane",
    },
    /**
     * Honest fallback for footprints without a real typology signal.
     * Renders as a plain extruded mass with no part decomposition. Replaces
     * the prior hash-modulo "classification" that pretended every footprint
     * fell into one of the six archetypes. Once Phase A's real LightGBM
     * classifier ships (Ray/RunPod batch), most "unknown" rows will be
     * reclassified from honest gray mass into a real archetype with
     * confidence; the render path stays the same.
     */
    present_unknown: {
      label: "Unknown",
      baseline_stories: 1,
      area_story_steps: [
        { min_area_m2: 400, stories: 2 },
        { min_area_m2: 1600, stories: 3 },
      ],
      roof_pitch_default_degrees: 0,
      roof_pitch_variation_degrees: 0,
      cornice_height_m: 0,
      window_spacing_range_m: [3, 4],
      facade_color: "#d8d3c5",
      roof_material: "membrane",
    },
  },
} as const;
