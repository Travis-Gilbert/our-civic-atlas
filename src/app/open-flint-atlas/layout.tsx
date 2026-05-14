import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AtlasCanvasBackdrop } from "@/components/atlas/AtlasCanvasBackdrop";
import "./atlas.css";

export const metadata: Metadata = {
  title: "Flint Atlas | Our Civic Atlas",
  description:
    "The Flint city node in Our Civic Atlas. Explore places, events, sources, and provenance across the city's history and infrastructure.",
};

/**
 * Atlas route wrapper.
 *
 * The standalone repo owns its canvas backdrop directly. The earlier
 * embedded route inherited Context Theorem's AppShell canvas, but that
 * parent does not exist here.
 */
export default function OpenFlintAtlasLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="civic-atlas relative h-full w-full overflow-hidden">
      <AtlasCanvasBackdrop />
      <div className="relative z-[1] h-full w-full">{children}</div>
    </div>
  );
}
