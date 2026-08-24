import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../../../../.storybook/msw-handlers'
import { makeAddon, ORG_ID, DEFAULT_PROJECT } from '../../../../../../.storybook/fixtures'
import { BlocksTab } from './blocks-tab'
import type { BlockInstance } from '@/pages/stacks/components/create/selection'

const ADDONS_URL = `/api/v1/organizations/${ORG_ID}/projects/${DEFAULT_PROJECT}/addons/postgres`

function addonHandlers(items: ReturnType<typeof makeAddon>[]) {
  return [http.get(ADDONS_URL, () => HttpResponse.json({ items, total: items.length })), ...baselineHandlers]
}

const instance = (blockId: string, name: string, label: string): BlockInstance => ({
  blockId,
  name,
  label,
})

/**
 * The building-blocks step of the create-stack drawer — the catalogue you add a
 * stack's parts from, plus the managed add-ons already in the project.
 *
 * **Adding is repeatable, so a row reports a count rather than flipping to
 * "added".** You can want two Redises; a row that becomes a checkmark cannot
 * say so.
 */
const meta = {
  title: 'Features/CreateStack/BlocksTab',
  component: BlocksTab,
  tags: ['ai-generated'],
  parameters: { msw: { handlers: addonHandlers([]) } },
  args: {
    instances: [],
    onAddBlock: fn(),
    addonIds: [],
    onToggleAddon: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[480px] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BlocksTab>

export default meta
type Story = StoryObj<typeof meta>

/** The catalogue, nothing added yet. */
export const Default: Story = {}

/** Two of one block and one of another — the counts are what the rows report. */
export const WithInstances: Story = {
  args: {
    instances: [
      instance('redis', 'redis', 'Redis'),
      instance('redis', 'redis-2', 'Redis'),
      instance('postgres', 'postgres', 'Postgres'),
    ],
  },
}

/** Searching narrows the catalogue and the add-on list together — one query
 *  over both, because they are one list of things you can add. */
export const Searching: Story = {
  parameters: {
    msw: {
      handlers: addonHandlers([
        makeAddon({ id: 'a1', name: 'prod-db' }),
        makeAddon({ id: 'a2', name: 'sessions-cache' }),
      ]),
    },
  },
  play: async ({ canvas }) => {
    const search = await waitFor(() => canvas.getByRole('searchbox'))
    await userEvent.type(search, 'prod')
    await waitFor(async () => {
      await expect(canvas.queryByText('sessions-cache')).not.toBeInTheDocument()
    })
  },
}

/** A filter that matched nothing gets a sentence, not a blank panel. */
export const NothingMatches: Story = {
  play: async ({ canvas }) => {
    const search = await waitFor(() => canvas.getByRole('searchbox'))
    await userEvent.type(search, 'zzzzzz')
    await waitFor(async () => {
      await expect(canvas.queryByRole('option')).not.toBeInTheDocument()
    })
  },
}

/**
 * **Managed add-ons are a separate list, and they toggle.** A block is created
 * fresh every time you click it; an add-on already exists in the project, so
 * attaching it is a link you can undo — which is why these carry state and the
 * block rows do not.
 */
export const WithManagedAddons: Story = {
  parameters: {
    msw: {
      handlers: addonHandlers([
        makeAddon({ id: 'a1', name: 'prod-db' }),
        makeAddon({ id: 'a2', name: 'sessions-cache' }),
      ]),
    },
  },
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('prod-db')).toBeVisible()
    })
  },
}

/** An add-on already attached reports itself as selected. */
export const AnAddonAttached: Story = {
  args: { addonIds: ['a1'] },
  parameters: {
    msw: {
      handlers: addonHandlers([
        makeAddon({ id: 'a1', name: 'prod-db' }),
        makeAddon({ id: 'a2', name: 'sessions-cache' }),
      ]),
    },
  },
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('prod-db')).toBeVisible()
    })
  },
}

/** No add-ons in the project — the block catalogue stands alone rather than
 *  leaving an empty section behind it. */
export const NoManagedAddons: Story = {
  parameters: { msw: { handlers: addonHandlers([]) } },
}

/** Long add-on names truncate in the row rather than widening the drawer. */
export const LongAddonName: Story = {
  parameters: {
    msw: {
      handlers: addonHandlers([
        makeAddon({ id: 'a1', name: 'orders-gateway-staging-eu-west-1-primary-replica' }),
      ]),
    },
  },
}
