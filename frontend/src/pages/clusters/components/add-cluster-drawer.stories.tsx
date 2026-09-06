import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import AddClusterDrawer from './add-cluster-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

/**
 * The slide-in is 200ms. Every geometry read waits it out first — a rect taken
 * mid-transform is the value the panel was leaving, not the one it lands on.
 */
const settled = () => new Promise((r) => setTimeout(r, 300))

const meta = {
  title: 'Features/Clusters/AddClusterDrawer',
  component: AddClusterDrawer,
  args: {
    open: true,
    onOpenChange: fn(),
    onAddCluster: fn(),
  },
} satisfies Meta<typeof AddClusterDrawer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * How it opens. The primary is blocked and **says what is missing** — all four
 * at once, rather than one round of press-and-discover per field. It used to
 * disable on a bare boolean and say nothing at all.
 */
export const New: Story = {
  play: async () => {
    const add = await drawer().findByRole('button', { name: /add cluster/i })
    await expect(add).toBeDisabled()

    // `All`, not one: Radix renders tooltip content twice — the visible copy
    // and a visually-hidden one for screen readers.
    await userEvent.hover(add.parentElement!)
    await expect(await drawer().findAllByText(/enter a name/i)).not.toHaveLength(0)
    await expect(drawer().getAllByText(/enter the api server url/i)).not.toHaveLength(0)
    await expect(drawer().getAllByText(/paste the ca certificate/i)).not.toHaveLength(0)
    await expect(drawer().getAllByText(/paste the service account token/i)).not.toHaveLength(0)
  },
}

/**
 * **The registry size is part of the reason.** The switch is on by default, so
 * clearing its field is a fifth missing thing — and the block has to name it,
 * or the button goes off for a field the user cannot see they emptied.
 */
export const ClearingTheRegistrySizeBlocks: Story = {
  play: async () => {
    const size = await drawer().findByLabelText(/backend storage size/i)
    await userEvent.clear(size)

    const add = await drawer().findByRole('button', { name: /add cluster/i })
    await userEvent.hover(add.parentElement!)
    await expect(
      await drawer().findAllByText(/enter a storage size for the image registry/i),
    ).not.toHaveLength(0)
  },
}

/**
 * **The switch names the thing, not the act** — `Image registry`, not
 * `Enable Image Registry`, which wrote the control's own job into its label.
 * Turning it off takes the field it reveals with it: a setting a switch has not
 * unlocked is hidden, not greyed.
 */
export const TheRegistryIsASwitchedSetting: Story = {
  play: async () => {
    const registry = await drawer().findByRole('switch', { name: /^image registry$/i })
    await expect(registry).toHaveAttribute('data-state', 'checked')
    await expect(await drawer().findByLabelText(/backend storage size/i)).toBeInTheDocument()

    await userEvent.click(registry)
    await expect(registry).toHaveAttribute('data-state', 'unchecked')
    await expect(drawer().queryByLabelText(/backend storage size/i)).toBeNull()
  },
}

/**
 * **The switch centres on the whole statement, 24 off it** — `FieldShell
 * inline`, not the hand-rolled `flex` with the `mt-0.5` nudge §8 removed. Read
 * as gaps: the control's distance from the sentence, and its centre against the
 * centre of label-plus-hint together.
 */
export const TheSwitchSitsOnTheStatement: Story = {
  play: async () => {
    await settled()
    const registry = await drawer().findByRole('switch', { name: /^image registry$/i })
    const label = await drawer().findByText(/^image registry$/i)

    // **The sentence moved to the `?`.** It is a gloss on what the switch turns
    // on, not direction on what to type, so it rides the mark rather than
    // holding a permanent line under a 32px control.
    await expect(drawer().queryByText(/for the images your builds produce/i)).toBeNull()
    // The mark is a SIBLING of the `<label>`, never inside it — a `?` nested in
    // a label would answer to the field's own name.
    const mark = label.closest('label')!.nextElementSibling as HTMLElement
    await expect(mark.getAttribute('aria-label')).toBe('What does this do?')

    const [rs, rl] = [registry, label].map((el) => el.getBoundingClientRect())
    const rm = mark.getBoundingClientRect()

    // 24 between the statement and the control that answers it — the gap, not
    // either edge's position. The mark is part of the statement, so it is the
    // rightmost thing the gap is measured from.
    await expect(Math.round(rs.left - Math.max(rl.right, rm.right))).toBeGreaterThanOrEqual(24)
    // Centred on the statement, not pinned to a line above it.
    await expect(Math.abs((rs.top + rs.bottom) / 2 - (rl.top + rl.bottom) / 2)).toBeLessThanOrEqual(1)
  },
}

/**
 * **Nothing on this form shares a subject, so everything fills.** Asserted as
 * one trailing edge across every field, and as the body's own 16 rhythm between
 * them — including between the switch and the field it reveals, which used to
 * sit at a bespoke `pl-11`, 44px off the column.
 */
export const EveryFieldFillsOnOneEdge: Story = {
  play: async () => {
    await settled()
    const ids = ['name', 'cluster_url', 'cluster_ca_data', 'cluster_sa_token', 'registry-size']
    const rects = ids.map((id) => document.getElementById(id)!.getBoundingClientRect())

    // One trailing edge, and one leading edge. Not five near-alignments.
    const rights = new Set(rects.map((r) => Math.round(r.right)))
    const lefts = new Set(rects.map((r) => Math.round(r.left)))
    await expect(rights.size).toBe(1)
    await expect(lefts.size).toBe(1)

    // And the revealed field starts on the same x as the ones above it, rather
    // than indented under the switch.
    const registry = await drawer().findByRole('switch', { name: /^image registry$/i })
    await expect(Math.round(rects[4].left)).toBeLessThan(Math.round(registry.getBoundingClientRect().left))
  },
}

/**
 * The failure lands in the **footer band**, where a scrolling body cannot carry
 * it away from the button that produced it — the one thing the `max-h-[80vh]`
 * dialog could not promise.
 */
export const ErrorSitsInTheFooter: Story = {
  args: {
    error: 'A cluster named production-eu already exists. Pick another name, or open that one.',
  },
  play: async () => {
    const banner = await drawer().findByText(/already exists/i)
    await expect(banner.closest('[data-slot="drawer-footer"]')).not.toBeNull()
  },
}

/**
 * **The footer holds the primary alone.** No `Cancel` — the ✕, Esc and the
 * scrim are the exits, on this one-phase drawer as on every other.
 */
export const NoCancelInTheFooter: Story = {
  play: async () => {
    await expect(await drawer().findByRole('button', { name: /add cluster/i })).toBeInTheDocument()
    await expect(drawer().queryByRole('button', { name: 'Cancel' })).toBeNull()
  },
}
