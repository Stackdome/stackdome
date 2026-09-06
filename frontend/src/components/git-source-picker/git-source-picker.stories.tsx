import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { makeGitIntegration, makeGitRepository } from '../../../.storybook/fixtures'
import { GitSourcePicker } from './git-source-picker'
import type { PickedRepo } from './types'

const ORG = '/api/v1/organizations/:orgId'

const REPOS = [
  makeGitRepository(),
  makeGitRepository({ full_name: 'acme/web', clone_url: 'https://github.com/acme/web.git' }),
  makeGitRepository({
    full_name: 'acme/billing-worker',
    clone_url: 'https://github.com/acme/billing-worker.git',
    private: true,
  }),
  makeGitRepository({
    full_name: 'acme/design-system',
    clone_url: 'https://github.com/acme/design-system.git',
    default_branch: 'trunk',
  }),
]

function gitHandlers({
  integrations = [makeGitIntegration()],
  repos = REPOS,
  reposStatus = 200,
}: {
  integrations?: ReturnType<typeof makeGitIntegration>[]
  repos?: ReturnType<typeof makeGitRepository>[]
  reposStatus?: number
} = {}) {
  return [
    http.get(`${ORG}/git-integrations`, () =>
      HttpResponse.json({ items: integrations, total: integrations.length }),
    ),
    http.get(`${ORG}/git-integrations/:id/installations`, () =>
      HttpResponse.json({ items: [], total: 0 }),
    ),
    http.get(`${ORG}/git-integrations/:id/repositories`, () =>
      reposStatus === 200
        ? HttpResponse.json({ items: repos, page: 1, total_count: repos.length, has_next: false })
        : new HttpResponse(null, { status: reposStatus }),
    ),
    ...baselineHandlers,
  ]
}

/**
 * Where a stack's code comes from — and **the two sources are peers**.
 *
 * A public URL is not a fallback for when the provider list fails; people reach
 * for it deliberately. So neither label is abbreviated to make room for the
 * other and neither is listed first because it is expected to win.
 *
 * The component had no story, which meant the one state that matters most —
 * a brand-new organisation with **no provider connected** — could only be
 * reached by running `dev:mock:empty`.
 */
const meta = {
  title: 'Features/GitProviders/GitSourcePicker',
  component: GitSourcePicker,
  tags: ['ai-generated'],
  parameters: { msw: { handlers: gitHandlers() } },
  args: {
    value: null,
    onChange: fn(),
    mode: 'provider' as const,
    onModeChange: fn(),
    url: '',
    onUrlChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="flex h-[520px] w-[640px] flex-col overflow-y-auto p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GitSourcePicker>

export default meta
type Story = StoryObj<typeof meta>

/** `mode` and `url` are the caller's — the drawer needs them for its own copy —
 *  so the stories hold them the way the drawer does. */
function Harness(props: Partial<React.ComponentProps<typeof GitSourcePicker>>) {
  const [mode, setMode] = useState<'provider' | 'url'>(props.mode ?? 'provider')
  const [url, setUrl] = useState(props.url ?? '')
  const [value, setValue] = useState<PickedRepo | null>(props.value ?? null)
  return (
    <GitSourcePicker
      publicUrlHint={props.publicUrlHint}
      value={value}
      onChange={setValue}
      mode={mode}
      onModeChange={setMode}
      url={url}
      onUrlChange={setUrl}
    />
  )
}

/** The ordinary path: a connected GitHub App, four repositories, nothing typed. */
export const Default: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(await canvas.findByText('acme/orders-gateway')).toBeVisible()
    })
  },
}

/**
 * **The switch and the search are one band on one row**, and the band pins.
 * Both narrow the same list, so they read as one control — and a search box
 * that scrolls away above a long list of repositories is a search box you
 * cannot reach.
 */
export const SearchNarrowsTheList: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await canvas.findByText('acme/orders-gateway')
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search repositories' }), 'billing')
    await waitFor(async () => {
      await expect(canvas.getByText('acme/billing-worker')).toBeVisible()
      await expect(canvas.queryByText('acme/web')).not.toBeInTheDocument()
    })
  },
}

/** A filter that matched nothing — the small mark, and a way to grant the app
 *  more repositories rather than a dead end. */
export const NoRepositoriesMatch: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await canvas.findByText('acme/orders-gateway')
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search repositories' }), 'zzzz')
    await waitFor(async () => {
      await expect(canvas.queryByText('acme/orders-gateway')).not.toBeInTheDocument()
    })
  },
}

/**
 * **No provider connected — the first screen a new organisation sees here.**
 *
 * The search field **stays on screen rather than disappearing**: §9's rule about
 * a dead end is about a control that refuses without saying why, and here the
 * reason is directly beneath it in full, with the fix as a button. Pulling the
 * field out would change the shape of the control band between two states of
 * one tab and shunt the switch beside it.
 */
export const NoProviderConnected: Story = {
  parameters: { msw: { handlers: gitHandlers({ integrations: [] }) } },
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByRole('searchbox', { name: 'Search repositories' })).toBeDisabled()
    })
  },
}

/**
 * **The public URL tab is a peer path, with equal body.** The switch keeps the
 * row to itself here — the URL box is content, not a tool over content — and
 * the switch never leaves the React tree between modes, which is what lets it
 * animate rather than arriving as a brand-new node.
 */
export const PublicUrl: Story = {
  render: () => <Harness mode="url" />,
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByRole('radio', { name: 'Public URL' })).toBeChecked()
    })
  },
}

/** A URL that resolves — the row below is the SAME parse the picker emits, so
 *  the step cannot unblock on a string the next phase then fails to use. */
export const PublicUrlResolved: Story = {
  render: () => <Harness mode="url" url="https://github.com/acme/orders-gateway" />,
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getAllByText(/orders-gateway/)[0]).toBeVisible()
    })
  },
}

/** The preview wizard passes its own note under the URL field. */
export const PublicUrlWithHint: Story = {
  render: () => (
    <Harness
      mode="url"
      publicUrlHint="Preview environments cannot open pull requests on a repository you have not connected."
    />
  ),
}

/**
 * **Switching tabs clears the choice, on purpose.** `switchTab` drops the URL,
 * the host box and the picked repo together — a half-made selection must not
 * survive a change of source, or `Continue` could go live on a repository from
 * the tab you just left.
 */
export const SwitchingTabsClearsTheChoice: Story = {
  render: () => <Harness mode="url" url="https://github.com/acme/web" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByDisplayValue('https://github.com/acme/web')).toBeVisible()
    await userEvent.click(await canvas.findByRole('radio', { name: 'Provider' }))
    await userEvent.click(await canvas.findByRole('radio', { name: 'Public URL' }))
    await waitFor(async () => {
      await expect(canvas.queryByDisplayValue('https://github.com/acme/web')).not.toBeInTheDocument()
    })
  },
}

/**
 * **What the caller's ownership actually buys: an unmount.**
 *
 * `mode` and `url` live in the caller, so stepping forward to the service step
 * and back — which unmounts this component entirely — brings the typed URL with
 * it. That was the bug: internal state made "forward and back" the one reliable
 * way to lose a URL you had already entered.
 */
export const SurvivesAnUnmount: Story = {
  render: function Render() {
    const [mounted, setMounted] = useState(true)
    const [mode, setMode] = useState<'provider' | 'url'>('url')
    const [url, setUrl] = useState('https://github.com/acme/web')
    const [value, setValue] = useState<PickedRepo | null>(null)
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="self-start text-meta text-fg-muted underline"
          onClick={() => setMounted((m) => !m)}
        >
          {mounted ? 'Step forward' : 'Step back'}
        </button>
        {mounted && (
          <GitSourcePicker
            value={value}
            onChange={setValue}
            mode={mode}
            onModeChange={setMode}
            url={url}
            onUrlChange={setUrl}
          />
        )}
      </div>
    )
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByDisplayValue('https://github.com/acme/web')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Step forward' }))
    await userEvent.click(await canvas.findByRole('button', { name: 'Step back' }))
    await waitFor(async () => {
      await expect(canvas.getByDisplayValue('https://github.com/acme/web')).toBeVisible()
    })
  },
}

/** The list could not be loaded — the same picture as "not connected", because
 *  they are the same failure to reach the other side. */
export const RepositoriesFailedToLoad: Story = {
  parameters: { msw: { handlers: gitHandlers({ reposStatus: 500 }) } },
  render: () => <Harness />,
}

/** Long owner/repo names truncate in the row rather than widening the panel. */
export const LongRepositoryNames: Story = {
  parameters: {
    msw: {
      handlers: gitHandlers({
        repos: [
          makeGitRepository({
            full_name: 'acme-platform-engineering/orders-gateway-staging-eu-west-1-canary',
          }),
          makeGitRepository({ full_name: 'acme/web' }),
        ],
      }),
    },
  },
  render: () => <Harness />,
}
