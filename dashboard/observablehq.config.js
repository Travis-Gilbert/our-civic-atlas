// PorchFest board dashboard - Observable Framework config.
//
// This is a SEPARATE BUILD TARGET, not a component inside the Next tree.
// `observable build` compiles src/ into dist/ as a self-contained static
// site: HTML, JS, theme CSS, and the precomputed JSON snapshots emitted by
// the build-time data loaders in src/data/. The Next app mounts dist/ at
// /porchfest/dashboard by iframe (see ../scripts/build-dashboard.mjs, which
// copies dist/ into ../public/porchfest-dashboard/).
//
// The look is the Observable look, tinted to the Path B "Observable cool"
// register the atlas already runs: navy (#005186) is the single accent.
// Framework's own light theme supplies the surface, type stack, and card
// system; we only nudge the focus/accent variable so links and emphasis
// read as the brand navy rather than Framework's default blue.

export default {
  title: "PorchFest Board",

  // Source lives in src/; the build emits to dist/ (the default, named here
  // for clarity since ../scripts/build-dashboard.mjs reads it).
  root: "src",
  output: "dist",

  // Observable light theme = the white-surface Observable look. "wide" lets
  // the dashboard grid use the full viewport width on a board-room display.
  theme: ["light", "wide"],

  // Single page: no sidebar, no table of contents, no prev/next pager.
  sidebar: false,
  toc: false,
  pager: false,
  search: false,

  // Tint the Observable look to the Path B navy accent and tighten the
  // board-room reading width. Injected into every page's <head>.
  head: `<style>
    :root {
      /* Path B "Observable cool" accent. Framework uses this for links,
         focus rings, and emphasis. */
      --theme-foreground-focus: #005186;
    }
    /* Big-number cards read as the brand navy, not Framework's default. */
    .big { color: var(--theme-foreground-focus); }
  </style>`,

  // A static footer line; the precise, machine-stamped "last built" time is
  // rendered in the page body from src/data/meta.json.js so there is a single
  // source of truth for freshness (spec: "a page footer states the last
  // build time").
  footer:
    "PorchFest board dashboard. Figures are precomputed at build time and refresh on each deploy and on the scheduled rebuild; they are not live.",
};
