# GCLBA Compliance System Implementation Plan

Source spec: `/Users/travisgilbert/Downloads/GCLBA-TOPOLOGY-AND-DEPLOYMENT.md`

This plan turns the topology spec into repo-local execution checkpoints. It is
intentionally separate from the public atlas north-star plan because the GCLBA
surface is an authenticated internal fork with sensitive tax, ownership,
address, workflow, and buyer-communication data.

## Current Implementation

| Area | Status | Implementation |
|---|---|---|
| Tracker backend GraphQL | Done | `/Users/travisgilbert/Tech Dev Local/compliance-inspection-tracker/backend-django/tracker/graphql_schema.py` exposes `/graphql` through Strawberry-Django. |
| Tracker REST/Ninja power tool | Preserved | Django Ninja remains mounted at the existing API routes for the standalone tracker frontend. |
| Atlas fork endpoint seam | Done | `src/lib/api/graphql/endpoints.ts` lets a GCLBA fork route server, browser, and codegen GraphQL traffic to Django without changing public defaults. |
| Atlas public route behavior | Preserved | Public Open Flint Atlas defaults still target the public atlas backend. |
| Portal workflow inventory | Done | See `portal-port-inventory.md`. |
| Fork dependency shedding | Planned | Do this only in the fork, not in this public checkout. |
| Portal workflow UI port | Planned | Port workflow UI from the portal after the GCLBA fork exists. |
| Drag-and-drop upload wiring | Planned | Use existing Django upload endpoints for files and photos. |
| GCLBA RustyRed instance | Planned | Separate Railway instance, projected from Django PostGIS. |

## Fork Setup Contract

Create a fork of this atlas repo for the GCLBA frontend. In that fork:

```bash
NEXT_PUBLIC_CIVIC_ATLAS_DEPLOYMENT_TARGET=gclba
NEXT_PUBLIC_GCLBA_GRAPHQL_URL=https://<gclba-django-host>/graphql
CIVIC_ATLAS_GRAPHQL_SCHEMA=https://<gclba-django-host>/graphql
```

`NEXT_PUBLIC_GCLBA_GRAPHQL_URL` is only an endpoint URL. It must not contain a
token. Authentication and service credentials stay on the Django or deployment
side, not inside the browser bundle.

## Backend GraphQL Surface

The tracker backend now has two API surfaces over one Django ORM model layer:

| Surface | Route | Purpose |
|---|---|---|
| Django Ninja REST | `/api/*` | Existing tracker frontend, imports, exports, uploads, workflow utilities. |
| Strawberry GraphQL | `/graphql` | Atlas fork reads and optimistic write-through mutations. |

Initial GraphQL coverage:

- `deploymentTopology`
- `property(id)`
- `propertyByParcel(parcelId)`
- `properties(search, complianceStatus, finding, program, limit, offset)`
- `communications(propertyId)`
- `documents(propertyId)`
- `photos(propertyId)`
- `actionQueue(asOf, action)`
- `workflowTemplatePreview(propertyId, action, templateSlug, asOf)`
- `updateProperty(input)`
- `createWorkflowCommunication(input)`

## Migration Checkpoints

| ID | Task | Acceptance Criteria | Validation |
|---|---|---|---|
| GCLBA-001 | Fork atlas into a private/internal GCLBA frontend project. | Fork has independent Vercel project, env vars, auth posture, and domain. | Build and route smoke against current public data path. |
| GCLBA-002 | Remove reconstruction-only dependencies in the fork. | `web-ifc`, `@thatopen/*`, `brush`, and reconstruction-heavy R3F surfaces are gone from the GCLBA package. | `npm run typecheck`, `npm run lint`, `npm run build`. |
| GCLBA-003 | Point the fork at Django GraphQL. | `urql` endpoint and codegen schema target `/graphql` on the tracker backend. | `npm run codegen`, query smoke for `properties`. |
| GCLBA-004 | Port portal workflow UI. | SOP workflow, action queue, buyer communications, and deterministic engine views use GraphQL. FileMaker bridge is dropped. | Browser smoke on action queue and communication logging. |
| GCLBA-005 | Wire upload/dropzone. | Parcel-associated files post to Django upload endpoints and refresh GraphQL read state. | Upload smoke for `PropertyPhoto` and `Document`. |
| GCLBA-006 | Add optimistic editing and DuckDB refresh path. | GraphQL mutations update the urql cache; analytical views refresh affected rows. | Mutation smoke plus Mosaic/DuckDB row refresh test. |
| GCLBA-007 | Stand up isolated GCLBA RustyRed. | Separate Railway service projects Django/PostGIS data and never shares public civic data. | Health check plus tenant/namespace smoke. |
| GCLBA-008 | Retire or redirect the standalone portal. | Workflow lives in the GCLBA fork; portal has no active FileMaker path. | Vercel redirect or archived deployment check. |

## Deployment + Auth Runbook

Use this runbook for the GCLBA fork only.

1. Fork verification
   - Confirm a separate git remote/project for GCLBA (do not use the public atlas project).
   - Confirm `NEXT_PUBLIC_CIVIC_ATLAS_DEPLOYMENT_TARGET=gclba`.
   - Confirm `NEXT_PUBLIC_GCLBA_GRAPHQL_URL` points only to the tracker Django GraphQL host.

2. Auth and policy
   - Enforce auth at the fork root route (eg. middleware or edge guard).
   - Require login for `/open-flint-atlas/**` and block anonymous access by default.
   - Require a dedicated role for workflow mutation routes (`/workflow`, `communications`, `upload`).
   - Keep credentials in Vercel/Railway secret manager only.
   - Never place any service credential in `NEXT_PUBLIC_*` variables.

3. Env and deploy control
   - Set fork env in Vercel first, then promote to Production.
   - For release smoke, verify deployment URL returns only authenticated login and no public property-by-address lookups.
   - If environment variables or logs fail, capture incident notes with timestamp and deployment URL.

4. Vercel CLI status
   - `vercel` CLI is currently **not installed** in this workspace (`command -v vercel` returns nothing).
   - Installing Vercel CLI would unlock:
     - `vercel env` for env drift checks,
     - `vercel deploy` for reproducible releases,
     - `vercel logs <deployment>` for post-release triage.
   - Do not install the CLI in this step; rely on dashboard/manual deploy flow for now.

5. Deployment sequence
   - Push commit to the GCLBA fork branch and trigger a production deployment.
   - Run:
     - backend: `manage.py check`, GraphQL auth smoke,
     - frontend: `npm run typecheck`, `npm run lint`, browser smoke on `/open-flint-atlas`.
   - Capture desktop + mobile screenshots of the post-deploy auth gate and workflow pages.

6. Sign-off
   - Record project name, commit SHA, deploy ID, and smoke test timestamp in the runbook note.

## RustyRed Isolation Checklist

Gate each GCLBA RustyRed release against:

| Area | Required check |
|---|---|
| Compute/service boundary | Separate Railway services and namespaces for GCLBA and public atlas; no shared RustyRed process or worker queue. |
| Tenant identity | Every request includes explicit `tenant_id` and `TenantContext`; deny missing/empty tenant values before processing. |
| Data model isolation | Separate PostGIS/RustyRed schemas or DBs; no cross-tenant shared tables for inspection records, attachments, or workflow state. |
| Access control | Service users and credentials are unique per tenant and scoped to minimal SQL grants for GCLBA namespaces only. |
| Resolver routing | Atlas public traffic remains on public service, fork traffic routes to GCLBA Django + private RustyRed endpoints. |
| Network posture | No public exposure of RustyRed admin ports; no direct production read/write from the public atlas frontend. |
| Incident controls | Keep a rollback plan for tenant-specific namespace corruption and run a restore check that touches both PostGIS and RustyRed projections for one sample parcel. |

## Non-Goals

- Do not move GCLBA sensitive data into the public Open Flint Atlas.
- Do not add FileMaker integration.
- Do not put service credentials in a Next.js route handler or browser env var.
- Do not fold buyer self-service into the authenticated internal tool without a
  separate public intake boundary.
- Do not delete Lost Flint or reconstruction code from this public checkout.

## Validation Runbook

Backend:

```bash
cd "/Users/travisgilbert/Tech Dev Local/compliance-inspection-tracker/backend-django"
./venv/bin/python manage.py check
./venv/bin/python manage.py test tracker.tests.test_graphql_api
```

Atlas:

```bash
cd "/Users/travisgilbert/Tech Dev Local/Creative/Website/Open-Flint-Atlas-main-release"
npm run typecheck
npm run lint
```

Before marking any UI phase complete, also run a rendered browser smoke of the
fork route and capture desktop and mobile screenshots.
