import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { FieldGrid, FieldShell, HelpTip } from './field-shell'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

/**
 * The wrapper every form field wears: the label, the required mark, the help
 * mark, and the one line under the control that is either a hint or an error.
 *
 * `FieldShell` shows up inside seven other stories, but it had no story of its
 * own — and `HelpTip`, which only exists because of it, had none anywhere. So
 * the `?` mark could not be seen in Storybook at all.
 */
const meta = {
  title: 'Branded/FieldShell',
  component: FieldShell,
  tags: ['ai-generated'],
  args: { label: 'Name', children: null },
} satisfies Meta<typeof FieldShell>

export default meta
type Story = StoryObj<typeof meta>

const body = () => within(document.body)

export const Default: Story = {
  render: () => (
    <div className="w-[480px]">
      <FieldShell label="Service name" htmlFor="name">
        <Input id="name" defaultValue="orders-gateway" />
      </FieldShell>
    </div>
  ),
}

/**
 * **`hint` is a fact you need at rest** — one line, under the control, always
 * there. It is for a field the reader has to be told something to fill in
 * correctly.
 */
export const WithHint: Story = {
  render: () => (
    <div className="w-[480px]">
      <FieldShell
        label="Dockerfile path"
        htmlFor="dockerfile"
        hint="Relative to the build context."
      >
        <Input id="dockerfile" placeholder="./Dockerfile" />
      </FieldShell>
    </div>
  ),
}

/**
 * **`help` is the same guidance behind a `?`** — for when the field explains
 * itself and the sentence is a gloss rather than an instruction. `Depends on`
 * already says what it does; "these start first" is the consequence, worth
 * having and not worth a permanent line under a 32px control.
 *
 * **The gap you can see is 6.** The 20px target carries 4px of air around its
 * 12px mark, so the row pays 2 and the box pays 4 — at `gap-1` the seen
 * distance measured 8.
 */
export const WithHelpTip: Story = {
  render: () => (
    <div className="w-[480px] p-6">
      <FieldShell
        label="Depends on"
        htmlFor="depends"
        help="These start first, and this service waits for them."
      >
        <Select defaultValue="postgres">
          <SelectTrigger id="depends" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="postgres">postgres</SelectItem>
            <SelectItem value="redis">redis</SelectItem>
          </SelectContent>
        </Select>
      </FieldShell>
    </div>
  ),
  play: async ({ canvas }) => {
    // A button, not a bare glyph — guidance the tab order skips is guidance
    // only a mouse can read.
    const mark = canvas.getByRole('button', { name: 'What does this do?' })
    await userEvent.hover(mark)
    await waitFor(async () => {
      await expect(body().getAllByText(/These start first/)[0]).toBeVisible()
    })
  },
}

/** The mark on its own, outside a field — the shape a section heading uses. */
export const HelpTipAlone: Story = {
  render: () => (
    <div className="flex items-center gap-0.5 p-10">
      <span className="text-body font-medium text-foreground">Health checks</span>
      <HelpTip>
        A failing check takes the instance out of rotation until it passes again.
      </HelpTip>
    </div>
  ),
}

/**
 * **Required is red.** It was ink at 70%, which put the one mark on the form
 * that says "you cannot skip this" below the label it belongs to in contrast —
 * nothing looked at it.
 */
export const Required: Story = {
  render: () => (
    <div className="w-[480px]">
      <FieldShell label="Image" htmlFor="image" required hint="Blank uses the internal cluster registry.">
        <Input id="image" placeholder="registry.example.com/app:tag" />
      </FieldShell>
    </div>
  ),
}

/** **The error replaces the hint**, so the row never carries two sentences. */
export const WithError: Story = {
  render: () => (
    <div className="w-[480px]">
      <FieldShell
        label="Service name"
        htmlFor="bad-name"
        required
        hint="Lowercase letters, numbers and dashes."
        error="A service called orders-gateway already exists in this stack."
      >
        <Input id="bad-name" defaultValue="orders-gateway" aria-invalid />
      </FieldShell>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/already exists/)).toBeVisible()
    await expect(canvas.queryByText(/Lowercase letters/)).not.toBeInTheDocument()
  },
}

/** Two columns, and `span` decides which fields take the full width. */
export const InAGrid: Story = {
  render: () => (
    <div className="w-[480px]">
      <FieldGrid>
        <FieldShell label="CPU" htmlFor="cpu" span={1}>
          <Input id="cpu" defaultValue="500m" />
        </FieldShell>
        <FieldShell label="Memory" htmlFor="mem" span={1}>
          <Input id="mem" defaultValue="512Mi" />
        </FieldShell>
        <FieldShell label="Command" htmlFor="cmd" hint="Overrides the image entrypoint.">
          <Input id="cmd" placeholder="npm start" />
        </FieldShell>
      </FieldGrid>
    </div>
  ),
}

/** Long copy wraps under the control rather than widening the field. */
export const LongHint: Story = {
  render: () => (
    <div className="w-[480px]">
      <FieldShell
        label="Build context"
        htmlFor="ctx"
        hint="The directory the build runs from. Everything outside it is invisible to the Dockerfile, including files in the repository root."
      >
        <Input id="ctx" defaultValue="./services/api" />
      </FieldShell>
    </div>
  ),
}

/**
 * **The inline shape** — label and hint on the left, the control that answers
 * them on the right at 24, centred on the whole statement rather than on the
 * label's first line.
 *
 * The `play` is not decoration. This branch shipped with its design reasoning
 * written as `//` lines **inside** the JSX, where `//` is not a comment but
 * text — so every inline field in the product printed 500 characters of prose
 * above its own label, in every theme, for as long as it was there. Nothing
 * caught it because nothing rendered this branch. Now something does.
 */
export const Inline: Story = {
  render: () => (
    <div className="w-[480px]">
      <FieldShell
        inline
        label="WAL archiving"
        hint="Keeps a continuous write-ahead log so you can restore to any point in time."
      >
        <Switch aria-label="WAL archiving" defaultChecked />
      </FieldShell>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('WAL archiving')).toBeInTheDocument()
    await expect(canvas.getByRole('switch')).toBeChecked()
    // No stray source text. Anything matching `//` or a slab of comment prose
    // means a block moved back inside the return.
    await expect(canvas.queryByText(/^\s*\/\//)).toBeNull()
    await expect(document.body.textContent).not.toContain('items-start')
    await expect(document.body.textContent).not.toContain('**')
  },
}
