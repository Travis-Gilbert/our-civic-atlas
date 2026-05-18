import { Suspense } from "react";
import type { Metadata } from "next";
import { OpenFlintAtlasScene } from "@/components/atlas/OpenFlintAtlasScene";

/**
 * Lost Flint — Carriage Town, 1925.
 *
 * Phase 3 visual route. Mounts the standard Atlas Scene with three
 * pre-applied state values that frame the experience as a Lost
 * Flint walkthrough rather than the contemporary explorer:
 *
 *   - `initialBookmark="carriage-town"` — the camera flies to the
 *     Carriage Town neighborhood and the scene chrome shows the
 *     bookmark's preferred view mode.
 *   - `initialSearchValue="1925"` — `parseAtlasYear` resolves to
 *     `1925`, which puts the scene in time-travel mode and filters
 *     OSM + Lost Flint reconstructions accordingly.
 *
 * The 5 hand-encoded Carriage Town reconstruction specs from
 * `our-civic-atlas-backend/migrations/0004_seed_carriage_town_specs.sql`
 * surface here once the GraphQL hookup against the new Civic Atlas
 * backend lands. Until then the existing `FLINT_LOST_RECONSTRUCTIONS`
 * fixtures from `src/lib/atlas/historical-reconstruction.ts` drive
 * the render via `AtlasLostFlintDeckLayer.ts`. The visual feel is
 * the same; the underlying source-of-truth swap is a resolver swap
 * inside the layer, not a route rewrite.
 *
 * Per-part R3F confidence overlay is the next hand-back from the
 * Phase 3 design brainstorm: the shader math is already in
 * `AtlasLostFlintDeckLayer.ts` and ports cleanly to per-part R3F
 * meshes once the spec-to-part overlay component is designed.
 */

export const metadata: Metadata = {
  title: "Lost Flint — Carriage Town, 1925 | Our Civic Atlas",
  description:
    "Walk Carriage Town as it stood in 1925. Five reconstructed buildings, "
    + "each rendered with per-part confidence so you can see what is "
    + "documented and what is inferred from the surrounding morphology.",
};

export default function CarriageTownLostFlintPage() {
  return (
    <Suspense fallback={null}>
      <OpenFlintAtlasScene
        initialLens="explore"
        initialBookmark="carriage-town"
        initialSearchValue="1925"
      />
    </Suspense>
  );
}
