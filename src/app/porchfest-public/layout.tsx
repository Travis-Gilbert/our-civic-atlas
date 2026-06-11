import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./porchfest-public.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://porchfestflint.com"),
  title: "Carriage Town Porchfest 2026 | Flint, MI",
  description:
    "Flint's neighborhood music and arts festival. Live music on real porches, street stages, food vendors, and more. Free entry. Friday July 17, 2026.",
  openGraph: {
    title: "Carriage Town Porchfest 2026",
    description: "Flint's free neighborhood music festival. Friday July 17, 2026.",
    images: [
      {
        url: "/photos/poster-hero.jpg",
        width: 1179,
        height: 1822,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carriage Town Porchfest 2026",
    description: "Flint's free neighborhood music festival. Friday July 17, 2026.",
    images: ["/photos/poster-hero.jpg"],
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#1A1816",
};

export default function PorchfestPublicLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <div className="porchfest-public">{children}</div>;
}
