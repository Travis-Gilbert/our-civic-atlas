/**
 * Address <-> location reconciliation for placed civic objects.
 *
 * Pure decision function behind the planner's address mirroring. Given a row's
 * previously-seen and current (address, location), it returns the CRDT writes
 * to make and the post-write state to remember:
 *   - first sight with a location but no address  -> fill address (reverse)
 *   - location changed (place / drag)             -> refill address (reverse)
 *   - address changed (organizer edit)            -> move + normalize (forward)
 *
 * Recording the returned `next` as the row's seen state is what keeps the two
 * directions from looping: a value we just wrote is never re-read as a fresh
 * edit. The address is a plain mirrored string, never a Postgres relation.
 */

import {
  geocodeAddress,
  nearestAddress,
} from "@/lib/atlas/carriage-town-geocoder";
import { pointGeometryToCivicLocation } from "@/lib/civic/civic-map-binding";
import { parseCivicLocation } from "@/lib/civic/civic-object-schema";

export interface AddressLocationState {
  readonly address: string;
  readonly location: string;
}

export interface AddressLocationWrite {
  readonly field: "address" | "location";
  readonly value: string;
}

export interface AddressLocationReconcile {
  readonly writes: AddressLocationWrite[];
  readonly next: AddressLocationState;
}

const EPSILON = 1e-6;

function serializeLocation(lng: number, lat: number): string | null {
  return pointGeometryToCivicLocation({
    type: "Point",
    coordinates: [lng, lat],
  });
}

export function reconcileAddressLocation(
  prev: AddressLocationState | null,
  cur: AddressLocationState,
): AddressLocationReconcile {
  const writes: AddressLocationWrite[] = [];
  let address = cur.address;
  let location = cur.location;

  if (!prev) {
    // Cold load: only fill a blank address for a placed object; never
    // reconcile an existing mismatch (a drag and an edit are indistinguishable
    // without change history).
    if (location && !address) {
      const loc = parseCivicLocation(location);
      const near = loc ? nearestAddress(loc.lng, loc.lat) : null;
      if (near) {
        writes.push({ field: "address", value: near.address });
        address = near.address;
      }
    }
    return { writes, next: { address, location } };
  }

  if (location !== prev.location) {
    // Place / drag: location is the geospatial truth, mirror its nearest
    // building address.
    const loc = parseCivicLocation(location);
    const near = loc ? nearestAddress(loc.lng, loc.lat) : null;
    if (near && near.address !== address) {
      writes.push({ field: "address", value: near.address });
      address = near.address;
    }
  } else if (address !== prev.address && address) {
    // Organizer edited the address: move the object to that building if it
    // resolves, and normalize the field to the building's canonical address.
    const geo = geocodeAddress(address);
    if (geo) {
      const curLoc = parseCivicLocation(location);
      const moved =
        !curLoc ||
        Math.abs(curLoc.lng - geo.lng) > EPSILON ||
        Math.abs(curLoc.lat - geo.lat) > EPSILON;
      if (moved) {
        const nextLocation = serializeLocation(geo.lng, geo.lat);
        if (nextLocation) {
          writes.push({ field: "location", value: nextLocation });
          location = nextLocation;
        }
      }
      if (geo.address !== address) {
        writes.push({ field: "address", value: geo.address });
        address = geo.address;
      }
    }
  }

  return { writes, next: { address, location } };
}
