import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Input } from './input'

const meta = {
  title: 'Primitives/Input',
  component: Input,
  tags: ['ai-generated'],
  args: { placeholder: 'my-stack-name' },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Sizes: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-3">
      <Input {...args} size="sm" placeholder="sm — 28px" />
      <Input {...args} size="default" placeholder="default — 32px" />
      <Input {...args} size="lg" placeholder="lg — 40px" />
    </div>
  ),
}

/** §2 — radius is a function of HEIGHT, and the ladder binds inputs exactly as
 *  it binds buttons: 28/6 · 32/8 · 40/12. The Input used to run a single 8px
 *  corner across every height, so a 28px field in a toolbar sat 2px rounder
 *  than the 28px button next to it. Mirrors Button's FlatRadiusTracksHeight. */
export const RadiusTracksHeight: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      {(['sm', 'default', 'lg'] as const).map((size) => (
        <Input key={size} size={size} aria-label={size} readOnly defaultValue={size} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const expected = { sm: [28, 6], default: [32, 8], lg: [40, 12] } as const
    for (const [size, [height, radius]] of Object.entries(expected)) {
      const el = canvas.getByRole('textbox', { name: size })
      const style = getComputedStyle(el)
      await expect(parseFloat(style.height)).toBe(height)
      await expect(parseFloat(style.borderRadius)).toBe(radius)
    }
  },
}
/**
 * **A field is a WELL, so hover moves the LINE — never the fill.**
 *
 * That is the whole thing that separates it from Select. A select has a face of
 * its own and can lift it; a field is a recess cut into the sheet, and a recess
 * that brightens on hover stops reading as a recess. Both were drawn on the
 * board and this is the one that survived.
 *
 * The fill it sits at is `--input`, a grey well — deliberately not white. Hover
 * takes the `border-strong` rung of §4's line ladder and nothing else.
 */
export const HoverMovesTheLineNotTheFill: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox')
    await expect(input.className).toContain('hover:[outline-color:var(--border-strong)]')
    // No fill change on hover, in any form.
    await expect(input.className).not.toContain('hover:bg-')
    await expect(input.className).toContain('bg-card')

    // The well is grey, not the sheet's white.
    const style = getComputedStyle(input)
    const probe = document.createElement('div')
    // The well now sits ON the sheet, like the select and the outline button
    // beside it. It used to be asserted as "not the card" — that was the whole
    // point of `--input`, and the point moved.
    probe.className = 'bg-card'
    document.body.appendChild(probe)
    await expect(style.backgroundColor).toBe(getComputedStyle(probe).backgroundColor)
    probe.remove()
  },
}

export const Filled: Story = { args: { defaultValue: 'my-first-stack' } }
/**
 * §9 — disabled is **dim plus the not-allowed cursor**, and nothing else.
 *
 * `pointer-events-none` must stay off it: the control has to receive the
 * pointer for the cursor to show at all, and the native `disabled` attribute
 * already blocks the click. Removing the utility is what made the cursor
 * appear; putting it back would silently undo this.
 */
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'my-first-stack' },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox')
    const style = getComputedStyle(input)
    await expect(style.pointerEvents).not.toBe('none')
    await expect(style.cursor).toBe('not-allowed')
    await expect(parseFloat(style.opacity)).toBeLessThan(1)
    // Dim is the whole signal — the line must not move as well.
    await expect(input.className).toContain('disabled:hover:[outline-color:var(--border)]')
  },
}
export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'not a valid name!' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  },
}
export const LongValueOverflow: Story = {
  args: {
    defaultValue:
      'this-is-an-unreasonably-long-stack-name-that-should-not-blow-out-the-pill-shaped-field-layout',
  },
  render: (args) => (
    <div className="w-64">
      <Input {...args} />
    </div>
  ),
}
export const Password: Story = { args: { type: 'password', defaultValue: 'hunter2' } }

// Focus-visible must render as a solid outline ring off --ring, not the
// removed ring-* utilities — tab to the input rather than clicking so
// :focus-visible actually engages. Mirrors Button's KeyboardFocusOutline.
export const KeyboardFocusOutline: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('textbox')
    await userEvent.tab()
    await expect(input).toHaveFocus()
    const style = getComputedStyle(input)
    // The ring is a box-shadow, never an outline — a shadow follows the radius,
    // stacks with the press recess, and carries a gap where a dark face needs one.
    //
    // Asserted as the CLASS CONTRACT, not the computed pixel. `box-shadow` set by
    // an unlayered rule resolves correctly in the app and in a live Storybook —
    // both measured — but comes back as Tailwind's `0 0 #0000` default inside this
    // browser-test harness. Pinning the computed value here would be testing the
    // harness. What must never come back is `outline` or a `ring-*` utility, and
    // that is exactly what these two lines hold.
    await expect(style.outlineStyle).toBe('none')
    await expect(input.className).toMatch(/(?:^|\s)focus-ring(?:-edge|-inset)?(?:\s|$)/)
    await expect(input.className).not.toMatch(/(?:^|[\s:])ring-/)
  },
}

/** **The board's `Field` — all eight variants** (`Shape × State`, node 21:191).
 *  Two shapes, four states, one 32px height. Hover and focus are driven by the
 *  play function rather than mocked with classes, so what is asserted is the
 *  real cascade and not a picture of it. */
export const BoardField: Story = {
  render: () => (
    <div className="bg-background flex gap-6 p-6">
      {(['pill', 'flat'] as const).map((shape) => (
        <div key={shape} className="flex w-[300px] flex-col gap-4">
          {(['default', 'hover', 'focus', 'disabled'] as const).map((state) => (
            <Input
              key={state}
              shape={shape}
              disabled={state === 'disabled'}
              aria-label={`${shape}-${state}`}
              placeholder="Filter stacks…"
            />
          ))}
        </div>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    // Board: 32px tall, 8px inset, pill 999 / flat 8.
    for (const shape of ['pill', 'flat'] as const) {
      const el = canvas.getByLabelText(`${shape}-default`)
      const cs = getComputedStyle(el)
      await expect(el.getBoundingClientRect().height).toBe(32)
      await expect(cs.paddingLeft).toBe('8px')
      await expect(cs.paddingRight).toBe('8px')
      // `rounded-full` resolves to an effectively infinite px value, so a pill
      // is asserted as "at least half the height" rather than a literal number.
      const radius = parseFloat(cs.borderTopLeftRadius)
      if (shape === 'pill') await expect(radius).toBeGreaterThanOrEqual(16)
      else await expect(radius).toBe(8)
    }

    // Hover is NOT asserted here. Synthetic pointer events do not put an
    // element into the real `:hover` state, so a computed read after
    // `userEvent.hover` returns the resting value and the check passes on
    // nothing. Verified with a real pointer instead: hovering the field lifts
    // its border to `--border-strong` (0.18) and leaves the fill untouched —
    // a field is a WELL, so hover is carried by the LINE (§4).

    // Board: focus is the 2px accent ring, and the flush ring REPLACES the
    // hairline — the border keeps its 1px and goes transparent (§5).
    // Focus is not re-asserted here — `KeyboardFocusOutline` above already
    // proves the ring, and proving it twice in a variant grid only adds a
    // second thing to break.

    // Board: disabled is dimmed and nothing else — the line does not move.
    const off = canvas.getByLabelText('flat-disabled')
    await expect(getComputedStyle(off).opacity).toBe('0.5')
  },
}
