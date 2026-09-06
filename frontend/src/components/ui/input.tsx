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
  "file:text-foreground placeholder:text-fg-muted selection:bg-primary selection:text-primary-foreground flex w-full min-w-0 text-body font-normal transition-[color,box-shadow,border-color] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body file:font-medium disabled:cursor-not-allowed disabled:opacity-50 [&[type=number]]:[appearance:textfield] [&[type=number]::-webkit-inner-spin-button]:appearance-none [&[type=number]::-webkit-outer-spin-button]:appearance-none",
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
      /**
       * **The field's FACE — ground, edge and ring — is a variant, not the
       * base.**
       *
       * `focus-ring-edge` is a plain class outside every cascade layer, which
       * is what lets it beat the layered utilities and replace an element's
       * hairline cleanly. The same thing makes it unremovable from a call site:
       * `focus-visible:shadow-none` in a `className` loses to it every time. So
       * a field that must not draw a ring cannot be built by overriding one —
       * it has to be built by not asking for one.
       *
       * `default` is every field in the product and is unchanged: card ground,
       * `shadow-sm`, a hairline outline that firms on hover and turns danger
       * when invalid, and the flush focus ring.
       */
      variant: {
        default:
          "bg-card shadow-sm [outline-width:1px] [outline-style:solid] [outline-color:var(--border)] hover:[outline-color:var(--border-strong)] disabled:hover:[outline-color:var(--border)] focus-ring-edge aria-invalid:[outline-color:var(--danger)]",
        /**
         * No ground, no edge, no ring — for a field that IS its surface.
         *
         * The one case it exists for: a search box that takes focus when its
         * panel opens and never gives it back. Its ring would be lit from the
         * first frame to the last, which reports nothing, and its border would
         * draw a second edge inside a band that already ends in a hairline.
         * **Do not reach for it to make a field look quieter** — a field you can
         * focus and unfocus owes the keyboard a ring.
         *
         * `outline-none` is explicit here because `focus-ring-edge` was the
         * thing suppressing the UA's own focus outline. Drop the ring without
         * it and the browser draws its default one instead — measured, the blue
         * `box-shadow` was replaced by a 1px `auto` outline.
         */
        bare: "bg-transparent outline-none focus-visible:outline-none",
      },
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
      variant: "default",
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
  variant,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size ?? "default"}
      data-shape={shape ?? "flat"}
      data-variant={variant ?? "default"}
      className={cn(inputVariants({ size, shape, variant, className }))}
      {...props}
    />
  )
}

/**
 * **A field with a fixed head — one well, not a chip parked beside a box.**
 *
 * `Image reference` is the case: the value is `ghcr.io/acme/api:1.4.2`, one
 * string, of which the host is set by the registry picker above and the rest is
 * typed. It shipped as a `bg-muted` chip and a separate `Input` with 4px of air
 * between them, and that split cost three things:
 *
 * | | |
 * |---|---|
 * | The chip floated | `py-1` inside a 32 row — a 24px block, centred but detached |
 * | The error was on half the control | The danger edge drew around the input only, so the invalid state stopped at the seam |
 * | One value read as two objects | A label and a field, rather than a prefix and its continuation |
 *
 * ### The wrapper owns the material; the input owns nothing
 *
 * Ground, hairline, radius, hover, focus ring and the `aria-invalid` edge all
 * belong to the group, taken from `inputVariants` so there is no second
 * definition of what a field is made of. The `<input>` inside is `variant="bare"`
 * — no ground, no edge, no ring — which is exactly what that variant exists for:
 * a field that IS its surface.
 *
 * `has-[:focus-visible]` is what moves the ring out to the wrapper. Focus is
 * still on the real input, so the keyboard and screen readers are unchanged;
 * only the thing that DRAWS the ring moves, because the ring has to go around
 * the whole control and not around half of it.
 *
 * ### The head is a divider, not a fill
 *
 * Same ground either side, separated by the hairline the control already uses.
 * A grey head would say *this part is disabled*, which is wrong — it is not
 * disabled, it is decided somewhere else. The muted ink says that on its own.
 */
function InputGroup({
  prefix,
  className,
  inputClassName,
  size,
  shape,
  ...props
}: Omit<React.ComponentProps<"input">, "size" | "prefix"> &
  VariantProps<typeof inputVariants> & {
    /** The fixed head — a registry host, a scheme, a unit.
     *  `prefix` is omitted from the native input props above: the HTML attribute
     *  of that name is a legacy string and would narrow this to one. */
    prefix?: React.ReactNode
    /** Classes for the inner `<input>`, not the well. */
    inputClassName?: string
  }) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        inputVariants({ size, shape }),
        // The well keeps its height and corner and hands its padding to the
        // segments; `overflow-hidden` is what makes the head take the corner.
        "gap-0 overflow-hidden p-0",
        // The ring belongs to the group. `:not(:has([aria-invalid=true]))`
        // mirrors the base rule — an invalid edge is reporting something, so it
        // survives focus.
        "has-[:focus-visible]:shadow-[var(--focus-ring-edge)]",
        "has-[:focus-visible]:not-has-[[aria-invalid=true]]:[outline-color:transparent]",
        "has-[[aria-invalid=true]]:[outline-color:var(--danger)]",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className
      )}
    >
      {prefix != null && (
        <span
          data-slot="input-group-prefix"
          // `select-none` and `pointer-events-none`: the head is not a value you
          // can put a caret in, and a drag-select that starts on it and ends in
          // the field would look like it had selected text it cannot give you.
          className="text-fg-muted pointer-events-none flex h-full flex-none select-none items-center border-r border-border-subtle px-2"
        >
          {prefix}
        </span>
      )}
      <Input
        variant="bare"
        size={size}
        shape={shape}
        className={cn("h-full min-w-0 flex-1 rounded-none px-2", inputClassName)}
        {...props}
      />
    </div>
  )
}

export { Input, InputGroup, inputVariants }
