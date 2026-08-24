import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { fn } from 'storybook/test'
import { VolumeDrawer } from './volume-drawer'
import type { UseStackEditSession } from '@/pages/stacks/hooks/use-stack-edit-session'
import type { FormVolumeExtendedData } from '@/pages/stacks/schemas/form-schema'

/**
 * The inspector one level deep. The session is a plain object rather than the
 * real hook — the drawer only ever reads `draft` and calls two updaters, so
 * mocking at that seam keeps the story free of network and edit-session state.
 */
function session(volumes: Partial<FormVolumeExtendedData>[]): UseStackEditSession {
  return {
    isActive: true,
    draft: {
      resources: [
        { name: 'web', volume_mounts: [{ source_volume_name: 'uploads', target_path: '/var/uploads' }] },
        { name: 'worker', volume_mounts: [{ source_volume_name: 'uploads', target_path: '/data' }] },
      ],
      volumes,
    },
    updateVolumes: fn(),
    updateResources: fn(),
  } as unknown as UseStackEditSession
}

const uploads: Partial<FormVolumeExtendedData> = {
  name: 'uploads',
  spec: { size: '20Gi', access_mode: 'ReadWriteOnce', needs_sync_before_use: false },
}

const meta = {
  title: 'Features/Canvas/VolumeDrawer',
  component: VolumeDrawer,
  tags: ['ai-generated'],
  // The region takes its height from the row it sits in, the way it does
  // beside the canvas.
  decorators: [
    (Story) => (
      <div className="flex h-[700px] w-[860px] bg-surface-canvas">
        <div className="min-w-0 flex-1" />
        <Story />
      </div>
    ),
  ],
  args: { volumeName: 'uploads', onClose: fn(), session: session([uploads]) },
} satisfies Meta<typeof VolumeDrawer>

export default meta
type Story = StoryObj<typeof meta>

/** Opened straight off the canvas: a title, and no path back. */
export const FromTheCanvas: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('heading', { name: 'uploads' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'web' })).not.toBeInTheDocument()
  },
}

/** Opened from a service's mount row: `web / uploads`, and `web` is the way back. */
export const OneLevelDeep: Story = {
  args: { from: { name: 'web', onBack: fn() } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'web' }))
    await expect(args.from!.onBack).toHaveBeenCalled()
  },
}

/** Provisioned server-side — the size is fixed and says so. */
export const ReadOnlySpec: Story = {
  args: { persisted: true, from: { name: 'web', onBack: fn() } },
}

/** A name long enough to test the header's truncation rather than its layout. */
export const LongName: Story = {
  args: {
    volumeName: 'uploads-for-the-checkout-service-eu-west-1',
    session: session([{ ...uploads, name: 'uploads-for-the-checkout-service-eu-west-1' }]),
    from: { name: 'checkout-api-gateway', onBack: fn() },
  },
}

/** The volume was deleted underneath the panel — it renders nothing, rather than an empty shell. */
export const Missing: Story = {
  args: { volumeName: 'gone', session: session([uploads]) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('volume-drawer')).not.toBeInTheDocument()
  },
}

/** No size set yet, and nothing mounts it — the empty end of the form. */
export const Unset: Story = {
  args: { volumeName: 'scratch', session: session([{ name: 'scratch' }]) },
}

/**
 * **Remove is in the danger zone, and the footer band went with it.**
 *
 * It was a lone red-inked ghost button in an 81px footer, which made a destroy
 * the only thing this drawer appeared to be FOR — and said nothing about what it
 * costs. Same act, same material as every other destroy in the product, at the
 * foot of the body (§10). A drawer with nothing to commit has no footer.
 */
export const RemoveLivesInTheDangerZone: Story = {
  args: { onRequestRemove: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const remove = canvas.getByRole('button', { name: /remove volume/i })

    await expect(canvasElement.querySelector('[data-slot="drawer-footer"]')).toBeNull()
    await expect(remove.closest('[data-slot="drawer-header"]')).toBeNull()
    const zone = canvas.getByRole('heading', { name: /danger zone/i }).parentElement!
    await expect(zone).toContainElement(remove)
    // The blast radius is on the page, not behind a `?`.
    await expect(zone).toHaveTextContent(/loses the mount/i)

    await userEvent.click(remove)
    await expect(args.onRequestRemove).toHaveBeenCalledWith('uploads')
  },
}
