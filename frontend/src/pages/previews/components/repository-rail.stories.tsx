import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import type { StackPreviewConfig } from '@/api/preview-configs'
import { RepositoryRail } from './repository-rail'

const configs = [
  { id: 'c1', name: 'checkout-api' },
  { id: 'c2', name: 'docs-site' },
  { id: 'c3', name: 'web-storefront' },
] as StackPreviewConfig[]

const COUNTS: Record<string, number> = { c1: 1, c2: 0, c3: 3 }

const meta = {
  title: 'Features/Previews/RepositoryRail',
  component: RepositoryRail,
  args: {
    configs,
    envCount: (id?: string) => (id ? (COUNTS[id] ?? 0) : 4),
    selectedId: undefined,
    onSelect: fn(),
    onSettings: fn(),
    onEnableRepository: fn(),
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-[560px] bg-card">
        <Story />
        <div className="flex-1" />
      </div>
    ),
  ],
} satisfies Meta<typeof RepositoryRail>

export default meta
type Story = StoryObj<typeof meta>

/** The landing state: nothing selected but *All previews*, which is a real row
 *  and carries the total. */
export const AllPreviews: Story = {}

export const RepositorySelected: Story = {
  args: { selectedId: 'c3' },
}

/**
 * The trailing slot holds one thing at a time. At rest a row shows its count; on
 * hover and on focus that count swaps for the gear — and the row does not move,
 * because both marks are absolutely placed in the same slot.
 *
 * **Every row, not just the selected one.** Revealing it on the selection alone
 * made reaching a repository's settings cost a click to select it first — a step
 * that produces nothing, in a rail whose whole job is to save you one.
 *
 * **`outline`, not `ghost`.** A row action on the list sits on the sheet's own
 * white; this one lands on a row that is already washed, where a transparent
 * face has nothing left to change against.
 */
export const TheGearSwapsForTheCount: Story = {
  args: { selectedId: 'c3' },
  play: async ({ canvas, userEvent }) => {
    // An UNSELECTED row has one too.
    await expect(
      canvas.getByRole('button', { name: /settings for checkout-api/i }),
    ).toBeInTheDocument()
    const gear = canvas.getByRole('button', { name: /settings for web-storefront/i })
    await expect(gear.className).toContain('opacity-0')
    await expect(gear.className).toContain('group-hover/rail:opacity-100')
    // The hairline is the point of the variant, so it is what the story pins.
    await expect(gear.className).toContain('border')

    // Focusing the ROW reveals it — focus-within on the row, not focus on the
    // gear, so it arrives on the same tab as everywhere else.
    await userEvent.click(canvas.getByRole('button', { name: 'web-storefront 3' }))
    await expect(canvas.getByRole('button', { name: 'web-storefront 3' })).toHaveFocus()
  },
}

/**
 * **The gear is a sibling, never a child.** A `<button>` inside another button
 * or an `<a>` is invalid markup, and browsers recover from it by breaking the
 * keyboard order — which is the one thing this row cannot afford, because the
 * gear is the only way into the repository's settings.
 */
export const TheGearIsNotNestedInsideTheRow: Story = {
  args: { selectedId: 'c3' },
  play: async ({ canvas }) => {
    const row = canvas.getByRole('button', { name: 'web-storefront 3' })
    const gear = canvas.getByRole('button', { name: 'Settings for web-storefront' })
    await expect(row.contains(gear)).toBe(false)
    await expect(gear.closest('a')).toBeNull()
  },
}

/** The count joins the row's accessible name, so a screen reader hears
 *  "web-storefront, 3" rather than a loose number after it. */
export const TheCountIsPartOfTheRow: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'web-storefront 3' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'All previews 4' })).toBeInTheDocument()
  },
}

/** A repository name longer than the 224 row truncates rather than pushing its
 *  count out of the trailing slot. */
export const LongRepositoryName: Story = {
  args: {
    configs: [
      { id: 'c1', name: 'platform-internal-tooling-and-developer-experience' },
      ...configs,
    ] as StackPreviewConfig[],
    selectedId: 'c1',
  },
}

/** Read-only: no gear, and no way to add a repository. The rail still filters. */
export const ReadOnly: Story = {
  args: { canWrite: false, selectedId: 'c3' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: /settings for/i })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /enable repository/i })).toBeNull()
    await expect(canvas.getByRole('button', { name: 'web-storefront 3' })).toBeInTheDocument()
  },
}

/**
 * **The two pinned rows are the rail's fixed points**, and the add is the lower
 * one: above a hairline, at the foot of the column, in `ghost`.
 *
 * Two other placements were built and judged in the running app — under the
 * group label, and as the last row of the list. Both lost. The column is chrome,
 * and chrome that moves as the data changes stops being somewhere you can look
 * without thinking.
 */
export const TheAddIsPinnedToTheFoot: Story = {
  play: async ({ canvas }) => {
    const add = canvas.getByRole('button', { name: /enable repository/i })
    const last = canvas.getByRole('button', { name: 'web-storefront 3' })
    await expect(add.getBoundingClientRect().top).toBeGreaterThan(
      last.getBoundingClientRect().bottom,
    )
    // `ghost` — the rail holds no bordered box.
    await expect(add.className).toContain('bg-transparent')
    await expect(add.parentElement?.className ?? '').toContain('border-t')
  },
}

/** Enough repositories to scroll. The add goes with them — it is part of the
 *  list, and a list you scroll has its end at the end. */
export const ManyRepositories: Story = {
  args: {
    configs: Array.from({ length: 24 }, (_, i) => ({
      id: `c${i}`,
      name: `service-${String(i + 1).padStart(2, '0')}`,
    })) as StackPreviewConfig[],
    envCount: (id?: string) => (id ? 2 : 48),
    selectedId: 'c3',
  },
}

/** A brand-new org has no repositories at all — the rail is the two pinned rows
 *  and nothing between them. (The screen drops the rail entirely here; this
 *  proves the component does not collapse or draw an empty box.) */
export const NoRepositoriesYet: Story = {
  args: { configs: [], envCount: () => 0 },
}

/** Selecting moves the wash and the gear together. */
export const Selecting: Story = {
  render: (args) => {
    const [selected, setSelected] = useState<string | undefined>(undefined)
    return <RepositoryRail {...args} selectedId={selected} onSelect={setSelected} />
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'checkout-api 1' }))
    await expect(canvas.getByRole('button', { name: 'checkout-api 1' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(canvas.getByRole('button', { name: 'All previews 4' })).not.toHaveAttribute(
      'aria-current',
    )
  },
}
