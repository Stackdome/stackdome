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
 * Delete by id, in place — so the row stays gone across the `refresh()` the
 * page fires after a successful delete.
 *
 * In place rather than reassigning a `let`, because the fixture arrays are
 * captured by the handler closures: swapping the binding would leave every
 * handler pointing at the old array. 404 on a miss, which is what the real API
 * answers and what a double-delete should see.
 */
const remove = <T extends { id: string }>(items: T[], id: string | readonly string[] | undefined) => {
  const at = items.findIndex((item) => item.id === id)
  if (at < 0) return HttpResponse.json({ error: 'not found' }, { status: 404 })
  items.splice(at, 1)
  return new HttpResponse(null, { status: 204 })
}

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
/**
 * **A stack with no relationships is not a stack, it is a row of cards.**
 *
 * These specs used to declare only names, so every resource was an island:
 * `deriveGraph` found no edges, dagre laid six nodes out in one flat line, and
 * the canvas opened at 0.58 zoom trying to fit that line on screen. The node
 * card design was unreviewable — 240px cards rendering at 139 with no wires
 * between them — not because the design was wrong but because the data had
 * nothing to draw.
 *
 * `entry` syntax, so a fixture stays one line:
 *
 *   `web`                       git build
 *   `cache@redis:7`             prebuilt image
 *   `web>orders-db,cache`       depends on two others (a wire each)
 *   `web+uploads=/var/uploads`  mounts a volume (docks it to the card)
 *
 * `+` for mounts, not `:` — an image tag already owns the colon, so
 * `cache@redis:7` parsed as a mount named `7` and hung a phantom volume off the
 * card. Separators have to be characters the values cannot contain.
 *
 * **A mount is emitted as a CONNECTION, not as `resource.volume_mounts`.** The
 * server stores mounts in the connection list and always returns the resource's
 * own array empty — and `formResourcesFromSpec` mirrors that by rebuilding
 * `volume_mounts` from the connections, overwriting whatever the resource
 * carried. A fixture that sets the field directly is silently discarded, which
 * is why `uploads` and `assets` floated free on the canvas instead of docking.
 */
const spec = (resources: string[], volumes: string[], branch: string, commit?: string) =>
  ({
    stack_resources: resources.map((entry) => {
      const [head, deps] = entry.split('+')[0].split('>')
      const [name, image] = head.split('@')
      return {
        name,
        // Same literal every other fixture and `git-source-seed.ts` use.
        workload_type: 'Service',
        ...(deps ? { depends_on: deps.split(',').filter(Boolean) } : {}),
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
    connections: resources.flatMap((entry) => {
      const [wiring, ...mountParts] = entry.split('+')
      const name = wiring.split('>')[0].split('@')[0]
      return mountParts
        .join('+')
        .split(',')
        .filter(Boolean)
        .map((m) => {
          const [volume, mount_path] = m.split('=')
          return {
            kind: 'volume_mount',
            from: { type: 'volume', name: volume },
            to: { type: 'stack_resource', name },
            config: { mount_path },
          }
        })
    }),
  }) as Stack['spec']

/**
 * One state per stack, chosen so the canvas can show all five without editing
 * fixtures: `docs-site` fails, `billing-worker` is mid-deploy, `auth-gateway`
 * is degraded, `orders-api` is healthy.
 */
const LIVE_STATUS: Record<string, Record<string, { state: string }>> = {
  s3: { web: { state: 'Failed' } },
  s2: { api: { state: 'Ready' }, worker: { state: 'Pending' }, 'billing-db': { state: 'Ready' } },
  s5: { edge: { state: 'Ready' }, session: { state: 'Degraded' }, tokens: { state: 'Ready' }, sessions: { state: 'Ready' } },
  's1-orders': {
    web: { state: 'Ready' },
    worker: { state: 'Ready' },
    'orders-db': { state: 'Ready' },
    cache: { state: 'Ready' },
  },
}

const liveStatusFor = (stackId: string) => LIVE_STATUS[stackId] ?? LIVE_STATUS['s1-orders']

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
    spec: spec(['api>billing-db', 'worker>billing-db+billing-data=/var/lib/billing', 'billing-db@postgres:16'], ['billing-data'], 'main', '7c14be91a02c4d5e'),
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
    spec: spec(['edge>session,tokens+certs=/etc/certs', 'session>sessions', 'tokens>sessions', 'sessions@redis:7'], ['certs'], 'main', '11fd7c14be91a02c'),
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
    spec: spec(['web>orders-db,cache+uploads=/var/uploads', 'worker>orders-db+assets=/var/assets', 'orders-db@postgres:16', 'cache@redis:7'], ['uploads', 'assets'], 'main', 'a3f9d2e91a02c4d5'),
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
  makeStack({ id: 's6', name: 'search-indexer', spec: spec(['indexer>search', 'reaper>search', 'search@elasticsearch:8.13'], [], 'main') }),
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
  // **The object stores below reference these**, and until they existed the
  // edit form could not be reviewed at all: every store pointed at `sec-aws`,
  // `sec-minio`, `sec-azure`, `sec-gcs`, none of which were here. A `Select`
  // whose value has no matching option renders empty — and being `w-fit`, the
  // trigger then collapsed to its chevron, so opening an S3 store showed two
  // 34px boxes where its credentials should be. The same failure the secret
  // `Type` select had, in a second place.
  //
  // They carry `data`, because the second select lists the keys inside.
  { id: 'sec-aws', name: 'aws-backup', type: 'Generic', description: 'Backup writer for the eu-west-1 bucket', created_at: '2026-07-10T10:00:00Z', data: [{ key: 'accessKeyId', value: '' }, { key: 'secretAccessKey', value: '' }] },
  { id: 'sec-minio', name: 'minio-onprem', type: 'Generic', description: 'On-prem MinIO service account', created_at: '2026-07-13T10:00:00Z', data: [{ key: 'accessKeyId', value: '' }, { key: 'secretAccessKey', value: '' }] },
  { id: 'sec-azure', name: 'azure-archive', type: 'Generic', created_at: '2026-07-16T10:00:00Z', data: [{ key: 'connectionString', value: '' }] },
  { id: 'sec-gcs', name: 'gcs-archive', type: 'Generic', created_at: '2026-07-18T10:00:00Z', data: [{ key: 'serviceAccountKey', value: '' }] },
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
          access_key_id: { secret_id: 'sec-aws', key: 'accessKeyId' },
          secret_access_key: { secret_id: 'sec-aws', key: 'secretAccessKey' },
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
          access_key_id: { secret_id: 'sec-minio', key: 'accessKeyId' },
          secret_access_key: { secret_id: 'sec-minio', key: 'secretAccessKey' },
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
          connection_string: { secret_id: 'sec-azure', key: 'connectionString' },
          storage_account_name: 'acmebackups',
        },
      },
      destination_path: 'https://acme.blob.core.windows.net/postgres',
      retention_policy: '90d',
    },
    created_at: '2026-07-19T10:00:00Z',
  },
  // The third provider. The comment above said "one of each" and there were
  // three stores across two providers, so the GCS arm of the form could not be
  // opened on a real record at all.
  {
    id: 'os-4',
    name: 'gcs-archive',
    spec: {
      configuration: {
        gcs_credentials: {
          service_account_credentials: { secret_id: 'sec-gcs', key: 'serviceAccountKey' },
        },
      },
      destination_path: 'gs://acme-archive/postgres',
      // `52w`, not `1y` — the form's own regex is `[1-9]\d*[dhw]`, so a `1y`
      // fixture would open on a value the form immediately rejects.
      retention_policy: '52w',
    },
    created_at: '2026-07-21T10:00:00Z',
  },
]

// Shaped to the real `GitIntegration` schema — `type`, a flat `status` enum and
// `credentials_configured` are what `usableIntegrations()` filters on, and
// without them the New stack page's repository tab shows "no provider
// connected" no matter what this list contains.
/**
 * **Mutable, because deleting one has to stick.**
 *
 * These were `const` arrays served straight back on every GET, while the
 * catch-all `http.delete('/api/v1/*')` answered 204. So a delete succeeded, the
 * toast fired, the page called `refresh()` — and the row came back. The product
 * was right at every layer; the preview was lying about the outcome.
 *
 * A preview that answers "yes" and then shows the opposite is worse than one
 * that has no handler at all: an unmocked route reads as a gap in this file,
 * whereas this read as a bug in the feature.
 */
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
//
// **Three repositories, and each one is a different state on the board.** The
// rail is a selector, so a state is only reachable if some row leads to it:
//
// | Row | Reaches |
// |---|---|
// | `web-storefront` — 3 of 5 | frame 01, the ordinary case |
// | `checkout-api` — **1 of 1** | frame 04, at the cap: the banner and a blocked `New preview` |
// | `docs-site` — 0 | frame 02, previews on and nothing open |
//
// The cap is reached by lowering the LIMIT rather than by adding four more
// environments to `web-storefront`: that would take the *All previews* count to
// 8 and push the ordinary case off the board it was drawn for.
const previewConfigs = [
  {
    id: 'pc-1',
    name: 'web-storefront',
    description: 'Every PR against main gets its own environment.',
    git_repository: { repo_url: 'https://github.com/acme/web-storefront.git', base_branch: 'main' },
    stackfile_path: 'stackfile.yaml',
    max_active_previews: 5,
    env: [
      { name: 'API_BASE', value: 'https://staging.acme.dev' },
      { name: 'STRIPE_KEY', value: '{{ secret.stripe-test }}' },
    ],
    created_at: '2026-07-14T10:00:00Z',
    updated_at: '2026-08-08T10:00:00Z',
  },
  {
    id: 'pc-2',
    name: 'checkout-api',
    git_repository: { repo_url: 'https://github.com/acme/checkout-api.git', base_branch: 'main' },
    stackfile_path: 'deploy/stackfile.yaml',
    max_active_previews: 1,
    created_at: '2026-07-20T10:00:00Z',
    updated_at: '2026-08-05T10:00:00Z',
  },
  {
    id: 'pc-3',
    name: 'docs-site',
    git_repository: { repo_url: 'https://github.com/acme/docs-site.git', base_branch: 'main' },
    stackfile_path: 'stackfile.yaml',
    max_active_previews: 3,
    created_at: '2026-07-28T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
  },
]

// One of each phase that renders differently, so every state of the row can be
// seen without waiting for a deploy that never happens here.
const previewEnvs = [
  {
    id: 'pe-1',
    config_id: 'pc-1',
    stack_id: 'stk-1',
    pr_number: '128',
    branch: 'feat/checkout-redesign',
    commit: 'a3f9d2e4c1b7',
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
  // The one environment on `checkout-api`, whose limit is 1 — which is what
  // makes the at-the-cap banner and the blocked `New preview` reachable.
  {
    id: 'pe-4',
    config_id: 'pc-2',
    stack_id: 'stk-4',
    pr_number: '64',
    branch: 'feat/tax-rules',
    commit: 'b81c4470de92',
    source: 'webhook',
    status: {
      phase: 'Ready',
      outputs: { urls: [{ resource: 'api', url: 'https://pr-64.preview.acme.dev' }] },
    },
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-08-10T18:00:00Z',
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
  /**
   * **Per-resource live status — without it every node card reads the same.**
   *
   * There was no releases handler at all, so the detail fetch fell through to
   * the catch-all `[]`, `live_status` was undefined, and every resource on
   * every canvas fell back to neutral: four cards saying `Not deployed` under a
   * header pill saying `failed`. The node card's whole status design — a dot
   * for the fast read and the WORD on the second line for every state that
   * asks you to act — was unreviewable, because only one of the five states
   * could be reached.
   *
   * Keyed by resource name, which is what `live_status.resources` is keyed by.
   */
  /**
   * **The topology is what carries live state onto the canvas.**
   *
   * `mergeTopology` only overlays runtime status when a server topology exists
   * — `server ? mergeServer(...) : local`. The catch-all answered `[]`, so
   * there was no topology, so the live-status map computed one line earlier was
   * thrown away and every node stayed at its graph-build neutral. One node per
   * resource is enough: the merge matches by `ref`, and the edges are already
   * derived locally from `depends_on`.
   */
  http.get(`${PROJECT}/stacks/:stackId/topology`, ({ params }) => {
    const status = liveStatusFor(String(params.stackId))
    return HttpResponse.json({
      nodes: Object.entries(status).map(([name, s]) => ({
        ref: { type: 'stack_resource', name },
        state: s.state,
      })),
      edges: [],
    })
  }),
  http.get(`${PROJECT}/stacks/:stackId/releases/:releaseId`, ({ params }) => {
    const stack = stacks.find((s) => s.id === params.stackId)
    return HttpResponse.json({
      id: params.releaseId,
      stack_id: params.stackId,
      state: ReleaseState.Released,
      live_status: {
        health: (stack as { converged_release?: { health?: string } })?.converged_release?.health ?? 'ok',
        resources: liveStatusFor(String(params.stackId)),
      },
    })
  }),
  /**
   * The LIST is what the editor reads first — it picks the baseline and the
   * status release out of it and only then fetches their details. Returning
   * `[]` here (the catch-all's answer) meant no release was ever *ensured*, so
   * the detail handler above was never called and `live_status` never arrived.
   */
  http.get(`${PROJECT}/stacks/:stackId/releases`, ({ params }) => {
    const stack = stacks.find((s) => s.id === params.stackId) as
      | (Stack & { latest_release?: { id: string; state: string }; converged_release?: { id: string; state: string } })
      | undefined
    const rel = stack?.converged_release ?? stack?.latest_release
    if (!rel) return list([])
    return list([
      {
        id: rel.id,
        stack_id: stack!.id,
        sequence: 1,
        state: rel.state,
        created_at: '2026-08-05T12:00:00Z',
        completed_at: '2026-08-05T12:02:00Z',
      },
    ])
  }),
  // Without this the catch-all below answered with an empty LIST, the editor
  // read `spec` off it, and every route past /stacks died on an error boundary
  // — so the journey could not be reviewed at all.
  http.get(`${PROJECT}/stacks/:id`, ({ params }) =>
    HttpResponse.json(stacks.find((s) => s.id === params.id) ?? stacks[0]),
  ),
  http.get(`${ORG}/stacks/:id`, ({ params }) =>
    HttpResponse.json(stacks.find((s) => s.id === params.id) ?? stacks[0]),
  ),
  // **The shell PUT, so a rename can be judged in the running app.** The
  // catch-all `http.put('/api/v1/*')` below answers `{}` for everything, and
  // against that the header would accept a new name, show it, and lose it on
  // the next read — the exact bug a mock is supposed to catch rather than
  // create. Mutating the in-memory stack makes it survive a refetch, and the
  // conflict branch is what makes the error state reachable at all.
  http.put(`${PROJECT}/stacks/:id`, async ({ params, request }) => {
    const body = (await request.json()) as { name?: string };
    const stack = stacks.find((s) => s.id === params.id);
    if (!stack) return HttpResponse.json({ reason: 'stack not found' }, { status: 404 });
    const name = (body.name ?? '').trim();
    if (name && name !== stack.name) {
      if (stacks.some((s) => s.id !== stack.id && s.name === name)) {
        return HttpResponse.json(
          { reason: `stack with name '${name}' already exists` },
          { status: 409 },
        );
      }
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
        return HttpResponse.json(
          { reason: 'stack name must be lowercase letters, numbers and hyphens' },
          { status: 400 },
        );
      }
      stack.name = name;
    }
    return HttpResponse.json(stack);
  }),
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
  // Ahead of the catch-all delete below, which would 204 without removing
  // anything. Both together because they are the same flow one screen apart —
  // a preview where one list forgets its deletions and the other doesn't is a
  // difference the reviewer has to hold in their head.
  http.delete(`${ORG}/git-integrations/:id`, ({ params }) => remove(gitIntegrations, params.id)),
  http.delete(`${ORG}/registry-credentials/:id`, ({ params }) => remove(imageRegistries, params.id)),
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
  // The one screen asks for every environment and filters in the browser — the
  // rail needs a count per repository and *All previews* needs the lot. The
  // `config_id` branch stays because the endpoint takes the parameter and a mock
  // that ignores one is a mock that lies about the API.
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
