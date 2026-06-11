# Civic Atlas sidebar adaptation

Decision record for `src/components/atlas/CivicAtlasSidebar.tsx`, the
two-level left sidebar on `/open-flint-atlas`. Date: 2026-06-11.

## Source component

The Theseus reference sidebar at
`Index-API/Theseus/Sidebar component.md` (a Figma-exported
"Interfaces" two-level sidebar: icon nav rail + detail panel with
collapsible sections, dark neutral-950/black register, Lexend type,
`@carbon/icons-react`). Kept from the reference: the two-level
interaction, the collapse-to-rail behavior, the expandable detail
items, and the soft spring easing `cubic-bezier(0.25, 1.1, 0.4, 1)`
(500ms) on every transition. Dropped: the fixed `h-[800px]` frame
(now `h-full` via `inset-y-0` absolute placement), the fake dashboard
content, the avatar/footer chrome, and the "Interfaces" brand SVG.

## Register inversion (dark to Observable cool)

All chrome states live in `atlas.css` under `.atlas-sidebar-*`, on
tokens, never hardcoded grays:

| Reference (dark)                  | Atlas (Observable cool)                                        |
| --------------------------------- | -------------------------------------------------------------- |
| `bg-black` / `bg-[#1a1a1a]`       | paper glass: `color-mix(var(--ctx-paper) 88%/82%, transparent)` plus the scene's 12px blur |
| `border-neutral-800`              | hairline `rgba(28, 28, 28, 0.1)` / `var(--ctx-rule)`           |
| `text-neutral-50` / `-300`        | `var(--ctx-ink)` / `var(--ctx-ink-soft)` / `var(--ctx-ink-mute)` |
| `hover:bg-neutral-800`            | the atlas soft fill `rgba(28, 28, 28, 0.06)`                   |
| active item filled `bg-neutral-800` pill | hairline border + navy left edge (`inset 2px 0 0 var(--ctx-accent)`) + navy glyph, styled off `[aria-current="true"]` |
| `font-['Lexend...']` literals     | removed; IBM Plex Sans inherits globally, kickers use the atlas mono convention (`font-mono text-[10px] uppercase tracking-[0.14em]`, ink-mute), the panel title uses `.font-display` |
| `placeholder:text-neutral-400`    | `var(--ctx-ink-faint)` (the placeholder tier per the token comments) |

Navy stays the single action color: only the active rail item and the
search focus border carry `--ctx-accent`. Commit purple is untouched;
per the atlas.css masthead comment, navigation to the contribute flow
is not an in-flow write, so the Research links stay quiet rows. The
eye toggle's "on" state uses a navy soft fill
(`color-mix(var(--ctx-accent) 10%, transparent)`) instead of the
retired warm rgba still hardcoded inside ControlDossier.

## Icon substitutions (@carbon/icons-react to lucide-react)

No new dependency; lucide-react 1.14.0 was already installed.

| Reference (Carbon)        | Sidebar (lucide)                  | Use                       |
| ------------------------- | --------------------------------- | ------------------------- |
| `Dashboard`               | `Map`                             | Atlas rail item           |
| `Folder` / `Task`         | `Layers3`                         | Layers rail item          |
| (none)                    | `MapPin`                          | Places rail item          |
| `Calendar`                | `CalendarDays`                    | Events rail item          |
| (none)                    | `Landmark`                        | Reconstructions rail item |
| (none)                    | `Music`                           | PorchFest rail item       |
| `Analytics`               | `FlaskConical`                    | Research rail item        |
| `Search`                  | `Search`                          | Search input              |
| `ChevronDown`             | `ChevronDown`                     | Collapsible chevron       |
| (rotated chevron)         | `PanelLeftClose` / `PanelLeftOpen`| Collapse and expand       |
| (none)                    | `Eye` / `EyeOff`, `ArrowUpRight`  | Layer toggles, link rows  |

The "Interfaces" logo paths were dropped; the brand badge is the
planner's "Our Civic Atlas" kicker treatment over a `.font-display`
"Flint Atlas" title, with a 10px mono "OCA" mark on the rail while
collapsed.

## Where ControlDossier functionality landed

`ControlDossier.tsx` stays on disk and keeps its single
implementation; nothing was reimplemented.

- Layers section (sidebar default): composes `<ControlDossier/>` with
  the exact presets/visibility/onToggle/defaultOpenId the scene
  passed before. Every preset control survives: eye toggles, the
  places type filter, the urban design material mode select (live
  state), building fabric and OSM notes, the events resolution
  select, ward style select, infrastructure categories, the embedded
  `TrafficFlowPanel`, and the buildable envelope legend chips. The
  panel neutralizes the dossier's floating card chrome the same way
  the island's Layers tab did.
- Places and Events sections: civic counts plus contextual eye
  toggles (places, wards, events, traffic) that call the same
  scene-owned `handleLayerChange`.
- Reconstructions: the Lost Flint fixture list with Atelier deep
  links (`buildAtelierHref` + `resolveAtelierEntryYear`, honoring the
  active time-travel year) and the canonical Atelier entry.
- PorchFest and Research: `next/link` rows to `/porchfest`,
  `/porchfest/workspace`, `/porchfest/apply`,
  `/open-flint-atlas/methodology`, `/sources`, `/contribute`.
- Search input filters the active section's rows client-side (simple
  includes), including the embedded preset rack by preset name.
- Mobile (under 768px): the sidebar is `hidden md:flex`; the scene
  keeps feeding the dynamic island's Layers tab the ControlDossier,
  because the atlas hides desktop panels there and the island is the
  only mobile control surface. On md+ the island tab drops the rack
  (no duplication) but keeps its lens/camera controls.
- Scenario and traffic island tabs are untouched; they were never
  ControlDossier content.

## Mount

`OpenFlintAtlasScene.tsx` renders the sidebar absolutely over the map
column (`inset-y-0 left-0`, full height, `z-index` 1405 above the
chrome root). `AtlasSceneChrome`'s top strip starts at `left-[72px]`
so the 56px rail never covers the wordmark while collapsed; the
mobile media block still overrides it to 12px under 768px.
