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
 * **The URL's actions live inside its well.** A grey well is for reference
 * (§3), and this is the reference the whole page exists to hand you — so `Copy`
 * and `Open ↗` sit on the thing they act on rather than somewhere under it. The
 * trailing ↗ is what says the second one leaves for another tab.
 */
export const CopyAndOpenAreInsideTheWell: Story = {
  play: async () => {
    const copy = await drawer().findByRole('button', { name: /^copy$/i })
    const open = drawer().getByRole('link', { name: /open/i })
    const well = copy.closest('.bg-control')
    await expect(well).toContainElement(open)
    await expect(well).toHaveTextContent('https://pr-128.preview.acme.dev')
    await expect(open).toHaveAttribute('target', '_blank')
  },
}

/** There is no URL yet, so the well reports rather than sitting empty — and it
 *  reports at `fg-muted`, never the disabled `fg-ghost` tier. */
export const StillBuilding: Story = {
  args: { env: makeEnv({ status: { phase: 'Deploying' } } as Partial<PreviewStack>) },
  play: async () => {
    await expect(await drawer().findByText('building…')).toBeInTheDocument()
    await expect(drawer().queryByRole('button', { name: /^copy$/i })).toBeNull()
  },
}

/** Both footer actions refuse while the environment is on its way out, and both
 *  say why. */
export const Deleting: Story = {
  args: { env: makeEnv({ status: { phase: 'Deleting' } } as Partial<PreviewStack>) },
  play: async () => {
    const sync = await drawer().findByRole('button', { name: /^sync$/i })
    await expect(sync).toBeDisabled()
    await expect(drawer().getByRole('button', { name: /^delete$/i })).toBeDisabled()
    await userEvent.hover(sync.parentElement!)
    await expect(await drawer().findAllByText(/being deleted/i)).not.toHaveLength(0)
  },
}

/** A failure keeps every detail it has. The stack is still one click away —
 *  that is where the logs are, and a failed preview is the case you most need
 *  them for. */
export const Failed: Story = {
  args: {
    env: makeEnv({
      status: { phase: 'Failed', reason: 'ImagePullBackOff', message: 'web: image pull failed' },
    } as Partial<PreviewStack>),
  },
  play: async () => {
    await expect(
      await drawer().findByRole('button', { name: /open the stack/i }),
    ).toBeInTheDocument()
  },
}

/** An environment made by hand rather than by a webhook. */
export const CreatedByHand: Story = {
  args: { env: makeEnv({ source: 'manual' }) },
  play: async () => {
    await expect(await drawer().findByText('By hand')).toBeInTheDocument()
  },
}

/** A long branch and a long URL truncate inside their own boxes; the drawer
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
 * Read-only hides every control — **and keeps the URL**, because that is the
 * whole point of the page for a reviewer.
 */
export const ReadOnly: Story = {
  args: { canWrite: false },
  play: async () => {
    await expect(drawer().queryByRole('button', { name: /^sync$/i })).toBeNull()
    await expect(drawer().queryByRole('button', { name: /^delete$/i })).toBeNull()
    await expect(await drawer().findByRole('link', { name: /open/i })).toBeInTheDocument()
  },
}
