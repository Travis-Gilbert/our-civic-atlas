import {
  type StoreExtensionContext,
  StoreExtensionProvider,
} from '@blocksuite/affine/ext-loader';
import {
  BlockModel,
  BlockSchemaExtension,
  defineBlockSchema,
  type Text,
} from '@blocksuite/affine/store';

export const CIVIC_TASK_FLAVOUR = 'civic:task';

export type CivicTaskStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type CivicTaskPriority = 'low' | 'normal' | 'high';

export interface CivicTaskProps {
  text: Text;
  done: boolean;
  status: CivicTaskStatus;
  priority: CivicTaskPriority;
  owner: string;
  dueAt: string;
  startsAt: string;
  contact: string;
  locationLabel: string;
  linkedCivicObjectId: string;
  sourceId: string;
  amountCents: number | null;
  notes: string;
  'meta:createdAt'?: string;
  'meta:createdBy'?: string;
  'meta:updatedAt'?: string;
  'meta:updatedBy'?: string;
}

export class CivicTaskBlockModel extends BlockModel<CivicTaskProps> {
  override isEmpty(): boolean {
    return this.props.text$.value.length === 0 && this.children.length === 0;
  }
}

export const CivicTaskBlockSchema = defineBlockSchema({
  flavour: CIVIC_TASK_FLAVOUR,
  props: (internal): CivicTaskProps => ({
    text: internal.Text(),
    done: false,
    status: 'todo',
    priority: 'normal',
    owner: '',
    dueAt: '',
    startsAt: '',
    contact: '',
    locationLabel: '',
    linkedCivicObjectId: '',
    sourceId: '',
    amountCents: null,
    notes: '',
    'meta:createdAt': undefined,
    'meta:createdBy': undefined,
    'meta:updatedAt': undefined,
    'meta:updatedBy': undefined,
  }),
  metadata: {
    version: 1,
    role: 'content',
    parent: ['affine:note', CIVIC_TASK_FLAVOUR],
    children: [CIVIC_TASK_FLAVOUR, 'affine:paragraph'],
  },
  toModel: () => new CivicTaskBlockModel(),
});

export const CivicTaskBlockSchemaExtension =
  BlockSchemaExtension(CivicTaskBlockSchema);

export class CivicTaskStoreExtension extends StoreExtensionProvider {
  override name = 'civic-task-block';

  override setup(context: StoreExtensionContext) {
    super.setup(context);
    context.register(CivicTaskBlockSchemaExtension);
  }
}
