import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { SecretList } from './secret-list'
import type { Secret } from '../types'

function makeSecret(overrides: Partial<Secret> = {}): Secret {
  return {
    id: 's1',
    name: 'stripe-api-key',
    description: 'Live Stripe secret key',
    type: 'Token',
    data: [],
    created_at: '2026-06-01T10:00:00Z',
    ...overrides,
  }
}

const meta = {
  title: 'Features/Secrets/SecretList',
  component: SecretList,
  tags: ['ai-generated'],
  args: { onOpen: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-[820px] rounded-md border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SecretList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    secrets: [
      makeSecret(),
      makeSecret({ id: 's2', name: 'db-password', type: 'UsernamePassword', description: '' }),
      makeSecret({ id: 's3', name: 'deploy-key', type: 'SSHKey' }),
    ],
  },
  play: async ({ canvas, args }) => {
    // **No actions on the row.** `Edit` was what the row now does, and `Delete`
    // takes every stack that reads the secret with it — §10 puts an act with
    // dependents in the danger zone on the object, not under a pointer on a row
    // someone was scanning.
    await expect(canvas.queryByRole('button', { name: /^Edit / })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /^Delete / })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /^Actions for / })).toBeNull()

    // The row IS the way in, and it says what it opens.
    const row = canvas.getAllByRole('link')[0]
    await expect(row).toHaveAccessibleName('stripe-api-key secret')
    row.click()
    await expect(args.onOpen).toHaveBeenCalled()
    // Three tracks: the 64px action slot went with the actions.
    await expect(getComputedStyle(row).gridTemplateColumns.split(' ')).toHaveLength(3)
  },
}

export const ReadOnly: Story = {
  args: {
    secrets: [makeSecret()],
  },
}

export const LongNameAndDescription: Story = {
  args: {
    secrets: [
      makeSecret({
        id: 's4',
        name: 'production-payment-gateway-webhook-signing-secret-rotated',
        description:
          'Used to verify inbound webhook signatures from the payment processor across every environment',
      }),
    ],
  },
}

export const Empty: Story = {
  args: { secrets: [] },
}
