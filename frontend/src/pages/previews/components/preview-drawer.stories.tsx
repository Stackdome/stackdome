import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { PreviewStack } from '@/api/preview-envs'
import { PreviewDrawer } from './preview-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const makeEnv = (overrides: Partial<PreviewStack> = {}): PreviewStack =>
  ({
    id: 'pe1',
    name: 'pr-128-web-storefront',
    pr_number: '128',
    branch: 'feat/checkout-redesign',
    commit: 'a3f9d2e4c1b7',
    source: 'webhook',
    stack_id: 'stk-1',
    status: {
      phase: 'Ready',
      outputs: { urls: [{ resource: 'web', url: 'https://pr-128.preview.acme.dev' }] },
    },
    created_at: '2026-08-16T09:00:00Z',
    updated_at: '2026-08-12T12:00:00Z',
    ...overrides,
  }) as PreviewStack

const meta = {
  title: 'Features/Previews/PreviewDrawer',
  component: PreviewDrawer,
  args: {
    env: makeEnv(),
    onOpenChange: fn(),
    onSync: fn(),
    onDelete: fn(),
    onOpenStack: fn(),
  },
} satisfies Meta<typeof PreviewDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

/**
 * **Every action is on the header band, and none of them hides.** The stack
 * detail page settled this shape: the object's actions ride the header, the
 * footer goes, and a drawer that only reads an object stops spending 81px on a
 * band with nothing to commit.
 */
export const ActionsLiveInTheHeader: Story = {
  play: async () => {
    const sync = await drawer().findByRole('button', { name: /^sync$/i })
    const del = drawer().getByRole('button', { name: /delete preview/i })
    const header = '[data-slot="drawer-header"]'
    await expect(sync.closest(header)).not.toBeNull()
    await expect(del.closest(header)).not.toBeNull()
    await expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull()
  },
}

/**
 * **The URL is the link.** A button called `Open` beside the URL it opens is
 * the same act twice, and it cost the value enough width to truncate the one
 * string the drawer exists to hand you. `Copy` is the only control left on the
 * row, and the scheme comes off — the same string the list row shows.
 */
export const TheUrlIsTheLink: Story = {
  play: async () => {
    const link = await drawer().findByRole('link', { name: /pr-128\.preview\.acme\.dev/i })
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('href', 'https://pr-128.preview.acme.dev')
    await expect(drawer().queryByRole('button', { name: /^open/i })).toBeNull()
    // Copy rides the same row as the value it copies.
    const copy = drawer().getByRole('button', { name: /^copy$/i })
    await expect(copy.closest('dd')).toContainElement(link)
  },
}

/**
 * **One idiom, top to bottom.** Every fact is a label and its value on the 32
 * rung — no stacked labels, no grey well, no sentence pretending to be a row.
 */
export const EveryFactIsARow: Story = {
  play: async () => {
    for (const label of ['Status', 'Preview URL', 'Branch', 'Commit', 'Stack', 'Created by', 'Created', 'Updated']) {
      await expect(await drawer().findByText(label)).toBeInTheDocument()
    }
    await expect(drawer().getByText('Branch').tagName).toBe('DT')
  },
}

/** There is no URL yet, so the row reports rather than sitting empty — and it
 *  reports at `fg-muted`, never the disabled `fg-ghost` tier. */
export const StillBuilding: Story = {
  args: { env: makeEnv({ status: { phase: 'Deploying' } } as Partial<PreviewStack>) },
  play: async () => {
    await expect(await drawer().findByText('building…')).toBeInTheDocument()
    await expect(drawer().queryByRole('button', { name: /^copy$/i })).toBeNull()
  },
}

/** Both header actions refuse while the environment is on its way out, and both
 *  say why. */
export const Deleting: Story = {
  args: { env: makeEnv({ status: { phase: 'Deleting' } } as Partial<PreviewStack>) },
  play: async () => {
    const sync = await drawer().findByRole('button', { name: /^sync$/i })
    await expect(sync).toBeDisabled()
    await expect(drawer().getByRole('button', { name: /delete preview/i })).toBeDisabled()
    await userEvent.hover(sync.parentElement!)
    await expect(await drawer().findAllByText(/being deleted/i)).not.toHaveLength(0)
  },
}

/**
 * A failure keeps every detail it has. The stack is still one click away — that
 * is where the logs are, and a failed preview is the case you most need them
 * for. **The stack row IS the way there**, rather than a sentence under the
 * list naming the same destination a second time.
 */
export const Failed: Story = {
  args: {
    env: makeEnv({
      status: { phase: 'Failed', reason: 'ImagePullBackOff', message: 'web: image pull failed' },
    } as Partial<PreviewStack>),
  },
  play: async ({ args }) => {
    const stack = await drawer().findByRole('button', { name: /pr-128-web-storefront/i })
    await userEvent.click(stack)
    await expect(args.onOpenStack).toHaveBeenCalled()
  },
}

/** An environment made by hand rather than by a webhook. */
export const CreatedByHand: Story = {
  args: { env: makeEnv({ source: 'manual' }) },
  play: async () => {
    await expect(await drawer().findByText('By hand')).toBeInTheDocument()
  },
}

/** A long branch and a long URL truncate inside their own cells; the drawer
 *  keeps its width and the labels keep their column. */
export const LongValues: Story = {
  args: {
    env: makeEnv({
      branch: 'feat/checkout-redesign-with-a-very-long-descriptive-branch-name',
      name: 'pr-128-web-storefront-preview-environment',
      status: {
        phase: 'Ready',
        outputs: {
          urls: [
            {
              resource: 'web',
              url: 'https://pr-128-feat-checkout-redesign.preview.internal.acme.dev',
            },
          ],
        },
      },
    } as Partial<PreviewStack>),
  },
}

/**
 * Read-only hides both object actions — **and keeps the URL and its `Copy`**,
 * because that is the whole point of the page for a reviewer.
 */
export const ReadOnly: Story = {
  args: { canWrite: false },
  play: async () => {
    await expect(drawer().queryByRole('button', { name: /^sync$/i })).toBeNull()
    await expect(drawer().queryByRole('button', { name: /delete preview/i })).toBeNull()
    await expect(await drawer().findByRole('link', { name: /pr-128/i })).toBeInTheDocument()
    await expect(drawer().getByRole('button', { name: /^copy$/i })).toBeInTheDocument()
  },
}
