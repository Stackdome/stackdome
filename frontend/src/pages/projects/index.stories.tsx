import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import { http, HttpResponse } from 'msw'
import { makeProject } from '../../../.storybook/fixtures'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import ProjectsPage from './index'

const PROJECTS_PATH = '/api/v1/organizations/:orgId/projects'

const threeProjects = [
  makeProject({ id: 'p1', name: 'default', default_project: true, created_at: '2026-06-01T09:00:00Z' }),
  makeProject({ id: 'p2', name: 'platform', default_project: false, created_at: '2026-06-15T09:00:00Z' }),
  makeProject({ id: 'p3', name: 'growth', default_project: false, created_at: '2026-07-02T09:00:00Z' }),
]

const meta = {
  title: 'Pages/Projects',
  component: ProjectsPage,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProjectsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  parameters: {
    msw: [
      http.get(PROJECTS_PATH, () => HttpResponse.json({ items: threeProjects, total: threeProjects.length })),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('platform')).toBeInTheDocument()
      await expect(canvas.getByText('growth')).toBeInTheDocument()
    })

    // **No row menu, and no track for one.** The kebab held `Manage members`,
    // `Rename` and `Delete`; the row opens the project's drawer and all three
    // are in the open. Three header cells, not four.
    await expect(canvas.queryByRole('button', { name: /project actions/i })).toBeNull()
    await expect(canvasElement.querySelectorAll('thead th')).toHaveLength(3)

    await userEvent.click(canvas.getByRole('link', { name: 'platform project' }))
    const drawer = within(canvasElement.ownerDocument.body)
    await expect(await drawer.findByLabelText(/^name/i)).toHaveValue('platform')
    // Delete is in the danger zone at the foot, never a menu item.
    const del = drawer.getByRole('button', { name: /delete project/i })
    await expect(drawer.getByRole('heading', { name: /danger zone/i }).parentElement)
      .toContainElement(del)
  },
}

/**
 * **The default project refuses both acts and says why** (§11). It cannot be
 * renamed and it cannot be deleted, so the controls are blocked rather than
 * hidden — a drawer that appears to offer nothing and explains nothing is
 * worse than one that refuses out loud.
 */
export const DefaultProjectRefusesAndSaysWhy: Story = {
  parameters: {
    msw: [
      http.get(PROJECTS_PATH, () => HttpResponse.json({ items: threeProjects, total: threeProjects.length })),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(await canvas.findByRole('link', { name: 'default project' }))
    const drawer = within(canvasElement.ownerDocument.body)

    await expect(await drawer.findByLabelText(/^name/i)).toBeDisabled()
    const del = drawer.getByRole('button', { name: /delete project/i })
    await expect(del).toBeDisabled()
    await userEvent.hover(del.parentElement!)
    await expect(await drawer.findAllByText(/default project/i)).not.toHaveLength(0)
  },
}

// Every project is the org default — the "create your first project" empty
// state renders alongside the single-row table, not in place of it.
export const OnlyDefault: Story = {
  parameters: {
    msw: [
      http.get(PROJECTS_PATH, () =>
        HttpResponse.json({ items: [threeProjects[0]], total: 1 }),
      ),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No additional projects')).toBeInTheDocument()
  },
}

export const Loading: Story = {
  parameters: {
    msw: [
      http.get(PROJECTS_PATH, () => new Promise(() => {})),
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
      http.get(PROJECTS_PATH, () => HttpResponse.json({ message: 'organization service unreachable' }, { status: 500 })),
      ...baselineHandlers,
    ],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Couldn't load projects")).toBeInTheDocument()
    await expect(await canvas.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  },
}

export const LongName: Story = {
  parameters: {
    msw: [
      http.get(PROJECTS_PATH, () =>
        HttpResponse.json({
          items: [
            threeProjects[0],
            makeProject({
              id: 'p2',
              name: 'an-extremely-long-project-name-that-should-truncate-in-the-table-cell',
              default_project: false,
            }),
          ],
          total: 2,
        }),
      ),
      ...baselineHandlers,
    ],
  },
}
