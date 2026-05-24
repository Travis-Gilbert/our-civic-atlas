import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { resolveAtelierRoute } from "@/lib/atlas/atelier-route";
import { AtelierSurface } from "@/components/atlas/atelier/AtelierSurface";

/**
 * Atelier route: `/open-flint-atlas/atelier/[parcelId]/[year]`
 *
 * Server component. Awaits `params` (Next 16 contract), resolves the
 * parcel + year against the fixture, and mounts the client-side
 * `<AtelierSurface>` with the resolved reconstructionId.
 *
 * 404 when the parcelId is not in the fixture or the year fails parsing.
 *
 * Plan: PT-202 in `docs/plans/the-atelier/implementation-plan.md`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ parcelId: string; year: string }>;
}): Promise<Metadata> {
  const { parcelId, year } = await params;
  const resolved = resolveAtelierRoute(parcelId, year);
  if (!resolved) {
    return {
      title: "Atelier | Our Civic Atlas",
      description: "Reconstruction not found.",
    };
  }
  return {
    title: `${resolved.reconstruction.name} · Circa ${resolved.params.year} | Atelier`,
    description: `Walk the reconstruction of ${resolved.reconstruction.name} in ${resolved.params.year}. Per-part confidence, source citations, and merge conflicts surfaced honestly.`,
  };
}

export default async function AtelierPage({
  params,
}: {
  params: Promise<{ parcelId: string; year: string }>;
}) {
  const { parcelId, year } = await params;
  const resolved = resolveAtelierRoute(parcelId, year);

  if (!resolved) {
    notFound();
  }

  return (
    <AtelierSurface
      reconstructionId={resolved.reconstructionId}
      parcelId={resolved.params.parcelId}
      year={resolved.params.year}
    />
  );
}
