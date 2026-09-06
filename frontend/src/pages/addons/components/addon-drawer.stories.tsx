import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within, screen } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../../.storybook/msw-handlers'
import { makeAddon } from '../../../../.storybook/fixtures'
import { withConfirm, withCurrentUser } from '../../../../.storybook/decorators'
import { AddonDrawer } from './addon-drawer'
// Imported, not retyped. The sentence was spelt out in two stories, so a copy
// edit failed them both instead of being carried — the same second-copy problem
// the option lists had.
import { NOT_MANAGED_YET } from '../lib/addon-catalog'

const ADDONS = '/api/v1/organizations/:orgId/projects/:projectName/addons/postgres'
const STORES = '/api/v1/organizations/:orgId/projects/:projectName/object-stores'
// The hook reads the org-scoped route too; without it MSW lets the request
// through to a dev server that is not running and the backups section renders
// its failure state instead of its empty one.
const ORG_STORES = '/api/v1/organizations/:orgId/object-stores'

const handlers = [
  http.get(ADDONS, () => HttpResponse.json({ items: [makeAddon()], total: 1 })),
  http.get(STORES, () => HttpResponse.json({ items: [], total: 0 })),
  http.get(ORG_STORES, () => HttpResponse.json({ items: [], total: 0 })),
  ...baselineHandlers,
]

const meta = {
  title: 'Features/Addons/AddonDrawer',
  component: AddonDrawer,
  decorators: [withConfirm, withCurrentUser],
  parameters: { layout: 'fullscreen', msw: { handlers } },
  args: { open: true, onOpenChange: () => {} },
} satisfies Meta<typeof AddonDrawer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Step one. Every data store in the service registry appears — the ones we
 * cannot manage yet are a REGION with one explanation above them, not nine
 * rows each repeating the same sentence.
 */
export const Catalogue: Story = {
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'))
    // Off the registry, not a hand-written list: MySQL is here because the
    // stack builder knows about it, and nothing in this feature declared it.
    // Presence, not visibility — the catalogue scrolls, and where a row sits in
    // the scroll is not what this story is about.
    await expect(dialog.getByText('MySQL')).toBeInTheDocument()
    // The region's one sentence, once.
    const reason = dialog.getAllByText(NOT_MANAGED_YET)
    await expect(reason).toHaveLength(1)
    // **No primary.** Step one commits nothing — a row answers its question, so
    // a Continue beside it would only repeat the click you just made.
    await expect(dialog.queryByRole('button', { name: 'Continue' })).toBeNull()
    // **And no footer at all** (§13). It ended on a lone `Cancel`, which offered
    // to undo a state that does not exist — nothing has been typed and picking
    // advances. The ✕ and the path are the exits, and the band was costing 81px
    // of the sheet for the whole step.
    await expect(dialog.queryByRole('button', { name: 'Cancel' })).toBeNull()
    await expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull()
  },
}

/**
 * The nine unavailable services are a **region**, and a region is one to the
 * machine as well as to the eye: a listbox that points at the sentence above
 * it, holding nine rows that are off.
 *
 * They are also **readable**. The dimming is a tier drop, not `opacity-50` —
 * that measured 3.40:1 on the name and 2.29:1 on the meta against white, and
 * these rows exist to be read. Someone who came looking for Redis has to be
 * able to find out where they stand.
 */
export const UnavailableIsARegion: Story = {
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'))
    const region = dialog.getByRole('listbox', { name: 'Not managed yet' })
    await expect(region).toHaveAttribute('aria-describedby')

    const sentence = document.getElementById(region.getAttribute('aria-describedby') as string)
    await expect(sentence).toHaveTextContent(NOT_MANAGED_YET)

    // All nine, off together, and none of them carrying its own copy of the
    // reason — that wall is what the region replaced.
    await expect(within(region).getAllByRole('option')).toHaveLength(9)
    await expect(within(region).getByText('Redis')).not.toHaveClass(/opacity/)
  },
}

/**
 * **No search.** Ten rows fit one screen, so a filter could only ever hide
 * something already visible — and it cost a zero-result empty state that
 * existed purely to recover from using it. It comes back with the scroll that
 * justifies it.
 */
export const NoSearchField: Story = {
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'))
    await expect(dialog.queryByLabelText('Search services')).toBeNull()
    await expect(dialog.getByText('Postgres')).toBeInTheDocument()
  },
}

/**
 * Step two. The header carries the path and **no description** — you were
 * oriented in step one — and the width has not changed.
 */
export const Configure: Story = {
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('option', { name: /Postgres/ }))

    // **Resolving on the name IS the assertion.** The drawer fades in, so a
    // `toBeVisible` on its own content races the animation and fails at
    // opacity 0 on an element that is perfectly correct — the note on `Edit`
    // below says the same thing.
    await dialog.findByText('New addon')
    await dialog.findByRole('heading', { name: 'Postgres' })
    // Step one's description is gone.
    await expect(dialog.queryByText('A managed service your stacks can use.')).toBeNull()
    // The plan is a Select, not the bespoke radio table the page had.
    await expect(dialog.getByLabelText('Plan')).toBeInTheDocument()
  },
}

/**
 * The blocked primary. Nothing is disabled without saying why (§9), and the
 * reason has to be reachable by keyboard — a disabled button swallows pointer
 * events, so it anchors to a focusable wrapper.
 */
export const BlockedUntilNamed: Story = {
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('option', { name: /Postgres/ }))

    const commit = await dialog.findByRole('button', { name: 'Create addon' })
    await expect(commit).toBeDisabled()

    // The reason anchors to a focusable WRAPPER, because a disabled button
    // swallows pointer events. That wrapper being in the tab order is the
    // whole of "reachable by keyboard, not hover alone" (§9).
    const wrapper = commit.parentElement as HTMLElement
    await expect(wrapper).toHaveAttribute('tabindex', '0')

    // Scoped to the tooltip itself: Radix renders a second, screen-reader-only
    // copy of the text, so a bare text query finds two.
    await userEvent.hover(wrapper)
    await expect(await screen.findByRole('tooltip')).toHaveTextContent('Enter a name.')
  },
}

/**
 * The `New addon` crumb returns to the catalogue and keeps the width — and the
 * service you picked is still ticked, which is what the tick is for now that
 * picking advances: it is what you see when you come back.
 *
 * The arrow that used to do this is gone across every drawer. A crumb names
 * where it goes; "Back" only named the direction.
 */
export const BackToCatalogue: Story = {
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('option', { name: /Postgres/ }))
    await expect(dialog.queryByRole('button', { name: 'Back' })).toBeNull()
    await userEvent.click(await dialog.findByRole('button', { name: 'New addon' }))

    const postgres = await dialog.findByRole('option', { name: /Postgres/ })
    await expect(postgres).toHaveAttribute('aria-selected', 'true')
  },
}

/**
 * Editing is a ONE-step journey, so it opens straight on the form, the header
 * is the addon's name alone, and it has no crumb behind it — the ✕ is the exit.
 */
export const Edit: Story = {
  args: { addon: makeAddon({ id: 'pg-2', name: 'billing-db' }) },
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'))
    // Resolving on the accessible name IS the assertion — the header is the
    // addon's name and nothing else. Never `toBeVisible` here: the drawer
    // fades in, so under load that races the animation and fails at opacity 0
    // on an element that is perfectly correct.
    await dialog.findByRole('heading', { name: 'billing-db' })
    await expect(dialog.queryByRole('button', { name: 'Back' })).toBeNull()
    await expect(dialog.queryByRole('button', { name: 'New addon' })).toBeNull()

    // **No name field at all.** It was a disabled input, and a disabled input
    // dims to the same tone its own placeholder uses — so a filled name read
    // as an empty one, in the third place on screen already saying it. The
    // header carries the name; the description says it is fixed (§9: empty is
    // not disabled, and a control that can never be operated is not one).
    await expect(dialog.queryByLabelText(/Name/)).toBeNull()
    await expect(
      dialog.getByText('Change what this database runs on. The name is fixed.'),
    ).toBeInTheDocument()
  },
}

/** The commit failing puts the error in the footer band, where it cannot
 *  scroll away from the button that produced it. */
export const SaveFailed: Story = {
  parameters: {
    msw: {
      handlers: [
        // `reason` is the field the API actually returns and `getErrorMessage`
        // actually reads — `message` renders as a bare "Request failed".
        http.post(ADDONS, () =>
          HttpResponse.json({ reason: 'A database with that name already exists.' }, { status: 409 }),
        ),
        ...handlers,
      ],
    },
  },
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('option', { name: /Postgres/ }))
    await userEvent.type(await dialog.findByLabelText(/Name/), 'orders-db')
    await userEvent.click(dialog.getByRole('button', { name: 'Create addon' }))
    await dialog.findByText(/already exists/)
  },
}
