# Reconstruction Engine visual register (blueprint redesign)

Supersedes `atelier-visual-register-proposal.md` for the surface layer. Locked
direction (user-approved 2026-06-12): the surface moves from the original warm
graphite paper into the Observable cool family that the rest of the atlas runs,
one step darker, with an architect's blueprint grid. The building material layer
(ghost porcelain, `GHOST_PALETTE`) is unchanged. The route and display copy
rename from "Atelier" to "Reconstruction Engine" (copy + route scope).

## Why

The original atelier deliberately inverted the surface to warm dark graphite to
read as a museum pedestal. The new direction wants the Reconstruction Engine to
read as a drafting table that belongs to the same family as the atlas, not as a
foreign dark room: same Observable cool palette, a notch darker, with a blueprint
grid that signals "construction, in progress, provenance-marked."

## Surface tokens (slightly darker than the Observable cool register)

The atlas runs pure white `#ffffff` surface, near-black `#1c1c1c` ink, navy
`#005186` action. The engine takes the same family one step deeper:

| Token | Value | Role |
|---|---|---|
| `--atelier-paper` | `#e6ebf1` | Drafting-table ground (cool gray, darker than atlas white) |
| `--atelier-paper-glow` | `#f4f7fb` | Elevated panels: dossier, chrome, cards (lift toward white) |
| `--atelier-paper-deep` | `#d7dee7` | Recessed surfaces |
| `--atelier-ink` | `#1c1c1c` | Content text (same near-black as the atlas) |
| `--atelier-ink-soft` | `#38414f` | Body text (cool dark gray) |
| `--atelier-ink-mute` | `#5d6877` | Labels, captions |
| `--atelier-ink-faint` | `#93a0b0` | Tertiary |
| `--atelier-rule` | `rgba(28,40,60,0.16)` | Dividers |
| `--atelier-rule-soft` | `rgba(28,40,60,0.08)` | Hairlines |

## Blueprint grid

Blue ruling on the cool ground, applied as a CSS background layer on
`.atelier-surface` so chrome and the table read as drafting paper. The R3F scene
keeps its own 3D ground grid via the same `--atelier-grid*` tokens, repointed to
blueprint blue.

| Token | Value | Role |
|---|---|---|
| `--atelier-grid` | `#6f8db5` | Major rule color (blueprint blue) |
| `--atelier-grid-soft` | `#a6bcd8` | Minor rule color |
| `--atelier-grid-line-minor` | `rgba(111,141,181,0.16)` | CSS minor line |
| `--atelier-grid-line-major` | `rgba(111,141,181,0.30)` | CSS major line |
| `--atelier-grid-cell` | `24px` | Minor spacing |
| `--atelier-grid-major-cell` | `120px` | Major spacing (every 5) |

## Accents: navy action, redline disagreement

Navy is the single most important action per screen (matches the atlas). Conflict
markers and provenance annotation stay a warm redline, which is both the spec's
"architect's pen" and a literal blueprint-redline convention, and is a retained
data-semantic (disagreement), not decoration.

| Token | Value | Role |
|---|---|---|
| `--atelier-accent` | `#005186` | Primary action (save), navy |
| `--atelier-accent-soft` | `#2f79ad` | Navy hover |
| `--atelier-redline` | `#b5482f` | Conflict markers, provenance lines |

## Source cards and dossier

White index cards on the blueprint table; light dossier panel; dark ink. Card
shadows lighten for the light ground.

## Unchanged

- `GHOST_PALETTE` (building material) and the confidence shader.
- The 8-stage choreography, timings, reduced-motion and forced-colors gates.
- The `.atelier-theme` scope class and `--atelier-*` token names (only values
  change), so no per-component CSS edits are needed.
