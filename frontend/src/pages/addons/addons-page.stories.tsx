import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { makeAddon } from '../../../.storybook/fixtures'
import { withConfirm, withCurrentUser, withSheetHeader } from '../../../.storybook/decorators'
import type { PostgresAddon } from '@/api/addons'
import AddonsPage from './index'

const ADDONS_PATH = '/api/v1/organizations/:orgId/projects/:projectName/addons/postgres'

/** One of each status, because the status column is half the reason to open
 *  this page at all. */
const addons = [
  makeAddon(),
  makeAddon({
    id: 'pg-2',
    name: 'analytics-db',
    status: { state: 'Creating' },
    created_at: '2026-07-30T18:00:00Z',
  }),
  makeAddon({
    id: 'pg-3',
    name: 'sessions-db',
    status: { state: 'Error', message: 'volume provisioning failed' },
    created_at: '2026-07-25T12:00:00Z',
  }),
]

const withAddons = (items: PostgresAddon[]) => [
  http.get(ADDONS_PATH, () => HttpResponse.json({ items, total: items.length })),
  ...baselineHandlers,
]

const meta = {
  title: 'Pages/Addons',
  component: AddonsPage,
  decorators: [withConfirm, withCurrentUser, withSheetHeader],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AddonsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  parameters: { msw: withAddons(addons) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('analytics-db')).toBeInTheDocument()
    // §12a's one fact, in the sheet header. Never an eyebrow, never a subtitle.
    await expect(canvas.getByText('3 addons')).toBeInTheDocument()
    await expect(canvas.queryByText('Platform')).toBeNull()
    // The tools moved OUT of the list and into the header's second row.
    await expect(canvas.getByLabelText('Filter addons')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /^Status:/ })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /^Sort:/ })).toBeInTheDocument()
  },
}

/** A count of one reads "1 addon", not "1 addons". */
export const SingleRow: Story = {
  parameters: { msw: withAddons([addons[0]]) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('1 addon')).toBeInTheDocument()
  },
}

export const Empty: Story = {
  parameters: { msw: withAddons([]) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No addons yet')).toBeInTheDocument()
    // §9 — the empty state's action is the OUTLINE one. The header already
    // carries this action as the page's single fill.
    const buttons = await canvas.findAllByRole('button', { name: /new addon/i })
    await expect(buttons).toHaveLength(2)
    const fills = buttons.map((b) => getComputedStyle(b).backgroundColor)
    await expect(new Set(fills).size).toBe(2)
    // No count on a page with nothing to count — not even "0 addons".
    await expect(canvas.queryByText(/^\d+ addons?$/)).toBeNull()
  },
}

/** The count tracks what is ON SCREEN, the tools stay up, and the way out is
 *  the state's own action. */
export const NoMatch: Story = {
  parameters: { msw: withAddons(addons) },
  play: async ({ canvas, userEvent }) => {
    const search = await canvas.findByLabelText('Filter addons')
    await userEvent.type(search, 'zzz')
    await expect(await canvas.findByText('No addons match')).toBeInTheDocument()
    // The tools are what got you here and what gets you out — they never leave.
    await expect(canvas.getByRole('button', { name: /^Status:/ })).toBeInTheDocument()
    await expect(canvas.queryByText(/^\d+ addons?$/)).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }))
    await expect(await canvas.findByText('analytics-db')).toBeInTheDocument()
  },
}

/** The retry refetches. A page reload was never a retry: it throws away the
 *  router and the session to re-run one request. */
export const LoadFailed: Story = {
  parameters: {
    msw: [
      http.get(ADDONS_PATH, () =>
        HttpResponse.json({ message: 'cluster hub unreachable' }, { status: 500 }),
      ),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Addons could not be loaded')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    // The toolbar is gone: there is nothing to filter, and a live control over
    // a dead list is a lie.
    await expect(canvas.queryByLabelText('Filter addons')).toBeNull()
    await expect(canvas.queryByRole('button', { name: /^Sort:/ })).toBeNull()
  },
}

/** §11 loading — column headers up before the data, skeleton rows at the real
 *  pitch. Never a centred spinner. */
export const Skeleton: Story = {
  parameters: {
    msw: [
      http.get(ADDONS_PATH, async () => {
        await new Promise(() => {})
        return HttpResponse.json({ items: [], total: 0 })
      }),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('Version')).toBeInTheDocument()
    await expect(canvasElement.querySelector('[data-slot="data-list-skeleton"]')).toBeTruthy()
    // The tools do not depend on the data, so they are already up.
    await expect(canvas.getByLabelText('Filter addons')).toBeInTheDocument()
  },
}

/** §11 — the list is not boxed, and no row is a card. The rows and the sheet
 *  edge are the only boundaries there are. */
export const ListIsNotBoxed: Story = {
  parameters: { msw: withAddons(addons) },
  play: async ({ canvas, canvasElement }) => {
    const name = await canvas.findByText('analytics-db')
    const row = name.closest('[data-slot="data-list-row"]') as HTMLElement
    const rowStyle = getComputedStyle(row)
    await expect(rowStyle.boxShadow).toBe('none')
    await expect(parseFloat(rowStyle.borderTopWidth)).toBe(0)
    await expect(rowStyle.borderRadius).toBe('0px')

    const list = row.parentElement as HTMLElement
    const listStyle = getComputedStyle(list)
    await expect(listStyle.boxShadow).toBe('none')
    await expect(parseFloat(listStyle.borderTopWidth)).toBe(0)
    await expect(parseFloat(listStyle.borderLeftWidth)).toBe(0)
    await expect(canvasElement.querySelector('table')).toBeNull()
  },
}
