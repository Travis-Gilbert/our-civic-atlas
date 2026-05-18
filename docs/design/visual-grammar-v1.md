# Our Civic Atlas — Visual Grammar v1

Status: **draft for review**
Supersedes: the prior 14-value `RenderMode` union designed around a review-queue
model. The active product direction is no formal review; trust is shaped by
ACC/ACT credibility math and progressive disclosure.

This document is the foundation that UCA-006 references. Every other UI-bearing
checklist item (UCA-004 basemap and camera, UCA-013 Lost Flint, UCA-015 Civic
Model Studio, UCA-017 live signals, UCA-018 Data Lab, UCA-021 interventions)
points back here for color, encoding, and chrome rules.

## Principles

These principles override individual component decisions when they conflict.

1. **Trust through signals, not gates.** Nothing is gated at submission. ACC/ACT
   credibility math demotes untrustworthy content; TF.js automatically
   disregards NSFW; email is required to post. The UI never shows a "pending
   review" or "approved by moderator" state because that state does not exist.
2. **Map is primary; chrome is minimal.** Every pixel of chrome must earn its
   place. When in doubt, push chrome into the dynamic island instead of adding
   a new panel.
3. **Dynamic island is the universal chrome.** The center island appears on
   desktop and mobile. Compressed, it shows what is in focus. Expanded, it
   becomes the place page (the artifact previously called a "dossier"). No
   side panel, no bottom sheet — the island absorbs that role on both form
   factors. Constraint: never compress so far that it infringes on ease of
   navigation.
4. **Progressive disclosure for everything.** A clean default surface for
   ambient use. Indicators only when confidence drops below the clean
   threshold. Tap any indicator to read the deeper explanation. Tap that
   explanation to see what backs it.
5. **Plain civic language.** No "evidence," "provenance," "epistemic,"
   "advisory signal," "review state," "corroborated," or other research /
   trust-and-safety jargon in visible UI. Internal contracts may keep
   technical names; UI strings must read like a Flint resident would speak.
6. **Time is a first-class navigation dimension.** The current year is the
   default and is invisible. Time-travel is opt-in through search.
7. **Color is never the only signal.** Every state distinguished by color is
   also distinguished by at least one of: shape, material, line style, label,
   position, or animation. WCAG 2.2 AA contrast minimums apply.
8. **Faithful geometry for history.** Historical reconstructions render at the
   highest fidelity the Brush pipeline can produce. Uncertainty is encoded
   through material substitution (see § Confidence in historical
   reconstructions), not through ghost tints layered over real geometry.

## Color tokens

These are proposals. Lock after testing against the basemap palette and
running a color-blindness simulation pass (Deuteranopia, Protanopia,
Tritanopia).

### Confidence palette ("ghost" / porcelain)

Used only for historical reconstructions where part or all of a structure has
low confidence. Material highlights stay near-white; shadows pick up the
teal. The effect reads as porcelain/bisque study model — clearly not the
real material, clearly not a flat tint, still readable as the original form.

| Token | Hex | Role |
|---|---|---|
| `--ghost-highlight` | `#F2F6F7` | Top-lit faces of substituted geometry; near-white with the faintest cool cast |
| `--ghost-mid` | `#D8E5E6` | Midtones; light teal-gray |
| `--ghost-shadow` | `#A8C5C8` | Shadow faces; deeper teal-gray, still pale enough to read against the basemap |

### Confidence indicators (present-day)

These are UI chrome colors, not material colors.

| Token | Hex | Role |
|---|---|---|
| `--confidence-bar-fill` | TBD | The filled portion of the 60–90% progress bar |
| `--confidence-bar-track` | TBD | The unfilled portion |
| `--contested-text` | TBD | The "Contested" label below 60% confidence |

Filling TBD pending the basemap palette pass. The bar must read at small size
without dominating the island.

### Status / chrome colors

Standard atlas chrome (live signal layer, attribution badges, era indicator)
uses the existing brand palette. This document does not respec the brand;
that is a separate decision that already lives in the repo.

## Confidence encoding

Confidence is the system's quantitative read on a record. The UI displays it
in three modes depending on score and content type.

### Present-day records (place pages, civic objects, observations)

| Confidence | UI treatment | Where |
|---|---|---|
| ≥ 90% | No indicator | The clean default |
| 60–89% | Progress bar | Inside the expanded island, not imposing |
| < 60% | "Contested" label | Inside the expanded island, in place of the bar |

Both the progress bar and the "Contested" label are tappable. Tap them to
expand a deeper explanation that names what backs the record and where the
disagreement is. That explanation is the second layer of progressive
disclosure.

### Historical reconstructions (Lost Flint, Brush splat outputs)

Confidence is encoded in the geometry itself. The structure renders with
faithful materials for the portions that are well-documented; less-confident
portions are rendered with the ghost palette as the same material shape.

| Confidence of part | Material treatment |
|---|---|
| ≥ 90% | Faithful material. A brick reads as brick; a wood panel reads as wood panel. |
| 60–89% | Mostly faithful material; some elements (bricks, panels, beams) substituted with the ghost palette. The substituted elements are still the correct shape — the eye reads them as brick/wood/etc., but the porcelain coloring says "we don't know exactly this part." |
| < 60% | Predominantly ghost-palette material. The silhouette is preserved (the building shape reads correctly), but enough faithful material remains to anchor the form. |

The user does not see a number. The amount of porcelain in the building is
the indicator.

The ghost material respects the same lighting and shading as the
surrounding scene. Highlights pick up `--ghost-highlight`; shadows pick up
`--ghost-shadow`. The transition between faithful and ghost material is
per-element (per brick, per panel), not a smooth gradient over the whole
structure.

### Live signal layer

Live-signal entities only surface on the live layer if confidence is high
enough. See § Live signal layer.

### Stale / retracted

These are separate axes from confidence and have their own labels. See §
Stale and retracted data.

## Render modes (revised)

The prior 14-value `RenderMode` union assumed a review queue. Without
review, several modes collapse. Proposed slimmer set:

| Mode | Replaces / consolidates | Meaning |
|---|---|---|
| `current` | `current_confirmed`, `current_low_confidence` | A present-day object. Confidence handled by the bar / Contested label, not by the render mode. |
| `historical` | `vanished_confirmed`, `vanished_inferred`, `brush_reconstruction`, `ifc_semantic_model` | A reconstruction of something that existed in the past. Confidence handled by ghost material amount. |
| `historical_event` | `historical_event` | A point-in-time event placed in geography (a 1936 strike, a 2014 water switch). |
| `public_intervention` | `public_intervention` | A current civic intervention (a new park, a rebuilt school). |
| `community_observation` | `community_observation_pending`, `community_observation_reviewed` | A resident-contributed record. Visibility on the live layer depends on confidence (see § Live signal layer). |
| `disputed` | `disputed_claim` | Multiple sources actively disagree. Renders with the Contested label and lists the disagreeing sources. |
| `proposed` | (new) | Output of the Civic Model Studio — a resident-modeled possible future. Renders at the same fidelity as the present plus a Proposed badge. See § Proposed treatment. |
| `live_signal` | (new) | An entity surfaced on the live signal layer — news, construction, incident. See § Live signal layer. |

Removed: `current_low_confidence` (confidence is now displayed separately,
not as a render mode), `model_prediction` (out of scope until ML output is
explicitly authorized), `source_stale` / `source_high_confidence`
(confidence and freshness handled separately).

This collapse keeps `RenderMode` to 8 values and removes the review-queue
assumption. The existing `RenderMode` type in `src/lib/atlas/contracts.ts`
will need a migration pass.

## Dynamic island as universal chrome

The center island is the canonical UI primitive. It appears in the same
location on both desktop and mobile and shape-shifts based on what is in
focus.

### States

| State | When | Holds |
|---|---|---|
| Compressed (default) | Nothing selected | App identity, search affordance, maybe one ambient indicator (era if not present) |
| Compressed (focus) | A place / object is focused via hover or selection | Object name + minimal metadata |
| Expanded (place page) | The user taps to expand | Full place-page content: name, description, sources, confidence indicator, related links, time scrubber if historical |
| Expanded (search) | Search is active | Search input + results list |
| Expanded (filter) | A layer / time / category filter is being edited | Filter controls |
| Expanded (compose) | The Civic Model Studio is active | Compose / modeling controls (UCA-015 detail) |

Only one expanded state is active at a time. Switching between expanded
states animates through the compressed form.

### Position

The island lives at top-center on both desktop and mobile. On mobile, it
respects the safe area inset for notched devices. On desktop, it floats over
the map with a minimum clear area beneath it for the time scrubber and
secondary chrome.

### What the island does NOT absorb

Some things should not live inside the island, because they would infringe
on ease of navigation:

- Zoom controls (lower-right on desktop, gestural on mobile)
- Map attribution (lower-right corner, small)
- Layer-on / layer-off toggles (separate small chrome, not in the island)
- Persistent live-signal feed (those are on the map directly as icons; the
  island holds the focused signal's details when tapped)

### Migration note

The existing `mainline-island-port` screenshots show the island at compressed
and expanded states on desktop and mobile dossier on mobile. Those are the
visual baseline. Refer to:

- `docs/visual-evidence/mainline-island-port/mainline-island-desktop.png`
- `docs/visual-evidence/mainline-island-port/mainline-island-desktop-expanded.png`
- `docs/visual-evidence/mainline-island-port/mainline-island-desktop-expanded-v2.png`
- `docs/visual-evidence/mainline-island-port/mainline-island-mobile-dossier.png`

The visual grammar consolidates around that pattern rather than introducing
a new chrome shape.

## Year handling

Time is a search input. There is no persistent year HUD.

### Input

- The search bar (already part of the island) accepts a four-digit year:
  `1925` → the map renders 1925.
- The search bar also accepts a year range: `1900-1950` → the map shows
  records that overlap that range. (Stretch; lock in v1.1 if needed.)
- Search history retains recent year jumps so the user can return.

### Display

- When the active year is the present, the island shows no year. This is the
  clean default.
- When the active year is anything else, the island holds the year as
  metadata in the compressed state. The user always knows what era they are
  in by glancing at the island.

### Per-object time-travel

When the user has a specific object focused (hover or tap) and the system
has prior-state records for that geographic position, the expanded island
offers a "jump to year X" affordance. Picking that jump moves the entire
map to that year, not just the focused object.

### Why this works

The user never has to learn a separate time control. Search is the
universal "where am I" mechanism on the map. Adding "when" to that same
mechanism keeps the chrome simple and the mental model consistent.

## Live signal layer

The live signal layer is a separate ambient layer over the map. It is the
geographic equivalent of a newspaper — events placed where they happened.

### What surfaces

| Source | Threshold | Icon |
|---|---|---|
| Credible news outlet (per source registry) | Surfaces immediately | Newspaper icon at the story's location |
| Construction permit / city work record | Surfaces immediately | Construction sign icon at the location |
| 311 incident / city safety alert | Surfaces immediately | Incident pin at the location |
| Resident contribution | Surfaces only if confidence ≥ 60% | Resident-marked icon (TBD; lock during UCA-017 work) |

Resident contributions below 60% confidence do not appear on the live
layer at all. They remain reachable through search and through the affected
place page, but they do not float on the live layer.

### Timestamps

Every live-signal entity carries a timestamp. The expanded view shows the
exact time; the compressed view shows relative time ("2 hours ago", "today",
"yesterday") for ambient glanceability.

### Decay

Live-signal entities fade off the live layer as their relevance decays.
"Relevance" is an ACC concept; the layer asks ACC for the current relevance
score for each signal. When the score drops below a layer threshold, the
icon disappears from the live layer but the record remains in its full
history.

### What this is not

- It is not push notifications.
- It is not a feed the user scrolls.
- It is not user-following or personalized.
- It is a spatial overlay; the user discovers what is happening by looking
  at the map.

## Proposed treatment (Civic Model Studio output)

Civic Model Studio outputs render at the same fidelity as present-day
geometry. They are not sketches; they are professional models. The
differentiator is metadata, not material.

| Aspect | Treatment |
|---|---|
| Geometry | Full fidelity. A proposed bike lane reads as real asphalt and paint. |
| Default visibility | User-private. The creator sees their own proposals. |
| Public visibility | Opt-in by the creator (share); opt-in by the viewer (enable the proposed layer). |
| Badge | A small Proposed badge floats near the object. Tappable. |
| Attribution | The creator may attach a signature: a name, an avatar, or a link to more information. The signature is customizable per-proposal. |
| Conflicting proposals | When multiple proposals occupy the same geography, the proposed layer renders one at a time. The viewer can cycle through proposals via the expanded island. (Detail belongs to UCA-015 spec.) |
| Future-year context | If the proposal's intended year is in the future, the year indicator in the island reflects the future year while the proposal is in view. |

## Stale and retracted data

Confidence is one axis; freshness is another. The ACC algorithm handles
both, but they are surfaced separately in the UI.

| Status | When | Label |
|---|---|---|
| Active | The record is current and the data behind it is in date | (no label) |
| Outdated | The record is no longer accurate; ACC's freshness term has decayed it past the relevance threshold for this record type | "Outdated" badge in the expanded island |
| Retracted | The record has been actively disproven by a newer source or by retraction from the original source | "Retracted" badge in the expanded island, with link to what replaced or disproved it |

"Outdated" is the default for genuine staleness. "Retracted" requires an
actively contradicting source — it is the stronger statement. Not every old
record is outdated; some facts are perennial. ACC's per-record-type
freshness curve decides which is which.

## Jargon → civic language

UI strings replace these technical terms with civic alternatives:

| Avoid in UI | Use in UI |
|---|---|
| evidence | sources, what backs this |
| provenance | where this came from, history of this record |
| epistemic | (delete; no civic substitute) |
| review state | status |
| corroborated | confirmed by other sources |
| conflicts_with_official_source | disagrees with official records |
| reviewer_summary | summary |
| advisory signal | (internal only; never expose) |
| ACC / ACT | (internal only; never expose) |
| TF.js | (internal only; never expose) |
| claim | statement (proposed; revisit if a place-page card needs it) |
| dossier | place page (or just the expanded island; the word "dossier" can retire from user-facing copy) |
| primitive | building element, feature |
| manifest | catalog, list (when user-facing); manifest stays only in developer docs |

Internal contracts (`contracts.ts`, schema JSON) keep their technical names
because the audience is developers. User-facing strings — page copy,
button labels, tooltips, badges, error messages — use the civic
alternatives.

## Accessibility

- Every encoding state must pass WCAG 2.2 AA contrast against the basemap
  and any text label sitting near it.
- Color blindness simulation pass (Deuteranopia, Protanopia, Tritanopia)
  required before locking the ghost palette and the confidence bar colors.
- Every state distinguished by color is also distinguished by at least one
  of: shape, material, line style, label, position, animation.
- The expanded island must be reachable by keyboard on desktop and by
  screen-reader gesture on mobile.
- The Year input accepts numeric typing; the assistive label reads "Year"
  not "Era" or "Time period."
- Reduced motion: the island shape-shift between compressed and expanded
  uses motion that respects `prefers-reduced-motion`. Reduced-motion
  fallback is an instant state change.

## What this document does not cover

These are reserved for other UCA items:

- The full place-page content shape (UCA-012)
- Lost Flint temporal scrubber UX detail (UCA-013)
- Civic Model Studio editing tools (UCA-015)
- GeoComment placement and moderation visibility (UCA-016)
- Live signal icon library (UCA-017)
- Data Lab analysis cards (UCA-018)
- Intervention / safety public surfaces (UCA-021)
- The brand palette for chrome colors beyond the ghost palette (separate
  decision)

Each of those items references this document for color, encoding, and
chrome rules. None of those items decide rules that contradict this
document without an explicit revision here first.

## Acceptance for UCA-006 to move from "partial" to "done"

- [ ] Ghost palette tokens locked after basemap-pass and color-blind sim
- [ ] Confidence bar / Contested label tokens locked
- [ ] `RenderMode` collapsed from 14 to 8 in `src/lib/atlas/contracts.ts`
- [ ] Jargon → civic language map applied to current public route copy
- [ ] Dynamic island state machine documented in code as a typed contract
- [ ] Year search input wired through the search bar
- [ ] Island year metadata displays when active year ≠ present
- [ ] Per-object "jump to year X" affordance lives in the expanded island
- [ ] Live signal layer has a credibility-gated visibility rule
- [ ] Outdated / Retracted badges have token + placement spec
- [ ] WCAG 2.2 AA contrast verified on every new encoded state
- [ ] Reduced-motion fallback on island shape-shift

## Validation

These checks belong in the release checklist (`docs/public-package/RELEASE-CHECKLIST.md`):

- Token contrast pass against basemap
- Color-blind simulation pass
- Reduced-motion fallback verified
- Jargon scan of user-facing strings (script TBD — could grep for the banned
  terms in `src/app/**/*.tsx` and `src/components/**/*.tsx`)
- Island state machine has a typed contract in `contracts.ts`
- Every new state has a screenshot in `docs/visual-evidence/`

## Related documents

- `docs/plans/our-civic-atlas-north-star-execution-plan.md` — UCA-006 sits here
- `docs/public-package/READ-MODELS.md` — format and role rules feed render modes
- `docs/public-package/SPATIAL-RUNTIME.md` — H3 indexing and Rusty Red hot-state
- `docs/public-package/SCENE-FOUNDRY.md` — Brush / USD / GLB output pipeline
  for the historical reconstructions described here
- `docs/public-package/CONTRIBUTION-BACKEND.md` — typed shape of community
  observations referenced by `community_observation` render mode
- `docs/public-package/OBSERVABILITY.md` — `runtime.*` and `submission.*`
  events should respect the same jargon ban; this document is the
  source of truth for the language
- `docs/public-package/RELEASE-CHECKLIST.md` — visual gates that reference
  this grammar
