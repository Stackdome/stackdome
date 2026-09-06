import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { FormSection } from './form-section'
import { FieldGrid, FieldShell } from './field-shell'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Copy, Upload, X } from 'lucide-react'

const meta = {
  title: 'Branded/FormSection',
  component: FormSection,
  tags: ['ai-generated'],
  // A section spends no padding of its own on the sides — it sits directly on
  // the body that holds it — so the frame here stands in for a drawer's 20.
  decorators: [
    (Story) => (
      <div className="w-[480px] border border-border bg-background p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormSection>

export default meta
type Story = StoryObj<typeof meta>

const twoFields = (
  <FieldGrid>
    <FieldShell label="Name" htmlFor="fs-name" hint="Lowercase letters, numbers and hyphens.">
      <Input id="fs-name" defaultValue="web" />
    </FieldShell>
    <FieldShell label="Depends on" htmlFor="fs-deps" hint="These start first.">
      <Input id="fs-deps" placeholder="Select dependencies" />
    </FieldShell>
  </FieldGrid>
)

export const AlwaysOpen: Story = {
  args: { label: 'General', children: twoFields },
}

/** The state word is what makes the label worth reading before you open it. */
export const WithState: Story = {
  args: { label: 'Source', state: 'git repository', children: twoFields },
}

export const Collapsible: Story = {
  args: { label: 'Advanced', state: 'build & push', collapsible: true, children: twoFields },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: /Advanced/ })
    // Closed by default: what it hides is not in the tree at all.
    await expect(canvas.queryByLabelText('Name')).not.toBeInTheDocument()
    await userEvent.click(trigger)
    await expect(await canvas.findByLabelText('Name')).toBeVisible()
  },
}

export const CollapsibleOpen: Story = {
  args: {
    label: 'Environment',
    state: '4 variables',
    collapsible: true,
    defaultOpen: true,
    children: twoFields,
  },
}

/**
 * **The case a single section can never show.** Four in one scroll is the shape
 * the canvas inspector ships, and it is the only way to judge whether the
 * boundary reads: 32 between one group and the next, 8 from a heading to its
 * own fields, 16 between two fields. If that ratio is wrong the form goes back
 * to needing a rule to say where a subject changed.
 */
export const Stacked: Story = {
  args: { label: 'General', children: twoFields },
  render: () => (
    <>
      <FormSection label="General">{twoFields}</FormSection>
      <FormSection label="Source" state="git repository">
        {twoFields}
      </FormSection>
      <FormSection label="Advanced" state="build & push" collapsible>
        {twoFields}
      </FormSection>
      <FormSection label="Ports" state="none">
        {twoFields}
      </FormSection>
    </>
  ),
}

/** A label that will not fit, beside a state word that still has to survive. */
export const LongLabel: Story = {
  args: {
    label: 'Pre-deployment step',
    state: 'runs before the main container starts, every time',
    children: twoFields,
  },
}

/**
 * **Tools for the group, on the group's heading line.** They lose their borders
 * here — a bordered chip on the heading row competes with the fields under it,
 * and the row is chrome for the group, not another control in it.
 */
export const WithActions: Story = {
  args: {
    label: 'Environment',
    state: '4 variables',
    children: twoFields,
    actions: (
      <>
        <Button type="button" variant="ghost" size="sm" className="text-fg-muted hover:bg-danger-bg hover:text-danger">
          <X aria-hidden />
          clear all
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-fg-muted">
          <Copy aria-hidden />
          paste .env
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-fg-muted">
          <Upload aria-hidden />
          import file
        </Button>
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The heading and its tools share one row — the proof the actions slot is
    // doing its job rather than stacking a second line under the label.
    const heading = canvas.getByRole('heading', { name: /Environment/ })
    const clear = canvas.getByRole('button', { name: /clear all/ })
    await expect(heading.getBoundingClientRect().top).toBeLessThan(
      clear.getBoundingClientRect().bottom,
    )
    await expect(clear.getBoundingClientRect().top).toBeLessThan(
      heading.getBoundingClientRect().bottom,
    )
  },
}

/**
 * **A long label, a long state word and three tools on one 480 row.** The
 * heading truncates and the tools keep their width — the reverse would leave a
 * group whose actions had silently lost a button.
 */
export const ActionsUnderPressure: Story = {
  args: {
    label: 'Pre-deployment step',
    state: 'runs before the main container starts, every time',
    children: twoFields,
    actions: (
      <>
        <Button type="button" variant="ghost" size="sm" className="text-fg-muted">
          <Copy aria-hidden />
          paste .env
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-fg-muted">
          <Upload aria-hidden />
          import file
        </Button>
      </>
    ),
  },
}
