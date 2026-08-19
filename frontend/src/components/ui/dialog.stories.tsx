import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { AlertBanner } from '@/components/branded/alert-banner'
import { FieldShell } from '@/components/branded/field-shell'
import { Button } from './button'
import { Input } from './input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogTitle,
  DialogTrigger,
} from './dialog'

const meta = {
  title: 'Primitives/Dialog',
  component: Dialog,
  tags: ['ai-generated'],
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

/** ask — 440. A question and its two answers. No content band at all. */
export const Ask: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button>Delete stack</Button>
      </DialogTrigger>
      <DialogContent size="ask">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Delete orders-api?</DialogTitle>
            <DialogDescription>
              This destroys the stack and its data. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

/** form — 560. Fields to fill in, with the error slot filled. */
export const Form: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button>New secret</Button>
      </DialogTrigger>
      <DialogContent size="form">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>New secret</DialogTitle>
            <DialogDescription>
              Available to every service in this project at build and run time.
            </DialogDescription>
          </DialogHeader>
          <DialogSection>
            <div className="flex flex-col gap-4">
              <FieldShell label="Name" htmlFor="secret-name" required>
                <Input id="secret-name" defaultValue="DEPLOY_KEY" />
              </FieldShell>
              <FieldShell label="Value" htmlFor="secret-value" required>
                <Input id="secret-value" type="password" defaultValue="hunter2" />
              </FieldShell>
            </div>
            <AlertBanner tone="danger">
              A secret named DEPLOY_KEY already exists — pick another name, or
              edit the existing one.
            </AlertBanner>
          </DialogSection>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Create secret</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

/** work — 760. Something to read or compare. Past this, it is a drawer. */
export const Work: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button>View changes</Button>
      </DialogTrigger>
      <DialogContent size="work">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Changes in this release</DialogTitle>
            <DialogDescription>
              14 commits since v2.3.1, deployed 4 hours ago.
            </DialogDescription>
          </DialogHeader>
          <DialogSection>
            <pre className="text-meta text-fg-2 overflow-x-auto">
              {'a91f22c  Bump ingress timeout to 60s\n' +
                '3c0be41  Drop the retired /v1/health probe\n' +
                'ff21a08  Cache the cluster list per request'}
            </pre>
          </DialogSection>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline">Close</Button>
          <Button>Deploy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

/**
 * The rhythm is the design, so it is asserted rather than eyeballed: 32 from
 * the body to the footer, 20 from the header to the content, and the ✕ centred
 * on the title's cap line.
 */
export const RhythmIsMeasured: Story = {
  ...Form,
  play: async () => {
    const body = within(document.body)
    const dialog = await body.findByRole('dialog')

    // The enter animation scales from 0.95, and getBoundingClientRect reports
    // transformed geometry — measured mid-flight every gap reads ~5% short.
    await Promise.all(dialog.getAnimations().map((a) => a.finished))

    const bodyBand = dialog.querySelector('[data-slot="dialog-body"]')!
    const footer = dialog.querySelector('[data-slot="dialog-footer"]')!
    const header = dialog.querySelector('[data-slot="dialog-header"]')!
    const section = dialog.querySelector('[data-slot="dialog-section"]')!

    // body ↔ footer: 32. The only boundary between doing and committing.
    await expect(
      Math.round(
        footer.getBoundingClientRect().top -
          bodyBand.getBoundingClientRect().bottom
      )
    ).toBe(32)

    // header ↔ content: 20. Measurably a different level from the 32 above.
    await expect(
      Math.round(
        section.getBoundingClientRect().top -
          header.getBoundingClientRect().bottom
      )
    ).toBe(20)

    // The ✕ centres on the title, not on the padding box.
    const close = body.getByRole('button', { name: 'Close' })
    const title = dialog.querySelector('[data-slot="dialog-title"]')!
    const closeMid =
      close.getBoundingClientRect().top + close.getBoundingClientRect().height / 2
    const titleMid =
      title.getBoundingClientRect().top + title.getBoundingClientRect().height / 2
    await expect(Math.abs(closeMid - titleMid)).toBeLessThan(2)

    // Modal rung, not the dropdown rung.
    await expect(getComputedStyle(dialog).boxShadow).not.toBe('none')
  },
}
