import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { AlertBanner } from '@/components/branded'
import type { StackPreviewConfig } from '@/api/preview-configs'
import { RepositoryContextLine } from './repository-context-line'

const config = {
  id: 'c1',
  name: 'web-storefront',
  git_repository: { repo_url: 'https://github.com/acme/web-storefront.git', base_branch: 'main' },
  max_active_previews: 5,
} as StackPreviewConfig

const meta = {
  title: 'Features/Previews/RepositoryContextLine',
  component: RepositoryContextLine,
  args: { config },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="bg-card p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RepositoryContextLine>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The name in ink at `title/500`, the machine string beside it in muted mono,
 * **and nothing else.** This is the only thing on the screen naming the
 * selection — the sheet title stays `Previews` whatever the rail is showing
 * (§12a).
 */
export const NamesTheSelection: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'web-storefront' })).toBeInTheDocument()
    await expect(canvas.getByText(/github\.com\/acme\/web-storefront/)).toBeInTheDocument()
    // The cap used to sit on the right of this band. It reports on the one day
    // it matters, in the banner, which also says what to do about it.
    await expect(canvas.queryByText(/active$/)).toBeNull()
  },
}

/**
 * **The cap is the banner's job, and only on the day it binds.** The headline
 * is the state you can act on from across the page; the line under it is the
 * consequence nobody would guess — the next pull request silently gets nothing.
 */
export const AtTheCapWithItsBanner: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <RepositoryContextLine {...args} />
      <AlertBanner tone="blocking" title="At the limit of 5 environments">
        New pull requests will not get one until you delete an environment, or raise the limit in
        its settings.
      </AlertBanner>
    </div>
  ),
  play: async ({ canvas }) => {
    const title = canvas.getByText('At the limit of 5 environments')
    await expect(title.className).toContain('font-medium')
    const detail = canvas.getByText(/new pull requests will not get one/i)
    await expect(detail.className).toContain('text-fg-muted')
  },
}

/** A long repository path truncates rather than widening the band. */
export const LongRepositoryPath: Story = {
  args: {
    config: {
      ...config,
      name: 'platform-internal-tooling',
      git_repository: {
        repo_url: 'https://git.internal.acme.dev/platform/tooling/developer-experience-console.git',
        base_branch: 'release/2026-08',
      },
    } as StackPreviewConfig,
  },
}
