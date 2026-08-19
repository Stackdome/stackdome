import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  // Radius is NOT set here — it belongs to `size`, because §2 makes radius a
  // function of the control's HEIGHT. An input standing next to a button of
  // the same height must take the same corner.
  // A field is a WELL: it has no face of its own to lift, so hover is carried
  // by the LINE (§4's ladder — `border-strong` is the hover rung), never by a
  // fill change. That is what separates it from Select, which has a face.
  //
  // `disabled` is dimmed plus the not-allowed cursor and nothing else (§9), so
  // `pointer-events-none` must NOT be here — the control has to receive the
  // pointer for the cursor to show, and the native attribute already blocks
  // the click.
  // **The number spinner is off, here, once.** A `type=number` field draws a
  // pair of stacked native triangles inside the well — the only control on the
  // sheet the product did not draw. It ignores the height ladder, the radius,
  // the ink tiers and both themes, it appears on focus and hover only, and it
  // sits *inside* the field's own padding so the value it belongs to has to
  // make room for it. Two call sites had already killed it by hand with the
  // same three arbitrary variants, which is the tell that it belongs to the
  // primitive: `Storage size` had not, so one number field in the product wore
  // it and the rest did not.
  //
  // Nothing is lost. These are values you type — a disk size, a preview cap —
  // not a dial you nudge, and every one of them keeps its `min`/`max` and its
  // own clamping. Arrow keys still step the value, which is the affordance a
  // keyboard user actually had.
  "file:text-foreground placeholder:text-fg-muted selection:bg-primary selection:text-primary-foreground bg-input border-border flex w-full min-w-0 border text-body font-normal transition-[color,box-shadow,border-color] hover:border-border-strong file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body file:font-medium disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border focus-ring-edge aria-invalid:border-danger [&[type=number]]:[appearance:textfield] [&[type=number]::-webkit-inner-spin-button]:appearance-none [&[type=number]::-webkit-outer-spin-button]:appearance-none",
  {
    // §5's three heights, and §2's radius for each. The horizontal inset is
    // the same base the Button size uses (10 / 12 / 15), so a field and the
    // button beside it read as one row rather than two.
    //
    // There is no `h-9`. 36px is not a rung on the ladder.
    variants: {
      size: {
        sm: "h-7 rounded-sm px-2.5",
        default: "h-8 rounded-md px-3",
        lg: "h-10 rounded-lg px-[15px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/** `size` is ours, not the HTML attribute — the native one takes a character
 *  count and nothing in this product uses it. */
function Input({
  className,
  type,
  size,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size ?? "default"}
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
