import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { useState } from 'react'
import { Database, Globe, HardDrive, Zap } from 'lucide-react'
import { MultiSelect } from './multi-select'
import { FieldShell } from '@/components/branded'
import { Input } from '@/components/ui/input'

const RESOURCES = [
  { label: 'session', value: 'session' },
  { label: 'tokens', value: 'tokens' },
  { label: 'orders-db', value: 'orders-db' },
  { label: 'cache', value: 'cache' },
]

const meta = {
  title: 'Primitives/MultiSelect',
  component: MultiSelect,
  parameters: {
    docs: {
      description: {
        component:
          'A field that holds several answers instead of one. Built from Popover + Command + Checkbox + Badge — the same material a Select wears, at the same 32 rung.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[440px] bg-card p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    options: RESOURCES,
    onValueChange: fn(),
    placeholder: 'Select dependencies',
  },
} satisfies Meta<typeof MultiSelect>

export default meta
type Story = StoryObj<typeof meta>

/** Nothing chosen. The placeholder takes `fg-muted`, and the only trailing mark
 *  is the chevron pair — there is no clear ✕ when there is nothing to clear. */
export const Empty: Story = {}

/** The everyday state: two chips, a clear, the chevrons. */
export const WithSelection: Story = {
  args: { defaultValue: ['session', 'tokens'] },
}

/**
 * **It rests at 32 — the same rung as the Input beside it.**
 *
 * This is the comparison that matters: the control shipped at 40, so the one
 * multi-select in the product sat 8px taller than the nine inputs and selects
 * around it in the same form.
 */
export const AgainstItsNeighbours: Story = {
  args: { defaultValue: ['session'] },
  render: (args) => (
    <div className="flex flex-col gap-4">
      <FieldShell label="Name" hint="Lowercase letters, numbers and hyphens.">
        <Input defaultValue="edge" />
      </FieldShell>
      <FieldShell label="Depends on" hint="These start first.">
        <MultiSelect {...args} />
      </FieldShell>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByDisplayValue('edge')
    const trigger = canvas.getByRole('combobox')
    // The rung is the point of this story, so it is asserted rather than eyeballed.
    await expect(Math.round(input.getBoundingClientRect().height)).toBe(32)
    await expect(Math.round(trigger.getBoundingClientRect().height)).toBe(32)
    // And both end on the same x — a field's controls share a trailing edge.
    await expect(Math.round(input.getBoundingClientRect().right)).toBe(
      Math.round(trigger.getBoundingClientRect().right),
    )
  },
}

/** Past `maxCount` the rest collapse to a count. The `+N` carries no ✕ — it
 *  stands for selections the reader cannot see, and deleting those blind would
 *  be the one removal they could not check. */
export const OverflowsToACount: Story = {
  args: { defaultValue: ['session', 'tokens', 'orders-db', 'cache'], maxCount: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('+2')).toBeVisible()
    await expect(canvas.queryByLabelText('Remove +2')).toBeNull()
  },
}

/** Long values wrap the control rather than overflowing it — and the growth
 *  reads as growth because the resting height matches its neighbours. */
export const LongValuesWrap: Story = {
  args: {
    options: [
      { label: 'orders-api-eu-west-primary', value: 'a' },
      { label: 'session-store-replica-2', value: 'b' },
      { label: 'analytics-ingest-worker', value: 'c' },
    ],
    defaultValue: ['a', 'b', 'c'],
    maxCount: 3,
  },
}

/** Options can carry a glyph where the kind is not in the word. */
export const WithIcons: Story = {
  args: {
    options: [
      { label: 'web', value: 'web', icon: Globe },
      { label: 'orders-db', value: 'orders-db', icon: Database },
      { label: 'cache', value: 'cache', icon: Zap },
      { label: 'uploads', value: 'uploads', icon: HardDrive },
    ],
    defaultValue: ['web', 'orders-db'],
  },
}

/**
 * **Off, and the placeholder says why** — §9: nothing is disabled without
 * stating what is missing, in the verb of the act.
 */
export const NothingToDependOn: Story = {
  args: { disabled: true, placeholder: 'No other resources available' },
}

/** Invalid takes the danger line, the same mark a `Select` takes. */
export const Invalid: Story = {
  args: { defaultValue: ['session'], 'aria-invalid': true },
}

/**
 * **Above the threshold the popover grows a search box.** Below it, a search
 * box is a control you tab past to reach a list you can already see all of.
 */
export const SearchAppearsWhenTheListIsLong: Story = {
  args: {
    options: Array.from({ length: 12 }, (_, i) => ({
      label: `service-${String(i + 1).padStart(2, '0')}`,
      value: `s${i}`,
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
    // The menu is portalled, so it is looked for on the body, not the canvas.
    // `waitFor` because the popover fades in — asserting visibility on the
    // frame it mounts catches it at opacity 0.
    const menu = within(document.body)
    const search = await menu.findByPlaceholderText('Search')
    await waitFor(() => expect(search).toBeVisible())
  },
}

/**
 * **One click, one toggle.**
 *
 * The row owns the click and the checkbox only reports — a checkbox that also
 * handled it fired the toggle twice and the option flickered straight back to
 * where it started.
 */
export const RowTogglesExactlyOnce: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([])
    return (
      <div className="flex flex-col gap-3">
        <MultiSelect {...args} defaultValue={value} onValueChange={setValue} />
        <p data-testid="value" className="text-meta text-fg-muted">
          {value.length ? value.join(', ') : 'nothing selected'}
        </p>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
    const menu = within(document.body)
    // By ROLE, not by text: once the option is chosen its name is also on a
    // chip in the trigger, and a bare text query then matches two elements.
    const row = () => menu.findByRole('option', { name: 'orders-db' })
    await userEvent.click(await row())
    await expect(canvas.getByTestId('value')).toHaveTextContent('orders-db')
    // Clicking the same row again takes it back off — not on a second time.
    await userEvent.click(await row())
    await expect(canvas.getByTestId('value')).toHaveTextContent('nothing selected')
  },
}

/** The chip's ✕ removes just that one; the trailing ✕ empties the field. */
export const RemovingFromTheField: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(['session', 'tokens'])
    return (
      <div className="flex flex-col gap-3">
        <MultiSelect {...args} defaultValue={value} onValueChange={setValue} />
        <p data-testid="value" className="text-meta text-fg-muted">
          {value.length ? value.join(', ') : 'nothing selected'}
        </p>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText('Remove session'))
    await expect(canvas.getByTestId('value')).toHaveTextContent('tokens')
    await userEvent.click(canvas.getByLabelText('Clear all'))
    await expect(canvas.getByTestId('value')).toHaveTextContent('nothing selected')
    // With nothing left, the clear goes too.
    await expect(canvas.queryByLabelText('Clear all')).toBeNull()
  },
}
