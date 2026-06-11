# Feature Specification: Civic Atlas Event-Planning Platform

**Feature Branch**: `001-civic-atlas-event-planning`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "Everything related to Civic Atlas: a reusable civic event-planning platform, first run for Porchfest 2026, that captures applications reliably, lets organizers manage and place applicants on a map, and collects payment after acceptance. Replaces the Formspree intake that lost vendor submissions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable application intake (Priority: P1)

A musician, entertainer, or vendor opens the public application form, fills it out, and submits. Their application is captured and stored the moment they submit, and it is never lost, regardless of whether any later step (payment, email, notification) succeeds or fails.

**Why this priority**: Data loss is the failure that triggered this rebuild. Vendor applications were lost because submission was gated behind a payment step and held in a single store with a retention window, so abandoned or incomplete payments never reached storage. A reliable form-to-store path is the irreducible core of the platform and is a viable product on its own, even before any workspace or map exists.

**Independent Test**: Submit applications of each category through the live form, including cases where the applicant abandons after submitting and where a downstream step is forced to fail, and confirm every submission is retrievable afterward and none is lost.

**Acceptance Scenarios**:

1. **Given** the public form, **When** an applicant completes and submits it, **Then** the application is persisted durably and the applicant receives an acknowledgement.
2. **Given** a downstream step is failing (payment, email, or notification), **When** an applicant submits, **Then** the application is still persisted in full.
3. **Given** the surviving exported records, **When** they are imported, **Then** every record appears in the store and is retrievable.
4. **Given** an applicant who closes the page immediately after submitting, **When** the submission was received, **Then** the application is already stored and complete.

---

### User Story 2 - Organizer management workspace (Priority: P2)

An organizer opens a workspace, sees every application, and works it: reads the details, tags it, marks it accepted or contacted, assigns a set time, and sorts and filters across all applicants, in both a table view and a kanban board.

**Why this priority**: This is the organizers' daily tool, the surface where applications become a planned event. It depends on intake existing (P1) but, once present, delivers standalone value: organizers can triage and decide even before anything is placed on a map or paid.

**Independent Test**: With applications in the store, open the workspace, confirm all appear, edit planning fields on several, switch between table and kanban, and confirm changes persist and are visible on reload.

**Acceptance Scenarios**:

1. **Given** applications in the store, **When** the organizer opens the workspace, **Then** all applications appear in a table and can be viewed as a kanban board.
2. **Given** an application, **When** the organizer marks it accepted and assigns a set time, **Then** those values persist and are visible to any other organizer.
3. **Given** many applications, **When** the organizer filters by category or status, **Then** only matching applications are shown.

---

### User Story 3 - Spatial assignment on the map (Priority: P3)

An organizer places accepted bands and vendors onto the map at their porch or location and moves them as the plan changes. The map and the workspace stay in sync: a placement or move on the map updates the record, and a location set in the workspace appears on the map.

**Why this priority**: Porch assignment is inherently spatial, and the map is the platform's differentiator over a spreadsheet. It depends on having applicants to place (P1) and a record to bind to (P2), and it delivers the planning payoff: a visual, accurate festival map driven by the same data organizers manage.

**Independent Test**: Place a civic object on the map, drag it to a new location, and confirm the record's location updates; then change a location in the workspace and confirm the map marker moves, all off the same record.

**Acceptance Scenarios**:

1. **Given** an accepted band with no location, **When** the organizer drops it on a porch, **Then** its location is set on its record.
2. **Given** a band with a location, **When** the organizer drags its marker, **Then** the record's location updates to the new point.
3. **Given** a location set or changed in the workspace, **When** the map is viewed, **Then** the marker is at that location.
4. **Given** an applicant not yet placed, **When** the organizer opens the map, **Then** the applicant is listed as unplaced rather than missing.

---

### User Story 4 - Payment after acceptance (Priority: P4)

After a vendor is accepted, the organizer requests the vendor's fee through Square, and the payment outcome is recorded on the vendor's record. Payment never gates application or acceptance.

**Why this priority**: Vendors pay a fee, so the platform must collect it, but payment must stay decoupled from intake because coupling them is precisely what lost the original applications. It is lower priority than intake, management, and placement because the event can be planned before money moves, and because the decoupling, not the collection, is the load-bearing requirement.

**Independent Test**: Accept a vendor, issue a Square payment request, complete the payment, and confirm the record shows paid; separately, submit and accept an application with no payment and confirm both succeed.

**Acceptance Scenarios**:

1. **Given** an accepted vendor, **When** the organizer requests the fee, **Then** a Square payment request is issued for that vendor.
2. **Given** an issued request, **When** the vendor completes payment in Square, **Then** the record shows paid with the amount.
3. **Given** any applicant, **When** they submit or are accepted, **Then** no payment is required for either to succeed.
4. **Given** a payment that fails or is abandoned, **When** the organizer checks the vendor, **Then** the record remains accepted and unpaid with no loss of application data.

---

### User Story 5 - Real-time multi-organizer collaboration (Priority: P5)

Several organizers work the workspace and the map at the same time and see each other's edits live, without refreshing.

**Why this priority**: A single organizer is fully viable, so this is the lowest priority, but the collaborative substrate underneath the workspace provides it at little extra cost, and it matters during the crunch before an event when more than one person is assigning slots.

**Independent Test**: Two organizers open the same workspace; one edits a field or moves a marker; confirm the other sees the change without reloading.

**Acceptance Scenarios**:

1. **Given** two organizers in the workspace, **When** one edits a planning field, **Then** the other sees the change without a refresh.
2. **Given** two organizers on the map, **When** one moves a marker, **Then** the other sees it move.

---

### Edge Cases

- An applicant abandons mid-form or loses connectivity before submitting: nothing is captured, which is acceptable, but anything that reaches submit must be stored in full; the original failure was losing submissions that had reached the system.
- A payment fails or is abandoned after acceptance: the record stays accepted and unpaid, the application is untouched, and the request can be reissued.
- Two organizers edit the same field of the same record at once: the collaborative store converges deterministically rather than dropping or corrupting either edit.
- An applicant submits more than once: duplicates are detectable, by email, rather than silently multiplying records.
- A civic object has no location yet: it appears in an unplaced list, never disappears.
- A map annotation's anchor is behind terrain or off-screen: its card is hidden or culled rather than floating in the wrong place (detailed in the geospatial annotation spec).
- Category-specific fields are empty, for example a musician with no second music link: optional fields stay empty without blocking submission; validation applies only to required fields.
- Long-term retention: the store is operator-owned with no third-party retention window, so the 30-day expiry that contributed to the loss cannot recur.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST capture every submitted application durably at the moment of submission, before and independent of any payment, email, or notification step.
- **FR-002**: System MUST persist a submitted application in full even when a downstream step fails.
- **FR-003**: System MUST store each application as a civic object discriminated by category, one of musician, vendor, entertainer, or other, with the field set defined by `src/lib/civic/civic-object-schema.ts` and mirrored by the backend `SCHEMA-CONTRACT.md`.
- **FR-004**: System MUST retain applications under the operator's own control with no third-party retention window.
- **FR-005**: System MUST import the surviving exported records into the store.
- **FR-006**: System MUST record a second durable copy or notification of each submission so that a single store failure cannot lose an application.
- **FR-007**: Organizers MUST be able to view all civic objects in a table view and a kanban view.
- **FR-008**: Organizers MUST be able to edit planning fields (accepted, contacted, paid, set time, location, status) inline, and those changes MUST persist and propagate to other organizers in real time.
- **FR-009**: System MUST represent each civic object on the map as a native map object whose picking and drag are handled by the map's own rendering engine, with no separate overlay event system to bridge.
- **FR-010**: Organizers MUST be able to set or change a civic object's location by placing or dragging it on the map, and that change MUST update the same record the workspace reads.
- **FR-011**: A location set or changed in the workspace MUST appear on the map, and a location set or changed on the map MUST appear in the workspace; both bind to one record.
- **FR-012**: After acceptance, organizers MUST be able to request a vendor's fee through Square, and the payment outcome MUST be recorded on that civic object.
- **FR-013**: System MUST NOT require payment to capture or to accept an application.
- **FR-014**: System MUST keep billing records in a separate relational store referenced from the civic object by identifier.
- **FR-015**: System MUST run the event-planning layer as its own deployment, separate from the urban-planning Atlas.
- **FR-016**: The public form MUST present the redesigned application form and write each submission into the civic-object store.

### Key Entities *(include if feature involves data)*

- **Civic Object**: a person or group applying to the event, discriminated by `category` into one of four real categories: musician, vendor, entertainer, other. Shared attributes: category, name, email (the duplicate-detection key), phone, city, bio, flintBased, accessNeeds, submittedAt, sourceId (provenance, for example `formspree:<id>` for imported rows). Musician: artistName, genre, musicLink, musicLink2, bandSize, porchfestHistory, canDoThirty, equipment, ownPA, setLength. Vendor, shaped for food vendors: businessName, foodDescription, foodType, vendorLink, footprint, vendorNeeds, vendedBefore. Entertainer: actName, actType, actDescription, workLink. Other, for organizations and proposals: orgName, proposal, otherLinks. Planning attributes on every record from creation, organizer-editable: status (submitted, in-review, contacted, accepted, declined, waitlisted; the kanban grouping column), accepted, contacted, feePaid (amount), paymentToBand (amount), location (a `{lng,lat}` JSON string; empty means unplaced, never hidden), setTime, billingRef (the identifier of the billing record in the Postgres store). The civic object is the single unit shared by intake, the workspace, and the map. The model is event-generic; these fields are Porchfest's instantiation, implemented in `civic-object-schema.ts`.
- **Billing Record**: a payment for an accepted civic object. Attributes: amount, status, payment-processor reference, timestamp. Lives in the relational billing store and is referenced from the civic object by identifier. Separate from the planning data because money records are transactional and auditable rather than collaborative.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No submitted application is lost. Every submission is retrievable after submission, including when a payment, email, or notification step fails.
- **SC-002**: Every surviving exported record is imported and visible in the workspace.
- **SC-003**: An organizer can take a single application from submitted, to accepted, to located on the map, to paid for a vendor, end to end, observed live in one working session off one record.
- **SC-004**: A location change made on the map appears in the workspace, and one made in the workspace appears on the map, with no manual refresh.
- **SC-005**: Payment is never required to capture or to accept an application, verifiable by submitting and accepting with no payment.
- **SC-006**: Two organizers editing the same workspace see each other's changes with no manual refresh.
- **SC-007**: Applications continue to be captured with zero loss for the entire duration of the event's open application window.
- **SC-008**: An organizer can locate and update any application's planning fields without leaving the workspace.

## Assumptions

- The planning workspace is embedded BlockSuite (`@blocksuite/affine` and `@blocksuite/data-view` at 0.22.4) used as a framework, not a fork of the AFFiNE application. Civic-object columns map one-to-one onto BlockSuite's data-view property presets (text, select, multi-select, checkbox, number, date) plus the link column config. The store bootstrap writes the `affine:database` block headless-safe through `model.props`, because BlockSuite 0.22.4's view barrels execute vanilla-extract CSS at import; the table and kanban view bootstrap lives in a browser-only module. Block editing, the database with table and kanban, an infinite-canvas whiteboard, and docs are all available; the database with kanban and the map are load-bearing for Porchfest, while whiteboard and docs are bonus.
- Civic objects are stored as BlockSuite database rows, which are CRDT (Yjs) objects, so there is no separate relational store for planning objects and no relational-to-CRDT synchronization to maintain.
- The CRDT protocol is Yjs, which BlockSuite speaks; the server-side implementation is yrs (the y-crdt project) running inside RustyRed, chosen over y-octo because the operator runs their own sync backend rather than reusing AFFiNE's server. This is implemented: the civic store bootstrap round-trips fields through `Y.encodeStateAsUpdate` and `applyUpdate` into a fresh collection (adopt, not reseed) and converges concurrent organizer edits on one row across replicas, proven by `validate:civic-store`.
- The CRDT substrate, RustyRed speaking Yjs, is shared with the coordination room rather than built twice.
- Payment is Square, the neighborhood's processor, taken after acceptance and decoupled from intake. The untested switch to Stripe was part of the original failure.
- Billing records live in a small Postgres store referenced from civic objects; Postgres is scoped to billing only and is not the planning-object store.
- The geospatial layer is deck.gl (v9) over MapLibre. Spatial figures are already native deck.gl objects: `PorchfestAffordanceMeshLayer` renders a pickable `SimpleMeshLayer` per category with procedural geometry (a food truck as a truck, a band as a figure with an instrument, a vendor as a tent), and drag is a sibling `PlannerEditableLayer` in TranslateMode from `@deck.gl-community/editable-layers`, both in one deck.gl stack. Picking and two-way binding therefore run on one engine; the remaining care is MapLibre-versus-deck.gl pointer coordination (pausing map pan during a placement drag, committing the move), which already landed. Light map-side note cards use tiptap. The rendering specifics for terrain-anchored cards are defined in the geospatial annotation layer spec.
- The public form is the existing CTHNA form (Vite and React) ported to Next.js, redesigned with a real design library, writing civic objects into the store. Redesigning the form layout is treated as high-value work, not cosmetic.
- The event-planning layer runs on its own deployment on porchfestflint.com, distinct from the original OurCivicAtlas urban-planning layer, which is diverging into a separate product.
- The import source is the surviving Formspree export, roughly 108 records, mostly musicians, which is private operational data and is not committed to any repository.
- Porchfest 2026 is the first event the platform runs; the platform is built to be reused for later events.
