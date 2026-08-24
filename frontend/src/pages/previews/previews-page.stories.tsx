import { useEffect, useState, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { ORG_ID, DEFAULT_PROJECT, makeUser } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { withConfirm, withCurrentUser, withSheetHeader } from '../../../.storybook/decorators'
import type { StackPreviewConfig } from '@/api/preview-configs'
import type { PreviewStack } from '@/api/preview-envs'
import PreviewsPage from './index'

const CONFIGS_PATH = `/api/v1/organizations/${ORG_ID}/projects/${DEFAULT_PROJECT}/stack-preview-configs`
const ENVS_PATH = `/api/v1/organizations/${ORG_ID}/projects/${DEFAULT_PROJECT}/preview-stacks`

/**
 * The global preview decorator supplies a `MemoryRouter` (a second one throws),
 * so this hops that router to whichever address the story is about — which is
 * the point of most of them: **`/previews` and `/previews/:configId` are the
 * same screen.**
 */
function At({ path, children }: { path: string; children: ReactNode }) {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    navigate(path, { replace: true })
    setReady(true)
  }, [navigate, path])
  if (!ready) return null
  return (
    <Routes>
      <Route path="/previews" element={<>{children}</>} />
      <Route path="/previews/:configId" element={<>{children}</>} />
    </Routes>
  )
}

const configs = [
  {
    id: 'c1',
    name: 'web-storefront',
    git_repository: { repo_url: 'https://github.com/acme/web-storefront.git', base_branch: 'main' },
    stackfile_path: 'stackfile.yaml',
    max_active_previews: 5,
  },
  {
    id: 'c2',
    name: 'checkout-api',
    git_repository: { repo_url: 'https://github.com/acme/checkout-api.git', base_branch: 'main' },
    stackfile_path: 'deploy/stackfile.yaml',
    max_active_previews: 1,
  },
  {
    id: 'c3',
    name: 'docs-site',
    git_repository: { repo_url: 'https://github.com/acme/docs-site.git', base_branch: 'main' },
    stackfile_path: 'stackfile.yaml',
    max_active_previews: 3,
  },
] as StackPreviewConfig[]

/** One of each phase that renders differently — the status column is half the
 *  reason to open this page at all. */
const envs = [
  {
    id: 'e1',
    config_id: 'c1',
    stack_id: 's1',
    pr_number: '128',
    branch: 'feat/checkout-redesign',
    commit: 'a3f9d2e4c1b7',
    status: {
      phase: 'Ready',
      outputs: { urls: [{ resource: 'web', url: 'https://pr-128.preview.acme.dev' }] },
    },
    updated_at: '2026-08-12T12:00:00Z',
  },
  {
    id: 'e2',
    config_id: 'c1',
    stack_id: 's2',
    pr_number: '131',
    branch: 'fix/cart-total',
    status: { phase: 'Deploying' },
    updated_at: '2026-08-16T09:00:00Z',
  },
  {
    id: 'e3',
    config_id: 'c1',
    stack_id: 's3',
    pr_number: '117',
    branch: 'chore/bump-deps',
    status: { phase: 'Failed', reason: 'ImagePullBackOff' },
    updated_at: '2026-08-03T10:00:00Z',
  },
  {
    id: 'e4',
    config_id: 'c2',
    stack_id: 's4',
    pr_number: '64',
    branch: 'feat/tax-rules',
    status: {
      phase: 'Ready',
      outputs: { urls: [{ resource: 'api', url: 'https://pr-64.preview.acme.dev' }] },
    },
    updated_at: '2026-08-10T18:00:00Z',
  },
] as PreviewStack[]

const served = (c: StackPreviewConfig[], e: PreviewStack[]) => [
  http.get(`${CONFIGS_PATH}/:configId`, ({ params }) => {
    const config = c.find((x) => x.id === params.configId)
    return config ? HttpResponse.json(config) : HttpResponse.json({}, { status: 404 })
  }),
  http.get(CONFIGS_PATH, () => HttpResponse.json({ items: c, total: c.length })),
  http.get(ENVS_PATH, () => HttpResponse.json({ items: e, total: e.length })),
  ...baselineHandlers,
]

const meta = {
  title: 'Pages/Previews',
  component: PreviewsPage,
  decorators: [withConfirm, withCurrentUser, withSheetHeader],
  parameters: { layout: 'fullscreen', msw: served(configs, envs) },
} satisfies Meta<typeof PreviewsPage>

export default meta
type Story = StoryObj<typeof meta>

const at = (path: string): Story['decorators'] => [
  (Story) => (
    <At path={path}>
      <Story />
    </At>
  ),
]

/**
 * **All previews.** The Repository column exists only in this shape — with one
 * repository selected it would be the same word on every row.
 */
export const AllPreviews: Story = {
  decorators: at('/previews'),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('PR #128')).toBeInTheDocument()
    })
    await expect(canvas.getByText('PR #64')).toBeInTheDocument()
    await expect(canvas.getByText('Repository')).toBeInTheDocument()
  },
}

/**
 * **`/previews/:configId` is the same screen.** The route is absorbed, not
 * deleted — and the title stays `Previews`, because a landmark that renames
 * itself as you click around the page stops being one (§12a). The context line
 * names the selection instead.
 */
export const OneRepository: Story = {
  decorators: at('/previews/c1'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'web-storefront' })).toBeInTheDocument()
    await expect(canvas.getByText('github.com/acme/web-storefront · main')).toBeInTheDocument()
    // The cap is not on this band. It reports in the banner, on the one day it
    // binds — every other day it was a permanent slot spending itself on `3 of 5`.
    await expect(canvas.queryByText(/active$/)).toBeNull()
    // The Repository column is gone — the context line already names the one
    // repository every row belongs to.
    await expect(canvas.queryByText('Repository')).toBeNull()
    await expect(canvas.queryByText('PR #64')).toBeNull()
  },
}

/**
 * **At the cap.** A `blocking` banner states the limit and the consequence
 * under it, and `New preview` blocks before the click. This is the only place
 * the cap is reported — a number that binds on one day does not earn a
 * permanent slot on the band above.
 */
export const AtTheCap: Story = {
  decorators: at('/previews/c2'),
  play: async ({ canvas }) => {
    const alert = await canvas.findByRole('alert')
    await expect(alert).toHaveTextContent(/at the limit of 1 environment/i)
    await expect(alert).toHaveTextContent(/new pull requests will not get one/i)
    await expect(canvas.getByRole('button', { name: /new preview/i })).toBeDisabled()
  },
}

/**
 * **Previews are on and nothing is open.** Say that, or the screen reads as
 * broken. The tools stay up: hiding them made the body jump 44px on every click
 * down the rail.
 */
export const NoOpenPullRequests: Story = {
  decorators: at('/previews/c3'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No open pull requests')).toBeInTheDocument()
    await expect(canvas.getByLabelText('Filter previews')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /^Status:/ })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /^Sort:/ })).toBeInTheDocument()
  },
}

/** **First run: no rail at all.** There is nothing to select between, and a rail
 *  holding one pinned row and a button is chrome around an empty room. */
export const FirstRun: Story = {
  parameters: { msw: served([], []) },
  decorators: at('/previews'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Preview every pull request')).toBeInTheDocument()
    await expect(canvas.queryByRole('navigation', { name: /repositories/i })).toBeNull()
    // The header offers the act that grows the rail, not the one that needs it.
    await expect(canvas.getAllByRole('button', { name: /enable repository/i })).not.toHaveLength(0)
    await expect(canvas.queryByRole('button', { name: /new preview/i })).toBeNull()
  },
}

/** A filter that matched nothing gets the small mark and a way back — never the
 *  first-run drawing. The tools stay up: they are what got you here. */
export const NothingMatchesTheFilter: Story = {
  decorators: at('/previews/c1'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText('Filter previews'), 'zzzz')
    await expect(await canvas.findByText('No previews match')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: /clear filters/i }))
    await expect(await canvas.findByText('PR #128')).toBeInTheDocument()
  },
}

/** The retry REFETCHES rather than reloading the page. No art — the first-run
 *  glyph is a different situation and one drawing must not answer two. */
export const ConfigsFailedToLoad: Story = {
  parameters: {
    msw: [
      http.get(CONFIGS_PATH, () => HttpResponse.json({ message: 'upstream down' }, { status: 500 })),
      http.get(ENVS_PATH, () => HttpResponse.json({ items: [], total: 0 })),
      ...baselineHandlers,
    ],
  },
  decorators: at('/previews'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Previews could not be loaded')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  },
}

/**
 * A bookmark whose repository has since been removed. The rail is right and the
 * URL is stale, so it falls back to *All previews* rather than showing a body
 * about nothing.
 */
export const BookmarkToARemovedRepository: Story = {
  decorators: at('/previews/gone'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('PR #64')).toBeInTheDocument()
    await expect(canvas.getByText('Repository')).toBeInTheDocument()
  },
}

/**
 * Read-only. **Every control goes and the URLs stay** — they are the whole point
 * of the page for a reviewer.
 */
export const ReadOnly: Story = {
  decorators: at('/previews/c1'),
  parameters: {
    // A Viewer everywhere — the real hook reads the real user, so the story
    // proves the wiring rather than a prop someone remembered to pass.
    msw: [
      http.get('/api/v1/users/current', () =>
        HttpResponse.json(
          makeUser({
            role: 'OrgMember',
            projects: [
              { project_id: 'p1', project_name: DEFAULT_PROJECT, role: 'Viewer', default_project: true },
            ],
          }),
        ),
      ),
      ...served(configs, envs),
    ],
  },
  play: async ({ canvas }) => {
    // The URLs stay.
    await expect(await canvas.findByText('pr-128.preview.acme.dev')).toBeInTheDocument()
    // Every control goes: the header primary, the rail's add and its gear, and
    // both row actions.
    await expect(canvas.queryByRole('button', { name: /new preview/i })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /enable repository/i })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /settings for/i })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /sync pr #128/i })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /delete pr #128/i })).toBeNull()
  },
}
