# Our Civic Atlas System Blueprint

## Product Thesis

Our Civic Atlas is a public civic knowledge graph plus geospatial atlas system. Flint Atlas is the first city node: it should let anyone explore, update, and comment on Flint civic evidence while making every confidence state explainable and reversible.

## Operating Model

1. Public atlas
   - Map, timeline, source trail, provenance graph, and place dossiers.
   - Readable without login.
   - Data explains source, age, review state, and caveat.

2. Public contribution
   - Residents can submit observations, corrections, documents, links, and comments.
   - Submissions receive a public receipt but raw text/contact information stays private until reviewed.
   - Pseudonymous contribution is the default; contributor identifiability can raise review confidence only when explicitly chosen.

3. Moderation and accuracy
   - Client-side TF.js performs fast safety and quality preflight.
   - Theseus ACC/ACT performs server-side claim/evidence scoring.
   - Human/community review promotes, rejects, or asks for more evidence.
   - The UI exposes a progress/confidence journal with "why this changed" details.

4. Data graph
   - Core primitives are `Place`, `Source`, `Event`, `Claim`, `Artifact`, `Contribution`, `Review`, and `Edge`.
   - Every public claim must point to source evidence or a contribution receipt.
   - Raw artifacts remain separate from public summaries.

5. Governance
   - Public data releases are reproducible from fixtures/manifests.
   - The atlas states clearly that it is not an official City of Flint site.
   - Sensitive records, private notes, and contact details never enter public JSON.

## Release Shape

Phase 1 ships the Flint public read atlas with local fixture-backed API routes.
Phase 2 adds contribution receipts and review queues.
Phase 3 adds ACC/TF.js-assisted moderation and explanation panels.
Phase 4 adds live source refresh, comments, and community governance workflows.

## Design Rule

The map is the primary surface. Moderation, review, and confidence UI should explain the evidence without burying the atlas under dashboard chrome.

## System Lanes

1. Atlas reader
   - MapLibre/deck.gl remains the desktop geographic canvas.
   - Leaflet remains the mobile fallback until a lighter WebGL mobile path is justified.
   - Timeline, source trail, place dossier, and provenance graph cross-filter the same selected `Place`, `Event`, `Source`, and `Claim` ids.

2. Public contribution
   - First public inputs are observation, correction, source link, document upload, and comment.
   - Every submitted item gets a receipt id, timestamp, contributor visibility choice, and private review payload.
   - Public pages show the receipt state, not raw private notes or contact details.

3. Moderation and scoring
   - TF.js runs in the browser for immediate preflight: spam, abusive language, duplicate likelihood, unsafe attachment hints, and minimum evidence quality.
   - Theseus ACC/ACT runs server-side for claim/evidence alignment, contradiction checks, source support, and calibration.
   - Human/community review is the promotion layer. Automation ranks and explains; it does not silently publish sensitive material.

4. Explanation cockpit
   - Compact cards show progress/confidence, short rationale, and next checks.
   - Clicking opens a deeper explanation using reusable ACT Evidence Cockpit primitives: claim card, source collapse panel, rule checklist, penalty list, contradiction panel, calibration badge, and model explanation panel.
   - Copy uses progress language instead of final verdict language.

5. Public package and governance
   - Fixture builds stay reproducible and public.
   - Public release bundles include manifest, source registry, places/events/sources, methodology, privacy policy, and governance notes.
   - Governance actions are visible: promoted, rejected, needs evidence, merged, superseded, or withdrawn.

## Contribution Lifecycle

1. Draft
   - User writes or uploads.
   - TF.js preflight produces local warnings and suggested fixes before submit.

2. Receipt
   - Server stores the raw submission privately and returns a public receipt.
   - The receipt can be shared without exposing contact details.

3. Automated review
   - ACC/ACT extracts claims, links evidence, checks conflicts, and writes a progress journal.
   - The item becomes queued as `needs_review`, `needs_more_evidence`, or `low_risk_candidate`.

4. Human/community review
   - Reviewers resolve the queue with an auditable note.
   - Accepted material becomes a public `Claim`, `Event`, `Source`, `Place` update, or `Comment`.

5. Publication
   - Public graph edges point from published claims back to receipts, sources, review notes, and scoring snapshots.
   - Later corrections append new history instead of overwriting prior states.

## Near-Term Implementation Plan

1. Stabilize the standalone reader
   - Keep the recovered canvas/paper visual system.
   - Add a small visual regression checklist for desktop and mobile.
   - Preserve current fixture-backed API routes as the local development contract.

2. Ship contribution receipts
   - Add public submit endpoints for observation, correction, source link, document upload, and comment.
   - Store private payloads separately from public receipt summaries.
   - Add receipt lookup UI from the atlas without adding staff-only dashboard chrome.

3. Add the review queue
   - Model review status, reviewer note, public reason, confidence progress, and supersession history.
   - Build a lightweight queue surface for trusted maintainers.
   - Keep public users able to see progress and required next evidence.

4. Wire ACC and TF.js
   - Add TF.js client preflight as advisory validation before submit.
   - Add server-side ACC/ACT scoring after receipt creation.
   - Persist scoring snapshots so explanations are stable and auditable.

5. Release the public package
   - Publish the first static fixture/data bundle.
   - Deploy the reader to the public domain.
   - Document contribution rules, privacy boundaries, and governance process.
