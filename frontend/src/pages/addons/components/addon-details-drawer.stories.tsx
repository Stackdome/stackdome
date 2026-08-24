import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { makeAddon } from '../../../../.storybook/fixtures'
import type { PostgresAddon } from '@/api/addons'
import { AddonDetailsDrawer } from './addon-details-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const ready = (overrides: Partial<PostgresAddon> = {}): PostgresAddon =>
  makeAddon({
    spec: {
      version: { major: 16 },
      instances: { count: 2 },
      storage: { size: '20Gi' },
      backup: { enabled: true, schedule: '0 0 2 * * *', wal_archiving: true },
    },
    status: {
      state: 'Ready',
      connection_info: {
        host: 'orders-db-rw.acme.svc.cluster.local',
        port: 5432,
        databases: [{ name: 'app' }, { name: 'analytics' }],
      },
    },
    created_at: '2026-07-28T09:00:00Z',
    updated_at: '2026-08-11T14:00:00Z',
    ...overrides,
  } as Partial<PostgresAddon>)

const meta = {
  title: 'Features/Addons/AddonDetailsDrawer',
  component: AddonDetailsDrawer,
  args: {
    addon: ready(),
    onOpenChange: fn(),
    onEdit: fn(),
    onDelete: fn(),
    onOpenPage: fn(),
  },
} satisfies Meta<typeof AddonDetailsDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

/**
 * **Every action is on the header band, and none of them hides.** Same shape as
 * the preview drawer: the object's actions ride the header, the footer goes,
 * and a drawer that only reads an object stops spending 81px on a band with
 * nothing to commit.
 */
export const ActionsLiveInTheHeader: Story = {
  play: async () => {
    const edit = await drawer().findByRole('button', { name: /edit addon/i })
    await expect(edit.closest('[data-slot="drawer-header"]')).not.toBeNull()
    await expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull()
  },
}

/**
 * **Delete has a blast radius, so it is not a glyph on the band.** An act whose
 * cost lands on OTHER things gets the danger zone; an act with no dependents
 * stays where it is convenient — the preview drawer keeps its trash in the
 * header because a preview environment is regenerable and nothing references
 * it. This one destroys storage that cannot be rebuilt.
 */
export const DeleteLivesInTheDangerZone: Story = {
  play: async () => {
    const del = await drawer().findByRole('button', { name: /delete addon/i })
    await expect(del.closest('[data-slot="drawer-header"]')).toBeNull()
    const zone = drawer().getByRole('heading', { name: /danger zone/i }).parentElement!
    await expect(zone).toContainElement(del)
    await expect(zone).toHaveTextContent(/storage are destroyed/i)
  },
}

/** **One idiom, top to bottom** — every fact is a label and its value on the 32
 *  rung, in three groups separated by space. */
export const EveryFactIsARow: Story = {
  play: async () => {
    for (const label of ['Status', 'Host', 'Plan', 'Instances', 'Storage', 'Databases', 'Backups', 'Created', 'Updated']) {
      await expect(await drawer().findByText(label)).toBeInTheDocument()
    }
    await expect(drawer().getByText('Storage').tagName).toBe('DT')
    // The cron is read as words, not as five fields of asterisks.
    await expect(drawer().getByText(/at 02:00/i)).toBeInTheDocument()
  },
}

/**
 * **Two rows lead out and they name where they go.** Databases and backups are
 * subjects with their own lists on the addon's page; neither fits a 480 column,
 * and neither is a reason to make the whole drawer a doorway.
 */
export const DatabasesAndBackupsLeadToThePage: Story = {
  play: async ({ args }) => {
    await userEvent.click(await drawer().findByRole('button', { name: /databases: open orders-db/i }))
    await expect(args.onOpenPage).toHaveBeenCalled()
    await userEvent.click(drawer().getByRole('button', { name: /backups: open orders-db/i }))
    await expect(args.onOpenPage).toHaveBeenCalledTimes(2)
  },
}

/** **`Off` is an answer, not an absence.** A schedule someone switched off is a
 *  decision; a row that vanished would read as "we could not tell you". */
export const BackupsOff: Story = {
  args: {
    addon: ready({
      spec: {
        version: { major: 15 },
        instances: { count: 1 },
        storage: { size: '10Gi' },
        backup: { enabled: false, schedule: '0 0 2 * * *', wal_archiving: false },
      },
    } as Partial<PostgresAddon>),
  },
  play: async () => {
    await expect(await drawer().findByText('Off')).toBeInTheDocument()
  },
}

/** No host yet, so the row reports rather than sitting empty — at `fg-muted`,
 *  never the disabled `fg-ghost` tier. */
export const StillProvisioning: Story = {
  args: { addon: ready({ status: { state: 'Creating' } } as Partial<PostgresAddon>) },
  play: async () => {
    await expect(await drawer().findByText('provisioning…')).toBeInTheDocument()
    await expect(drawer().queryByRole('button', { name: /^copy$/i })).toBeNull()
  },
}

/** A failure keeps every detail it has **and says why** — the reason is the one
 *  fact on this drawer you cannot get from the list. */
export const Failed: Story = {
  args: {
    addon: ready({
      status: { state: 'Error', message: 'volume provisioning failed: no capacity in zone eu-west-1a' },
    } as Partial<PostgresAddon>),
  },
  play: async () => {
    await expect(await drawer().findByText('Reason')).toBeInTheDocument()
    await expect(drawer().getByText(/no capacity in zone/i)).toBeInTheDocument()
  },
}

/** Both header actions refuse while the addon is on its way out, and both say
 *  why. */
export const Deleting: Story = {
  args: { addon: ready({ status: { state: 'Deleting' } } as Partial<PostgresAddon>) },
  play: async () => {
    const edit = await drawer().findByRole('button', { name: /edit addon/i })
    await expect(edit).toBeDisabled()
    await expect(drawer().getByRole('button', { name: /delete addon/i })).toBeDisabled()
    await userEvent.hover(edit.parentElement!)
    await expect(await drawer().findAllByText(/being deleted/i)).not.toHaveLength(0)
  },
}

/** Read-only removes the danger zone entirely — a block headed *Danger zone*
 *  with nothing in it you may press is a warning about nothing. */
export const ReadOnlyHasNoDangerZone: Story = {
  args: { canWrite: false },
  play: async () => {
    await expect(drawer().queryByRole('heading', { name: /danger zone/i })).toBeNull()
  },
}

/** A long host truncates inside its cell; the labels keep their column and
 *  `Copy` keeps its place. */
export const LongValues: Story = {
  args: {
    addon: ready({
      name: 'orders-db-primary-replica-set-eu-west',
      status: {
        state: 'Ready',
        connection_info: {
          host: 'orders-db-primary-replica-set-eu-west-rw.platform-managed-databases.svc.cluster.local',
          port: 5432,
          databases: [{ name: 'app' }, { name: 'analytics' }, { name: 'reporting' }, { name: 'archive' }],
        },
      },
    } as Partial<PostgresAddon>),
  },
}

/** Read-only hides both object actions — and keeps the host and its `Copy`,
 *  because that is what a reviewer came for. */
export const ReadOnly: Story = {
  args: { canWrite: false },
  play: async () => {
    await expect(drawer().queryByRole('button', { name: /edit addon/i })).toBeNull()
    await expect(drawer().queryByRole('button', { name: /delete addon/i })).toBeNull()
    await expect(await drawer().findByRole('button', { name: /^copy$/i })).toBeInTheDocument()
  },
}
