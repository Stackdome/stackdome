import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { makeGitIntegration, ORG_ID } from '../../../../.storybook/fixtures'
import { GIT_INTEGRATION_TYPE_CREDENTIALS } from '@/lib/git-integrations'
import { GitIntegrationDrawer } from './git-integration-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const INSTALLATIONS_URL = `/api/v1/organizations/${ORG_ID}/git-integrations/:id/installations`

const meta = {
  title: 'Features/GitIntegrations/GitIntegrationDrawer',
  component: GitIntegrationDrawer,
  args: {
    integration: makeGitIntegration(),
    onOpenChange: fn(),
    onUpdated: fn(),
    onVerify: fn(),
    onRemove: fn(),
  },
  parameters: {
    msw: [
      http.get(INSTALLATIONS_URL, () =>
        HttpResponse.json({
          items: [
            { id: 'i1', account_login: 'acme', repository_selection: 'all' },
            { id: 'i2', account_login: 'acme-labs', repository_selection: 'selected' },
          ],
        }),
      ),
    ],
  },
} satisfies Meta<typeof GitIntegrationDrawer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * **A GitHub App has no form, because it has no `PUT`.** Access flows through
 * per-installation tokens granted on GitHub, so what the drawer holds is a
 * reading — and the way to change it is GitHub's own page, on the header band.
 */
export const GithubApp: Story = {
  play: async () => {
    await expect(await drawer().findByRole('link', { name: /manage on github/i })).toBeInTheDocument()
    await expect(drawer().queryByLabelText(/access token/i)).toBeNull()
    await expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull()
    // Verification is refused for app-type integrations, so it is not offered.
    await expect(drawer().queryByRole('button', { name: /verify repository access/i })).toBeNull()
  },
}

/** Every fact is a label and its value on the 32 rung — the same body idiom as
 *  the cluster and addon drawers. */
export const GithubAppReadsAsRows: Story = {
  play: async () => {
    for (const label of ['Status', 'Auth', 'Access']) {
      await expect(await drawer().findByText(label)).toBeInTheDocument()
    }
    await expect(await drawer().findByText('2 installations')).toBeInTheDocument()
    const rows = [...document.querySelectorAll('dl > div')] as HTMLElement[]
    for (const row of rows) await expect(row.getBoundingClientRect().height).toBe(32)
  },
}

/**
 * **A credentials integration is a login, so it opens straight into its form.**
 * `Verify` costs nothing and is the thing you do right after typing a token, so
 * it rides the header the way `Sync` does on a preview.
 */
export const CredentialsForm: Story = {
  args: {
    integration: makeGitIntegration({
      id: 'gi2',
      type: GIT_INTEGRATION_TYPE_CREDENTIALS,
      host: 'gitlab.com',
      install_url: undefined,
    }),
  },
  play: async ({ args }) => {
    const verify = await drawer().findByRole('button', { name: /verify repository access/i })
    await expect(verify.closest('[data-slot="drawer-header"]')).not.toBeNull()
    await expect(drawer().getByLabelText(/access token/i)).toBeInTheDocument()
    await expect(document.querySelector('[data-slot="drawer-footer"]')).not.toBeNull()
    await userEvent.click(verify)
    await expect(args.onVerify).toHaveBeenCalled()
  },
}

/** **A value, not a field** (§9). The API keys on the host, so it is fixed once
 *  the integration exists — it reports rather than pretending to be editable. */
export const HostIsAValue: Story = {
  args: {
    integration: makeGitIntegration({
      id: 'gi2',
      type: GIT_INTEGRATION_TYPE_CREDENTIALS,
      host: 'gitlab.com',
      install_url: undefined,
    }),
  },
  play: async () => {
    await expect(await drawer().findByText('Host')).toBeInTheDocument()
    await expect(drawer().queryByRole('textbox', { name: /host/i })).toBeNull()
  },
}

/** Nothing is disabled without saying why (§11) — the primary lists what is
 *  still missing, in the verb of the act. */
export const SaveRefusesUntilTheTokenIsThere: Story = {
  args: {
    integration: makeGitIntegration({
      id: 'gi2',
      type: GIT_INTEGRATION_TYPE_CREDENTIALS,
      host: 'gitlab.com',
      install_url: undefined,
    }),
  },
  play: async () => {
    const save = await drawer().findByRole('button', { name: /^update credentials$/i })
    await expect(save).toBeDisabled()
    await userEvent.hover(save.parentElement!)
    await expect(await drawer().findAllByText(/Paste the access token/i)).not.toHaveLength(0)
  },
}

/**
 * **Removing takes every stack and preview built from the provider with it**,
 * so the trigger is the danger zone at the foot of the body — never a menu item
 * and never a glyph on the band (§10).
 */
export const RemoveLivesInTheDangerZone: Story = {
  play: async ({ args }) => {
    const remove = await drawer().findByRole('button', { name: /remove provider/i })
    await expect(remove.closest('[data-slot="drawer-header"]')).toBeNull()
    const zone = drawer().getByRole('heading', { name: /danger zone/i }).parentElement!
    await expect(zone).toContainElement(remove)
    await expect(zone).toHaveTextContent(/stops cloning/i)
    await userEvent.click(remove)
    await expect(args.onRemove).toHaveBeenCalled()
  },
}

/** No credentials stored — the form is the fix, and it opens empty because the
 *  token is write-only and there is nothing to prefill. */
export const CredentialsMissing: Story = {
  args: {
    integration: makeGitIntegration({
      id: 'gi2',
      type: GIT_INTEGRATION_TYPE_CREDENTIALS,
      host: 'bitbucket.org',
      credentials_configured: false,
      install_url: undefined,
    }),
  },
  play: async () => {
    await expect(await drawer().findByLabelText(/access token/i)).toHaveValue('')
    // Bitbucket authenticates with username + app password, so the username is
    // genuinely required there and optional everywhere else — and the refusal
    // lists BOTH, in the verb of each act, rather than one shrug for the pair.
    const save = drawer().getByRole('button', { name: /^update credentials$/i })
    await userEvent.hover(save.parentElement!)
    await expect(await drawer().findAllByText('Enter the username')).not.toHaveLength(0)
    await expect(drawer().getAllByText('Paste the access token')).not.toHaveLength(0)
  },
}
