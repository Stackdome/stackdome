import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Button } from '@/components/ui/button'
import { BlockedAction } from './blocked-action'
import { DangerZone, DangerZoneRow } from './danger-zone'

const meta = {
  title: 'Branded/DangerZone',
  component: DangerZone,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="mx-auto w-[440px] bg-card p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DangerZone>

export default meta
type Story = StoryObj<typeof meta>

const removeButton = (
  <Button variant="destructive-ghost" shape="flat">
    Remove repository
  </Button>
)

/**
 * **Two materials: the tint is the frame, the card is the object.** Flat — the
 * row sitting straight on the tint — the heading, the act and the consequence
 * were all on one plane and none of them was ranked. The card gives the block a
 * subject and leaves the tint saying what kind of region you have reached.
 */
export const OneAct: Story = {
  args: {
    children: (
      <DangerZoneRow
        title="Remove from previews"
        description="Pull requests stop getting environments."
        action={removeButton}
      />
    ),
  },
  play: async ({ canvas }) => {
    const zone = canvas.getByRole('heading', { name: 'Danger zone' }).parentElement!
    await expect(zone.className).toContain('bg-danger-bg')
    // Fill, no border — §7: the fill carries the tone alone.
    await expect(zone.className).not.toContain('border')
    const card = zone.lastElementChild as HTMLElement
    await expect(card.className).toContain('bg-card')
    await expect(card.className).toContain('shadow-sm')
  },
}

/**
 * **The heading names the REGION, not the row.** So it does not change when the
 * card holds two acts — leaving and deleting are both things that end your
 * relationship with the object. Rows divide with a hairline and nothing else,
 * and the first one never draws it: a rule under the card's own top edge is a
 * line drawn on a corner.
 */
export const TwoActs: Story = {
  args: {
    children: (
      <>
        <DangerZoneRow
          title="Leave workspace"
          description="Remove yourself from this workspace."
          action={
            <Button variant="destructive-ghost" shape="flat">
              Leave workspace
            </Button>
          }
        />
        <DangerZoneRow
          title="Delete workspace"
          description="Every stack, secret and cluster in it stops serving."
          action={
            <Button variant="destructive-ghost" shape="flat">
              Delete workspace
            </Button>
          }
        />
      </>
    ),
  },
  play: async ({ canvas }) => {
    const rows = canvas.getAllByText(/workspace$/).map((n) => n.closest('.border-t')!)
    await expect(canvas.getAllByRole('heading', { name: /danger/i })).toHaveLength(1)
    // Only the second row draws the rule.
    await expect(rows[0].className).toContain('first:border-t-0')
  },
}

/**
 * **Nothing is disabled without saying why.** The API refuses to remove a
 * repository while environments are running, so the row states it before the
 * click rather than after the confirm.
 */
export const BlockedWithAReason: Story = {
  args: {
    children: (
      <DangerZoneRow
        title="Remove from previews"
        description="Pull requests stop getting environments."
        action={
          <BlockedAction reason="Delete this repository's 3 environments first">
            {removeButton}
          </BlockedAction>
        }
      />
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /remove repository/i })).toBeDisabled()
  },
}

/** A row with no consequence worth stating keeps its title alone — the block
 *  does not grow a placeholder line to fill the space. */
export const TitleOnly: Story = {
  args: {
    children: <DangerZoneRow title="Reset API keys" action={removeButton} />,
  },
}
