import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AtlasCanvasBackdrop } from "@/components/atlas/AtlasCanvasBackdrop";
import "../open-flint-atlas/atlas.css";

export const metadata: Metadata = {
  title: "PorchFest Planner | Our Civic Atlas",
  description:
    "Carriage Town PorchFest planning surface for the Flint city atlas.",
};

export default function PorchfestLayout({
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
