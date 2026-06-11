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
  mapEventApplicationToCivicFields,
  type EventApplicationLedgerRow,
} from "@/lib/civic/civic-ledger-ingest";
import type { CivicObjectFields } from "@/lib/civic/civic-object-schema";

const EVENT_SLUG = "porchfest-2026";
const EDITOR_SRC = "/civic-editor/civic-editor.mjs";
const EDITOR_CSS = "/civic-editor/civic-editor.css";

type CivicWorkspaceBridge = {
  mount(container: HTMLElement): Promise<{
    api: {
      list(): Array<{ rowId: string; title: string }>;
      ingestLedgerRows(rows: CivicObjectFields[]): number;
      onChange(listener: () => void): () => void;
    };
    destroy(): void;
  }>;
};

type MountState =
  | { kind: "loading" }
  | { kind: "ready"; objectCount: number; ingested: number | null }
  | { kind: "error"; message: string };

/**
 * The bundle publishes the bridge on window; typed structurally here so the
 * Next typecheck never follows imports into BlockSuite's raw-TS sources.
 */
function bridgeWindow(): { __civicWorkspace?: CivicWorkspaceBridge } {
  return window as unknown as { __civicWorkspace?: CivicWorkspaceBridge };
}

/** Load the prebuilt editor bundle once and resolve the window bridge. */
function loadEditorBridge(): Promise<CivicWorkspaceBridge> {
  return new Promise((resolve, reject) => {
    const existing0 = bridgeWindow().__civicWorkspace;
    if (existing0) {
      resolve(existing0);
      return;
    }
    if (!document.querySelector(`link[href="${EDITOR_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = EDITOR_CSS;
      document.head.append(link);
    }
    const existing = document.querySelector(`script[src="${EDITOR_SRC}"]`);
    const script = existing ?? document.createElement("script");
    const onReady = () => {
      const bridge = bridgeWindow().__civicWorkspace;
      if (bridge) {
        resolve(bridge);
      } else {
        reject(new Error("civic editor bundle loaded without bridge"));
      }
    };
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener(
      "error",
      () =>
        reject(
          new Error(
            "civic editor bundle missing; run npm run build:civic-editor",
          ),
        ),
      { once: true },
    );
    if (!existing) {
      (script as HTMLScriptElement).type = "module";
      (script as HTMLScriptElement).src = EDITOR_SRC;
      document.head.append(script);
    } else if (bridgeWindow().__civicWorkspace) {
      onReady();
    }
  });
}

function WorkspaceInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MountState>({ kind: "loading" });
  const mountedRef = useRef(false);

  const [applicationsResult] = useQuery({
    query: EventApplicationsDocument,
    variables: { eventSlug: EVENT_SLUG },
  });

  // Mount the editor bundle once.
  const apiRef = useRef<Awaited<
    ReturnType<CivicWorkspaceBridge["mount"]>
  > | null>(null);
  useEffect(() => {
    if (mountedRef.current || !containerRef.current) return;
    mountedRef.current = true;
    let disposed = false;
    let offChange: (() => void) | undefined;

    loadEditorBridge()
      .then((bridge) => bridge.mount(containerRef.current as HTMLElement))
      .then((mounted) => {
        if (disposed) {
          mounted.destroy();
          return;
        }
        apiRef.current = mounted;
        const refresh = () =>
          setState((prev) => ({
            kind: "ready",
            objectCount: mounted.api.list().length,
            ingested: prev.kind === "ready" ? prev.ingested : null,
          }));
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
    const added = mounted.api.ingestLedgerRows(mapped.map((m) => m.fields));
    setState({
      kind: "ready",
      objectCount: mounted.api.list().length,
      ingested: added,
    });
  }, [applicationsResult.data, state.kind]);

  const statusChips: string[] = [];
  if (state.kind === "ready") {
    statusChips.push(
      `${state.objectCount} civic object${state.objectCount === 1 ? "" : "s"}`,
    );
    if (state.ingested !== null && state.ingested > 0) {
      statusChips.push(`${state.ingested} ingested from intake`);
    }
    if (applicationsResult.error) {
      statusChips.push("intake ledger unreachable; local-first");
    }
  }

  return (
    <div className="civic-workspace-shell">
      <header className="civic-workspace-header">
        <div>
          <p className="civic-workspace-overline">
            PorchFest 2026 · Organizers
          </p>
          <h1>Planning workspace</h1>
          <p className="civic-workspace-sub">
            Applications as one shared civic-object database: table and kanban
            views, edits sync live through the CRDT store.
          </p>
        </div>
        <div className="civic-workspace-status" role="status">
          {state.kind === "loading" && <span>Loading editor…</span>}
          {state.kind === "ready" &&
            statusChips.map((chip) => <span key={chip}>{chip}</span>)}
          {state.kind === "error" && (
            <span data-tone="error">{state.message}</span>
          )}
        </div>
      </header>
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
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
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
        .civic-workspace-sub {
          margin: 4px 0 0;
          font-size: 13px;
          color: #454545;
          max-width: 64ch;
        }
        .civic-workspace-status {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
          font-family: var(--font-mono, inherit);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-variant-numeric: tabular-nums;
          color: #454545;
        }
        .civic-workspace-status span {
          padding: 6px 12px;
          border: 1px solid #e2e2e2;
          border-radius: 9999px;
          background: #ffffff;
          white-space: nowrap;
        }
        .civic-workspace-status span[data-tone="error"] {
          border-left: 2px solid #bf5f52;
          color: #1c1c1c;
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
