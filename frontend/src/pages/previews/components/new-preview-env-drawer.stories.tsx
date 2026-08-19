import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import type { StackPreviewConfig } from '@/api/preview-configs'
import { baselineHandlers } from '../../../../.storybook/msw-handlers'
import { NewPreviewEnvDrawer } from './new-preview-env-drawer'

const config: StackPreviewConfig = { id: 'c1', name: 'webapp' }

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const meta = {
  title: 'Features/Previews/NewPreviewEnvDrawer',
  component: NewPreviewEnvDrawer,
  tags: ['ai-generated'],
  args: { open: true, onOpenChange: fn(), config, onCreated: fn() },
} satisfies Meta<typeof NewPreviewEnvDrawer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * How it opens: two fields, and a primary that will not let you send an empty
 * form — the reason is on the button, not discovered by pressing it.
 */
export const Empty: Story = {
  play: async () => {
    const create = await drawer().findByRole('button', { name: /create environment/i })
    await expect(create).toBeDisabled()

    // The block names both missing things at once. One at a time turns a
    // two-field form into two rounds of hover-and-fill.
    //
    // `All`, not one: Radix renders tooltip content twice — the visible copy
    // and a visually-hidden one for screen readers.
    await userEvent.hover(create.parentElement!)
    await expect(await drawer().findAllByText(/enter the pull request number/i)).not.toHaveLength(0)
    await expect(drawer().getAllByText(/enter the branch to deploy/i)).not.toHaveLength(0)
  },
}

/** Filled in — the primary unblocks, and nothing else on screen changes. */
export const Ready: Story = {
  play: async () => {
    await userEvent.type(await drawer().findByLabelText(/pr number/i), '128')
    await userEvent.type(drawer().getByLabelText(/branch/i), 'feat/login')
    await expect(drawer().getByRole('button', { name: /create environment/i })).toBeEnabled()
  },
}

/**
 * The disclosure open. It is collapsed by default because most environments
 * need neither field — but the label says what is inside, so you do not have to
 * open it to find out.
 */
export const Advanced: Story = {
  play: async () => {
    const toggle = await drawer().findByRole('button', { name: /advanced/i })
    await expect(drawer().queryByLabelText(/stackfile content/i)).toBeNull()

    await userEvent.click(toggle)
    await expect(await drawer().findByLabelText(/stackfile content/i)).toBeInTheDocument()
    await expect(drawer().getByLabelText(/image overrides/i)).toBeInTheDocument()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  },
}

/**
 * A malformed override is NOT a blocked-action reason — the field has something
 * in it and the something is wrong, so it is reported on the field, and the
 * disclosure opens itself to show you where.
 */
export const BadOverrideOpensAdvanced: Story = {
  play: async () => {
    await userEvent.type(await drawer().findByLabelText(/pr number/i), '128')
    await userEvent.type(drawer().getByLabelText(/branch/i), 'feat/login')
    await userEvent.click(drawer().getByRole('button', { name: /advanced/i }))
    await userEvent.type(drawer().getByLabelText(/image overrides/i), 'not-a-pair')
    await userEvent.click(drawer().getByRole('button', { name: /advanced/i }))

    await userEvent.click(drawer().getByRole('button', { name: /create environment/i }))
    await expect(await drawer().findByText(/resource=image/i)).toBeVisible()
  },
}

/**
 * The failure that made this a drawer rather than a dialog: it lands in the
 * **footer band**, above the button that produced it, where a scrolling body
 * cannot carry it out of view.
 */
export const ConflictOnCreate: Story = {
  parameters: {
    // A bare array, and the baseline spread back in — `msw` REPLACES the
    // default handlers rather than merging with them, and without the baseline
    // the org and project lookups this form posts to would 404.
    msw: [
      http.post('/api/v1/organizations/:orgId/projects/:project/preview-stacks', () =>
        HttpResponse.json({ reason: 'exists' }, { status: 409 }),
      ),
      ...baselineHandlers,
    ],
  },
  play: async () => {
    await userEvent.type(await drawer().findByLabelText(/pr number/i), '42')
    await userEvent.type(drawer().getByLabelText(/branch/i), 'feat/login')

    /*
     * The click is inside the retry, not before it.
     *
     * `submit` bails out silently while `useResourceProjects` is still
     * fetching — there is no project name to post to yet — so a single click
     * fired too early does nothing at all and there is no state to wait on.
     * Retrying the whole click-and-assert is what makes this deterministic.
     * (That silent bail-out is a real defect in the form, noted separately;
     * it is older than this drawer and not fixed here.)
     */
    await waitFor(
      async () => {
        await userEvent.click(drawer().getByRole('button', { name: /create environment/i }))
        await expect(drawer().getAllByText(/pr #42 already has an environment/i)).not.toHaveLength(0)
      },
      { timeout: 5000 },
    )

    const banner = drawer().getAllByText(/pr #42 already has an environment/i)[0]
    await expect(banner.closest('[data-slot="drawer-footer"]')).not.toBeNull()
  },
}
