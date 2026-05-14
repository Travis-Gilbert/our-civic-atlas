import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
}: {
  params: Promise<{ lens: string }>;
}) {
  const { lens } = await params;
  if (!isRoutedLens(lens)) {
    notFound();
  }

  return <OpenFlintAtlasScene initialLens={lens} />;
}
