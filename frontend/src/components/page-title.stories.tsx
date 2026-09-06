import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { PageTitle } from './page-title'
import { RenameableTitle } from './renameable-title'

const meta = {
  title: 'Primitives/PageTitle',
  component: PageTitle,
  tags: ['ai-generated'],
} satisfies Meta<typeof PageTitle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'orders-api' },
}

/**
 * **The story that exists to stop one bug coming back.**
 *
 * The trail's last segment has two shapes — a fixed name and a renameable one —
 * and they shipped at different sizes for as long as each carried its own
 * classes. On `/stacks/s5` that read as `Stacks` at 14/20 beside
 * `auth-gateway` at 16/24, one separator apart.
 *
 * Rendering them side by side is not the test; **asserting they compute the
 * same** is. A screenshot of this pair would have looked fine to anyone who
 * did not already know the answer, which is exactly how the original drift
 * survived a redesign.
 */
export const BothShapesMatch: Story = {
  args: { children: 'orders-api' },
  render: () => (
    <div className="flex items-center gap-4">
      <PageTitle>orders-api</PageTitle>
      <RenameableTitle name="orders-api" onRename={async () => {}} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fixed = canvasElement.querySelector('[data-slot="page-title"]') as HTMLElement
    const renameable = canvas.getByRole('button', { name: /Rename orders-api/ })

    const a = getComputedStyle(fixed)
    const b = getComputedStyle(renameable)

    // The rung itself, so a wrong value fails rather than merely differing.
    await expect(a.fontSize).toBe('14px')
    await expect(a.fontWeight).toBe('500')

    // And the two shapes agree — this is what actually broke.
    await expect(b.fontSize).toBe(a.fontSize)
    await expect(b.fontWeight).toBe(a.fontWeight)
  },
}

/**
 * A name with nowhere to break, at the width the sheet header actually gives
 * it. The title truncates; it never pushes the row's fact off the far edge.
 */
export const LongName: Story = {
  args: { children: 'orders-api-staging-eu-west-1-canary' },
  render: (args) => (
    <div className="w-[280px] truncate">
      <PageTitle className="truncate">{args.children}</PageTitle>
    </div>
  ),
}
