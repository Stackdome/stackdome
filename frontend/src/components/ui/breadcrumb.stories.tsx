import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb'

/**
 * The trail in the sheet header — where you are, and the way back up.
 *
 * There is no `Home` crumb (§12a): the first segment is a real place, not the
 * root of a filesystem.
 */
const meta = {
  title: 'Primitives/Breadcrumb',
  component: Breadcrumb,
  tags: ['ai-generated'],
} satisfies Meta<typeof Breadcrumb>

export default meta
type Story = StoryObj<typeof meta>

function Trail({ last }: { last: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Projects</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">default</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{last}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export const Default: Story = {
  render: () => <Trail last="orders-gateway" />,
}

/**
 * **A trail is one line by definition — the crumbs never stack.**
 *
 * The list ran `flex-wrap break-words`, so a long object name pushed a crumb
 * onto a second row: the header grew, the tab strip under it moved down, and
 * the band's fixed height stopped being fixed. "Where you are" cannot be a
 * paragraph, so the row is `flex-nowrap`.
 *
 * **The primitive guarantees the row, not the truncation.** Which crumb gives
 * way is the caller's call — `SheetHeader` puts `min-w-0` on the item that
 * holds the object name and truncates inside it, because only the caller knows
 * which segment is arbitrarily long. `NarrowRowTruncates` below is that
 * arrangement.
 */
export const CrumbsNeverStack: Story = {
  render: () => (
    <div className="w-[320px] border border-border-subtle p-2">
      <Trail last="orders-gateway-staging" />
    </div>
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole('list')
    await expect(getComputedStyle(list).flexWrap).toBe('nowrap')
    // Every crumb shares one baseline: no item sits on a row of its own.
    const tops = canvas
      .getAllByRole('listitem')
      .map((el) => Math.round(el.getBoundingClientRect().top))
    await expect(new Set(tops).size).toBe(1)
  },
}

/**
 * The caller's half, as `SheetHeader` arranges it: `min-w-0` on the item that
 * can be arbitrarily long, `truncate` on the text inside it. The fixed crumbs
 * keep their width and the object name is the one that gives way.
 */
export const NarrowRowTruncates: Story = {
  render: () => (
    <div className="w-[280px] border border-border-subtle p-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="flex-none">
            <BreadcrumbLink href="#">Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="block truncate">
              orders-gateway-staging-eu-west-1-canary-rollout
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  ),
  play: async ({ canvas }) => {
    const page = canvas.getByText(/orders-gateway/)
    // Truncated, not wrapped: it overflows its box on ONE line.
    await expect(page.scrollWidth).toBeGreaterThan(page.clientWidth)
    const list = canvas.getByRole('list')
    const rows = canvas.getAllByRole('listitem')
    await expect(Math.round(list.getBoundingClientRect().height)).toBe(
      Math.round(rows[0].getBoundingClientRect().height),
    )
  },
}

/** A deep trail collapses its middle rather than shrinking every crumb. */
export const Collapsed: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Projects</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">orders-gateway</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Settings</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
}

/** A single segment — a top-level page with nothing above it. */
export const OneCrumb: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Stacks</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
}
