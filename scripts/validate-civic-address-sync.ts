/**
 * Validates the address <-> location reconciler (civic-address-sync.ts) against
 * the real Carriage Town geocode index: cold-load fill, steady-state no-op,
 * drag refill, forward edit (move + normalize), and loop termination. Offline,
 * deterministic, no browser or CRDT. Run: npm run validate:civic-address-sync
 */

import { reconcileAddressLocation } from "@/lib/civic/civic-address-sync";
import { pointGeometryToCivicLocation } from "@/lib/civic/civic-map-binding";
import {
  geocodeAddress,
  nearestAddress,
} from "@/lib/atlas/carriage-town-geocoder";

let failures = 0;
function check(label: string, ok: boolean): void {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failures += 1;
}

// Two real Carriage Town buildings from the geocode index.
const STEVENSON = { lng: -83.707087, lat: 43.017427 };
const FOURTH = { lng: -83.695531, lat: 43.022328 };
const loc = (p: { lng: number; lat: number }): string =>
  pointGeometryToCivicLocation({ type: "Point", coordinates: [p.lng, p.lat] }) ??
  "";

console.log("1. geocoder data is present");
check("forward resolves a known address", geocodeAddress("709 N Stevenson St") !== null);
check(
  "reverse finds the nearest building",
  nearestAddress(STEVENSON.lng, STEVENSON.lat)?.address === "709 N Stevenson St",
);

console.log("2. cold load");
{
  const r = reconcileAddressLocation(null, { address: "", location: loc(STEVENSON) });
  check(
    "fills a blank address from the nearest building",
    r.writes.some((w) => w.field === "address" && /STEVENSON/i.test(w.value)),
  );
}
{
  const r = reconcileAddressLocation(null, {
    address: "Somewhere Else",
    location: loc(STEVENSON),
  });
  check("leaves an existing address untouched", r.writes.length === 0);
}

console.log("3. steady state and drag");
{
  const addr = nearestAddress(STEVENSON.lng, STEVENSON.lat)!.address;
  const state = { address: addr, location: loc(STEVENSON) };
  check("consistent state produces no writes", reconcileAddressLocation(state, state).writes.length === 0);

  const prev = { address: addr, location: loc(STEVENSON) };
  const dragged = reconcileAddressLocation(prev, { address: addr, location: loc(FOURTH) });
  check(
    "drag refills the address to the new nearest building",
    dragged.writes.some((w) => w.field === "address" && /FOURTH/i.test(w.value)),
  );
  check("drag does not rewrite the location", !dragged.writes.some((w) => w.field === "location"));
}

console.log("4. forward edit moves the object");
{
  const prev = {
    address: nearestAddress(FOURTH.lng, FOURTH.lat)!.address,
    location: loc(FOURTH),
  };
  const edited = reconcileAddressLocation(prev, { address: "709 n stevenson", location: prev.location });
  check("a typed address writes a new location", edited.writes.some((w) => w.field === "location"));
  check(
    "the address normalizes to the building's canonical form",
    edited.writes.some((w) => w.field === "address" && w.value === "709 N Stevenson St"),
  );
}

console.log("5. no loop");
{
  let prev = { address: nearestAddress(FOURTH.lng, FOURTH.lat)!.address, location: loc(FOURTH) };
  let cur = { address: "709 n stevenson", location: prev.location };
  let settled = false;
  let steps = 0;
  for (let i = 0; i < 6; i += 1) {
    const r = reconcileAddressLocation(prev, cur);
    steps += 1;
    if (r.writes.length === 0) {
      settled = true;
      break;
    }
    prev = r.next;
    cur = r.next;
  }
  check(`a forward edit settles to a fixpoint (in ${steps} step(s))`, settled);
}

if (failures > 0) {
  console.error(`\nvalidate-civic-address-sync: ${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nvalidate-civic-address-sync: all checks passed");
