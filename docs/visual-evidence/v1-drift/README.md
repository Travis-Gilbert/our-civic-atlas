# V1 Drift Visual Evidence

Captured on 2026-05-14 and 2026-05-15 from the local dev server at `http://localhost:3000`.

| Evidence ID | Route | Viewport | Renderer | File | Result |
|---|---|---:|---|---|---|
| VEL-001A | `/open-flint-atlas` | 1440 x 900 | MapLibre/deck.gl | `open-flint-atlas-baseline-desktop.png` | Baseline desktop path mounted and remains the public default. |
| VEL-001B | `/open-flint-atlas?renderer=scene` | 1440 x 900 | R3F/Three | `open-flint-atlas-r3f-desktop.png` | R3F desktop prototype mounted with 222 places and 7 events, but did not meet the visual parity gate. |
| VEL-001C | `/open-flint-atlas?renderer=scene` | 1440 x 900 | R3F/Three | `open-flint-atlas-r3f-ward-mesh-desktop.png` | R3F renders real ward outlines and light fills from GeoJSON. Runtime improved; product parity still partial. |
| VEL-001D | `/open-flint-atlas?renderer=scene` | 1440 x 900 | R3F/Three | `open-flint-atlas-r3f-base-layer-desktop.png` | R3F adds bounded civic ground, park polygons, corridor/city anchors, and tokenized materials. Product parity still partial. |
| VEL-001E | `/open-flint-atlas?renderer=scene` | 1440 x 900 | R3F/Three | `open-flint-atlas-r3f-lod-instanced-desktop.png` | R3F adds view/mobile LOD policy plus instanced place/event markers. Runtime improved; product parity still partial. |
| VEL-001F | `/open-flint-atlas?renderer=scene` | 1440 x 900 | R3F/Three | `open-flint-atlas-r3f-lod-telemetry-desktop.png` | R3F adds camera-distance LOD bands, DOM telemetry, and label collision. Runtime improved; product parity still partial. |
| VEL-001G | `/open-flint-atlas?renderer=scene` | 1440 x 900 | R3F/Three | `open-flint-atlas-r3f-terrain-water-desktop.png` | R3F keeps the light outside-world edge treatment and source-backed water-infrastructure anchor. Runtime improved; product parity still partial. |
| VEL-001H | `/open-flint-atlas?renderer=scene` | 1440 x 900 | R3F/Three | `open-flint-atlas-r3f-horizon-desktop.png` | Desktop Node Horizon now reads as a compact compass field with a distant-atlas mental model instead of a full right-rail dossier. |
| VEL-001I | `/open-flint-atlas?renderer=scene` | 1440 x 900 | R3F/Three | `open-flint-atlas-r3f-island-desktop.png` | Desktop scene chrome now compresses focus, navigation, dossier, and horizon context into the Dynamic Island while removing the duplicate right-side horizon rail. |
| VEL-002A | `/open-flint-atlas` | 390 x 844 | Leaflet | `open-flint-atlas-baseline-mobile.png` | Baseline mobile path mounted and remains the public default. |
| VEL-002B | `/open-flint-atlas?renderer=scene` | 390 x 844 | R3F/Three | `open-flint-atlas-r3f-mobile.png` | R3F mobile prototype mounted, but did not meet the visual parity gate. |
| VEL-002C | `/open-flint-atlas?renderer=scene` | 390 x 844 | R3F/Three | `open-flint-atlas-r3f-ward-mesh-mobile.png` | R3F mobile renders real ward outlines with no visible chrome overlap. |
| VEL-002D | `/open-flint-atlas?renderer=scene` | 390 x 844 | R3F/Three | `open-flint-atlas-r3f-base-layer-mobile.png` | R3F mobile keeps the opt-in scene readable with non-selected labels suppressed. Product parity still partial. |
| VEL-002E | `/open-flint-atlas?renderer=scene` | 390 x 844 | R3F/Three | `open-flint-atlas-r3f-lod-instanced-mobile.png` | R3F mobile uses lower DPR and stricter labels/limits from the LOD policy. Runtime improved; product parity still partial. |
| VEL-002F | `/open-flint-atlas?renderer=scene` | 390 x 844 | R3F/Three | `open-flint-atlas-r3f-lod-telemetry-mobile.png` | R3F mobile keeps the camera-distance/detail policy and batched markers without reintroducing label crowding. Runtime improved; product parity still partial. |
| VEL-002G | `/open-flint-atlas?renderer=scene` | 390 x 844 | R3F/Three | `open-flint-atlas-r3f-terrain-water-mobile.png` | R3F mobile keeps the terrain/base-layer slice readable without reintroducing labels or chrome overlap. Runtime improved; product parity still partial. |
| VEL-002H | `/open-flint-atlas?renderer=scene` | 390 x 844 | R3F/Three | `open-flint-atlas-r3f-horizon-mobile.png` | Mobile scene exposes a Horizon trigger and bottom-sheet preview instead of forcing the old right-rail node list into the narrow viewport. |
| VEL-002I | `/open-flint-atlas?renderer=scene` | 390 x 844 | R3F/Three | `open-flint-atlas-r3f-island-mobile.png` | Mobile scene now uses a search-first top rail plus Dynamic Island entry for navigation and context without reintroducing chrome overlap. |
| VEL-003A | `/open-flint-atlas/sources` | 1440 x 900 | Registry route | `open-flint-atlas-sources-desktop.png` | Sources route now opens as a scan-first registry with visible filters, public-use status, and selected-source detail. |
| VEL-003B | `/open-flint-atlas/sources` | 390 x 844 | Registry route | `open-flint-atlas-sources-mobile.png` | Mobile stacks the registry intro and metrics without overlap; filters and list remain reachable below the fold. |

## Runtime Observations

- `npm run typecheck`, `npm run lint`, `npm run validate:atlas`, and `npm run build` passed.
- Playwright reported no console errors.
- Playwright reported one warning from the Three/R3F stack: `THREE.Clock` is deprecated and should eventually move to `THREE.Timer` when the dependency path supports it.
- R3F was demoted to an opt-in prototype because it rendered centroid columns on a synthetic plane instead of the live boundary/ward geometry and cartographic detail.
- R3F now has a first real-geometry slice: shared projection, GeoJSON ward outlines, light ward fills, and view-specific ward labels.
- R3F now has a second quality slice: tokenized scene materials, park polygon anchors, city/corridor anchor markers, a bounded civic base, Drei `Preload`, and mobile label suppression.
- R3F now has a third quality slice: camera-distance/mobile LOD policy, instanced place markers, instanced event stems/heads, instanced source halos, shared deck.gl layer IDs, renderer bridge metadata, and typed SceneManifest/Brush placeholder contracts.
- R3F scene mode now exposes a non-visible runtime smoke surface through `data-atlas-*` attributes and an accessibility region label. Playwright snapshot saw `ward` detail with `4` place markers and `6` event markers in the desktop oblique view.
- Default Oblique suppresses persistent ward labels; ward labels remain available for the flat Atlas view or selected state. Central anchor labels are collision-filtered to avoid the previous stacked label cluster.
- The terrain/base-layer slice keeps the light edge veil and adds only source-backed water-infrastructure anchors. The fixture still has no river/creek geometry, so water/corridor work remains partial rather than invented.
- DRIFT-005 / GAP-005 now render Node Horizon as a spatial field instead of a full metadata rail: direction-aware distant atlas surfaces appear in the R3F scene, and the scene chrome now reaches horizon context through the Dynamic Island instead of a persistent side dossier.
- GAP-004 picked up a mobile/desktop chrome-compression slice: search remains the top entry point, while focus, navigation, dossier, and horizon context now live behind the Dynamic Island.
- GAP-006 copy pass changed visible dossier/object/scene/methodology language from confidence-as-truth-meter toward support, progress, review, and source-support wording. Internal fixture and schema fields still use confidence names.
- GAP-007 replaces the equal-card Sources route with a scan-first registry: native search/select controls, visible public-use plus freshness status, and a sticky selected-source detail panel backed by fixture-derived object/event/place usage counts.
- Playwright route smoke and accessibility snapshot confirm the `/sources` route exposes a native searchbox, five filter comboboxes, a clear-filters button, and per-row source buttons for keyboard reachability.
- A darker outside-world veil attempt failed the screenshot gate and was removed from the runtime slice; outside-world masking remains a planned/partial item.
- The public Evidence route is removed from route smoke and returns `404`; support/progress evidence should surface through selected-object and source workflows instead.
- Product complete remains blocked until target/reference screenshots and broader source, contribution, and accessibility states are captured.
