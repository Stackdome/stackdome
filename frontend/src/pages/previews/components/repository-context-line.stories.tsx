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
  args: { config, activeCount: 3 },
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
 * The name in ink at `title/500`, the machine string beside it in muted mono.
 * This is the only thing on the screen naming the selection — the sheet title
 * stays `Previews` whatever the rail is showing (§12a).
 */
export const UnderTheCap: Story = {
  play: async ({ canvas }) => {
    const count = canvas.getByText('3 of 5 active')
    await expect(count.className).toContain('tabular-nums')
    await expect(count.className).toContain('text-fg-muted')
  },
}

/**
 * At the cap the number turns `state/warn` — and that is the whole change.
 * **No meter.** `5 of 5 active` is exact; a 44×4 bar beside it says the same
 * thing approximately, which is §7's *a number said in words gets no second
 * picture*. The bar was drawn on the board, judged live, and removed.
 */
export const AtTheCap: Story = {
  args: { activeCount: 5 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('5 of 5 active').className).toContain('text-warn')
  },
}

/** The banner is what carries the consequence — the next pull request silently
 *  gets nothing — and it sits above the list because it is about the list. */
export const AtTheCapWithItsBanner: Story = {
  args: { activeCount: 5 },
  render: (args) => (
    <div className="flex flex-col gap-4">
      <RepositoryContextLine {...args} />
      <AlertBanner tone="blocking">
        This repository is at its limit of 5 environments. New pull requests will not get one
        until you delete an environment, or raise the limit in its settings.
      </AlertBanner>
    </div>
  ),
}

/** A long repository path truncates; the count keeps its place on the right. */
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

/** No cap set: the right-hand slot goes empty rather than saying "unlimited",
 *  which is a fact about the config and not about this repository's day. */
export const NoCap: Story = {
  args: { config: { ...config, max_active_previews: undefined } as StackPreviewConfig },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/active$/)).toBeNull()
  },
}
