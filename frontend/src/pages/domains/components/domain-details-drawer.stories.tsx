import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { DomainDetailsDrawer } from './domain-details-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const meta = {
  title: 'Features/Domains/DomainDetailsDrawer',
  component: DomainDetailsDrawer,
  args: {
    domain: { fqdn: 'apps.acme.dev' },
    onOpenChange: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof DomainDetailsDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/**
 * **The fqdn is the title, so it is not also a row.** What the body carries is
 * what the fqdn does not say by itself — the shape of a deployed stack's
 * address, and the record that has to exist for it to resolve.
 */
export const TheBodySaysWhatTheNameDoesNot: Story = {
  play: async () => {
    await expect(await drawer().findByText('apps.acme.dev')).toBeInTheDocument()
    await expect(drawer().getByText('<stack>.apps.acme.dev')).toBeInTheDocument()
    await expect(drawer().getByText('*.apps.acme.dev')).toBeInTheDocument()
    // One pitch, all the way down — every row on the 32 rung.
    const rows = [...document.querySelectorAll('dl > div')] as HTMLElement[]
    for (const row of rows) await expect(row.getBoundingClientRect().height).toBe(32)
  },
}

/** A read-only drawer has nothing to commit, so it has no footer band. */
export const NoFooter: Story = {
  play: async () => {
    await expect(await drawer().findByText('DNS record')).toBeInTheDocument()
    await expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull()
  },
}

/** The wildcard is the one machine string the drawer hands you, so it is the
 *  one that carries `Copy` — and there is exactly one. */
export const OneCopy: Story = {
  play: async () => {
    const copies = await drawer().findAllByRole('button', { name: /^copy$/i })
    await expect(copies).toHaveLength(1)
    await expect(copies[0].closest('div')?.textContent).toContain('*.apps.acme.dev')
  },
}

/**
 * **Removing a domain lands on every stack served on it**, so the trigger is
 * the danger zone at the foot of the body — never a trash can on the row (§10).
 */
export const RemoveLivesInTheDangerZone: Story = {
  play: async ({ args }) => {
    const remove = await drawer().findByRole('button', { name: /remove domain/i })
    await expect(remove.closest('[data-slot="drawer-header"]')).toBeNull()
    const zone = drawer().getByRole('heading', { name: /danger zone/i }).parentElement!
    await expect(zone).toContainElement(remove)
    await expect(zone).toHaveTextContent(/loses its address/i)
    await userEvent.click(remove)
    await expect(args.onRemove).toHaveBeenCalled()
  },
}

/** A long domain truncates inside its cell rather than widening the panel. */
export const LongDomain: Story = {
  args: {
    domain: { fqdn: 'apps.engineering.platform.internal.acme-corporation.example.com' },
  },
  play: async () => {
    const panel = await drawer().findByRole('dialog')
    await expect(Math.round(panel.getBoundingClientRect().width)).toBe(480)
    const body = panel.querySelector('[data-slot="drawer-body"]')!
    await expect(body.getBoundingClientRect().right).toBeLessThanOrEqual(
      panel.getBoundingClientRect().right,
    )
  },
}
