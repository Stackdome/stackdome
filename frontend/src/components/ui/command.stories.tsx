import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Database, GitBranch, HardDrive, KeyRound, Server } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command'

/**
 * The searchable list — the material behind every picker in the product.
 *
 * **Its search box is `SearchField`, not a second one.** `CommandInput` lends
 * its element to the shared row (cmdk owns the input, because it tracks the
 * query, the active row and the arrow keys itself) while the ROW — the 40 band,
 * the glyph, the gap — comes from the one field the rest of the product uses.
 * That is the part that used to be drawn twice.
 */
const meta = {
  title: 'Primitives/Command',
  component: Command,
  tags: ['ai-generated'],
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

const PANEL = 'w-[360px] rounded-xl bg-popover outline outline-1 outline-border-subtle'

export const Default: Story = {
  render: () => (
    <Command className={PANEL}>
      <CommandInput placeholder="Search resources…" />
      <CommandList>
        <CommandEmpty>No resources match.</CommandEmpty>
        <CommandGroup heading="Services">
          <CommandItem>
            <Server />
            web
          </CommandItem>
          <CommandItem>
            <Server />
            worker
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Attachments">
          <CommandItem>
            <Database />
            postgres
          </CommandItem>
          <CommandItem>
            <HardDrive />
            web-data
          </CommandItem>
          <CommandItem>
            <KeyRound />
            api-token
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}

/**
 * **The magnifier lands on the rows' own column.** A Command list insets by 4
 * and its rows by 8, so a row glyph starts at 13 — the search glyph is nudged
 * to meet it. Held at `bare`'s 20 it floated 8px right of every icon under it.
 */
export const SearchGlyphMeetsTheRowGlyphs: Story = {
  render: () => (
    <Command className={PANEL}>
      <CommandInput placeholder="Search resources…" />
      <CommandList>
        <CommandGroup heading="Services">
          <CommandItem>
            <Server />
            web
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('[data-slot="command"]') as HTMLElement
    const [searchGlyph, rowGlyph] = Array.from(root.querySelectorAll('svg'))
    const left = (el: Element) => Math.round(el.getBoundingClientRect().left)
    await expect(left(searchGlyph)).toBe(left(rowGlyph))
  },
}

/** Typing narrows the list; nothing matching gets a sentence, not a blank box. */
export const NoResults: Story = {
  render: () => (
    <Command className={PANEL}>
      <CommandInput placeholder="Search resources…" />
      <CommandList>
        <CommandEmpty>No resources match.</CommandEmpty>
        <CommandGroup heading="Services">
          <CommandItem>web</CommandItem>
          <CommandItem>worker</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox'), 'zzzz')
    await waitFor(async () => {
      await expect(canvas.getByText('No resources match.')).toBeVisible()
    })
  },
}

/** A long list scrolls inside the panel rather than growing it off screen. */
export const LongList: Story = {
  render: () => (
    <Command className={PANEL}>
      <CommandInput placeholder="Search branches…" />
      <CommandList>
        <CommandEmpty>No branches match.</CommandEmpty>
        <CommandGroup heading="Branches">
          {Array.from({ length: 24 }, (_, i) => (
            <CommandItem key={i}>
              <GitBranch />
              {i === 0 ? 'main' : `feature/ticket-${1000 + i}`}
              {i === 0 && <CommandShortcut>default</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}
