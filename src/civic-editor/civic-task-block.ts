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

    @media (prefers-reduced-motion: reduce) {
      .civic-task-check {
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
      >
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
