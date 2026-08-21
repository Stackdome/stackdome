import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ResourceDrawer } from './resource-drawer'
import type { UseStackEditSession } from '@/pages/stacks/hooks/use-stack-edit-session'
import type { FormStackResourceData, FormVolumeExtendedData } from '@/pages/stacks/schemas/form-schema'

type Resource = Partial<FormStackResourceData>

const NO_ADDONS: ReadonlySet<string> = new Set()

const web: Resource = {
  name: 'web',
  sourceType: 'git',
  source: { git: { repo_url: 'https://github.com/acme/monorepo', dockerfile_path: 'Dockerfile', build_context: '.' } },
  gitRevisionType: 'branch',
  gitRevisionValue: 'main',
  ports: [
    { number: 3000, protocol: 'http', exposed_to_public: true },
    { number: 9090, protocol: 'tcp', exposed_to_public: false },
  ],
  execution_config: {
    command: 'node server.js',
    environment_variables: [
      { from: 'stack', name: 'NODE_ENV', value: 'production' },
      { from: 'stack', name: 'LOG_LEVEL', value: 'info' },
    ],
  },
} as Resource

const volumes: Partial<FormVolumeExtendedData>[] = [
  { name: 'uploads', spec: { size: '20Gi', access_mode: 'ReadWriteOnce', needs_sync_before_use: false } },
]

/**
 * The drawer reads `session.draft` and calls a handful of updaters, so the
 * session is mocked at that seam rather than driven through the real hook —
 * which would need an edit session, a baseline and a network.
 */
function session(resources: Resource[], over: Partial<UseStackEditSession> = {}): UseStackEditSession {
  return {
    isActive: true,
    draft: { resources, volumes },
    linkedAddonIds: new Set<string>(),
    openTab: null,
    dirty: { dirtyResourceIdx: new Set<number>(), dirtyVolumeIdx: new Set<number>() },
    updateResources: fn(),
    updateVolumes: fn(),
    setOpenTab: fn(),
    discardResource: fn(),
    discardResourceField: fn(),
    discardEnvRow: fn(),
    ...over,
  } as unknown as UseStackEditSession
}

const meta = {
  title: 'Features/Canvas/ResourceDrawer',
  component: ResourceDrawer,
  tags: ['ai-generated'],
  decorators: [
    (Story) => (
      <div className="flex h-[760px] w-[900px] bg-surface-canvas">
        <div className="min-w-0 flex-1" />
        <Story />
      </div>
    ),
  ],
  args: {
    resourceIndex: 0,
    session: session([web]),
    baselineResources: [web],
    connectionAddonIds: NO_ADDONS,
    errors: {},
    onClose: fn(),
    onRemove: fn(),
    onOpenVolume: fn(),
  },
} satisfies Meta<typeof ResourceDrawer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Eight sections in one scroll — the shape that replaced three sub-tabs — under
 * the two that did NOT come back with them.
 *
 * `Configuration ǀ Deployment ǀ Environment` cut one subject into arbitrary
 * thirds. `Settings ǀ Logs` separates a form from a live stream, which cannot
 * share a scroll at any length. The play proves both halves of that: exactly two
 * tabs, and every section still on one page under the first of them.
 */
export const GitService: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const section of ['General', 'Source', 'Ports', 'Mounts', 'Environment']) {
      await expect(canvas.getByRole('heading', { name: new RegExp(`^${section}`) })).toBeVisible()
    }
    const tabs = canvas.getAllByRole('tab')
    await expect(tabs).toHaveLength(2)
    await expect(tabs[0]).toHaveTextContent('Settings')
    await expect(tabs[1]).toHaveTextContent('Logs')
    await expect(tabs[0]).toHaveAttribute('data-state', 'active')
  },
}

/**
 * **The Logs tab on a stack that has never shipped.** No `logs` address means
 * no stream exists yet — the tab still opens, and it says why rather than
 * disappearing or sitting there disconnected.
 */
export const LogsBeforeFirstDeploy: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('tab', { name: 'Logs' }))
    await expect(await canvas.findByText('Nothing to stream yet')).toBeVisible()
    // The form is unmounted, not hidden behind it.
    await expect(canvas.queryByRole('heading', { name: /^General/ })).not.toBeInTheDocument()
  },
}

/**
 * **Delete lives beside the close, and it is an icon.** A red word at the button
 * rung outranked everything else on a 480 column; removing a resource is the
 * rarest thing anyone does here. Both controls end the drawer, so they share the
 * corner.
 */
export const RemoveIsBesideTheClose: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Remove resource' }))
    await expect(args.onRemove).toHaveBeenCalledWith(0)
  },
}

export const FromAnImage: Story = {
  args: {
    session: session([
      { name: 'cache', sourceType: 'image', source: { image: { ref: 'ghcr.io/acme/redis:7' } } } as Resource,
    ]),
    baselineResources: [{ name: 'cache' } as Resource],
  },
}

/** A brand-new resource: every rule stated, nothing filled in. */
export const Empty: Story = {
  args: {
    session: session([{ name: '' } as Resource]),
    baselineResources: [],
  },
}

/** The rule repeated in the imperative, replacing the hint it was already stating. */
export const WithErrors: Story = {
  args: {
    session: session([{ ...web, name: 'Web API' } as Resource]),
    errors: {
      name: 'Use lowercase letters, numbers and hyphens. It cannot start or end with a hyphen.',
      'source.git.repo_url': 'Pick a repository.',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const name = canvas.getByLabelText(/^Name/)
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    // The error REPLACES the hint — they are never both on screen.
    await expect(canvas.queryByText('Lowercase letters, numbers and hyphens. Cannot start or end with a hyphen.')).not.toBeInTheDocument()
  },
}

/** Live view: the converged release, every control disabled, no remove. */
export const ReadOnlyLive: Story = {
  args: {
    live: { resources: [web], volumes },
    liveStatusResources: { web: { state: 'Ready' } } as never,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText(/^Name/)).toBeDisabled()
    await expect(canvas.queryByRole('button', { name: 'Remove resource' })).not.toBeInTheDocument()
  },
}

/** Unsaved edits: the header carries the count and a way to discard them. */
export const WithChanges: Story = {
  args: {
    session: session([{ ...web, name: 'web-2' } as Resource]),
    baselineResources: [web],
  },
}

/** Long names, long values — the case that decides whether 480 holds. */
export const LongText: Story = {
  args: {
    session: session([
      {
        ...web,
        name: 'checkout-api-gateway-eu-west-1',
        source: {
          git: {
            repo_url: 'https://github.com/acme/a-monorepo-with-a-deliberately-long-name',
            dockerfile_path: 'services/checkout/api/Dockerfile.production',
            build_context: 'services/checkout/api',
          },
        },
      } as Resource,
    ]),
    baselineResources: [web],
  },
}
