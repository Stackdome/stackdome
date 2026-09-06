import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'

/**
 * The popover — a panel anchored to the thing that opened it, for a short piece
 * of work that does not deserve a drawer or a dialog.
 */
const meta = {
  title: 'Primitives/Popover',
  component: Popover,
  tags: ['ai-generated'],
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

const body = () => within(document.body)

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Scale service</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="replicas">Replicas</Label>
            <Input id="replicas" defaultValue="3" />
          </div>
          <Button className="w-full">Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Scale service' }))
    await waitFor(async () => {
      await expect(body().getByLabelText('Replicas')).toBeVisible()
    })
  },
}

/**
 * **12, like every other menu** (§2).
 *
 * This shipped at `rounded-md` — the shadcn default the design pass never
 * reached — while the dropdown and the select panel both sat at `rounded-lg`.
 * Three panels of the same kind, two corners between them, and the odd one out
 * was the one you open from a toolbar. This story holds the primitive to its
 * siblings' number.
 */
export const CornerMatchesTheOtherPanels: Story = {
  render: () => (
    <Popover open>
      <PopoverTrigger asChild>
        <Button variant="outline">Open</Button>
      </PopoverTrigger>
      <PopoverContent align="start">Anchored panel</PopoverContent>
    </Popover>
  ),
  play: async () => {
    await waitFor(async () => {
      const panel = document.querySelector('[data-slot="popover-content"]') as HTMLElement
      await expect(parseFloat(getComputedStyle(panel).borderRadius)).toBe(12)
    })
  },
}

/** Anchored to the right edge, where a row's trailing action opens one. */
export const AlignedToTheEnd: Story = {
  render: () => (
    <div className="flex w-[420px] justify-end">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" shape="flat">
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end">
          <p className="text-meta text-fg-muted">Nothing to filter yet.</p>
        </PopoverContent>
      </Popover>
    </div>
  ),
}
