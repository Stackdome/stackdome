import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { RecordList, RecordRow } from './record-row'
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

function PortMembers({ number = '3000', open = true }: { number?: string; open?: boolean }) {
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
        className="w-[130px] flex-none"
        value={open ? 'public' : 'internal'}
        onValueChange={() => {}}
        options={[
          { value: 'public', label: 'Public' },
          { value: 'internal', label: 'Internal' },
        ]}
      />
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

/** A list is 8 apart while the members inside each row are 4. */
export const AList: Story = {
  args: { label: 'Port 1', children: <PortMembers /> },
  render: () => (
    <FormSection label="Ports" state="2 exposed">
      <RecordList>
        <RecordRow label="Port 1" removeLabel="Remove port 3000" onRemove={() => {}}>
          <PortMembers />
        </RecordRow>
        <RecordRow label="Port 2" removeLabel="Remove port 8080" onRemove={() => {}}>
          <PortMembers number="8080" open={false} />
        </RecordRow>
        <Button variant="outline" size="sm" className="self-start">
          Add port
        </Button>
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
