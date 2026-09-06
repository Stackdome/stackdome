import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { baselineHandlers } from '../../../../.storybook/msw-handlers'
import { objectStoreProviderSchema } from '../schemas/form-schema'
import { ObjectStoreFormDrawer } from './object-store-form-drawer'
import type { ObjectStore } from '../types'

/** The drawer is portalled to the body, so `canvas` cannot see it. */
const drawer = () => within(document.body)

/**
 * Two Generic secrets with keys inside them — which is the only kind the
 * credential picker offers. Without `data` the second select has nothing to
 * list, which is exactly the state the preview fixtures were in.
 */
const secrets = [
  {
    id: 'sec-aws',
    name: 'aws-backup',
    type: 'Generic',
    data: [
      { key: 'accessKeyId', value: '' },
      { key: 'secretAccessKey', value: '' },
    ],
  },
  { id: 'sec-azure', name: 'azure-archive', type: 'Generic', data: [{ key: 'connectionString', value: '' }] },
  // A non-Generic secret, to prove the picker filters rather than listing everything.
  { id: 'sec-1', name: 'STRIPE_API_KEY', type: 'Token', data: [] },
]

const handlers = [
  http.get('*/organizations/:orgId/secrets', () =>
    HttpResponse.json({ items: secrets, total: secrets.length }),
  ),
  ...baselineHandlers,
]

const s3Store = {
  id: 'os-1',
  name: 'backups',
  project_id: 'proj-1',
  spec: {
    destination_path: 's3://acme-backups/postgres',
    retention_policy: '30d',
    configuration: {
      s3_credentials: {
        region: 'eu-west-1',
        access_key_id: { secret_id: 'sec-aws', key: 'accessKeyId' },
        secret_access_key: { secret_id: 'sec-aws', key: 'secretAccessKey' },
      },
    },
  },
} as ObjectStore

const meta = {
  title: 'Features/Object stores/ObjectStoreFormDrawer',
  component: ObjectStoreFormDrawer,
  args: {
    open: true,
    onOpenChange: fn(),
    onSaved: fn(),
    editing: null,
  },
  parameters: { msw: { handlers } },
} satisfies Meta<typeof ObjectStoreFormDrawer>

export default meta
type Story = StoryObj<typeof meta>

/**
 * How it opens. The primary is blocked and **says what is missing** — all of it
 * at once, rather than one round of press-and-discover per field.
 */
export const New: Story = {
  play: async () => {
    const create = await drawer().findByRole('button', { name: /create object store/i })
    await expect(create).toBeDisabled()

    // `All`, not one: Radix renders tooltip content twice — the visible copy
    // and a visually-hidden one for screen readers.
    await userEvent.hover(create.parentElement!)
    await expect(await drawer().findAllByText(/enter a name/i)).not.toHaveLength(0)
    await expect(drawer().getAllByText(/enter a destination path/i)).not.toHaveLength(0)
    await expect(drawer().getAllByText(/pick the secret holding the access key id/i)).not.toHaveLength(0)
  },
}

/**
 * **Every provider the schema knows is offered.** The list used to be three
 * literal `TabsTrigger`s beside the enum, which is the second copy that let the
 * secret `Type` select ship three of six kinds. A fourth provider cannot land
 * without appearing here.
 */
export const EveryProviderIsOffered: Story = {
  play: async () => {
    await userEvent.click(await drawer().findByLabelText(/^provider/i))
    const options = await drawer().findAllByRole('option')
    await expect(options).toHaveLength(objectStoreProviderSchema.options.length)
    await expect(options.map((o) => o.textContent)).toEqual([
      'S3 or S3-compatible',
      'Azure Blob Storage',
      'Google Cloud Storage',
    ])
  },
}

/**
 * The provider rewrites the fields under it. Azure asks two questions where S3
 * asks four, and the S3 fields must be **gone**, not merely hidden behind a tab.
 */
export const AzureRewritesTheForm: Story = {
  play: async () => {
    await expect(await drawer().findByLabelText(/^region/i)).toBeInTheDocument()

    await userEvent.click(await drawer().findByLabelText(/^provider/i))
    await userEvent.click(await drawer().findByRole('option', { name: /azure/i }))

    await expect(await drawer().findByLabelText(/storage account name/i)).toBeInTheDocument()
    await expect(drawer().queryByLabelText(/^region/i)).toBeNull()
    await expect(drawer().queryByLabelText(/endpoint url/i)).toBeNull()
  },
}

/**
 * **Every control fills its field.** The credential picker used to sit outside
 * `FieldShell`, so its selects kept `w-fit` and came out 188 and 123 in a 710
 * column — three trailing edges on one form. Asserted as a *gap*: the two
 * selects share a row, and the row's right edge is the form's.
 */
export const ControlsShareTwoTrailingEdges: Story = {
  play: async () => {
    const secret = await drawer().findByLabelText(/access key id: secret/i)
    const key = await drawer().findByLabelText(/access key id: key/i)
    const name = await drawer().findByLabelText(/^name/i)

    const [rs, rk, rn] = [secret, key, name].map((el) => el.getBoundingClientRect())

    // Two boxes on one row…
    await expect(Math.round(rs.top)).toBe(Math.round(rk.top))
    // …16 apart, which is the ladder's default and `FieldGrid`'s gutter.
    await expect(Math.round(rk.left - rs.right)).toBe(16)
    // …and the pair ends where every other field ends.
    await expect(Math.round(rk.right)).toBe(Math.round(rn.right))
  },
}

/**
 * Editing an S3 store opens on its values. **The name is a value, not a
 * disabled box** — a disabled input dims to its own placeholder's tone, so a
 * filled one reads as empty.
 */
export const EditingAnS3Store: Story = {
  args: { editing: s3Store },
  play: async () => {
    await expect(await drawer().findByDisplayValue('s3://acme-backups/postgres')).toBeInTheDocument()
    await expect(await drawer().findByDisplayValue('eu-west-1')).toBeInTheDocument()
    // The name is rendered, and it is not a form control.
    await expect(drawer().queryByLabelText(/^name/i)).toBeNull()
    await expect(await drawer().findByText('backups')).toBeInTheDocument()
    await expect(await drawer().findByRole('button', { name: /save changes/i })).toBeEnabled()
  },
}

/**
 * **A store whose credentials this screen cannot read.** The banner used to say
 * *"Editing Azure and GCS stores isn't supported yet. Delete this store and
 * create it again."* — false (this form reads both), and §10 does not let a
 * banner instruct someone to destroy a backup destination. It also blanked the
 * whole form, so a readable name, path and retention showed nothing at all.
 */
export const CredentialsThisScreenCannotRead: Story = {
  args: {
    editing: {
      id: 'os-9',
      name: 'legacy-store',
      project_id: 'proj-1',
      spec: { destination_path: 's3://legacy/pg', retention_policy: '7d', configuration: {} },
    } as ObjectStore,
  },
  play: async () => {
    await expect(await drawer().findByText(/cannot read/i)).toBeInTheDocument()
    await expect(drawer().queryByText(/delete this store/i)).toBeNull()
    // The readable half is still on screen.
    await expect(await drawer().findByText('legacy-store')).toBeInTheDocument()
    await expect(await drawer().findByDisplayValue('s3://legacy/pg')).toBeInTheDocument()
    await expect(await drawer().findByRole('button', { name: /save changes/i })).toBeDisabled()
  },
}

/**
 * No Generic secrets at all. **Empty is not disabled** — the picker says how to
 * get options instead of greying itself out and leaving the user to guess.
 */
export const NoGenericSecretsYet: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/organizations/:orgId/secrets', () => HttpResponse.json({ items: [], total: 0 })),
        ...baselineHandlers,
      ],
    },
  },
  play: async () => {
    await expect(
      await drawer().findAllByText(/no generic secrets yet/i),
    ).not.toHaveLength(0)
  },
}
