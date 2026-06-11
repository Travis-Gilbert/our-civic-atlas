"use client";

/**
 * Planning workspace surface (Phase 4): embedded BlockSuite over the civic
 * Yjs store, with one-way capture-ledger ingestion on boot.
 *
 * The editor ships as a prebuilt static bundle (public/civic-editor/*,
 * built by npm run build:civic-editor) because BlockSuite 0.22's raw-TS
 * publishing model cannot pass through the Next build without contaminating
 * the atlas pipeline. The bundle is loaded via a module script tag and the
 * window bridge, so neither webpack nor turbopack tries to resolve it.
 *
 * Visual register: this route inherits the porchfest chrome (atlas.css +
 * porchfest.css via the layout). The BlockSuite surface itself renders with
 * the stock affine light theme for the BUILD slice; the civic-register
 * theming pass is design-gated and tracked in the planner folder.
 */

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "urql";

import {
  EventApplicationsDocument,
  RequestEventApplicationBillingDocument,
  type EventApplicationsQuery,
} from "@/lib/api/graphql/generated/graphql";
import { PlannerClientProvider } from "@/lib/api/graphql/PlannerClientProvider";
import {
  loadCivicBridge,
  type CivicDocSummary,
  type CivicWorkspaceMounted,
} from "@/lib/civic/civic-editor-loader";
import {
  mapEventApplicationToCivicFields,
  type EventApplicationLedgerRow,
} from "@/lib/civic/civic-ledger-ingest";

const EVENT_SLUG = "porchfest-2026";

type EventApplicationRow = EventApplicationsQuery["eventApplications"][number];

type MountState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

type BillingNotice =
  | { kind: "idle" }
  | { kind: "success"; message: string; link?: string }
  | { kind: "error"; message: string };

interface BillingSnapshot {
  billingRef?: string;
  paymentLinkUrl?: string;
  amountCents?: number;
}

function parseAmountCents(value: string): number | null {
  const normalized = value.trim().replace(/[$,]/g, "");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function billingSnapshot(
  planningPayload: Record<string, unknown>,
): BillingSnapshot | null {
  const square = objectValue(planningPayload.square);
  if (!square) return null;
  const paymentLinkUrl = square.paymentLinkUrl;
  const billingRef = square.billingRequestId;
  const amountCents = square.amountCents;
  return {
    billingRef: typeof billingRef === "string" ? billingRef : undefined,
    paymentLinkUrl:
      typeof paymentLinkUrl === "string" ? paymentLinkUrl : undefined,
    amountCents: typeof amountCents === "number" ? amountCents : undefined,
  };
}

function applicationOptionLabel(row: EventApplicationRow): string {
  return [row.displayName, row.category, row.status].filter(Boolean).join(" · ");
}

function WorkspaceInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MountState>({ kind: "loading" });
  const mountedRef = useRef(false);
  const [docs, setDocs] = useState<CivicDocSummary[]>([]);
  const [currentDocId, setCurrentDocId] = useState("");
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [billingAmount, setBillingAmount] = useState("");
  const [billingNotice, setBillingNotice] = useState<BillingNotice>({
    kind: "idle",
  });

  const [applicationsResult, reexecuteApplications] = useQuery({
    query: EventApplicationsDocument,
    variables: { eventSlug: EVENT_SLUG },
  });
  const [billingResult, requestBilling] = useMutation(
    RequestEventApplicationBillingDocument,
  );

  const applications = useMemo(
    () => applicationsResult.data?.eventApplications ?? [],
    [applicationsResult.data?.eventApplications],
  );

  useEffect(() => {
    if (!selectedApplicationId && applications.length > 0) {
      setSelectedApplicationId(applications[0]?.id ?? "");
    }
  }, [applications, selectedApplicationId]);

  const selectedApplication = useMemo(
    () => applications.find((row) => row.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId],
  );
  const selectedBilling = selectedApplication
    ? billingSnapshot(selectedApplication.planningPayload)
    : null;
  const amountCents = parseAmountCents(billingAmount);

  async function handleBillingRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApplication) {
      setBillingNotice({ kind: "error", message: "Choose an application." });
      return;
    }
    if (!amountCents) {
      setBillingNotice({ kind: "error", message: "Enter a valid amount." });
      return;
    }

    setBillingNotice({ kind: "idle" });
    const result = await requestBilling({
      input: {
        eventApplicationId: selectedApplication.id,
        amountCents,
        currency: "USD",
        description: `PorchFest 2026 application: ${selectedApplication.displayName}`,
        redirectUrl: `${window.location.origin}/porchfest/workspace`,
        idempotencyKey: `${EVENT_SLUG}:${selectedApplication.id}:${amountCents}:usd`,
      },
    });

    if (result.error) {
      setBillingNotice({
        kind: "error",
        message: result.error.message,
      });
      return;
    }

    const payload = result.data?.requestEventApplicationBilling;
    const billing = payload?.billing;
    if (!billing) {
      setBillingNotice({
        kind: "error",
        message: "Billing request returned no record.",
      });
      return;
    }

    const mounted = apiRef.current;
    const localRow = mounted?.api
      .list()
      .find((row) => row.fields.sourceId === selectedApplication.sourceKey);
    if (mounted && localRow) {
      mounted.api.update(localRow.rowId, "billingRef", billing.id);
      mounted.api.update(localRow.rowId, "feePaid", billing.amountCents / 100);
      mounted.api.update(
        localRow.rowId,
        "status",
        payload.application?.status ?? "payment_requested",
      );
    }

    reexecuteApplications({ requestPolicy: "network-only" });
    setBillingNotice({
      kind: "success",
      message: `${payload.created ? "Created" : "Ready"} ${formatCurrency(
        billing.amountCents,
      )} link.`,
      link: billing.paymentLinkUrl ?? undefined,
    });
  }

  // Mount the editor bundle once.
  const apiRef = useRef<CivicWorkspaceMounted | null>(null);
  useEffect(() => {
    if (mountedRef.current || !containerRef.current) return;
    mountedRef.current = true;
    let disposed = false;
    let offChange: (() => void) | undefined;

    let offDocs: (() => void) | undefined;
    loadCivicBridge()
      .then((bridge) => bridge.mount(containerRef.current as HTMLElement))
      .then((mounted) => {
        if (disposed) {
          mounted.destroy();
          return;
        }
        apiRef.current = mounted;
        const refresh = () => setState({ kind: "ready" });
        offChange = mounted.api.onChange(refresh);
        const refreshDocs = () => {
          const list = mounted.docs();
          setDocs(list);
          // A deletion arriving over sync can orphan the open doc; fall
          // back to the applications doc (always first in the rail) rather
          // than leave the editor on a disposed store.
          if (!list.some((doc) => doc.id === mounted.currentDocId())) {
            const fallback = list[0]?.id;
            if (fallback) mounted.openDoc(fallback);
          }
          setCurrentDocId(mounted.currentDocId());
        };
        offDocs = mounted.onDocsChanged(refreshDocs);
        refreshDocs();
        refresh();
      })
      .catch((error: unknown) => {
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      disposed = true;
      offChange?.();
      offDocs?.();
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, []);

  const handleOpenDoc = (docId: string) => {
    apiRef.current?.openDoc(docId);
    setCurrentDocId(docId);
    setDeleteNotice(null);
  };

  const handleNewNote = () => {
    const mounted = apiRef.current;
    if (!mounted) return;
    const docId = mounted.createNote("Untitled note");
    setDocs(mounted.docs());
    handleOpenDoc(docId);
  };

  const handleDeleteNote = (doc: CivicDocSummary) => {
    const mounted = apiRef.current;
    if (!mounted) return;
    // The store is shared CRDT state: this deletion lands on every
    // organizer's workspace, so it gets a hard confirm.
    const confirmed = window.confirm(
      `Delete "${doc.title}"? This removes it for every organizer.`,
    );
    if (!confirmed) return;
    if (!mounted.deleteNote(doc.id)) {
      setDeleteNotice(`"${doc.title}" cannot be deleted.`);
      return;
    }
    setDeleteNotice(null);
    setDocs(mounted.docs());
    setCurrentDocId(mounted.currentDocId());
  };

  // One-way ledger ingestion once both the editor and the query are ready.
  const ingestedRef = useRef(false);
  useEffect(() => {
    const rows = applicationsResult.data?.eventApplications;
    const mounted = apiRef.current;
    if (ingestedRef.current || !rows || !mounted || state.kind !== "ready") {
      return;
    }
    ingestedRef.current = true;
    const mapped = rows.map((row) =>
      mapEventApplicationToCivicFields(row as EventApplicationLedgerRow),
    );
    const dropped = mapped.flatMap((m) => m.droppedKeys);
    if (dropped.length > 0) {
      console.warn(
        "civic ingestion: unmapped categoryPayload keys (kept in ledger, not in workspace):",
        Array.from(new Set(dropped)),
      );
    }
    mounted.api.ingestLedgerRows(mapped.map((m) => m.fields));
    setState({ kind: "ready" });
  }, [applicationsResult.data, state.kind]);

  return (
    <div className="civic-workspace-shell">
      <header className="civic-workspace-header">
        <div>
          <p className="civic-workspace-overline">
            PorchFest 2026 · Organizers
          </p>
          <h1>Planning workspace</h1>
        </div>
        <nav className="civic-workspace-nav" aria-label="Planner surfaces">
          <a href="/porchfest">Map</a>
          <a href="/porchfest/apply">Apply form</a>
        </nav>
      </header>
      <div className="civic-workspace-docbar" role="tablist" aria-label="Workspace docs">
        {docs.map((doc) => (
          // Buttons cannot nest, so the tab pill is a presentation wrapper
          // around the tab button and (for notes) the delete affordance.
          <span
            key={doc.id}
            role="presentation"
            className="civic-workspace-doctab"
            data-current={doc.id === currentDocId || undefined}
          >
            <button
              type="button"
              role="tab"
              aria-selected={doc.id === currentDocId}
              className="civic-workspace-doctab-open"
              onClick={() => handleOpenDoc(doc.id)}
            >
              {doc.title}
            </button>
            {doc.kind === "note" ? (
              <button
                type="button"
                className="planner-iconbtn civic-workspace-doctab-delete"
                aria-label={`Delete note "${doc.title}"`}
                onClick={() => handleDeleteNote(doc)}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
        <button
          type="button"
          className="civic-workspace-doctab civic-workspace-doctab--new"
          onClick={handleNewNote}
          disabled={state.kind !== "ready"}
        >
          + New note
        </button>
        {deleteNotice ? (
          <span className="planner-note civic-workspace-docnote" role="status">
            {deleteNotice}
          </span>
        ) : null}
      </div>
      <form className="civic-billing-band" onSubmit={handleBillingRequest}>
        <div className="civic-billing-field civic-billing-field--application">
          <label htmlFor="civic-billing-application">Application</label>
          <select
            id="civic-billing-application"
            value={selectedApplicationId}
            disabled={applications.length === 0}
            onChange={(event) => {
              setSelectedApplicationId(event.target.value);
              setBillingNotice({ kind: "idle" });
            }}
          >
            {applications.length === 0 ? (
              <option value="">No applications loaded</option>
            ) : (
              applications.map((row) => (
                <option key={row.id} value={row.id}>
                  {applicationOptionLabel(row)}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="civic-billing-field">
          <label htmlFor="civic-billing-amount">Amount</label>
          <input
            id="civic-billing-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={billingAmount}
            onChange={(event) => {
              setBillingAmount(event.target.value);
              setBillingNotice({ kind: "idle" });
            }}
          />
        </div>
        <button
          className="civic-billing-button"
          type="submit"
          disabled={!selectedApplication || !amountCents || billingResult.fetching}
        >
          {billingResult.fetching ? "Requesting" : "Request link"}
        </button>
        <div className="civic-billing-status" aria-live="polite">
          {billingNotice.kind === "success" ? (
            <>
              <span>{billingNotice.message}</span>
              {billingNotice.link ? (
                <a href={billingNotice.link} target="_blank" rel="noreferrer">
                  Open link
                </a>
              ) : null}
            </>
          ) : billingNotice.kind === "error" ? (
            <span role="alert">{billingNotice.message}</span>
          ) : selectedBilling?.paymentLinkUrl ? (
            <>
              <span>
                Existing {formatCurrency(selectedBilling.amountCents ?? 0)} link
              </span>
              <a
                href={selectedBilling.paymentLinkUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open link
              </a>
            </>
          ) : selectedBilling?.billingRef ? (
            <span>Billing ref {selectedBilling.billingRef}</span>
          ) : null}
        </div>
      </form>
      {state.kind === "error" ? (
        <p className="civic-workspace-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <div ref={containerRef} className="civic-workspace-editor" />
      <style>{`
        .civic-workspace-shell {
          display: flex;
          flex-direction: column;
          /* The porchfest layout wraps routes in overflow-hidden h-full for
             the map surface, so the page itself can never scroll here. The
             shell pins to the viewport and scrolling happens inside the
             editor's .affine-page-viewport (see the editor pane rules). */
          height: 100vh;
          height: 100dvh;
          background: #ffffff;
          color: #1c1c1c;
        }
        /* Top-strip treatment (carried over from AtlasSceneChrome): no
           full-width band, no big wordmark. The kicker overline carries
           the identity, the h1 stays for the document outline but reads
           as a quiet line, and the nav is a content-hugging hairline
           strip anchored right. */
        .civic-workspace-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 24px 10px;
        }
        .civic-workspace-nav {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 4px;
          border: 1px solid #e2e2e2;
          border-radius: 9999px;
          background: #ffffff;
          box-shadow: 0 1px 2px rgba(28, 28, 28, 0.05);
        }
        .civic-workspace-nav a {
          padding: 6px 12px;
          border: 1px solid transparent;
          border-radius: 9999px;
          background: transparent;
          color: #454545;
          font-family: var(--font-mono, inherit);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
        }
        .civic-workspace-nav a:hover {
          border-color: #e2e2e2;
          color: #1c1c1c;
        }
        .civic-workspace-docbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 24px;
          border-bottom: 1px solid #e2e2e2;
          overflow-x: auto;
        }
        .civic-workspace-doctab {
          display: inline-flex;
          align-items: center;
          border: 1px solid transparent;
          border-radius: 4px;
          background: transparent;
          color: #454545;
          font-size: 13px;
          white-space: nowrap;
        }
        .civic-workspace-doctab:hover {
          background: #f5f5f5;
          color: #1c1c1c;
        }
        .civic-workspace-doctab[data-current] {
          background: #f1f6fb;
          border-color: #005186;
          color: #005186;
        }
        .civic-workspace-doctab[data-current] .civic-workspace-doctab-open {
          font-weight: 600;
        }
        .civic-workspace-doctab-open {
          padding: 6px 12px;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          cursor: pointer;
          white-space: nowrap;
        }
        /* Note tabs: the title button cedes its right padding to the 16px
           delete target so the x sits inside the pill. */
        .civic-workspace-doctab-open:not(:only-child) {
          padding-right: 4px;
        }
        .civic-workspace-doctab-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          margin-right: 6px;
          padding: 0;
          border: 0;
          background: transparent;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
        }
        .civic-workspace-doctab--new {
          padding: 6px 12px;
          color: #005186;
          font-weight: 600;
          cursor: pointer;
        }
        .civic-workspace-doctab--new:disabled {
          color: #c5c5c5;
          cursor: default;
          background: transparent;
        }
        .civic-workspace-docnote {
          margin: 0 0 0 8px;
          padding: 4px 10px;
          white-space: nowrap;
        }
        .civic-workspace-overline {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: #454545;
        }
        /* Quiet page title, not a wordmark: the overline above it is
           the identity. Kept as an h1 for the document outline. */
        .civic-workspace-header h1 {
          margin: 2px 0 0;
          font-family: var(--font-mono, inherit);
          font-size: 13px;
          font-weight: 600;
          line-height: 18px;
        }
        .civic-billing-band {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 112px auto minmax(0, 280px);
          gap: 12px;
          align-items: end;
          padding: 12px 24px;
          border-bottom: 1px solid #e2e2e2;
          background: #fbfbfb;
        }
        .civic-billing-field {
          min-width: 0;
        }
        .civic-billing-field label {
          display: block;
          margin: 0 0 4px;
          font-family: var(--font-mono, inherit);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #454545;
        }
        .civic-billing-field select,
        .civic-billing-field input {
          width: 100%;
          height: 34px;
          border: 1px solid #cfcfcf;
          border-radius: 2px;
          background: #ffffff;
          color: #1c1c1c;
          font: inherit;
          font-size: 13px;
        }
        .civic-billing-field select {
          padding: 0 28px 0 10px;
        }
        .civic-billing-field input {
          padding: 0 10px;
        }
        .civic-billing-button {
          height: 34px;
          padding: 0 14px;
          border: 1px solid #1c1c1c;
          border-radius: 2px;
          background: #1c1c1c;
          color: #ffffff;
          font-family: var(--font-mono, inherit);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .civic-billing-button:disabled {
          border-color: #b8b8b8;
          background: #e6e6e6;
          color: #777777;
        }
        .civic-billing-status {
          min-height: 34px;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          color: #454545;
          font-size: 12px;
          line-height: 16px;
        }
        .civic-billing-status span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .civic-billing-status a {
          flex: 0 0 auto;
          color: #1c1c1c;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .civic-workspace-error {
          margin: 0;
          padding: 8px 24px;
          border-bottom: 1px solid #e2e2e2;
          color: #1c1c1c;
          font-family: var(--font-mono, inherit);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .civic-workspace-editor {
          flex: 1;
          min-height: 0;
          /* The pane is a fixed frame, not the scroll container: BlockSuite
             page mode binds every scroll behavior (caret follow while
             typing, drag-handle autoscroll, click-to-append in the blank
             area below the last block, getScrollContainer for sticky
             database headers) to .affine-page-viewport, so that element
             must own the scrolling. When the pane scrolled instead, the
             applications database happened to work (native wheel over a
             grown pane) but freshly created note docs could not scroll:
             the viewport never overflowed and caret follow no-oped. */
          overflow: hidden;
          background: #ffffff;
        }
        .civic-workspace-editor affine-editor-container {
          display: block;
          height: 100%;
        }
        /* Same height contract the upstream BlockSuite playground and
           AFFiNE apply to the page editor: a definite-height
           .affine-page-viewport (overflow-y auto in the component styles)
           with the editor wrapper filling it, so page content taller than
           the pane scrolls inside the viewport for every doc, applications
           and organizer notes alike. */
        .civic-workspace-editor .affine-page-viewport {
          height: 100%;
          overscroll-behavior: contain;
        }
        .civic-workspace-editor .playground-page-editor-container {
          height: 100%;
        }
        @media (max-width: 780px) {
          .civic-billing-band {
            grid-template-columns: 1fr 96px;
          }
          .civic-billing-field--application,
          .civic-billing-status {
            grid-column: 1 / -1;
          }
          .civic-billing-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default function CivicWorkspaceClient() {
  return (
    <PlannerClientProvider>
      <WorkspaceInner />
    </PlannerClientProvider>
  );
}
