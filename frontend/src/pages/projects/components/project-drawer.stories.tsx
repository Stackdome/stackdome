import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { makeProject } from '../../../../.storybook/fixtures'
import { ProjectDrawer } from './project-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const meta = {
  title: 'Features/Projects/ProjectDrawer',
  component: ProjectDrawer,
  args: {
    project: makeProject({ id: 'p2', name: 'platform', default_project: false }),
    onOpenChange: fn(),
    onRename: fn(async () => ({ ok: true as const })),
    onDelete: fn(),
  },
} satisfies Meta<typeof ProjectDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** **Straight to edit** — a project is a name and a slug derived from it, both
 *  settings, so there is no read-first step to click past. */
export const OpensStraightIntoTheForm: Story = {
  play: async () => {
    await expect(await drawer().findByLabelText(/^name/i)).toHaveValue('platform')
    await expect(document.querySelector('[data-slot="drawer-footer"]')).not.toBeNull()
  },
}

/** **A value, not a field** (§9). The slug is derived from the name, so it
 *  reports what the rename will produce rather than pretending to be a second
 *  thing you can set — and it tracks the field as you type. */
export const SlugFollowsTheName: Story = {
  play: async () => {
    const name = await drawer().findByLabelText(/^name/i)
    await userEvent.clear(name)
    await userEvent.type(name, 'Growth Team')
    await expect(await drawer().findByText('growth-team')).toBeInTheDocument()
    await expect(drawer().queryByRole('textbox', { name: /slug/i })).toBeNull()
  },
}

/** Nothing is disabled without saying why (§11) — the primary refuses while
 *  the name is unchanged, and says so in the verb of the act. */
export const RenameRefusesUntilTheNameChanges: Story = {
  play: async () => {
    const save = await drawer().findByRole('button', { name: /rename project/i })
    await expect(save).toBeDisabled()
    await userEvent.hover(save.parentElement!)
    await expect(await drawer().findAllByText(/Change the name/i)).not.toHaveLength(0)
  },
}

/**
 * **Deleting a project takes everything filed under it**, so the trigger is the
 * danger zone at the foot of the body — never a menu item on the row (§10).
 */
export const DeleteLivesInTheDangerZone: Story = {
  play: async ({ args }) => {
    const del = await drawer().findByRole('button', { name: /delete project/i })
    await expect(del.closest('[data-slot="drawer-header"]')).toBeNull()
    const zone = drawer().getByRole('heading', { name: /danger zone/i }).parentElement!
    await expect(zone).toContainElement(del)
    await expect(zone).toHaveTextContent(/goes with it/i)
    await userEvent.click(del)
    await expect(args.onDelete).toHaveBeenCalled()
  },
}

/** The default project refuses BOTH acts and says why — blocked, never hidden. */
export const DefaultProject: Story = {
  args: {
    project: makeProject({ id: 'p1', name: 'default', default_project: true }),
  },
  play: async () => {
    await expect(await drawer().findByLabelText(/^name/i)).toBeDisabled()
    const del = drawer().getByRole('button', { name: /delete project/i })
    await expect(del).toBeDisabled()
    await userEvent.hover(del.parentElement!)
    await expect(await drawer().findAllByText(/organisation's default project/i)).not.toHaveLength(0)
  },
}
