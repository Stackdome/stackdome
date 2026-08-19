import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { ReactFlowProvider } from '@xyflow/react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { CanvasControls } from './canvas-controls'

const meta = {
  title: 'Features/Canvas/CanvasControls',
  component: CanvasControls,
  tags: ['ai-generated'],
  // Zoom actions need a flow store. The frame is `surface-canvas` because the
  // islands are white cards and there is nothing to judge about them on a white
  // story background — the whole point of the material is that it floats.
  decorators: [
    (Story) => (
      <SidebarProvider>
        <ReactFlowProvider>
          <div className="bg-surface-canvas relative h-40 w-[420px]">
            <Story />
          </div>
        </ReactFlowProvider>
      </SidebarProvider>
    ),
  ],
  args: {
    showConnections: true,
    onToggleConnections: fn(),
    onAutoLayout: fn(),
  },
} satisfies Meta<typeof CanvasControls>

export default meta
type Story = StoryObj<typeof meta>

/**
 * **Three islands, sorted by what each acts on** — the viewport, the drawing,
 * the stack's contents. Card ground, hairline and `shadow-sm`, 8 apart; 28px
 * cells in a 32px well.
 */
export const Default: Story = {
  render: (args) => (
    <CanvasControls {...args}>
      <button type="button" className="px-2 text-body font-medium">
        Add resource
      </button>
    </CanvasControls>
  ),
}

/**
 * The one STATE in the group, off. On, it holds `--wash-selected`; off, it has
 * only a hover offer — the two used to be the same 6% and were indistinguishable.
 */
export const ConnectionsHidden: Story = {
  args: { showConnections: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Show connections' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  },
}

/**
 * The readout is the only way back to 1:1, and it is a fixed 56 wide so the
 * island never resizes as the number gains or loses a digit.
 */
export const ZoomReadoutResets: Story = {
  play: async ({ canvas }) => {
    const readout = canvas.getByRole('button', { name: 'Reset zoom to 100%' })
    await expect(readout).toHaveTextContent('100%')
    await expect(readout).toHaveClass(/w-14/)
  },
}
