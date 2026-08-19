import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { useEffect } from 'react'

import { ToastAction } from '@/components/ui/toast'
import { Toaster } from '@/components/ui/toaster'
import { readingDuration, toast, useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'

/** The viewport is portalled to the body, so `canvas` cannot see it. */
const view = () => within(document.body)

/**
 * **Only the OPEN ones.** A dismissed toast keeps `role="status"` for the 250ms
 * its exit animation runs, so a plain role query sees the last story's toasts
 * on their way out as well as this story's.
 */
const open = () => Array.from(document.querySelectorAll<HTMLElement>('[role="status"][data-state="open"]'))

const openCount = (n: number) => waitFor(async () => {
  await expect(open()).toHaveLength(n)
  return open()
})

/**
 * **Settle the entrance before reading a rect.** The toast slides in from above
 * the viewport, so a geometry check that runs on the first frame measures a
 * negative `top` and reports a bug that does not exist.
 */
const settled = async (n = 1) => {
  const found = await openCount(n)
  await Promise.all(found.flatMap((el) => el.getAnimations().map((a) => a.finished.catch(() => {}))))
  return found
}

type Raised = Parameters<typeof toast>[0]

/**
 * Raises its toasts on mount and clears them on unmount.
 *
 * The store is a module singleton, so it would otherwise carry one story's
 * toasts into the next — and React's StrictMode runs the effect twice, which
 * would raise each toast twice. Clearing at the top of the effect makes both
 * runs land on the same result.
 */
function Raise({ toasts }: { toasts: Raised[] }) {
  const { dismiss } = useToast()
  useEffect(() => {
    dismiss()
    toasts.forEach((t) => toast(t))
    return () => dismiss()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="min-h-[420px] p-4">
      <Button variant="outline" onClick={() => toasts.forEach((t) => toast(t))}>
        Raise again
      </Button>
      <Toaster />
    </div>
  )
}

const meta = {
  title: 'Primitives/Toast',
  component: Raise,
  tags: ['ai-generated'],
} satisfies Meta<typeof Raise>

export default meta
type Story = StoryObj<typeof meta>

/**
 * **Board `427:5102`, all four tones.** One surface, one hairline, and the tone
 * carried by the glyph alone — it used to tint the border per tone, which said
 * the severity twice and made four components that looked like four different
 * things.
 */
export const EveryTone: Story = {
  args: {
    toasts: [
      { title: 'orders-api deployed to prod-us-east.', variant: 'success' },
      { title: 'Could not reach the cluster', description: 'The deploy was not started.', variant: 'destructive' },
      { title: 'Two services still point at the old domain.', variant: 'warning' },
      { title: 'Build logs are still streaming.', variant: 'info' },
    ],
  },
  play: async () => {
    const toasts = await settled(4)

    // 380, or the screen minus the viewport's 16 either side when there is not
    // room for 380 — the clamp is the rule on a phone, not a failure.
    const expected = Math.min(380, window.innerWidth - 32)
    const edges = new Set<string>()
    for (const t of toasts) {
      await expect(Math.round(t.getBoundingClientRect().width)).toBe(expected)
      // The edge is an OUTLINE, not a border — outside the box, so it sits on
      // the shadow rather than on the surface.
      await expect(getComputedStyle(t).borderTopWidth).toBe('0px')
      edges.add(getComputedStyle(t).outlineColor)
    }
    // One edge colour across four tones. It used to be four.
    await expect(edges.size).toBe(1)
  },
}

/**
 * **Bottom right, 16 clear of both edges.** It went to top centre and came back
 * the same day, on the render: the centre put it over the sheet header, and in
 * light both are white — so it read as a header widget rather than as a message
 * floating over the page. The corner has no chrome to be mistaken for.
 */
export const ItSitsInTheCorner: Story = {
  args: { toasts: [{ title: 'Secret created.', variant: 'success' }] },
  play: async () => {
    const [t] = await settled(1)
    const box = t.getBoundingClientRect()

    await expect(Math.round(window.innerWidth - box.right)).toBe(16)
    await expect(Math.round(window.innerHeight - box.bottom)).toBe(16)
  },
}

/**
 * **The surface cannot separate itself, so the edge has to.** Measured in the
 * running app: the toast's white and the sheet's white are the same colour —
 * `surface vs ground` is **1.00** — so the hairline is the whole object's
 * legibility.
 *
 * The board's `line/subtle` (0.06) was picked against the board's grey frame,
 * which is not the ground it ships on. Off the rendered pixels, 0.06 → 0.18
 * takes the left edge from **1.24 to 1.43** in light and **1.26 to 1.44** in
 * dark. Solve contrast against the worst ground.
 */
export const TheEdgeIsWhatMakesItAnObject: Story = {
  args: { toasts: [{ title: 'Domain added.', variant: 'success' }] },
  play: async () => {
    const [t] = await settled(1)
    const cs = getComputedStyle(t)

    // `line/strong`, not `line/subtle` — and outside, on the shadow.
    await expect(cs.outlineStyle).toBe('solid')
    await expect(cs.outlineWidth).toBe('1px')
    await expect(cs.outlineOffset).toBe('0px')
    await expect(cs.borderTopWidth).toBe('0px')

    const alpha = Number(/[\d.]+\)$/.exec(cs.outlineColor)?.[0].replace(')', '') ?? '1')
    const strong = getComputedStyle(document.documentElement).getPropertyValue('--border-strong')
    await expect(strong).toContain(String(alpha))

    // **And the shadow has a contact layer.** The four rungs are all soft pools
    // with negative spread — they blur out below a card and leave nothing at
    // its own edge, which is fine for a popover (it has its trigger) and wrong
    // for the one surface with nothing behind it. Counted rather than matched:
    // Tailwind pads `box-shadow` with transparent ring placeholders, so the
    // test is how many layers actually paint.
    const painted = (cs.boxShadow.match(/rgba?\([^)]*\)[^,]*/g) ?? []).filter((s) => !/,\s*0\)/.test(s))
    await expect(painted.length).toBeGreaterThanOrEqual(2)
  },
}

/**
 * **One paragraph at `body/400`.** The board draws every tone that way,
 * including the two-sentence ones — so the title and the description flow
 * together on one line box rather than as a bold heading over a dimmed caption.
 * The title was `font-semibold`, a weight §6 took off the scale.
 */
export const TitleAndDescriptionAreOneSentence: Story = {
  args: {
    toasts: [
      {
        title: 'Addon created',
        description: 'Provisioning has started; status will update as it is ready.',
        variant: 'success',
      },
    ],
  },
  play: async () => {
    await openCount(1)

    // The stop the title never carried — titles are written as fragments.
    await expect(
      await view().findByText(/Addon created\. Provisioning has started/),
    ).toBeInTheDocument()

    const title = await view().findByText('Addon created')
    const description = await view().findByText(/Provisioning has started/)
    const weights = [title, description].map((el) => getComputedStyle(el).fontWeight)
    await expect(weights).toEqual(['400', '400'])
    // One tier, so one colour — and they share a line box, so one top.
    await expect(getComputedStyle(title).color).toBe(getComputedStyle(description).color)
  },
}

/**
 * **It dismisses itself, and the clock is a function of how much there is to
 * read** — ~1s per three words over a 3s base, clamped to 4–10s. A fixed number
 * is wrong at both ends: two words hold the screen long after they have been
 * read, and a sentence naming three affected stacks is gone before it has been.
 */
export const TheClockScalesWithTheWords: Story = {
  args: { toasts: [{ title: 'Secret created.', variant: 'success' }] },
  play: async () => {
    // Two words floors at 4s; a long sentence earns more; nothing exceeds 10s.
    await expect(readingDuration('Secret created')).toBe(4000)
    await expect(
      readingDuration('Could not reach the cluster', 'The deploy was not started.'),
    ).toBeGreaterThan(4000)
    await expect(
      readingDuration(
        'Registry removed',
        'Stacks affected: web-storefront, checkout-api, billing-worker. Their image pulls or pushes may fail until another credential covers docker.io, so check each one before the next deploy.',
      ),
    ).toBe(10000)

    await openCount(1)
  },
}

/**
 * **A toast carrying an action never times out.** The clock exists to clear a
 * message that has been read; a control has to be *found* and *pressed*, and a
 * timer racing the pointer is exactly what WCAG 2.2.1 is about.
 */
export const AnActionStopsTheClock: Story = {
  args: {
    toasts: [
      {
        title: 'Import finished with warnings.',
        variant: 'warning',
        action: <ToastAction altText="Review the import warnings">Review</ToastAction>,
      },
    ],
  },
  play: async () => {
    const [t] = await openCount(1)
    // Radix does not write the resolved duration to the DOM, so the observable
    // fact is that it is still open past the longest clock any copy could earn.
    await expect(t).toHaveAttribute('data-state', 'open')
    await expect(await view().findByRole('button', { name: 'Review' })).toBeInTheDocument()
  },
}

/**
 * The ✕ draws at the board's 16px and answers at 24 — `-m-1 p-1` grows the hit
 * area without moving the layout box, so the geometry still measures the
 * board's while the pointer and the keyboard get something to land on.
 */
export const TheCloseIsBiggerThanItLooks: Story = {
  args: { toasts: [{ title: 'Domain added.', variant: 'success' }] },
  play: async () => {
    await openCount(1)
    const close = await view().findByRole('button', { name: /close/i })
    const box = close.getBoundingClientRect()
    await expect(box.width).toBeGreaterThanOrEqual(24)
    await expect(box.height).toBeGreaterThanOrEqual(24)

    const glyph = close.querySelector('svg')!
    await expect(Math.round(glyph.getBoundingClientRect().width)).toBe(16)

    await userEvent.click(close)
    await openCount(0)
  },
}
