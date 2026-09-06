import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { NODE_KIND, type ResourceNodeData } from '@/pages/stacks/lib/canvas/graph-from-connections'
import { FlowHarness } from '../../../../../../../../.storybook/decorators'
import type { ResourceFlowNode } from './resource-node'

const meta = {
  title: 'Features/Canvas/ResourceNode',
  tags: ['ai-generated'],
} satisfies Meta

export default meta
type Story = StoryObj

function node(data: Partial<ResourceNodeData>, overrides: Partial<ResourceFlowNode> = {}): ResourceFlowNode {
  return {
    id: 'resource:web',
    type: 'resource',
    position: { x: 0, y: 0 },
    data: {
      kind: NODE_KIND.service,
      name: 'web',
      kindLabel: 'Web',
      glyph: 'web',
      dotVariant: 'ready',
      summary: 'nginx:1.27',
      volumes: [],
      ...data,
    },
    ...overrides,
  }
}

export const Web: Story = {
  render: () => (
    <FlowHarness
      nodes={[
        node({
          details: [{ text: 'port 80 · public', port: 80, public: true }],
          portUrls: { 80: 'https://web.example.com' },
        }),
      ]}
    />
  ),
}

export const Postgres: Story = {
  render: () => (
    <FlowHarness
      nodes={[
        node({
          kind: NODE_KIND.addon,
          name: 'postgres',
          kindLabel: 'Postgres',
          glyph: 'postgres',
          brandSlug: 'postgres',
          summary: 'postgres:16',
        }),
      ]}
    />
  ),
}

export const Redis: Story = {
  render: () => (
    <FlowHarness
      nodes={[
        node({
          name: 'cache',
          kindLabel: 'Redis',
          glyph: 'redis',
          brandSlug: 'redis',
          summary: 'redis:7.2',
          details: [{ text: 'port 6379 · internal', port: 6379, public: false }],
        }),
      ]}
    />
  ),
}

export const GitBuildPending: Story = {
  render: () => (
    <FlowHarness
      nodes={[
        node({
          name: 'api',
          kindLabel: 'Service',
          glyph: 'service',
          summary: 'git build',
          dotVariant: 'pending',
        }),
      ]}
    />
  ),
}

export const WithVolumes: Story = {
  render: () => (
    <FlowHarness
      nodes={[
        node({
          volumes: [
            { name: 'web-data', mountPath: '/var/lib/data' },
            { name: 'web-cache', mountPath: '/var/cache' },
          ],
        }),
      ]}
    />
  ),
}

export const Selected: Story = {
  render: () => <FlowHarness nodes={[node({}, { selected: true })]} />,
}

export const LongName: Story = {
  render: () => (
    <FlowHarness
      nodes={[
        node({
          name: 'extremely-long-service-name-that-truncates',
          summary: 'registry.example.com/platform-team/very-long-image-name:2026.07.31-rc1',
        }),
      ]}
    />
  ),
}

export const DirtyEdited: Story = {
  render: () => <FlowHarness nodes={[node({ dirtyState: 'edited' })]} />,
}

/**
 * **Every card at rest draws the same line.**
 *
 * A dirty card used to take `--border-strong` (18%) while a clean one took
 * `--border-subtle` (6%), so two cards side by side — one `Failed`, one `Edited`
 * — drew visibly different borders and nothing on either explained why the
 * *edited* one was the heavier. The draft word in the header slot already
 * carries that fact. 18% is also the hover token, so an unsaved card at rest was
 * drawn identically to a clean card under the pointer.
 */
export const OneLineAtRest: Story = {
  render: () => (
    <FlowHarness
      nodes={[
        node({ name: 'clean' }),
        node({ name: 'failed', dotVariant: 'error' }, { id: 'resource:failed', position: { x: 0, y: 120 } }),
        node({ name: 'edited', dirtyState: 'edited' }, { id: 'resource:edited', position: { x: 0, y: 240 } }),
        node({ name: 'added', dirtyState: 'new', dotVariant: 'neutral' }, { id: 'resource:added', position: { x: 0, y: 360 } }),
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const cards = [...canvasElement.querySelectorAll('.react-flow__node > div')] as HTMLElement[]
    await expect(cards).toHaveLength(4)
    const colours = new Set(cards.map((c) => getComputedStyle(c).outlineColor))
    await expect(colours.size).toBe(1)
    // 11%, `--border`, the hairline rung — and not the 18% hover token, which
    // is the point of the assertion. It read 6% until Aug 2026: on a canvas the
    // node is the only object there is, and 6% measured lighter than the dot
    // grid it stands on.
    await expect([...colours][0]).toBe('rgba(53, 35, 0, 0.11)')
    // And the draft state is still said, in the slot that says it.
    await expect(canvasElement.textContent).toContain('Edited')
  },
}

/** `removed` keeps its tone. Red is not a weight — it is the instrument the
 *  `Failed` word already uses, and 60% opacity cannot say it alone. */
export const RemovedKeepsItsTone: Story = {
  render: () => <FlowHarness nodes={[node({ dirtyState: 'removed', dotVariant: 'neutral' })]} />,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('.react-flow__node > div') as HTMLElement
    const s = getComputedStyle(card)
    await expect(s.outlineColor).not.toBe('rgba(53, 35, 0, 0.06)')
    await expect(s.opacity).toBe('0.6')
  },
}

export const Removed: Story = {
  render: () => <FlowHarness nodes={[node({ dirtyState: 'removed', dotVariant: 'neutral' })]} />,
}
