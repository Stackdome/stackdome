import { http, HttpResponse } from 'msw'

import {
  makeAddon,
  makeCluster,
  makeProject,
  makeStack,
  makeUser,
  ORG_ID,
} from '../../.storybook/fixtures'
import { ReleaseState } from '@/pages/stacks/components/editor/tabs/deployments/release-states'
import type { Stack } from '@/api/stack-types'
import type { ObjectStore } from '@/api/object-stores'

/**
 * Network for the browser preview (`pnpm dev:mock`).
 *
 * Reuses the Storybook fixtures rather than inventing a second set — the
 * factories are already typed off the generated OpenAPI schemas, so a response
 * that drifts from the contract fails to compile.
 *
 * The dataset is chosen for *design review*: a spread of states on the busiest
 * screen, and enough on every other destination that no page is judged on an
 * empty state it would rarely be in.
 */

const list = (items: unknown[]) => HttpResponse.json({ items, total: items.length })

/**
 * Which dataset the preview serves. Set by the npm script, not by a URL param —
 * a scenario has to be chosen before the service worker starts, and the state
 * being reviewed here is *first run*, which no amount of clicking can reach
 * once fixtures exist.
 *
 *   `pnpm dev:mock`        → the review dataset (busy, every status)
 *   `pnpm dev:mock:empty`  → a brand-new org with nothing in it
 *
 * They run on different ports deliberately, so the two can sit side by side in
 * a browser rather than being toggled and re-toggled.
 */
const SCENARIO = import.meta.env.VITE_PREVIEW_SCENARIO ?? 'default'
const isEmpty = SCENARIO === 'empty'

/**
 * A stack's spec, varied — every stack having the same two resources and the
 * same timestamp is half of why the list read flat in review. The columns were
 * fine; the data had nothing to say.
 *
 * `name` alone builds from git; `name@image:tag` runs a prebuilt image.
 *
 * The distinction matters for review: the component chips infer their icon from
 * the image, so a stack of pure git builds shows nothing but generic glyphs and
 * the brand logos never appear. At least one fixture has to run real software.
 */
const spec = (resources: string[], volumes: string[], branch: string, commit?: string) =>
  ({
    stack_resources: resources.map((entry) => {
      const [name, image] = entry.split('@')
      return {
        name,
        // Same literal every other fixture and `git-source-seed.ts` use.
        workload_type: 'Service',
        source: image
          ? { image: { ref: image } }
          : {
            git: {
              repo_url: 'https://github.com/acme/monorepo',
              branch,
              commit,
              dockerfile_path: 'Dockerfile',
              build_context: '.',
            },
          },
      }
    }),
    volumes: volumes.map((name) => ({ name })),
  }) as Stack['spec']

const stacks = [
  makeStack({
    id: 's3',
    name: 'docs-site',
    spec: spec(['web'], [], 'fix/og-tags', 'e91a02c4d5e6f7a8'),
    updated_at: '2026-08-05T15:40:00Z',
    latest_release: {
      id: 'r3',
      state: ReleaseState.Failed,
      message: 'web · image pull failed — ghcr.io/acme/docs:e91a02 not found',
      completed_at: '2026-08-05T15:40:00Z',
    },
  } as Partial<Stack>),
  makeStack({
    id: 's2',
    name: 'billing-worker',
    spec: spec(['api', 'worker', 'billing-db@postgres:16'], ['billing-data'], 'main', '7c14be91a02c4d5e'),
    updated_at: '2026-08-05T16:00:00Z',
    latest_release: {
      id: 'r2',
      state: ReleaseState.InProgress,
      message: '2 of 3 services updated',
      created_at: '2026-08-05T16:00:00Z',
    },
  } as Partial<Stack>),
  makeStack({
    id: 's5',
    name: 'auth-gateway',
    spec: spec(['edge', 'session', 'tokens', 'sessions@redis:7'], ['certs'], 'main', '11fd7c14be91a02c'),
    updated_at: '2026-07-30T09:00:00Z',
    latest_release: { id: 'r5', state: ReleaseState.Released },
    converged_release: {
      id: 'r5',
      state: ReleaseState.Released,
      health: 'degraded',
      message: 'session · 1 of 3 replicas available',
      completed_at: '2026-07-30T09:00:00Z',
    },
  } as Partial<Stack>),
  makeStack({
    spec: spec(['web', 'worker', 'orders-db@postgres:16', 'cache@redis:7'], ['uploads', 'assets'], 'main', 'a3f9d2e91a02c4d5'),
    updated_at: '2026-07-31T12:00:00Z',
    latest_release: { id: 'r1', state: ReleaseState.Released },
    converged_release: {
      id: 'r1',
      state: ReleaseState.Released,
      health: 'ok',
      completed_at: '2026-07-31T12:00:00Z',
    },
  } as Partial<Stack>),
  makeStack({ id: 's4', name: 'staging-sandbox', spec: spec(['web'], ['data'], 'main') }),
  makeStack({ id: 's6', name: 'search-indexer', spec: spec(['indexer', 'reaper', 'search@elasticsearch:8.13'], [], 'main') }),
  makeStack({ id: 's7', name: 'notifications', spec: spec(['dispatcher'], [], 'main') }),
  makeStack({
    id: 's8',
    name: 'admin-console-with-a-deliberately-long-name',
    spec: spec(['web'], [], 'chore/rename-everything-for-the-truncation-test'),
  }),
].map((s) => ({ ...s, project_id: makeProject().id })) as Stack[]

const addons = [
  makeAddon(),
  makeAddon({ id: 'pg-2', name: 'billing-db', status: { state: 'Ready' } }),
  makeAddon({ id: 'pg-3', name: 'analytics-db', status: { state: 'Creating' } }),
]

const clusters = [
  makeCluster(),
  makeCluster({ id: 'c2', name: 'eu-west-1' }),
]

// `type` and `description` are two of the page's four columns, so a fixture
// without them renders a list with two blank columns and cannot be reviewed.
// One of each type, and one row deliberately without a description.
const secrets = [
  { id: 'sec-1', name: 'STRIPE_API_KEY', type: 'Token', description: 'Live key, billing service only', created_at: '2026-07-20T10:00:00Z' },
  { id: 'sec-2', name: 'SENTRY_DSN', type: 'Generic', description: 'Error reporting endpoint', created_at: '2026-07-22T10:00:00Z' },
  { id: 'sec-3', name: 'SMTP_PASSWORD', type: 'UsernamePassword', description: 'Transactional mail relay', created_at: '2026-07-29T10:00:00Z' },
  { id: 'sec-4', name: 'GHCR_PULL', type: 'DockerRegistry', created_at: '2026-07-30T10:00:00Z' },
  { id: 'sec-5', name: 'DEPLOY_KEY', type: 'SSHKey', description: 'Read-only deploy key for the monorepo', created_at: '2026-08-01T10:00:00Z' },
]

/**
 * Typed, because the untyped version was wrong and crashed the page.
 *
 * This was a hand-written `{ provider: 's3', bucket: … }` literal — fields the
 * API does not have — so `/object-stores` died in the router's error boundary
 * on `store.spec.configuration`. Every other fixture here comes off a factory
 * that is typed against the generated schemas, which is exactly why none of
 * them could drift like this. Annotating it restores that guarantee.
 */
const objectStores: ObjectStore[] = [
  {
    id: 'os-1',
    name: 'backups',
    spec: {
      configuration: {
        s3_credentials: {
          access_key_id: { secret_id: 'sec-aws', key: 'access_key_id' },
          secret_access_key: { secret_id: 'sec-aws', key: 'secret_access_key' },
          region: 'eu-west-1',
        },
      },
      destination_path: 's3://acme-backups/postgres',
      retention_policy: '7d',
    },
    created_at: '2026-07-11T10:00:00Z',
  },
  // One of each provider. A single-row list cannot show a pitch, an alignment
  // or a hover, so it cannot be reviewed — which is the whole job of this file.
  {
    id: 'os-2',
    name: 'minio-onprem',
    spec: {
      configuration: {
        s3_credentials: {
          access_key_id: { secret_id: 'sec-minio', key: 'access_key_id' },
          secret_access_key: { secret_id: 'sec-minio', key: 'secret_access_key' },
          region: 'us-east-1',
          endpoint_url: 'https://minio.internal:9000',
        },
      },
      destination_path: 's3://onprem-backups/postgres',
      retention_policy: '30d',
    },
    created_at: '2026-07-14T10:00:00Z',
  },
  {
    id: 'os-3',
    name: 'azure-archive',
    spec: {
      configuration: {
        azure_credentials: {
          connection_string: { secret_id: 'sec-azure', key: 'connection_string' },
          storage_account_name: 'acmebackups',
        },
      },
      destination_path: 'https://acme.blob.core.windows.net/postgres',
      retention_policy: '90d',
    },
    created_at: '2026-07-19T10:00:00Z',
  },
]

// Shaped to the real `GitIntegration` schema — `type`, a flat `status` enum and
// `credentials_configured` are what `usableIntegrations()` filters on, and
// without them the New stack page's repository tab shows "no provider
// connected" no matter what this list contains.
const gitIntegrations = [
  {
    id: 'gi-1',
    type: 'github_app',
    host: 'github.com',
    status: 'installed',
    credentials_configured: true,
    install_url: 'https://github.com/apps/stackdome/installations/new',
    created_at: '2026-07-02T10:00:00Z',
  },
  // A credentials-type row as well as the GitHub App one. Verify access and
  // Update credentials are hidden on `github_app` by design — the backend
  // rejects both there — so with only the row above, two built dialogs were
  // unreachable in the preview and could not be reviewed at all.
  {
    id: 'gi-2',
    type: 'credentials',
    host: 'gitlab.com',
    status: 'connected',
    credentials_configured: true,
    created_at: '2026-07-11T10:00:00Z',
  },
]

// `private` is not decoration — it is half of the repository row's meta line
// ("public · main"), so a set that omits it renders every repo as public.
const repositories = [
  { full_name: 'acme/checkout-api', clone_url: 'https://github.com/acme/checkout-api.git', default_branch: 'main', owner: 'acme', private: true, pushed_at: '2026-08-07T18:00:00Z' },
  { full_name: 'acme/web-storefront', clone_url: 'https://github.com/acme/web-storefront.git', default_branch: 'main', owner: 'acme', private: false, pushed_at: '2026-08-06T09:00:00Z' },
  { full_name: 'acme/billing-worker', clone_url: 'https://github.com/acme/billing-worker.git', default_branch: 'main', owner: 'acme', private: true, pushed_at: '2026-08-04T11:00:00Z' },
  { full_name: 'acme/notifications', clone_url: 'https://github.com/acme/notifications.git', default_branch: 'develop', owner: 'acme', private: true, pushed_at: '2026-08-02T15:00:00Z' },
  { full_name: 'acme/image-proxy', clone_url: 'https://github.com/acme/image-proxy.git', default_branch: 'main', owner: 'acme', private: true, pushed_at: '2026-07-24T08:00:00Z' },
]

// Shaped to `RegistryCredential`, and served on `registry-credentials` — the
// path the page actually calls. The old `image_registries` handler answered an
// endpoint nothing requests, so the page fell through to the catch-all and its
// populated state was unreachable in the preview.
const imageRegistries = [
  { id: 'ir-1', host: 'ghcr.io', username: 'acme-ci', purpose: 'both', created_at: '2026-07-04T10:00:00Z' },
  { id: 'ir-2', host: 'docker.io', username: 'acmebuilds', purpose: 'pull', created_at: '2026-07-06T10:00:00Z' },
  { id: 'ir-3', host: 'registry.internal.acme.dev', username: 'svc-deploy', purpose: 'push', created_at: '2026-07-09T10:00:00Z' },
]

// Previews served nothing, so `/previews` only ever showed its empty state and
// the config detail page — with New environment, Sync and Settings on it — was
// unreachable in the preview. Same gap the image-registries handler had.
const previewConfigs = [
  {
    id: 'pc-1',
    name: 'web-storefront',
    description: 'Every PR against main gets its own environment.',
    git_repository: { repo_url: 'https://github.com/acme/web-storefront.git', base_branch: 'main' },
    stackfile_path: 'stackfile.yaml',
    max_active_previews: 5,
    created_at: '2026-07-14T10:00:00Z',
    updated_at: '2026-08-08T10:00:00Z',
  },
  {
    id: 'pc-2',
    name: 'checkout-api',
    git_repository: { repo_url: 'https://github.com/acme/checkout-api.git', base_branch: 'main' },
    stackfile_path: 'deploy/stackfile.yaml',
    max_active_previews: 3,
    created_at: '2026-07-20T10:00:00Z',
    updated_at: '2026-08-05T10:00:00Z',
  },
]

// One of each phase that renders differently, so the card's states can be seen
// without waiting for a deploy that never happens here.
const previewEnvs = [
  {
    id: 'pe-1',
    config_id: 'pc-1',
    stack_id: 'stk-1',
    pr_number: '128',
    branch: 'feat/checkout-redesign',
    source: 'webhook',
    status: {
      phase: 'Ready',
      outputs: { urls: [{ resource: 'web', url: 'https://pr-128.preview.acme.dev' }] },
    },
    created_at: '2026-08-09T10:00:00Z',
    updated_at: '2026-08-11T14:00:00Z',
  },
  {
    id: 'pe-2',
    config_id: 'pc-1',
    stack_id: 'stk-2',
    pr_number: '131',
    branch: 'fix/cart-total',
    source: 'manual',
    status: { phase: 'Deploying' },
    created_at: '2026-08-11T09:00:00Z',
    updated_at: '2026-08-11T09:20:00Z',
  },
  {
    id: 'pe-3',
    config_id: 'pc-1',
    stack_id: 'stk-3',
    pr_number: '117',
    branch: 'chore/bump-deps',
    source: 'webhook',
    status: { phase: 'Failed', reason: 'ImagePullBackOff', message: 'web: image pull failed' },
    created_at: '2026-08-03T10:00:00Z',
    updated_at: '2026-08-03T10:40:00Z',
  },
]

const ORG = `/api/v1/organizations/:orgId`
const PROJECT = `${ORG}/projects/:projectName`

export const previewHandlers = [
  // ── identity ──────────────────────────────────────────────────────────
  http.get('/api/v1/config', () => HttpResponse.json({})),
  http.get('/api/v1/users/current', () => HttpResponse.json(makeUser())),
  http.get('/api/v1/users/current/projects', () => list([makeProject()])),
  http.post('/api/v1/auth/refresh', () =>
    HttpResponse.json({ token: 'preview-token', refreshToken: 'preview-refresh' }),
  ),
  // The org carries the DOMAINS, so a domain-less org means /domains can only
  // ever be reviewed empty. The `empty` scenario keeps it that way on purpose.
  http.get(`/api/v1/organizations/${ORG_ID}`, () =>
    HttpResponse.json({
      id: ORG_ID,
      name: 'acme',
      domains: isEmpty ? [] : [{ fqdn: 'apps.acme.dev' }],
    }),
  ),

  // ── the destinations in the sidebar ───────────────────────────────────
  // The `empty` scenario answers with nothing so the first-run state is
  // reachable. **Every list page is blanked, not just Stacks** — a first-run
  // state that only one of five destinations can reach is a state nobody
  // reviews, and four of them were unreachable until this line.
  //
  // A project and a cluster stay: a new org really does have both, and blanking
  // them tests a different screen.
  http.get(`${ORG}/stacks`, () => list(isEmpty ? [] : stacks)),
  // Without this the catch-all below answered with an empty LIST, the editor
  // read `spec` off it, and every route past /stacks died on an error boundary
  // — so the journey could not be reviewed at all.
  http.get(`${PROJECT}/stacks/:id`, ({ params }) =>
    HttpResponse.json(stacks.find((s) => s.id === params.id) ?? stacks[0]),
  ),
  http.get(`${ORG}/stacks/:id`, ({ params }) =>
    HttpResponse.json(stacks.find((s) => s.id === params.id) ?? stacks[0]),
  ),
  http.get(`${ORG}/projects`, () => list([makeProject()])),
  http.get(`${ORG}/secrets`, () => list(isEmpty ? [] : secrets)),
  http.get(`${ORG}/object-stores`, () => list(isEmpty ? [] : objectStores)),
  // Blank in `empty` on purpose. The page allows exactly one cluster, so a
  // fixture that ships one leaves `Add cluster` permanently disabled — its
  // dialog could not be opened, let alone reviewed, in either scenario.
  http.get(`${ORG}/clusters`, () => list(isEmpty ? [] : clusters)),
  http.get(`${ORG}/git-integrations/:id/repositories`, () =>
    HttpResponse.json({ items: repositories, page: 1, total_count: repositories.length, has_next: false }),
  ),
  // Picking a row re-fetches the ONE repository for its canonical clone URL and
  // default branch. Without this the detail came back without a branch, so
  // `Enable repository`'s second step opened with `Base branch` empty — a
  // required field the preview made look broken when the product is not.
  http.get(`${ORG}/git-integrations/:id/repositories/:owner/:repo`, ({ params }) => {
    const fullName = `${params.owner}/${params.repo}`
    return HttpResponse.json(repositories.find((r) => r.full_name === fullName) ?? repositories[0])
  }),
  http.get(`${ORG}/git-integrations/:id/repositories/:owner/:repo/branches`, ({ params }) => {
    const fullName = `${params.owner}/${params.repo}`
    const head = repositories.find((r) => r.full_name === fullName)?.default_branch ?? 'main'
    // Plain strings — `GitBranchList.items` is `string[]`, and objects here
    // reach `SelectItem value=` as `[object Object]`.
    return list([...new Set([head, 'main', 'develop', 'release/2026-08'])])
  }),
  // A brand-new org has connected nothing. This is what makes the New stack
  // page's "no git provider" state reachable at all — with a provider in the
  // fixtures, no amount of clicking gets you to the first screen a new user
  // actually lands on.
  http.get(`${ORG}/git-integrations`, () => list(isEmpty ? [] : gitIntegrations)),
  http.get(`${ORG}/registry-credentials`, () => list(isEmpty ? [] : imageRegistries)),
  http.get(`${ORG}/users`, () => list([makeUser()])),
  http.get(`${ORG}/invites`, () => list([])),
  // Without this the addon detail page and the edit form both die in the
  // router's error boundary — the list route does not match `/:id`, so the
  // request falls through and the page reads `spec` off undefined. Two of the
  // three screens in the addon journey were unreachable.
  http.get(`${PROJECT}/addons/postgres/:id`, ({ params }) => {
    const addon = addons.find((a) => a.id === params.id)
    return addon ? HttpResponse.json(addon) : HttpResponse.json({}, { status: 404 })
  }),
  http.get(`${PROJECT}/addons/postgres`, () => list(isEmpty ? [] : addons)),
  http.get(`${PROJECT}/object-stores`, () => list(isEmpty ? [] : objectStores)),
  http.get(`${PROJECT}/stack-preview-configs/:configId`, ({ params }) => {
    const config = previewConfigs.find((c) => c.id === params.configId)
    return config ? HttpResponse.json(config) : HttpResponse.json({}, { status: 404 })
  }),
  http.get(`${PROJECT}/stack-preview-configs`, () => list(isEmpty ? [] : previewConfigs)),
  // The list is filtered by `config_id` on the detail page, so the handler has
  // to honour it — serving all three under every config would show the same
  // environments on a config that has none.
  http.get(`${PROJECT}/preview-stacks`, ({ request }) => {
    if (isEmpty) return list([])
    const configId = new URL(request.url).searchParams.get('config_id')
    return list(configId ? previewEnvs.filter((e) => e.config_id === configId) : previewEnvs)
  }),

  // ── everything else ───────────────────────────────────────────────────
  // A page that hits an endpoint nobody mocked should render its empty state,
  // not an error boundary — the preview exists to look at layouts, and an
  // unmocked GET is a gap in this file rather than something to design around.
  http.get('/api/v1/*', () => list([])),
  http.post('/api/v1/*', () => HttpResponse.json({}, { status: 200 })),
  http.put('/api/v1/*', () => HttpResponse.json({}, { status: 200 })),
  http.patch('/api/v1/*', () => HttpResponse.json({}, { status: 200 })),
  http.delete('/api/v1/*', () => HttpResponse.json({}, { status: 204 })),
]
