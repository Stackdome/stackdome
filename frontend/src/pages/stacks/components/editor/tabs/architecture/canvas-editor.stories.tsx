import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { Edge } from '@xyflow/react'
import { withFlow } from '../../../../../../../.storybook/decorators'
import { CanvasEditor, type CanvasFlowNode } from './canvas-editor'
import {
  ATTACHMENT_LABEL,
  NODE_KIND,
  type ResourceNodeData,
} from '@/pages/stacks/lib/canvas/graph-from-connections'

/** The add-resource panel and the pane menu are portalled out of the canvas. */
const panel = () => within(document.body)

function resource(
  id: string,
  data: Partial<ResourceNodeData>,
  position: { x: number; y: number },
): CanvasFlowNode {
  return {
    id: `resource:${id}`,
    type: 'resource',
    position,
    data: {
      kind: NODE_KIND.service,
      name: id,
      kindLabel: 'Service',
      glyph: 'service',
      dotVariant: 'ready',
      summary: 'nginx:1.27',
      volumes: [],
      ...data,
    },
  }
}

function attachment(name: string, position: { x: number; y: number }): CanvasFlowNode {
  return {
    id: `secret:${name}`,
    type: 'attachment',
    position,
    data: { kind: NODE_KIND.secret, name, kindLabel: ATTACHMENT_LABEL[NODE_KIND.secret] },
  }
}

/**
 * Laid out clear of the chrome island. There is no `fitView` here by design, so
 * a node at the origin sits UNDER the toolbar rather than being framed away
 * from it — the stories start the graph below the island instead.
 */
const NODES: CanvasFlowNode[] = [
  resource('web', { glyph: 'web', details: [{ text: 'port 80 · public', port: 80, public: true }] }, { x: 40, y: 170 }),
  resource(
    'postgres',
    { kind: NODE_KIND.addon, kindLabel: 'Postgres', glyph: 'postgres', brandSlug: 'postgres', summary: 'postgres:16' },
    { x: 400, y: 110 },
  ),
  resource(
    'cache',
    { kindLabel: 'Redis', glyph: 'redis', brandSlug: 'redis', summary: 'redis:7.2', dotVariant: 'pending' },
    { x: 400, y: 240 },
  ),
  attachment('api-credentials', { x: 400, y: 360 }),
]

const EDGES: Edge[] = [
  { id: 'e1', source: 'resource:web', target: 'resource:postgres', type: 'connection' },
  { id: 'e2', source: 'resource:web', target: 'resource:cache', type: 'connection' },
  { id: 'e3', source: 'resource:web', target: 'secret:api-credentials', type: 'connection' },
]

/**
 * The architecture surface — React Flow plus the canvas's own chrome.
 *
 * It owns no stack state: nodes and edges are derived upstream and handed in,
 * which keeps the surface a dumb, memo-friendly view. It had no story, so the
 * chrome — the add-resource island, the connections toggle, the pane menu and
 * the **read-only** face the live view uses — could only be seen by driving the
 * whole editor.
 *
 * **There is no `fitView`.** The graph is panned, never re-fitted: the
 * inspector resizes this container by 408 every time it opens, and a re-fit
 * would re-solve the zoom underneath the pan — measured, the scale dipped to
 * 0.9857 and sprang back inside the same 260ms, which reads as the cards
 * breathing rather than as the sheet giving up a column.
 */
const meta = {
  title: 'Features/Canvas/CanvasEditor',
  component: CanvasEditor,
  tags: ['ai-generated'],
  decorators: [
    withFlow,
    (Story) => (
      <div className="h-[420px] w-[760px]">
        <Story />
      </div>
    ),
  ],
  args: {
    nodes: NODES,
    edges: EDGES,
    onNodesChange: fn(),
    onEdgesChange: fn(),
    onNodeClick: fn(),
    onNodeContextMenu: fn(),
    showConnections: true,
    onToggleConnections: fn(),
    onAutoLayout: fn(),
    addedBlockIds: [],
    onAddBlock: fn(),
    addons: [{ id: 'a1', name: 'prod-db' }],
    linkedAddonIds: new Set<string>(),
    onLinkAddon: fn(),
    canAddVolume: true,
    onAddVolume: fn(),
  },
} satisfies Meta<typeof CanvasEditor>

export default meta
type Story = StoryObj<typeof meta>

/** A small graph with its wires drawn. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByTestId('stack-canvas')).toBeVisible()
      await expect(canvas.getByText('web')).toBeVisible()
    })
  },
}

/** **Connections off** — the same graph with the wires hidden, for reading the
 *  parts rather than the topology. */
export const ConnectionsHidden: Story = {
  args: { showConnections: false },
}

/** Nothing added yet. The add-resource island is the only thing on the pane,
 *  which is the point: an empty canvas has exactly one thing to do. */
export const EmptyCanvas: Story = {
  args: { nodes: [], edges: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /Add resource/i })).toBeVisible()
  },
}

/**
 * **A volume cannot be added to an empty canvas.** It has to mount onto a
 * service, so with nothing to mount to the affordance says what is missing
 * rather than simply refusing.
 */
export const EmptyCanvasCannotTakeAVolume: Story = {
  args: { nodes: [], edges: [], canAddVolume: false },
}

/** The catalogue, opened from the island. */
export const AddResourceOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Add resource/i }))
    await waitFor(async () => {
      await expect(panel().getByRole('dialog')).toBeVisible()
    })
  },
}

/**
 * **Read-only — the live view.** Nodes are locked in place and every mutation
 * affordance goes with them: no add-resource island, no pane context menu. A
 * canvas you cannot change must not offer controls that imply you can.
 */
export const ReadOnly: Story = {
  args: { readOnly: true },
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('web')).toBeVisible()
    })
    await expect(canvas.queryByRole('button', { name: /Add resource/i })).not.toBeInTheDocument()
  },
}

/** A graph with a failing service and a draft one — the states the cards carry
 *  read at canvas scale, not just in isolation. */
export const MixedStates: Story = {
  args: {
    nodes: [
      resource('web', { glyph: 'web', dotVariant: 'error' }, { x: 40, y: 170 }),
      resource('worker', { dotVariant: 'neutral', dirtyState: 'new', summary: 'git build' }, { x: 400, y: 170 }),
      resource('cache', { glyph: 'redis', brandSlug: 'redis', summary: 'redis:7.2', dirtyState: 'edited' }, { x: 40, y: 300 }),
      resource('legacy', { dirtyState: 'removed', summary: 'nginx:1.24' }, { x: 400, y: 300 }),
    ],
    edges: [],
  },
}

/** A service with volumes docked to it, on the canvas rather than in isolation. */
export const WithVolumes: Story = {
  args: {
    nodes: [
      resource(
        'web',
        {
          glyph: 'web',
          volumes: [
            { name: 'web-data', mountPath: '/var/lib/data' },
            { name: 'web-cache', mountPath: '/var/cache' },
          ],
        },
        { x: 40, y: 170 },
      ),
    ],
    edges: [],
  },
}
