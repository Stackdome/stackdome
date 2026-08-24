import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { AddResourcePopover } from './add-resource-popover'

/** The panel is portalled, so `canvas` cannot see it. */
const panel = () => within(document.body)

const ADDONS = [
  { id: 'a1', name: 'prod-db' },
  { id: 'a2', name: 'sessions-cache' },
  { id: 'a3', name: 'analytics-warehouse' },
]

/**
 * "+ Add resource" — the canvas's one way in, and the same catalogue the
 * create-stack drawer shows.
 *
 * **It stays open after an add**, so several blocks can be dropped in a row.
 * The panel is 272 — 248 of row plus 12 either side, measured off the widest
 * line in the catalogue — not the 560 it shipped with, which was two columns'
 * worth of room for a list you scan straight down.
 */
const meta = {
  title: 'Features/Canvas/AddResourcePopover',
  component: AddResourcePopover,
  tags: ['ai-generated'],
  args: {
    addedIds: [],
    onAdd: fn(),
    addons: [],
    linkedAddonIds: new Set<string>(),
    onLinkAddon: fn(),
    canAddVolume: true,
    onAddVolume: fn(),
  },
  decorators: [
    (Story) => (
      // The canvas island the trigger actually lives in: 2px of padding around
      // a 28px cell.
      <div className="p-8">
        <div className="inline-flex rounded-lg bg-surface-node p-0.5 outline outline-1 outline-border shadow-md">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof AddResourcePopover>

export default meta
type Story = StoryObj<typeof meta>

/** Closed — the cell as it sits in the canvas island. */
export const Closed: Story = {}

/** The catalogue. */
export const Open: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Add resource/i }))
    await waitFor(async () => {
      await expect(panel().getByRole('dialog')).toBeVisible()
    })
  },
}

/**
 * **An add-on row is an OPTION, not a button.** A link can be undone, so the
 * row carries state — block rows stay buttons, because a click there is the
 * whole act and there is nothing to report afterwards.
 */
export const ManagedAddonsAreOptions: Story = {
  args: { addons: ADDONS },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Add resource/i }))
    await waitFor(async () => {
      await expect(panel().getByRole('option', { name: /prod-db/i })).toBeVisible()
    })
  },
}

/** An add-on already linked reports itself as selected rather than vanishing —
 *  the list keeps its shape between the two states. */
export const AnAddonAlreadyLinked: Story = {
  args: { addons: ADDONS, linkedAddonIds: new Set(['a1']) },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Add resource/i }))
    await waitFor(async () => {
      await expect(panel().getByRole('option', { name: /prod-db/i })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
  },
}

/**
 * Searching narrows the catalogue. The row is the shared `SearchField` at
 * `bare` — no ring, no border, because this field is focused from the first
 * frame to the last and a ring that is always lit reports nothing. It carries
 * an explicit `role="combobox"` so it can steer the list it is not inside.
 */
export const Searching: Story = {
  args: { addons: ADDONS },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Add resource/i }))
    const search = await waitFor(() => panel().getByRole('combobox', { name: 'Search resources' }))
    await userEvent.type(search, 'post')
    await waitFor(async () => {
      await expect(panel().queryByRole('option', { name: /sessions-cache/i })).not.toBeInTheDocument()
    })
  },
}

/** A filter that matched nothing. */
export const NothingMatches: Story = {
  args: { addons: ADDONS },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Add resource/i }))
    const search = await waitFor(() => panel().getByRole('combobox', { name: 'Search resources' }))
    await userEvent.type(search, 'zzzzzz')
    await waitFor(async () => {
      await expect(panel().queryByRole('option')).not.toBeInTheDocument()
    })
  },
}

/**
 * **A volume cannot be added to an empty canvas, and the row says so.** Nothing
 * is disabled without naming what is missing — a volume has to mount onto a
 * service, so with no service there is nothing to mount it to.
 */
export const VolumeBlocked: Story = {
  args: { canAddVolume: false },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Add resource/i }))
    await waitFor(async () => {
      await expect(panel().getByRole('dialog')).toBeVisible()
    })
  },
}

/** Long add-on names truncate in the row rather than widening the 272 panel. */
export const LongAddonNames: Story = {
  args: {
    addons: [
      { id: 'a1', name: 'orders-gateway-staging-eu-west-1-primary-replica' },
      { id: 'a2', name: 'prod-db' },
    ],
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Add resource/i }))
    await waitFor(async () => {
      const dialog = panel().getByRole('dialog')
      // 272 stays 272 whatever is in it.
      await expect(Math.round(dialog.getBoundingClientRect().width)).toBe(272)
    })
  },
}
