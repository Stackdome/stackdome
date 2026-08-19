import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import AddDomainDrawer from './add-domain-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

/** The slide-in is 200ms. Geometry is read after it lands, never during. */
const settled = () => new Promise((r) => setTimeout(r, 300))

const meta = {
  title: 'Features/Domains/AddDomainDrawer',
  component: AddDomainDrawer,
  args: {
    open: true,
    onOpenChange: fn(),
    onAddDomain: fn(),
    existingDomains: [],
  },
} satisfies Meta<typeof AddDomainDrawer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * How it opens. **This screen had no stories at all** before the conversion.
 * The primary is blocked and says the one thing that is missing.
 */
export const New: Story = {
  play: async () => {
    const add = await drawer().findByRole('button', { name: /add domain/i })
    await expect(add).toBeDisabled()

    // `All`, not one: Radix renders tooltip content twice — the visible copy
    // and a visually-hidden one for screen readers.
    await userEvent.hover(add.parentElement!)
    await expect(await drawer().findAllByText(/enter a domain name/i)).not.toHaveLength(0)
  },
}

/**
 * **One field, and it fills the drawer.** A short answer does not earn a short
 * box, and there is nothing here to pair it with — so the field runs the body's
 * full width, on the same inset the header's title sits on.
 */
export const TheFieldFillsTheBody: Story = {
  play: async () => {
    await settled()
    const field = await drawer().findByLabelText(/domain name/i)
    const body = document.querySelector('[data-slot="drawer-body"]')!

    const rf = field.getBoundingClientRect()
    const rb = body.getBoundingClientRect()

    // 20 of body padding on each side, and nothing left over.
    await expect(Math.round(rf.left - rb.left)).toBe(20)
    await expect(Math.round(rb.right - rf.right)).toBe(20)
  },
}

/**
 * A malformed value is answered by the **field's own error**, four pixels under
 * the box it is about — not by a tooltip on a control 200px away. The button
 * stays live, because the value is present; it is the answer that is wrong.
 */
export const AMalformedDomainIsAnsweredAtTheField: Story = {
  play: async () => {
    await userEvent.type(await drawer().findByLabelText(/domain name/i), 'not a domain')
    await userEvent.click(await drawer().findByRole('button', { name: /add domain/i }))

    const message = await drawer().findByText(/valid domain name/i)
    await expect(message.closest('[data-slot="drawer-body"]')).not.toBeNull()
  },
}

/** A domain the organisation already has is refused by name, at the field. */
export const ADuplicateIsRefused: Story = {
  args: { existingDomains: [{ fqdn: 'acme.dev' }] },
  play: async () => {
    await userEvent.type(await drawer().findByLabelText(/domain name/i), 'ACME.dev')
    await userEvent.click(await drawer().findByRole('button', { name: /add domain/i }))
    await expect(await drawer().findByText(/already exists/i)).toBeInTheDocument()
  },
}

/**
 * **The failure lands in the footer band.** It also used to blank the field on
 * the way: the old dialog cleared its state the moment it handed the domain
 * over, so a save that failed left the banner explaining a value that was no
 * longer on screen.
 */
export const ErrorSitsInTheFooter: Story = {
  args: { submitError: 'The organization could not be updated. Try again in a moment.' },
  play: async () => {
    const banner = await drawer().findByText(/could not be updated/i)
    await expect(banner.closest('[data-slot="drawer-footer"]')).not.toBeNull()
  },
}

/**
 * **The footer holds the primary alone.** `Cancel` came off with the dialog —
 * nothing is committed until this button is pressed, so the ✕, Esc and the
 * scrim are the exits.
 */
export const NoCancelInTheFooter: Story = {
  play: async () => {
    await expect(await drawer().findByRole('button', { name: /add domain/i })).toBeInTheDocument()
    await expect(drawer().queryByRole('button', { name: 'Cancel' })).toBeNull()
  },
}
