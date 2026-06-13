import { Text, type Store, type Workspace } from '@blocksuite/affine/store';

import {
  CIVIC_TASK_FLAVOUR,
  type CivicTaskPriority,
  type CivicTaskProps,
  type CivicTaskStatus,
} from './civic-task-schema';

export type CivicWorkspaceDocKind =
  | 'applications'
  | 'tasks'
  | 'note'
  | 'todo-list';

export interface CivicDocSummary {
  id: string;
  title: string;
  kind: CivicWorkspaceDocKind;
}

export interface CivicTaskSeed {
  text: string;
  status?: CivicTaskStatus;
  priority?: CivicTaskPriority;
  owner?: string;
  dueAt?: string;
  startsAt?: string;
  contact?: string;
  locationLabel?: string;
  linkedCivicObjectId?: string;
  sourceId?: string;
  amountCents?: number | null;
  notes?: string;
}

export const CIVIC_NOTES_DOC_ID = 'civic:notes:porchfest-2026';

export const SEEDED_DOCS_MAP_KEY = 'civic:seeded-docs';
const DOC_KIND_MAP_KEY = 'civic:doc-kinds';

function ensureMeta(collection: Workspace) {
  if (!collection.meta.docMetas) collection.meta.initialize();
}

function kindMap(collection: Workspace) {
  return collection.doc.getMap<CivicWorkspaceDocKind>(DOC_KIND_MAP_KEY);
}

export function setCivicDocKind(
  collection: Workspace,
  docId: string,
  kind: CivicWorkspaceDocKind,
) {
  kindMap(collection).set(docId, kind);
}

export function readCivicDocKind(
  collection: Workspace,
  docId: string,
  applicationsDocId: string,
): CivicWorkspaceDocKind {
  if (docId === applicationsDocId) return 'applications';
  if (docId.startsWith('civic:tasks:')) return 'tasks';
  const recorded = kindMap(collection).get(docId);
  if (recorded) return recorded;
  return docId.startsWith('civic:todo:') ? 'todo-list' : 'note';
}

function newWorkspaceDoc(collection: Workspace, docId: string, title: string) {
  ensureMeta(collection);
  const doc = collection.createDoc(docId);
  const store = doc.getStore({ id: docId });
  if (!doc.loaded) doc.load();
  const rootId = store.addBlock('affine:page', { title: new Text(title) });
  store.addBlock('affine:surface', {}, rootId);
  const noteId = store.addBlock('affine:note', {}, rootId);
  collection.meta.setDocMeta(docId, { title });
  return { store, noteId };
}

export function addCivicTaskBlock(
  store: Store,
  parentId: string,
  task: CivicTaskSeed,
): string {
  const props: Partial<CivicTaskProps> = {
    text: new Text(task.text),
    status: task.status ?? 'todo',
    priority: task.priority ?? 'normal',
    owner: task.owner ?? '',
    dueAt: task.dueAt ?? '',
    startsAt: task.startsAt ?? '',
    contact: task.contact ?? '',
    locationLabel: task.locationLabel ?? '',
    linkedCivicObjectId: task.linkedCivicObjectId ?? '',
    sourceId: task.sourceId ?? '',
    amountCents: task.amountCents ?? null,
    notes: task.notes ?? '',
  };
  props.done = props.status === 'done';
  return store.addBlock(CIVIC_TASK_FLAVOUR, props, parentId);
}

export function createOrganizerNoteDoc(
  collection: Workspace,
  docId: string,
  title: string,
  tasks: readonly CivicTaskSeed[] = [],
): string {
  const { store, noteId } = newWorkspaceDoc(collection, docId, title);
  store.addBlock('affine:paragraph', { text: new Text('') }, noteId);
  for (const task of tasks) {
    addCivicTaskBlock(store, noteId, task);
  }
  setCivicDocKind(collection, docId, 'note');
  return docId;
}

export function createCivicTaskListDoc(
  collection: Workspace,
  docId: string,
  title: string,
  tasks: readonly CivicTaskSeed[] = [{ text: 'New task' }],
): string {
  const { store, noteId } = newWorkspaceDoc(collection, docId, title);
  for (const task of tasks) {
    addCivicTaskBlock(store, noteId, task);
  }
  setCivicDocKind(collection, docId, 'todo-list');
  return docId;
}

export function listCivicWorkspaceDocs(
  collection: Workspace,
  applicationsDocId: string,
): CivicDocSummary[] {
  const metas = collection.meta.docMetas ?? [];
  const summaries: CivicDocSummary[] = [];
  for (const meta of metas) {
    const id = (meta as { id: string }).id;
    const title = (meta as { title?: string }).title;
    const kind = readCivicDocKind(collection, id, applicationsDocId);
    summaries.push({
      id,
      title:
        title && title.trim() !== ''
          ? title
          : kind === 'applications'
            ? 'Applications'
            : kind === 'tasks'
              ? 'Tasks'
              : kind === 'todo-list'
                ? 'Untitled to-do list'
                : 'Untitled note',
      kind,
    });
  }
  summaries.sort((a, b) => {
    const order = {
      applications: 0,
      tasks: 1,
      'todo-list': 2,
      note: 3,
    } satisfies Record<CivicWorkspaceDocKind, number>;
    return order[a.kind] === order[b.kind]
      ? a.title.localeCompare(b.title)
      : order[a.kind] - order[b.kind];
  });
  return summaries;
}
