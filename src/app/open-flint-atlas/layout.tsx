import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { AtlasCanvasBackdrop } from "@/components/atlas/AtlasCanvasBackdrop";
import "./atlas.css";

export const metadata: Metadata = {
  title: "Flint Atlas | Our Civic Atlas",
  description:
    "The Flint city node in Our Civic Atlas. Explore places, events, sources, and provenance across the city's history and infrastructure.",
};

/**
 * Atlas viewport settings.
 *
 * `viewportFit: "cover"` extends the viewport into device notch and
 * home-indicator zones. Required for `env(safe-area-inset-bottom)` to
 * return the actual hardware inset rather than 0. Without this, the
 * dynamic island sits on top of the iOS home indicator on notch devices.
 *
 * `themeColor` tells mobile browsers what color to use for the browser
 * chrome (status bar, address bar background). Warm paper matches the
 * atlas surface register.
 */
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#f2f1ec",
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
