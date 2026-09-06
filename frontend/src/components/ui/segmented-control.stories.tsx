import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { LayoutGrid, List, Rows3 } from 'lucide-react'
import { SegmentedControl, type SegmentedControlOption } from './segmented-control'

const VIEWS: SegmentedControlOption<'list' | 'cards'>[] = [
  { value: 'list', label: 'List', icon: <List /> },
  { value: 'cards', label: 'Cards', icon: <LayoutGrid /> },
]

const DENSITY: SegmentedControlOption<'compact' | 'cosy' | 'roomy'>[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'cosy', label: 'Cosy' },
  { value: 'roomy', label: 'Roomy' },
]

/** Stateful host — the control is controlled, so a story that never updates
 *  `value` would prove the click handler fires and nothing else. */
function Harness<T extends string>({
  options,
  initial,
  ...rest
}: {
  options: SegmentedControlOption<T>[]
  initial: T
  size?: 'sm' | 'default'
  disabled?: boolean
  'aria-label'?: string
}) {
  const [value, setValue] = useState<T>(initial)
  return <SegmentedControl options={options} value={value} onValueChange={setValue} {...rest} />
}

const meta = {
  title: 'Primitives/SegmentedControl',
  component: SegmentedControl,
  // The control is controlled, so every story renders through Harness. These
  // args exist only to satisfy the required props on the type.
  args: { options: VIEWS, value: 'list', onValueChange: () => {} },
  render: () => <Harness options={VIEWS} initial="list" aria-label="View" />,
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const IconOnly: Story = {
  render: () => <Harness options={VIEWS} initial="list" aria-label="View" />,
}

export const Labelled: Story = {
  render: () => <Harness options={DENSITY} initial="cosy" aria-label="Density" />,
}

export const IconAndLabel: Story = {
  render: () => (
    <Harness
      options={VIEWS.map((o) => ({ ...o, showLabel: true }))}
      initial="list"
      aria-label="View"
    />
  ),
}

export const ThreeSegments: Story = {
  render: () => (
    <Harness
      options={[
        { value: 'list', label: 'List', icon: <List /> },
        { value: 'rows', label: 'Rows', icon: <Rows3 /> },
        { value: 'cards', label: 'Cards', icon: <LayoutGrid /> },
      ]}
      initial="rows"
      aria-label="View"
    />
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Harness options={VIEWS} initial="list" size="sm" aria-label="View small" />
      <Harness options={VIEWS} initial="list" size="default" aria-label="View default" />
    </div>
  ),
}

export const Disabled: Story = {
  render: () => <Harness options={VIEWS} initial="list" disabled aria-label="View" />,
  play: async ({ canvas }) => {
    for (const name of ['List', 'Cards']) {
      await expect(canvas.getByRole('radio', { name })).toBeDisabled()
    }
  },
}

export const OneSegmentDisabled: Story = {
  render: () => (
    <Harness
      options={[
        { value: 'list', label: 'List', icon: <List /> },
        { value: 'cards', label: 'Cards', icon: <LayoutGrid />, disabled: true },
      ]}
      initial="list"
      aria-label="View"
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const cards = canvas.getByRole('radio', { name: 'Cards' })
    await expect(cards).toBeDisabled()
    // Arrows must skip it rather than parking selection on a dead segment.
    await userEvent.click(canvas.getByRole('radio', { name: 'List' }))
    await userEvent.keyboard('{ArrowRight}')
    await expect(canvas.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'true')
  },
}

export const LongLabelsDoNotWrap: Story = {
  render: () => (
    <div className="w-56">
      <Harness
        options={[
          { value: 'a', label: 'Everything, including archived' },
          { value: 'b', label: 'Only what needs attention' },
        ]}
        initial="a"
        aria-label="Scope"
      />
    </div>
  ),
}

/** Arrow keys move the selection and the focus with it; the group is a single
 *  Tab stop (roving tabindex), so Tab does not walk segment by segment. */
export const KeyboardNavigation: Story = {
  render: () => <Harness options={DENSITY} initial="compact" aria-label="Density" />,
  play: async ({ canvas, userEvent }) => {
    const [compact, cosy, roomy] = ['Compact', 'Cosy', 'Roomy'].map((n) =>
      canvas.getByRole('radio', { name: n }),
    )
    await expect(canvas.getByRole('radiogroup', { name: 'Density' })).toBeInTheDocument()

    await userEvent.tab()
    await expect(compact).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    await expect(cosy).toHaveFocus()
    await expect(cosy).toHaveAttribute('aria-checked', 'true')
    await expect(compact).toHaveAttribute('aria-checked', 'false')

    await userEvent.keyboard('{End}')
    await expect(roomy).toHaveAttribute('aria-checked', 'true')

    // Wraps rather than dead-ending.
    await userEvent.keyboard('{ArrowRight}')
    await expect(compact).toHaveAttribute('aria-checked', 'true')
  },
}

/** Selection is ink vs `fg-muted` — never opacity. A dimmed icon reads as
 *  disabled, which is the one state this control must never be confused with. */
export const SelectionIsInkNotOpacity: Story = {
  render: () => <Harness options={DENSITY} initial="compact" aria-label="Density" />,
  play: async ({ canvas }) => {
    const selected = canvas.getByRole('radio', { name: 'Compact' })
    const unselected = canvas.getByRole('radio', { name: 'Cosy' })

    for (const el of [selected, unselected]) {
      await expect(getComputedStyle(el).opacity).toBe('1')
    }
    await expect(getComputedStyle(selected).color).not.toBe(getComputedStyle(unselected).color)
  },
}

/** **The gap IS the divider.** The track is a well with 2px of padding and no
 *  line of its own, so the selected card floats inside it and there is nothing
 *  left to double. This replaced a bordered strip whose segments ran flush to
 *  the track's edge — that story asserted zero padding, which is now the fault
 *  rather than the fix. */
export const InsetCardInAWell: Story = {
  render: () => <Harness options={DENSITY} initial="compact" aria-label="Density" />,
  play: async ({ canvas }) => {
    const track = canvas.getByRole('radiogroup', { name: 'Density' })
    const first = canvas.getByRole('radio', { name: 'Compact' })
    const last = canvas.getByRole('radio', { name: 'Roomy' })
    const ts = getComputedStyle(track)

    // 2px on every side, and NO line — the fill change is the whole boundary.
    for (const side of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const) {
      await expect(parseFloat(ts[side])).toBe(2)
    }
    await expect(parseFloat(ts.borderLeftWidth)).toBe(0)

    // The selected card is inset by that padding on all four sides — asserted
    // as GAPS, not positions, because a position can be right while the space
    // around it is wrong.
    const t = track.getBoundingClientRect()
    const f = first.getBoundingClientRect()
    await expect(Math.round(f.left - t.left)).toBe(2)
    await expect(Math.round(f.top - t.top)).toBe(2)
    await expect(Math.round(t.bottom - f.bottom)).toBe(2)
    await expect(Math.round(t.right - last.getBoundingClientRect().right)).toBe(2)

    // No segment draws a rule any more; the selection is a fill and a lift.
    for (const seg of [first, last]) {
      await expect(parseFloat(getComputedStyle(seg).borderLeftWidth)).toBe(0)
      await expect(parseFloat(getComputedStyle(seg).borderRightWidth)).toBe(0)
    }
  },
}

/** §8 — the track takes its own height's radius and the segment takes one rung
 *  BELOW it. Concentric, not coincident: an inset face repeating its
 *  container's corner reads as a fatter corner rather than a nested one. */
export const RadiusIsConcentric: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Harness options={DENSITY} initial="compact" size="sm" aria-label="Small" />
      <Harness options={DENSITY} initial="compact" size="default" aria-label="Default" />
    </div>
  ),
  play: async ({ canvas }) => {
    const expected = { Small: [28, 6, 4], Default: [32, 8, 6] } as const
    for (const [name, [height, trackRadius, segRadius]] of Object.entries(expected)) {
      const track = canvas.getByRole('radiogroup', { name })
      const style = getComputedStyle(track)
      await expect(parseFloat(style.height)).toBe(height)
      await expect(parseFloat(style.borderRadius)).toBe(trackRadius)

      // Every corner of the card is its own now — it touches no track edge.
      const segment = canvas.getAllByRole('radio').find((r) => track.contains(r))!
      const seg = getComputedStyle(segment)
      for (const corner of ['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius'] as const) {
        await expect(parseFloat(seg[corner])).toBe(segRadius)
      }
      await expect(segRadius).toBeLessThan(trackRadius)
    }
  },
}

/** Hover moves the INK and nothing else — the same rule the tabs follow. */
export const HoverMovesTheInkOnly: Story = {
  render: () => <Harness options={DENSITY} initial="compact" aria-label="Density" />,
  play: async ({ canvas }) => {
    const unselected = canvas.getByRole('radio', { name: 'Roomy' })
    await expect(unselected.className).toContain('hover:text-foreground')
    // No fill on approach, in any form.
    await expect(unselected.className).not.toContain('hover:bg-')
    await expect(getComputedStyle(unselected).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  },
}

/**
 * **The raised face is a travelling INDICATOR, not the button.** The lift used
 * to live on the selected segment, so switching turned one shadow off and
 * another on in the same frame. One card behind the row, moved to the selected
 * segment's box, is what carries you across (§5 — the one piece of content
 * allowed an elevation).
 */
export const SelectedFaceIsRaised: Story = {
  render: () => <Harness options={DENSITY} initial="cosy" aria-label="Density" />,
  play: async ({ canvas, canvasElement }) => {
    const track = canvas.getByRole('radiogroup', { name: 'Density' })
    const face = canvasElement.querySelector<HTMLElement>('[data-slot="segment-indicator"]')!
    const selected = canvas.getByRole('radio', { name: 'Cosy' })

    // The lift is `shadow-sm` and nothing heavier — a raised face, not a float.
    await expect(getComputedStyle(face).boxShadow).not.toBe('none')
    // The buttons carry NO face of their own now; they own their ink only.
    for (const name of ['Compact', 'Cosy', 'Roomy']) {
      const seg = canvas.getByRole('radio', { name })
      await expect(getComputedStyle(seg).boxShadow).toBe('none')
      await expect(getComputedStyle(seg).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    }

    // The face is exactly the selected segment's box — asserted as agreement
    // between two rects, not as a position either one happens to hold.
    const f = face.getBoundingClientRect()
    const sel = selected.getBoundingClientRect()
    await expect(Math.round(f.left)).toBe(Math.round(sel.left))
    await expect(Math.round(f.width)).toBe(Math.round(sel.width))

    // And it is inset by the well's own 2px, top and bottom.
    const t = track.getBoundingClientRect()
    await expect(Math.round(f.top - t.top)).toBe(2)
    await expect(Math.round(t.bottom - f.bottom)).toBe(2)
  },
}

/** **It travels; it does not blink.** `transform` and `width` only — never
 *  `all`, which would sweep up the colour change and cost a paint per frame —
 *  and nothing animates on first paint. */
export const SelectionTravels: Story = {
  render: () => <Harness options={DENSITY} initial="compact" aria-label="Density" />,
  play: async ({ canvas, canvasElement }) => {
    const face = canvasElement.querySelector<HTMLElement>('[data-slot="segment-indicator"]')!
    const x = () => new DOMMatrix(getComputedStyle(face).transform).m41

    // The transition is withheld until after the first paint — that is the
    // point of `armed`, so opening a screen does not slide the face in from the
    // left. So wait for it to arm rather than reading it on frame one.
    await waitFor(async () => {
      const props = getComputedStyle(face).transitionProperty
      await expect(props).toContain('transform')
      await expect(props).toContain('width')
      await expect(props).not.toContain('all')
    })

    const start = x()
    canvas.getByRole('radio', { name: 'Roomy' }).click()

    // It must pass THROUGH the gap, not jump it. A jump would satisfy any
    // start/end assertion, which is why the midpoint is the one that matters.
    let interpolated = false
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 40))
      const v = x()
      if (v > Math.min(start, x()) && Math.abs(v - start) > 1) interpolated = true
    }
    await new Promise((r) => setTimeout(r, 260))
    await expect(Math.abs(x() - start)).toBeGreaterThan(1)
    await expect(interpolated).toBe(true)
  },
}

/** Icon-only segments are SQUARE — 28 inside the 32px control's 2px well. A
 *  lone glyph with horizontal padding makes a squat rectangle instead. */
export const IconOnlySegmentsAreSquare: Story = {
  render: () => <Harness options={VIEWS} initial="list" aria-label="View" />,
  play: async ({ canvas }) => {
    const track = canvas.getByRole('radiogroup', { name: 'View' })
    await expect(Math.round(track.getBoundingClientRect().height)).toBe(32)
    for (const seg of canvas.getAllByRole('radio')) {
      const r = seg.getBoundingClientRect()
      await expect(Math.round(r.width)).toBe(28)
      await expect(Math.round(r.height)).toBe(28)
    }
  },
}
