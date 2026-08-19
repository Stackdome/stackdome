import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * **Bottom right, 380 wide** — board `427:5102`, whose own description says
 * *"380 wide, bottom-right"*.
 *
 * It was moved to top centre and moved back the same day, on the render. The
 * argument for the centre was that it should land where you were looking; what
 * it actually landed on was the **sheet header**, and in light both are white —
 * so it read as a header widget rather than a message floating over the page.
 * The corner has no chrome to be mistaken for.
 *
 * `swipeDirection="right"` follows the position — a toast is dismissed in the
 * direction it would leave.
 */
const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      // The viewport is the toast's own width — not a full-width strip with the
      // toast pushed to one end. `max-w` keeps it off the edges on a phone,
      // where 380 is wider than the screen.
      //
      // **`box-content`, or the padding is taken out of the toast.** With the
      // default border box a 380 viewport at `p-4` hands its children 348, and
      // the board's number quietly becomes 32 short. Sized on the content box,
      // the toast is 380 and the 16 of inset sits outside it.
      "fixed bottom-0 right-0 z-[100] box-content flex max-h-screen w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2 p-4",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
>(({ className, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        // **One toast, not four.** It used to tint its border per tone —
        // `border-danger/60`, `border-success/60` — which says the severity
        // twice (§7, §11) and made four components that looked like four
        // different things. White surface, `line/subtle` hairline, and the tone
        // lives in the glyph alone.
        //
        // **The edge is an OUTLINE at `line/strong`, and both halves of that
        // were measured.**
        //
        // The toast lands on the white sheet, and its surface IS that white:
        // `surface vs ground` measures **1.00**. Nothing separates the two but
        // the hairline, so the hairline is the whole object's legibility — and
        // the board's `line/subtle` (0.06) was chosen against the board's grey
        // frame, which is not the ground it ships on. Solve contrast against
        // the worst ground.
        //
        // Outside rather than inside, so the line sits on the shadow instead of
        // on the surface. Read off the rendered pixels, that buys **+0.09 on
        // the bottom edge and nothing on the sides** — `elevation/lg`'s spreads
        // (-22, -12) pull the whole shadow under the box, so three of the four
        // sides have no shadow to darken against. Kept anyway: it is free, it
        // is the right mechanic, and §12a already calls an edge that must not
        // move layout an outline rather than a border.
        //
        // **The rung is what actually moves it** — 0.06 → 0.18 takes the left
        // edge from 1.24 to 1.43 in light and 1.26 to 1.44 in dark.
        // `--shadow-toast` is `elevation/lg` plus a CONTACT layer — see
        // `index.css`. The four rungs are all soft pools with negative spread,
        // so they blur out below a card and leave nothing at its own edge; the
        // toast is the one surface with nothing behind it to borrow from.
        // Not a fifth rung: `lg` with one more layer, named for its one caller.
        "group pointer-events-auto relative flex w-full items-start gap-2 rounded-lg bg-popover p-4 shadow-[var(--shadow-toast)]",
        "outline outline-1 outline-offset-0 outline-border-strong",
        // `lg`, not `2xl` — a toast is a small overlay, not a modal, and it
        // must not float the same distance as the dialog it reports on (§5).
        "transition-all",
        "data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=closed]:fade-out-80",
        "data-[swipe=move]:transition-none data-[swipe=cancel]:translate-x-0",
        className
      )}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "focus-ring-edge inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-3 text-body font-medium transition-colors hover:bg-secondary",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      // In the flow, on the board's 8 gap — it used to be absolutely positioned
      // at `right-2 top-2`, which is why the text needed a `pr-4` to dodge it.
      //
      // **16px of glyph, 24px of target.** `-m-1 p-1` grows the hit area
      // without moving the layout box, so the drawn geometry still measures the
      // board's while the pointer and the keyboard get something they can land
      // on.
      "focus-ring-edge -m-1 mt-0 shrink-0 rounded-sm p-1 text-foreground opacity-60 transition-opacity hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X aria-hidden className="size-4" />
    {/* It had no name at all — a button whose only content is a glyph is an
        unlabelled button, and the drawer's close already solved this. */}
    <span className="sr-only">Close</span>
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

/**
 * The toast's words are **one paragraph at `body/400`** — board `427:5102`
 * draws every tone that way, including the two-sentence ones.
 *
 * `ToastTitle` and `ToastDescription` still exist because Radix needs them for
 * the announcement, but they are `<span>`s in one flowing line rather than a
 * bold heading over a dimmed caption. The title was `font-semibold`, a weight
 * §6 took off the scale, and a two-tier hierarchy inside a 380px box that
 * disappears in five seconds was hierarchy nobody had time to read.
 */
const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title asChild ref={ref}>
    <span className={cn("text-body font-normal text-foreground", className)} {...props} />
  </ToastPrimitives.Title>
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description asChild ref={ref}>
    <span className={cn("text-body font-normal text-foreground", className)} {...props} />
  </ToastPrimitives.Description>
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast> & {
  /** Picks the glyph, and nothing else — the surface and the edge never move. */
  variant?: "default" | "destructive" | "success" | "warning" | "info" | null
}

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
