import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OpenFlintAtlasScene } from "@/components/atlas/OpenFlintAtlasScene";
import {
  ATLAS_LENS_LOOKUP,
  type AtlasLensId,
} from "@/lib/atlas/scene-view";

const ROUTED_LENSES = [
  "explore",
  "memory",
  "safety",
  "interventions",
  "evidence",
] as const satisfies readonly AtlasLensId[];

type RoutedLens = (typeof ROUTED_LENSES)[number];

function isRoutedLens(value: string): value is RoutedLens {
  return ROUTED_LENSES.includes(value as RoutedLens);
}

function firstSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function generateStaticParams() {
  return ROUTED_LENSES.map((lens) => ({ lens }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lens: string }>;
}): Promise<Metadata> {
  const { lens } = await params;
  if (!isRoutedLens(lens)) {
    return {};
  }

  const lensInfo = ATLAS_LENS_LOOKUP[lens];
  return {
    title: `${lensInfo.label} | Flint Atlas | Our Civic Atlas`,
    description: lensInfo.description,
  };
}

export default async function OpenFlintAtlasLensPage({
  params,
  searchParams,
}: {
  params: Promise<{ lens: string }>;
  searchParams: Promise<{ compare?: string | string[] }>;
}) {
  const { lens } = await params;
  if (!isRoutedLens(lens)) {
    notFound();
  }
  const resolvedSearchParams = await searchParams;
  const initialCompareAtlasId = firstSearchParam(resolvedSearchParams.compare);

  return (
    <Suspense fallback={null}>
      <OpenFlintAtlasScene
        initialLens={lens}
        initialCompareAtlasId={initialCompareAtlasId}
      />
    </Suspense>
  );
}
