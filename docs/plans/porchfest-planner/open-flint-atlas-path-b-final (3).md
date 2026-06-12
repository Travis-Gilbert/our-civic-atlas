# Open Flint Atlas: Path B (cool Observable), final files

Path B chosen: cool surface, Fraunces display, IBM Plex Sans Condensed body retained. These are the complete replacements for the two files, no diffs to interpret. No frontend commits from this surface; apply or hand to Claude Code.

## One caveat before you apply

`globals.css` may not own the warm cream by itself. `layout.tsx` imports `./open-flint-atlas/atlas.css` after `globals.css`, so the warm surface may also be set in `atlas.css` or in component styles, and a later rule would override the cool base below. Before calling this done, grep the repo for the warm values and migrate them too:

```
rg -n "#f6f4ee|#2a2419|f6f4ee|cream" src/
```

Move any surface or text colors found into the token set (or to `--color-pure-white` / `--color-near-black`), so the cool base is not silently overridden.

## `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans_Condensed, Fraunces } from "next/font/google";
import "antd/dist/reset.css";
import "./globals.css";
import "./open-flint-atlas/atlas.css";

// Body / UI font. Plex Sans Condensed reads denser than the
// non-condensed Plex Sans, which fits the editorial atlas chrome:
// narrower x-height and tighter spacing fit more content per panel
// without dropping size. It also serves as the mono surface (chips,
// coords, IDs) via uppercase + tracking; --font-mono points at it.
const ibmPlexSansCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${ibmPlexSansCondensed.variable} ${fraunces.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

The `next/font/local` import is gone because Block Berthold was the only local font. The `BlockBerthold.ttf` file can be removed from `src/fonts/`.

## `src/app/globals.css`

```css
@import "tailwindcss";

@theme {
  /* Observable palette */
  --color-navy-primary: #005186;
  --color-syntax-navy: #005f87;
  --color-near-black: #1c1c1c;
  --color-dark-gray: #454545;
  --color-mid-gray: #c5c5c5;
  --color-light-gray: #e2e2e2;
  --color-near-white: #f5f5f5;
  --color-pure-white: #ffffff;
  --color-code-surface-blue: #f1f6fb;
  --color-syntax-purple: #6636b4;
  --color-syntax-teal: #20a5ba;

  /* Depth, the evidence-backed shadows */
  --shadow-card: 0 4px 15px rgba(0, 0, 0, 0.12);
  --shadow-popover: 0 2px 8px rgba(0, 0, 0, 0.15);
  --shadow-elevated: 0 2px 8px rgba(0, 0, 0, 0.25);
}

:root {
  color-scheme: light;
  --font-sans:
    var(--font-ibm-plex-sans), ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", sans-serif;
  /* Display chain: Fraunces, a high-contrast serif. Fallbacks stay in the
     same high-contrast-serif register so a load failure does not reflow
     into a tonally wrong typeface. */
  --font-display:
    var(--font-display-face), "Playfair Display", Georgia, "Times New Roman",
    serif;
  /* --font-mono resolves to Plex Sans Condensed; the atlas "mono surface"
     (chips, coords, IDs, section labels) renders in the body family via
     uppercase + tracking. Kept for `font-mono` utilities and direct refs. */
  --font-mono:
    var(--font-ibm-plex-sans), ui-monospace, SFMono-Regular, Menlo, monospace;
}

html,
body {
  min-height: 100%;
  margin: 0;
  background: #ffffff;
}

body {
  color: #1c1c1c;
  font-family: var(--font-sans);
}

button,
input,
select,
textarea {
  font: inherit;
}

.font-display {
  font-family: var(--font-display);
  /* Pin Fraunces to its large optical cut for refined, high-contrast
     titles. Swap to `font-optical-sizing: auto` if you want the cut to
     track font-size automatically instead. */
  font-variation-settings: "opsz" 144;
}
```

## What this does and does not touch

- Body and the mono surface stay IBM Plex Sans Condensed, unchanged.
- The palette and shadows are now Tailwind v4 tokens, so `text-navy-primary`, `bg-code-surface-blue`, and `shadow-card` resolve. Spacing and radius still come from Tailwind defaults (`p-1/2/4/6/8/12/16/20`, `rounded-sm/rounded/rounded-lg/rounded-full`).
- These tokens style the Atlas chrome. They do not reach inside the BlockSuite editor on `/porchfest/workspace`, which themes itself; matching it is a separate BlockSuite theming pass.
- Apply the syntax colors (navy, purple, teal) as the data and map accent set, and keep the navy for the single most important action per screen, per the Observable guardrail, so the map leads and the chrome recedes.
