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
import { ViewExtensionManager } from '@blocksuite/affine/ext-loader';
import { getInternalViewExtensions } from '@blocksuite/affine/extensions/view';
import { groupTraitKey } from '@blocksuite/data-view';
import { viewPresets } from '@blocksuite/data-view/view-presets';
import { effects as editorEffects } from '@blocksuite/integration-test/effects';
import type { TestAffineEditorContainer } from '@blocksuite/integration-test';

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
import {
  ensureTaskDatabase,
  type TaskDatabaseHandles,
} from '../lib/civic/civic-task-rows';
import {
  CIVIC_TASKS_DOC_ID,
  CIVIC_TASKS_TITLE,
} from '../lib/civic/civic-task-row-schema';
import {
  CIVIC_NOTES_DOC_ID,
  SEEDED_DOCS_MAP_KEY,
  createCivicTaskListDoc,
  createOrganizerNoteDoc,
  listCivicWorkspaceDocs,
  setCivicDocKind,
  type CivicDocSummary,
} from '../lib/civic/civic-task-docs';
import { CivicTaskViewExtension } from './civic-task-block';
import { CivicEmailViewExtension } from './civic-email-block';
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
  /** Create a task-list doc backed by first-class civic:task blocks. */
  createTodoList(title?: string): string;
  /**
   * Delete a workspace doc for every organizer. The removal is a plain CRDT
   * update on the workspace root doc, so it propagates over sync like any
   * other edit; no special server handling. Refuses (returns false) for the
   * applications doc and for unknown docs.
   */
  deleteWorkspaceDoc(docId: string): boolean;
  /** Back-compat alias for callers created before task-list docs shipped. */
  deleteNote(docId: string): boolean;
  /** Doc list changes (creation, rename, deletion, sync arrivals). */
  onDocsChanged(listener: () => void): () => void;
  currentDocId(): string;
  /**
   * Drive the applications database block's active view from the workspace
   * segment control (Lane 1). The native BlockSuite view switcher is hidden
   * in civic-editor-theme.css, so this bridge owns view switching. Retries
   * briefly until the database element renders, so a deep link (?view=kanban)
   * lands on first load. Returns true when applied synchronously.
   */
  switchView(view: 'table' | 'kanban'): boolean;
  destroy(): void;
}

/**
 * Card fields kept VISIBLE on kanban cards. Everything else is hidden so a
 * card reads as a short triage chip (Lane 1): the row title is the card
 * header automatically (civicObjectTitle), and these are the few non-title
 * fields an organizer triages on. Keys map to column ids via columnIds.
 */
const KANBAN_CARD_FIELDS: ReadonlySet<string> = new Set([
  'category',
  'name',
  'status',
  'feePaid',
]);

/**
 * Task kanban card fields (REVISION 2: tasks are rows). The applications card
 * set above hides everything else; tasks need their own visible fields or the
 * cards would show only the title. Status is the grouping column.
 */
const TASK_CARD_FIELDS: ReadonlySet<string> = new Set([
  'status',
  'priority',
  'owner',
  'dueAt',
]);

/**
 * Minimal structural surface of a kanban SingleView. The concrete
 * KanbanSingleView class is not publicly exported from @blocksuite/data-view,
 * so we reach the per-column hide control through this shape.
 */
interface KanbanCardColumn {
  readonly id: string;
  readonly hide$: { readonly value: boolean };
  hideSet(hide: boolean): void;
}
interface KanbanCardView {
  propertyGetOrCreate(columnId: string): KanbanCardColumn;
}

/**
 * Table + kanban views over the civic database (FR-007), grouped by the
 * planning status column. Runs in the browser only; the headless store
 * module deliberately leaves views to this layer.
 *
 * Card visibility (Lane 1) is healed on every mount, not just on first seed:
 * docs already synced from production were created before this config existed
 * and would otherwise come up with the full 43-column card dump. The heal is
 * idempotent: a column's hidden state is only written when it actually flips.
 */
function ensureCivicViews(
  handles: CivicDatabaseHandles,
  cardFields: ReadonlySet<string> = KANBAN_CARD_FIELDS,
): void {
  const datasource = new DatabaseBlockDataSource(handles.model);
  const viewManager = datasource.viewManager;

  if (viewManager.views$.value.length === 0) {
    viewManager.viewAdd('table');
    const kanbanViewId = viewManager.viewAdd(viewPresets.kanbanViewMeta.type);
    const statusColumnId = handles.columnIds.get('status');
    if (statusColumnId) {
      viewManager
        .viewGet(kanbanViewId)
        ?.traitGet(groupTraitKey)
        ?.changeGroup(statusColumnId);
    }
  }

  for (const viewId of viewManager.views$.value) {
    if (viewManager.viewDataGet(viewId)?.type !== viewPresets.kanbanViewMeta.type) {
      continue;
    }
    const kanban = viewManager.viewGet(viewId) as unknown as KanbanCardView;
    for (const [fieldKey, columnId] of handles.columnIds) {
      const column = kanban.propertyGetOrCreate(columnId);
      const shouldHide = !cardFields.has(fieldKey);
      if (column.hide$.value !== shouldHide) column.hideSet(shouldHide);
    }
  }
}

interface CivicCore {
  handles: CivicDatabaseHandles;
  api: CivicWorkspaceApi;
  taskHandles: TaskDatabaseHandles;
}

/**
 * Seed the starter notes doc once (adopt-not-reseed: runs after sync-ready,
 * and an existing doc is left untouched). The starter task rows are
 * first-class `civic:task` blocks, so later registry-backed fields can attach
 * to them without migrating from native list-block text.
 *
 * A workspace whose seeded flag is set but whose doc is gone had the doc
 * deleted through deleteNote; reseeding would resurrect it on every client,
 * so that state is left alone.
 */
function ensureNotesDoc(collection: ReturnType<typeof createCivicCollection>) {
  const seededDocs = collection.doc.getMap<boolean>(SEEDED_DOCS_MAP_KEY);
  if (collection.getDoc(CIVIC_NOTES_DOC_ID)) {
    // Adopted docs from before the flag existed mark themselves here, so a
    // later deletion sticks for them too.
    setCivicDocKind(collection, CIVIC_NOTES_DOC_ID, 'note');
    if (!seededDocs.get(CIVIC_NOTES_DOC_ID)) {
      seededDocs.set(CIVIC_NOTES_DOC_ID, true);
    }
    return;
  }
  if (seededDocs.get(CIVIC_NOTES_DOC_ID)) return;
  createOrganizerNoteDoc(collection, CIVIC_NOTES_DOC_ID, 'Organizer notes', [
    { text: 'Confirm porch hosts for the accepted acts', priority: 'high' },
    { text: 'Walk the route and mark power access' },
    { text: 'Draft the day-of volunteer schedule' },
  ]);
  seededDocs.set(CIVIC_NOTES_DOC_ID, true);
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
    setCivicDocKind(collection, CIVIC_EVENT_DOC_ID, 'applications');
    ensureNotesDoc(collection);

    // Tasks are first-class ROWS in their own database doc (REVISION 2): they
    // ride the same data-view table + kanban and the same map figure path as
    // applications. Idempotent (adopted, never reseeded) like the event doc.
    const taskHandles = ensureTaskDatabase(collection);
    if (!collection.meta.getDocMeta(CIVIC_TASKS_DOC_ID)?.title) {
      collection.meta.setDocMeta(CIVIC_TASKS_DOC_ID, {
        title: CIVIC_TASKS_TITLE,
      });
    }
    setCivicDocKind(collection, CIVIC_TASKS_DOC_ID, 'tasks');

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

    return { handles, api, taskHandles };
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
  ensureCivicViews(
    core.taskHandles as unknown as CivicDatabaseHandles,
    TASK_CARD_FIELDS,
  );

  const editor = document.createElement(
    'affine-editor-container',
  ) as TestAffineEditorContainer;
  const viewManager = new ViewExtensionManager([
    ...getInternalViewExtensions(),
    CivicTaskViewExtension,
    CivicEmailViewExtension,
  ]);
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

  const docs = (): CivicDocSummary[] =>
    listCivicWorkspaceDocs(collection, CIVIC_EVENT_DOC_ID);

  const createNote = (title = 'Untitled note'): string => {
    const docId = `civic:note:${crypto.randomUUID().slice(0, 8)}`;
    createOrganizerNoteDoc(collection, docId, title);
    return docId;
  };

  const createTodoList = (title = 'Untitled to-do list'): string => {
    const docId = `civic:todo:${crypto.randomUUID().slice(0, 8)}`;
    createCivicTaskListDoc(collection, docId, title);
    return docId;
  };

  const deleteWorkspaceDoc = (docId: string): boolean => {
    if (docId === CIVIC_EVENT_DOC_ID) return false;
    const summary = docs().find((entry) => entry.id === docId);
    if (!summary || summary.kind === 'applications') return false;
    // The removal disposes the doc's store; the mounted editor must not be
    // left rendering it.
    if (activeDocId === docId) openDoc(CIVIC_EVENT_DOC_ID);
    try {
      // Workspace.removeDoc clears the doc's blocks, splices its meta entry
      // inside a root-doc transact, and drops the root 'spaces' entry: all
      // plain CRDT updates, so the deletion reaches every client over sync,
      // and the meta observer fires slots.docListUpdated (the feed
      // onDocsChanged listeners subscribe to).
      collection.removeDoc(docId);
    } catch {
      // removeDoc throws when the meta is already gone (a remote deletion
      // racing this one); "already deleted" still counts as deleted.
      return collection.meta.getDocMeta(docId) === undefined;
    }
    return true;
  };
  const deleteNote = deleteWorkspaceDoc;

  const onDocsChanged = (listener: () => void) => {
    const subscription = collection.slots.docListUpdated.subscribe(() =>
      listener(),
    );
    return () => subscription.unsubscribe();
  };

  // The applications database block exposes its live view manager through
  // dataSource.value (a lazy cell on the rendered element). The native view
  // switcher is hidden in civic-editor-theme.css, so this drives the active
  // view for the workspace segment control and the ?view= deep link.
  type LiveViewManager = {
    views$: { value: string[] };
    // The live view data exposes `mode`, not `type`; the view OBJECT
    // (viewGet) is what carries the resolved `type` ('table' | 'kanban').
    viewGet(id: string): { type?: string } | undefined;
    setCurrentView(id: string): void;
  };
  const findViewManager = (): LiveViewManager | null => {
    const dbEl = (editor.querySelector('affine-database') ??
      document.querySelector('affine-database')) as
      | (Element & {
          dataSource?: { value?: { viewManager?: LiveViewManager } };
        })
      | null;
    return dbEl?.dataSource?.value?.viewManager ?? null;
  };
  const switchView = (view: 'table' | 'kanban', attempt = 0): boolean => {
    const viewManager = findViewManager();
    if (!viewManager) {
      // The database renders a frame after the doc loads; retry up to ~1s so a
      // deep link applies on first paint without the caller polling.
      if (attempt < 60 && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => switchView(view, attempt + 1));
      }
      return false;
    }
    const targetType =
      view === 'kanban' ? viewPresets.kanbanViewMeta.type : 'table';
    const targetId = viewManager.views$.value.find(
      (id) => viewManager.viewGet(id)?.type === targetType,
    );
    if (!targetId) return false;
    viewManager.setCurrentView(targetId);
    return true;
  };

  const result: CivicWorkspaceMountResult = {
    api,
    editor,
    handles,
    docs,
    openDoc,
    createNote,
    createTodoList,
    deleteWorkspaceDoc,
    deleteNote,
    onDocsChanged,
    currentDocId: () => activeDocId,
    switchView,
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
