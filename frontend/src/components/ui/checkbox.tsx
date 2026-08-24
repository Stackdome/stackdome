import * as React from "react"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A checkbox, on a native `<input type="checkbox">`.
 *
 * There is no Radix checkbox in this project and no dependency for one. A
 * native input needs neither: it is already focusable, already announced, and
 * already keyboard-operable, so the whole component is a styled box drawn over
 * it. The input itself stays in the DOM — hidden with `sr-only`, not
 * `display:none` — which is what keeps the label click, the space key and the
 * accessibility tree working.
 *
 * A Switch is NOT a substitute. A switch is a setting you change; a checkbox is
 * a statement you are making. §6a's level-2 gate is the second thing.
 */
function Checkbox({
  className,
  checked,
  defaultChecked,
  indeterminate = false,
  onCheckedChange,
  disabled,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "onChange"> & {
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  const ref = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <span className={cn("relative inline-flex size-4 shrink-0", className)}>
      <input
        ref={ref}
        type="checkbox"
        data-slot="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        // Transparent and stretched over the box rather than `sr-only`: a
        // clipped 1px input is not where the pointer lands, so the click falls
        // through to the decorative span and is swallowed. This way the real
        // control IS the hit target, and the styled box is just paint under it.
        className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden
        className={cn(
          // **`xs` — 4 on a 16 box.** §2's ladder continued down to the
          // smallest element; it was a hardcoded `4px` until the rung existed.
          //
          // **A BORDER, not an outline, and the fill is `--input`.**
          // An outline is drawn outside the box, so a `size-4` checkbox
          // measured 16 in layout and painted 18 — it sat proud of the 16px
          // text row beside it and of every 16px glyph in the same list. The
          // board draws a 16 box with the stroke INSIDE (§8's outline rule is
          // for cards standing on a ground, not for a control this small).
          //
          // `--input` is the recessed fill every other empty control uses; on
          // `bg-card` the box was the same white as the sheet behind it and
          // the hairline was doing all the work.
          "pointer-events-none inline-flex size-4 items-center justify-center rounded-xs border border-[var(--border-strong)] bg-input shadow-sm transition-colors",
          "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
          "peer-indeterminate:border-primary peer-indeterminate:bg-primary peer-indeterminate:text-primary-foreground",
          "focus-ring-peer",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          // The glyph is a DESCENDANT of this span, not a sibling of the input,
          // so `peer-checked:` cannot reach it directly — the variant has to be
          // applied here and reach down.
          "[&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100 peer-indeterminate:[&_svg]:opacity-100",
        )}
      >
        {/* **12px glyph, 1.33px of line.** `strokeWidth` is in the icon's own
            24 viewBox, so 2.67 there renders 1.33 here — the weight the board
            draws. At the previous 3 it rendered 1.5 and the tick read as a
            blob inside a 16 box. */}
        {indeterminate ? (
          <Minus className="size-3 transition-opacity" strokeWidth={2.67} />
        ) : (
          <Check className="size-3 transition-opacity" strokeWidth={2.67} />
        )}
      </span>
    </span>
  )
}

export { Checkbox }
