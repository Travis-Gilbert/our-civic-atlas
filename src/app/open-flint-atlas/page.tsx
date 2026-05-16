import { Suspense } from "react";
import { OpenFlintAtlasScene } from "@/components/atlas/OpenFlintAtlasScene";

function firstSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function OpenFlintAtlasPage({
  searchParams,
}: {
  searchParams: Promise<{ compare?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialCompareAtlasId = firstSearchParam(params.compare);

  return (
    <Suspense fallback={null}>
      <OpenFlintAtlasScene
        initialLens="explore"
        initialCompareAtlasId={initialCompareAtlasId}
      />
    </Suspense>
  );
}
