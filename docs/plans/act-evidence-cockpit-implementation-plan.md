# ACT Evidence Cockpit: Implementation Plan

Submission target: Gemma 4 Good hackathon. Public artifact: `Travis-Gilbert/anti-conspirarcy-theorem`. Private backplane: this Index-API repo.

## Executive Summary

Ship a browser-runnable Gemma 4 evidence cockpit with ACC as the deterministic verifier, EpiGNN as a residual graph-state learner exported to ONNX for in-browser inference, Gemma 4 E4B LoRA as the explanation and A2UI scene generator, a hardened native Theseus web research path for live fact-checking on the demo, an Observable Notebook Kit technical writeup, and an Observable Framework polished demo site.

ACC remains authoritative under all model output. Gemma never sets the truth score. The deterministic path always renders before the model loads. Public artifact stands alone with no Theseus runtime dependency, while the live demo at `travisgilbert.me/act` adds the hosted web research path on top.

## Decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| U1 | Implement the 11 explanation axes as first-class scoring axes, not just public copy. | "Default to the full best practice fixes always." Six existing traits stay; five new axes added: falsifiability, rhetorical pressure, source quality, contradiction load, claim type, plus citation chain collapse and provenance confidence promoted from diagnostics to first-class. Temporal independence absorbs into temporal_spread with a sub-score. |
| U2 | New `apps/notebook/act_training/` namespace; `apps/anti_misinfo_algo/` wrappers delegate there. | Cleaner separation from the parallel epistemic-check pipeline. Easier to extract or refactor later. |
| U3 | Fix the public repo sync as its own bounded task. | See `sync-public-repo-fix.md`. The public repo is at v2 traits but missing both repairs and the diagnostics work. |
| U4 | Audit Theseus for user-attributed content as its own task. | See `theseus-pii-audit.md`. Column-level grep already shows no User FKs on the canonical graph; the surface to audit is content-level (Object/Component/Claim free-text fields, `created_by` strings, ContextArtifact, AskQuestion). |
| U5 | Ship ONNX-in-browser EpiGNN. Roll back if it fails late in Wave 3. | Hard Constraint 1 (no private Theseus dependency in public artifact) requires a self-contained runtime. ONNX path keeps the EpiGNN benefit without coupling. |
| U6 | Use FEVER for the real-claim eval set; LIAR for local-only evaluation. | FEVER is CC BY-SA 3.0 (redistributable with attribution + ShareAlike). LIAR is research-only with PolitiFact retaining copyright; we use it locally and report metrics, never redistribute. No hand-labeling. |
| U7 | Ship both Notebook Kit and Framework. | Different jobs: Notebook Kit is the in-repo single-file technical writeup judges open; Framework is the polished demo site with live cells. |
| U8 | Compute budget revised: SFT ~1-3h on H100, DPO ~1-2h on H100, EpiGNN ~1-2h, total ~$15-30. | Earlier 6h SFT estimate was wrong. `modal_app/e4b_agent_sft.py` does 3 epochs in ~3h on B200. ACT corpus will be smaller; 1-2 epochs on H100 suffices. |

Live web fact-check is a mandatory engineering track (`track-g-live-web-fact-check.md`-content lives in this file as Track G). RLVR/GRPO is a follow-on plan that runs today after the main work lands (see `rlvr-grpo-followon.md`).

## Hard Constraints

```
1.  Public ACT repo MUST NOT import private Theseus code or require Memgraph / FalkorDB / AGE / private Theseus endpoints.
2.  Browser extension MUST work end-to-end with Gemma fully unavailable (deterministic ACC + deterministic A2UI scene).
3.  Gemma MUST NOT be the source of the truth score; ACC is authoritative.
4.  Theseus backplane work MUST stay additive: no new INSTALLED_APP, no new always-on background job, no edits to canonical Object/Edge models.
5.  All Modal training runs go through the existing modal_app pattern (image build, S3 in/out, no Django imports inside Modal containers).
6.  No emojis in code or docs. No em or en dashes anywhere.
7.  No git worktrees.
8.  No fake UI / mock data in shipped surfaces.
9.  Submission stays inside Kaggle competition rules and Gemma 4 license terms; public artifact ships under MIT or Apache 2.0 compatible with both.
10. Live demo at travisgilbert.me/act may use a hosted Theseus instance; the public extension and repo must not require it.
```

## Architecture

```
  Browser page or pasted text
                |
                v
  Claim extraction (Gemma 4 E4B in browser via WebGPU/MLC,
                    deterministic Readability + heuristic fallback)
                |
                v
  Claim graph packet (claims, sources, snippets, citations,
                      timestamps, same_origin candidates)
                |
                v
  ACC v2 deterministic verifier  <===  authoritative
    11 axes: root_depth, source_independence, support_ratio,
    claim_specificity, temporal_spread, evidence_volume,
    falsifiability, rhetorical_pressure, source_quality,
    contradiction_load, citation_chain_collapse,
    provenance_confidence, claim_type
    Plus rules, penalties, actions, diagnostics, claim_state,
    verification_gap, support_strength, epistemic_risk
                |
                v
  ACT-EpiGNN residual layer (ONNX in browser)
    learned_adjustment, uncertainty,
    predicted_failed_rules, missing_edge_proposals,
    next_check_predictions, counterfactual_deltas
                |
                v
  Verifier packet (compiled consequences, never raw embeddings)
                |
                v
  Optional: live web fact-check (demo-only, hosted Theseus)
    Surfaces fresh sources, contradictions, primary roots
                |
                v
  Gemma 4 E4B LoRA scene generator
    Output: { summary, EvidenceCockpit components },
    schema-validated, score-immutable
                |
                v
  A2UI runtime in browser extension
    ClaimCard, SourceCollapsePanel, EvidencePathGraph,
    TraitRadar, RuleChecklist, PenaltyList, NextChecks,
    ContradictionPanel, CalibrationBadge, ModelExplanationPanel
```

Public / private boundary:

```
PUBLIC repo (Travis-Gilbert/anti-conspirarcy-theorem):
  theseus_acc/        ACC v2 with 11 axes, diagnostics, schemas, a2ui builder
  claim_graph/        public graph schema, JSON examples, tiny graph builder
  browser-extension/  MV3, JS ACC scorer, A2UI renderer, Gemma loader, ONNX EpiGNN
  a2ui-catalog/       standalone component catalog
  training/           dataset generators, SFT/DPO/RRHF training notebooks
  evals/              synthetic + FEVER + source-collapse + schema-validity benchmarks
  notebook/           Observable Notebook Kit technical writeup
  site/               Observable Framework demo site
  model_card/         model card, limitations, demo script
  neural/             ONNX EpiGNN exports + browser inference glue

PRIVATE backplane (this repo, Index-API):
  apps/notebook/act_training/         ACT corpus extraction, label generation, ranking
  apps/anti_misinfo_algo/             thin wrappers delegating to act_training
  apps/notebook/graph_training/       Memgraph -> Arrow exports for ACT-EpiGNN
  apps/notebook/native_web_research.py + apps/notebook/web/   live web demo path
  modal_app/                          ACT-EpiGNN training, Gemma E4B SFT/DPO,
                                      GGUF/MLC export, ONNX export
  scripts/                            ACT data prep, eval orchestration
```

## Critical Path

Four waves. Each wave ends in an integration smoke before the next starts.

| Wave | Tracks active | Gate to next wave |
| --- | --- | --- |
| 1: Foundations | A1 A2 / B1 B2 / E1 E2 / F1 / G1 | ACC fixes + 11 axes + diagnostics land in public repo. Theseus extractor produces valid corpus. Notebook Kit shell builds. Native web research smokes pass. |
| 2: Data + base model | A3 A5 / B3 B4 B5 B6 / C1 / C3 / F2 / G2 G3 | E4B SFT artifact on S3 producing valid scene JSON on fixture packets. ACT-EpiGNN producing trait predictions with R^2 >= 0.6. FEVER eval set imported. Web research returns >= 5 sources for 5/5 demo URLs. |
| 3: Trained artifacts + integration | A4 A6 / C2 C4 C5 / D1-D6 / E3 E6 / F3 F4 F5 / G4 G5 | DPO improves verifier-graded score by >=10%. ONNX EpiGNN inference works in extension. Browser end-to-end smoke passes on all four demo cases. Live demo at travisgilbert.me/act passes its own smoke. |
| 4: Submission close | B7 / D7 / E4 E5 / F6 F7 F8 / G6 | Kaggle submission package complete. Demo video recorded. Model card final. Public dataset published. |

After Wave 4 lands: run `rlvr-grpo-followon.md` for Stage 4 training.

---

## Track A: Public ACT repo (PR ladder)

Goal: ship 6 PRs against `Travis-Gilbert/anti-conspirarcy-theorem` taking it from "ACC scorer + bare extension" to "11-axis ACC + diagnostics + A2UI + Gemma generator + ONNX EpiGNN + reproducible benchmarks". Backwards-compatible at every step.

| ID | Task | Acceptance | Validation | Risk |
| --- | --- | --- | --- | --- |
| A1 | PR1: ACC scoring fixes + 11-axis expansion + diagnostics. Fix `traits.py:root_depth` distance-sensitivity (no verified root => 0.0; closer roots score higher; multiple roots improve; cycles do not crash). Fix `traits.py:source_independence` to 0.0 / 0.35 / `1 - max_pairwise_origin_overlap` for 0/1/2+ branches. Add five new traits as first-class: `falsifiability`, `rhetorical_pressure`, `source_quality`, `contradiction_load`, `citation_chain_collapse`. Add diagnostics module with `support_branch_count`, `visible_source_count`, `canonical_origin_count`, `source_collapse_ratio`, `verified_root_count`, `contradiction_count`, `verification_gap`, `classify_claim_state`. `ACCReport` gains `support_strength`, `epistemic_risk`, `claim_state`, `verification_gap`, `diagnostics`. Existing keys preserved. | `python -m pytest`. New tests: distance-sensitivity, 0/1/2+ branches, cycle no-crash, claim_state classification, each new trait. `python -m theseus_acc.benchmarks.synthetic --full` passes. | Medium. Two existing scoring functions change; weight tuning for 11 traits needs care. Counter: keep weighted-linear + geometric core; add new traits at 0.5x weight initially, retune in F4. |
| A2 | PR2: A2UI evidence cockpit scene builder. `theseus_acc/schemas.py` defines lightweight schemas for EvidenceCockpit, ClaimCard, SourceCollapsePanel, TraitRadar, RuleChecklist, PenaltyList, NextChecks, ContradictionPanel, CalibrationBadge, ModelExplanationPanel. `theseus_acc/a2ui.py` exposes `build_evidence_scene(report) -> dict` and `validate_evidence_scene(scene) -> list[str]`. `docs/a2ui-scene-schema.md`. | `python -m pytest tests/test_a2ui_scene.py`. Tests: serializes; every scored claim appears; high `source_collapse_ratio` produces SourceCollapsePanel; high-priority actions appear in NextChecks; missing-component validator catches drops. | Low. Pure builder. |
| A3 | PR3: Browser extension deterministic renderer. `browser-extension/src/components/` adds the ten A2UI components. `browser-extension/src/sceneRenderer.js`. JS ACC scorer at `browser-extension/src/acc/` mirrors A1. Extension renders deterministically with no model. | `cd browser-extension && npm ci && npm test && npm run build`. Manual smoke on three fixture pages. | Medium. JS scorer drift vs Python is the historical bug. Counter: shared JSON fixtures consumed by both `tests/` and `browser-extension/tests/`. |
| A4 | PR4: Gemma 4 scene generator + strict schema validator. `browser-extension/src/model/prompts.js`, `gemmaSceneGenerator.js`, `schemaValidator.js`. Reject model output that alters ACC scores, invents claim IDs, invents source counts, uses true/false verdicts not in ACC, omits high-priority actions, returns invalid JSON. Rejected output triggers deterministic fallback. `docs/gemma-scene-generation.md`. | `cd browser-extension && npm test && npm run build`. Tests: each rejection condition fires; fallback path runs. | High. Browser-side LLM is fragile. Counter: lazy-load on first analyze, IndexedDB cache, never block deterministic render. |
| A5 | PR5: Synthetic benchmarks + four demo cases + competition docs. `theseus_acc/benchmarks/evidence_cockpit.py` produces source-collapse, under-evidenced-not-false, strong-support, contradiction-pressure cases. `tests/test_evidence_cockpit_cases.py` asserts each `claim_state`. `docs/demo-script.md`, `docs/competition-architecture.md`, `docs/limitations.md`. | `python -m pytest`, browser-extension build green, manual demo-script walkthrough passes. | Low. |
| A6 | PR6: ONNX EpiGNN residual interface. `theseus_acc/neural/graph_packet.py` defines `GraphVerifierPrediction { learned_adjustment, uncertainty, predicted_failed_rules, suggested_missing_edges, next_checks }`. `theseus_acc/neural/residual_verifier.py` exposes `apply_residual(report, prediction) -> ResidualReport`. `browser-extension/src/neural/onnxRunner.js` loads `act-epignn-v1.onnx` via onnxruntime-web (WASM fallback) and produces a `GraphVerifierPrediction`. Default off; flag in extension settings. | `python -m pytest`. JS tests: ONNX loads, runs on a fixture packet, produces a valid GraphVerifierPrediction. End-to-end: extension renders ACC + residual + Gemma scene with EpiGNN enabled. | High. ONNX export of a heterogeneous-edge GNN can fail late. Counter: write the export contract first, test export with a tiny dummy GNN before training the real one. |

Dependencies: `A1 -> A2 -> A3 -> A4 -> A5 -> A6`. A6 also requires Track C C2 (ONNX export from trained EpiGNN).

---

## Track B: Theseus backplane

Goal: wire `apps/notebook/act_training/` to extract ACT-specific training data, generate trait labels and ranked candidates, and publish anonymized public-safe datasets. No mutation of canonical graph. No new always-on services. `apps/anti_misinfo_algo/` is the public Django command surface; all logic lives under `apps/notebook/act_training/`.

| ID | Task | Acceptance | Validation | Risk |
| --- | --- | --- | --- | --- |
| B1 | New `apps/notebook/act_training/extract_corpus.py` pulls 1-hop and 2-hop evidence neighborhoods around Claim/Object pairs where claim type is empirical, causal, or predictive. Output JSONL: claim text, source list, citation edges, timestamps, ACC trait inputs, existing graph `tag_summary` and `epistemic_status`. New management command `apps/anti_misinfo_algo/management/commands/extract_act_corpus.py` wraps it. PG cursor pagination with `connection.close()` between batches. | Local dry-run on 500-object slice writes valid JSONL. Schema covered by `tests/notebook/test_act_corpus_extract.py`. | Medium. Long-running queries against Railway PG must chunk + reconnect. |
| B2 | New `apps/notebook/act_training/label_act.py` runs the public ACT scorer (vendored as a thin import or pip install of the public package once published) over each row to produce traits, `acc_score`, `claim_state`, `verification_gap`, `support_strength`, `epistemic_risk`. New wrapper command `label_act_corpus`. | End-to-end on 100-row sample. | Low. ACC scorer is deterministic. |
| B3 | New `apps/notebook/act_training/generate_candidates.py` produces 4-8 candidates per row: deterministic scene from `theseus_acc.a2ui.build_evidence_scene` (gold), Gemma 4 26B via existing `gemma_26b_inference.py` Modal function (strong reference), Gemma 4 E4B base via Modal (weak reference), six intentionally-bad templates (overconfident_true, overconfident_false, ignores_counterevidence, hallucinates_source, confuses_urls_with_origins, fails_uncertainty). | `--target 200 --rows 50` finishes in under 30 minutes against Modal. Each row has `candidates` array of length >= 4. | Medium. Modal cold-start + 26B inference cost. Counter: budget-cap to 200 candidates first pass. |
| B4 | New `apps/notebook/act_training/rank_candidates.py` scores each candidate on six rules: schema validity, score immutability, reference grounding, action coverage, uncertainty preservation, calibration to ACC `claim_state`. K2V-style checklist rewards. Each row gains `ranked_candidates`, `chosen`, `rejected`. | `tests/notebook/test_act_ranking.py` covers all six rules. End-to-end on 50 rows: every row has at least one rule-passing candidate. | Medium. Rule weights matter. Counter: weights configurable, log per-rule passes. |
| B5 | Wrapper commands `build_act_sft_dataset`, `build_act_dpo_dataset`, `build_act_rrhf_dataset`, `build_act_eval_dataset`, each delegating to a function in `apps/notebook/act_training/`. Outputs to `s3://.../act-datasets/{sft,dpo,rrhf,eval}/`. | Each command runs end-to-end. Pair counts, prompt lengths, label distribution logged. | Low. |
| B6 | New `apps/notebook/graph_training/export_act_epignn.py` streams Memgraph claim, source, evidence_snippet, canonical_origin, review nodes plus supports, contradicts, cites, same_origin_as, extracted_from, temporal_precedes edges into Arrow. Reuses `arrow_writers.py` and `memgraph_arrow.py`. Computes `canonical_origin` clusters at export time from `same_origin_as` edges. | `python3 manage.py export_gnn_data --source memgraph --engine arrow --target act-epignn --output s3://...` finishes on 50K-edge slice. | Medium. `canonical_origin` is computed, not stored. |
| B7 | New `apps/notebook/act_training/publish_public_dataset.py` strips internal IDs and `created_by` strings, redacts source URLs to canonical-origin tokens, removes Object content where `source_type == 'note'`, writes to `s3://act-public-datasets/` with manifest, license notice, consent statement. Public ACT repo `training/` pulls from this S3 path or a HuggingFace release asset. | Manifest validates. Sample row passes `theseus-pii-audit.md` checklist. License header asserts CC BY 4.0 for derived data on top of CC BY-SA 3.0 for FEVER-derived rows where applicable. | High (privacy). Counter: pre-publish review pass against the audit checklist. |

Dependencies: `B1 -> B2 -> B3 -> B4 -> B5 -> B7`. B6 parallel after B1, feeds Track C C1 directly.

---

## Track C: Gemma 4 training pipeline (Modal)

Goal: produce `act-epignn-v1.{pt,onnx}` and `act-gemma4-e4b-v1` (LoRA + GGUF Q4_K_M + MLC bundle for browser).

| ID | Task | Acceptance | Validation | Risk |
| --- | --- | --- | --- | --- |
| C1 | New `modal_app/act_epignn_model.py`: heterogeneous-edge GNN, R-GCN-style, hidden 128, 3 layers, seven heads (trait regression, rule failure, source collapse, counterfactual delta, edge proposal, next check, uncertainty). New `modal_app/act_epignn_train.py` reads B6 Arrow exports, multi-task loss, saves to `s3://.../act-epignn-v1.pt`. | 1x H100, finishes in under 2h. Held-out trait R^2 >= 0.6 on at least three traits. Source-collapse F1 >= 0.7. | Medium. Multi-task losses can fight. Counter: cut to top three heads (trait, source-collapse, counterfactual) if signal weak. |
| C2 | New `modal_app/act_epignn_export_onnx.py`: export trained EpiGNN to ONNX with dynamic axes for variable graph size. Validate via `onnxruntime` Python in a smoke test. Upload to S3 + HuggingFace asset. | Smoke test: load ONNX, run on five fixture graphs, assert output shape and value parity with PyTorch within 1e-4. | High. R-GCN ops in ONNX-runtime-web have rough edges. Counter: write a tiny dummy R-GCN and export it before training the real one. If full GNN export fails, ship a head-only export (just the trait regression head) with the rest disabled. |
| C3 | New `modal_app/act_gemma_sft.py` cloning `modal_app/e4b_agent_sft.py`. Reads `s3://.../act-datasets/sft/`. Prompt masking (loss only on completion tokens). DataLoader with dynamic padding + length bucketing. Sequence packing for short examples. Completion-only perplexity eval at each checkpoint. 1-2 epochs, 1x H100, BF16, LoRA rank 32 on attn + MLP. Saves to `s3://.../act-gemma4-e4b-v1/sft/`. | Run completes in 1-3h on H100. Held-out completion perplexity below threshold (set after first run). 10 fixture verifier packets render valid `EvidenceCockpit` JSON. | High. Repeats every prior Gemma 4 gotcha. Counter: read MEMORY.md V4-V7 entries before launching. Add do_sample=True + repetition_penalty + token-level coherence smoke before any DPO. |
| C4 | New `modal_app/act_gemma_dpo.py`. Reads `s3://.../act-datasets/dpo/` and `rrhf/`. TRL `DPOConfig` with `max_length` only. Loads SFT adapter as warm-start; trains second adapter on top. Optional RRHF stage if listwise data exists. Saves to `s3://.../act-gemma4-e4b-v1/dpo/`. | DPO improves verifier-graded score on held-out eval by >=10% vs SFT baseline. No regression in valid-JSON rate. | Medium. Standard pattern, but small-data DPO is fragile. Counter: keep DPO data >= 2K pairs; if not, ship SFT-only. |
| C5 | Reuse `scripts/convert_gemma4b_gguf.py` to export `act-gemma4-e4b-v1` to GGUF Q4_K_M (~2.5GB). Reuse `modal_app/epistemic_check_export_mlc.py` pattern to export an MLC-LLM bundle for WebGPU. Both artifacts published to S3 and HuggingFace release. | Both artifacts under 3GB. `transformers.js` loads MLC bundle, generates valid scene on three fixture packets in under 5s on M-series Mac, under 10s on mid-tier laptop. | Medium. WebGPU coverage varies. Counter: ship a transformers.js Q4 CPU fallback. |

Dependencies: `C3 requires B5`. `C4 requires B5 + C3`. `C5 requires C4` (or C3 if DPO skipped). `C1 requires B6`. `C2 requires C1`. A6 in Track A requires C2.

---

## Track D: Browser extension Gemma 4 + WebGPU + A2UI runtime

Goal: customer-facing artifact judges click. Boots fast, renders deterministically, progressively enhances when Gemma loads.

| ID | Task | Acceptance | Validation | Risk |
| --- | --- | --- | --- | --- |
| D1 | `browser-extension/src/extract/extractClaims.js` extracts claims via Readability.js + claim-shaped sentence heuristic. Optional Gemma refinement when loaded. | Four demo case fixture pages each yield >= 3 candidate claims with source URLs. | Medium. DOM extraction is messy. Counter: ship a paste-text mode. |
| D2 | `browser-extension/src/graph/buildClaimGraph.js` builds public-schema `claim_graph` JSON including same-origin candidates (URL canonicalization + small wire-service allowlist) and 1-hop citation chain detection. | Demo case 1 (source collapse) graph contains 1 canonical_origin and 8+ visible_sources with `same_origin_as` edges. | Medium. Same-origin without an external service is hard. Counter: ship a deterministic canonicalization rule set. |
| D3 | `browser-extension/src/model/gemmaLoader.js`: lazy-fetch MLC bundle from C5, cache in IndexedDB, expose `gemma.isReady`, `gemma.generate(prompt, opts)`. Failure path: surface "running deterministically" badge, no error. | Cold load first time, warm load second. Three demo-case generations succeed; offline mode renders deterministic scene. | High. WebGPU + MV3 ServiceWorker context interact badly. Counter: deterministic fallback always renders first. |
| D4 | `browser-extension/src/scene/SceneRenderer.jsx` renders the ten A2UI components from PR2/PR3. CalibrationBadge surfaces `deterministic` vs `model-adjusted`. | Renders deterministic scene + Gemma-enhanced scene side-by-side for visual diff. | Low. |
| D5 | `browser-extension/src/ui/SidePanel.html` (Chrome 116+ side panel; popup fallback). Three modes: analyze this page, paste text, view last analysis. Settings: Gemma on/off, force deterministic, clear cache, export scene as JSON, EpiGNN on/off, live web fact-check on/off. | Manual smoke against four fixture pages. All settings work. | Low. |
| D6 | Cold-start UX + perf budget. Deterministic scene under 500ms cold. Gemma scene first-load under 30s on 100Mbps. Warm cache under 5s. No PII telemetry. | `npm run perf` script measures cold + warm against fixtures. | Medium. Counter: progressive disclosure; deterministic renders first, Gemma swaps in. |
| D7 | Chrome Web Store packaging. Privacy policy link, permission justifications, screenshots, demo video link. Manifest declares only `activeTab`, `storage`, `sidePanel`. | Listing draft submitted. CRX zip mirrored to GitHub release. | Medium. Review SLA unpredictable. |

Dependencies: `D1 -> D2 -> D4 -> D5 -> D6 -> D7`. D3 feeds D4 once C5 lands.

---

## Track E: Observable Notebook Kit + Framework

Both ship. Different jobs.

| ID | Task | Acceptance | Validation | Risk |
| --- | --- | --- | --- | --- |
| E1 | Replace zip-draft with full Notebook Kit notebook at `notebook/` in public ACT repo. Sections: project snapshot, problem, thesis, architecture diagram, public graph schema, ACC v2 with all 11 axes, the two scoring repairs, synthetic claim graph example, live ACC scoring with rendered diagnostics, verifier packet shape, A2UI scene generated by Gemma, training strategy (staged SFT -> ranking -> DPO -> RLVR follow-on), ACC + EpiGNN fusion (residual diagram), G-ACC defined safely (hypotheses not facts), browser extension surface, evaluation plan, open-source boundary, limitations, competition build plan. | `npm install && npm run docs:preview` renders locally. `npm run docs:build` produces static HTML. | Low. Zip draft is the skeleton. |
| E2 | New `site/` folder using `@observablehq/framework`. Pages: Home, Architecture, Algorithm, Demo, Training, Evaluation, Limitations, Model Card. Theme matches `travisgilbert.me/act` brand. Data loaders pull from `evals/results/` and `model_card/calibration.json`. | `npm run dev` serves locally. `npm run build` produces static `dist/`. Lighthouse perf >= 90 on Home and Demo. | Medium. Framework conventions differ from Notebook Kit; some duplication is real work. Counter: share Markdown sources where possible. |
| E3 | Demo page embeds the four demo cases using a published `@theseus/acc-js` ESM build emitted from the extension source. Each demo: input, ACC report, EvidenceCockpit scene, "rerun with Gemma" link to extension install. | Each demo loads under 3s. Renders cockpit in iframe-isolated form. | Medium. Single JS bundle in two places drifts; the ESM build is the boundary. |
| E4 | Three short videos (15-30s each): Demo 1 walkthrough, Demo 3 walkthrough, training pipeline animation. GIFs as fallback. | Each plays inline on Home and Demo. | Low. Asset production cost is real. |
| E5 | Cross-link `travisgilbert.me/act` to Framework site and back. Update public ACT page copy to match the actual 11 axes (resolves the v1 mismatch). | Both directions click through. Copy internally consistent. | Low. |
| E6 | Reproducibility cells: paste a URL inline, see ACC compute, scene render, deterministic-vs-Gemma diff. Site context shows deterministic only; extension shows Gemma. | Reproduces all four demo cases inline. | Medium. WebGPU in iframe varies; deterministic-only in site is the safe boundary. |

Dependencies: E1 + E2 start immediately. E3 needs A1 + A2 + A3 + the ESM build. E4 needs D5+. E5 needs E2. E6 needs E3.

---

## Track F: Evaluation, demo cases, model card, Kaggle packaging

| ID | Task | Acceptance | Validation | Risk |
| --- | --- | --- | --- | --- |
| F1 | Synthetic benchmark suite extends `theseus_acc/benchmarks/synthetic.py` with three new generators: source-collapse, citation-chain, contradiction-pressure. Each emits 100 sample claims with ground-truth labels. | Each runs under 30s. ACC + claim_state matches ground truth on >=90% of samples. | Low. |
| F2 | FEVER eval set imported via HuggingFace `datasets.load_dataset('fever')`. CC BY-SA 3.0 attribution preserved. Filter to 200 claims with paired evidence sentences. ACT pipeline runs end-to-end on the set; metrics logged to `evals/results/fever.json`. LIAR set imported for local-only evaluation; metrics logged but artifact not redistributed. | FEVER end-to-end completes. ACT `claim_state` agreement vs FEVER `label` >= 60% (this is a weak signal because FEVER labels are claim-level true/false and ACT outputs structured states; conversion rules documented). | Medium. FEVER labels do not map cleanly onto ACT states. Counter: documented mapping rules, report both raw agreement and mapped agreement. |
| F3 | `evals/schema_validity.py` runs Gemma against 200 verifier packets, measures schema-valid scene rate, score-immutability, action coverage. | After SFT >=70%. After DPO >=90%. | Medium. Tied to Track C quality. |
| F4 | `evals/calibration.py` builds reliability diagrams: ACC `support_strength` vs claim_state agreement on F2; `epistemic_risk` vs presence-of-rule-failure on F1. ECE reported. | ECE for `support_strength` <= 0.10. | Medium. Bootstrap for confidence bands. |
| F5 | Source-collapse benchmark on synthetic + FEVER cases. Reports % of cases where SourceCollapsePanel fires correctly. | >=90% on synthetic. >=70% on FEVER. | Medium. The marquee demo. |
| F6 | `model_card/MODEL_CARD.md` covers intended use, out-of-scope use, training data sources (FEVER + ACT-public-datasets), training procedure (SFT + DPO), eval results, fairness, known failure modes, license. `docs/limitations.md` candid: not a truth oracle, English-only v1, source-collapse heuristic limited without `same_origin` oracle, EpiGNN ONNX coverage by browser, no live web fact-check in extension (only in hosted demo). | Both files reviewed against HuggingFace model card template. | Low. |
| F7 | One narrated 3-minute demo video of all four demo cases. YouTube unlisted + GitHub release mirror. | Fits Kaggle video constraints. | Medium. Production polish takes time. |
| F8 | Kaggle submission package: GitHub repo link, HuggingFace model link (LoRA + GGUF + MLC + ONNX), Notebook Kit static HTML, Framework site URL, demo video URL, model card, demo script, license. | Submission reviewed against Gemma 4 Good rubric. Dry-run completes seven days before deadline. | Medium. Forgetting any artifact disqualifies. |

Dependencies: F1 anytime. F2 after A1. F3-F5 after C4. F6 finalizes after F2-F5. F7 after D5. F8 last.

---

## Track G: Live web fact-check (mandatory engineering)

Goal, decisions, hardening targets, endpoint contract, full G1-G9 checklist, and observability plan live in `track-g-live-web-fact-check.md`. Critical-path summary only here:

- **Wave 1:** G1 audit `native_web_research.py` failure modes.
- **Wave 2:** G2 hardening + G3 Tavily provider; smoke `scripts/ask_pipeline_smoke.py` returns >= 5 sources for 5/5 demo URLs.
- **Wave 3:** G4 service + G5 fusion + G6 endpoint `POST /api/v2/theseus/act/live-evidence` (5s budget, APIKey, CORS to travisgilbert.me); smoke under 4s median.
- **Wave 4:** G7 demo page wiring + G8 optional extension setting (off by default) + G9 observability panel.

Hard Constraint preserved: public extension still works fully if the endpoint is unreachable.

---

## Test Strategy

- **Preflight, every PR in Track A:** `python -m pytest && python -m theseus_acc.benchmarks.synthetic --full && cd browser-extension && npm ci && npm test && npm run build`.
- **Focused, per task:** see Validation column on each row.
- **Integration, end of each Wave:** smoke that takes a fixture URL through extraction -> ACC -> ONNX EpiGNN -> Gemma -> scene render and asserts component markers in rendered HTML.
- **Regression:** existing `theseus_acc` API shape (`acc_score`, `suspect`, `traits`, `rules`, `penalties`, `actions`) preserved across all PRs.
- **Static / type / lint:** `ruff` + existing public-repo lint. ESLint on browser-extension. `tsc --noEmit` if any TS surfaces.
- **Manual:** each demo case walked by a human against the live extension before each Wave handoff.
- **Performance:** D6 budget enforced as a CI gate.
- **Security:** schema validator (PR4) is the boundary against model-output injection; tests enumerate every rejection condition.

## Production Gates

- [ ] All Track A PRs ship with green tests.
- [ ] No private Theseus imports in public ACT repo. CI guard: `grep -r 'apps.notebook' theseus_acc/ browser-extension/ a2ui-catalog/ training/ evals/ neural/ site/ notebook/` returns nothing.
- [ ] No always-on model load in browser extension. Deterministic path always wins on cold start.
- [ ] All Modal jobs versioned and reproducible from S3 inputs.
- [ ] Public dataset (B7) passes the `theseus-pii-audit.md` checklist.
- [ ] Model card honest about limits.
- [ ] No emojis. No em or en dashes.
- [ ] No fake UI / mock data anywhere.
- [ ] Demo video does not show capabilities the artifact can't deliver.
- [ ] License file present and consistent.
- [ ] Kaggle dry-run seven days before deadline.
- [ ] Live web fact-check (Track G) has graceful degradation; extension works without it.

## Non-Goals (in this plan)

- Full RLVR / GRPO loop. Lives in `rlvr-grpo-followon.md`, runs after Wave 4.
- Multi-language support. English-only v1.
- Public Theseus runtime endpoint reused by the extension by default. Live web fact-check is opt-in.
- New always-on background job in Theseus.

## Execution Instructions

- Start with Wave 1: A1, B1, E1 scaffold, F1, G1 in parallel.
- After each Wave, run the integration smoke and update this plan file's status table.
- Report using the Orchestrate Report contract in this same folder, named `orchestrate-report-wave-N.md`.

## Status

| Wave | State |
| --- | --- |
| 1 Foundations | not started |
| 2 Data + base model | not started |
| 3 Trained artifacts + integration | not started |
| 4 Submission close | not started |
| RLVR follow-on | scheduled, see `rlvr-grpo-followon.md` |
