import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import type { PreviewStack } from '@/api/preview-envs'
import { PreviewListHeader, PreviewListSkeleton, PreviewRow } from './preview-row'

const makeEnv = (overrides: Partial<PreviewStack> = {}): PreviewStack =>
  ({
    id: 'pe1',
    pr_number: '128',
    branch: 'feat/checkout-redesign',
    stack_id: 's9',
    status: {
      phase: 'Ready',
      outputs: { urls: [{ resource: 'web', url: 'https://pr-128.preview.acme.dev' }] },
    },
    updated_at: '2026-08-12T12:00:00Z',
    ...overrides,
  }) as PreviewStack

/** The row never renders alone in the product — it sits under its own column
 *  headers on the sheet, and the header is what makes the tracks legible. */
function Sheet({
  showRepository = false,
  children,
}: {
  showRepository?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-card p-4">
      <PreviewListHeader showRepository={showRepository} />
      {children}
    </div>
  )
}

const meta = {
  title: 'Features/Previews/PreviewRow',
  component: PreviewRow,
  args: {
    env: makeEnv(),
    showRepository: false,
    onOpen: fn(),
    onSync: fn(),
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    // `bare` is for the skeleton, which draws its own headers — two header rows
    // in one story would be a shape the product cannot reach.
    (Story, ctx) =>
      ctx.parameters.bare ? (
        <div className="bg-card p-4">
          <Story />
        </div>
      ) : (
        <Sheet showRepository={ctx.args.showRepository}>
          <Story />
        </Sheet>
      ),
  ],
} satisfies Meta<typeof PreviewRow>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

/**
 * The URL column reports rather than withholding: `building…` while there is
 * nothing to open yet. It is `fg-muted` and never `fg-ghost` — ghost is the
 * disabled tier and measured **1.95:1** on the sheet, and this is live text.
 */
export const Deploying: Story = {
  args: { env: makeEnv({ status: { phase: 'Deploying' } } as Partial<PreviewStack>) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('building…')).toBeInTheDocument()
  },
}

/** A failed environment has no URL, and `no URL` says so. `—` withholds the
 *  answer in a column where the row above it is giving one. */
export const Failed: Story = {
  args: { env: makeEnv({ status: { phase: 'Failed' } } as Partial<PreviewStack>) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('no URL')).toBeInTheDocument()
  },
}

/** The row's one action refuses while the environment is on its way out, and it
 *  says why — §11 binds a disabled row action exactly as it binds a primary. */
export const Deleting: Story = {
  args: { env: makeEnv({ status: { phase: 'Deleting' } } as Partial<PreviewStack>) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('tearing down…')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: /sync pr #128/i })).toBeDisabled()
    // Delete is not here to refuse — it lives in the drawer this row opens.
    await expect(canvas.queryByRole('button', { name: /delete pr #128/i })).toBeNull()
  },
}

/**
 * The actions are mounted at rest and hidden by **opacity**, so each keeps its
 * tab stop and the row does not reflow when the pointer arrives. The reveal is
 * `DataListActions`' — it answers `focus-within` on the ROW, which is the tab
 * stop a hand-rolled copy on the Stacks list cost keyboard users.
 */
export const ActionsRevealOnRowFocus: Story = {
  play: async ({ canvas, userEvent }) => {
    const actions = canvas.getByRole('button', { name: /sync pr #128/i }).closest(
      '[data-slot="data-list-actions"]',
    ) as HTMLElement
    await expect(actions.className).toContain('group-focus-within/row:opacity-100')

    // Tabbing into the row — not onto the button — is what reveals them.
    await userEvent.tab()
    await expect(canvas.getByRole('link', { name: /pr #128 preview/i })).toHaveFocus()
  },
}

/** A branch name that runs past its column truncates rather than pushing the
 *  URL out of its track. */
export const LongBranchName: Story = {
  args: {
    env: makeEnv({
      branch: 'feat/checkout-redesign-with-a-very-long-descriptive-branch-name',
    }),
  },
}

/**
 * On *All previews* the Repository column appears and Preview drops 280 → 240.
 * Status and Updated land on the same x in both shapes, so changing the rail
 * selection does not slide the two columns you were reading.
 */
export const WithRepositoryColumn: Story = {
  args: { showRepository: true, repositoryName: 'web-storefront' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('web-storefront')).toBeInTheDocument()
    await expect(canvas.getByText('Repository')).toBeInTheDocument()
  },
}

/** Read-only hides every control. The URL stays — it is the whole point of the
 *  page for a reviewer. */
export const ReadOnly: Story = {
  args: { canWrite: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: /sync pr #128/i })).toBeNull()
    await expect(canvas.getByText('pr-128.preview.acme.dev')).toBeInTheDocument()
  },
}

export const Skeleton: Story = {
  parameters: { bare: true },
  render: () => <PreviewListSkeleton showRepository={false} />,
}
