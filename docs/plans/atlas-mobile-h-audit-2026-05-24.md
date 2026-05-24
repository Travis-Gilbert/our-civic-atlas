# Atlas Mobile Audit (Task H) — 2026-05-24

This is the repo-local pass for Task H of
`docs/plans/atelier-real-reconstruction-plan.md`. It captures the
findings of a read-only mobile audit, the one fix that landed in the
same session, and the remaining items that need a human at a phone (or
a Playwright/Chrome install) to verify.

## What landed in this session

### Mobile top-strip chrome ships now

**Symptom (from the handoff plan)**: "The dynamic island at the bottom
is fine, but the top-of-screen branding/search has been replaced by a
bare URL bar context. There's no atlas chrome on mobile beyond the
bottom island."

**Root cause**: `src/components/atlas/AtlasSceneChrome.tsx` wrapped
the entire `<header>` in `{!isMobileViewport ? (...) : null}`. The
header was never rendered at `isMobileViewport === true`. The
`atlas.css` file already contained a `@media (max-width: 767px)`
block targeting `.atlas-scene-header` (positioning inset adjustments),
which makes clear the design intent was always to ship mobile chrome.
The JSX conditional was the regression.

**Fix landed**: commit `61be397`. Header always renders. Mobile
@media block expanded with:

- `.atlas-scene-top-strip { padding: var(--s-2) var(--s-3); gap: var(--s-2); }`
  (tighter padding + gap than the desktop default)
- `.atlas-scene-wordmark { font-size: 16px; }` (down from 22px so the
  wordmark fits next to the four nav links at 360px width)
- `.atlas-scene-top-actions { gap: var(--s-2); font-size: 11px; }`
  (condensed nav)
- Below 400px, the About link is hidden via
  `.atlas-scene-top-actions a[href$="/sources"] { display: none; }`.
  Reasoning: About duplicates the Methodology page's introduction;
  Methodology / Atelier / Contribute are the load-bearing entry
  points and should always be visible.

**Verification done**:
- `tsc --noEmit` clean
- `curl http://localhost:3000/open-flint-atlas | grep atlas-scene-header`
  confirms the header HTML lands in SSR output
- **Pending**: human-eye verification at 375x800, 360x780, 320x800
  (iPhone SE 1st-gen) widths. Playwright is not installed in this
  repo; the next session can run `npx playwright install chrome` and
  use the existing Playwright MCP, or open Chrome devtools mobile
  emulation directly.

## What remains for human visual verification

The handoff plan's Task H acceptance criteria covered four things.
The first is closed by `61be397`. The other three need eyes on a
running browser.

### Dynamic island at mobile width

`AtlasDynamicIsland.tsx` already takes `isMobileViewport` and adjusts
its own sizing:

| Param | Desktop | Mobile |
|---|---:|---:|
| `collapsedIslandWidth` | 360 | 316 |
| `expandedIslandWidth` | 392 | 354 |
| Place-tab expanded height | 500 | 520 |
| Non-place expanded height | 394 | 436 |

Source: `src/components/atlas/AtlasDynamicIsland.tsx` lines 239-244.

What needs human verification:

1. Does the island sit clear of the safe area inset on iOS notch
   devices? The CSS uses pixel values; `env(safe-area-inset-bottom)`
   may need to be added to the island's bottom margin.
2. At 320px (the narrowest reasonable target), does the
   `collapsedIslandWidth: 316` produce a 4px gutter that reads as
   intentional? At 320px the island will hug the edges.
3. Does the expanded place card scroll cleanly inside
   `expandedIslandWidth: 354` at 360-375px viewports?

### Bound-world mask at mobile aspect ratio

The vignette mask lives in `AtlasMap.tsx`. The handoff plan flagged
that "bound-world mask renders but feels different at mobile aspect
ratio." This audit could not visually verify the mobile feel.

What needs human verification:

1. Capture the mask at landscape AND portrait mobile aspect ratios.
2. Compare to the desktop mask. The handoff plan flagged that the
   alpha walked from 220 to 160 went too far; the candidate fix
   discussed in Task E (alpha 190 middle point) should be tested at
   both desktop and mobile aspect simultaneously.

`AtlasMap.tsx` has uncommitted edits in flight from a sibling
session (paper-grain FillStyleExtension), so the mask file should not
be edited again until those land. Document a separate fix later.

### Touch interactions

The recent commits cover most of the touch path:

- `d0bd134 feat(atelier): PT-504 right-click and long-press atelier
  entry` adds long-press (600ms with 8px move tolerance) and bubbles
  picks through `MapboxOverlay.pickObject` against the picking buffer.
  This was Task A, but it shipped today.
- `2c26282 data(atlas): refetch osm infrastructure with three street
  tiers and stable sort` is unrelated to touch.

What needs human verification:

| Interaction | Code path | Visual verification |
|---|---|---|
| Tap-to-select a building | Existing deck.gl `onClick` handler in `AtlasMap.tsx` | Tap on a building reveals dossier; tap empty area clears |
| Long-press for atelier entry | `d0bd134` long-press handler | Long-press a Lost Flint building goes to /open-flint-atlas/atelier/[parcelId]/[year] |
| Pinch-zoom | MapLibre default | Pinch zooms map within `minZoom` / `maxZoom` (mobile maxZoom is 15.2; desktop is 15.7) |
| Two-finger rotate | MapLibre default | Two-finger rotate adjusts bearing; compass control resets to 0 |

The narrow risk on touch is layering. The `pointer-events-none` on
the chrome `<div>` plus `pointer-events-auto` on the `<header>` and
the dynamic island means touches outside those zones fall through to
the map. This audit reads the code as correct; a human at a phone
should still confirm because gesture handling on iOS Safari has a
history of surprising interactions with overflow scrolling.

## Anti-pattern audits

### `getStaticAtlasPackage` data does not change at mobile

`OpenFlintAtlasScene.tsx` and the methodology page both consume the
same static package regardless of viewport. This is correct: the
dataset is the same, the rendering choices differ. No "mobile-only
mock" exists anywhere in this audit's read path.

### No `?mock=` URL flag exists

Confirmed by `grep -r "?mock" src/`. The CLAUDE.md ban is honored.
`/open-flint-atlas/mobile-candidate/page.tsx` exists but is a
`redirect("/open-flint-atlas?mobile=deck")` — that's a renderer-mode
URL parameter (deck vs three), not a mock-data flag.

### No frontend-held Theseus tokens

`grep -r "THESEUS_API_TOKEN\|RUSTYRED_TOKEN" src/` returns nothing
(only references in docs/plans). The project's service-tier-auth
rule is honored.

## Concrete follow-ups

For the next session (or for Codex, if they want to take these):

1. Install Chrome via `npx playwright install chrome` from this repo,
   then re-run the verification protocol at 320, 360, 375, and
   414px widths. The playwright/playwright MCP tool is connected
   already; only the binary is missing.
2. Test the long-press atelier entry on a real iOS device. The
   600ms threshold + 8px move tolerance is conservative but not
   verified against actual iOS touch latency.
3. Add `env(safe-area-inset-bottom)` to the dynamic island bottom
   inset if iOS notch overlap is observed.
4. After Codex's AtlasMap.tsx paper-grain pass commits, do the
   vignette mask alpha tuning (Task E §2) at both desktop and
   mobile aspect ratios in one motion.
5. Optional: ship a `<meta name="theme-color" content="#f2f1ec">`
   tag to the atlas layout so the iOS browser chrome picks up the
   warm-paper register instead of defaulting to white.

## What this audit did NOT cover

- Performance on a real mid-range phone (the spec's "performance
  budget on mid-range laptops" risk also applies on mobile)
- Reduced-motion handling on mobile specifically (covered in the
  atelier choreographer's reduced-motion path, but not re-verified
  at mobile width here)
- VoiceOver / TalkBack screen reader tour on the dynamic island
- Landscape orientation specifically; the audit assumed portrait
