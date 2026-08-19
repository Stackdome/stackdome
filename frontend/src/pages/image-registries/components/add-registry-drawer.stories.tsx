import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../../.storybook/msw-handlers'
import { REGISTRY_PROVIDERS } from '../lib/providers'
import { AddRegistryDrawer } from './add-registry-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const CREDENTIALS = '*/organizations/:orgId/registry-credentials'

const handlers = [
  http.post(CREDENTIALS, () => HttpResponse.json({ id: 'r1', host: 'ghcr.io', username: 'acme-ci' })),
  ...baselineHandlers,
]

/** Step one, then the row that opens the form. */
const pick = async (name: string | RegExp) => {
  await userEvent.click(await drawer().findByRole('option', { name }))
}

/**
 * The footer's button and the path's first crumb are both called
 * `Add registry` — the task names the journey and the primary names the act,
 * and on this flow they are the same words. Both are scoped to a band.
 */
const primary = () =>
  within(document.querySelector('[data-slot="drawer-footer"]') as HTMLElement).getByRole('button')
const crumb = () =>
  within(document.querySelector('[data-slot="drawer-path"]') as HTMLElement).getByRole('button', {
    name: 'Add registry',
  })

const fillCredentials = async () => {
  await userEvent.type(await drawer().findByLabelText(/^username/i), 'acme-ci')
  await userEvent.type(await drawer().findByLabelText(/^password/i), 's3cret')
}

const meta = {
  title: 'Features/Image registries/AddRegistryDrawer',
  component: AddRegistryDrawer,
  args: { open: true, onOpenChange: fn(), onCreated: fn() },
  parameters: { msw: { handlers } },
} satisfies Meta<typeof AddRegistryDrawer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * **Step one — the catalogue, and no footer at all.** Picking advances, so a
 * `Continue` beside the list would repeat the click you just made; the ✕ is
 * exit enough for a step that has committed nothing (§13).
 *
 * It shipped as five hand-rolled `<button>` tiles at `min-h-[76px]` in a
 * `grid grid-cols-2`, under a centred heading. `PickerRow` owns all of it.
 */
export const PickARegistry: Story = {
  play: async () => {
    await expect(await drawer().findByText('Pick a registry')).toBeInTheDocument()
    await expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull()
    // Step one's crumbs point at the screen you are on, so neither is live.
    await expect(document.querySelector('[data-slot="drawer-path"] button')).toBeNull()
  },
}

/**
 * **Every registry the catalogue holds is offered, and only those.** The tiles
 * were a second copy of this list; the empty state was a third, and it had
 * already drifted — it offered `ECR`, which `REGISTRY_PROVIDERS` has never held,
 * and never named GitLab or Quay, which it does.
 */
export const EveryRegistryIsOffered: Story = {
  play: async () => {
    const rows = await drawer().findAllByRole('option')
    await expect(rows).toHaveLength(REGISTRY_PROVIDERS.length)
    for (const p of REGISTRY_PROVIDERS) {
      await expect(await drawer().findByRole('option', { name: new RegExp(p.label, 'i') })).toBeInTheDocument()
    }
  },
}

/**
 * Picking advances to the form, names the step in the path, prefills the host
 * and shows the hint naming **this** registry's credential.
 */
export const PickingAdvancesToTheForm: Story = {
  play: async () => {
    await pick(/GHCR/i)

    await expect(await drawer().findByText('GHCR')).toBeInTheDocument()
    await expect(await drawer().findByLabelText(/^host/i)).toHaveValue('ghcr.io')
    await expect(await drawer().findByText(/read:packages/i)).toBeInTheDocument()
  },
}

/**
 * **The primary is blocked and says what is missing** — all of it at once,
 * rather than one round of press-and-discover per field. It used to be live on
 * an empty form.
 */
export const TheFormBlocksAndSaysWhy: Story = {
  play: async () => {
    await pick(/Other/i)

    const add = primary()
    await expect(add).toBeDisabled()

    // `All`, not one: Radix renders tooltip content twice — the visible copy
    // and a visually-hidden one for screen readers.
    await userEvent.hover(add.parentElement!)
    await expect(await drawer().findAllByText(/enter a host/i)).not.toHaveLength(0)
    await expect(drawer().getAllByText(/enter a username/i)).not.toHaveLength(0)
    await expect(drawer().getAllByText(/enter a password/i)).not.toHaveLength(0)
  },
}

/**
 * **The crumb is the way back, and it clears the login on the way.** A secret
 * typed for one registry must not survive a return to the catalogue and a
 * different row, and then be POSTed to that one.
 */
export const TheCrumbReturnsAndClearsTheLogin: Story = {
  play: async () => {
    await pick(/Docker Hub/i)
    await fillCredentials()

    await userEvent.click(crumb())
    await pick(/Quay/i)

    await expect(await drawer().findByLabelText(/^host/i)).toHaveValue('quay.io')
    await expect(await drawer().findByLabelText(/^username/i)).toHaveValue('')
    await expect(await drawer().findByLabelText(/^password/i)).toHaveValue('')
  },
}

/**
 * **`Username ǀ Password` is a pair** — one credential in two boxes, secrets'
 * exact case (§8). Asserted as a **gap**: the two share a row, sit 16 apart, and
 * the pair ends on the same trailing edge as every full-width field.
 */
export const TheCredentialPairSharesARow: Story = {
  play: async () => {
    await pick(/GHCR/i)

    const username = await drawer().findByLabelText(/^username/i)
    const password = await drawer().findByLabelText(/^password/i)
    const host = await drawer().findByLabelText(/^host/i)

    const [ru, rp, rh] = [username, password, host].map((el) => el.getBoundingClientRect())

    await expect(Math.round(ru.top)).toBe(Math.round(rp.top))
    await expect(Math.round(rp.left - ru.right)).toBe(16)
    await expect(Math.round(ru.left)).toBe(Math.round(rh.left))
    await expect(Math.round(rp.right)).toBe(Math.round(rh.right))
  },
}

/**
 * A duplicate lands **on the host box**, not in the footer and not in a toast.
 * §13: the reason goes where the answer is wrong, and only this field's value is.
 */
export const TheDuplicateLandsOnTheHost: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(CREDENTIALS, () => HttpResponse.json({ reason: 'exists' }, { status: 409 })),
        ...baselineHandlers,
      ],
    },
  },
  play: async () => {
    await pick(/GHCR/i)
    await fillCredentials()
    await userEvent.click(primary())

    await expect(
      await drawer().findByText(/credentials for this registry and purpose already exist/i),
    ).toBeInTheDocument()
  },
}

/**
 * Any other failure stays in the **footer band**, beside the button that
 * produced it — inside a body that scrolls it would scroll away from it.
 */
export const TheFailureSitsInTheFooter: Story = {
  parameters: {
    msw: {
      handlers: [
        // `reason`, which is the key `getErrorMessage` reads off an API error.
        http.post(CREDENTIALS, () => HttpResponse.json({ reason: 'registry unreachable' }, { status: 500 })),
        ...baselineHandlers,
      ],
    },
  },
  play: async () => {
    await pick(/GHCR/i)
    await fillCredentials()
    await userEvent.click(primary())

    const banner = await drawer().findByText(/registry unreachable/i)
    await expect(banner).toBeInTheDocument()
    await expect(banner.closest('[data-slot="drawer-footer"]')).not.toBeNull()
  },
}
