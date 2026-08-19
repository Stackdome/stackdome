import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { FormSection } from './form-section'
import { FieldGrid, FieldShell } from './field-shell'
import { Input } from '@/components/ui/input'

const meta = {
  title: 'Branded/FormSection',
  component: FormSection,
  tags: ['ai-generated'],
  // The full-bleed rule is a negative margin against the surface's own 20 of
  // padding, so a section shown without that padding draws its rule short.
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
 * Eight of them in one scroll is the shape the canvas inspector actually ships
 * — the case a single section never shows, where the rules have to read as
 * structure rather than as a stack of boxes.
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
