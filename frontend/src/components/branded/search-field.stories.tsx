import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { SearchField } from './search-field'
import { EmptyState, NoConnectionGlyph } from './empty-state'
import { Button } from '@/components/ui/button'

/**
 * The one search box in the product.
 *
 * It had no story, and five call sites had each drawn their own copy of it —
 * the Shell toolbar plus the stacks, secrets, addons and previews pages, all
 * running the same `relative` wrapper, the same absolutely-positioned glyph and
 * the same `pl-8`. They matched, which is exactly why it was worth catching:
 * the next change to this field would have moved one of the six and left five
 * behind, and Storybook would have gone on showing the five.
 */
const meta = {
  title: 'Branded/SearchField',
  component: SearchField,
  tags: ['ai-generated'],
  // Every story drives the field through `Harness`, but the component's props
  // are required, so meta carries a set for the type to rest on.
  args: {
    value: '',
    onChange: () => {},
    placeholder: 'Filter stacks…',
    label: 'Filter stacks',
  },
} satisfies Meta<typeof SearchField>

export default meta
type Story = StoryObj<typeof meta>

/** The field is controlled, so every story drives it through real state — a
 *  placeholder that never disappears is not the control anyone ships. */
function Harness({
  width = 300,
  ...props
}: Partial<React.ComponentProps<typeof SearchField>> & { width?: number }) {
  const [value, setValue] = useState(props.value ?? '')
  return (
    <div style={{ width }}>
      <SearchField
        placeholder="Filter stacks…"
        label="Filter stacks"
        {...props}
        value={value}
        onChange={setValue}
      />
    </div>
  )
}

/** The toolbar face: 32 tall, 300 wide, glyph on the field's own 8px inset. */
export const Default: Story = {
  render: () => <Harness />,
}

/**
 * **The placeholder goes the moment you type; the name does not.** The label is
 * an `aria-label`, so the field keeps announcing what it filters after the
 * placeholder that said so has gone.
 */
export const WithValue: Story = {
  render: () => <Harness value="orders" />,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('searchbox', { name: 'Filter stacks' })
    await expect(input).toHaveValue('orders')
  },
}

/**
 * **8 and 8 at 32px** (§8). The glyph sits on the same left inset as a form
 * field's text, so a search box and the input under it share one leading edge —
 * this was 12 for a while against a 32px field that had already moved to 8, and
 * the single search box in the product began 4px right of everything below it.
 */
export const GlyphSharesTheFieldsInset: Story = {
  render: () => <Harness />,
  play: async ({ canvas, canvasElement }) => {
    const input = canvas.getByRole('searchbox', { name: 'Filter stacks' })
    const glyph = canvasElement.querySelector('svg') as SVGElement
    const row = input.parentElement as HTMLElement
    const rowBox = row.getBoundingClientRect()
    const glyphBox = glyph.getBoundingClientRect()
    // The inset, and the gap between the glyph and where the text starts.
    await expect(Math.round(glyphBox.left - rowBox.left)).toBe(8)
    await expect(Math.round(glyphBox.width)).toBe(16)
    await expect(Math.round(input.getBoundingClientRect().height)).toBe(32)
  },
}

/**
 * **`bare` — no edge, no ring, 40 tall.** The face for a field that owns its
 * surface's focus from the first frame: the canvas picker focuses this box when
 * the popover opens and never lets go, so a focus ring would be lit permanently
 * and report nothing. The glyph shares the row's left edge here rather than
 * centring on the chips below it, which is what keeps it bound to its own
 * placeholder instead of reading as an icon near some text.
 */
export const BareInsideAPanel: Story = {
  render: () => (
    <div className="w-[320px] rounded-xl bg-popover outline outline-1 outline-border-subtle">
      <Harness bare width={320} placeholder="Search resources…" label="Search resources" />
      <div className="border-t border-border-subtle p-1">
        {['postgres', 'redis', 'web', 'worker'].map((name) => (
          <div key={name} className="flex h-8 items-center rounded-md px-2 text-body text-fg-2">
            {name}
          </div>
        ))}
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole('searchbox', { name: 'Search resources' })
    await expect(Math.round(input.parentElement!.getBoundingClientRect().height)).toBe(40)
  },
}

/**
 * **Nothing to search yet — and the field stays.**
 *
 * §9 says a control must not refuse without saying why. It does not say the
 * control has to vanish: the reason is directly beneath it in full, with the fix
 * as a button. Pulling the field out would change the shape of the control band
 * between two states of one tab and shunt whatever sits beside it.
 */
export const NothingToSearchYet: Story = {
  render: () => (
    <div className="flex w-[420px] flex-col">
      <Harness disabled width={420} placeholder="Filter repositories…" label="Filter repositories" />
      <EmptyState
        className="gap-6"
        icon={<NoConnectionGlyph />}
        title="No provider connected"
        description="Connect GitHub or GitLab to browse the repositories you can deploy from."
        action={<Button variant="outline">Connect a provider</Button>}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('searchbox', { name: 'Filter repositories' })).toBeDisabled()
  },
}

/** Long queries truncate inside the field rather than widening the toolbar. */
export const LongQuery: Story = {
  render: () => <Harness value="orders-gateway-staging-eu-west-1-canary" />,
}
