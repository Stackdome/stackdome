import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { AlertBanner } from '@/components/branded/alert-banner'
import { FieldShell } from '@/components/branded/field-shell'
import { Button } from './button'
import { Input } from './input'
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTrigger,
} from './drawer'

const meta = {
  title: 'Primitives/Drawer',
  component: Drawer,
  tags: ['ai-generated'],
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

const field = (label: string, value: string, id: string, hint?: string) => (
  <FieldShell key={id} label={label} htmlFor={id} hint={hint}>
    <Input id={id} defaultValue={value} />
  </FieldShell>
)

/** form — 480. One column, and the great majority of what the product asks for. */
export const Form: Story = {
  render: () => (
    <Drawer defaultOpen>
      <DrawerTrigger asChild>
        <Button>New secret</Button>
      </DrawerTrigger>
      <DrawerContent size="form">
        <DrawerHeader
          title="New secret"
          description="Available to every service in this project, at build and run time."
        />
        <DrawerBody>
          {field('Name', 'DEPLOY_KEY', 'd-name')}
          {field('Description', '', 'd-desc')}
          {field('Value', 'hunter2', 'd-value', 'Encrypted at rest. Never shown again once saved.')}
        </DrawerBody>
        <DrawerFooter>
          <DrawerActions>
            <Button variant="outline">Cancel</Button>
            <Button>Create secret</Button>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}

/**
 * work — 640, with a long form and a failure.
 *
 * The two things this proves: the body scrolls under a fixed border, and the
 * error sits in the footer band where the scroll cannot take it away.
 */
export const LongFormWithError: Story = {
  render: () => (
    <Drawer defaultOpen>
      <DrawerTrigger asChild>
        <Button>New object store</Button>
      </DrawerTrigger>
      <DrawerContent size="work">
        <DrawerHeader
          title="New object store"
          description="A backup destination. Credentials reference a secret you have already saved."
        />
        <DrawerBody>
          {field('Name', 'backups-eu', 'o-name')}
          {field('Destination path', 's3://acme-backups/eu', 'o-path')}
          {field('Retention', '7d', 'o-ret')}
          {field('Region', 'eu-west-1', 'o-region')}
          {field('Endpoint URL', '', 'o-endpoint')}
          {field('Access key ID', 'AWS_BACKUPS / accessKeyId', 'o-akid')}
          {field('Secret access key', 'AWS_BACKUPS / secretAccessKey', 'o-sak')}
          {field('Storage class', 'STANDARD_IA', 'o-class')}
        </DrawerBody>
        <DrawerFooter>
          <AlertBanner>
            A store named backups-eu already exists — pick another name, or edit
            the existing one.
          </AlertBanner>
          <DrawerActions>
            <Button variant="outline">Cancel</Button>
            <Button>Create object store</Button>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}

/**
 * The bands are the design, so they are asserted rather than eyeballed: the two
 * borders are real, the body is the only thing that scrolls, and the error sits
 * outside it.
 */
export const BandsAreMeasured: Story = {
  ...LongFormWithError,
  play: async () => {
    const body = within(document.body)
    const drawer = await body.findByRole('dialog')
    // The enter animation slides from the right; measured mid-flight every
    // number is wrong, so wait for it to settle.
    await Promise.all(drawer.getAnimations().map((a) => a.finished))

    const header = drawer.querySelector('[data-slot="drawer-header"]')!
    const scroll = drawer.querySelector('[data-slot="drawer-body"]')!
    const footer = drawer.querySelector('[data-slot="drawer-footer"]')!

    // Both rules are permanent — not affordances that appear on overflow.
    //
    // The header's is an INSET SHADOW (`sheet-edge-b`), not a border, and that
    // is the point of asserting it here: a `border-b` is part of the box, so a
    // band that pays 16 at the foot measures 17. Beside a peer sheet that 1px
    // is visible — the sheet header across the gutter draws the same line the
    // same way, and a border put the two hairlines a pixel out of step.
    await expect(getComputedStyle(header).boxShadow).toContain('inset')
    await expect(getComputedStyle(header).borderBottomWidth).toBe('0px')
    await expect(getComputedStyle(footer).borderTopWidth).toBe('1px')

    // Three bands, flush: no gaps between them.
    await expect(
      Math.round(scroll.getBoundingClientRect().top - header.getBoundingClientRect().bottom)
    ).toBe(0)
    await expect(
      Math.round(footer.getBoundingClientRect().top - scroll.getBoundingClientRect().bottom)
    ).toBe(0)

    // The body is the band that gives. Whether it happens to overflow depends
    // on the content, so what is asserted is the structure that makes it able
    // to: the drawer is exactly viewport height, and the three bands account
    // for all of it — so any surplus content has to scroll inside the middle
    // one rather than push the footer off the bottom.
    await expect(getComputedStyle(scroll).overflowY).toBe('auto')
    const viewportH = document.documentElement.clientHeight
    await expect(Math.round(drawer.getBoundingClientRect().height)).toBe(viewportH)
    await expect(
      Math.round(
        header.getBoundingClientRect().height +
          scroll.getBoundingClientRect().height +
          footer.getBoundingClientRect().height
      )
    ).toBe(viewportH)

    // The error is in the footer band, so the scroll cannot take it away.
    await expect(footer.contains(body.getByText(/already exists/i))).toBe(true)

    // Square on every corner, and flush to the right edge. The inner edge is
    // held by the border and the scrim, not by a radius.
    const cs = getComputedStyle(drawer)
    await expect(cs.borderTopLeftRadius).toBe('0px')
    await expect(cs.borderBottomLeftRadius).toBe('0px')
    await expect(cs.borderLeftWidth).toBe('1px')
    await expect(Math.round(drawer.getBoundingClientRect().right)).toBe(
      Math.round(document.documentElement.clientWidth)
    )
  },
}

/**
 * **The header owns the whole top band — heading and close.**
 *
 * It used to be an empty box each drawer filled itself, and six call sites
 * drifted apart inside it. One of them hand-rolled its own back button and
 * carried a `pr-12` to stop its title sliding under the absolutely-positioned
 * close. Both are gone: the close is a sibling in the row, so there is nothing
 * to dodge and no magic number to keep in sync.
 *
 * **And the back arrow is gone too** — the path IS the way back. With the arrow
 * off, the phrase starts on the header's own 20 column, the same x as the body
 * beneath it, which the arrow's 32px box always pushed it off.
 */
export const TheHeaderOwnsTheBand: Story = {
  render: () => (
    <Drawer defaultOpen>
      <DrawerContent size="work">
        <DrawerHeader steps={['New stack', 'Select a service']} />
        <DrawerBody>{field('Name', 'acme-web', 'n')}</DrawerBody>
      </DrawerContent>
    </Drawer>
  ),
  play: async () => {
    const drawer = await within(document.body).findByRole('dialog')
    await Promise.all(drawer.getAnimations().map((a) => a.finished))
    const header = drawer.querySelector('[data-slot="drawer-header"]') as HTMLElement
    const box = header.getBoundingClientRect()

    const close = within(header).getByRole('button', { name: 'Close' })
    const path = header.querySelector('[data-slot="drawer-path"]') as HTMLElement

    // No arrow. There is exactly one control in the band now.
    await expect(within(header).queryByRole('button', { name: 'Back' })).toBeNull()
    await expect(within(header).getAllByRole('button')).toHaveLength(1)

    // The close is the 32 rung at radius 8 — `size="icon"` on the ordinary
    // Button, not a second component built to look like one.
    const r = close.getBoundingClientRect()
    await expect(Math.round(r.width)).toBe(32)
    await expect(Math.round(r.height)).toBe(32)
    await expect(getComputedStyle(close).borderRadius).toBe('8px')

    // **The PATH now starts on the 20 column** — where the arrow's box used to.
    await expect(Math.round(path.getBoundingClientRect().left - box.left)).toBe(20)
    await expect(Math.round(box.right - r.right)).toBe(20)

    // The close is IN the flow, so nothing can sit under it: the heading's
    // right edge never reaches the button's left edge.
    await expect(path.getBoundingClientRect().right).toBeLessThanOrEqual(r.left)

    // Exactly one title in the dialog — the current step is it.
    await expect(drawer.querySelectorAll('[data-slot="drawer-title"]')).toHaveLength(1)
  },
}

/**
 * **The crumb is the back button.** A step behind you is a target; the step you
 * are on is not, and neither is a crumb with nowhere to go.
 *
 * It stays `fg-muted` at rest and inks on approach — the tier is what says
 * "behind you", and lifting it would put two crumbs at the current step's ink.
 */
export const CrumbsGoBack: Story = {
  render: function Render() {
    const [step, setStep] = useState(2)
    return (
      <Drawer defaultOpen>
        <DrawerContent size="work">
          <DrawerHeader
            steps={
              step === 1
                ? ['New stack', 'Select a service']
                : [{ label: 'New stack', onClick: () => setStep(1) }, 'A repository']
            }
          />
          <DrawerBody>{field('Name', 'acme-web', 'n')}</DrawerBody>
        </DrawerContent>
      </Drawer>
    )
  },
  play: async () => {
    const drawer = await within(document.body).findByRole('dialog')
    await Promise.all(drawer.getAnimations().map((a) => a.finished))
    const path = () => drawer.querySelector('[data-slot="drawer-path"]') as HTMLElement

    // Step two: the earlier crumb is a real button, the current one is the title.
    const crumb = within(path()).getByRole('button', { name: 'New stack' })
    await expect(within(path()).queryByRole('button', { name: 'A repository' })).toBeNull()

    await userEvent.click(crumb)

    // Step one: `Select a service` is now the title, and `New stack` went dead
    // — it points at the screen you are already on.
    await expect(await within(path()).findByText('Select a service')).toBeVisible()
    await expect(within(path()).queryByRole('button', { name: 'New stack' })).toBeNull()
  },
}

/**
 * **An unbreakable string never widens the panel.**
 *
 * A grid item's automatic minimum size is its min-content on both axes, so a
 * band holding a 56-character name set the column track wider than the drawer
 * and every band stretched to match — measured at 480, the track went to 522
 * and the body carried its 20px inset 42px past the panel's own edge. The
 * column is `minmax(0,1fr)`, so the bands shrink and their own `truncate`
 * decides what is shown.
 */
export const ALongTitleDoesNotWidenTheDrawer: Story = {
  render: () => (
    <Drawer defaultOpen>
      <DrawerContent size="form">
        <DrawerHeader
          title="production-us-east-1-primary-multi-az-autoscaling-cluster"
          description="k8s-production-us-east-1-primary-multi-az.control-plane.internal.example.com:6443"
        />
        <DrawerBody>
          <span className="min-w-0 truncate font-mono text-meta">
            cluster-01J9Z4XK7QW3B8N2M6P5R1T0YV-primary-multi-az-autoscaling
          </span>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  ),
  play: async () => {
    const drawer = await within(document.body).findByRole('dialog')
    await Promise.all(drawer.getAnimations().map((a) => a.finished))
    const panel = drawer.getBoundingClientRect()
    await expect(Math.round(panel.width)).toBe(480)

    for (const slot of ['drawer-header', 'drawer-body']) {
      const band = drawer.querySelector(`[data-slot="${slot}"]`) as HTMLElement
      const box = band.getBoundingClientRect()
      // The band stays inside the panel — its right edge never passes the
      // panel's, and it is never wider than the panel's content box.
      await expect(box.right).toBeLessThanOrEqual(panel.right)
      await expect(box.width).toBeLessThanOrEqual(panel.width)
    }
  },
}
