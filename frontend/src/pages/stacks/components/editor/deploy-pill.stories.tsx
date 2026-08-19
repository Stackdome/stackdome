import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { DeployPill } from './deploy-pill'

const meta = {
  title: 'Features/EditorChrome/DeployPill',
  component: DeployPill,
  tags: ['ai-generated'],
  // The pill positions itself absolutely at the top of the canvas.
  decorators: [
    (Story) => (
      <div className="relative h-24">
        <Story />
      </div>
    ),
  ],
  args: {
    hasResources: true,
    dirtyTotal: 0,
    isStaged: false,
    isActive: false,
    deployBusy: false,
    canWrite: true,
    onDeploy: fn(),
  },
} satisfies Meta<typeof DeployPill>

export default meta
type Story = StoryObj<typeof meta>

/** Mid-session dirt: one action, in the header beside the version chip. */
export const PendingChanges: Story = {
  args: {
    dirtyTotal: 3,
    isActive: true,
  },
  play: async ({ canvas }) => {
    // One action. Reviewing the diff and discarding it are the version chip's
    // — they are things you do to a version, not to a deploy.
    await expect(canvas.getByRole('button', { name: /Deploy/ })).toBeInTheDocument()
    await expect(canvas.queryByText('Discard draft changes')).not.toBeInTheDocument()
  },
}

export const Deploying: Story = {
  args: {
    dirtyTotal: 3,
    isActive: true,
    deployBusy: true,
  },
}

/** Draft stack with resources: bare Deploy, no change summary. */
export const Draft: Story = {
  args: {
    isDraft: true,
    onDraftDeploy: fn(),
  },
}

/** Viewer without write access: pill visible, Deploy disabled. */
export const ReadOnly: Story = {
  args: {
    dirtyTotal: 2,
    isActive: true,
    canWrite: false,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /Deploy/ })).toBeDisabled()
  },
}
