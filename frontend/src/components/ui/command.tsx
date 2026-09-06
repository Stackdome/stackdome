import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/lib/utils"
import { SearchField } from "@/components/branded/search-field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        // **`rounded-[inherit]`, not a radius of its own.**
        //
        // It asserted `rounded-md` (8) while every surface it is mounted into
        // is `rounded-lg` (12) — `PopoverContent`, `SelectContent`,
        // `CommandDialog`. Because it also carries `overflow-hidden` AND an
        // opaque `bg-popover`, that smaller radius wins visually: the popover
        // paints its 12 corner, then the Command's 8-radius fill lands on top
        // and squares it off. The corner reads as clipped, which is exactly
        // what it is.
        //
        // A panel that fills its container should take the container's corner.
        // Inheriting is what keeps the two from having to be kept in sync — the
        // reason they drifted is that both wrote a number down.
        "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-[inherit]",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-10 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-10 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

/**
 * **The panel's own top, not a widget parked in it — and it is `SearchField`.**
 *
 * This was a second search box: its own wrapper at `h-10 px-3`, its own
 * `SearchIcon` at `opacity-50`, and a rounded transparent input carrying
 * `focus-ring-edge`. `Add resource` drew the same thing out of `SearchField`
 * in `bare` mode at `pl-5`, so two menus 200px apart had different insets, a
 * different glyph tier, and only one of them ringed.
 *
 * **The ring is the bug, and `bare` exists for exactly this reason.** Quoting
 * the variant's own note: *a search box that takes focus when its panel opens
 * and never gives it back — its ring would be lit from the first frame to the
 * last, which reports nothing, and its border would draw a second edge inside a
 * band that already ends in a hairline.*
 *
 * `SearchField` moved out of the create-stack folder to `branded/` to be
 * reachable from here. It was already being imported across three unrelated
 * features from a page path, so it was a shared component filed as a local one.
 */
function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="border-b border-border-subtle">
      <SearchField
        bare
        // cmdk owns the value; `SearchField`'s own props are the wrapper's.
        value={(props.value as string) ?? ""}
        onChange={(next: string) => props.onValueChange?.(next)}
        placeholder={props.placeholder ?? "Search…"}
        label={props.placeholder ?? "Search"}
        // **The glyph lands on the rows' own column.** `bare` insets to 20,
        // which is where `Add resource` needs it: that menu's list is `px-2`
        // and its rows carry 12, so a chip starts at 21. A Command menu insets
        // its list by 4 and its rows by 8, so a row glyph starts at 13 — and at
        // 20 the magnifier floated 8px right of every icon under it. Same rule
        // as there, different arithmetic, because the lists differ.
        className={cn("pl-3", className)}
        inputProps={{ autoComplete: "off" }}
        renderInput={(inputCls: string, injected: React.ComponentProps<"input">) => {
          // The row hands back what it would have applied. `value` is dropped:
          // cmdk owns the query and its own `value` is a plain string, while an
          // `<input>`'s is widened to include numbers.
          const { value: _ignored, ...rest } = injected;
          return (
            <CommandPrimitive.Input
              {...rest}
              {...props}
              data-slot="command-input"
              className={inputCls}
            />
          );
        }}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        // **4 of inset, which the row already assumed.** `CommandItem` draws
        // `rounded-md` on the reasoning that the menu is 12 and the group is
        // inset 4, so 12 − 4 = 8 — and the list had no padding at all, so the
        // rows ran flush to the menu's edge and a rounded row sat in a rounded
        // box with its corners touching. It is the same 4 the `Add resource`
        // menu spends and the same 4 the board draws (272 rows in a 280 menu).
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto p-1",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-body"
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        // **No `p-1` here — the LIST owns the panel\'s inset.**
        //
        // Both carried it, so a row sat 8 inside the menu while the list it
        // scrolls in was inset 4, and a menu with no group at all indented its
        // rows differently from one with. One inset, on the element that is
        // always there.
        "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-meta [&_[cmdk-group-heading]]:font-medium",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        // **The highlight is the hover WASH, not `--accent`.**
        //
        // `bg-accent` is an un-converted shadcn ground — an opaque `#F0EEE9`
        // that sits a full rung below `--wash-hover` and skips the ladder's
        // dark correction entirely, so a command row lit up darker than every
        // other hovered row in the product and landed a different distance in
        // each theme. §3 keeps grounds and washes apart, and this is a wash:
        // it says "the keyboard is here", the same thing a pointer says
        // everywhere else.
        //
        // **The ink does not change with it.** `text-accent-foreground` moved
        // the row's colour as well as its ground, which is the selection
        // mechanic (§7) — and a row you have merely arrowed onto is not chosen.
        // What is chosen is reported by the row's own tick or checkbox.
        // **`>svg`, not `svg`. The row tints its OWN glyph, not everything
        // inside it.**
        //
        // As a descendant selector it reached through into any control the row
        // happened to hold — measured, a `Checkbox` in a command row rendered
        // its tick at `fg-muted` on a near-black box, because the row's icon
        // colour beat the checkbox's own `text-primary-foreground`. A leading
        // glyph belongs to the row; a control's internals belong to the control.
        //
        // **`rounded-md`, not `sm`.** Two numbers agree on 8 and the row was
        // drawing 6: §2 makes radius a function of HEIGHT and this row is 32,
        // and concentricity puts it at 12 (the menu) minus 4 (the group's
        // inset) = 8. `DropdownMenuItem` was already at 8, so a command menu
        // and a dropdown menu 200px apart had different corners.
        "data-[selected=true]:bg-[var(--wash-hover)] [&>svg:not([class*='text-'])]:text-fg-muted relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-body outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-meta tracking-widest",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
