/**
 * Civic workspace editor bundle entry (Phase 4).
 *
 * Built by scripts/build-civic-editor.mjs into
 * public/civic-editor/civic-editor.mjs + .css and loaded by the Next route
 * as a static module. BlockSuite 0.22 ships raw TypeScript that needs
 * useDefineForClassFields=false semantics and a vanilla-extract transform;
 * isolating the editor in its own esbuild step keeps those requirements out
 * of the atlas product's Next build entirely (the same separation FR-015
 * wants at deploy time).
 *
 * The bundle owns the ONE BlockSuite/Yjs client runtime on the page. The
 * Next app talks to it through the mount() API (and the window bridge), so
 * the map binding and ledger ingestion never instantiate a second yjs copy.
 */

import { DatabaseBlockDataSource } from '@blocksuite/affine/blocks/database';
import {
  BroadcastChannelAwarenessSource,
  IndexedDBDocSource,
} from '@blocksuite/affine/sync';
import { groupTraitKey } from '@blocksuite/data-view';
import { viewPresets } from '@blocksuite/data-view/view-presets';
import { effects as editorEffects } from '@blocksuite/integration-test/effects';
import { getTestViewManager } from '@blocksuite/integration-test/view';
import type { TestAffineEditorContainer } from '@blocksuite/integration-test';
import { Text } from '@blocksuite/affine/store';

import '@toeverything/theme/style.css';
// Observable register overrides; must follow the stock theme import so
// the bundled css wins by cascade order.
import './civic-editor-theme.css';

import type { CivicObjectFields } from '../lib/civic/civic-object-schema';
import {
  CIVIC_EVENT_DOC_ID,
  createCivicCollection,
  ensureCivicDatabase,
  ingestCivicObjectsBySourceId,
  insertCivicObject,
  readCivicObjects,
  updateCivicObjectField,
  type CivicDatabaseHandles,
  type CivicObjectRow,
} from '../lib/civic/civic-workspace';
import { RustyRedDocSource } from './rustyred-doc-source';

// Register the editor container and, through it, the affine view effects.
editorEffects();

const SYNC_DB_NAME = 'civic-atlas-event-planning';
const SYNC_BOOT_TIMEOUT_MS = 4_000;
/**
 * Second, much longer bound used ONLY when the local store is empty and a
 * sync URL is configured: seeding a fresh store before the server doc
 * arrives would fork the shared doc under CRDT merge, so an empty store
 * waits out a cold server start before concluding it really is first.
 */
const SEED_GUARD_TIMEOUT_MS = 45_000;

export interface CivicWorkspaceApi {
  /** Insert one civic object (used by ingestion and local testing). */
  insert(fields: CivicObjectFields): string;
  /** All civic objects as plain schema fields. */
  list(): CivicObjectRow[];
  /** Organizer/map edit path for a single field. */
  update(rowId: string, key: string, value: unknown): void;
  /**
   * One-way capture-ledger ingestion (SCHEMA-CONTRACT.md): insert rows
   * whose sourceId is not yet in the store. Returns how many were added.
   */
  ingestLedgerRows(rows: CivicObjectFields[]): number;
  /** Subscribe to civic store changes (map binding, counters). */
  onChange(listener: () => void): () => void;
}

export interface CivicDocSummary {
  id: string;
  title: string;
  kind: 'applications' | 'note';
}

export interface CivicWorkspaceMountResult {
  api: CivicWorkspaceApi;
  editor: TestAffineEditorContainer;
  handles: CivicDatabaseHandles;
  /** All workspace docs: the applications database plus organizer notes. */
  docs(): CivicDocSummary[];
  /** Switch the mounted editor to another doc. */
  openDoc(docId: string): void;
  /** Create a fresh organizer note doc (page + todo starter) and return its id. */
  createNote(title?: string): string;
  /** Doc list changes (creation, rename, sync arrivals). */
  onDocsChanged(listener: () => void): () => void;
  currentDocId(): string;
  destroy(): void;
}

/**
 * Table + kanban views over the civic database (FR-007), grouped by the
 * planning status column. Runs in the browser only; the headless store
 * module deliberately leaves views to this layer.
 */
function ensureCivicViews(handles: CivicDatabaseHandles): void {
  const datasource = new DatabaseBlockDataSource(handles.model);
  if (datasource.viewManager.views$.value.length > 0) return;

  datasource.viewManager.viewAdd('table');
  const kanbanViewId = datasource.viewManager.viewAdd(
    viewPresets.kanbanViewMeta.type,
  );
  const statusColumnId = handles.columnIds.get('status');
  if (statusColumnId) {
    datasource.viewManager
      .viewGet(kanbanViewId)
      ?.traitGet(groupTraitKey)
      ?.changeGroup(statusColumnId);
  }
}

interface CivicCore {
  handles: CivicDatabaseHandles;
  api: CivicWorkspaceApi;
}

/** Organizer notes doc: docs + todo lists are first-class BlockSuite blocks. */
const CIVIC_NOTES_DOC_ID = 'civic:notes:porchfest-2026';

/**
 * Seed the starter notes doc once (adopt-not-reseed: runs after sync-ready,
 * and an existing doc is left untouched). The todo items are plain
 * `affine:list` blocks with type "todo"; organizers add more anywhere with
 * the editor's slash menu ("/to-do list", "/heading", and so on).
 */
function ensureNotesDoc(collection: ReturnType<typeof createCivicCollection>) {
  if (collection.getDoc(CIVIC_NOTES_DOC_ID)) return;
  const doc = collection.createDoc(CIVIC_NOTES_DOC_ID);
  const store = doc.getStore({ id: CIVIC_NOTES_DOC_ID });
  if (!doc.loaded) doc.load();
  if (store.getModelsByFlavour('affine:page').length > 0) return;

  const rootId = store.addBlock('affine:page', {
    title: new Text('Organizer notes'),
  });
  store.addBlock('affine:surface', {}, rootId);
  const noteId = store.addBlock('affine:note', {}, rootId);
  store.addBlock(
    'affine:paragraph',
    {
      text: new Text(
        'Shared notes for the planning crew. Everything here syncs live, same as the applications database. Type / for to-do lists, headings, and more.',
      ),
    },
    noteId,
  );
  for (const item of [
    'Confirm porch hosts for the accepted acts',
    'Walk the route and mark power access',
    'Draft the day-of volunteer schedule',
  ]) {
    store.addBlock(
      'affine:list',
      { type: 'todo', checked: false, text: new Text(item) },
      noteId,
    );
  }
  collection.meta.setDocMeta(CIVIC_NOTES_DOC_ID, { title: 'Organizer notes' });
}

/**
 * One civic client runtime per page: collection, sync engine, handles, and
 * the plain-data api. Both the workspace editor mount and the headless map
 * binding share this core, so a page never holds two IndexedDB connections
 * or two Y.Doc replicas of the event doc.
 */
let corePromise: Promise<CivicCore> | null = null;

/**
 * Optional server sync configuration, set by the Next page (from
 * NEXT_PUBLIC_RUSTYRED_SYNC_URL) BEFORE the bundle script loads. When the
 * URL is present, a RustyRedDocSource joins the engine as a shadow peer:
 * IndexedDB stays the local-first main source, RustyRed carries updates
 * across devices (Phase 1, SC-006 beyond one browser).
 */
function rustyRedSyncUrl(): string | null {
  const config = (
    window as unknown as { __civicSyncConfig?: { url?: string } }
  ).__civicSyncConfig;
  const url = config?.url?.trim();
  return url ? url : null;
}

function openCivicCore(): Promise<CivicCore> {
  corePromise ??= (async () => {
    const syncUrl = rustyRedSyncUrl();
    const collection = createCivicCollection({
      id: SYNC_DB_NAME,
      docSources: {
        main: new IndexedDBDocSource(SYNC_DB_NAME),
        ...(syncUrl ? { shadows: [new RustyRedDocSource(syncUrl)] } : {}),
      },
      awarenessSources: [new BroadcastChannelAwarenessSource(SYNC_DB_NAME)],
    });

    // Boot-race guard: let IndexedDB hydrate the collection meta and the
    // event doc BEFORE deciding whether to seed, so a persisted database is
    // adopted rather than double-seeded (CRDT merge would keep both).
    //
    // The waits are BOUNDED: waitForSynced resolves only when every doc
    // source reports synced, and an unreachable RustyRed shadow never does
    // (its pulls return null and the engine retries forever). Unbounded,
    // that hung openStore/mount for the whole session whenever
    // NEXT_PUBLIC_RUSTYRED_SYNC_URL pointed at a down server, taking the
    // planner binding and the workspace with it. Local-first means
    // IndexedDB truth is enough to operate; after the bound we continue and
    // the shadow keeps retrying in the background, merging when the server
    // returns. The bound stays generous so a healthy shadow's first pull
    // (the fresh-browser case where the shared doc arrives over the wire)
    // still lands before the seed decision.
    const docSync = (
      collection as unknown as {
        docSync?: {
          waitForLoadedRootDoc(): Promise<void>;
          waitForSynced(): Promise<void>;
        };
      }
    ).docSync;
    const boundedSyncWait = (
      label: string,
      wait?: Promise<void>,
      boundMs: number = SYNC_BOOT_TIMEOUT_MS,
    ) => {
      if (!wait) return Promise.resolve();
      return Promise.race([
        wait,
        new Promise<void>((resolve) => {
          setTimeout(() => {
            console.warn(
              `civic sync: ${label} still pending after ${boundMs}ms; ` +
                'continuing local-first (server sync keeps retrying in the background)',
            );
            resolve();
          }, boundMs);
        }),
      ]);
    };
    await boundedSyncWait('waitForLoadedRootDoc', docSync?.waitForLoadedRootDoc());
    const existing = collection.getDoc(CIVIC_EVENT_DOC_ID);
    if (existing && !existing.loaded) existing.load();
    await boundedSyncWait('waitForSynced', docSync?.waitForSynced());

    // Seed guard for the double-seed window the bound reopens: on a FRESH
    // browser (no local database block) with a configured shadow, racing
    // out after SYNC_BOOT_TIMEOUT_MS and seeding would fork the shared doc
    // when the slow-but-alive server's copy merges in later (two
    // affine:database blocks, nondeterministic adoption). A fresh store
    // has nothing to show anyway, so it alone waits a much longer second
    // bound before the seed decision; stores with local data (every
    // organizer's normal boot) never pay this.
    if (
      syncUrl &&
      (existing?.getStore({ id: CIVIC_EVENT_DOC_ID })
        .getModelsByFlavour('affine:database').length ?? 0) === 0
    ) {
      await boundedSyncWait(
        'waitForSynced (empty local store, seed guard)',
        docSync?.waitForSynced(),
        SEED_GUARD_TIMEOUT_MS,
      );
    }

    const handles = ensureCivicDatabase(collection);
    if (!collection.meta.getDocMeta(CIVIC_EVENT_DOC_ID)?.title) {
      collection.meta.setDocMeta(CIVIC_EVENT_DOC_ID, { title: 'Applications' });
    }
    ensureNotesDoc(collection);

    const api: CivicWorkspaceApi = {
      insert: (fields) => insertCivicObject(handles, fields),
      list: () => readCivicObjects(handles),
      update: (rowId, key, value) =>
        updateCivicObjectField(
          handles,
          rowId,
          key as Parameters<typeof updateCivicObjectField>[2],
          value,
        ),
      ingestLedgerRows: (rows) => ingestCivicObjectsBySourceId(handles, rows),
      onChange: (listener) => {
        const subscription = handles.store.slots.blockUpdated.subscribe(() =>
          listener(),
        );
        return () => subscription.unsubscribe();
      },
    };

    return { handles, api };
  })();
  return corePromise;
}

export interface CivicStoreOpenResult {
  api: CivicWorkspaceApi;
  handles: CivicDatabaseHandles;
}

/**
 * Headless access to the civic store for surfaces that bind data without
 * mounting the editor: the planner map (Phase 5 two-way location binding)
 * and diagnostics. Shares the page-wide core with mountCivicWorkspace.
 */
export async function openCivicStore(): Promise<CivicStoreOpenResult> {
  const core = await openCivicCore();
  return { api: core.api, handles: core.handles };
}

export async function mountCivicWorkspace(
  container: HTMLElement,
): Promise<CivicWorkspaceMountResult> {
  const core = await openCivicCore();
  const { handles, api } = core;
  const collection = handles.collection;
  ensureCivicViews(handles);

  const editor = document.createElement(
    'affine-editor-container',
  ) as TestAffineEditorContainer;
  const viewManager = getTestViewManager();
  editor.pageSpecs = viewManager.get('page');
  editor.edgelessSpecs = viewManager.get('edgeless');
  editor.doc = handles.store;
  container.append(editor);

  let activeDocId = CIVIC_EVENT_DOC_ID;

  const openDoc = (docId: string) => {
    const doc = collection.getDoc(docId);
    if (!doc) return;
    const store = doc.getStore({ id: docId });
    if (!doc.loaded) doc.load();
    editor.doc = store;
    activeDocId = docId;
  };

  const docs = (): CivicDocSummary[] => {
    const metas = collection.meta.docMetas ?? [];
    const summaries: CivicDocSummary[] = [];
    for (const meta of metas) {
      const id = (meta as { id: string }).id;
      const title = (meta as { title?: string }).title;
      summaries.push({
        id,
        title:
          title && title.trim() !== ''
            ? title
            : id === CIVIC_EVENT_DOC_ID
              ? 'Applications'
              : 'Untitled note',
        kind: id === CIVIC_EVENT_DOC_ID ? 'applications' : 'note',
      });
    }
    // The applications doc always leads the rail.
    summaries.sort((a, b) =>
      a.kind === b.kind ? a.title.localeCompare(b.title) : a.kind === 'applications' ? -1 : 1,
    );
    return summaries;
  };

  const createNote = (title = 'Untitled note'): string => {
    const docId = `civic:note:${crypto.randomUUID().slice(0, 8)}`;
    const doc = collection.createDoc(docId);
    const store = doc.getStore({ id: docId });
    if (!doc.loaded) doc.load();
    const rootId = store.addBlock('affine:page', { title: new Text(title) });
    store.addBlock('affine:surface', {}, rootId);
    const noteId = store.addBlock('affine:note', {}, rootId);
    store.addBlock('affine:paragraph', { text: new Text('') }, noteId);
    collection.meta.setDocMeta(docId, { title });
    return docId;
  };

  const onDocsChanged = (listener: () => void) => {
    const subscription = collection.slots.docListUpdated.subscribe(() =>
      listener(),
    );
    return () => subscription.unsubscribe();
  };

  const result: CivicWorkspaceMountResult = {
    api,
    editor,
    handles,
    docs,
    openDoc,
    createNote,
    onDocsChanged,
    currentDocId: () => activeDocId,
    destroy: () => {
      editor.remove();
      if (window.__civicWorkspaceMounted === result) {
        window.__civicWorkspaceMounted = undefined;
      }
    },
  };
  // The mounted handle is the page-wide civic client runtime: the map
  // binding (Phase 5) and diagnostics reach the SAME doc through it instead
  // of instantiating a second yjs copy.
  window.__civicWorkspaceMounted = result;
  return result;
}

declare global {
  interface Window {
    __civicWorkspace?: {
      mount: typeof mountCivicWorkspace;
      openStore: typeof openCivicStore;
    };
    __civicWorkspaceMounted?: CivicWorkspaceMountResult;
  }
}

window.__civicWorkspace = {
  mount: mountCivicWorkspace,
  openStore: openCivicStore,
};
