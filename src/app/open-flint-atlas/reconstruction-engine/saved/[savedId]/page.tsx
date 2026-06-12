import { Suspense } from "react";
import type { Metadata } from "next";

import { SavedAtelierClient } from "./SavedAtelierClient";

/**
 * Saved-reconstruction atelier route: `/open-flint-atlas/atelier/saved/[savedId]`
 *
 * Resolves the saved id (e.g., `saved-reconstruction:abc123`) into the
 * underlying reconstruction + year via the `savedReconstruction(id)`
 * GraphQL query, then mounts the standard atelier surface with that
 * pre-loaded state. The user who saved the reconstruction via the
 * Atelier's Save button (PT-405) returns here by clicking the share
 * URL.
 *
 * Plan: PT-405b in `docs/plans/the-atelier/implementation-plan.md`.
 *
 * Server-component shell awaits params (Next 16 contract) then defers
 * the resolution work to the client component (SavedAtelierClient)
 * which calls the GraphQL hook.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ savedId: string }>;
}): Promise<Metadata> {
  const { savedId } = await params;
  const decoded = decodeURIComponent(savedId);
  return {
    title: `Saved Reconstruction · ${decoded} | Our Civic Atlas`,
    description: `Open the saved Reconstruction Engine view ${decoded}.`,
  };
}

export default async function SavedAtelierPage({
  params,
}: {
  params: Promise<{ savedId: string }>;
}) {
  const { savedId } = await params;
  const decoded = decodeURIComponent(savedId);
  return (
    <Suspense fallback={null}>
      <SavedAtelierClient savedId={decoded} />
    </Suspense>
  );
}
