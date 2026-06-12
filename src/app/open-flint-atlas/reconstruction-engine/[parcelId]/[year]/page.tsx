import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { resolveAtelierRoute } from "@/lib/atlas/atelier-route";
import { AtelierSurface } from "@/components/atlas/atelier/AtelierSurface";

/**
 * Atelier route: `/open-flint-atlas/atelier/[parcelId]/[year]`
 *
 * Server component. Awaits `params` (Next 16 contract), resolves the
 * parcel + year for shape only, and mounts the client-side
 * `<AtelierSurface>` with either a fixture reconstruction id or the live
 * parcel/civic-object id for GraphQL to resolve.
 *
 * 404 only when the parcelId is empty or the year fails parsing.
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
      title: "Reconstruction Engine | Our Civic Atlas",
      description: "Reconstruction not found.",
    };
  }
  if (!resolved.reconstruction) {
    return {
      title: `Reconstruction · ${resolved.params.year} | Reconstruction Engine`,
      description: `Walk a source-backed reconstruction for ${resolved.params.parcelId} in ${resolved.params.year}.`,
    };
  }
  return {
    title: `${resolved.reconstruction.name} · Circa ${resolved.params.year} | Reconstruction Engine`,
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
