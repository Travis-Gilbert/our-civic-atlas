import type { Metadata } from "next";
import { IBM_Plex_Sans, Fraunces } from "next/font/google";
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

// Display / title font. Fraunces, a high-contrast variable serif with
// an optical-size axis, replacing the heavier Block Berthold. The opsz
// axis lets titles take the large optical cut (pinned in globals.css)
// so they read refined at hero sizes. Routed to .font-display only.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
  axes: ["opsz"], // SOFT and WONK are available if you want more character
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
      className={`${ibmPlexSansSemiCondensed.variable} ${fraunces.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
