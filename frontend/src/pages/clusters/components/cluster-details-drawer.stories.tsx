import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { makeCluster } from '../../../../.storybook/fixtures'
import type { Cluster } from '../types'
import { ClusterDetailsDrawer } from './cluster-details-drawer'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

const connected = (overrides: Partial<Cluster> = {}): Cluster =>
  makeCluster({
    name: 'prod-us-east',
    cluster_url: 'https://k8s.prod-us-east.internal:6443',
    cluster_image_registry: {
      name: 'default-registry',
      spec: { backend_storage_size: '50Gi' },
      status: { state: 'ImageRegistryRunning' },
    },
    ...overrides,
  })

const meta = {
  title: 'Features/Clusters/ClusterDetailsDrawer',
  component: ClusterDetailsDrawer,
  args: {
    cluster: connected(),
    onOpenChange: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof ClusterDetailsDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const Connected: Story = {}

/**
 * **One idiom, top to bottom** — every fact is a label and its value on the 32
 * rung, one pitch all the way down.
 */
export const EveryFactIsARow: Story = {
  play: async () => {
    for (const label of ['Image registry', 'Registry size', 'API server', 'Cluster ID', 'Credentials']) {
      await expect(await drawer().findByText(label)).toBeInTheDocument()
    }
    await expect(drawer().getByText('Cluster ID').tagName).toBe('DT')
    const rows = [...document.querySelectorAll('dl > div')] as HTMLElement[]
    for (const row of rows) await expect(row.getBoundingClientRect().height).toBe(32)
    // Flush — one pitch, no groups.
    const tops = rows.map((r) => r.getBoundingClientRect().top)
    for (let i = 1; i < tops.length; i++) await expect(tops[i] - tops[i - 1]).toBe(32)
  },
}

/**
 * **There is no `Edit`.** A cluster is created and destroyed, never updated —
 * the API has no `PUT` — so the header carries the close alone and the drawer
 * has no footer to commit anything with.
 */
export const NoEditAndNoFooter: Story = {
  play: async () => {
    await expect(await drawer().findByText('prod-us-east')).toBeInTheDocument()
    await expect(drawer().queryByRole('button', { name: /edit/i })).toBeNull()
    await expect(document.querySelector('[data-slot="drawer-footer"]')).toBeNull()
  },
}

/**
 * **Deleting a cluster lands on everything running on it**, so the trigger is
 * the danger zone at the foot of the body — never a glyph on the band (§10).
 */
export const DeleteLivesInTheDangerZone: Story = {
  play: async ({ args }) => {
    const del = await drawer().findByRole('button', { name: /delete cluster/i })
    await expect(del.closest('[data-slot="drawer-header"]')).toBeNull()
    const zone = drawer().getByRole('heading', { name: /danger zone/i }).parentElement!
    await expect(zone).toContainElement(del)
    await expect(zone).toHaveTextContent(/stops running/i)
    await userEvent.click(del)
    await expect(args.onDelete).toHaveBeenCalled()
  },
}

/** **`Off` is an answer, not an absence.** A cluster built without the
 *  in-cluster registry is a decision someone made, and a row that vanished
 *  would read as "we could not tell you". */
export const RegistryOff: Story = {
  args: { cluster: connected({ cluster_image_registry: undefined }) },
  play: async () => {
    await expect(await drawer().findByText('Off')).toBeInTheDocument()
    // The size row closes up rather than showing a dash.
    await expect(drawer().queryByText('Registry size')).toBeNull()
  },
}

/** The registry's state is read from the API's own enum and coloured from it —
 *  the word and the colour come from one spelling of the fact. */
export const RegistryFailed: Story = {
  args: {
    cluster: connected({
      cluster_image_registry: {
        name: 'default-registry',
        spec: { backend_storage_size: '50Gi' },
        status: { state: 'ImageRegistryError' },
      },
    }),
  },
  play: async () => {
    const word = await drawer().findByText('Error')
    await expect(word).toHaveAttribute('data-status-variant', 'error')
  },
}

/** The platform cluster is the one Stackdome itself runs on, so its delete is
 *  refused — and says why, rather than sitting dead (§11). */
export const PlatformClusterCannotBeDeleted: Story = {
  args: { cluster: connected({ platform: true }) },
  play: async () => {
    const del = await drawer().findByRole('button', { name: /delete cluster/i })
    await expect(del).toBeDisabled()
    await userEvent.hover(del.parentElement!)
    await expect(await drawer().findAllByText(/Stackdome itself runs/i)).not.toHaveLength(0)
  },
}

/** Read-only removes the danger zone entirely — a block headed *Danger zone*
 *  with nothing in it you may press is a warning about nothing. */
export const ReadOnlyHasNoDangerZone: Story = {
  args: { canWrite: false },
  play: async () => {
    await expect(await drawer().findByText('Credentials')).toBeInTheDocument()
    await expect(drawer().queryByRole('heading', { name: /danger zone/i })).toBeNull()
  },
}

/** A long URL truncates inside its cell; the labels keep their column and
 *  `Copy` keeps its place. */
export const LongValues: Story = {
  args: {
    cluster: connected({
      id: 'cluster-01J9Z4XK7QW3B8N2M6P5R1T0YV-primary-multi-az',
      name: 'production-us-east-1-primary-multi-az-autoscaling-cluster',
      cluster_url:
        'https://k8s-production-us-east-1-primary-multi-az.control-plane.internal.example.com:6443',
    }),
  },
}
