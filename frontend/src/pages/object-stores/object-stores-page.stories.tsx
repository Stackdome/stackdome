import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { withConfirm, withCurrentUser, withSheetHeader } from '../../../.storybook/decorators'
import type { ObjectStore } from '@/api/object-stores'
import ObjectStoresPage from './index'

const store = (over: Partial<ObjectStore>): ObjectStore =>
  ({
    id: 'os-1',
    name: 'backups-eu',
    project_id: 'proj-1',
    spec: {
      destination_path: 's3://acme-backups/pg',
      retention_policy: '30d',
      configuration: { s3_credentials: { region: 'eu-west-1' } },
    },
    ...over,
  }) as ObjectStore

/** One of each provider, because the provider column is the reason the page
 *  is a table rather than a list of names. */
const stores = [
  store({}),
  store({
    id: 'os-2',
    name: 'minio-onprem',
    spec: {
      destination_path: 's3://onprem/pg',
      retention_policy: '7d',
      configuration: { s3_credentials: { endpoint_url: 'https://minio.internal:9000' } },
    },
  } as Partial<ObjectStore>),
  store({
    id: 'os-3',
    name: 'azure-archive',
    spec: {
      destination_path: 'https://acme.blob.core.windows.net/pg',
      retention_policy: '90d',
      configuration: { azure_credentials: {} },
    },
  } as Partial<ObjectStore>),
]

const withStores = (items: ObjectStore[]) => [
  http.get('/api/v1/organizations/:orgId/object-stores', () =>
    HttpResponse.json({ items, total: items.length }),
  ),
  ...baselineHandlers,
]

const meta = {
  title: 'Pages/Object stores',
  component: ObjectStoresPage,
  decorators: [withConfirm, withCurrentUser, withSheetHeader],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ObjectStoresPage>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  parameters: { msw: withStores(stores) },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('minio-onprem')).toBeInTheDocument()
    // §12a's one fact, in the sheet header. Never an eyebrow, never a subtitle.
    await expect(canvas.getByText('3 object stores')).toBeInTheDocument()
    await expect(canvas.queryByText('Platform')).toBeNull()
    // The Stacks geometry, asserted rather than described. Gaps, not positions.
    const rows = [...canvasElement.querySelectorAll('[data-slot="data-list-row"]')] as HTMLElement[]
    const tops = rows.map((r) => r.getBoundingClientRect().top)
    await expect(tops[1] - tops[0]).toBe(64)
    await expect(tops[2] - tops[1]).toBe(64)
    // No rule BETWEEN rows — at 64px the space already groups them.
    await expect(parseFloat(getComputedStyle(rows[0]).borderBottomWidth)).toBe(0)
    // …but the rule UNDER THE COLUMN HEADERS stays, and the first row starts
    // against it. That one is the chrome/content boundary, not a separator.
    const header = canvasElement.querySelector('[data-slot="data-list-header"]') as HTMLElement
    await expect(parseFloat(getComputedStyle(header).borderBottomWidth)).toBe(1)
    await expect(Math.round(tops[0] - header.getBoundingClientRect().bottom)).toBe(0)
    // 20px between columns, 8px inset — the Stacks numbers.
    await expect(getComputedStyle(rows[0]).columnGap).toBe('20px')
    await expect(getComputedStyle(rows[0]).paddingLeft).toBe('8px')
    // The name is 14/20 medium; everything else in the row is 12/16.
    const name = canvas.getByText('backups-eu')
    await expect(getComputedStyle(name).fontSize).toBe('14px')
    await expect(getComputedStyle(name).fontWeight).toBe('500')
    await expect(getComputedStyle(canvas.getByText('eu-west-1')).fontSize).toBe('12px')
    // Row actions are hidden until the pointer arrives, but still mounted, so
    // they keep their tab stop and the row does not reflow on hover.
    const actions = canvasElement.querySelector('[data-slot="data-list-actions"]')!
    await expect(getComputedStyle(actions).opacity).toBe('0')
    await expect(canvas.getByRole('button', { name: 'Delete backups-eu' })).toBeInTheDocument()
  },
}

/** A count of one reads "1 object store", not "1 object stores". */
export const SingleRow: Story = {
  parameters: { msw: withStores([stores[0]]) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('1 object store')).toBeInTheDocument()
  },
}

export const Empty: Story = {
  parameters: { msw: withStores([]) },
  play: async ({ canvas, canvasElement }) => {
    const title = await canvas.findByText('No object stores yet')
    // Top-anchored, not centred: the art sits 72px below the header, which is
    // `EmptyState`'s own py-18. A height constraint here is what turns it into a
    // centred block floating in the middle of an empty page.
    const state = title.parentElement!.parentElement as HTMLElement
    await expect(getComputedStyle(state).paddingTop).toBe('72px')
    // Art → text is 24 for the large illustrations (20 is the small no-match
    // ring's number).
    await expect(getComputedStyle(state).rowGap).toBe('24px')
    await expect(canvasElement.querySelector('img[alt=""]')).toBeTruthy()
    // §9 — the empty state's action is the OUTLINE one. The header already
    // carries this action as the page's single fill, and two identical filled
    // buttons on one screen is two primaries.
    const buttons = await canvas.findAllByRole('button', { name: /new object store/i })
    await expect(buttons).toHaveLength(2)
    const fills = buttons.map((b) => getComputedStyle(b).backgroundColor)
    await expect(new Set(fills).size).toBe(2)
    // No count on a page with nothing to count — not even "0 object stores".
    await expect(canvas.queryByText(/^\d+ object stores?$/)).toBeNull()
  },
}

/** The retry refetches. A page reload was never a retry: it throws away the
 *  router and the session to re-run one request. */
export const LoadFailed: Story = {
  parameters: {
    msw: [
      http.get('/api/v1/organizations/:orgId/object-stores', () =>
        HttpResponse.json({ message: 'cluster hub unreachable' }, { status: 500 }),
      ),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Object stores could not be loaded')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    // The header's action survives the failure — the page is broken, not the
    // user's ability to add one.
    await expect(canvas.getByRole('button', { name: /new object store/i })).toBeInTheDocument()
  },
}

/** §11 loading — row skeletons at the real column pitch, so nothing moves when
 *  the data lands. Never a centred spinner. */
export const Skeleton: Story = {
  parameters: {
    msw: [
      http.get('/api/v1/organizations/:orgId/object-stores', async () => {
        await new Promise(() => {})
        return HttpResponse.json({ items: [], total: 0 })
      }),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    // The columns are up before the data is.
    await expect(await canvas.findByText('Destination path')).toBeInTheDocument()
    const block = canvasElement.querySelector('[data-slot="data-list-skeleton"]')!
    const rows = [...block.children] as HTMLElement[]
    await expect(rows).toHaveLength(6)
    // The SAME 64px pitch as a loaded row. This is the whole point: a different
    // pitch makes the list jump when the data lands.
    const tops = rows.map((r) => r.getBoundingClientRect().top)
    await expect(tops[1] - tops[0]).toBe(64)
    // No shimmer. Ambient movement on a working surface is what §14 rules out,
    // which is why this is a wash block and not the `Skeleton` primitive.
    const bar = block.querySelector('div > div') as HTMLElement
    await expect(getComputedStyle(bar).animationName).toBe('none')
  },
}

/** §11 — the list is not boxed. A border around the whole table is the card
 *  mistake at a larger scale. */
export const ListIsNotBoxed: Story = {
  parameters: { msw: withStores(stores) },
  play: async ({ canvas, canvasElement }) => {
    const name = await canvas.findByText('minio-onprem')
    const row = name.closest('[data-slot="data-list-row"]') as HTMLElement
    const rowStyle = getComputedStyle(row)
    await expect(rowStyle.boxShadow).toBe('none')
    await expect(parseFloat(rowStyle.borderTopWidth)).toBe(0)
    await expect(rowStyle.borderRadius).toBe('0px')

    const list = row.parentElement as HTMLElement
    const listStyle = getComputedStyle(list)
    await expect(listStyle.boxShadow).toBe('none')
    await expect(parseFloat(listStyle.borderTopWidth)).toBe(0)
    await expect(canvasElement.querySelector('table')).toBeNull()
  },
}
