import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, List, ListFilter, Plus, Search } from 'lucide-react'
import { baselineHandlers } from '../../../.storybook/msw-handlers'
import { withConfirm, withCurrentUser, withStack } from '../../../.storybook/decorators'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'

/* The frame on its own — sidebar, seam and sheet header, with no page inside.
 *
 * The shell is the one thing every screen inherits, so it gets judged without a
 * page arguing for attention: the two planes, the brand-to-title centreline,
 * the group rhythm, and the header in both of its heights. `Shell/Platform`
 * covers the same frame with a real page in it. */

/** The decorator mounts a MemoryRouter at `/`; hop to a named path so the
 *  breadcrumb has a segment to title itself with (§12a — no Home crumb). */
function useRoute(path: string) {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    navigate(path, { replace: true })
    setReady(true)
  }, [navigate, path])
  return ready
}

/** Portals into the header's conditional second row, the way a page does. */
function Toolbar() {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => setSlot(document.getElementById('sheet-toolbar')), [])
  if (!slot) return null
  // Search and the filters travel together on the left — they narrow the same
  // set, so they read as one control. The view toggle is a different question
  // ("how do I want to look at this?") and sits alone at the far right.
  return createPortal(
    <>
      <div className="flex items-center gap-1.5">
        <div className="relative w-[300px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
          <Input placeholder="Filter stacks…" className="pl-8" />
        </div>
        <Button variant="outline" shape="flat">
          <ListFilter />
          Status: All
        </Button>
        <Button variant="outline" shape="flat">
          Sort: Recently updated
        </Button>
      </div>
      <div className="ml-auto">
        <SegmentedControl
          aria-label="View"
          value="list"
          onValueChange={() => {}}
          options={[
            { value: 'list', label: 'List', icon: <List /> },
            { value: 'cards', label: 'Cards', icon: <LayoutGrid /> },
          ]}
        />
      </div>
    </>,
    slot,
  )
}

function Shell({
  path = '/stacks',
  toolbar = false,
  action = false,
  defaultSidebarOpen = true,
}: {
  path?: string
  toolbar?: boolean
  action?: boolean
  defaultSidebarOpen?: boolean
}) {
  const ready = useRoute(path)
  if (!ready) return null
  return (
    <AppLayout defaultSidebarOpen={defaultSidebarOpen}>
      {toolbar && <Toolbar />}
      {action && <HeaderAction />}
    </AppLayout>
  )
}

/** The page's primary, in the title row's right slot. */
function HeaderAction() {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => setSlot(document.getElementById('topnav-actions')), [])
  if (!slot) return null
  return createPortal(
    <Button>
      <Plus />
      New stack
    </Button>,
    slot,
  )
}

const meta = {
  title: 'Shell/Shell',
  component: Shell,
  decorators: [withConfirm, withCurrentUser, withStack],
  parameters: {
    layout: 'fullscreen',
    msw: baselineHandlers,
  },
} satisfies Meta<typeof Shell>

export default meta
type Story = StoryObj<typeof meta>

/** 56px header — the title row alone. Most screens look like this. */
export const TitleRowOnly: Story = {
  args: { action: true },
}

/** 100px header — the toolbar row appears when the section brings tools. */
export const WithToolbar: Story = {
  args: { action: true, toolbar: true },
}

/** Nothing to count and nothing to do: an empty right side is correct (§12a). */
export const BareHeader: Story = {
  args: { path: '/secrets' },
}

/** The 56px rail. Labels go, tooltips take over, the seam stays put. */
export const SidebarCollapsed: Story = {
  args: { action: true, defaultSidebarOpen: false },
}

/** A nested route: the trail appears, and only then. */
export const Nested: Story = {
  args: { path: '/addons/postgres/pg-1' },
}

/**
 * **`/stacks/new` keeps the page padding, because the drawer is not a page.**
 *
 * The shell strips its 16px inset for full-bleed routes — the canvas editor,
 * which draws to the sheet's own edges. `/stacks/new` was in that list because
 * the New stack journey used to be a full PAGE with a full-bleed strip of five
 * tabs. It is a drawer now, so the route renders the ordinary stacks LIST with
 * a drawer over it, and the exception was stripping the list's inset instead.
 *
 * The symptom was the page behind the drawer jumping 16 left and 16 up the
 * moment it opened. The rule had outlived the screen it was written for.
 */
export const NewStackKeepsThePagePadding: Story = {
  args: { path: '/stacks/new', action: true },
  play: async () => {
    // The SLOT, not `.px-4` — the sheet header uses the same utilities, so a
    // class selector matches it first and the assertion passes for the wrong
    // element.
    const content = await waitFor(() => {
      const el = document.querySelector('[data-slot="page-content"]')
      if (!el) throw new Error('page content not found')
      return el
    })
    await expect(getComputedStyle(content).padding).toBe('16px')
  },
}

/** The canvas IS full bleed — it draws to the sheet's own edges and pins its
 *  own footer, so the same slot carries no inset at all. */
export const TheCanvasIsStillFullBleed: Story = {
  args: { path: '/stacks/draft' },
  play: async () => {
    const content = await waitFor(() => {
      const el = document.querySelector('[data-slot="page-content"]')
      if (!el) throw new Error('page content not found')
      return el
    })
    await expect(getComputedStyle(content).padding).toBe('0px')
  },
}
