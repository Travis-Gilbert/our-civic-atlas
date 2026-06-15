import { CaptionedBlockComponent } from '@blocksuite/affine-components/caption';
import { DefaultInlineManagerExtension } from '@blocksuite/affine-inline-preset';
import type { RichText } from '@blocksuite/affine-rich-text';
import { BLOCK_CHILDREN_CONTAINER_PADDING_LEFT } from '@blocksuite/affine-shared/consts';
import { getViewportElement } from '@blocksuite/affine-shared/utils';
import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine/ext-loader';
import { BlockViewExtension, FlavourExtension } from '@blocksuite/std';
import { getInlineRangeProvider, type InlineRangeProvider } from '@blocksuite/std/inline';
import type { BlockModel } from '@blocksuite/affine/store';
import { css, html, nothing, type TemplateResult } from 'lit';
import { query } from 'lit/decorators.js';
import { literal } from 'lit/static-html.js';

import {
  CIVIC_TASK_FLAVOUR,
  type CivicTaskBlockModel,
  type CivicTaskProps,
  type CivicTaskStatus,
} from '../lib/civic/civic-task-schema';

const TASK_STATUSES: readonly CivicTaskStatus[] = [
  'todo',
  'doing',
  'blocked',
  'done',
];

const STATUS_LABEL: Record<CivicTaskStatus, string> = {
  todo: 'To do',
  doing: 'Doing',
  blocked: 'Blocked',
  done: 'Done',
};

/*
 * The task being dragged, shared across every civic-task instance in the one
 * editor bundle. The HTML5 DataTransfer cannot carry a live BlockModel, so the
 * source block records itself here on dragstart and clears on dragend/drop;
 * drop targets read it to call store.moveBlocks. Module scope is safe because
 * the whole editor is a single bundle with one runtime.
 */
let draggingTask: CivicTaskBlockModel | null = null;

/**
 * Friendly due-date label + overdue flag, computed against the start of today.
 * ISO-parseable values become Today / Tomorrow / Yesterday / weekday / "Jun 8";
 * free text that is not a date is shown verbatim and never marked overdue. Runs
 * in the browser (lit component), so new Date() is fine here.
 */
function formatTaskDate(value: string): { label: string; overdue: boolean } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Date-only ISO (YYYY-MM-DD) parses as UTC midnight in `new Date(string)`,
  // which renders a day early in negative-offset zones. Parse it as local.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(trimmed);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[0].slice(0, 4)),
        Number(dateOnly[0].slice(5, 7)) - 1,
        Number(dateOnly[0].slice(8, 10)),
      )
    : new Date(trimmed);
  if (Number.isNaN(date.getTime())) return { label: trimmed, overdue: false };
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const diffDays = Math.round((startOfDate - startOfToday) / 86_400_000);
  if (diffDays === 0) return { label: 'Today', overdue: false };
  if (diffDays === 1) return { label: 'Tomorrow', overdue: false };
  if (diffDays === -1) return { label: 'Yesterday', overdue: true };
  if (diffDays > 1 && diffDays < 7) {
    return {
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      overdue: false,
    };
  }
  return {
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overdue: diffDays < 0,
  };
}

function formatTaskCurrency(amountCents: number): string {
  return (amountCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

export class CivicTaskBlockComponent extends CaptionedBlockComponent<CivicTaskBlockModel> {
  static override styles = css`
    .civic-task-block {
      position: relative;
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) auto;
      gap: 9px;
      align-items: start;
      padding: 7px 8px;
      border: 1px solid transparent;
      border-radius: 7px;
      color: var(--affine-text-primary-color, #1c1c1c);
    }

    .civic-task-block:hover,
    .civic-task-block:focus-within {
      border-color: var(--affine-border-color, #e2e2e2);
      background: var(--civic-task-hover, #fafafa);
    }

    /*
     * Priority-coded checkbox: the native input restyled (keeps keyboard +
     * screen-reader semantics). The 2px border encodes priority; on done it
     * fills with the priority color and shows a white check. The 24px grid
     * cell gives the 18px glyph a >=24px hit target (Fitts).
     */
    .civic-task-check {
      appearance: none;
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      margin: 1px 0 0;
      border: 2px solid var(--civic-priority-normal, #005186);
      border-radius: 5px;
      background-color: #ffffff;
      background-position: center;
      background-repeat: no-repeat;
      background-size: 11px 11px;
      cursor: pointer;
      transition:
        background-color 140ms ease,
        border-color 140ms ease;
    }
    .civic-task-block[data-priority='high'] .civic-task-check {
      border-color: var(--civic-priority-high, #bf5f52);
    }
    .civic-task-block[data-priority='low'] .civic-task-check {
      border-color: var(--civic-priority-low, #9aa7b3);
    }
    .civic-task-check:hover {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.4l2.3 2.3 4.7-5' fill='none' stroke='%23c5c5c5' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    }
    .civic-task-check:checked {
      background-color: var(--civic-priority-normal, #005186);
      border-color: var(--civic-priority-normal, #005186);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.4l2.3 2.3 4.7-5' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    }
    .civic-task-block[data-priority='high'] .civic-task-check:checked {
      background-color: var(--civic-priority-high, #bf5f52);
      border-color: var(--civic-priority-high, #bf5f52);
    }
    .civic-task-block[data-priority='low'] .civic-task-check:checked {
      background-color: var(--civic-priority-low, #9aa7b3);
      border-color: var(--civic-priority-low, #9aa7b3);
    }
    .civic-task-check:focus-visible {
      outline: 2px solid var(--civic-task-ring, #005186);
      outline-offset: 2px;
    }
    .civic-task-check:disabled {
      cursor: default;
      opacity: 0.7;
    }

    .civic-task-main {
      min-width: 0;
    }

    .civic-task-title rich-text {
      display: block;
      min-width: 0;
      color: inherit;
      font-size: 14px;
      line-height: 20px;
    }

    .civic-task-block[data-done='true'] .civic-task-title {
      color: var(--affine-text-disable-color, #c5c5c5);
      text-decoration: line-through;
      text-decoration-thickness: 1px;
    }

    /*
     * Tiered meta line (progressive disclosure: rendered only when fields
     * exist). Friendly dates, overdue heat, navy assignee, quiet glyphs;
     * replaces the prior uppercase-mono pill wall.
     */
    .civic-task-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 10px;
      margin-top: 4px;
      color: var(--civic-meta-fg, #656565);
      font-size: 12px;
      line-height: 16px;
    }
    .civic-task-due {
      font-weight: 600;
    }
    .civic-task-due[data-overdue='true'] {
      color: var(--civic-due-overdue, #a8463a);
    }
    .civic-task-who {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--civic-priority-normal, #005186);
      font-weight: 600;
    }
    .civic-task-glyph {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0.75;
    }

    /*
     * Status chip: the native select, re-skinned as a status-tinted pill.
     * Keeps keyboard + screen-reader semantics; appearance:none drops the
     * native arrow so the closed control reads as a TickTick-style chip.
     */
    .civic-task-controls {
      display: inline-flex;
      align-items: center;
    }
    /*
     * Status chip: a visible label span sized to the CURRENT status (so the
     * pill hugs its text and centers cleanly) with the real <select> overlaid
     * transparently for full keyboard + screen-reader behavior. A bare native
     * select cannot hug the current value (it sizes to the widest option) and
     * does not center its text reliably across browsers.
     */
    .civic-task-status {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 22px;
      padding: 0 10px;
      border-radius: 9999px;
      background: var(--civic-status-todo-bg, #f1f1f1);
      color: var(--civic-status-todo-fg, #454545);
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
    }
    .civic-task-status[data-status='doing'] {
      background: var(--civic-status-doing-bg, #f7eddc);
      color: var(--civic-status-doing-fg, #8a5a16);
    }
    .civic-task-status[data-status='blocked'] {
      background: var(--civic-status-blocked-bg, #f6e3df);
      color: var(--civic-status-blocked-fg, #a8463a);
    }
    .civic-task-status[data-status='done'] {
      background: var(--civic-status-done-bg, #e4f0e6);
      color: var(--civic-status-done-fg, #2f6a3f);
    }
    .civic-task-status:focus-within {
      outline: 2px solid var(--civic-task-ring, #005186);
      outline-offset: 2px;
    }
    .civic-task-status-label {
      pointer-events: none;
    }
    .civic-task-status-native {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: transparent;
      font: inherit;
      opacity: 0;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
    }
    .civic-task-status-native:disabled {
      cursor: default;
    }
    .civic-task-status:has(.civic-task-status-native:disabled) {
      opacity: 0.7;
    }

    /*
     * Row actions, TickTick-style: hidden until the row is hovered or a control
     * inside it is keyboard-focused. The drag handle is absolutely positioned in
     * the left gutter so revealing it never reflows the row; the delete button
     * keeps a reserved slot in the controls cluster so the status chip never
     * shifts on hover. Both stay reachable by keyboard (focus reveals them).
     */
    .civic-task-drag {
      position: absolute;
      left: -22px;
      top: 6px;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 24px;
      padding: 0;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: var(--civic-meta-fg, #9aa0a6);
      cursor: grab;
      opacity: 0;
      transition:
        opacity 120ms ease,
        background-color 120ms ease,
        color 120ms ease;
      touch-action: none;
    }
    .civic-task-drag svg {
      display: block;
      width: 14px;
      height: 14px;
    }
    .civic-task-drag:hover {
      background: var(--civic-task-hover, #efefef);
      color: var(--affine-text-primary-color, #1c1c1c);
    }
    .civic-task-drag:active {
      cursor: grabbing;
    }
    .civic-task-drag:focus-visible {
      outline: 2px solid var(--civic-task-ring, #005186);
      outline-offset: 1px;
    }

    .civic-task-delete {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin-left: 4px;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--civic-meta-fg, #9aa0a6);
      cursor: pointer;
      opacity: 0;
      transition:
        opacity 120ms ease,
        background-color 120ms ease,
        color 120ms ease;
    }
    .civic-task-delete svg {
      display: block;
      width: 15px;
      height: 15px;
    }
    .civic-task-delete:hover {
      background: var(--civic-status-blocked-bg, #f6e3df);
      color: var(--civic-due-overdue, #a8463a);
    }
    .civic-task-delete:focus-visible {
      outline: 2px solid var(--civic-task-ring, #005186);
      outline-offset: 1px;
    }

    /* Reveal the row actions on hover or when keyboard focus is inside the row. */
    .civic-task-block:hover .civic-task-drag,
    .civic-task-block:focus-within .civic-task-drag,
    .civic-task-drag:focus-visible,
    .civic-task-block:hover .civic-task-delete,
    .civic-task-block:focus-within .civic-task-delete,
    .civic-task-delete:focus-visible {
      opacity: 1;
    }

    /* readonly stores get no row actions at all. */
    .civic-task-drag[aria-disabled='true'],
    .civic-task-delete:disabled {
      display: none;
    }

    /* The source row dims while it is being dragged. */
    .civic-task-block[data-dragging='true'] {
      opacity: 0.45;
    }

    /* Drop indicator: a 2px rule on the edge the task would land against. */
    .civic-task-block[data-drop='before']::before,
    .civic-task-block[data-drop='after']::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      border-radius: 2px;
      background: var(--civic-priority-normal, #005186);
      pointer-events: none;
    }
    .civic-task-block[data-drop='before']::before {
      top: -1px;
    }
    .civic-task-block[data-drop='after']::after {
      bottom: -1px;
    }

    @media (prefers-reduced-motion: reduce) {
      .civic-task-check,
      .civic-task-drag,
      .civic-task-delete {
        transition: none;
      }
    }

    .affine-block-children-container {
      grid-column: 2 / -1;
    }
  `;

  private _inlineRangeProvider: InlineRangeProvider | null = null;

  private readonly _stopControlEvent = (event: Event) => {
    event.stopPropagation();
  };

  private readonly _toggleDone = (event: Event) => {
    event.stopPropagation();
    if (this.store.readonly) return;
    const done = !this.model.props.done$.value;
    this.store.captureSync();
    this.store.updateBlock(this.model, {
      done,
      status: done ? 'done' : 'todo',
    } satisfies Partial<CivicTaskProps>);
  };

  private readonly _changeStatus = (event: Event) => {
    event.stopPropagation();
    if (this.store.readonly) return;
    const status = (event.target as HTMLSelectElement).value as CivicTaskStatus;
    this.store.captureSync();
    this.store.updateBlock(this.model, {
      status,
      done: status === 'done',
    } satisfies Partial<CivicTaskProps>);
  };

  @query('.civic-task-block')
  private accessor _blockEl: HTMLDivElement | null = null;

  @query('.civic-task-drag')
  private accessor _dragHandle: HTMLElement | null = null;

  private readonly _deleteTask = (event: Event) => {
    event.stopPropagation();
    if (this.store.readonly) return;
    this.store.captureSync();
    // Default delete removes the task and its subtasks together, matching the
    // single "delete this row" affordance users expect from the trash button.
    this.store.deleteBlock(this.model);
  };

  /** True when `ancestor` sits above `node` in the block tree (guards self/cycle drops). */
  private _isAncestorOf(ancestor: BlockModel, node: BlockModel): boolean {
    let current: BlockModel | null = this.store.getParent(node);
    while (current) {
      if (current === ancestor) return true;
      current = this.store.getParent(current);
    }
    return false;
  }

  // --- Drag source (the handle) -------------------------------------------
  private readonly _onHandlePointerdown = (event: PointerEvent) => {
    // The handle's only job is to seed an HTML5 drag; stop BlockSuite's pointer
    // selection / text caret from engaging underneath it.
    event.stopPropagation();
  };

  private readonly _onHandleDragstart = (event: DragEvent) => {
    if (this.store.readonly) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    draggingTask = this.model;
    if (this._blockEl) this._blockEl.dataset.dragging = 'true';
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // A payload is required for the drag to start in some browsers.
      event.dataTransfer.setData('text/plain', this.model.id);
    }
  };

  private readonly _onHandleDragend = () => {
    draggingTask = null;
    if (this._blockEl) {
      delete this._blockEl.dataset.dragging;
      delete this._blockEl.dataset.drop;
    }
  };

  // --- Drop target (any task row) -----------------------------------------
  private _dropEdge(event: DragEvent): 'before' | 'after' {
    const rect = (this._blockEl ?? this).getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  }

  private _canAccept(): boolean {
    return (
      !this.store.readonly &&
      draggingTask !== null &&
      draggingTask !== this.model &&
      !this._isAncestorOf(draggingTask, this.model)
    );
  }

  private readonly _onBlockDragover = (event: DragEvent) => {
    if (!this._canAccept()) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this._blockEl) this._blockEl.dataset.drop = this._dropEdge(event);
  };

  private readonly _onBlockDragleave = (event: DragEvent) => {
    // Ignore leave events fired while moving onto a descendant of this row.
    const related = event.relatedTarget as Node | null;
    if (related && this.contains(related)) return;
    if (this._blockEl) delete this._blockEl.dataset.drop;
  };

  private readonly _onBlockDrop = (event: DragEvent) => {
    const dragged = draggingTask;
    if (this._blockEl) delete this._blockEl.dataset.drop;
    if (!dragged || !this._canAccept()) return;
    event.preventDefault();
    event.stopPropagation();
    const parent = this.store.getParent(this.model);
    if (!parent) return;
    const before = this._dropEdge(event) === 'before';
    this.store.captureSync();
    this.store.moveBlocks([dragged], parent, this.model, before);
  };

  // --- Keyboard reorder (accessible parity for the handle) ----------------
  private readonly _onHandleKeydown = (event: KeyboardEvent) => {
    if (this.store.readonly) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const parent = this.store.getParent(this.model);
    if (!parent) return;
    const siblings = parent.children;
    const index = siblings.indexOf(this.model);
    if (index < 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'ArrowUp') {
      if (index === 0) return;
      this.store.captureSync();
      this.store.moveBlocks([this.model], parent, siblings[index - 1], true);
    } else {
      if (index >= siblings.length - 1) return;
      this.store.captureSync();
      this.store.moveBlocks([this.model], parent, siblings[index + 1], false);
    }
    // Keep focus on the handle so repeated arrow presses keep moving the task.
    requestAnimationFrame(() => this._dragHandle?.focus());
  };

  get inlineManager() {
    return this.std.get(DefaultInlineManagerExtension.identifier);
  }

  override connectedCallback() {
    super.connectedCallback();
    this._inlineRangeProvider = getInlineRangeProvider(this);
  }

  override async getUpdateComplete() {
    const result = await super.getUpdateComplete();
    await this._richTextElement?.updateComplete;
    return result;
  }

  override renderBlock(): TemplateResult<1> {
    const done = this.model.props.done$.value;
    const status = this.model.props.status$.value;
    const priority = this.model.props.priority$.value;
    const owner = this.model.props.owner$.value;
    const dueAt = this.model.props.dueAt$.value;
    const startsAt = this.model.props.startsAt$.value;
    const contact = this.model.props.contact$.value;
    const locationLabel = this.model.props.locationLabel$.value;
    const amountCents = this.model.props.amountCents$.value;
    const notes = this.model.props.notes$.value;
    const childCount = this.model.children.length;

    // Due drives the date chip; starts only fills in when there is no due, so
    // a task shows at most one date (TickTick reads one date per row).
    const due = dueAt ? formatTaskDate(dueAt) : null;
    const starts = !due && startsAt ? formatTaskDate(startsAt) : null;
    const hasMeta =
      Boolean(due || starts || owner || locationLabel || contact) ||
      typeof amountCents === 'number' ||
      childCount > 0 ||
      notes.trim().length > 0;

    const children = html`<div
      class="affine-block-children-container"
      style="padding-left: ${BLOCK_CHILDREN_CONTAINER_PADDING_LEFT}px"
    >
      ${this.renderChildren(this.model)}
    </div>`;

    return html`
      <div
        class="civic-task-block"
        data-done=${done ? 'true' : 'false'}
        data-priority=${priority}
        data-status=${status}
        @dragover=${this._onBlockDragover}
        @dragleave=${this._onBlockDragleave}
        @drop=${this._onBlockDrop}
      >
        <span
          class="civic-task-drag"
          role="button"
          tabindex=${this.store.readonly ? -1 : 0}
          aria-label="Reorder task. Drag, or focus and use the up and down arrow keys."
          aria-disabled=${this.store.readonly ? 'true' : 'false'}
          title="Drag to reorder"
          draggable=${this.store.readonly ? 'false' : 'true'}
          @pointerdown=${this._onHandlePointerdown}
          @dragstart=${this._onHandleDragstart}
          @dragend=${this._onHandleDragend}
          @keydown=${this._onHandleKeydown}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
            <circle cx="6" cy="4" r="1.4"></circle>
            <circle cx="10" cy="4" r="1.4"></circle>
            <circle cx="6" cy="8" r="1.4"></circle>
            <circle cx="10" cy="8" r="1.4"></circle>
            <circle cx="6" cy="12" r="1.4"></circle>
            <circle cx="10" cy="12" r="1.4"></circle>
          </svg>
        </span>
        <input
          class="civic-task-check"
          type="checkbox"
          aria-label="Mark task complete"
          ?checked=${done}
          ?disabled=${this.store.readonly}
          @click=${this._toggleDone}
          @pointerdown=${this._stopControlEvent}
        />
        <div class="civic-task-main">
          <div class="civic-task-title">
            <rich-text
              .yText=${this.model.props.text$.value.yText}
              .inlineEventSource=${this.rootComponent ?? nothing}
              .undoManager=${this.store.history.undoManager}
              .attributeRenderer=${this.inlineManager.getRenderer()}
              .attributesSchema=${this.inlineManager.getSchema()}
              .markdownMatches=${this.inlineManager.markdownMatches}
              .embedChecker=${this.inlineManager.embedChecker}
              .readonly=${this.store.readonly}
              .inlineRangeProvider=${this._inlineRangeProvider}
              .enableClipboard=${false}
              .enableUndoRedo=${false}
              .verticalScrollContainerGetter=${() => getViewportElement(this.host)}
            ></rich-text>
          </div>
          ${hasMeta
            ? html`<div class="civic-task-meta">
                ${due
                  ? html`<span
                      class="civic-task-due"
                      data-overdue=${due.overdue ? 'true' : 'false'}
                      >${due.overdue ? `${due.label} · overdue` : due.label}</span
                    >`
                  : nothing}
                ${starts
                  ? html`<span class="civic-task-due">Starts ${starts.label}</span>`
                  : nothing}
                ${owner
                  ? html`<span class="civic-task-who">@${owner}</span>`
                  : nothing}
                ${locationLabel
                  ? html`<span class="civic-task-glyph">${locationLabel}</span>`
                  : nothing}
                ${contact
                  ? html`<span class="civic-task-glyph">${contact}</span>`
                  : nothing}
                ${typeof amountCents === 'number'
                  ? html`<span class="civic-task-glyph"
                      >${formatTaskCurrency(amountCents)}</span
                    >`
                  : nothing}
                ${childCount > 0
                  ? html`<span class="civic-task-glyph"
                      >${childCount} subtask${childCount === 1 ? '' : 's'}</span
                    >`
                  : nothing}
                ${notes.trim().length > 0
                  ? html`<span class="civic-task-glyph" aria-label="Has notes"
                      >note</span
                    >`
                  : nothing}
              </div>`
            : nothing}
        </div>
        <div class="civic-task-controls">
          <span class="civic-task-status" data-status=${status}>
            <span class="civic-task-status-label">${STATUS_LABEL[status]}</span>
            <select
              class="civic-task-status-native"
              aria-label="Task status"
              .value=${status}
              ?disabled=${this.store.readonly}
              @change=${this._changeStatus}
              @click=${this._stopControlEvent}
              @pointerdown=${this._stopControlEvent}
            >
              ${TASK_STATUSES.map(
                (option) =>
                  html`<option value=${option}>${STATUS_LABEL[option]}</option>`,
              )}
            </select>
          </span>
          <button
            class="civic-task-delete"
            type="button"
            aria-label="Delete task"
            title="Delete task"
            ?disabled=${this.store.readonly}
            @click=${this._deleteTask}
            @pointerdown=${this._stopControlEvent}
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 4.5h10"></path>
              <path d="M6.5 4.5V3.2c0-.4.3-.7.7-.7h1.6c.4 0 .7.3.7.7V4.5"></path>
              <path d="M4.4 4.5l.5 8c0 .6.5 1 1 1h4.2c.5 0 1-.4 1-1l.5-8"></path>
              <path d="M6.7 7.2v3.6"></path>
              <path d="M9.3 7.2v3.6"></path>
            </svg>
          </button>
        </div>
        ${children}
      </div>
    `;
  }

  @query('rich-text')
  private accessor _richTextElement: RichText | null = null;

  override accessor blockContainerStyles = {
    margin: 'var(--affine-list-margin, 6px 0)',
  };
}

export function civicTaskEffects() {
  if (!customElements.get('civic-task')) {
    customElements.define('civic-task', CivicTaskBlockComponent);
  }
}

export class CivicTaskViewExtension extends ViewExtensionProvider {
  override name = 'civic-task-block';

  override effect() {
    super.effect();
    civicTaskEffects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    context.register([
      FlavourExtension(CIVIC_TASK_FLAVOUR),
      BlockViewExtension(CIVIC_TASK_FLAVOUR, literal`civic-task`),
    ]);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'civic-task': CivicTaskBlockComponent;
  }
}
