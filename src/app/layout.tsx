import type { Metadata } from "next";
import { Cabin, Courier_Prime, IBM_Plex_Sans, Vollkorn } from "next/font/google";
import "antd/dist/reset.css";
import "./globals.css";
import "./open-flint-atlas/atlas.css";

// Body / UI font. Plex Sans variable carries the width axis, so the
// system can render the requested SemiCondensed register from one family.
// globals.css pins that width token; --font-mono points at the same face
// for the atlas uppercase label surface.
const ibmPlexSansSemiCondensed = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

// Display / title font. Vollkorn gives map titles a warmer book-serif
// texture while staying sturdy at compact overlay sizes.
const vollkorn = Vollkorn({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-display-face",
  display: "swap",
});

const porchfestCabin = Cabin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-porchfest-sans",
  display: "swap",
});

const porchfestMono = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-porchfest-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flint Atlas | Our Civic Atlas",
  description:
    "The Flint city node in Our Civic Atlas, built around source-grounded maps, provenance, and community contribution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSansSemiCondensed.variable} ${vollkorn.variable} ${porchfestCabin.variable} ${porchfestMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
