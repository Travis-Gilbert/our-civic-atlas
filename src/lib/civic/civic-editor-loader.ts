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

export interface CivicWorkspaceMounted {
  api: CivicStoreApi;
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

/** Inject the bundle once and resolve the window bridge. */
export function loadCivicBridge(): Promise<CivicBridge> {
  bridgePromise ??= new Promise((resolve, reject) => {
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
    const existingScript = document.querySelector(
      `script[src="${EDITOR_SRC}"]`,
    );
    const script = existingScript ?? document.createElement("script");
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
    if (!existingScript) {
      (script as HTMLScriptElement).type = "module";
      (script as HTMLScriptElement).src = EDITOR_SRC;
      document.head.append(script);
    } else if (bridgeWindow().__civicWorkspace) {
      onReady();
    }
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
