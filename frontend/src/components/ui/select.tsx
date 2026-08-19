import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

// Same ladder as Button and Input — §2 makes radius a function of HEIGHT, so a
// 28px select takes 6px and a 32px select takes 8px. The trigger previously ran
// a single `rounded-md` across both heights, which put a 28px select in a
// toolbar with corners 2px rounder than the 28px button beside it.
//
// The inset matches the Button/Input base for the same height (10 / 12 / 15).
const selectTriggerVariants = cva(
  // **A select is a raised card** (board `Select` 21:204, `Shape=flat`): the sheet
  // ground, the hairline, and `elevation/sm`. It used to sit on `--control` and
  // answer hover with `control-hover`, the way a `secondary` Button does — a
  // face changing its fill. It now reads as a small surface standing on the
  // page, and hover lifts the LINE instead of the fill.
  //
  // The MATERIAL is the same in both shapes; `shape` only chooses the corner,
  // exactly as it does on Button and Input. A pill and a flat select standing
  // in one toolbar are the same object with a different radius, not two
  // materials.
  //
  // `open` keeps the stronger line: the trigger stays engaged for as long as
  // the menu is out. Not the press inset — you are not still pushing it.
  "[outline-width:1px] [outline-style:solid] [outline-color:var(--border)] data-[placeholder]:text-fg-muted [&_svg:not([class*='text-'])]:text-fg-2 aria-invalid:[outline-color:var(--danger)] bg-card shadow-sm flex w-fit items-center justify-between gap-1.5 py-0 text-body font-medium whitespace-nowrap transition-[color,box-shadow,background-color,border-color] hover:[outline-color:var(--border-strong)] data-[state=open]:[outline-color:var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:[outline-color:var(--border)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 focus-ring-edge",
  {
    variants: {
      // **8 and 8 at 32px, like every other control.** The board's Select node
      // still reads `pl-[12px] pr-[8px]`; the flat 8 supersedes it, so that one
      // rung of the board needs updating. `sm` and `lg` keep the old inset —
      // only the 32px rung is unified.
      size: {
        sm: "h-7 px-2.5",
        default: "h-8 px-2",
        lg: "h-10 px-[15px]",
      },
      shape: {
        pill: "rounded-full",
        flat: "",
      },
    },
    // §2 — radius is a function of HEIGHT: 28/6 · 32/8 · 40/12.
    compoundVariants: [
      { shape: "flat", size: "sm", class: "rounded-sm" },        // 28px
      { shape: "flat", size: "default", class: "rounded-md" },   // 32px
      { shape: "flat", size: "lg", class: "rounded-lg" },        // 40px
    ],
    defaultVariants: {
      size: "default",
      shape: "flat",
    },
  }
)

function SelectTrigger({
  className,
  size = "default",
  shape = "flat",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> &
  VariantProps<typeof selectTriggerVariants>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      data-shape={shape}
      className={cn(selectTriggerVariants({ size, shape, className }))}
      {...props}
    >
      {children}
      {/* **Chevrons up-down, not a single chevron down.** The two glyphs make
          different promises: one chevron pointing down says *this reveals what
          is underneath it* — a disclosure, an accordion, a section that opens in
          place. A pair says *this CYCLES between values*, which is what a select
          does, and it is why the same mark already sits on the account switcher.
          A control that opens a listbox and a control that unfolds a paragraph
          must not wear the same glyph. (Settled by Jaseem, August 2026.)

          `SelectScrollDownButton` keeps its single chevron: that one really is
          pointing at content below it. */}
      <SelectPrimitive.Icon asChild>
        <ChevronsUpDownIcon className="size-3.5" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border shadow-lg",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-meta", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  reason,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & {
  /**
   * Why this option cannot be chosen, shown as a second line while it is
   * disabled. It sits OUTSIDE `ItemText` on purpose — `ItemText` is what the
   * closed trigger echoes, so a reason inside it would print on the trigger
   * once some other option was picked.
   */
  reason?: React.ReactNode
}) {
  const explained = Boolean(reason) && Boolean(props.disabled)

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default rounded-md py-1.5 pr-8 pl-2 text-body outline-hidden select-none data-[disabled]:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // The dim moves onto the label when there is a reason, so the reason
        // itself stays readable. See DropdownMenuItem for the same mechanic.
        explained
          ? "flex-col items-start gap-0.5"
          : "items-center gap-2 data-[disabled]:opacity-50 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      {explained ? (
        <>
          <SelectPrimitive.ItemText>
            <span className="flex items-center gap-2 opacity-50">{children}</span>
          </SelectPrimitive.ItemText>
          <span className="text-meta text-fg-muted leading-rel">{reason}</span>
        </>
      ) : (
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      )}
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
