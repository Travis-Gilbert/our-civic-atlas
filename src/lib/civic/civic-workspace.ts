/**
 * Civic workspace bootstrap: civic objects as BlockSuite database rows.
 *
 * Phase 2 of the build plan. One BlockSuite doc (CIVIC_EVENT_DOC_ID) holds an
 * `affine:database` block whose columns come from CIVIC_OBJECT_COLUMNS. Rows
 * ARE Yjs objects, so intake, the workspace views, and the geospatial layer
 * all read one CRDT store with no relational sync (the two-store trap the
 * scope doc names).
 *
 * This module is HEADLESS-SAFE on purpose: BlockSuite 0.22 publishes raw
 * TypeScript whose view barrels execute vanilla-extract `.css.ts` at import,
 * which only works under a bundler with the VE transform. Intake API routes
 * and the Node validation harness must not pull the view layer, so column,
 * cell, and row operations here write `model.props` directly, mirroring
 * `affine-block-database/src/utils/block-utils.ts` (addProperty, updateCell,
 * updateProperty) transaction-for-transaction. The browser-only view module
 * (civic-views.client.ts) layers table/kanban views and the interactive
 * editor on the same doc with the full imports.
 *
 * The stable `fieldKey -> columnId` map lives in a custom Y.Map on the same
 * Y.Doc (`civic:column-ids`). It syncs with the database block through any
 * DocSource, survives column renames in the UI, and never renders.
 *
 * Server sync lands as a `RustyRedDocSource` (yrs on the backend, per the
 * y-crdt correction) once the endpoint shape is recorded in
 * SCHEMA-CONTRACT.md; until then persistence is IndexedDB in the browser and
 * in-memory in Node, both through the same `docSources` option.
 *
 * NOTE: TestWorkspace is BlockSuite's embedder workspace implementation (the
 * 0.22 playground ships on it) but is marked test-only upstream. It is
 * wrapped behind createCivicCollection so replacing it with a first-party
 * Workspace implementation before production deploy (Phase 7) is a one-line
 * change here.
 */

import { StoreExtensionManager } from '@blocksuite/affine/ext-loader';
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store';
import { type DatabaseBlockModel } from '@blocksuite/affine/model';
import {
  nanoid,
  Text,
  type Store,
  type Workspace,
} from '@blocksuite/affine/store';
import { TestWorkspace } from '@blocksuite/affine/store/test';

import {
  CIVIC_OBJECT_COLUMNS,
  civicObjectTitle,
  type CivicColumnSpec,
  type CivicColumnType,
  type CivicFieldKey,
  type CivicObjectFields,
} from './civic-object-schema';
import { CivicTaskStoreExtension } from './civic-task-schema';
import { CivicEmailStoreExtension } from './civic-email-schema';

export const CIVIC_EVENT_DOC_ID = 'civic:porchfest-2026';
export const CIVIC_EVENT_TITLE = 'Porchfest 2026 Applications';
/** Y.Map on the doc holding fieldKey -> columnId. */
const COLUMN_ID_MAP_KEY = 'civic:column-ids';

/**
 * BlockSuite property `type` strings, bound to the preset sources rather
 * than imported, because the presets live behind view-layer barrels:
 * `@blocksuite/data-view/src/property-presets/<x>/define.ts` (select,
 * multi-select, checkbox, number, date) and
 * `@blocksuite/affine-block-database/src/properties/<x>/define.ts`
 * (rich-text, link).
 *
 * Schema `text` maps to the database block's `rich-text` property, NOT the
 * data-view `text` preset: that preset is `hide: true` legacy and the table
 * renders its cells blank. Rich-text cells store Text (Y.Text) instances.
 */
const PROPERTY_TYPE_BY_COLUMN: Record<CivicColumnType, string> = {
  text: 'rich-text',
  select: 'select',
  'multi-select': 'multi-select',
  checkbox: 'checkbox',
  number: 'number',
  date: 'date',
  link: 'link',
};

/**
 * Per-type default property data, mirroring each preset's
 * `propertyData.default()` so columns created here are indistinguishable
 * from columns created through DatabaseBlockDataSource.propertyAdd.
 */
function defaultColumnData(spec: CivicColumnSpec): Record<string, unknown> {
  switch (spec.type) {
    case 'select':
    case 'multi-select':
      return { options: seedOptions(spec) };
    case 'number':
      return { decimal: 0, format: 'number' };
    default:
      return {};
  }
}

/** Tag colors cycled for seeded select options (BlockSuite theme vars). */
const TAG_COLORS = [
  'var(--affine-tag-blue)',
  'var(--affine-tag-green)',
  'var(--affine-tag-teal)',
  'var(--affine-tag-purple)',
  'var(--affine-tag-pink)',
  'var(--affine-tag-yellow)',
  'var(--affine-tag-orange)',
  'var(--affine-tag-red)',
  'var(--affine-tag-gray)',
] as const;

interface SelectOption {
  id: string;
  value: string;
  color: string;
}

interface CivicColumnData {
  id: string;
  type: string;
  name: string;
  data: Record<string, unknown>;
}

const storeExtensionManager = new StoreExtensionManager(
  [
    ...getInternalStoreExtensions(),
    CivicTaskStoreExtension,
    CivicEmailStoreExtension,
  ],
);

type TestWorkspaceOptions = NonNullable<
  ConstructorParameters<typeof TestWorkspace>[0]
>;

export interface CivicCollectionOptions {
  id?: string;
  /**
   * Doc sources for the sync engine. Browser callers pass IndexedDB (and
   * later RustyRed) sources; Node validation passes none and stays in
   * memory via the built-in noop source.
   */
  docSources?: TestWorkspaceOptions['docSources'];
  awarenessSources?: TestWorkspaceOptions['awarenessSources'];
}

export function createCivicCollection(
  options: CivicCollectionOptions = {},
): Workspace {
  const collection = new TestWorkspace({
    id: options.id ?? 'civic-atlas-event-planning',
    docSources: options.docSources,
    awarenessSources: options.awarenessSources,
  });
  collection.storeExtensions = storeExtensionManager.get('store');
  collection.start();
  return collection;
}

export interface CivicDatabaseHandles {
  collection: Workspace;
  store: Store;
  model: DatabaseBlockModel;
  /** fieldKey -> columnId, resolved from the doc's Y map. */
  columnIds: ReadonlyMap<CivicFieldKey, string>;
}

function getColumnIdMap(store: Store) {
  return store.spaceDoc.getMap<string>(COLUMN_ID_MAP_KEY);
}

function seedOptions(spec: CivicColumnSpec): SelectOption[] {
  return (spec.options ?? []).map((value, index) => ({
    id: nanoid(),
    value,
    color: TAG_COLORS[index % TAG_COLORS.length],
  }));
}

function modelColumns(model: DatabaseBlockModel): CivicColumnData[] {
  return model.props.columns as unknown as CivicColumnData[];
}

/** Mirror of block-utils addProperty: transacted splice into props.columns. */
function addCivicColumn(
  model: DatabaseBlockModel,
  column: CivicColumnData,
): string {
  if (modelColumns(model).some((c) => c.id === column.id)) return column.id;
  model.store.transact(() => {
    modelColumns(model).push(column);
  });
  return column.id;
}

/** Mirror of block-utils updateProperty: transacted columns[index] replace. */
function setColumnData(
  model: DatabaseBlockModel,
  columnId: string,
  data: Record<string, unknown>,
): void {
  const columns = modelColumns(model);
  const index = columns.findIndex((c) => c.id === columnId);
  if (index < 0) return;
  model.store.transact(() => {
    const column = columns[index];
    if (!column) return;
    columns[index] = { ...column, data };
  });
}

/** Mirror of block-utils updateCell (with its proto-pollution guards). */
function writeCell(
  model: DatabaseBlockModel,
  rowId: string,
  columnId: string,
  value: unknown,
): void {
  const unsafe = ['__proto__', 'constructor', 'prototype'];
  if (unsafe.includes(rowId) || unsafe.includes(columnId)) return;
  model.store.transact(() => {
    const cells = model.props.cells as unknown as Record<
      string,
      Record<string, { columnId: string; value: unknown }>
    >;
    if (!cells[rowId]) {
      cells[rowId] = Object.create(null) as Record<
        string,
        { columnId: string; value: unknown }
      >;
    }
    cells[rowId][columnId] = { columnId, value };
  });
}

/** Mirror of block-utils getCell. */
function readCell(
  model: DatabaseBlockModel,
  rowId: string,
  columnId: string,
): unknown {
  const cells = model.props.cells as unknown as Record<
    string,
    Record<string, { columnId: string; value: unknown }>
  >;
  return cells[rowId]?.[columnId]?.value;
}

/**
 * Get or create the civic-object database inside the event doc. Idempotent:
 * an existing database block is adopted (column map self-heals by column
 * name), so a doc arriving over sync never gets reseeded.
 */
export function ensureCivicDatabase(
  collection: Workspace,
  docId: string = CIVIC_EVENT_DOC_ID,
): CivicDatabaseHandles {
  let doc = collection.getDoc(docId);
  if (!doc) {
    // Fresh collection: meta must exist before docs can register.
    collection.meta.initialize();
    doc = collection.createDoc(docId);
  }
  const store = doc.getStore({ id: docId });
  if (!doc.loaded) {
    doc.load();
  }

  let model = store.getModelsByFlavour('affine:database')[0] as
    | DatabaseBlockModel
    | undefined;

  if (!model) {
    const rootId = store.addBlock('affine:page', {
      title: new Text(CIVIC_EVENT_TITLE),
    });
    store.addBlock('affine:surface', {}, rootId);
    const noteId = store.addBlock('affine:note', {}, rootId);
    const databaseId = store.addBlock(
      'affine:database',
      { columns: [], cells: {} },
      noteId,
    );
    model = store.getModelById(databaseId) as DatabaseBlockModel;
    model.props.title = new Text(CIVIC_EVENT_TITLE);
  }

  const idMap = getColumnIdMap(store);

  if (modelColumns(model).length === 0) {
    for (const spec of CIVIC_OBJECT_COLUMNS) {
      const columnId = addCivicColumn(model, {
        id: nanoid(),
        type: PROPERTY_TYPE_BY_COLUMN[spec.type],
        name: spec.name,
        data: defaultColumnData(spec),
      });
      idMap.set(spec.key, columnId);
    }
  }

  // Resolve the key map, self-healing in three steps so no schema field is
  // ever stranded on a live doc:
  //   1. A mapped column id that no longer exists on the block (stale map
  //      after a UI-side column delete) is discarded, not trusted.
  //   2. A missing entry heals by column name (older doc, renamed map key).
  //   3. A schema column the doc has never seen is CREATED in place. This
  //      is the backfill path for contract additions: the database is only
  //      seeded when empty, so without it a column added to
  //      CIVIC_OBJECT_COLUMNS after a doc's first load (figureKey was the
  //      first) would never materialize on existing event docs.
  const columnIds = new Map<CivicFieldKey, string>();
  for (const spec of CIVIC_OBJECT_COLUMNS) {
    let columnId = idMap.get(spec.key);
    if (columnId && !modelColumns(model).some((c) => c.id === columnId)) {
      columnId = undefined;
    }
    if (!columnId) {
      columnId = modelColumns(model).find((c) => c.name === spec.name)?.id;
    }
    if (!columnId) {
      columnId = addCivicColumn(model, {
        id: nanoid(),
        type: PROPERTY_TYPE_BY_COLUMN[spec.type],
        name: spec.name,
        data: defaultColumnData(spec),
      });
    }
    if (idMap.get(spec.key) !== columnId) idMap.set(spec.key, columnId);
    columnIds.set(spec.key, columnId);
  }

  return { collection, store, model, columnIds };
}

function specByKey(key: CivicFieldKey): CivicColumnSpec | undefined {
  return CIVIC_OBJECT_COLUMNS.find((c) => c.key === key);
}

function optionsOf(
  model: DatabaseBlockModel,
  columnId: string,
): SelectOption[] {
  const column = modelColumns(model).find((c) => c.id === columnId);
  const options = (column?.data as { options?: SelectOption[] } | undefined)
    ?.options;
  return Array.isArray(options) ? options : [];
}

/** Resolve a select value to its option id, creating the option if missing. */
function ensureOptionId(
  model: DatabaseBlockModel,
  columnId: string,
  value: string,
): string {
  const options = optionsOf(model, columnId);
  const existing = options.find((o) => o.value === value);
  if (existing) return existing.id;
  const created: SelectOption = {
    id: nanoid(),
    value,
    color: TAG_COLORS[options.length % TAG_COLORS.length],
  };
  const column = modelColumns(model).find((c) => c.id === columnId);
  setColumnData(model, columnId, {
    ...(column?.data ?? {}),
    options: [...options, created],
  });
  return created.id;
}

/** Coerce a schema field value into the cell representation BlockSuite stores. */
function toCellValue(
  model: DatabaseBlockModel,
  columnId: string,
  spec: CivicColumnSpec,
  value: unknown,
): unknown {
  switch (spec.type) {
    case 'select':
      return typeof value === 'string' && value !== ''
        ? ensureOptionId(model, columnId, value)
        : null;
    case 'multi-select':
      return Array.isArray(value)
        ? value
            .filter((v): v is string => typeof v === 'string' && v !== '')
            .map((v) => ensureOptionId(model, columnId, v))
        : [];
    case 'checkbox':
      return Boolean(value);
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? n : null;
    }
    case 'date': {
      const ms =
        typeof value === 'number' ? value : Date.parse(String(value ?? ''));
      return Number.isFinite(ms) ? ms : null;
    }
    case 'text':
      // rich-text cells hold Text (Y.Text) instances, never plain strings.
      return value == null ? null : new Text(String(value));
    case 'link':
    default:
      return value == null ? null : String(value);
  }
}

/** Decode a stored cell back into the schema's plain representation. */
function fromCellValue(
  model: DatabaseBlockModel,
  columnId: string,
  spec: CivicColumnSpec,
  raw: unknown,
): unknown {
  if (raw == null) return undefined;
  switch (spec.type) {
    case 'select': {
      const match = optionsOf(model, columnId).find((o) => o.id === raw);
      return match?.value;
    }
    case 'multi-select': {
      if (!Array.isArray(raw)) return undefined;
      const options = optionsOf(model, columnId);
      const values = raw
        .map((id) => options.find((o) => o.id === id)?.value)
        .filter((v): v is string => typeof v === 'string');
      return values.length ? values : undefined;
    }
    case 'checkbox':
      return Boolean(raw);
    case 'number':
      return typeof raw === 'number' ? raw : undefined;
    case 'date':
      return typeof raw === 'number' ? new Date(raw).toISOString() : undefined;
    case 'text': {
      // Text or Y.Text instance back from the store; both stringify.
      const text =
        typeof raw === 'string'
          ? raw
          : (raw as { toString(): string }).toString();
      return text === '' ? undefined : text;
    }
    case 'link':
    default:
      return typeof raw === 'string' ? raw : String(raw);
  }
}

/**
 * Insert one civic object as a database row. Planning fields exist on the
 * row from creation (FR-008); status defaults to `submitted` and
 * submittedAt to now, both overridable (imports keep original timestamps).
 */
export function insertCivicObject(
  handles: CivicDatabaseHandles,
  fields: CivicObjectFields,
): string {
  const { store, model, columnIds } = handles;
  const withDefaults: CivicObjectFields = {
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    ...fields,
  };

  const rowId = store.addBlock(
    'affine:paragraph',
    { text: new Text(civicObjectTitle(withDefaults)) },
    model.id,
  );

  for (const [key, columnId] of columnIds) {
    const spec = specByKey(key);
    if (!spec) continue;
    const value = withDefaults[key as keyof CivicObjectFields];
    if (value === undefined) continue;
    writeCell(model, rowId, columnId, toCellValue(model, columnId, spec, value));
  }
  return rowId;
}

/**
 * One-way capture-ledger ingestion: insert civic objects whose `sourceId`
 * is not yet present in the planning store. Existing rows win because the
 * CRDT workspace owns organizer edits after first ingestion.
 */
export function ingestCivicObjectsBySourceId(
  handles: CivicDatabaseHandles,
  rows: readonly CivicObjectFields[],
): number {
  const seen = new Set(
    readCivicObjects(handles)
      .map((row) => row.fields.sourceId)
      .filter((value): value is string => typeof value === 'string'),
  );
  let added = 0;
  for (const row of rows) {
    if (row.sourceId && seen.has(row.sourceId)) continue;
    insertCivicObject(handles, row);
    if (row.sourceId) seen.add(row.sourceId);
    added += 1;
  }
  return added;
}

export interface CivicExternalHydrateResult {
  inserted: number;
  updated: number;
  unchanged: number;
}

const EXTERNAL_HYDRATE_KEYS = CIVIC_OBJECT_COLUMNS.filter(
  (column) => column.scope !== 'planning',
).map((column) => column.key);

function isHydratableExternalValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function civicValueEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function externalHydrateFields(row: CivicObjectFields): CivicObjectFields {
  const fields: Partial<Record<CivicFieldKey, unknown>> = {};
  for (const key of EXTERNAL_HYDRATE_KEYS) {
    const value = row[key as keyof CivicObjectFields];
    if (isHydratableExternalValue(value)) fields[key] = value;
  }
  return fields as CivicObjectFields;
}

/**
 * External source hydrate (Google Sheets v1): insert new sourceId rows and
 * update existing non-planning fields. Planning fields remain organizer-owned
 * BlockSuite state until an explicit export writes them to Google.
 */
export function hydrateCivicObjectsFromExternalSource(
  handles: CivicDatabaseHandles,
  rows: readonly CivicObjectFields[],
): CivicExternalHydrateResult {
  const existingBySourceId = new Map(
    readCivicObjects(handles)
      .map((row) => [row.fields.sourceId, row] as const)
      .filter((entry): entry is [string, CivicObjectRow] => typeof entry[0] === 'string'),
  );
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const hydratableRow = externalHydrateFields(row);
    const sourceId = hydratableRow.sourceId;
    const existing = sourceId ? existingBySourceId.get(sourceId) : undefined;
    if (!existing) {
      const rowId = insertCivicObject(handles, hydratableRow);
      if (sourceId) {
        existingBySourceId.set(sourceId, {
          rowId,
          title: civicObjectTitle(hydratableRow),
          fields: { ...hydratableRow },
        });
      }
      inserted += 1;
      continue;
    }

    let wrote = false;
    const existingFields = existing.fields as Partial<Record<CivicFieldKey, unknown>>;
    for (const key of EXTERNAL_HYDRATE_KEYS) {
      if (key === 'sourceId') continue;
      const value = hydratableRow[key as keyof CivicObjectFields];
      if (!isHydratableExternalValue(value)) continue;
      if (civicValueEqual(existingFields[key], value)) continue;
      updateCivicObjectField(handles, existing.rowId, key, value);
      existingFields[key] = value;
      wrote = true;
    }
    if (wrote) {
      updated += 1;
    } else {
      unchanged += 1;
    }
  }

  return { inserted, updated, unchanged };
}

export interface CivicObjectRow {
  rowId: string;
  title: string;
  fields: Partial<CivicObjectFields>;
}

/** Read every civic object row back into plain schema fields. */
export function readCivicObjects(
  handles: CivicDatabaseHandles,
): CivicObjectRow[] {
  const { model, columnIds } = handles;
  return model.children.map((row) => {
    const fields: Record<string, unknown> = {};
    for (const [key, columnId] of columnIds) {
      const spec = specByKey(key);
      if (!spec) continue;
      const decoded = fromCellValue(
        model,
        columnId,
        spec,
        readCell(model, row.id, columnId),
      );
      if (decoded !== undefined) fields[key] = decoded;
    }
    const title =
      (row as { text?: { toString(): string } }).text?.toString() ??
      civicObjectTitle(fields as Partial<CivicObjectFields>);
    return {
      rowId: row.id,
      title,
      fields: fields as Partial<CivicObjectFields>,
    };
  });
}

/**
 * Organizer edit path (workspace inline edits and map drags both land here):
 * set one field on one row. The same CRDT write serves both views (FR-010/011).
 */
export function updateCivicObjectField(
  handles: CivicDatabaseHandles,
  rowId: string,
  key: CivicFieldKey,
  value: unknown,
): void {
  const { model, columnIds } = handles;
  const spec = specByKey(key);
  const columnId = columnIds.get(key);
  if (!spec || !columnId) {
    throw new Error(`Unknown civic field key: ${key}`);
  }
  writeCell(model, rowId, columnId, toCellValue(model, columnId, spec, value));
}
