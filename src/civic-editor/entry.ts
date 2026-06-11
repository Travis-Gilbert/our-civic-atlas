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

// Register the editor container and, through it, the affine view effects.
editorEffects();

const SYNC_DB_NAME = 'civic-atlas-event-planning';

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

export async function mountCivicWorkspace(
  container: HTMLElement,
): Promise<CivicWorkspaceMountResult> {
  const collection = createCivicCollection({
    id: SYNC_DB_NAME,
    docSources: { main: new IndexedDBDocSource(SYNC_DB_NAME) },
    awarenessSources: [new BroadcastChannelAwarenessSource(SYNC_DB_NAME)],
  });

  // Boot-race guard: let IndexedDB hydrate the collection meta and the
  // event doc BEFORE deciding whether to seed, so a persisted database is
  // adopted rather than double-seeded (CRDT merge would keep both).
  const docSync = (
    collection as unknown as {
      docSync?: {
        waitForLoadedRootDoc(): Promise<void>;
        waitForSynced(): Promise<void>;
      };
    }
  ).docSync;
  await docSync?.waitForLoadedRootDoc();
  const existing = collection.getDoc(CIVIC_EVENT_DOC_ID);
  if (existing && !existing.loaded) existing.load();
  await docSync?.waitForSynced();

  const handles = ensureCivicDatabase(collection);
  ensureCivicViews(handles);

  const editor = document.createElement(
    'affine-editor-container',
  ) as TestAffineEditorContainer;
  const viewManager = getTestViewManager();
  editor.pageSpecs = viewManager.get('page');
  editor.edgelessSpecs = viewManager.get('edgeless');
  editor.doc = handles.store;
  container.append(editor);

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

  const result: CivicWorkspaceMountResult = {
    api,
    editor,
    handles,
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
    };
    __civicWorkspaceMounted?: CivicWorkspaceMountResult;
  }
}

window.__civicWorkspace = { mount: mountCivicWorkspace };
