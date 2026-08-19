import * as React from "react"
import { Check, Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * One thing you can pick out of a list — a repository, a ready-made app, a
 * building block, a managed add-on, or an item already in the stack.
 *
 * **It is a row, not a card.** §11: no box, no shadow, no rule between rows.
 * What separates one row from the next is space and the hover wash, and what
 * marks the chosen one is the selection wash plus a single blue tick — one
 * colour, said once (§7).
 *
 * **Two sizes, one object.** 56 is the catalogue rung; 40 is the same row made
 * dense for the "In this stack" panel, where the name is a resource instance
 * and therefore machine-set (§6). They are not two components.
 *
 * The trailing slot takes whatever the list needs — a tick, a count, a plus, a
 * remove. The five pieces the board draws are exported below so a call site
 * composes them rather than hand-rolling a copy (§2).
 */
export function PickerRow({
  size = 56,
  icon,
  name,
  meta,
  endText,
  selected,
  trailing,
  reason,
  blockedByRegion,
  onClick,
  className,
  ...props
}: {
  /** 56 is the catalogue rung; 40 is the dense "In this stack" rung. */
  size?: 56 | 40
  icon: React.ReactNode
  name: string
  /** Dot-separated parts under the name. `mono` for machine values (§6). */
  meta?: { text: string; mono?: boolean }[]
  /** Right-aligned reading matter — "12 services". Sits before `trailing`. */
  endText?: string
  /**
   * Omit entirely for a row that *acts* — a block you add. Pass a boolean and
   * the row becomes an option, which means its list must be a `listbox`; use
   * `PickerList`.
   */
  selected?: boolean
  trailing?: React.ReactNode
  /**
   * Why this row cannot be picked. **Passing it is what disables the row** —
   * there is no separate `disabled` flag, because a row that is off without a
   * reason is the dead end §9 bans, and two props let you build one.
   *
   * It renders as the row's own second line, replacing `meta`. §9 is explicit
   * that an item inside a listbox explains itself **inline**: a tooltip in here
   * fights the list's focus and dismissal, and a focusable wrapper breaks
   * arrow-key navigation and typeahead. The row has the room; it uses it.
   */
  reason?: string
  /**
   * Off, with the reason carried by the **region** rather than the row (§9's
   * third shape). The one case `reason` cannot serve: rows that are all off
   * together for one cause, where a sentence per row rebuilds the wall the
   * rule exists to prevent.
   *
   * It is not a second disabled state — it renders identically to `reason`,
   * minus the second line. The call site owes the region an explanation and an
   * `aria-describedby` pointing at it; `PickerList` takes `describedBy` for
   * exactly that.
   */
  blockedByRegion?: boolean
  className?: string
} & Omit<React.ComponentPropsWithoutRef<"button">, "children">) {
  const dense = size === 40
  const blocked = Boolean(reason) || Boolean(blockedByRegion)
  // A row blocked by its region is still an option — it lives in a `listbox`,
  // and a listbox with non-option children is not a listbox. It is simply an
  // option that is off, which is `aria-disabled` on `aria-selected="false"`.
  const option = selected !== undefined || Boolean(blockedByRegion)

  // A row you can click is a button. A row whose only target is the control at
  // its end — "In this stack", with its remove — is not: a button cannot hold
  // another button, and nesting them is what breaks both for the keyboard.
  const Element = (onClick ? "button" : "div") as React.ElementType

  return (
    <Element
      type={onClick ? "button" : undefined}
      onClick={blocked ? undefined : onClick}
      // The native attribute is what blocks the click; `pointer-events-none`
      // is wrong because the row must still receive the pointer for the
      // not-allowed cursor to show (§9).
      disabled={blocked && onClick ? true : undefined}
      aria-disabled={blocked ? true : undefined}
      role={option ? "option" : undefined}
      aria-selected={option ? Boolean(selected) : undefined}
      className={cn(
        // `lg` (12), not `md` (8). **Both rungs, both densities** — the row's
        // radius reports what KIND of thing it is, and a 40 row and a 56 row
        // are the same kind. It does not scale with height.
        //
        // The chip inside keeps its own rung (8 at 56, 6 at 40), so the pair is
        // deliberately NOT concentric: strict concentricity would put the row
        // at 20 and turn a list item into a pill.
        "group/row flex w-full items-center rounded-lg text-left transition-colors",
        onClick && "focus-ring-edge",
        // Not-allowed, and no hover. **The dimming is done in the ink ladder,
        // not in alpha** — see the name and meta tiers below.
        //
        // It was `opacity-50` on the whole row, and measured that put the name
        // at 3.40:1 and the meta at 2.29:1 on white. WCAG exempts a disabled
        // *control*, and a row carrying its reason inline is one — but the
        // words on it are the entire point of showing it at all, and §7 gives
        // no tier a discount. A tier drop reads as "off" and stays readable;
        // an alpha drop reads as "off" and stops being text.
        blocked && "cursor-not-allowed",
        // 4px, not the 5 the prototype used: its two lines were ~15px each and
        // ours are the scale's 16, so 4 is what lands the rung on exactly 40.
        dense ? "min-h-10 gap-[9px] px-2 py-1" : "min-h-14 gap-3 px-3 py-2",
        // Branched, never stacked as `hover:` variants — a selected row being
        // hovered matches both and which wins is not predictable (§4).
        blocked
          ? ""
          : selected
            ? "bg-[var(--wash-selected)] hover:bg-[var(--wash-selected-hover)]"
            : "hover:bg-[var(--wash-hover)]",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "border-border bg-control text-fg-2 flex flex-none items-center justify-center border",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0",
          "transition-[background-color,box-shadow]",
          // **The chip lifts with the row.** At rest it is `--control`, a
          // RECESSED fill — the tile is one element among several on a shared
          // ground. Live, it returns to the sheet and takes `elevation/sm`, so
          // it reads as raised out of the wash that just landed around it.
          //
          // The wash darkens the row and the chip brightens against it: the two
          // move in OPPOSITE directions, which is what makes 4% legible at all.
          // A chip that washed along with its row would keep the same relative
          // value and the state would have to be carried by the row's edges
          // alone.
          //
          // Branched, never stacked as `hover:` on top of the selected case —
          // a selected row being hovered matches both and which wins is not
          // predictable (§4). Same rule the row's own wash follows.
          //
          // **The lift is "go to the lightest surface", not "go to the sheet".**
          // The two are the same sentence in light and opposites in dark, where
          // the ladder inverts: light runs control #F7F6F3 < sheet #FFFFFF, and
          // dark runs sheet #1E1D1B < control #232220 < control-hover #292826.
          //
          // Taking the sheet literally in dark measured the chip going DARKER
          // on hover (#232220 → #1E1D1B) while its row went lighter — the chip
          // sank into a row that rose, which is the state backwards. Dark takes
          // the rung above `--control` instead, so both themes read as one
          // move: the row washes, the chip steps up off it.
          //
          // A BLOCKED row does not lift at all. The affordance would be the one
          // thing left on it making a promise — and the glyph is the one part
          // that may go to alpha, because it reports nothing a reader decodes.
          blocked
            ? "opacity-50"
            : selected
              ? "bg-popover dark:bg-control-hover shadow-sm"
              : "group-hover/row:bg-popover dark:group-hover/row:bg-control-hover group-hover/row:shadow-sm",
          dense
            ? "size-6 rounded-sm [&_svg]:size-3.5"
            : "size-8 rounded-md [&_svg]:size-4",
        )}
      >
        {icon}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate",
            // One tier down when the row is off — the drop IS the dim (§7).
            blocked ? "text-fg-2" : "text-foreground",
            // The dense rung names a resource instance — `postgres-2` is a
            // value a machine produced and will read back (§6).
            //
            // **The 56 rung is `body/500` (13/20), not `name/500` (14/20).**
            // 14 is the shell's rung — a breadcrumb's current page, a stack's
            // title on the canvas — and a row in a catalogue is not the
            // sequel to those. It is one of forty things you are scanning, and
            // at 14 over a 12 meta the pair opened a two-step gap that read as
            // a heading with a caption. 13 over 12 is one step, which is what a
            // name over its own detail should be. Board `234:1953`.
            dense ? "text-meta font-mono" : "text-body font-medium",
          )}
        >
          {name}
        </span>
        {/* The reason takes the second line INSTEAD of the meta. Showing both
            would make a blocked row taller than its neighbours and bury the one
            sentence that matters under a version string. */}
        {reason ? (
          <span className={cn("truncate", dense ? "text-label text-fg-2" : "text-meta text-fg-2")}>
            {reason}
          </span>
        ) : (
          meta &&
          meta.length > 0 && (
            <span
              className={cn(
                "flex gap-2 overflow-hidden whitespace-nowrap",
                dense ? "text-label" : "text-meta",
                blocked ? "text-fg-muted" : dense ? "text-fg-muted" : "text-fg-2",
              )}
            >
              {meta.map((part, index) => (
                <React.Fragment key={`${part.text}-${index}`}>
                  {index > 0 && <span className="text-fg-ghost">·</span>}
                  <span className={cn("truncate", part.mono && "font-mono")}>{part.text}</span>
                </React.Fragment>
              ))}
            </span>
          )
        )}
      </span>

      {(endText || trailing) && (
        <span className="text-meta text-fg-muted flex flex-none items-center gap-2.5">
          {endText}
          {trailing}
        </span>
      )}
    </Element>
  )
}

/**
 * The list the selectable rows need. A `role="option"` outside a `listbox` is
 * not a valid option — this is the container that makes it one, and it is the
 * row's own list rather than a second component.
 *
 * A row that *acts* rather than selects — a block you add — does not belong in
 * here. Put those in a plain `<div className="flex flex-col gap-0.5">`.
 *
 * **The rows sit 2px apart, not flush.** This is an optical override (§8), not
 * a rung: the rows carry a hover fill and a selected fill, and flush against
 * each other those fills merge into one block the moment two neighbours are
 * lit. 2px is the least that keeps them separate shapes without reading as a
 * gap. It was briefly flushed to 0 and that was wrong.
 */
export function PickerList({
  multiple,
  describedBy,
  className,
  children,
  ...props
}: {
  /** Add-ons can be linked several at a time; a repository cannot. */
  multiple?: boolean
  /**
   * The id of the sentence that explains this list — the one explanation a
   * region owes when every row in it is off together (§9). Without it the
   * sentence is next to the rows on screen and connected to nothing at all
   * underneath, which is a region to the eye and nine loose rows to a reader.
   */
  describedBy?: string
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<"div">, "children">) {
  return (
    <div
      role="listbox"
      aria-multiselectable={multiple || undefined}
      aria-describedby={describedBy}
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    >
      {children}
    </div>
  )
}

/** Selection, said once and in the one colour that carries it (§5). */
export function PickerRowTick() {
  return <Check aria-hidden className="text-ring size-4" />
}

/** How many of this block are in the stack already — `postgres`, `postgres-2`. */
export function PickerRowCount({ n }: { n: number }) {
  return (
    <span className="border-border bg-control text-foreground rounded-sm border px-1.5 py-px font-mono text-[11px] leading-4">
      ×{n}
    </span>
  )
}

/** The affordance on a row that adds rather than selects. Inks on approach. */
export function PickerRowAdd() {
  return <Plus aria-hidden className="group-hover/row:text-foreground size-4 transition-colors" />
}

/**
 * Takes one instance back out. It is the only target on its row, which is why
 * the row around it is not itself clickable.
 *
 * It is `opacity-0` at rest and appears on approach (§11 — actions on hover),
 * but it never *goes* on focus, or the keyboard could not reach it.
 */
export function PickerRowRemove({
  label,
  onRemove,
}: {
  /** "Remove postgres-2" — the row's name, so a screen reader knows which. */
  label: string
  onRemove: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onRemove}
      className={cn(
        "focus-ring-edge flex size-[22px] items-center justify-center rounded-sm opacity-0 transition-opacity",
        "group-hover/row:opacity-100 focus-visible:opacity-100",
        "hover:bg-[var(--wash-hover)] hover:text-foreground",
        "[&_svg]:size-3.5",
      )}
    >
      <X aria-hidden />
    </button>
  )
}
