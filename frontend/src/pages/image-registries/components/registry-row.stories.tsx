import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { RegistryRow } from './registry-row'
import type { RegistryCredential } from '@/api/registry-credentials'

function makeCredential(overrides: Partial<RegistryCredential> = {}): RegistryCredential {
  return {
    id: 'r1',
    host: 'index.docker.io',
    purpose: 'both',
    username: 'acme-bot',
    created_at: '2026-06-01T10:00:00Z',
    ...overrides,
  }
}

const meta = {
  title: 'Features/ImageRegistries/RegistryRow',
  component: RegistryRow,
  tags: ['ai-generated'],
  args: { onOpen: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-[820px] divide-y divide-border rounded-md border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RegistryRow>

export default meta
type Story = StoryObj<typeof meta>

export const DockerHub: Story = {
  args: { credential: makeCredential() },
  play: async ({ canvas, args }) => {
    // **The row carries no menu.** It held three acts on one object — verify,
    // rotate, remove — behind a click that had to happen before you could see
    // any of them. They are all on the registry's drawer now: verify on the
    // band, the login in the body, remove in the danger zone.
    await expect(canvas.queryByRole('button', { name: /^Actions for / })).toBeNull()
    await expect(canvas.queryByRole('button')).toBeNull()

    // The row IS the way in, and it says what it opens.
    const row = canvas.getByRole('link')
    await expect(row).toHaveAccessibleName('Docker Hub registry')
    row.click()
    await expect(args.onOpen).toHaveBeenCalled()
    // Three tracks: the 32px kebab slot went with the kebab.
    await expect(getComputedStyle(row).gridTemplateColumns.split(' ')).toHaveLength(3)
  },
}

export const Ghcr: Story = {
  args: { credential: makeCredential({ id: 'r2', host: 'ghcr.io', purpose: 'pull' }) },
}

export const CustomHostLongName: Story = {
  args: {
    credential: makeCredential({
      id: 'r3',
      host: 'registry.internal.production.acme-platform.example.com',
      purpose: 'push',
      username: 'ci-deploy-service-account-bot',
    }),
  },
}
