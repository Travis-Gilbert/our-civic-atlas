"use client";

/**
 * Geo-task sidecar store.
 *
 * A geo-task is a normal GraphQL `EventTask` (title / status / progress / the
 * rail / rollups) PLUS two pieces of planning-side data this store owns:
 *
 *   - its **anchor**: how the map icon resolves its location when the task is
 *     not placement-anchored (a building centroid, or a free point), and
 *   - its **BlockNote note**: a rich-text document shown when the task is
 *     selected.
 *
 * Both live in one Next-side `Y.Doc` (`geo-tasks:porchfest-2026`), NOT in the
 * BlockSuite workspace doc — that one is sealed inside the `public/civic-editor`
 * bundle and unreachable from Next (see `civic-editor-loader.ts`). This sibling
 * doc co-exists with it: persisted locally by `y-indexeddb` and synced across
 * browsers by `RustyRedYjsProvider` (same server, a distinct `doc_id`). That is
 * the faithful reading of the spec's "stored in the Yjs store, Yjs-native so it
 * co-exists with the BlockSuite workspace store."
 *
 *   doc.getMap("anchors")          taskId -> GeoTaskAnchor
 *   doc.getXmlFragment("note:ID")  taskId -> BlockNote collaboration fragment
 *
 * Expected console note: on /porchfest the civic-editor bundle (its own yjs)
 * and this Next-side yjs (here + BlockNote) coexist, so yjs logs "Yjs was
 * already imported" (github.com/yjs/yjs/issues/438). It is benign: the two
 * runtimes never exchange Y objects (this doc is created and read only inside
 * the Next bundle), and the spec mandates the editors stay separate.
 *
 * Placement-anchored tasks keep their anchor on the GraphQL `placementId`
 * (so the icon follows the placement when it moves); this store only records
 * building/point anchors, plus a `kind` marker so the planner knows a task is
 * a geo-task. The note fragment is available for any task id.
 */

import { useSyncExternalStore } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { Awareness } from "y-protocols/awareness";

import { RustyRedYjsProvider } from "./rustyred-yjs-provider";

export const GEO_TASK_DOC_ID = "geo-tasks:porchfest-2026";

/** How a geo-task icon resolves its world position. */
export type GeoTaskAnchor =
  | { readonly kind: "placement"; readonly placementId: string }
  | {
      readonly kind: "building";
      readonly osmId: string;
      readonly lng: number;
      readonly lat: number;
    }
  | { readonly kind: "point"; readonly lng: number; readonly lat: number };

interface GeoTaskStore {
  readonly doc: Y.Doc;
  readonly anchors: Y.Map<GeoTaskAnchor>;
  readonly awareness: Awareness;
  noteFragment(taskId: string): Y.XmlFragment;
  setAnchor(taskId: string, anchor: GeoTaskAnchor): void;
  removeTask(taskId: string): void;
  subscribe(listener: () => void): () => void;
  snapshot(): ReadonlyMap<string, GeoTaskAnchor>;
}

let store: GeoTaskStore | null = null;

function createStore(): GeoTaskStore {
  const doc = new Y.Doc();
  const anchors = doc.getMap<GeoTaskAnchor>("anchors");
  const awareness = new Awareness(doc);

  // Local-first persistence: notes + anchors survive reload before the
  // network ever connects. Browser-only (IndexedDB).
  if (typeof window !== "undefined") {
    try {
      new IndexeddbPersistence(GEO_TASK_DOC_ID, doc);
    } catch {
      // Private-mode / disabled IndexedDB: degrade to in-memory + network.
    }
  }

  // Cross-browser sync over the shared rustyred-server, gated on the same
  // public env var the civic bundle uses. Unset (or SSR) => local-only.
  // Never let a transport failure bubble: this runs during render (via the
  // useSyncExternalStore snapshot), so a bad URL must degrade to local-first,
  // not blank the planner.
  const syncBase = process.env.NEXT_PUBLIC_RUSTYRED_SYNC_URL;
  if (syncBase && typeof window !== "undefined") {
    try {
      new RustyRedYjsProvider(syncBase, GEO_TASK_DOC_ID, doc);
    } catch {
      // Local-first via IndexedDB still works; sync simply stays offline.
    }
  }

  // Cache one snapshot per change so `useSyncExternalStore` can compare by
  // reference (a fresh object only when the map actually changes).
  let cached: ReadonlyMap<string, GeoTaskAnchor> = new Map(
    anchors.entries() as IterableIterator<[string, GeoTaskAnchor]>,
  );
  const listeners = new Set<() => void>();
  anchors.observe(() => {
    cached = new Map(
      anchors.entries() as IterableIterator<[string, GeoTaskAnchor]>,
    );
    for (const listener of listeners) listener();
  });

  return {
    doc,
    anchors,
    awareness,
    noteFragment: (taskId) => doc.getXmlFragment(`note:${taskId}`),
    setAnchor: (taskId, anchor) => anchors.set(taskId, anchor),
    removeTask: (taskId) => {
      anchors.delete(taskId);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => cached,
  };
}

/** Lazily open the singleton geo-task store (browser + SSR safe). */
export function getGeoTaskStore(): GeoTaskStore {
  store ??= createStore();
  return store;
}

const EMPTY_ANCHORS: ReadonlyMap<string, GeoTaskAnchor> = new Map();

/**
 * Subscribe to the live anchor map. Re-renders when any task's anchor changes
 * (locally or from a synced peer), so the map icons re-resolve their position.
 * Returns an empty map during SSR.
 */
export function useGeoTaskAnchors(): ReadonlyMap<string, GeoTaskAnchor> {
  return useSyncExternalStore(
    (listener) => {
      if (typeof window === "undefined") return () => {};
      return getGeoTaskStore().subscribe(listener);
    },
    () => (typeof window === "undefined" ? EMPTY_ANCHORS : getGeoTaskStore().snapshot()),
    () => EMPTY_ANCHORS,
  );
}
