import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import DomainListItem, { DomainListSkeleton } from './domain-list-item'

const meta = {
  title: 'Features/Domains/DomainListItem',
  component: DomainListItem,
  args: { domain: { fqdn: 'apps.acme.dev' }, onOpen: fn() },
} satisfies Meta<typeof DomainListItem>

export default meta
type Story = StoryObj<typeof meta>

/**
 * **The row is the one control.** It carried a trash can in a trailing 32px
 * track — the only thing you could do to a domain was destroy it. Both the
 * action and its track are gone; the row opens the domain's drawer.
 */
export const RowIsTheOnlyControl: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const row = canvas.getByRole('link', { name: 'apps.acme.dev domain' })
    await expect(row.querySelector('button')).toBeNull()
    await expect(row.querySelector('[data-slot="data-list-actions"]')).toBeNull()
    await expect(getComputedStyle(row).gridTemplateColumns.split(' ')).toHaveLength(1)
    await expect(row.getBoundingClientRect().height).toBe(64)
    await userEvent.click(row)
    await expect(args.onOpen).toHaveBeenCalled()
  },
}

/** §11 loading — rows at the real 64px pitch, no shimmer. */
export const Skeleton: StoryObj<typeof DomainListSkeleton> = {
  render: () => <DomainListSkeleton />,
  play: async ({ canvasElement }) => {
    const block = canvasElement.querySelector('[data-slot="data-list-skeleton"]')!
    const rows = [...block.children] as HTMLElement[]
    await expect(rows).toHaveLength(2)
    const tops = rows.map((r) => r.getBoundingClientRect().top)
    await expect(tops[1] - tops[0]).toBe(64)
  },
}
