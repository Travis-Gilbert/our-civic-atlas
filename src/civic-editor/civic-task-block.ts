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

export class CivicTaskBlockComponent extends CaptionedBlockComponent<CivicTaskBlockModel> {
  static override styles = css`
    .civic-task-block {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr) auto;
      gap: 8px;
      align-items: start;
      padding: 7px 8px;
      border: 1px solid transparent;
      border-radius: 5px;
      color: #1c1c1c;
    }

    .civic-task-block:hover,
    .civic-task-block:focus-within {
      border-color: #e2e2e2;
      background: #fafafa;
    }

    .civic-task-check {
      width: 16px;
      height: 16px;
      margin: 3px 0 0;
      accent-color: #005186;
      cursor: pointer;
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
      color: #777777;
      text-decoration: line-through;
      text-decoration-thickness: 1px;
    }

    .civic-task-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 4px;
      color: #656565;
      font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .civic-task-pill {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .civic-task-controls {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .civic-task-select {
      height: 24px;
      border: 1px solid #d7d7d7;
      border-radius: 9999px;
      background: #ffffff;
      color: #454545;
      font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
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

    const children = html`<div
      class="affine-block-children-container"
      style="padding-left: ${BLOCK_CHILDREN_CONTAINER_PADDING_LEFT}px"
    >
      ${this.renderChildren(this.model)}
    </div>`;

    return html`
      <div class="civic-task-block" data-done=${done ? 'true' : 'false'}>
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
          <div class="civic-task-meta">
            ${priority !== 'normal'
              ? html`<span class="civic-task-pill">${priority}</span>`
              : nothing}
            ${owner ? html`<span class="civic-task-pill">${owner}</span>` : nothing}
            ${startsAt
              ? html`<span class="civic-task-pill">${startsAt}</span>`
              : nothing}
            ${dueAt ? html`<span class="civic-task-pill">${dueAt}</span>` : nothing}
            ${contact
              ? html`<span class="civic-task-pill">${contact}</span>`
              : nothing}
            ${locationLabel
              ? html`<span class="civic-task-pill">${locationLabel}</span>`
              : nothing}
            ${typeof amountCents === 'number'
              ? html`<span class="civic-task-pill"
                  >${(amountCents / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}</span
                >`
              : nothing}
          </div>
        </div>
        <div class="civic-task-controls">
          <select
            class="civic-task-select"
            aria-label="Task status"
            .value=${status}
            ?disabled=${this.store.readonly}
            @change=${this._changeStatus}
            @click=${this._stopControlEvent}
            @pointerdown=${this._stopControlEvent}
          >
            ${TASK_STATUSES.map(
              (option) => html`<option value=${option}>${option}</option>`,
            )}
          </select>
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
