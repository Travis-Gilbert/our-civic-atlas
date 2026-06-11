import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AtlasCanvasBackdrop } from "@/components/atlas/AtlasCanvasBackdrop";
import { ServiceWorkerRegister } from "@/components/atlas/ServiceWorkerRegister";
import "../open-flint-atlas/atlas.css";
import "./porchfest.css";

export const metadata: Metadata = {
  title: "PorchFest Planner | Our Civic Atlas",
  description:
    "Carriage Town PorchFest planning surface for the Flint city atlas.",
  // Installable PWA: Next links the app manifest (src/app/manifest.ts) and
  // the generated apple-icon automatically; appleWebApp enables the iOS
  // standalone shell so the planner opens chromeless from the home screen.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PorchFest",
  },
};

/**
 * viewportFit: "cover" extends the viewport under the notch and home
 * indicator so env(safe-area-inset-*) returns the real insets the mobile
 * Dynamic Island relies on. themeColor matches the paper surface.
 */
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function PorchfestLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="civic-atlas relative h-full w-full overflow-hidden">
      <ServiceWorkerRegister />
      <AtlasCanvasBackdrop />
      <div className="relative z-[1] h-full w-full">{children}</div>
    </div>
  );
}
