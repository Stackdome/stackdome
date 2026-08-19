"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * A surface attached to ONE OBJECT — a form about it, or a long reading of it.
 *
 * Reach for this over a `Dialog` when there are **many fields**, when the user
 * needs the list behind it for reference, or when the screen is wide. A dialog
 * is for a title and one or two boxes that must be finished before anything
 * else happens.
 *
 * **Three bands, two permanent borders.** A dialog is one padded box whose
 * levels are made of air; that works because its body does not scroll. A drawer
 * holds a long form and does scroll, so its levels are made of LINES — the body
 * needs a fixed edge to pass under. A border that appears only once the content
 * overflows moves the thing you are reading at the moment you start reading it.
 *
 *   Header  86   20 pad · title/600 · border-bottom
 *   Body    fill 20 pad · scrolls
 *   Footer  80   24 pad · border-top
 *
 * Built on Radix's Dialog, not its own machinery: the focus trap, escape
 * handling, the body scroll lock and the portal are the same problem a dialog
 * has already solved, and a second implementation is a second set of bugs.
 */
function Drawer({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="drawer" {...props} />
}

/**
 * **How the bands are mounted — and it is the only thing that varies.**
 *
 * The three bands are one design: 95 header, scrolling body, 81 footer, 480
 * wide, square, one hairline on the inner edge. Two surfaces want exactly that
 * and disagree about nothing else:
 *
 * | Mount | Is | Gets |
 * |---|---|---|
 * | `modal` (default) | A drawer over a page | Portal, scrim, focus trap, `role="dialog"` |
 * | `region` | A slice of the sheet it lives in | An `<aside>` landmark, in the tab order, no scrim |
 *
 * The canvas inspector is the second: it does not cover the canvas, it takes
 * space from it, and the graph beside it stays live the whole time. A scrim
 * would be lying about that, and a focus trap would make the canvas
 * unreachable by keyboard while a node is open.
 *
 * Only `Title`, `Description` and the close need to know: in `modal` they are
 * Radix's, which need a Dialog root above them; in `region` there is no root,
 * so they are plain elements. Every other band is the same markup either way —
 * which is the whole point of the context. Nothing else may branch on it.
 */
type DrawerMount = "modal" | "region"

const DrawerMountContext = React.createContext<DrawerMount>("modal")

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="drawer-close" {...props} />
}

// The page stays VISIBLE, not LIVE. Visible is the entire benefit of a drawer;
// live is how a half-typed form dies to a stray click on the list behind it.
function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="drawer-overlay"
      // The fade is in `index.css` under "Drawer choreography", with the
      // panel's travel — the two are one movement and were drifting apart as
      // two sets of utility classes with different durations.
      className={cn("fixed inset-0 z-50 bg-scrim", className)}
      {...props}
    />
  )
}

// Two rungs, not three. A dialog's width says how big the question is; a
// drawer's only has to answer "one column or two", and that is a yes/no.
// Nothing goes wider: 640 is already 44% of a 1440 screen, and content that
// genuinely needs more room was never attached to one object — it is a page.
const drawerSizes = {
  form: "sm:w-[480px]",
  work: "sm:w-[640px]",
} as const

type DrawerSize = keyof typeof drawerSizes

/**
 * The same two rungs, in pixels — a region's width is arithmetic its neighbour
 * has to do. The canvas pans by half of it so the graph glides sideways rather
 * than sitting still while the viewport shrinks around it, and a number that
 * lived only in a Tailwind class would have to be guessed there.
 */
const drawerRegionWidthPx = { form: 480, work: 640 } as const satisfies Record<DrawerSize, number>

// Unconditional, unlike the modal's `sm:` rungs. A modal drawer goes full-bleed
// on a phone because it is the whole screen there; a region cannot — it is a
// slice of a sheet, and a slice that eats its own container is not a slice.
const regionSizes = {
  form: "w-[480px]",
  work: "w-[640px]",
} as const satisfies Record<DrawerSize, string>

function DrawerContent({
  className,
  children,
  size = "form",
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  size?: DrawerSize
}) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DialogPrimitive.Content
        data-slot="drawer-content"
        /**
         * **Opening a drawer must not ring the way out of it.**
         *
         * Radix focuses the first tabbable element on open, and it focuses it
         * programmatically — which counts as `:focus-visible`, so the ring is
         * drawn even for a mouse click. In a journey the first tabbable is the
         * way out — it was the back arrow, and now it is the first live crumb —
         * so the drawer opened with a ring on the control that leaves it: the
         * eye goes to the exit before the list.
         *
         * The content element takes the focus instead. It is not a control, so
         * nothing is ringed, and Esc, Tab and the focus trap all behave exactly
         * as before — the first Tab still lands on that crumb.
         *
         * A drawer that wants a specific field focused passes its own handler;
         * this is the default, not a lock.
         */
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event)
          if (event.defaultPrevented) return
          event.preventDefault()
          ;(event.currentTarget as HTMLElement | null)?.focus()
        }}
        className={cn(
          // Square. It meets three screen edges, and the inner edge is held by
          // the border and the scrim — a radius there made it read as a sheet
          // laid ON the page rather than part of it.
          "bg-popover fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border shadow-2xl",
          // The content takes the focus on open (see `onOpenAutoFocus`), and a
          // container is not a control — so it must not draw a ring. The
          // dialog role is what announces it; the outline would only say "this
          // 640px panel is focused", which nobody needed telling.
          "outline-none",
          "grid grid-rows-[auto_minmax(0,1fr)_auto]",
          // **The travel lives in `index.css`, under "Drawer choreography".**
          // It was `animate-in … slide-in-from-right … fade-in-0` here, which
          // faded an opaque panel while it moved and could not be interrupted:
          // Esc 112ms into the open jumped it 208px back to fully-open before
          // it started leaving. Both are fixed there, in CSS, because the fix
          // needs `@starting-style` and a keyframe that utilities cannot express.
          drawerSizes[size],
          className
        )}
        {...props}
      >
        {/* The close lives in `DrawerHeader` now, not here. It used to be
            absolutely positioned against the content, which meant the header
            had to dodge it — one drawer carried a literal `pr-12` to stop its
            title running underneath. In the flow it needs no dodging and no
            magic number, and it stays aligned to the title whatever the header
            holds. */}
        {children}
      </DialogPrimitive.Content>
    </DrawerPortal>
  )
}

/**
 * The same three bands, mounted **in flow** instead of over the page.
 *
 * A region does not float, so it gets none of what makes a floating panel
 * legible against what is under it: no scrim, no shadow, no radius. It is
 * separated by one hairline on its inner edge and nothing else — and that
 * hairline is a `border-left`, *inside* the 480, because a one-sided rule is a
 * divider between two things rather than an outline around one of them.
 *
 * **It is a landmark, not a dialog.** `<aside>` with a label naming what it is
 * showing, so it is reachable by keyboard in document order and announced as a
 * complementary region. Closing it is `Esc`, which the owner binds — there is
 * no Radix here to do it.
 *
 * The width is `form`'s 480. The sibling it sits beside must be allowed to
 * shrink (`min-w-0`), or the region gets pushed off the edge instead.
 */
function DrawerRegion({
  className,
  size = "form",
  children,
  ...props
}: React.ComponentProps<"aside"> & { size?: DrawerSize }) {
  return (
    <DrawerMountContext.Provider value="region">
      <aside
        data-slot="drawer-region"
        className={cn(
          "grid h-full flex-none grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto]",
          "border-l border-border bg-background",
          regionSizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    </DrawerMountContext.Provider>
  )
}

/**
 * The whole top band, in one place — **heading and close.**
 *
 * It used to be an empty box that every drawer filled itself, and six call
 * sites drifted apart inside it: two built a path, two built a title and a
 * description, and the previews wizard hand-rolled its own back button out of a
 * raw `<button>` plus a `pr-12` on the header to stop the title sliding under
 * the absolutely-positioned close. That is three copies of one band, and one of
 * them was a copy of a component that already existed.
 *
 * Now the band takes props and owns its own layout, so there is nothing left to
 * assemble at a call site and nothing to keep in sync.
 *
 * ### Two shapes, and they are the two §12a describes
 *
 * | Pass | You get |
 * |---|---|
 * | `title` | The plain form — a heading, optionally over a description |
 * | `steps` | The journey form — the path, `New addon › Postgres` (§12a) |
 *
 * ### The path IS the back button
 *
 * There used to be an arrow to the left of it. It is gone, and the crumbs
 * themselves went live: pass a `{ label, onClick }` instead of a string and that
 * segment becomes a target.
 *
 * **An arrow beside a path is the same control twice.** The path already draws
 * the route — `New stack › A repository › Configure` — and every stop on it is
 * somewhere you have been. An arrow can only walk that route one step at a time
 * while sitting next to a complete map of it, and it names none of the places it
 * goes: "Back" tells you the direction, the crumb tells you the destination. On
 * a three-step journey it takes two clicks to reach what one click on `New
 * stack` reaches directly.
 *
 * It also cost a 32px box on the 20 column, which pushed the whole path right
 * and left the drawer's text starting at a different x than its body's.
 *
 * **The last crumb is never a target** — it is where you already are, and it is
 * the `DrawerTitle` Radix requires. Passing an `onClick` on it is ignored.
 *
 * ### The top row is 32 because the close is
 *
 * The close is a `ghost` icon button at the 32 rung — `size="icon"` on the
 * existing `Button`, which already lands 32×32 at radius 8. **No new
 * component**: an icon button is a Button whose label is a glyph.
 *
 * That makes the row 32 rather than the heading's own 24, so a plain header is
 * 72 rather than 64. Worth it — the heading and the close now share one centre
 * line, which the absolute close never managed.
 */
function DrawerHeader({
  title,
  steps,
  description,
  leading,
  trailing,
  closeLabel = "Close",
  onClose,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  /** The plain form's heading. Mutually exclusive with `steps`. */
  title?: React.ReactNode
  /**
   * The journey form: task first, current step last (§12a).
   *
   * A bare string is a dead crumb. `{ label, onClick }` makes it a target — use
   * it for every stop you can actually return to, which is what replaced the
   * back arrow.
   */
  steps?: DrawerStep[]
  /** One line under the heading. §13 says step two of a journey gets none. */
  description?: React.ReactNode
  /**
   * A 16px glyph before the heading, `8` off it — for a header naming a thing
   * that has a kind (a canvas node, an addon), where the glyph makes a
   * distinction the word alone doesn't (§7). The description indents to sit
   * under the heading rather than under the glyph, so the two text lines share
   * one left edge.
   */
  leading?: React.ReactNode
  /** A fact about the object, right-aligned on the heading row, before the ✕. */
  trailing?: React.ReactNode
  closeLabel?: string
  /**
   * Required in a `region` mount, ignored in a `modal` one. A modal drawer's
   * close is Radix's — it already knows how to dismiss the dialog it is inside.
   * A region has no dialog to dismiss, so the owner says what closing means.
   */
  onClose?: () => void
}) {
  const mount = React.useContext(DrawerMountContext)
  const close = (
    <Button variant="ghost" size="icon" className="flex-none" onClick={mount === "region" ? onClose : undefined}>
      <XIcon aria-hidden />
      <span className="sr-only">{closeLabel}</span>
    </Button>
  )
  return (
    <div
      data-slot="drawer-header"
      // **20 all round, and the pair sits on NOTHING.** Measured glyph-to-glyph
      // rather than box-to-box: at `name/500` + `meta/400` the two line boxes
      // carry 3px and 2px of half-leading, so a declared 0 already reads as a
      // 5px gap — which is what a heading and its subtitle want. The old 2 was
      // tuned for 16/24 + 13/20 and, once the row fault below was in play, read
      // as **13**.
      className={cn("flex flex-col gap-0 border-b border-border p-5 text-left", className)}
      {...props}
    >
      {/* A CONTROL row, 32 tall: it carries `leading`, `trailing` and the close
          button, all of which are 32px. The floor is not what sets the height —
          the close button does — so this stays at 8 and says so. */}
      <div className="flex min-h-8 items-center gap-1.5">
        {/* Guarded, so a header given neither prop does not emit an EMPTY
            `DrawerTitle` beside whatever its children supply — two titles in
            one dialog, one of them blank, which Radix warns about and screen
            readers read. The slot still holds its width either way. */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leading}
          {steps ? (
            <DrawerPathSteps steps={steps} />
          ) : title !== undefined ? (
            <DrawerTitle className="truncate">{title}</DrawerTitle>
          ) : null}
        </div>
        {trailing}
        {mount === "region" ? close : <DialogPrimitive.Close asChild>{close}</DialogPrimitive.Close>}
      </div>
      {/* Indented past the glyph so the two text lines share a left edge — 16
          for the glyph plus the 8 beside it. Without one, no indent.

          **`-mt-0.5` puts the pair 4px apart.** The title is a 20px line box
          centred in a 32px control row, so 6px of that row hangs below the
          title. The description is a sibling of the ROW, not of the title, so
          it inherits that 6 before any gap is applied at all. −6 would close it
          to zero; −2 leaves the 4 the pair is specified at, without moving the
          close button, which is what actually needs the 32. */}
      {description && (
        <DrawerDescription className={cn("-mt-0.5", leading && "pl-6")}>
          {description}
        </DrawerDescription>
      )}
      {children}
    </div>
  )
}

// The only band that scrolls. `min-h-0` is what lets it: without it a grid row
// refuses to shrink below its content and the whole drawer grows instead.
function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn("flex min-h-0 flex-col gap-4 overflow-y-auto p-5", className)}
      {...props}
    />
  )
}

/**
 * The footer band — and the error slot's home.
 *
 * An error belongs HERE rather than at the end of the body. Inside a band that
 * scrolls it would scroll away from the button that produced it, which is the
 * same failure as a toast, only slower.
 */
function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "flex flex-col gap-4 border-t border-border p-6",
        className
      )}
      {...props}
    />
  )
}

/**
 * The primary, right-aligned, gap 8 — and an optional `leading` slot on the
 * left of the same line.
 *
 * **`leading` is for reference, not for a second action.** A link out to the
 * docs for what you are filling in belongs on the footer's free left half: it
 * is available the whole time you work, it is nowhere near the button that
 * commits, and it does not have to attach itself to whichever field last
 * mentioned it. The addon drawer's `Documentation` link came from the
 * `Advanced` section header, where it split the disclosure's hover target in
 * two and left that row behaving differently from `Backups` beside it.
 *
 * It is not a place for `Cancel`. The path and the ✕ are a journey's exits.
 */
function DrawerActions({
  className,
  leading,
  children,
  ...props
}: React.ComponentProps<"div"> & { leading?: React.ReactNode }) {
  return (
    <div
      data-slot="drawer-actions"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:items-center",
        leading ? "sm:justify-between" : "sm:justify-end",
        className,
      )}
      {...props}
    >
      {leading}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
    </div>
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  // Radix's Title registers itself as the dialog's accessible name, which needs
  // a Dialog root above it. A region has none — the `<aside>` carries its own
  // label — so the same line renders as a plain heading.
  const Comp = React.useContext(DrawerMountContext) === "region" ? "h2" : DialogPrimitive.Title
  return (
    <Comp
      data-slot="drawer-title"
      // **14/20 at 500 — `name/500`.** 500 not 600: semibold is off the
      // scale (§6). And `name`, not `title`: the drawer names itself one
      // rung above the 13px body it holds, matching `SheetHeader`. The
      // drawer keeps its OWN trail, so this does not come through there.
      className={cn("text-name font-medium", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const Comp = React.useContext(DrawerMountContext) === "region" ? "p" : DialogPrimitive.Description
  return (
    <Comp
      data-slot="drawer-description"
      // **12/16 at 400 — `meta/400`.** It ran at body size, the same rung as
      // the form it introduces, so the description competed with the fields
      // instead of setting them up. One rung down, and the weight stays regular.
      className={cn("text-fg-2 text-meta font-normal", className)}
      {...props}
    />
  )
}

/**
 * One stop on a journey. A bare string is a dead crumb; the object form is a
 * crumb you can click, which is what replaced the back arrow.
 */
type DrawerStep = string | { label: string; onClick?: () => void }

const stepLabel = (step: DrawerStep) => (typeof step === "string" ? step : step.label)

/**
 * The path itself — and, since the arrow went, the journey's only way back
 * (§12a).
 *
 * Not exported. `DrawerHeader` owns it, because a path split from its band is
 * what let a second copy of the arrow get hand-rolled elsewhere.
 *
 * **Colour alone separates the steps** — every step is `title/500`, and the
 * ones behind you are `fg-muted` against the current step's ink. The board ran
 * weight as a second signal until semibold came off the scale (§6); one signal
 * is enough here, and a 400 step beside a 500 one read as two type styles
 * rather than as one path.
 *
 * ### A live crumb is still `fg-muted` at rest
 *
 * It inks to `foreground` on approach and underlines, rather than announcing
 * itself as a link in the resting state. Two reasons. The tier IS the "behind
 * you" signal, and lifting it would put two crumbs at the current step's ink
 * with only an underline telling you which one you are on. And §7 gives the
 * accent to selection, not to navigation — a blue crumb in a header would be
 * the only blue text in the drawer and would outrank the thing you came to do.
 *
 * **The hit area is the word, not a padded box.** A crumb sits inline in a
 * phrase; a box around it would break the phrase into buttons and put the `›`
 * outside them. The row is 32 tall, so the word already clears the target floor
 * vertically.
 *
 * `›` and not `/` — a slash is the trail's mark and means *contained by*. A
 * journey is a sequence, not a hierarchy.
 *
 * A journey of ONE step passes a single-element `steps` and gets no separator:
 * a path of one is a title with punctuation.
 */
function DrawerPathSteps({ steps }: { steps: DrawerStep[] }) {
  const current = steps.length - 1
  return (
    <nav data-slot="drawer-path" className="flex min-w-0 items-center gap-1.5">
      {steps.map((step, i) => {
        const label = stepLabel(step)
        // **The last crumb is never a target.** It is where you already are,
        // and it is the DrawerTitle — Radix requires one, and inventing a
        // second (visually hidden) one would let the two drift.
        const onClick = i === current || typeof step === "string" ? undefined : step.onClick
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <span aria-hidden className="text-name font-normal text-fg-muted">
                ›
              </span>
            )}
            {i === current ? (
              <DrawerTitle className="truncate">{label}</DrawerTitle>
            ) : onClick ? (
              <button
                type="button"
                onClick={onClick}
                className={cn(
                  "focus-ring-edge text-name font-medium whitespace-nowrap text-fg-muted rounded-sm",
                  "transition-colors hover:text-foreground hover:underline underline-offset-4",
                )}
              >
                {label}
              </button>
            ) : (
              <span className="text-name font-medium whitespace-nowrap text-fg-muted">{label}</span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerRegion,
  DrawerTitle,
  DrawerTrigger,
  drawerRegionWidthPx,
}
export type { DrawerMount, DrawerSize, DrawerStep }
