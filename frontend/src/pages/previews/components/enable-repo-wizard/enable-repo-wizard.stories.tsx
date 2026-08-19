import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../../../.storybook/msw-handlers'
import { EnableRepoWizard } from './enable-repo-wizard'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

/** Re-queried every time: phase 1 and phase 2 mount different footers. */
const cont = () => drawer().getByRole('button', { name: /continue/i })

/**
 * A row's meta line, matched whole. `PickerRow` renders each part in its own
 * span with a `·` span between them, so the line is not one text node and a
 * plain string matcher never finds it.
 */
const metaLine = (...parts: string[]) => (_: string, el: Element | null) =>
  el?.tagName === 'SPAN' && el.textContent === parts.join('·')

const ORG = '/api/v1/organizations/:orgId'

// `private` is set on purpose: the row's meta reads `visibility · branch`, so a
// list where every repository is public never proves the first half.
const REPOS = [
  { full_name: 'acme/web-storefront', clone_url: 'https://github.com/acme/web-storefront.git', default_branch: 'main', private: false },
  { full_name: 'acme/checkout-api', clone_url: 'https://github.com/acme/checkout-api.git', default_branch: 'main', private: true },
  { full_name: 'acme/billing-worker', clone_url: 'https://github.com/acme/billing-worker.git', default_branch: 'develop', private: false },
]

const repoHandlers = [
  http.get(`${ORG}/git-integrations`, () =>
    HttpResponse.json({
      items: [
        {
          id: 'gi-1',
          type: 'github_app',
          host: 'github.com',
          status: 'installed',
          credentials_configured: true,
        },
      ],
      total: 1,
    }),
  ),
  http.get(`${ORG}/git-integrations/:id/repositories`, () => HttpResponse.json({ items: REPOS, total: REPOS.length })),
  // Picking a row re-fetches the single repository for its canonical clone URL
  // and default branch, and the branch field then lists its branches. Both are
  // separate calls — without them the pick silently fails and phase 2 is
  // unreachable, which is exactly how this story first failed.
  http.get(`${ORG}/git-integrations/:id/repositories/:owner/:repo`, ({ params }) =>
    HttpResponse.json(REPOS.find((r) => r.full_name === `${params.owner}/${params.repo}`) ?? {}),
  ),
  http.get(`${ORG}/git-integrations/:id/repositories/:owner/:repo/branches`, () =>
    HttpResponse.json({ items: ['main', 'develop'], total: 2 }),
  ),
  ...baselineHandlers,
]

const meta = {
  title: 'Features/Previews/EnableRepoWizard',
  component: EnableRepoWizard,
  tags: ['ai-generated'],
  args: { open: true, onOpenChange: fn(), onCreated: fn() },
  parameters: { msw: repoHandlers },
} satisfies Meta<typeof EnableRepoWizard>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Phase one. Nothing is picked, so `Continue` is blocked and says what would
 * unblock it — the muted hint that used to float beside the button is now the
 * block's own reason.
 */
export const PickRepository: Story = {
  play: async () => {
    const cont = await drawer().findByRole('button', { name: /continue/i })
    await expect(cont).toBeDisabled()

    // Radix renders tooltip content twice: the visible copy and a
    // visually-hidden one for screen readers.
    await userEvent.hover(cont.parentElement!)
    await expect(await drawer().findAllByText(/pick a repository to continue/i)).not.toHaveLength(0)
  },
}

/**
 * Phase two, reached the way a user reaches it. The header grows a second crumb
 * and names the repository being configured; the footer's primary becomes the
 * commitment.
 */
export const ConfigureAfterPicking: Story = {
  play: async () => {
    const repo = await drawer().findByText('acme/checkout-api', undefined, { timeout: 5000 })
    await userEvent.click(repo)
    // Picking is a round trip — the row's click re-fetches the repository for
    // its canonical clone URL before `onChange` fires. Clicking Continue in the
    // same breath hits a still-disabled button and does nothing at all.
    await waitFor(() => expect(cont()).toBeEnabled())
    await userEvent.click(cont())

    await expect(await drawer().findByLabelText(/^name/i)).toHaveValue('checkout-api')
    await expect(drawer().getByLabelText(/stackfile path/i)).toHaveValue('stackfile.yaml')
    await expect(drawer().getByRole('button', { name: /enable previews/i })).toBeInTheDocument()

    // **One way back, and it is the crumb.** The arrow is gone from every
    // drawer, and `Enable repository` names the list it returns you to — which
    // "Back to the repository list" had to spell out in six words.
    await expect(drawer().getByRole('button', { name: /^enable repository$/i })).toBeInTheDocument()
    await expect(drawer().queryByRole('button', { name: /^back$/i })).toBeNull()
  },
}

/**
 * The row's second line, which used to say `private` or nothing at all — so a
 * public repository carried no meta and the row read as half-drawn.
 */
export const RowMetaReadsVisibilityThenBranch: Story = {
  play: async () => {
    await drawer().findByText('acme/billing-worker', undefined, { timeout: 5000 })
    await expect(drawer().getByText(metaLine('public', 'develop'))).toBeInTheDocument()
    await expect(drawer().getByText(metaLine('private', 'main'))).toBeInTheDocument()
  },
}

/**
 * The Public URL side. The switch keeps its own row and the URL is a labelled
 * field, not the search slot — and what it resolves to is the same 56 row the
 * provider list is made of.
 *
 * Typed in two halves on purpose: the assertion is the **threshold**, not the
 * happy end state. `https://github.com` is a host, not a repository, and the
 * old gate let any non-empty string through.
 */
export const PublicUrlResolvesToARow: Story = {
  play: async () => {
    await userEvent.click(await drawer().findByRole('radio', { name: /public url/i }))

    const field = await drawer().findByLabelText(/repository url/i)
    await userEvent.type(field, 'https://github.com')
    await expect(drawer().queryByText(/this will build/i)).toBeNull()
    await expect(cont()).toBeDisabled()

    await userEvent.type(field, '/acme/awwdits.git')
    await drawer().findByText(/this will build/i)
    await expect(drawer().getByText('acme/awwdits')).toBeInTheDocument()
    await expect(drawer().getByText(metaLine('public URL', 'main'))).toBeInTheDocument()
    await waitFor(() => expect(cont()).toBeEnabled())
  },
}

/**
 * A brand-new organisation. The control band stays put with the search off —
 * same source in a different state, not a different source — and the reason
 * sits directly under the dead field with the fix as a button.
 */
export const NoProviderConnected: Story = {
  parameters: {
    msw: [http.get(`${ORG}/git-integrations`, () => HttpResponse.json({ items: [], total: 0 })), ...baselineHandlers],
  },
  play: async () => {
    await drawer().findByText(/no git provider connected yet/i)
    await expect(await drawer().findByRole('button', { name: /^connect provider$/i })).toBeInTheDocument()
    // Off, not gone. A band that changes shape between two states of the same
    // source makes the switch beside it jump.
    await expect(drawer().getByRole('searchbox', { name: /search repositories/i })).toBeDisabled()
  },
}

/**
 * **The env-var row keeps its own widths.** `FieldShell` enforces "the control
 * fills the field" with a CSS rule, and as a *descendant* rule it reached inside
 * this composite and forced the 110px `Value source` select to `w-full` — which,
 * being `flex-none`, ate the row and squeezed the name box to **26px**.
 *
 * Measured, not eyeballed: the name input has to be wide enough to type in, and
 * the row's last control has to land on the same trailing edge as the fields
 * above it.
 */
export const EnvVarRowKeepsItsWidths: Story = {
  play: async () => {
    await userEvent.click(await drawer().findByText('acme/checkout-api', undefined, { timeout: 5000 }))
    await waitFor(() => expect(cont()).toBeEnabled())
    await userEvent.click(cont())
    await userEvent.click(await drawer().findByRole('button', { name: /add variable/i }))

    const name = await drawer().findByLabelText(/variable name/i)
    const nameField = drawer().getByLabelText(/^name/i)
    const remove = drawer().getByRole('button', { name: /remove variable/i })

    expect(name.getBoundingClientRect().width).toBeGreaterThan(120)
    // The row ends where every field above it ends.
    expect(Math.round(remove.getBoundingClientRect().right)).toBe(
      Math.round(nameField.getBoundingClientRect().right),
    )
    // Lower case: a placeholder in caps pretends to be a value.
    await expect(name).toHaveAttribute('placeholder', 'name')
  },
}

/** The crumb returns to the list with the pick still made — going back a phase
 *  must not throw away what the phase produced. */
export const BackKeepsThePick: Story = {
  play: async () => {
    await userEvent.click(await drawer().findByText('acme/checkout-api', undefined, { timeout: 5000 }))
    await waitFor(() => expect(cont()).toBeEnabled())
    await userEvent.click(cont())
    await userEvent.click(await drawer().findByRole('button', { name: /^enable repository$/i }))

    // `findBy`, not `getBy`: phase 1 mounts a fresh footer, so the button is
    // briefly absent rather than merely disabled.
    await expect(
      await drawer().findByRole('button', { name: /continue/i }),
    ).toBeEnabled()
  },
}
