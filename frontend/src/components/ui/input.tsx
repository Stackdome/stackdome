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
  "file:text-foreground placeholder:text-fg-muted selection:bg-primary selection:text-primary-foreground bg-card shadow-sm [outline-width:1px] [outline-style:solid] [outline-color:var(--border)] flex w-full min-w-0 text-body font-normal transition-[color,box-shadow,border-color] hover:[outline-color:var(--border-strong)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body file:font-medium disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:[outline-color:var(--border)] focus-ring-edge aria-invalid:[outline-color:var(--danger)] [&[type=number]]:[appearance:textfield] [&[type=number]::-webkit-inner-spin-button]:appearance-none [&[type=number]::-webkit-outer-spin-button]:appearance-none",
  {
    // §5's three heights.
    //
    // **The 32px field is 8px, from the board's `Field` component — it no
    // longer shares Button's inset.** A field is a WELL and a button is a FACE:
    // the button's padding is holding a label off its own edge, the field's is
    // holding a value off a line. `sm` and `lg` still carry the old button base
    // (10 / 15) because the board only specifies the 32px field.
    //
    // There is no `h-9`. 36px is not a rung on the ladder.
    variants: {
      size: {
        sm: "h-7 px-2.5",
        default: "h-8 px-2",
        lg: "h-10 px-[15px]",
      },
      // The board's `Field` carries the same two shapes as `Button`, for the
      // same reason: radius reports what KIND of thing this is, not how big it
      // is. Set by the compoundVariants below so a flat field and the flat
      // button beside it take the same corner at the same height.
      //
      // `flat` is the DEFAULT, matching Button — new work is correct without
      // thinking about it, and deliberate pills get restored screen by screen
      // rather than retrofitted in a sweep.
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

/** `size` is ours, not the HTML attribute — the native one takes a character
 *  count and nothing in this product uses it. */
function Input({
  className,
  type,
  size,
  shape,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size ?? "default"}
      data-shape={shape ?? "flat"}
      className={cn(inputVariants({ size, shape, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
