import { Suspense } from "react";
import { AtlasCanvasBackdrop } from "@/components/atlas/AtlasCanvasBackdrop";
import { OpenFlintAtlasScene } from "@/components/atlas/OpenFlintAtlasScene";

export default function HomePage() {
  return (
    <div className="civic-atlas relative h-full w-full overflow-hidden">
      <AtlasCanvasBackdrop />
      <div className="relative z-[1] h-full w-full">
        <Suspense fallback={null}>
          <OpenFlintAtlasScene initialLens="explore" />
        </Suspense>
      </div>
    </div>
  );
}
