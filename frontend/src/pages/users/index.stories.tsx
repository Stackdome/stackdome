import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { makeUser, makeOrgInvite, makeProject } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { withConfirm, withSheetHeader } from '../../../.storybook/decorators'
import UsersPage from './index'

const USERS_PATH = '/api/v1/organizations/:orgId/users'
const INVITES_PATH = '/api/v1/organizations/:orgId/invites'
const PROJECTS_PATH = '/api/v1/organizations/:orgId/projects'

const twoProjects = [
  makeProject({ id: 'p1', name: 'default', default_project: true }),
  makeProject({ id: 'p2', name: 'platform', default_project: false }),
]

const admin = makeUser({
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'OrgAdmin',
  projects: [{ project_name: 'default', role: 'Developer', default_project: true }],
})
const member = makeUser({
  id: 'u2',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  role: 'OrgMember',
  projects: [
    { project_name: 'default', role: 'Developer', default_project: true },
    { project_name: 'platform', role: 'Viewer', default_project: false },
  ],
})

const pendingInvite = makeOrgInvite({
  id: 'inv-1',
  email: 'newhire@example.com',
  project_name: 'platform',
  role: 'Developer',
  invited_by: 'ada@example.com',
})

function withUsersAndInvites(users: ReturnType<typeof makeUser>[], invites: ReturnType<typeof makeOrgInvite>[]) {
  return [
    http.get(USERS_PATH, () => HttpResponse.json({ items: users, total: users.length })),
    http.get(INVITES_PATH, () => HttpResponse.json({ items: invites, total: invites.length })),
    http.get(PROJECTS_PATH, () => HttpResponse.json({ items: twoProjects, total: twoProjects.length })),
    ...baselineHandlers,
  ]
}

const meta = {
  title: 'Pages/Users',
  component: UsersPage,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
  decorators: [withConfirm, withSheetHeader],
} satisfies Meta<typeof UsersPage>

export default meta
type Story = StoryObj<typeof meta>

/** Mixed active (admin + member) and pending rows — org-role and "invited"
 *  state both render through the shared Badge primitive, never an ad hoc
 *  brand-orange or hand-rolled chip (rubric #3/#4). */
export const Populated: Story = {
  parameters: { msw: withUsersAndInvites([admin, member], [pendingInvite]) },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('Ada Lovelace')).toBeInTheDocument()
      await expect(canvas.getByText('Grace Hopper')).toBeInTheDocument()
      await expect(canvas.getByText('newhire@example.com')).toBeInTheDocument()
    })

    // Org-role badges read through the Badge primitive (no brand-orange span).
    const adminBadge = canvas.getByText('OrgAdmin')
    await expect(adminBadge.className).not.toContain('text-brand')
    await expect(adminBadge.closest('[data-slot="badge"]')).toBeTruthy()

    // "invited" state uses Badge variant="warning" — hue reports real state.
    const invitedBadge = canvas.getByText('invited')
    await expect(invitedBadge.closest('[data-slot="badge"]')).toBeTruthy()

    // Default-project indicator is ink-neutral, not brand orange.
    const defaultTags = canvas.getAllByText('default', { exact: false })
    for (const tag of defaultTags) {
      await expect(tag.className).not.toContain('text-brand')
    }

    // **No row kebabs, and no track for them.** Four header cells, not five.
    await expect(canvas.queryByRole('button', { name: /user actions/i })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /invite actions/i })).toBeNull()
    await expect(canvasElement.querySelectorAll('thead th')).toHaveLength(4)

    // The row opens the member's drawer.
    await userEvent.click(canvas.getByRole('link', { name: 'Ada Lovelace member' }))
    const drawer = within(canvasElement.ownerDocument.body)
    await expect(await drawer.findByText('Organisation role')).toBeInTheDocument()
  },
}

/**
 * **Demoting used to be a form built inside a dropdown** — two selects and a
 * Confirm/Cancel pair, 200px wide, that closed if the pointer wandered. It is a
 * form now, and the two fields it needs appear WITH the decision that needs
 * them rather than sitting greyed out beside it.
 */
export const DemotingAsksWhereTheyLand: Story = {
  parameters: { msw: withUsersAndInvites([admin, member], [pendingInvite]) },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole('link', { name: 'Ada Lovelace member' }))
    const drawer = within(canvasElement.ownerDocument.body)

    // Nothing to save yet — and the refusal says so, in the verb of the act.
    const save = await drawer.findByRole('button', { name: /save role/i })
    await expect(save).toBeDisabled()
    await expect(drawer.queryByText('Project role')).toBeNull()

    await userEvent.click(drawer.getByRole('combobox'))
    await userEvent.click(await drawer.findByRole('option', { name: 'Org member' }))

    await expect(await drawer.findByText('Project role')).toBeInTheDocument()
    await userEvent.hover(drawer.getByRole('button', { name: /save role/i }).parentElement!)
    await expect(await drawer.findAllByText(/Pick the project/i)).not.toHaveLength(0)
  },
}

/**
 * **A pending invite has no settings**, so it takes the preview drawer's shape:
 * the two acts ride the header, the body is a flat list, and there is no footer
 * because there is nothing to commit. §10 puts *revoke a pending invite* on the
 * "no danger zone" side — nothing references it and `Invite user` makes another.
 */
export const PendingInviteIsAReading: Story = {
  parameters: { msw: withUsersAndInvites([admin], [pendingInvite]) },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole('link', { name: 'newhire@example.com invite' }))
    const drawer = within(canvasElement.ownerDocument.body)

    const revoke = await drawer.findByRole('button', { name: /revoke invite/i })
    await expect(revoke.closest('[data-slot="drawer-header"]')).not.toBeNull()
    await expect(drawer.getByRole('button', { name: /resend invite/i })).toBeInTheDocument()
    await expect(canvasElement.ownerDocument.querySelector('[data-slot="drawer-footer"]')).toBeNull()
    await expect(drawer.queryByRole('heading', { name: /danger zone/i })).toBeNull()
    await expect(await drawer.findByText('Invited by')).toBeInTheDocument()
  },
}

export const Loading: Story = {
  parameters: {
    msw: [
      http.get(USERS_PATH, () => new Promise(() => {})),
      http.get(INVITES_PATH, () => new Promise(() => {})),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  },
}

export const ErrorState: Story = {
  parameters: {
    msw: [
      http.get(USERS_PATH, () => HttpResponse.json({ reason: 'organization service unreachable' }, { status: 500 })),
      http.get(INVITES_PATH, () => HttpResponse.json({ items: [] })),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Couldn't load users")).toBeInTheDocument()
    await expect(await canvas.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  },
}

export const Empty: Story = {
  parameters: { msw: withUsersAndInvites([], []) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No users yet')).toBeInTheDocument()
    // Header action + empty-state action both render "Invite user".
    await expect(canvas.getAllByRole('button', { name: /invite user/i }).length).toBe(2)
  },
}

/** Filters that match nothing still show the toolbar (rubric: flat, no
 *  full-page empty state when rows exist but are filtered out). */
export const NoSearchMatch: Story = {
  parameters: { msw: withUsersAndInvites([admin, member], [pendingInvite]) },
  play: async ({ canvas, userEvent }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('Ada Lovelace')).toBeInTheDocument()
    })
    await userEvent.type(canvas.getByPlaceholderText(/search by name or email/i), 'nobody-matches-this')
    await expect(await canvas.findByText('No users match these filters')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: /clear filters/i }))
    await expect(await canvas.findByText('Ada Lovelace')).toBeInTheDocument()
  },
}

/** Long name/email truncates in the row instead of wrapping or overflowing. */
export const LongNameOverflow: Story = {
  parameters: {
    msw: withUsersAndInvites(
      [
        makeUser({
          id: 'u3',
          name: 'Bartholomew Alexander Featherstonehaugh-Worthington',
          email: 'bartholomew.alexander.featherstonehaugh-worthington@an-extremely-long-corporate-domain-example.com',
          role: 'OrgMember',
          projects: [{ project_name: 'default', role: 'Developer', default_project: true }],
        }),
      ],
      [],
    ),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Bartholomew/)).toBeInTheDocument()
  },
}

/** §7 and §7a on this page, asserted rather than described.
 *
 *  - The table is not boxed: a border around the whole thing is the card
 *    mistake at a larger scale.
 *  - There is no kebab at all any more: the row is the control, so its track,
 *    its header cell and its skeleton cell went with it.
 *  - `Developer`, `Viewer` and `default` are words, so they are not mono. Mono
 *    means a machine produced this and a machine will read it back.
 */
export const ListContract: Story = {
  parameters: { msw: withUsersAndInvites([admin, member], [pendingInvite]) },
  play: async ({ canvas, canvasElement }) => {
    // Wait for real rows: the loading skeleton renders a <table> too, so
    // findByRole('table') resolves before any user has arrived.
    await canvas.findByText('Ada Lovelace')
    const table = canvas.getByRole('table')

    // Nothing between the table and the sheet draws a box around it.
    for (let el = table.parentElement; el && el !== document.body; el = el.parentElement) {
      const style = getComputedStyle(el)
      await expect(parseFloat(style.borderTopWidth)).toBe(0)
      await expect(style.boxShadow).toBe('none')
    }

    // No row actions at all — the row IS the control, so there is nothing to
    // reveal on hover and no track holding it.
    await expect(canvasElement.querySelector('[data-slot="table-row-actions"]')).toBeNull()

    // Roles and project names are words, not machine strings.
    for (const word of ['Developer', 'Viewer']) {
      for (const el of canvas.queryAllByText(word)) {
        await expect(getComputedStyle(el).fontFamily).not.toMatch(/mono/i)
      }
    }
  },
}

/** §7 — headers are sentence case. No `text-transform` is faking it back. */
export const HeadersAreSentenceCase: Story = {
  parameters: { msw: withUsersAndInvites([admin], []) },
  play: async ({ canvas }) => {
    await canvas.findByText('Ada Lovelace')
    const header = canvas.getByRole('columnheader', { name: 'Org role' })
    await expect(getComputedStyle(header).textTransform).toBe('none')
    await expect(header.textContent).toBe('Org role')
  },
}
