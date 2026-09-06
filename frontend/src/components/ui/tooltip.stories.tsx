import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import { Button } from './button'

/**
 * The tooltip — a label for a control whose glyph does not say enough, and the
 * body of a `HelpTip`.
 *
 * `Tooltip` mounts its own `TooltipProvider`, so a single tooltip needs no
 * wrapper. It opens with **no delay**: a hover hint that makes you wait is a
 * hint you stop trusting.
 */
const meta = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  tags: ['ai-generated'],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

const body = () => within(document.body)

export const Default: Story = {
  render: () => (
    <div className="p-16">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="About this stack">
            <Info />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Deployed 12 minutes ago</TooltipContent>
      </Tooltip>
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole('button', { name: 'About this stack' }))
    await waitFor(async () => {
      await expect(body().getAllByText('Deployed 12 minutes ago')[0]).toBeVisible()
    })
  },
}

/** All four sides, so the arrow and the slide-in are checkable in one frame. */
export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-10 p-20">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side} open>
          <TooltipTrigger asChild>
            <Button variant="outline">{side}</Button>
          </TooltipTrigger>
          <TooltipContent side={side}>On the {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
}

/**
 * **`text-balance`, not a wall.** Long guidance is the reason a tooltip exists
 * at all, so the panel balances its lines rather than running one long ragged
 * edge — and it stays at `text-meta`, because a tooltip is an aside and never
 * the loudest thing on the screen.
 */
export const LongText: Story = {
  render: () => (
    <div className="p-20">
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="What is a stack?">
            <Info />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          A stack is your app and everything it needs to run — services,
          databases and domains — deployed together from a Git branch.
        </TooltipContent>
      </Tooltip>
    </div>
  ),
}
