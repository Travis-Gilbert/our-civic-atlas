/**
 * flint-building-addresses.ts
 *
 * Resolves a building's street address from the City of Flint's parcel GIS.
 *
 * The data is produced offline by `scripts/fetch-flint-parcels.mjs`, which
 * pulls the City of Flint "Main_COF_Parcel_view" parcel layer for the
 * Carriage Town extent and matches each building footprint to the parcel
 * polygon that physically contains it (point-in-polygon, no geocoding).
 * The result is keyed by OSM building id (`osm_id`), which every building
 * layer in the atlas carries either directly (`osm_id`) or as a back-
 * reference (`source_osm_id`) because the urban-design and fabric models
 * are derived from the OSM footprints.
 *
 * Address precedence for display is intentionally layered:
 *   1. (Step 3, future) a planner's manual edit override
 *   2. City of Flint parcel address  <- authoritative, this module
 *   3. OpenStreetMap `address` tag    <- sparse fallback (~16 buildings)
 *   4. none                            <- accurate-or-absent, never guessed
 *
 * Where OSM and the city parcel disagree, the city parcel wins: the parcel
 * polygon contains the footprint, so it is the geometrically grounded truth.
 * (Validation found OSM tags like "1102 Mackin Road" on a Carriage Town
 * building; the parcel join corrects those.)
 */

import flintData from "@/data/open-flint-atlas/fixtures/flint-building-addresses.json";
import { getAddressOverride } from "./flint-address-overrides";

export interface FlintBuildingAddress {
  /** Street address as the city records it, e.g. "725 GARLAND ST". */
  readonly address: string;
  readonly city: string;
  readonly zip: string | null;
  /** "725 GARLAND ST, FLINT, MI 48503". */
  readonly fullAddress: string;
  readonly yearBuilt: number | null;
  readonly useType: string | null;
  readonly propClass: number | null;
  readonly ownerType: string | null;
  readonly zoning: string | null;
  readonly parcelId: string | null;
  /** Provenance label, always "City of Flint GIS". */
  readonly source: string;
}

interface FlintAddressFixture {
  readonly meta: Record<string, unknown>;
  readonly addresses: Record<string, FlintBuildingAddress>;
}

const ADDRESSES: Record<string, FlintBuildingAddress> = (
  flintData as FlintAddressFixture
).addresses;

/** The City of Flint parcel record for a building, or null if unmatched. */
export function getFlintBuildingAddress(
  osmId: string | number | null | undefined,
): FlintBuildingAddress | null {
  if (osmId === null || osmId === undefined) return null;
  return ADDRESSES[String(osmId)] ?? null;
}

/**
 * Title-case the city's ALL-CAPS address for display, keeping single-letter
 * directionals (N/S/E/W) capitalized: "725 GARLAND ST" -> "725 Garland St",
 * "310 N GRAND TRAVERSE" -> "310 N Grand Traverse".
 */
export function formatStreetAddress(raw: string): string {
  return raw
    .split(/\s+/)
    .map((word) =>
      word.length <= 1
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

/**
 * Resolve the address to display for a building, applying the precedence
 * above (city parcel > OSM tag > none). Returns a display-ready string.
 *
 * `osmAddress` is the building feature's existing `address` property (the
 * OSM tag), passed through unchanged so it can serve as the fallback.
 */
/** Which source a resolved address came from. */
export type AddressSource = "edit" | "city" | "osm";

export interface ResolvedAddress {
  readonly text: string;
  readonly source: AddressSource;
}

/** Human-readable provenance label for a resolved address. */
export function addressSourceLabel(source: AddressSource): string {
  switch (source) {
    case "edit":
      return "Edited";
    case "city":
      return "City of Flint GIS";
    case "osm":
      return "OpenStreetMap";
  }
}

function coerceOsmId(osmId: unknown): string | number | null {
  return typeof osmId === "string" || typeof osmId === "number" ? osmId : null;
}

/**
 * Resolve a building's address with full precedence and provenance:
 * manual edit > City of Flint parcel > OpenStreetMap tag > none.
 */
export function resolveBuildingAddressDetailed(
  osmId: unknown,
  osmAddress: unknown,
): ResolvedAddress | null {
  const id = coerceOsmId(osmId);
  const override = getAddressOverride(id);
  if (override) return { text: override, source: "edit" };
  const flint = getFlintBuildingAddress(id);
  if (flint) return { text: formatStreetAddress(flint.address), source: "city" };
  if (typeof osmAddress === "string" && osmAddress.trim().length > 0) {
    return { text: osmAddress.trim(), source: "osm" };
  }
  return null;
}

/**
 * Resolve the display address for a building (precedence above). Returns a
 * display-ready string, or null when no source has an address.
 *
 * `osmAddress` is the building feature's existing `address` property (the
 * OSM tag), passed through unchanged so it can serve as the fallback.
 */
export function resolveBuildingAddress(
  osmId: unknown,
  osmAddress: unknown,
): string | null {
  return resolveBuildingAddressDetailed(osmId, osmAddress)?.text ?? null;
}
