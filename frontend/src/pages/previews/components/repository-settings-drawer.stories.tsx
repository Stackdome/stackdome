import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../../.storybook/msw-handlers'
import { withConfirm, withCurrentUser } from '../../../../.storybook/decorators'
import type { StackPreviewConfig } from '@/api/preview-configs'
import { RepositorySettingsDrawer } from './repository-settings-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const config = {
  id: 'c1',
  name: 'web-storefront',
  git_repository: { repo_url: 'https://github.com/acme/web-storefront.git', base_branch: 'main' },
  stackfile_path: 'stackfile.yaml',
  max_active_previews: 5,
  env: [
    { name: 'API_BASE', value: 'https://staging.acme.dev' },
    { name: 'STRIPE_KEY', value: '{{ secret.stripe-test }}' },
  ],
} as StackPreviewConfig

const meta = {
  title: 'Features/Previews/RepositorySettingsDrawer',
  component: RepositorySettingsDrawer,
  decorators: [withConfirm, withCurrentUser],
  parameters: {
    // The env-var rows offer saved secrets as a value source, so the list has
    // to resolve or the Secret select renders its own empty state.
    msw: [
      http.get('/api/v1/organizations/:orgId/secrets', () =>
        HttpResponse.json({
          items: [
            { id: 'sec-1', name: 'stripe-test', type: 'Generic' },
            { id: 'sec-2', name: 'sentry-dsn', type: 'Generic' },
          ],
          total: 2,
        }),
      ),
      ...baselineHandlers,
    ],
  },
  args: {
    open: true,
    onOpenChange: fn(),
    config,
    activeCount: 0,
    onSaved: fn(),
    onDeleted: fn(),
  },
} satisfies Meta<typeof RepositorySettingsDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

/**
 * **`Repository` is a value, not a field.** It can never be filled, and a
 * disabled input dims to its own placeholder's tone — so a filled one would read
 * as empty. It takes the control well, the control radius and the 32 rung, in
 * mono, because it is a machine string you reference and copy (§9).
 */
export const TheRepositoryIsAValue: Story = {
  play: async () => {
    const value = await drawer().findByText('github.com/acme/web-storefront')
    await expect(value.closest('input')).toBeNull()
    await expect(value.parentElement?.className).toContain('bg-control')
    await expect(value.parentElement?.className).toContain('rounded-md')
  },
}

/**
 * **The footer holds the primary alone.** The board drew a `Cancel`; it comes
 * off for the reason the last five drawers' did — before `Save changes` is
 * pressed there is nothing for it to undo, and the ✕, Esc and the scrim are all
 * already exits.
 */
export const NoCancelInTheFooter: Story = {
  play: async () => {
    await expect(await drawer().findByRole('button', { name: /save changes/i })).toBeInTheDocument()
    await expect(drawer().queryByRole('button', { name: /^cancel$/i })).toBeNull()
  },
}

/**
 * **Blocked before the click, with the count.** The API refuses to remove a
 * repository while previews are running; discovering that as a server error
 * after the confirm is a rejection you have already committed to.
 */
export const RemoveIsBlockedWhilePreviewsRun: Story = {
  args: { activeCount: 3 },
  play: async () => {
    const remove = await drawer().findByRole('button', { name: /remove repository/i })
    await expect(remove).toBeDisabled()
    await userEvent.hover(remove.parentElement!)
    await expect(await drawer().findAllByText(/delete this repository's 3 environments first/i))
      .not.toHaveLength(0)
  },
}

/** With nothing running the removal is live — and it still goes behind a
 *  confirm whose words say the code is untouched. */
export const RemoveIsLiveWhenNothingIsRunning: Story = {
  play: async () => {
    const remove = await drawer().findByRole('button', { name: /remove repository/i })
    await expect(remove).toBeEnabled()
    await userEvent.click(remove)
    // The body copy says it too, so the CONFIRM is what we look for.
    await expect(
      await drawer().findByRole('button', { name: /^remove repository$/i, hidden: false }),
    ).toBeInTheDocument()
    await expect(
      await drawer().findByText(/remove web-storefront from previews\?/i),
    ).toBeInTheDocument()
  },
}

/** Emptying a required field blocks the primary and says which one, in the verb
 *  of the act. */
export const BlockedUntilTheRequiredFieldsAreFilled: Story = {
  play: async () => {
    await userEvent.clear(await drawer().findByLabelText(/base branch/i))
    const save = drawer().getByRole('button', { name: /save changes/i })
    await expect(save).toBeDisabled()
    await userEvent.hover(save.parentElement!)
    await expect(await drawer().findAllByText(/enter the branch pull requests target/i))
      .not.toHaveLength(0)
  },
}

/** A repository with no environment variables yet: the list is the add control
 *  alone, which reads as the next row rather than as chrome. */
export const NoEnvironmentVariables: Story = {
  args: { config: { ...config, env: [] } as StackPreviewConfig },
  play: async () => {
    await expect(await drawer().findByRole('button', { name: /add variable/i })).toBeInTheDocument()
  },
}

/** A long repository URL truncates inside its well rather than widening the
 *  drawer or wrapping to a second line. */
export const LongRepositoryUrl: Story = {
  args: {
    config: {
      ...config,
      git_repository: {
        repo_url:
          'https://git.internal.acme.dev/platform/tooling/developer-experience-console.git',
        base_branch: 'release/2026-08',
      },
    } as StackPreviewConfig,
  },
}
