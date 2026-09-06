import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Boxes, Database, GitBranch, Package } from 'lucide-react'

import {
  PickerList,
  PickerRow,
  PickerRowAdd,
  PickerRowCount,
  PickerRowRemove,
  PickerRowTick,
} from './picker-row'

const meta = {
  title: 'Branded/PickerRow',
  component: PickerRow,
  parameters: { layout: 'centered' },
  args: { icon: <GitBranch />, name: 'acme/web-api' },
  decorators: [
    (Story) => (
      <div className="bg-card w-[620px] max-w-full p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PickerRow>

export default meta
type Story = StoryObj<typeof meta>

const REPOS = [
  { name: 'acme/web-api', branch: 'main', updated: 'updated 2 days ago' },
  { name: 'acme/worker', branch: 'main', updated: 'updated 3 weeks ago' },
  { name: 'acme/design-tokens', branch: 'trunk', updated: 'updated 6 months ago' },
]

/** The catalogue rung — 56px, a repository you have not picked yet. */
export const Default: Story = {
  args: { meta: [{ text: 'main', mono: true }, { text: 'updated 2 days ago' }] },
}

/** Selection is the 6% wash and a blue tick. One colour, said once (§7). */
export const Selected: Story = {
  args: {
    meta: [{ text: 'main', mono: true }, { text: 'updated 2 days ago' }],
    selected: true,
    trailing: <PickerRowTick />,
    onClick: () => {},
  },
}

/** Reading matter at the end of the row, before any mark. */
export const WithEndText: Story = {
  args: {
    icon: <Package />,
    name: 'Grafana',
    meta: [{ text: 'Dashboards and alerting' }],
    endText: '3 services',
    onClick: () => {},
  },
}

/**
 * A block adds rather than selects, so it carries no tick — it carries how many
 * of it are in the stack already, and a plus that inks as you approach.
 */
export const AddsRatherThanSelects: Story = {
  args: {
    icon: <Boxes />,
    name: 'PostgreSQL',
    meta: [{ text: 'postgres:16', mono: true }],
    trailing: (
      <>
        <PickerRowCount n={3} />
        <PickerRowAdd />
      </>
    ),
    onClick: () => {},
  },
}

/** The dense rung — the "In this stack" panel. The name is a resource instance,
 *  so it is set in mono (§6). The row itself is not a target; the remove is. */
export const Dense: Story = {
  args: {
    size: 40,
    icon: <Database />,
    name: 'postgres-2',
    meta: [{ text: 'Database · 15' }],
    trailing: <PickerRowRemove label="Remove postgres-2" onRemove={() => {}} />,
  },
  decorators: [
    (Story) => (
      <div className="bg-card w-[276px] p-1">
        <Story />
      </div>
    ),
  ],
}

/** A name with nowhere to go must truncate, not push the trailing mark off the
 *  row. This is the state that breaks a list in production. */
export const LongName: Story = {
  args: {
    name: 'acme-platform/infrastructure-shared-service-definitions-and-helpers',
    meta: [
      { text: 'release/2026-08-candidate-with-a-long-name', mono: true },
      { text: 'updated 2 days ago' },
    ],
    endText: '12 services',
    selected: true,
    trailing: <PickerRowTick />,
    onClick: () => {},
  },
}

/** Nothing under the name — the row stays 56px and the name stays centred. */
export const NoMeta: Story = {
  args: { endText: '2 days ago', onClick: () => {} },
}

/** One live option at a time, inside the listbox the option role requires. */
export const SingleSelectList: Story = {
  render: function List() {
    const [picked, setPicked] = useState('acme/worker')
    return (
      <PickerList aria-label="Repositories">
        {REPOS.map((repo) => (
          <PickerRow
            key={repo.name}
            icon={<GitBranch />}
            name={repo.name}
            meta={[{ text: repo.branch, mono: true }, { text: repo.updated }]}
            selected={picked === repo.name}
            trailing={picked === repo.name ? <PickerRowTick /> : null}
            onClick={() => setPicked(repo.name)}
          />
        ))}
      </PickerList>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('option', { name: /design-tokens/ }))

    const live = canvas.getAllByRole('option').filter((o) => o.getAttribute('aria-selected') === 'true')
    await expect(live).toHaveLength(1)
    await expect(live[0]).toHaveAccessibleName(/design-tokens/)
  },
}

/** Add-ons link several at a time, so the list says so. */
export const MultiSelectList: Story = {
  render: function List() {
    const [linked, setLinked] = useState<string[]>(['acme-cache'])
    const addons = [
      { name: 'acme-cache', kind: 'Redis · 7' },
      { name: 'acme-primary', kind: 'PostgreSQL · 16' },
    ]
    return (
      <PickerList multiple aria-label="Managed add-ons">
        {addons.map((addon) => {
          const on = linked.includes(addon.name)
          return (
            <PickerRow
              key={addon.name}
              icon={<Database />}
              name={addon.name}
              meta={[{ text: addon.kind, mono: true }]}
              selected={on}
              trailing={on ? <PickerRowTick /> : null}
              onClick={() =>
                setLinked((was) => (on ? was.filter((n) => n !== addon.name) : [...was, addon.name]))
              }
            />
          )
        })}
      </PickerList>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('option', { name: /acme-primary/ }))

    const live = canvas.getAllByRole('option').filter((o) => o.getAttribute('aria-selected') === 'true')
    await expect(live).toHaveLength(2)
  },
}

/** The remove reaches the keyboard even though it is invisible at rest. */
export const RemoveIsReachable: Story = {
  args: {
    size: 40,
    icon: <Database />,
    name: 'postgres-2',
    meta: [{ text: 'Database · 15' }],
  },
  render: function Removable(args) {
    const [gone, setGone] = useState(false)
    if (gone) return <div className="text-meta text-fg-muted">Removed</div>
    return (
      <div className="w-[276px]">
        <PickerRow {...args} trailing={<PickerRowRemove label="Remove postgres-2" onRemove={() => setGone(true)} />} />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const remove = canvas.getByRole('button', { name: 'Remove postgres-2' })
    remove.focus()
    await expect(remove).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    await expect(canvas.getByText('Removed')).toBeInTheDocument()
  },
}

/**
 * **The chip lifts with the row.**
 *
 * At rest it is `--control`, a *recessed* fill — the tile is one element among
 * several on a shared ground. Live, it returns to the sheet and takes
 * `elevation/sm`, so it reads as raised out of the wash that just landed
 * around it.
 *
 * The two move in **opposite directions** — the row darkens, the chip
 * brightens — which is what makes a 4% wash legible at all. A chip that washed
 * along with its row would hold the same relative value and the state would
 * fall to the row's edges alone.
 */
export const TheChipLiftsWithTheRow: Story = {
  args: {
    meta: [{ text: 'main', mono: true }],
    onClick: () => {},
  },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector('.group\\/row') as HTMLElement
    const chip = row.firstElementChild as HTMLElement

    // At rest: recessed, flat.
    await expect(getComputedStyle(chip).boxShadow).toBe('none')

    // The hover state is asserted as WIRING, not as computed style. CSS
    // `:hover` answers to a real pointer position, and `userEvent.hover`
    // dispatches synthetic events — the pseudo-class never matches, so a
    // computed-style assertion here would pass on a component that does
    // nothing. The rendered values are measured with a real pointer instead.
    await expect(chip.className).toContain('group-hover/row:bg-popover')
    await expect(chip.className).toContain('group-hover/row:shadow-sm')
    // And the row is the group those reach through.
    await expect(row.className).toContain('group/row')

    // 12, not 8 — the row's radius reports what kind of thing it is, and does
    // not scale with its height.
    await expect(getComputedStyle(row).borderRadius).toBe('12px')
  },
}

/** Selected holds the lift without needing the pointer — it IS the live state. */
export const SelectedHoldsTheLift: Story = {
  args: {
    meta: [{ text: 'main', mono: true }],
    selected: true,
    trailing: <PickerRowTick />,
    onClick: () => {},
  },
  play: async ({ canvasElement }) => {
    const chip = (canvasElement.querySelector('.group\\/row') as HTMLElement)
      .firstElementChild as HTMLElement
    await expect(getComputedStyle(chip).boxShadow).not.toBe('none')
  },
}

/**
 * **A blocked row does not lift.** The affordance would be the one thing on it
 * still making a promise — and §9 is that a row which cannot be picked says so
 * with every signal it has, not all but one.
 */
export const BlockedDoesNotLift: Story = {
  args: {
    icon: <Database />,
    name: 'Redis',
    reason: 'Not available as a managed add-on yet',
    onClick: () => {},
  },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector('.group\\/row') as HTMLElement
    const chip = row.firstElementChild as HTMLElement
    await expect(getComputedStyle(chip).boxShadow).toBe('none')
    // Not merely un-hovered: the lift is not wired on at all, so no pointer
    // position can produce it.
    await expect(chip.className).not.toContain('group-hover/row:shadow-sm')
  },
}
