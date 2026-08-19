import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'
import type { PreviewStack } from '@/api/preview-envs'
import { PreviewEnvCard } from './preview-env-card'

const makeEnv = (overrides: Partial<PreviewStack> = {}): PreviewStack =>
  ({
    id: 'pe1',
    pr_number: 128,
    stack_id: 's9',
    status: {
      phase: 'Ready',
      outputs: { urls: [{ resource: 'web', url: 'https://pr-128.preview.example.com' }] },
    },
    updated_at: '2026-07-30T12:00:00Z',
    ...overrides,
  }) as PreviewStack

const meta = {
  title: 'Features/StackCard/PreviewEnvCard',
  component: PreviewEnvCard,
  tags: ['ai-generated'],
  args: { env: makeEnv(), onSync: fn(), onDelete: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-[380px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PreviewEnvCard>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {
  play: async ({ canvas }) => {
    // Hover/focus stay ink, never brand orange (rubric #3, #8) — mirrors the
    // fix on the sibling DeployStackCard (stack-card.tsx).
    const card = await canvas.findByRole('link', { name: /pr #128/i })
    await expect(card.className).not.toContain('ring-brand')
    await expect(card.className).not.toContain('outline-none')
    await expect(card.className).toMatch(/(?:^|\s)focus-ring(?:-edge|-inset)?(?:\s|$)/)

    const title = await canvas.findByText('PR #128')
    await expect(title.className).not.toContain('text-brand')
  },
}

export const Deploying: Story = {
  args: { env: makeEnv({ status: { phase: 'Deploying' } } as Partial<PreviewStack>) },
}

export const Failed: Story = {
  args: { env: makeEnv({ status: { phase: 'Failed' } } as Partial<PreviewStack>) },
}

/**
 * Every kebab action is blocked while the environment is being torn down —
 * and each one says so. A menu cannot carry a tooltip (§"Disabled"), so the
 * reason is a second line inside the item, at full contrast while the label
 * takes the dim.
 */
export const DeletingBlocksTheMenu: Story = {
  args: { env: makeEnv({ status: { phase: 'Deleting' } } as Partial<PreviewStack>) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /actions for pr #128/i }))

    // Anchored at the start: the reason joins the accessible name, so a loose
    // /delete/i would match "Sync — Being deleted" too.
    const body = within(document.body)
    const sync = await body.findByRole('menuitem', { name: /^Sync/ })
    const del = await body.findByRole('menuitem', { name: /^Delete/ })

    await expect(sync).toHaveAttribute('aria-disabled', 'true')
    await expect(del).toHaveAttribute('aria-disabled', 'true')
    await expect(sync).toHaveTextContent('Being deleted')
    await expect(del).toHaveTextContent('Being deleted')
  },
}
