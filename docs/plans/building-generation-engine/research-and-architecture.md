# Building Generation Engine: research and architecture

Status: research complete, build not started. Produced under `/research-first`;
every external claim is cited, every codebase claim was grepped/read in the
local working trees (more current than GitHub for repos under active edit).

## The problem this solves

The Atelier renders a reconstruction as a parametric box extruded from four
fields (`footprint`, `heightMeters`, `roofForm`, `confidence`). No amount of
extra evidence changes the *kind* of thing it produces, because the output
vocabulary is "box + roof form". The just-shipped `AtelierProceduralHouse`
prototype (src/components/atlas/atelier/AtelierProceduralHouse.tsx) proved the
first rung up: a rule-based grammar reads the same record and composes a
recognizable 1885 gable-front frame house (steep overhanging roof, porch,
chimney, trimmed window grid), parameterized so a 3-storey/5-bay record yields a
3-storey/5-bay house. This doc plans the full engine behind that.

## Verified state of OUR system (Lane 3, local greps/reads)

1. The asset contract already anticipates BOTH tracks. `docs/design/flint-graphql-schema-v1.graphql`:
   - `enum GeometryFormat { GLB GLTF PLY SPLAT USD USDZ }` (line 126). GLB/GLTF =
     procedural output; PLY = photogrammetry point cloud; SPLAT = 3D Gaussian
     Splatting. The contract was designed for procedural AND capture outputs.
   - reconstruction carries `geometryUrl`, `geometryFormat`, `foundryAssetUrl`
     (lines 294-297).
2. The deck.gl atlas map ALREADY renders GLB/GLTF assets via `ScenegraphLayer`
   when `geometry_url` ends in `.glb`/`.gltf` (`src/components/atlas/AtlasLostFlintDeckLayer.ts:442`,
   `src/lib/atlas/historical-reconstruction.ts:80-88`, which also documents the
   asset path convention `public/atlas/historical/<slug>/<file>.glb`).
3. The procedural building SPEC vocabulary EXISTS and is wired (live on the map):
   `src/lib/atlas/building-fabric.ts` produces a `BuildingFabricSpec` with
   `archetype` + `params` (stories, roof_pitch_degrees, cornice_height_m,
   window_spacing_m, facade_color, roof_material) from a height-priors catalog,
   plus `glb_uri: s3://civic-atlas/fabric/<params_hash>.glb`, `glb_sha256`, and
   `glb_status: "pending_offline_generation"`. It is imported by `AtlasMap.tsx`,
   `AtlasArchetypeMeshLayer.ts`, `urban-design-model.ts`, `renderer-bridge.ts`,
   `procedural-archetype-meshes.ts`. So the grammar's parameter model is partly
   built; the spec->GLB bake is the explicit unbuilt step.
4. The Atelier R3F scene does NOT consume `geometryUrl` (renders the box). Grep
   for `useGLTF`/`GLTFLoader`/`geometryUrl` in the atelier tree returns nothing.
5. Backend reconstruction lives in `Index-API/apps/notebook/scene_os/`
   (`resolvers/reconstruction_scene.py`, `catalogs.py`, `atoms.py`,
   `api/scene_os.py`) and the local Axum repo `our-civic-atlas-backend`.
6. The dossier surfaces `Material`/`Color`/`Bays`/`Use` as `PartUndocumented`
   placeholders (`AtelierDossierPanel.tsx:259-295`): the backend does not yet
   populate the richer attributes a grammar wants.

Reframe: "more powerful engine" is mostly COMPLETING anticipated infrastructure
(spec->GLB bake + Atelier asset-load + richer backend attributes), not
greenfield.

## Verified state of the TECHNIQUES (Lane 4, web, cited)

### Track A: procedural grammar -> GLB (the default)

- CityEngine 2025.1 (Esri, commercial): mature CGA shape grammars, and a NEW
  Python 3 API for automated/headless workflows, exports glTF. Industry standard
  for procedural cities.
  https://doc.arcgis.com/en/cityengine/latest/whats-new/cityengine-whats-new.htm ,
  https://digitalproduction.com/2025/12/11/cityengine-2025-1-expands-cga-geometry-tools-and-introduces-python-3-api/
- Blender Geometry Nodes + Python (free, headless-scriptable, glTF export): can
  generate procedural buildings end to end; mature open path drivable from a
  worker. https://cgcookie.com/courses/bcity-building-a-procedural-city-generator-with-geometry-nodes ,
  commercial addon https://coan.gumroad.com/l/buildinggen
- ShapeML: open rule/grammar procedural 3D framework (CGA-like, no Esri license).
- Code-first: the R3F prototype already encodes a working grammar; it can either
  stay a live preview or be ported to a headless three.js + glTF exporter.

Assessment: deterministic, explainable, every feature traces to a rule + source.
Fits the confidence/provenance ethos. Best fit for a Django/worker backend:
Blender headless Python (free, runs on Modal/Railway, glTF export), OR keep the
code grammar and bake glTF from it. CityEngine is the most capable but adds an
Esri license + desktop-oriented tooling.

### Track B: photogrammetry / capture -> PLY/SPLAT (where photos survive)

- Classical photogrammetry (COLMAP, Meshroom/AliceVision, Metashape,
  RealityCapture/ContextCapture) needs MANY overlapping photos with feature
  matches; it "struggles with sparse features, large baselines, or a limited
  number of input images" and "may fail to obtain accurate poses" on few/wide
  views. https://peterfalkingham.com/2017/04/04/photogrammetry-testing-8-colmap/ ,
  https://towardsdatascience.com/master-the-3d-reconstruction-process-step-by-step-guide/
- Few-view frontier: emerging NeRF/3DGS methods target 3-6 (sometimes 2) unposed
  images (HiSplat is two-view). https://arxiv.org/pdf/2410.06245 (HiSplat),
  https://arxiv.org/pdf/2408.16690 (pose probes few-shot)
- 3D Gaussian Splatting sparse/single-view (2025): the dominant research input is
  now single/sparse images, but "the most challenging scenario is reconstruction
  from a single input image", 3DGS "overfits a limited set of Gaussian
  primitives", and unobserved regions are the core failure. Mitigations add depth
  priors / structure-aware masks (GC-HG, AugGS, D2GS) but do not eliminate the
  problem. https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1709229/full ,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12117079/ , https://arxiv.org/pdf/2408.04831
- Single-image generative -> 3D (2025-2026): TRELLIS.2 (Microsoft) is SOTA:
  image->3D with PBR from one photo, 512^3 in ~3s on H100, sharp edges + clean
  topology, best at hard-surface (buildings). TripoSR is fast but lower quality;
  InstantMesh comparable tier; Hunyuan3D 3.0 the high-res flagship. Common
  failure: "looks fine at a distance but falls apart up close".
  https://www.apatero.com/blog/trellis-2-comfyui-image-to-3d-complete-guide-2025 ,
  https://www.3daistudio.com/blog/best-3d-model-generation-apis-2026 ,
  https://www.triposrai.com/

The civic-truth crux (verified, not assumed): single-image generative and
single-view 3DGS both INVENT the sides/back not in the photo. For a tool whose
identity is honesty + confidence + provenance, an asset that looks authoritative
and is mostly fabricated is the worst failure mode. A demolished 1885 house
typically has zero to one surviving photo: exactly the regime where classical
photogrammetry fails and only the hallucinating methods "work".

## Recommended architecture

A single asset slot (`geometryUrl` + `geometryFormat`), three producers, one
honesty rule, and a render cascade.

### The render cascade (frontend, the immediate unlock)

In the Atelier, replace "always box" with:

1. `geometryUrl` present + format GLB/GLTF -> load via drei `useGLTF` (R3F).
2. format SPLAT -> a Gaussian-splat renderer (e.g. a three.js splat lib; NOT
   covered by deck.gl's ScenegraphLayer, needs an R3F loader).
3. format PLY -> `PLYLoader` point cloud.
4. no asset, pitched roof -> the `AtelierProceduralHouse` grammar (live, in-repo).
5. no asset, flat roof / unknown -> the existing parametric box.

This makes the box the honest empty state at the bottom of a ladder, and lets
any producer light up the same surface.

### Producer 1: procedural grammar -> GLB (default, build first)

Complete the `building-fabric` `pending_offline_generation` step. A headless
generator (Blender Python on a Modal/Railway worker, or a headless three.js
glTF exporter reusing the prototype's grammar) consumes `BuildingFabricParams`
+ era/style, emits a GLB to `s3://civic-atlas/fabric/<hash>.glb`, sets
`glb_sha256` + `glb_status` and the reconstruction's `geometryUrl`. Deterministic
+ cacheable by `params_hash`. Requires the backend to populate the currently
`PartUndocumented` attributes (material, bays, use, storeys, style) from Sanborn
+ assessment + typology so the grammar has signal.

### Producer 2: capture -> PLY/SPLAT (premium, where photos survive)

- 3+ overlapping photos: classical photogrammetry (Meshroom/COLMAP) -> PLY/GLB.
- 2-6 photos: few-view 3DGS (HiSplat-class) -> SPLAT.
- This is the gold standard precisely because it is derived from the real
  structure; gate it on "enough real images exist", which will be rare.

### Producer 3: single-image generative (speculative, guard-railed, NOT default)

Use TRELLIS.2-class only where a single facade photo exists and only with the
honesty guardrail below. Never the default; never unmarked.

### The honesty guardrail (what makes this defensible for a civic tool)

Every asset carries per-part provenance/confidence (the project already has
per-part confidence + the GHOST porcelain register + conflict markers). The
renderer shades EVIDENCED parts solid and GENERATED/INFERRED parts ghosted
(lower opacity / dashed / the existing low-confidence treatment). So:

- A grammar house: the documented facade is solid; inferred sides/roof are
  ghosted to whatever confidence the rules assign.
- A single-image generative mesh: only the photographed facade reads as solid;
  the invented back/sides render as explicitly speculative.

This converts the hallucination problem from a liability into the product's
signature: the model shows you exactly how much it knows vs guesses. It reuses
existing confidence infrastructure rather than inventing new.

## Phasing (no time estimates; ordered by dependency and payoff)

1. Frontend cascade: Atelier loads `geometryUrl` (GLB via useGLTF) with the
   grammar prototype + box as fallbacks. Smallest change, unlocks every producer.
2. Producer 1 bake: headless grammar -> GLB generator filling the
   `pending_offline_generation` slot; cache by `params_hash`.
3. Backend attributes: populate material/bays/use/storeys/style (kill the
   `PartUndocumented` placeholders) so the grammar gets real signal; extend the
   grammar archetypes (storefront, multi-family, civic) beyond the house.
4. Honesty guardrail: per-part confidence -> ghosted rendering on generated parts
   (R3F material treatment), shared by all producers.
5. Capture track: SPLAT/PLY R3F loaders + a few-view/photogrammetry ingestion job,
   gated on surviving photos.
6. Generative track LAST and guard-railed: single-image -> 3D only behind the
   per-part confidence ghosting, only where one facade photo exists.

## Where each technique is and is NOT appropriate

- Grammar: appropriate as the universal default (every record has footprint +
  height + roof). NOT a source of building-specific truth beyond what the rules +
  attributes encode; it is a typology-faithful model, not the actual building.
- Photogrammetry: appropriate and best WHERE multiple real photos survive. NOT
  available for the common demolished-with-one-photo case.
- Single-image generative: appropriate ONLY as a clearly-ghosted speculative
  layer. NOT appropriate as a default or as unmarked "truth" in a civic tool.
