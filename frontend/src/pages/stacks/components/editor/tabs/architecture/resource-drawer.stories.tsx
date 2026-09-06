import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
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
 * **EXPERIMENT — the form is back behind three tabs.**
 * `Configuration ǀ Deployment ǀ Environment ǀ Logs`, Configuration open.
 *
 * The merged single scroll read as too long; this is the shape being compared
 * against it. The play pins the strip at four and proves Configuration's own
 * sections render under the first tab — Environment now lives behind its own
 * tab, so it is no longer on this page.
 */
export const GitService: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const section of ['General', 'Source', 'Ports', 'Mounts']) {
      await expect(canvas.getByRole('heading', { name: new RegExp(`^${section}`) })).toBeVisible()
    }
    const tabs = canvas.getAllByRole('tab')
    await expect(tabs).toHaveLength(4)
    await expect(tabs[0]).toHaveTextContent('Configuration')
    await expect(tabs[1]).toHaveTextContent('Deployment')
    await expect(tabs[2]).toHaveTextContent('Environment')
    await expect(tabs[3]).toHaveTextContent('Logs')
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
 * **The Deployment tab.** It had no story that opened it — the strip proved the
 * tab EXISTED, and `Configuration` is the one that renders on mount, so nothing
 * ever rendered this body. A tab you can only see by clicking is a tab whose
 * regressions nobody catches.
 */
export const DeploymentTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('tab', { name: 'Deployment' }))
    await waitFor(async () => {
      await expect(canvas.getByRole('tab', { name: 'Deployment' })).toHaveAttribute(
        'data-state',
        'active',
      )
      // The Configuration body is unmounted, not stacked behind it.
      await expect(canvas.queryByRole('heading', { name: /^Source/ })).not.toBeInTheDocument()
    })
  },
}

/**
 * **The Environment tab**, for the same reason — it moved off the Configuration
 * page into a tab of its own, and the move was never covered.
 */
export const EnvironmentTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('tab', { name: 'Environment' }))
    await waitFor(async () => {
      await expect(canvas.getByRole('tab', { name: 'Environment' })).toHaveAttribute(
        'data-state',
        'active',
      )
      await expect(canvas.queryByRole('heading', { name: /^Source/ })).not.toBeInTheDocument()
    })
  },
}

/**
 * **Delete is at the foot of `Configuration`, in the danger zone.**
 *
 * It sat on the header band beside the close, as an icon in `fg-muted` — a
 * compromise made when the alternative was a red word taking half a footer.
 * Both readings were wrong about the same thing: removing a service takes every
 * port, mount and environment reference pointed at it, and §10 puts an act whose
 * cost lands on OTHER objects in the danger zone — never on a band that is on
 * screen the whole time you scroll.
 */
export const RemoveLivesInTheDangerZone: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const remove = canvas.getByRole('button', { name: 'Remove resource' })

    // Not on the band, and it is a word now rather than a glyph.
    await expect(remove.closest('[data-slot="drawer-header"]')).toBeNull()
    const zone = canvas.getByRole('heading', { name: /danger zone/i }).parentElement!
    await expect(zone).toContainElement(remove)
    // The blast radius is on the page, not behind a `?`.
    await expect(zone).toHaveTextContent(/environment reference pointing at it/i)

    // At the FOOT — below `Mounts`, which is the last section on this tab, and
    // therefore below everything you would read before deciding.
    const mounts = canvas.getByText('Mounts')
    await expect(zone.getBoundingClientRect().top).toBeGreaterThan(
      mounts.getBoundingClientRect().bottom,
    )

    await userEvent.click(remove)
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

/**
 * **The Ports header sits on its controls — on a resource with no baseline.**
 *
 * This is the case that was broken, and it was broken in the place people meet
 * it first: a resource you have just added has nothing to diff against, so
 * `DirtyField` took its no-baseline branch — and that branch returned a bare
 * fragment, dropping the `className` the caller uses to state the control
 * group's SIZE. The group stopped taking the row's slack and collapsed onto its
 * own content while the header strip went on dividing the full width. Measured
 * at the inspector's 480: `Port` on its column, `Protocol` 14 off, `Visibility`
 * 28 off — compounding left to right, the signature of two rows dividing two
 * different widths.
 *
 * The second defect this pins is `VISIBILITY_COL`: the header cell and the
 * segmented control now read ONE constant, where the header used to carry a
 * hand-computed copy that was 1px out from the day it was written.
 *
 * Both are the same mistake — a width stated in two places — so the test is the
 * same for all three columns: **every header word starts where its control
 * does.**
 */
export const ColumnsSitOnTheirControls: Story = {
  args: {
    // No baseline for this resource: the newly-added case.
    session: session([{ ...web, name: 'postgres' } as Resource]),
    baselineResources: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const left = (el: Element) => Math.round(el.getBoundingClientRect().left)
    const head = (t: string) =>
      canvas.getAllByText(t, { selector: 'span' }).find((el) => el.textContent?.trim() === t)!

    const port = canvas.getByRole('textbox', { name: 'Port 1' })
    const protocol = canvas.getAllByRole('combobox', { name: 'Protocol' })[0]
    const visibility = canvasElement.querySelector('[aria-label="Visibility"]')!

    await expect(left(head('Port'))).toBe(left(port))
    await expect(left(head('Protocol'))).toBe(left(protocol))
    await expect(left(head('Visibility'))).toBe(left(visibility))
    // And the one that was written twice is now written once.
    await expect(Math.round(head('Visibility').getBoundingClientRect().width)).toBe(
      Math.round(visibility.getBoundingClientRect().width),
    )
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

/** Live view: the converged release, every control disabled, and **no danger
 *  zone at all** — §10: a block headed *Danger zone* holding nothing you may
 *  press is a warning about nothing. */
export const ReadOnlyLive: Story = {
  args: {
    live: { resources: [web], volumes },
    liveStatusResources: { web: { state: 'Ready' } } as never,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText(/^Name/)).toBeDisabled()
    await expect(canvas.queryByRole('button', { name: 'Remove resource' })).not.toBeInTheDocument()
    await expect(canvas.queryByRole('heading', { name: /danger zone/i })).toBeNull()
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
