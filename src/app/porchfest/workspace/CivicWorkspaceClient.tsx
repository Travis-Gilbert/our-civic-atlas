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

import { useEffect, useRef, useState } from "react";
import { useQuery } from "urql";

import { EventApplicationsDocument } from "@/lib/api/graphql/generated/graphql";
import { PlannerClientProvider } from "@/lib/api/graphql/PlannerClientProvider";
import {
  loadCivicBridge,
  type CivicWorkspaceMounted,
} from "@/lib/civic/civic-editor-loader";
import {
  mapEventApplicationToCivicFields,
  type EventApplicationLedgerRow,
} from "@/lib/civic/civic-ledger-ingest";

const EVENT_SLUG = "porchfest-2026";

type MountState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

function WorkspaceInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MountState>({ kind: "loading" });
  const mountedRef = useRef(false);

  const [applicationsResult] = useQuery({
    query: EventApplicationsDocument,
    variables: { eventSlug: EVENT_SLUG },
  });

  // Mount the editor bundle once.
  const apiRef = useRef<CivicWorkspaceMounted | null>(null);
  useEffect(() => {
    if (mountedRef.current || !containerRef.current) return;
    mountedRef.current = true;
    let disposed = false;
    let offChange: (() => void) | undefined;

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
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, []);

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
      </header>
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
          min-height: 100vh;
          background: #ffffff;
          color: #1c1c1c;
        }
        .civic-workspace-header {
          padding: 24px 24px 16px;
          border-bottom: 1px solid #e2e2e2;
        }
        .civic-workspace-overline {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: #454545;
        }
        .civic-workspace-header h1 {
          margin: 4px 0 0;
          font-family: var(--font-mono, inherit);
          font-size: 24px;
          font-weight: 500;
          line-height: 32px;
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
          background: #ffffff;
        }
        .civic-workspace-editor affine-editor-container {
          display: block;
          height: 100%;
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
