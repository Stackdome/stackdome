import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { RotateCcw } from 'lucide-react'
import { RecordColumns, RecordList, RecordRow } from './record-row'
import { FormSection } from './form-section'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const meta = {
  title: 'Branded/RecordRow',
  component: RecordRow,
  tags: ['ai-generated'],
  // 480 is the inspector's width, which is the constraint the sizing rule
  // exists for — at any wider size a record fits however you lay it out.
  decorators: [
    (Story) => (
      <div className="w-[480px] border border-border bg-background p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecordRow>

export default meta
type Story = StoryObj<typeof meta>

function PortMembers({
  number = '3000',
  open = true,
  reset,
}: {
  number?: string
  open?: boolean
  /** `undefined` = no reset possible at all; `false` = the slot, empty. */
  reset?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <Input defaultValue={number} className="min-w-0 flex-1" />
      <Select defaultValue="tcp">
        <SelectTrigger aria-label="Protocol" className="!w-[92px] flex-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tcp">TCP</SelectItem>
          <SelectItem value="http">HTTP</SelectItem>
        </SelectContent>
      </Select>
      <SegmentedControl
        aria-label="Visibility"
        className="w-[141px] flex-none"
        value={open ? 'public' : 'internal'}
        onValueChange={() => {}}
        options={[
          { value: 'public', label: 'Public' },
          { value: 'internal', label: 'Internal' },
        ]}
      />
      {/* The slot `DirtyField` reserves for the reset arrow in the real drawer.
          It is here because the column header has to line up with a row that
          has one — a header that drifts off its column is worse than none. */}
      {reset !== undefined && (
        <span className="flex size-5 flex-none items-center justify-center text-fg-muted">
          {reset ? <RotateCcw className="size-3.5" aria-hidden /> : null}
        </span>
      )}
    </div>
  )
}

export const OneRecord: Story = {
  args: {
    label: 'Port 1',
    removeLabel: 'Remove port 3000',
    onRemove: () => {},
    children: <PortMembers />,
  },
  play: async ({ canvasElement }) => {
    // The remove button carries the row's identity, not a bare ✕ — most of a
    // record's actions are otherwise announced as nothing.
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Remove port 3000' })).toBeInTheDocument()
  },
}

/**
 * **The shape Ports ships in: no row label, three column headers instead.**
 *
 * `Port 1` / `Port 2` counted the rows rather than naming them — it does not
 * move when 8080 becomes 3000 — and cost a 20px label row each while leaving
 * the three controls beside it unlabelled. The names say it once, at the top.
 *
 * A list is 8 apart, the members inside each row are 4, and the header is a
 * member of the list rather than a thing above it.
 */
export const AList: Story = {
  args: { children: <PortMembers /> },
  render: () => (
    <FormSection label="Ports" state="1 exposed">
      <RecordList>
        <RecordColumns>
          <span className="min-w-0 flex-1">Port</span>
          <span className="w-[92px] flex-none">Protocol</span>
          <span className="w-[141px] flex-none">Visibility</span>
          <span className="w-5 flex-none" />
          <span className="w-8 flex-none" />
        </RecordColumns>
        <RecordRow removeLabel="Remove port 8080" onRemove={() => {}}>
          <PortMembers number="8080" reset={false} />
        </RecordRow>
        <RecordRow removeLabel="Remove port 3000" onRemove={() => {}}>
          <PortMembers number="3000" open={false} reset={false} />
        </RecordRow>
        <Button variant="outline" size="sm" className="self-start">
          Add port
        </Button>
      </RecordList>
    </FormSection>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The ordinal survives where it was always useful: announced, not drawn.
    await expect(canvas.queryByText('Port 1')).not.toBeInTheDocument()
    await expect(canvas.getByText('Protocol')).toBeInTheDocument()
    // The header is decoration for a screen reader — the controls name themselves.
    await expect(canvas.getAllByLabelText('Visibility')).toHaveLength(2)
  },
}

/**
 * **A dirty row must not move its own columns.** The reset arrow appears in a
 * slot that was already reserved, so `Protocol` and `Visibility` stay under the
 * words naming them at the moment the row becomes worth looking at.
 */
export const ADirtyRowKeepsItsColumns: Story = {
  args: { children: <PortMembers /> },
  render: () => (
    <FormSection label="Ports" state="1 exposed">
      <RecordList>
        <RecordColumns>
          <span className="min-w-0 flex-1">Port</span>
          <span className="w-[92px] flex-none">Protocol</span>
          <span className="w-[141px] flex-none">Visibility</span>
          <span className="w-5 flex-none" />
          <span className="w-8 flex-none" />
        </RecordColumns>
        <RecordRow removeLabel="Remove port 8080" onRemove={() => {}}>
          <PortMembers number="8080" reset={false} />
        </RecordRow>
        <RecordRow removeLabel="Remove port 3000" onRemove={() => {}}>
          <PortMembers number="3000" open={false} reset />
        </RecordRow>
      </RecordList>
    </FormSection>
  ),
}

/**
 * **The label stays where it names the row rather than counting it** — an
 * environment variable is its own name, so the header would be saying it twice.
 */
export const LabelledByItsOwnName: Story = {
  args: { children: <PortMembers /> },
  render: () => (
    <FormSection label="Environment" state="2 variables">
      <RecordList>
        <RecordRow label="NODE_ENV" removeLabel="Remove NODE_ENV" onRemove={() => {}}>
          <PortMembers />
        </RecordRow>
        <RecordRow label="DATABASE_URL" removeLabel="Remove DATABASE_URL" onRemove={() => {}}>
          <PortMembers number="8080" open={false} />
        </RecordRow>
      </RecordList>
    </FormSection>
  ),
}

export const WithError: Story = {
  args: {
    label: 'Port 1',
    error: 'Port number is required',
    removeLabel: 'Remove port 1',
    onRemove: () => {},
    children: <PortMembers number="" />,
  },
}

/** Nothing to remove — a record that the surface owns rather than the user. */
export const NotRemovable: Story = {
  args: { label: 'Port 1', children: <PortMembers /> },
}

/** The row still has to hold its shape when a member's value runs long. */
export const LongValue: Story = {
  args: {
    label: 'A port whose label is far longer than it has any right to be',
    removeLabel: 'Remove port',
    onRemove: () => {},
    children: <PortMembers number="65535000000" />,
  },
}
