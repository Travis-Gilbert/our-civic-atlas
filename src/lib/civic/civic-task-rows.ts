/**
 * Task ROWS over BlockSuite database (REVISION 2 of the unified task system).
 *
 * Tasks are first-class civic-object ROWS in their own `affine:database` doc
 * (CIVIC_TASKS_DOC_ID), so they ride the SAME data-view table + kanban and the
 * SAME bindCivicRowsToMap figure path as applications. This module mirrors
 * civic-workspace.ts (the applications DB) transaction-for-transaction and is
 * HEADLESS-SAFE on purpose: it writes `model.props` directly and never imports
 * the view layer (BlockSuite 0.22 raw-TS view barrels execute vanilla-extract
 * at import). The browser view module layers table/kanban on the same doc.
 *
 * It is a deliberate PARALLEL of civic-workspace.ts rather than a refactor of
 * it, so the validated applications path (validate:civic-store /
 * validate:civic-map-binding) is untouched. The shared cell-encode/decode core
 * can be extracted later (code-simplifier) once both paths are green.
 */

import { type DatabaseBlockModel } from '@blocksuite/affine/model';
import {
  nanoid,
  Text,
  type Store,
  type Workspace,
} from '@blocksuite/affine/store';

import {
  type CivicColumnSpec,
  type CivicColumnType,
} from './civic-object-schema';
import {
  CIVIC_TASKS_DOC_ID,
  CIVIC_TASKS_TITLE,
  TASK_COLUMNS,
  taskRowTitle,
  type TaskFieldKey,
  type TaskRowFields,
} from './civic-task-row-schema';

/** Y.Map on the tasks doc holding taskFieldKey -> columnId. */
const TASK_COLUMN_ID_MAP_KEY = 'civic:task-column-ids';

/** Same property-type mapping civic-workspace.ts uses. */
const PROPERTY_TYPE_BY_COLUMN: Record<CivicColumnType, string> = {
  text: 'rich-text',
  select: 'select',
  'multi-select': 'multi-select',
  checkbox: 'checkbox',
  number: 'number',
  date: 'date',
  link: 'link',
};

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

interface ColumnData {
  id: string;
  type: string;
  name: string;
  data: Record<string, unknown>;
}

export interface TaskDatabaseHandles {
  collection: Workspace;
  store: Store;
  model: DatabaseBlockModel;
  columnIds: ReadonlyMap<TaskFieldKey, string>;
}

export interface TaskRow {
  rowId: string;
  title: string;
  fields: Partial<TaskRowFields>;
}

function seedOptions(spec: CivicColumnSpec): SelectOption[] {
  return (spec.options ?? []).map((value, index) => ({
    id: nanoid(),
    value,
    color: TAG_COLORS[index % TAG_COLORS.length],
  }));
}

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

function getColumnIdMap(store: Store) {
  return store.spaceDoc.getMap<string>(TASK_COLUMN_ID_MAP_KEY);
}

function modelColumns(model: DatabaseBlockModel): ColumnData[] {
  return model.props.columns as unknown as ColumnData[];
}

function addColumn(model: DatabaseBlockModel, column: ColumnData): string {
  if (modelColumns(model).some((c) => c.id === column.id)) return column.id;
  model.store.transact(() => {
    modelColumns(model).push(column);
  });
  return column.id;
}

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
 * Get or create the tasks database in its own doc. Idempotent: an existing
 * database is adopted (column map self-heals by name), so a synced doc never
 * gets reseeded. Mirrors ensureCivicDatabase.
 */
export function ensureTaskDatabase(
  collection: Workspace,
  docId: string = CIVIC_TASKS_DOC_ID,
): TaskDatabaseHandles {
  let doc = collection.getDoc(docId);
  if (!doc) {
    collection.meta.initialize();
    doc = collection.createDoc(docId);
  }
  const store = doc.getStore({ id: docId });
  if (!doc.loaded) doc.load();

  let model = store.getModelsByFlavour('affine:database')[0] as
    | DatabaseBlockModel
    | undefined;

  if (!model) {
    const rootId = store.addBlock('affine:page', {
      title: new Text(CIVIC_TASKS_TITLE),
    });
    store.addBlock('affine:surface', {}, rootId);
    const noteId = store.addBlock('affine:note', {}, rootId);
    const databaseId = store.addBlock(
      'affine:database',
      { columns: [], cells: {} },
      noteId,
    );
    model = store.getModelById(databaseId) as DatabaseBlockModel;
    model.props.title = new Text(CIVIC_TASKS_TITLE);
  }

  const idMap = getColumnIdMap(store);

  if (modelColumns(model).length === 0) {
    for (const spec of TASK_COLUMNS) {
      const columnId = addColumn(model, {
        id: nanoid(),
        type: PROPERTY_TYPE_BY_COLUMN[spec.type],
        name: spec.name,
        data: defaultColumnData(spec),
      });
      idMap.set(spec.key, columnId);
    }
  }

  // Resolve + self-heal the key map (stale id -> heal by name -> create), so a
  // task column added to the contract after a doc's first load still
  // materializes on existing docs.
  const columnIds = new Map<TaskFieldKey, string>();
  for (const spec of TASK_COLUMNS) {
    let columnId = idMap.get(spec.key);
    if (columnId && !modelColumns(model).some((c) => c.id === columnId)) {
      columnId = undefined;
    }
    if (!columnId) {
      columnId = modelColumns(model).find((c) => c.name === spec.name)?.id;
    }
    if (!columnId) {
      columnId = addColumn(model, {
        id: nanoid(),
        type: PROPERTY_TYPE_BY_COLUMN[spec.type],
        name: spec.name,
        data: defaultColumnData(spec),
      });
    }
    if (idMap.get(spec.key) !== columnId) idMap.set(spec.key, columnId);
    columnIds.set(spec.key as TaskFieldKey, columnId);
  }

  return { collection, store, model, columnIds };
}

function specByKey(key: TaskFieldKey): CivicColumnSpec | undefined {
  return TASK_COLUMNS.find((c) => c.key === key);
}

function optionsOf(model: DatabaseBlockModel, columnId: string): SelectOption[] {
  const column = modelColumns(model).find((c) => c.id === columnId);
  const options = (column?.data as { options?: SelectOption[] } | undefined)
    ?.options;
  return Array.isArray(options) ? options : [];
}

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
      return value == null ? null : new Text(String(value));
    case 'link':
    default:
      return value == null ? null : String(value);
  }
}

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

/** Insert one task row. status defaults to `todo`, overridable. */
export function insertTask(
  handles: TaskDatabaseHandles,
  fields: TaskRowFields,
): string {
  const { store, model, columnIds } = handles;
  const withDefaults: TaskRowFields = { status: 'todo', ...fields };

  const rowId = store.addBlock(
    'affine:paragraph',
    { text: new Text(taskRowTitle(withDefaults)) },
    model.id,
  );

  for (const [key, columnId] of columnIds) {
    const spec = specByKey(key);
    if (!spec) continue;
    const value = withDefaults[key as keyof TaskRowFields];
    if (value === undefined) continue;
    writeCell(model, rowId, columnId, toCellValue(model, columnId, spec, value));
  }
  return rowId;
}

/** Read every task row into plain schema fields. */
export function readTasks(handles: TaskDatabaseHandles): TaskRow[] {
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
      taskRowTitle(fields as Partial<TaskRowFields>);
    return { rowId: row.id, title, fields: fields as Partial<TaskRowFields> };
  });
}

/** Organizer edit path: set one field on one task row (inline edit + map drag). */
export function updateTaskField(
  handles: TaskDatabaseHandles,
  rowId: string,
  key: TaskFieldKey,
  value: unknown,
): void {
  const { model, columnIds } = handles;
  const spec = specByKey(key);
  const columnId = columnIds.get(key);
  if (!spec || !columnId) {
    throw new Error(`Unknown task field key: ${key}`);
  }
  writeCell(model, rowId, columnId, toCellValue(model, columnId, spec, value));
}
