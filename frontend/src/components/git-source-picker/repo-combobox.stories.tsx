import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { makeGitIntegration, makeGitRepository } from '../../../.storybook/fixtures'
import { RepoCombobox, type RepoPick } from './repo-combobox'
import { FieldShell } from '@/components/branded/field-shell'

/** The panel is portalled, so `canvas` cannot see it. */
const panel = () => within(document.body)

const ORG = '/api/v1/organizations/:orgId'

const REPOS = [
  makeGitRepository(),
  makeGitRepository({ full_name: 'acme/web', clone_url: 'https://github.com/acme/web.git' }),
  makeGitRepository({
    full_name: 'acme/billing-worker',
    clone_url: 'https://github.com/acme/billing-worker.git',
    private: true,
  }),
]

function gitHandlers({
  integrations = [makeGitIntegration()],
  repos = REPOS,
}: {
  integrations?: ReturnType<typeof makeGitIntegration>[]
  repos?: ReturnType<typeof makeGitRepository>[]
} = {}) {
  return [
    http.get(`${ORG}/git-integrations`, () =>
      HttpResponse.json({ items: integrations, total: integrations.length }),
    ),
    http.get(`${ORG}/git-integrations/:id/installations`, () =>
      HttpResponse.json({ items: [], total: 0 }),
    ),
    http.get(`${ORG}/git-integrations/:id/repositories`, () =>
      HttpResponse.json({ items: repos, page: 1, total_count: repos.length, has_next: false }),
    ),
    http.get(`${ORG}/git-integrations/:id/repositories/:owner/:repo`, ({ params }) =>
      HttpResponse.json(makeGitRepository({ full_name: `${params.owner}/${params.repo}` })),
    ),
    ...baselineHandlers,
  ]
}

/**
 * The compact repository field inside the stack drawer — the same job
 * `GitSourcePicker` does at full size, in the space a form row has.
 *
 * **It accepts free text as well as a pick.** A repository you can reach but
 * have not connected is still a repository, so typing a URL is a first-class
 * path and not an escape hatch — the same rule that makes the picker's two
 * tabs peers.
 *
 * The integrations load lazily on first open, and a failure degrades to
 * URL-only entry rather than to a dead control.
 */
const meta = {
  title: 'Features/GitProviders/RepoCombobox',
  component: RepoCombobox,
  tags: ['ai-generated'],
  parameters: { msw: { handlers: gitHandlers() } },
  args: { id: 'repo', value: '', onChange: fn() },
  decorators: [
    (Story) => (
      <div className="w-[480px] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RepoCombobox>

export default meta
type Story = StoryObj<typeof meta>

function Harness({ value = '', hasError }: { value?: string; hasError?: boolean }) {
  const [pick, setPick] = useState<RepoPick>({ repo_url: value, integration_id: undefined })
  return (
    <FieldShell label="Repository" htmlFor="repo" required>
      <RepoCombobox
        id="repo"
        value={pick.repo_url}
        integrationId={pick.integration_id}
        onChange={setPick}
        hasError={hasError}
      />
    </FieldShell>
  )
}

/** Nothing chosen yet — the trigger is a placeholder, not a blank box. */
export const Empty: Story = {
  render: () => <Harness />,
}

/** A repository picked through an integration. */
export const Picked: Story = {
  render: () => <Harness value="https://github.com/acme/orders-gateway.git" />,
}

/** Opening loads the integrations and their repositories — lazily, so a drawer
 *  that never touches this field never makes the call. */
export const OpenList: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox'))
    await waitFor(async () => {
      await expect(await panel().findByText('acme/orders-gateway')).toBeVisible()
    })
  },
}

/** Typing narrows the list; the search row is `CommandInput`, which is the
 *  shared `SearchField` row with cmdk's own input inside it. */
export const Searching: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox'))
    await panel().findByText('acme/orders-gateway')
    await userEvent.type(panel().getByPlaceholderText(/Search repositories/), 'billing')
    await waitFor(async () => {
      await expect(panel().getByText('acme/billing-worker')).toBeVisible()
    })
  },
}

/**
 * **No provider connected — and the field still works.** The list has nothing
 * to offer, so what is left is the URL path, which was always a peer rather
 * than a fallback. A control that went dead here would be refusing without
 * saying why.
 */
export const NoProviderConnected: Story = {
  parameters: { msw: { handlers: gitHandlers({ integrations: [] }) } },
  render: () => <Harness />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('combobox'))
    await waitFor(async () => {
      await expect(panel().getAllByRole('dialog').length).toBeGreaterThan(0)
    })
  },
}

/** The field carries the form's error face, so it lines up with every other
 *  invalid control in the drawer. */
export const WithError: Story = {
  render: () => <Harness hasError />,
}

/** A long clone URL truncates in the trigger rather than widening the row. */
export const LongUrl: Story = {
  render: () => (
    <Harness value="https://github.com/acme-platform-engineering/orders-gateway-staging-eu-west-1.git" />
  ),
}
