import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { makeStack } from '../../../../../.storybook/fixtures'
import { baselineHandlers } from '../../../../../.storybook/msw-handlers'
import { withConfirm, withCurrentUser, withSheetHeader, withStack } from '../../../../../.storybook/decorators'
import { ReleaseState } from '@/pages/stacks/components/editor/tabs/deployments/release-states'
import type { Stack } from '@/api/stack-types'
import StacksPage from './index'

const previewEnvsEmpty = http.get(
  '/api/v1/organizations/:orgId/projects/:projectName/preview-stacks',
  () => HttpResponse.json({ items: [], total: 0 }),
)

const mixedStacks = [
  makeStack({
    latest_release: { id: 'r1', state: ReleaseState.Released },
    converged_release: { id: 'r1', state: ReleaseState.Released, health: 'ok' },
  } as Partial<Stack>),
  makeStack({
    id: 's2',
    name: 'billing-worker',
    latest_release: { id: 'r2', state: ReleaseState.InProgress },
  } as Partial<Stack>),
  makeStack({
    id: 's3',
    name: 'docs-site',
    latest_release: { id: 'r3', state: ReleaseState.Failed },
  } as Partial<Stack>),
  makeStack({ id: 's4', name: 'staging-sandbox' }),
]

const meta = {
  title: 'Pages/Stacks',
  component: StacksPage,
  tags: ['ai-generated'],
  decorators: [withConfirm, withCurrentUser, withStack, withSheetHeader],
  parameters: { layout: 'fullscreen' },
  // The view toggle persists per page per user (§7), which is correct in the
  // product and leaks between stories: whichever story ran last would decide
  // what the next one renders. Each story starts from the documented default.
  beforeEach: () => {
    localStorage.removeItem('stackdome.view.stacks')
    // **And the tour flag, for the same reason.** An empty list offers the
    // welcome tour, which is a modal — it marks the page inert, so a story
    // asserting what the empty PAGE shows finds nothing behind it. Whether it
    // fired depended on which story had run first and happened to complete the
    // tour, which is the leak the line above already documents. These stories
    // are about the page; the tour has its own.
    localStorage.setItem('stackdome.onboarding-tour.done', '1')
  },
} satisfies Meta<typeof StacksPage>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  parameters: {
    msw: [
      previewEnvsEmpty,
      http.get('/api/v1/organizations/:orgId/stacks', () =>
        HttpResponse.json({ items: mixedStacks, total: mixedStacks.length }),
      ),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('billing-worker')).toBeInTheDocument()
      await expect(canvas.getByText('docs-site')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Status filter is a functional control — Geist, not mono/uppercase
    // chrome, and never brand orange for the selected state (rubric #3, #8).
    await userEvent.click(canvas.getByRole('button', { name: /status/i }))
    const menu = within(canvasElement.ownerDocument.body)
    // Health labels are human now: the API's "ok" renders as "Healthy".
    const okOption = await menu.findByRole('menuitem', { name: /^healthy/i })
    await expect(okOption.className).not.toContain('font-mono')
    await expect(okOption.className).not.toContain('text-brand')
    await userEvent.click(okOption)
    await waitFor(async () => {
      await expect(canvas.getByText('orders-api')).toBeInTheDocument()
      await expect(canvas.queryByText('billing-worker')).toBeNull()
      await expect(canvas.queryByText('docs-site')).toBeNull()
    })
  },
}

export const Empty: Story = {
  parameters: {
    msw: [
      previewEnvsEmpty,
      http.get('/api/v1/organizations/:orgId/stacks', () =>
        HttpResponse.json({ items: [], total: 0 }),
      ),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas }) => {
    // First run is the one screen that gets to define the product's core noun,
    // so the test asserts the definition is actually there — not just that some
    // empty state rendered.
    await expect(await canvas.findByText('No stacks yet')).toBeInTheDocument()
    await expect(await canvas.findByText(/A stack is your app/)).toBeInTheDocument()
    // Two on purpose: the sheet header's, and the empty state's own. On first
    // run the centre of the page is where the eye is, so the action is offered
    // there rather than only in the corner.
    await expect(await canvas.findAllByRole('button', { name: 'New stack' })).toHaveLength(2)
  },
}

export const Error: Story = {
  parameters: {
    msw: [
      previewEnvsEmpty,
      http.get('/api/v1/organizations/:orgId/stacks', () =>
        HttpResponse.json({ message: 'cluster hub unreachable' }, { status: 500 }),
      ),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /try again/i })).toBeInTheDocument()
  },
}

const stackWithSource = (over: Partial<Stack>) =>
  makeStack({
    spec: {
      stack_resources: [
        {
          name: 'web',
          source: { git: { repo_url: 'https://github.com/acme/web.git', branch: 'main', commit: 'abcdef1234567' } },
        },
      ],
      volumes: [{ name: 'data' }],
    },
    ...over,
  } as Partial<Stack>)

const oneFailure = [
  makeStack({
    id: 'h1',
    name: 'orders-api',
    updated_at: '2026-08-05T09:00:00Z',
    latest_release: { id: 'r1', state: ReleaseState.Released },
    converged_release: { id: 'r1', state: ReleaseState.Released, health: 'ok' },
  } as Partial<Stack>),
  makeStack({
    id: 'h2',
    name: 'search-index',
    updated_at: '2026-08-05T08:00:00Z',
    latest_release: { id: 'r2', state: ReleaseState.Released },
    converged_release: { id: 'r2', state: ReleaseState.Released, health: 'ok' },
  } as Partial<Stack>),
  makeStack({
    id: 'h3',
    name: 'mailer',
    updated_at: '2026-08-05T07:00:00Z',
    latest_release: { id: 'r3', state: ReleaseState.Released },
    converged_release: { id: 'r3', state: ReleaseState.Released, health: 'ok' },
  } as Partial<Stack>),
  // Oldest, so a recency sort would bury it — this is the row that needs a human.
  makeStack({
    id: 'h4',
    name: 'payments-gateway',
    updated_at: '2026-08-04T10:00:00Z',
    latest_release: { id: 'r4', state: ReleaseState.Released },
    converged_release: {
      id: 'r4',
      state: ReleaseState.Released,
      health: 'failed',
      message: 'web · container exited with code 137',
    },
  } as Partial<Stack>),
]

const withStacks = (items: Stack[]) => [
  previewEnvsEmpty,
  http.get('/api/v1/organizations/:orgId/stacks', () =>
    HttpResponse.json({ items, total: items.length }),
  ),
  ...baselineHandlers,
]

/** **Preview-created stacks are not in the list.** The fixture carries more
 *  stacks than this; the ones a preview environment made belong to Previews,
 *  and a stack that exists in two places is counted twice by whoever reads it.
 *  This used to be asserted through the header's count, which is gone. */
export const PreviewStacksAreExcluded: Story = {
  parameters: { msw: withStacks(oneFailure) },
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('payments-gateway')).toBeInTheDocument()
    }, { timeout: 5000 })
    await expect(canvas.getAllByRole('link', { name: /stack$/ })).toHaveLength(4)
  },
}

/** Failures first by default. On the page this replaces, the one row that
 *  needed a human was fourth — it is the oldest, so any recency sort buries it. */
export const FailuresFirst: Story = {
  parameters: { msw: withStacks(oneFailure) },
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('payments-gateway')).toBeInTheDocument()
    }, { timeout: 5000 })
    const names = canvas.getAllByRole('link', { name: /stack$/ }).map((r) => r.getAttribute('aria-label'))
    await expect(names[0]).toBe('payments-gateway stack')
  },
}


/** §7 — both views show the same rows, the same filters and the same sort.
 *  A card view that quietly drops a column is a different page wearing the
 *  same name. */
export const CardsView: Story = {
  parameters: { msw: withStacks(oneFailure) },
  play: async ({ canvas, userEvent }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('payments-gateway')).toBeInTheDocument()
    }, { timeout: 5000 })

    const listNames = canvas.getAllByRole('link', { name: /stack$/ }).map((r) => r.getAttribute('aria-label'))

    await userEvent.click(canvas.getByRole('radio', { name: 'Cards' }))
    const cardNames = canvas.getAllByRole('link', { name: /stack$/ }).map((r) => r.getAttribute('aria-label'))

    // Same rows, same order.
    await expect(cardNames).toEqual(listNames)
    // And the same facts survive the switch — the status word, and the stack's
    // components, which the card names where the row leaves them to the detail.
    // Named, never counted: there is no "N components" label anywhere.
    await expect(canvas.getByText('Failed')).toBeInTheDocument()
    await expect(canvas.getAllByText('web').length).toBeGreaterThan(0)
    await expect(canvas.queryByText(/\d+ components?/)).toBeNull()

    // §3 — the card title takes the size step the row deliberately does not.
    await userEvent.click(canvas.getByRole('radio', { name: 'List' }))
    const rowName = canvas.getByText('payments-gateway')
    const rowSize = parseFloat(getComputedStyle(rowName).fontSize)
    await userEvent.click(canvas.getByRole('radio', { name: 'Cards' }))
    const cardSize = parseFloat(getComputedStyle(canvas.getByText('payments-gateway')).fontSize)
    await expect(rowSize).toBe(14)
    await expect(cardSize).toBe(16)
  },
}

/** A long name truncates; it never pushes the columns out of alignment. */
export const LongNames: Story = {
  parameters: {
    msw: withStacks([
      stackWithSource({
        id: 'l1',
        name: 'internal-platform-notification-dispatch-service-europe-west',
        latest_release: { id: 'r1', state: ReleaseState.Released },
        converged_release: { id: 'r1', state: ReleaseState.Released, health: 'ok' },
      }),
      stackWithSource({ id: 'l2', name: 'api' }),
    ]),
  },
  play: async ({ canvas }) => {
    const long = await canvas.findByText('internal-platform-notification-dispatch-service-europe-west')
    // The name gives before the layout does: it clips with an ellipsis rather
    // than wrapping to a second line or widening its column.
    const style = getComputedStyle(long)
    await expect(style.textOverflow).toBe('ellipsis')
    await expect(style.overflow).toBe('hidden')
    await expect(style.whiteSpace).toBe('nowrap')
    // Both rows put their status column in the same place.
    const rows = canvas.getAllByRole('link', { name: /stack$/ })
    // Rounded: sub-pixel layout noise is not a misalignment.
    const lefts = rows.map((r) =>
      Math.round(r.querySelector('[data-slot="status-text"]')!.getBoundingClientRect().left),
    )
    await expect(new Set(lefts).size).toBe(1)
  },
}

/**
 * **Two lines means `needsAttention`, and nothing else does.**
 *
 * The reason line is gated on `needsAttention` — the same predicate behind the
 * default sort — so the rows that are two lines must be *exactly* the rows
 * that predicate selects.
 *
 * **The reason line came off the row on 23 Aug 2026 (Jaseem), so no row is two
 * lines any more.** The mechanic this story was written to guard has moved to
 * the card and the stack's own page. What is still worth holding here is the
 * consequence: **the list has ONE pitch.** A failed stack, a degraded stack and
 * a healthy stack carrying a stray release message are all the same height, and
 * no backend text leaks into the table.
 */
export const EveryRowIsOnePitch: Story = {
  parameters: {
    msw: withStacks([
      ...oneFailure,
      // Healthy, but its last release carries a message. The old rule — "show
      // whatever the backend wrote" — would have given this a second line.
      makeStack({
        id: 'h5',
        name: 'analytics-ingest',
        updated_at: '2026-08-05T06:00:00Z',
        latest_release: { id: 'r5', state: ReleaseState.Released },
        converged_release: {
          id: 'r5',
          state: ReleaseState.Released,
          health: 'ok',
          message: 'superseded by release 12',
        },
      } as Partial<Stack>),
      // Degraded, and its message is a real reason.
      makeStack({
        id: 'h6',
        name: 'auth-gateway',
        updated_at: '2026-08-05T05:00:00Z',
        latest_release: { id: 'r6', state: ReleaseState.Released },
        converged_release: {
          id: 'r6',
          state: ReleaseState.Released,
          health: 'degraded',
          message: 'session · 1 of 3 replicas available',
        },
      } as Partial<Stack>),
    ]),
  },
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('analytics-ingest')).toBeInTheDocument()
    }, { timeout: 5000 })

    const rows = canvas.getAllByRole('link', { name: /stack$/ })

    // Every status cell holds exactly one child: the word.
    const multiLine = rows.filter(
      (r) => r.querySelector('[data-slot="status-text"]')!.parentElement!.children.length > 1,
    )
    await expect(multiLine).toEqual([])

    // One pitch, whatever the state — failed, degraded and healthy alike.
    const heights = [...new Set(rows.map((r) => r.getBoundingClientRect().height))]
    await expect(heights).toEqual([64])

    // No release message reaches the table, from either the attention set or a
    // healthy stack that happens to carry one.
    await expect(canvas.queryByText('superseded by release 12')).toBeNull()
    await expect(canvas.queryByText('session · 1 of 3 replicas available')).toBeNull()
  },
}

/** §15 loading — the header and the toolbar are already on screen because they
 *  do not depend on the data, and six rows sit at the real 64px pitch so
 *  nothing moves when it lands. No shimmer (§14). */
export const Skeleton: Story = {
  parameters: {
    msw: [
      previewEnvsEmpty,
      http.get('/api/v1/organizations/:orgId/stacks', async () => {
        await new Promise(() => {})
        return HttpResponse.json({ items: [], total: 0 })
      }),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    // The tools are up before the data is.
    await expect(await canvas.findByLabelText('Filter stacks')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /status/i })).toBeInTheDocument()
    // Six placeholder rows at the real pitch, and nothing animating.
    const placeholders = canvasElement.querySelectorAll('[aria-hidden] .bg-\\[var\\(--wash-hover\\)\\]')
    await expect(placeholders.length).toBeGreaterThan(0)
    for (const el of placeholders) {
      await expect(getComputedStyle(el).animationName).toBe('none')
    }
  },
}

/** A filter that matches nothing is not an empty product — the toolbar stays,
 *  so the way out is the control you just used. */
export const NoMatch: Story = {
  parameters: { msw: withStacks(oneFailure) },
  play: async ({ canvas, userEvent }) => {
    const search = await canvas.findByLabelText('Filter stacks')
    await userEvent.type(search, 'zzz-nothing')
    await expect(await canvas.findByText('No stacks match')).toBeInTheDocument()
    // The empty state replaces the rows, never the tools.
    await expect(canvas.getByLabelText('Filter stacks')).toBeInTheDocument()
    await expect(canvas.queryAllByRole('link', { name: /stack$/ })).toHaveLength(0)
  },
}

/** §7 — the list is not boxed. A border around the whole table is the card
 *  mistake at a larger scale. */
export const ListIsNotBoxed: Story = {
  parameters: { msw: withStacks(oneFailure) },
  play: async ({ canvas }) => {
    const row = (await canvas.findAllByRole('link', { name: /stack$/ }))[0]
    const list = row.parentElement as HTMLElement
    const style = getComputedStyle(list)
    await expect(style.boxShadow).toBe('none')
    await expect(parseFloat(style.borderTopWidth)).toBe(0)
    await expect(parseFloat(style.borderLeftWidth)).toBe(0)
  },
}
