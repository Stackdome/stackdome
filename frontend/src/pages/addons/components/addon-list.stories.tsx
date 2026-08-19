import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { makeAddon } from '../../../../.storybook/fixtures'
import { AddonList, AddonListSkeleton } from './addon-list'

const mixed = [
  makeAddon(),
  makeAddon({
    id: 'pg-2',
    name: 'analytics-db',
    status: { state: 'Creating' },
    created_at: '2026-07-30T18:00:00Z',
  }),
  makeAddon({
    id: 'pg-3',
    name: 'sessions-db',
    status: { state: 'Error', message: 'volume provisioning failed' },
    created_at: '2026-07-25T12:00:00Z',
  }),
  makeAddon({
    id: 'pg-4',
    name: 'archive-db',
    status: { state: 'Hibernated' },
    created_at: '2026-06-01T08:00:00Z',
  }),
]

const meta = {
  title: 'Features/Addons/AddonList',
  component: AddonList,
} satisfies Meta<typeof AddonList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { addons: mixed },
}

export const ReadOnly: Story = {
  args: { addons: mixed, canWrite: () => false },
}

/** §11 — six tracks, not eight columns. `Type` said `postgres` on every row and
 *  `Backups` said a word rather than a fact; both left with the type icon. */
export const SixTracks: Story = {
  args: { addons: mixed },
  play: async ({ canvas, canvasElement }) => {
    const header = canvasElement.querySelector('[data-slot="data-list-header"]')!
    await expect(header.children).toHaveLength(6)
    await expect(canvas.queryByText('Type')).toBeNull()
    await expect(canvas.queryByText('Backups')).toBeNull()
    await expect(canvas.queryByText(/backups o(n|ff)/i)).toBeNull()
  },
}

/**
 * The Stacks geometry, asserted rather than described: 64px rows, no rule
 * between them, a 20px column gap, and the header's rule sitting 0px above the
 * first row.
 */
export const MatchesTheStacksGeometry: Story = {
  args: { addons: mixed },
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector('[data-slot="data-list-header"]') as HTMLElement
    const rows = [...canvasElement.querySelectorAll('[data-slot="data-list-row"]')] as HTMLElement[]

    const tops = rows.map((r) => r.getBoundingClientRect().top)
    await expect(tops[1] - tops[0]).toBe(64)
    await expect(tops[2] - tops[1]).toBe(64)

    // No rule between rows.
    await expect(parseFloat(getComputedStyle(rows[0]).borderBottomWidth)).toBe(0)
    // …but the header keeps its one, and the first row starts against it.
    await expect(parseFloat(getComputedStyle(header).borderBottomWidth)).toBe(1)
    await expect(Math.round(tops[0] - header.getBoundingClientRect().bottom)).toBe(0)

    // 20px between columns, 8px inset either side — the Stacks numbers.
    await expect(getComputedStyle(rows[0]).columnGap).toBe('20px')
    await expect(getComputedStyle(rows[0]).paddingLeft).toBe('8px')
    await expect(getComputedStyle(header).paddingLeft).toBe('8px')
    // The header's label sits in a uniform 8px inset: -8 top against the
    // sheet's 16px content inset, 8 below.
    await expect(getComputedStyle(header).marginTop).toBe('-8px')
    await expect(getComputedStyle(header).paddingBottom).toBe('8px')
  },
}

/** The name is 14/20 medium over a 12/16 second line; every other cell is
 *  12/16 muted. One type ladder across every list page. */
export const TypeLadder: Story = {
  args: { addons: mixed },
  play: async ({ canvas }) => {
    const name = canvas.getByText('orders-db')
    const nameStyle = getComputedStyle(name)
    await expect(nameStyle.fontSize).toBe('14px')
    await expect(nameStyle.lineHeight).toBe('20px')
    await expect(nameStyle.fontWeight).toBe('500')

    const version = canvas.getAllByText(/^PG 16$/)[0]
    await expect(getComputedStyle(version).fontSize).toBe('12px')
    await expect(getComputedStyle(version).lineHeight).toBe('16px')
  },
}

/** Status is a coloured WORD with the glyph for its state — the same component
 *  and the same treatment as the Stacks row, never a bordered pill. And when
 *  there is a reason, it is a second line under it. */
export const StatusMatchesStacks: Story = {
  args: { addons: mixed },
  play: async ({ canvas, canvasElement }) => {
    const words = [...canvasElement.querySelectorAll('[data-slot="status-text"]')] as HTMLElement[]
    await expect(words).toHaveLength(4)
    await expect(words[0].textContent).toBe('Ready')
    await expect(words[0].dataset.statusVariant).toBe('ready')
    // The glyph is derived from the state, so it can never disagree with it.
    await expect(words[0].querySelector('svg')).toBeTruthy()
    // No bordered chip anywhere in the row.
    await expect(canvasElement.querySelector('[data-slot="status-pill"]')).toBeNull()
    // A broken row is visibly taller by its reason line; a healthy one is not.
    await expect(canvas.getByText('volume provisioning failed')).toBeInTheDocument()
  },
}

/** The whole row is a link, so the keyboard reaches it and it announces what it
 *  is. */
export const RowIsALink: Story = {
  args: { addons: mixed },
  play: async ({ canvas }) => {
    const row = canvas.getByRole('link', { name: 'orders-db addon' })
    await expect(row).toHaveAttribute('tabindex', '0')
  },
}

/** The name column is capped at 420 and truncates rather than pushing the
 *  status off its line. The full name stays available on hover. */
export const LongName: Story = {
  args: {
    addons: [
      makeAddon({
        id: 'pg-long',
        name: 'customer-analytics-warehouse-replica-eu-west-primary-shard-0007-standby',
      }),
      ...mixed.slice(1),
    ],
  },
  play: async ({ canvas }) => {
    const name = canvas.getByText(
      'customer-analytics-warehouse-replica-eu-west-primary-shard-0007-standby',
    )
    await expect(name.getBoundingClientRect().width).toBeLessThanOrEqual(420)
    await expect(name.scrollWidth).toBeGreaterThan(name.clientWidth)
    const row = name.closest('[data-slot="data-list-row"]') as HTMLElement
    await expect(row.getBoundingClientRect().height).toBe(64)
  },
}

/** Row hover is a fill shift and nothing else — the name must not change colour
 *  and the row must not move. Two things changing says two things happened. */
export const RowHoverNoColorOrTransform: Story = {
  args: { addons: mixed },
  play: async ({ canvas, userEvent }) => {
    const name = canvas.getByText('orders-db')
    const row = name.closest('[data-slot="data-list-row"]') as HTMLElement
    const colorBefore = getComputedStyle(name).color
    const transformBefore = getComputedStyle(row).transform
    await userEvent.hover(row)
    await expect(getComputedStyle(name).color).toBe(colorBefore)
    await expect(getComputedStyle(row).transform).toBe(transformBefore)
  },
}

/** §11 loading — the real column headers, then rows at the real 64px pitch.
 *  Never a spinner, and never a shimmer: ambient movement on a working surface
 *  is exactly what §14 rules out. */
export const Skeleton: StoryObj<typeof AddonListSkeleton> = {
  render: () => <AddonListSkeleton />,
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Version')).toBeInTheDocument()
    const block = canvasElement.querySelector('[data-slot="data-list-skeleton"]')!
    const rows = [...block.children] as HTMLElement[]
    await expect(rows).toHaveLength(6)
    const tops = rows.map((r) => r.getBoundingClientRect().top)
    await expect(tops[1] - tops[0]).toBe(64)
    // No pulse.
    const bar = block.querySelector('div > div') as HTMLElement
    await expect(getComputedStyle(bar).animationName).toBe('none')
  },
}
