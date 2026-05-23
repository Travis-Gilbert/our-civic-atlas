/**
 * SelectedBuilding state shape carried by OpenFlintAtlasScene.
 *
 * Distinct from `selectedPlaceId` (which represents civic places: wards,
 * parcels, addresses). A building selection carries OSM-derived
 * footprint metadata plus the urban design model's typology fields.
 *
 * Spec: docs/design-2026-05-atlas-feel-pass.md, PR 1.
 */
export type SelectedBuilding = {
  osm_id: string | number;
  name: string | null;
  address: string | null;
  typology_class: string | null;
  typology_confidence: number | null;
  fabric_archetype: string | null;
  /** Footprint centroid as `[lon, lat]`. Useful for fly-to and tooltip
   * placement without a re-pick. */
  position: [number, number];
};

/**
 * Picks a stable display title for the collapsed dynamic island when a
 * building is selected. Fallback chain per spec PR 1: name → address →
 * `Building #<osm_id>`.
 */
export function buildingDisplayTitle(building: SelectedBuilding): string {
  if (building.name && building.name.trim().length > 0) {
    return building.name.trim();
  }
  if (building.address && building.address.trim().length > 0) {
    return building.address.trim();
  }
  return `Building #${building.osm_id}`;
}
