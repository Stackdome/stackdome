import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { SecretFormDrawer } from './secret-form-drawer'
import type { Secret } from '../types'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const meta = {
  title: 'Features/Secrets/SecretFormDrawer',
  component: SecretFormDrawer,
  tags: ['ai-generated'],
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: fn(),
    isLoading: false,
    error: null,
  },
} satisfies Meta<typeof SecretFormDrawer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * How it opens. Four fields, the primary blocked, and the reason on the button
 * rather than discovered by pressing it.
 */
export const Generic: Story = {
  play: async () => {
    const create = await drawer().findByRole('button', { name: /create secret/i })
    await expect(create).toBeDisabled()

    // Both missing things at once. `All`, not one: Radix renders tooltip
    // content twice — the visible copy and a visually-hidden one for readers.
    await userEvent.hover(create.parentElement!)
    await expect(await drawer().findAllByText(/enter a name/i)).not.toHaveLength(0)
    await expect(drawer().getAllByText(/add at least one key and value/i)).not.toHaveLength(0)
  },
}

/**
 * **Every kind the product has is reachable.** The select shipped three of six,
 * so `Token`, `SSH key` and `Username / password` could not be created at all —
 * and the options come off the schema now, so a seventh kind cannot ship
 * without appearing here.
 */
export const EveryKindIsOffered: Story = {
  play: async () => {
    await userEvent.click(await drawer().findByLabelText(/type/i))
    const options = await drawer().findAllByRole('option')
    await expect(options.map((o) => o.textContent)).toEqual([
      'Generic',
      'Docker registry',
      'Git credentials',
      'Username / password',
      'Token',
      'SSH key',
    ])
  },
}

/**
 * The one pair on this form: **a username and a password are one credential in
 * two boxes**, so they take one row. Proved by their y, not by their width —
 * two fields on a row is a fact about position.
 */
export const TheCredentialIsOnePair: Story = {
  play: async () => {
    await userEvent.click(await drawer().findByLabelText(/type/i))
    await userEvent.click(await drawer().findByRole('option', { name: 'Docker registry' }))

    const username = await drawer().findByLabelText(/username/i)
    const password = await drawer().findByLabelText(/^password/i)
    const registry = await drawer().findByLabelText(/registry url/i)

    await expect(username.getBoundingClientRect().top).toBe(password.getBoundingClientRect().top)
    // And the field that is not half of anything still fills the body.
    await expect(registry.getBoundingClientRect().width).toBeGreaterThan(
      username.getBoundingClientRect().width * 1.5,
    )
  },
}

/**
 * Editing a kind the select used to omit. The Type box read **empty** over a
 * form full of that kind's fields, because the value had no option to match.
 */
export const EditingATokenSecret: Story = {
  args: {
    editingSecret: {
      id: 'sec-1',
      name: 'stripe-api-key',
      description: 'Live key, billing service only',
      type: 'Token',
      data: [{ key: 'token', value: 'sk_live_deadbeef' }],
    } as Secret,
  },
  play: async () => {
    await expect(await drawer().findByLabelText(/type/i)).toHaveTextContent('Token')
    await expect(await drawer().findByLabelText(/^token/i)).toBeInTheDocument()
    // The length rule is a hint, not a placeholder pretending to be a specimen.
    await expect(drawer().getByText(/at least 8 characters/i)).toBeInTheDocument()
  },
}

/**
 * **The footer holds the primary alone.** No `Cancel` — the ✕, Esc and the
 * scrim are the exits, on a one-phase drawer as on every journey.
 */
export const NoCancelInTheFooter: Story = {
  play: async () => {
    await expect(await drawer().findByRole('button', { name: /create secret/i })).toBeInTheDocument()
    await expect(drawer().queryByRole('button', { name: 'Cancel' })).toBeNull()
  },
}

/** The failure lands in the footer band, where a scrolling body cannot carry it away. */
export const ErrorSitsInTheFooter: Story = {
  args: { error: 'A secret named stripe-api-key already exists. Pick another name, or edit that one.' },
  play: async () => {
    const banner = await drawer().findByText(/already exists/i)
    await expect(banner.closest('[data-slot="drawer-footer"]')).not.toBeNull()
  },
}
