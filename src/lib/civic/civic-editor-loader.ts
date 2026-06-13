"use client";

/**
 * Loader for the prebuilt civic editor bundle (public/civic-editor/*).
 *
 * The bundle is the page's ONE BlockSuite/Yjs runtime; Next code must never
 * import BlockSuite directly (raw-TS publishing, see civic-workspace.ts).
 * This module injects the module script + stylesheet once and resolves the
 * window bridge, typed STRUCTURALLY so the Next typecheck never follows
 * imports into BlockSuite sources. Used by the workspace surface (editor
 * mount) and the planner map (headless store for the Phase 5 binding).
 */

import type { CivicObjectFields } from "./civic-object-schema";

const EDITOR_SRC = "/civic-editor/civic-editor.mjs";
const EDITOR_CSS = "/civic-editor/civic-editor.css";

export interface CivicStoreApi {
  insert(fields: CivicObjectFields): string;
  list(): Array<{
    rowId: string;
    title: string;
    fields: Partial<CivicObjectFields>;
  }>;
  update(rowId: string, key: string, value: unknown): void;
  ingestLedgerRows(rows: CivicObjectFields[]): number;
  onChange(listener: () => void): () => void;
}

export interface CivicDocSummary {
  id: string;
  title: string;
  kind: "applications" | "note" | "todo-list";
}

export interface CivicWorkspaceMounted {
  api: CivicStoreApi;
  docs(): CivicDocSummary[];
  openDoc(docId: string): void;
  createNote(title?: string): string;
  createTodoList(title?: string): string;
  /**
   * Delete a workspace doc for every organizer (a plain CRDT update, synced
   * like any other edit). Returns false instead of deleting for the
   * applications doc and for unknown doc ids.
   */
  deleteWorkspaceDoc(docId: string): boolean;
  /** Back-compat alias for older callers. */
  deleteNote(docId: string): boolean;
  onDocsChanged(listener: () => void): () => void;
  currentDocId(): string;
  /**
   * Drive the applications database block's active view (table | kanban) from
   * the workspace segment control. The native BlockSuite view switcher is
   * hidden, so this bridge owns view switching; it retries until the database
   * element renders so a ?view= deep link lands on first load.
   */
  switchView(view: "table" | "kanban"): boolean;
  destroy(): void;
}

export interface CivicBridge {
  mount(container: HTMLElement): Promise<CivicWorkspaceMounted>;
  openStore(): Promise<{ api: CivicStoreApi }>;
}

function bridgeWindow(): { __civicWorkspace?: CivicBridge } {
  return window as unknown as { __civicWorkspace?: CivicBridge };
}

let bridgePromise: Promise<CivicBridge> | null = null;

/**
 * Server-sync configuration handoff. The bundle reads
 * window.__civicSyncConfig at core init, so it must be set BEFORE the
 * script tag is injected. Build-time public env keeps the value static
 * per deployment (no service-tier secret involved; the endpoint is the
 * browser-facing collaborative sync).
 */
function publishSyncConfig() {
  const url = process.env.NEXT_PUBLIC_RUSTYRED_SYNC_URL;
  if (!url) return;
  (
    window as unknown as { __civicSyncConfig?: { url: string } }
  ).__civicSyncConfig = { url };
}

/** Inject the bundle once and resolve the window bridge. */
export function loadCivicBridge(): Promise<CivicBridge> {
  bridgePromise ??= new Promise((resolve, reject) => {
    publishSyncConfig();
    const existingBridge = bridgeWindow().__civicWorkspace;
    if (existingBridge) {
      resolve(existingBridge);
      return;
    }
    if (!document.querySelector(`link[href="${EDITOR_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = EDITOR_CSS;
      document.head.append(link);
    }
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${EDITOR_SRC}"]`,
    );
    // Fast Refresh can preserve the script tag after this module's singleton
    // promise is reset. If the window bridge is still absent, its load event
    // has already passed or failed, so reusing that tag would leave callers
    // waiting forever.
    existingScript?.remove();
    const script = document.createElement("script");
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
    script.type = "module";
    script.src = EDITOR_SRC;
    document.head.append(script);
  });
  // A rejected load should not poison later retries (e.g. after a rebuild).
  bridgePromise.catch(() => {
    bridgePromise = null;
  });
  return bridgePromise;
}

/** Headless civic store for map binding and diagnostics. */
export async function openCivicStore(): Promise<CivicStoreApi> {
  const bridge = await loadCivicBridge();
  const { api } = await bridge.openStore();
  return api;
}
