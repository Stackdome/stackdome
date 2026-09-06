import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { ArrowUpRight, Copy, GitBranch, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuChevron,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { Button } from './button'

/**
 * The menu — the product's row-level and toolbar-level action list.
 *
 * It had **no story at all** while being one of the most-revamped primitives on
 * the branch, so the only way to see the current menu was to find a feature that
 * happened to open one. Everything below is the menu itself, not a screen that
 * contains one.
 */
const meta = {
  title: 'Primitives/DropdownMenu',
  component: DropdownMenu,
  tags: ['ai-generated'],
} satisfies Meta<typeof DropdownMenu>

export default meta
type Story = StoryObj<typeof meta>

/** Radix portals the panel out of the canvas, so the play functions read the
 *  document body rather than the story's own root. */
const body = () => within(document.body)

/**
 * The ordinary shape: a group of acts, a rule, and the destructive one alone
 * beneath it. **Destructive last and separated** — a menu that mixes "rename"
 * and "delete" in one run is a menu you can misfire.
 */
export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Pencil />
            Rename
            <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ArrowUpRight />
            Open in a new tab
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Actions' }))
    await waitFor(async () => {
      await expect(body().getByRole('menuitem', { name: /Delete/ })).toBeVisible()
    })
  },
}

/**
 * **A menu floats at `lg`, like every other menu** (§5).
 *
 * It shipped at `shadow-md` — the small-overlay rung — while `Popover`, the
 * select panel and this component's own submenu were all at `lg`. A submenu
 * therefore cast a deeper shadow than the menu that opened it, which is the
 * stacking order drawn backwards.
 */
export const SubmenuMatchesItsParent: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Deploy</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem>Deploy latest</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <GitBranch />
            Deploy a branch
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {['main', 'staging', 'fix/token-refresh'].map((b) => (
              <DropdownMenuItem key={b}>{b}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Deploy' }))
    const panel = await waitFor(() => body().getByRole('menu'))
    const sub = await waitFor(() => body().getByRole('menuitem', { name: /Deploy a branch/ }))
    await userEvent.hover(sub)
    await waitFor(async () => {
      const panels = body().getAllByRole('menu')
      await expect(panels.length).toBe(2)
      // The submenu floats above its parent, so it may not sit BELOW it on the
      // shadow ladder. One rung, both panels.
      const [a, b] = panels.map((p) => getComputedStyle(p).boxShadow)
      await expect(a).toBe(b)
    })
    await expect(panel).toBeVisible()
  },
}

/**
 * The filter face. `DropdownMenuChevron` is the mark that tells a button it
 * opens a menu rather than performing an act — the product's toolbar filters
 * all wear it, and they are `outline` + `shape="flat"` because a filter is a
 * working control and never a pill.
 */
export const AFilterButton: Story = {
  render: function Render() {
    const [status, setStatus] = useState('all')
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" shape="flat">
            <span className="text-fg-2">Status:</span> <span className="capitalize">{status}</span>
            <DropdownMenuChevron />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
            {['all', 'running', 'failed', 'stopped'].map((s) => (
              <DropdownMenuRadioItem key={s} value={s} className="capitalize">
                {s}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button'))
    const failed = await waitFor(() => body().getByRole('menuitemradio', { name: 'failed' }))
    await userEvent.click(failed)
    await waitFor(async () => {
      await expect(canvas.getByRole('button')).toHaveTextContent('failed')
    })
  },
}

/** Columns and toggles — the checked mark sits in its own 8px gutter, so the
 *  labels stay on one column whether they are ticked or not. */
export const CheckboxItems: Story = {
  render: function Render() {
    const [cols, setCols] = useState<Record<string, boolean>>({
      Status: true,
      Cluster: true,
      'Last deploy': false,
    })
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" shape="flat">
            Columns
            <DropdownMenuChevron />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Show columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(cols).map(([name, on]) => (
            <DropdownMenuCheckboxItem
              key={name}
              checked={on}
              onCheckedChange={(v) => setCols((c) => ({ ...c, [name]: Boolean(v) }))}
            >
              {name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Columns/ }))
    await waitFor(async () => {
      await expect(body().getByRole('menuitemcheckbox', { name: 'Status' })).toBeChecked()
      await expect(body().getByRole('menuitemcheckbox', { name: 'Last deploy' })).not.toBeChecked()
    })
  },
}

/**
 * **Nothing is disabled without saying why.** A menu item you cannot use keeps
 * its place in the list — removing it would make the menu change shape between
 * two states of one object — and the reason travels with it rather than being
 * something you have to go and find.
 */
export const DisabledItemsSayWhy: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuItem disabled>Roll back — no previous release</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled>
          Delete — remove the domain first
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Actions' }))
    await waitFor(async () => {
      const item = body().getByRole('menuitem', { name: /Roll back/ })
      await expect(item).toHaveAttribute('data-disabled')
    })
  },
}

/** Long labels wrap inside a bounded panel rather than stretching the menu
 *  across the screen. */
export const LongLabels: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem>
          Promote orders-gateway-staging-eu-west-1 to production
        </DropdownMenuItem>
        <DropdownMenuItem>Copy the deployment webhook URL to the clipboard</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
