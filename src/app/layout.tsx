import type { Metadata } from "next";
import { Courier_Prime, IBM_Plex_Sans_Condensed } from "next/font/google";
import localFont from "next/font/local";
import "antd/dist/reset.css";
import "./globals.css";

// Body / UI font. Plex Sans Condensed reads denser than the
// non-condensed Plex Sans, which matches the editorial atlas
// feel — narrower x-height + tighter letter spacing means more
// content fits in the chrome panels without dropping size.
const ibmPlexSansCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

// Monospace font. Courier Prime is Quote-Unquote Apps' refinement
// of Courier — improved on-screen legibility, better italic. The
// mono surface in this atlas is small (chips, coords, IDs) but
// dense, so legibility wins over personality.
const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

// Display / title font. Block (Berthold, Hermann Hoffmann, 1908)
// is a heavy condensed sans with strong early-20th-century
// industrial-typography pedigree — exactly the period Flint was
// at its peak. Routed to .font-display only (titles, masthead),
// never body. Loaded locally so Next.js subsets it to WOFF2 at
// build time and the raw TTF is not served publicly.
const blockBerthold = localFont({
  src: "../fonts/BlockBerthold.ttf",
  variable: "--font-block-berthold",
  display: "swap",
  weight: "700",
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
      className={`${ibmPlexSansCondensed.variable} ${courierPrime.variable} ${blockBerthold.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
