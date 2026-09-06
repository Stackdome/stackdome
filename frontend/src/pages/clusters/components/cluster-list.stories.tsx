import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { makeCluster } from '../../../../.storybook/fixtures'
import { ClusterList, ClusterListSkeleton } from './cluster-list'

const meta = {
  title: 'Features/Clusters/ClusterList',
  component: ClusterList,
  args: { onOpen: fn() },
} satisfies Meta<typeof ClusterList>

export default meta
type Story = StoryObj<typeof meta>

/** The product supports one cluster today, but the row has to hold a list the
 *  day it supports more. */
export const Default: Story = {
  args: {
    clusters: [
      makeCluster(),
      makeCluster({ id: 'c2', name: 'staging-eu-west' }),
      makeCluster({ id: 'c3', name: 'edge-ap-south' }),
    ],
  },
  play: async ({ canvasElement }) => {
    const rows = [...canvasElement.querySelectorAll('[data-slot="data-list-row"]')] as HTMLElement[]
    // The shared row: 64px, no rule between rows, a 20px column gap.
    const tops = rows.map((r) => r.getBoundingClientRect().top)
    await expect(tops[1] - tops[0]).toBe(64)
    await expect(parseFloat(getComputedStyle(rows[0]).borderBottomWidth)).toBe(0)
    await expect(getComputedStyle(rows[0]).columnGap).toBe('20px')

    for (const row of rows) {
      // Focus is a stylesheet outline off --ring, never the removed ring-*
      // utilities, and nothing on the row moves on hover/press.
      await expect(row.className).toMatch(/(?:^|\s)focus-ring(?:-edge|-inset)?(?:\s|$)/)
      await expect(row.className).not.toMatch(/(?:^|[\s:])ring-/)
      await expect(row.className).not.toContain('translate')
      await expect(row.className).not.toContain('scale')
    }
    // The row is the ONE control: no chevron, no kebab, nothing but the name.
    // A trailing track with an action in it was removed with the action.
    await expect(rows[0].querySelector('svg')).toBeNull()
    await expect(rows[0].querySelector('button')).toBeNull()
    await expect(getComputedStyle(rows[0]).gridTemplateColumns.split(' ')).toHaveLength(1)
  },
}

/**
 * §11 — **no column header.** One cluster is the cap today, and a header row
 * over a single row labels nothing.
 */
export const NoColumnHeader: Story = {
  args: { clusters: [makeCluster()] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="data-list-header"]')).toBeNull()
    await expect(canvasElement.querySelectorAll('[data-slot="data-list-row"]')).toHaveLength(1)
  },
}

/** The whole row is the one hit area, and it announces what it opens. */
export const RowOpensTheDrawer: Story = {
  args: { clusters: [makeCluster({ name: 'prod-us-east' })] },
  play: async ({ canvas, args, userEvent }) => {
    const row = canvas.getByRole('link', { name: 'prod-us-east cluster' })
    await expect(row).toHaveAttribute('tabindex', '0')
    await userEvent.click(row)
    await expect(args.onOpen).toHaveBeenCalled()
  },
}

/** A long name truncates rather than pushing the row onto a second line. */
export const LongNameAndId: Story = {
  args: {
    clusters: [
      makeCluster({
        id: 'c4',
        name: 'production-us-east-1-primary-multi-az-autoscaling-cluster',
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector('[data-slot="data-list-row"]') as HTMLElement
    await expect(row.getBoundingClientRect().height).toBe(64)
  },
}

/** §11 loading — rows at the real 64px pitch, no shimmer. */
export const Skeleton: StoryObj<typeof ClusterListSkeleton> = {
  render: () => <ClusterListSkeleton />,
  play: async ({ canvasElement }) => {
    const block = canvasElement.querySelector('[data-slot="data-list-skeleton"]')!
    const rows = [...block.children] as HTMLElement[]
    await expect(rows).toHaveLength(2)
    const tops = rows.map((r) => r.getBoundingClientRect().top)
    await expect(tops[1] - tops[0]).toBe(64)
    const bar = block.querySelector('div > div') as HTMLElement
    await expect(getComputedStyle(bar).animationName).toBe('none')
  },
}
