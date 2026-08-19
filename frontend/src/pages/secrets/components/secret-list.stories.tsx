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
  args: { onEdit: fn(), onDelete: fn() },
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
  play: async ({ canvas }) => {
    // Two actions, so both are ON the row — the same Edit and Delete the
    // Object stores list has always shown inline (§11). A kebab that only ever
    // opens two items spends a click to hide what fits.
    const edit = canvas.getAllByRole('button', { name: /^Edit / })[0]
    const del = canvas.getAllByRole('button', { name: /^Delete / })[0]
    await expect(canvas.queryByRole('button', { name: /^Actions for / })).toBeNull()

    // One control height (rubric #9): both read from the Button `icon-sm`,
    // never a hand-set h-8/w-8 override.
    for (const b of [edit, del]) {
      await expect(b.className).toContain('size-7')
      await expect(b.className).not.toMatch(/\bh-8\b/)
      await expect(b.className).toContain('focus-ring')
    }
    // Side by side on one row, in the 64px track the pair needs.
    await expect(edit.getBoundingClientRect().top).toBe(del.getBoundingClientRect().top)
  },
}

export const ReadOnly: Story = {
  args: {
    secrets: [makeSecret()],
    canWrite: () => false,
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
