import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { ConnectProviderDrawer } from './connect-provider-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const ORG = '/api/v1/organizations/:orgId'

/**
 * The GitHub arm opens a popup and polls. Stories drive it through the network
 * and through `window.open` rather than by mocking the hook — the wait is the
 * reason this flow is a drawer, so it is the one thing that must be story-able.
 */
function stubPopup(result: Window | null) {
  window.open = (() => result) as typeof window.open
}

const connectHandlers = [
  http.post(`${ORG}/git-integrations/github/manifest`, () =>
    HttpResponse.json({ github_url: 'https://github.com/settings/apps/new', manifest: {} }),
  ),
  // The record only appears once the user confirms in the popup, so the list is
  // empty here and the hook sits in `waiting` — which is the state to render.
  http.get(`${ORG}/git-integrations`, () => HttpResponse.json({ items: [], total: 0 })),
  http.get(`${ORG}/git-integrations/:id/installations`, () => HttpResponse.json({ items: [], total: 0 })),
  http.post(`${ORG}/git-integrations`, () => HttpResponse.json({ host: 'gitlab.com' })),
  ...baselineHandlers,
]

const meta = {
  title: 'Features/GitProviders/ConnectProviderDrawer',
  component: ConnectProviderDrawer,
  tags: ['ai-generated'],
  parameters: { msw: { handlers: connectHandlers } },
  args: {
    open: true,
    onOpenChange: fn(),
    hasGithubApp: false,
    onCreated: fn(),
  },
} satisfies Meta<typeof ConnectProviderDrawer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * **Step one — the catalogue.** Five rows off the registry in `lib/git-integrations`,
 * not a second hand-written copy: the wizard's own list had already drifted, with
 * `other` reading `Other` on the tile and `Git host` in the list it creates.
 *
 * Picking advances, so there is no primary and **no footer at all** (§13).
 */
export const PickAProvider: Story = {
  play: async () => {
    const rows = await drawer().findAllByRole('option')
    await expect(rows.map((r) => r.textContent?.split('Access')[0].trim())).toHaveLength(5)
    await expect(await drawer().findByRole('option', { name: /^GitHub/ })).toBeInTheDocument()
    // The fifth row carries the registry's name, which is the list's name too.
    await expect(await drawer().findByRole('option', { name: /Git host/ })).toBeInTheDocument()

    await expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull()
  },
}

/**
 * **The GitHub arm is a third step, not a mode field.** Picking GitHub asks a
 * second question the other four never see — and on the App branch there is no
 * form at all, which is what rules out the object store's "a mode is a field".
 */
export const GitHubAsksHowToConnect: Story = {
  play: async () => {
    await userEvent.click(await drawer().findByRole('option', { name: /^GitHub/ }))
    await expect(await drawer().findByRole('option', { name: /install github app/i })).toBeInTheDocument()
    await expect(await drawer().findByRole('option', { name: /use an access token/i })).toBeInTheDocument()
    // The path grew a segment; resolving the name IS the assertion.
    await expect(await drawer().findByRole('heading', { name: 'GitHub' })).toBeInTheDocument()
  },
}

/**
 * **Nothing is off without saying why** (§9). The App row used to grey with
 * `disabled:opacity-60` and hide its reason inside its own body copy; passing
 * `reason` to `PickerRow` is what disables it, and the reason is the row's own
 * second line.
 */
export const AppInstallSaysWhyItIsOff: Story = {
  args: { hasGithubApp: true },
  play: async () => {
    await userEvent.click(await drawer().findByRole('option', { name: /^GitHub/ }))
    const row = await drawer().findByRole('option', { name: /install github app/i })
    await expect(row).toBeDisabled()
    await expect(row).toHaveTextContent(/already connected/i)
  },
}

/**
 * The three-segment path, and the form it ends on. `Connect provider › GitHub ›
 * Access token` — the middle crumb goes back to the question it answers.
 */
export const TheGitHubTokenPath: Story = {
  play: async () => {
    await userEvent.click(await drawer().findByRole('option', { name: /^GitHub/ }))
    await userEvent.click(await drawer().findByRole('option', { name: /use an access token/i }))

    await expect(await drawer().findByRole('heading', { name: 'Access token' })).toBeInTheDocument()
    await expect(await drawer().findByLabelText(/host/i)).toHaveValue('github.com')

    await userEvent.click(await drawer().findByRole('button', { name: 'GitHub' }))
    await expect(await drawer().findByRole('option', { name: /install github app/i })).toBeInTheDocument()
  },
}

/**
 * **The primary is blocked, and it lists everything missing** (§9). The dialog
 * let `Connect` be pressed and reported the same two facts as field errors
 * afterwards.
 *
 * The three fields are **full width and unpaired**: a token *replaces* the
 * username on four of the five hosts rather than completing it, so
 * `Username ǀ Access token` would be pairing by count (§8).
 */
export const TheFormBlocksAndSaysWhat: Story = {
  play: async () => {
    await userEvent.click(await drawer().findByRole('option', { name: /GitLab/ }))
    const connect = await drawer().findByRole('button', { name: /^connect$/i })
    await expect(connect).toBeDisabled()

    // Host is prefilled for GitLab, so the token is the one thing outstanding.
    await userEvent.hover(connect.parentElement!)
    await expect(await drawer().findAllByText(/enter an access token/i)).not.toHaveLength(0)

    const host = await drawer().findByLabelText(/host/i)
    const username = await drawer().findByLabelText(/username/i)
    await expect(host.getBoundingClientRect().top).toBeLessThan(
      username.getBoundingClientRect().top,
    )
    await expect(host.getBoundingClientRect().width).toBe(username.getBoundingClientRect().width)
  },
}

/**
 * **Bitbucket is the one host where `Username` is required**, and the registry is
 * what knows it. It shipped with no `*` over a hint reading *"Required for
 * providers using basic auth"* — optional and required in the same field.
 */
export const BitbucketNeedsAUsername: Story = {
  play: async () => {
    await userEvent.click(await drawer().findByRole('option', { name: /Bitbucket/ }))
    const label = (await drawer().findByText(/^username$/i)).closest('label')
    await expect(label?.querySelector('[aria-hidden]')).toHaveTextContent('*')

    await userEvent.type(await drawer().findByLabelText(/access token/i), 'app-password')
    const connect = await drawer().findByRole('button', { name: /^connect$/i })
    await userEvent.hover(connect.parentElement!)
    await expect(await drawer().findAllByText(/enter your username/i)).not.toHaveLength(0)
  },
}

/**
 * **The wait, in place.** It is not a step — it asks nothing and the path does
 * not grow for it — but it stays visible, because polling while you authorise in
 * another window is the whole reason §13 calls this a drawer.
 *
 * **It reports what we know, which is one thing.** It shipped as a three-line
 * checklist with a mark per line, over a hook that has two states — so the
 * middle line was lit by an `i === 1` literal and all three flipped at once.
 * Invented granularity, and three `Checkbox`es that looked operable and were
 * not. The instruction and the manual probe are what is left.
 */
export const WaitingOnTheGitHubPopup: Story = {
  play: async () => {
    stubPopup({} as Window)
    await userEvent.click(await drawer().findByRole('option', { name: /^GitHub/ }))
    await userEvent.click(await drawer().findByRole('option', { name: /install github app/i }))

    await expect(await drawer().findByText(/installing the github app/i)).toBeInTheDocument()
    await expect(await drawer().findByText(/finish the installation in the github popup/i)).toBeInTheDocument()
    await expect(await drawer().findByRole('button', { name: /check again/i })).toBeInTheDocument()

    // No fake progress, and nothing on this screen pretends to be a control.
    await expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
    await expect(document.querySelector('.bg-warn')).toBeNull()
  },
}

/**
 * **The failure is the first thing in the body.** §13 puts the error slot in the
 * footer so a *form's* failure cannot scroll away from the button that produced
 * it — but nothing is committed here, and under the copy it contradicted, the
 * banner read as a footnote to a screen still claiming to work.
 */
export const ThePopupWasBlocked: Story = {
  play: async () => {
    stubPopup(null)
    await userEvent.click(await drawer().findByRole('option', { name: /^GitHub/ }))
    await userEvent.click(await drawer().findByRole('option', { name: /install github app/i }))

    const banner = await drawer().findByText(/popup blocked/i)
    const body = banner.closest('[data-slot="drawer-body"]')!
    await waitFor(() => expect(body).not.toBeNull())
    // First child of the body, above everything it invalidates.
    await expect(body.firstElementChild!.contains(banner)).toBe(true)
    // The line that is no longer true steps aside, and so does the probe the
    // banner's own retry duplicates.
    await expect(drawer().queryByText(/finish the installation in the github popup/i)).toBeNull()
    await expect(drawer().queryByRole('button', { name: /check again/i })).toBeNull()
  },
}

/**
 * **No `Cancel`, on any step.** The path's live crumbs and the ✕ are the
 * journey's exits; the footer is where the thing gets made, so it holds the
 * primary alone.
 */
export const NoCancelAnywhere: Story = {
  play: async () => {
    await expect(drawer().queryByRole('button', { name: 'Cancel' })).toBeNull()
    await userEvent.click(await drawer().findByRole('option', { name: /Gitea/ }))
    await expect(await drawer().findByRole('button', { name: /^connect$/i })).toBeInTheDocument()
    await expect(drawer().queryByRole('button', { name: 'Cancel' })).toBeNull()
    await expect(drawer().queryByRole('button', { name: /^back$/i })).toBeNull()
  },
}
