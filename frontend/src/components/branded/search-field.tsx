import type * as React from "react"

import { Search } from "lucide-react"

import { Input, inputVariants } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * The one search box every catalogue tab uses.
 *
 * 32px, not 40 (§8/§11): a search is a **working control**, and 40 is reserved
 * for form fields and their primary button. There are no true form fields in
 * this flow — the configuration lives on the canvas.
 *
 * It runs the full width of the body column rather than the toolbar's 300px,
 * because here it is the only control above a long list rather than one of
 * several in a row.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  disabled,
  bare,
  className,
  inputProps,
  renderInput,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** The accessible name. The placeholder disappears the moment you type. */
  label: string
  /**
   * There is nothing to search yet — the provider that would fill the list is
   * not connected.
   *
   * **It stays on screen rather than disappearing.** §9's rule about a dead end
   * is about a control that refuses without saying why; here the reason is the
   * empty state directly beneath it, in full, with the fix as a button. Pulling
   * the field out instead would make the control band change shape between two
   * states of the same tab, and the segmented control beside it would jump.
   */
  disabled?: boolean
  /**
   * **No edge and no ring** — for a field that is the surface's permanent focus.
   *
   * The canvas picker focuses this box the moment the popover opens and never
   * lets it go, so its focus ring would be lit from the first frame to the last.
   * A ring that is always on reports nothing; it is just a blue rectangle around
   * a search box. The border goes with it for the same reason the ring does —
   * the field is not one control among several here, it is the top band of the
   * panel, and the band's own hairline already separates it from the list.
   *
   * Everywhere the field can actually lose focus, it keeps both.
   */
  bare?: boolean
  /**
   * Handed straight to the `<input>`. The canvas picker drives its list from
   * here — combobox wiring, the active-row pointer and the arrow keys all belong
   * to the field that keeps focus, not to the list it is steering.
   *
   * `Input`'s own `size` is a variant name, not the HTML numeric attribute, so
   * the native props are narrowed to keep the two from colliding.
   */
  inputProps?: Omit<React.ComponentProps<"input">, "size" | "value" | "onChange" | "type">
  /**
   * Render a different input element inside this row.
   *
   * **The one caller is `CommandInput`**, and it needs this because cmdk owns
   * its input: the component tracks the query, the active row and the keyboard
   * itself, so the element has to be `CommandPrimitive.Input` and not ours. The
   * ROW is what is shared — the 40 band, the glyph on the left edge, the 8 gap
   * — and that is the part that was being drawn twice.
   *
   * It receives the classes the field would have applied, so a caller cannot
   * accidentally opt out of `bare`'s no-ring, no-edge contract.
   */
  renderInput?: (
    className: string,
    inputProps: React.ComponentProps<"input">,
  ) => React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        disabled && "opacity-50",
        // **`bare` is a ROW, not a box with something absolutely positioned in
        // it.** A flex line puts the glyph and the text in one object with a
        // real gap between them, which is the whole fix — see the note below —
        // and it is the shape `CommandInput` already uses for every other search
        // inside a menu.
        bare ? "flex h-10 items-center gap-2 pl-5" : "relative",
        className,
      )}
    >
      {/* 16px glyph on the field's own inset, with an 8px gap to the text — the
          same three numbers the Input primitive uses, so a search box and a form
          field share one leading edge.

          **8, not 12.** It was written against a 32px field that ran a 12px
          inset; that field went to a flat 8 with the rest of the 32px controls
          (§8, "8 and 8 at 32px"), and this glyph did not follow — so the one
          search box in the product began 4px right of every field under it.

          **`bare`: the glyph shares the row's LEFT EDGE, not its centre.**

          It spent a pass centred on the column of row chips — glyph centre 37,
          chip centre 37, placeholder on the row names at 65 — which is a clean
          set of numbers and looked wrong. Two reasons, both visible the moment
          it is on screen. A chip is a 32px face and the search glyph is a bare
          16px mark, so aligning their *centres* aligns two things the eye does
          not read as the same kind of object; and holding that centre forces a
          **20px** gap to the placeholder, which unbinds the glyph from the words
          it belongs to. It stopped reading as a search box and started reading
          as an icon that happened to be near some text.

          Sharing the left edge fixes both: `pl-5` (20, +1 of panel border = the
          21 a row's chip starts at) puts the glyph on the same vertical as every
          chip below it, and `gap-2` keeps it bound to its own placeholder.

          **40 tall, not 32.** At 32 the popover's own 12px radius eats the band
          — a third of its height is corner on each side, and the glyph sits in
          the curve. 40 is also `CommandInput`'s height, which is the search this
          product already puts inside a menu. */}
      <Search
        aria-hidden
        className={cn(
          "text-fg-muted size-4 flex-none",
          bare ? "" : "absolute left-2 top-1/2 -translate-y-1/2",
        )}
      />
      {renderInput ? (
        // The row is ours; the element is the caller's. `bare` still decides
        // the classes, so a lent-out input cannot draw a ring this row's whole
        // point is to suppress.
        renderInput(
          cn(
            inputVariants({ variant: bare ? "bare" : "default" }),
            bare ? "h-full flex-1 px-0" : "pl-8",
          ),
          { placeholder, "aria-label": label, disabled, ...inputProps },
        )
      ) : (
        <Input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          disabled={disabled}
          variant={bare ? "bare" : "default"}
          className={bare ? "h-full flex-1 px-0" : "pl-8"}
          {...inputProps}
        />
      )}
    </div>
  )
}
