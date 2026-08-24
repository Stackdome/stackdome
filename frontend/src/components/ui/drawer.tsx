"use client"

import * as React from "react"
import { createPortal } from "react-dom"
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
/**
 * Where the drawer is mounted, and therefore which arithmetic its band runs.
 *
 * | Mount | What it is |
 * |---|---|
 * | `modal` | A dialog over the page — Radix owns the title, the close and the dismiss |
 * | `region` | A slice OF the sheet, divided from its neighbour by one hairline |
 * | `peer`   | A SHEET beside the sheet — its own card, on the board's 108 band |
 *
 * `peer` is `region` plus a promotion, so everything that asks "is there a
 * Radix dialog above me?" asks `!== "modal"` rather than naming one of them.
 */
type DrawerMount = "modal" | "region" | "peer"

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
          "bg-popover fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border-subtle shadow-2xl",
          // The content takes the focus on open (see `onOpenAutoFocus`), and a
          // container is not a control — so it must not draw a ring. The
          // dialog role is what announces it; the outline would only say "this
          // 640px panel is focused", which nobody needed telling.
          "outline-none",
          // **The column is `minmax(0,1fr)`, not `1fr`.** A grid item's
          // automatic minimum size is its min-content on BOTH axes, so a band
          // holding an unbreakable string — a 56-character cluster name in the
          // header, a URL in a row — sets the track wider than the drawer and
          // every band stretches to match. Measured at 480: a long title took
          // the track to 522 and pushed the body 42px past the panel's own
          // edge, taking its 20px inset with it. Capping the track at 0 hands
          // the shrinking back to the `truncate` and `min-w-0` the bands
          // already carry.
          "grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto]",
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
const PEER_SHEET_SLOT_ID = "peer-sheet"

/** The paper showing between the two cards (§12's 8px mount). A detached
 *  region costs its neighbour this much on top of its own width, and the
 *  canvas has to pan by the total — so the number lives beside the width
 *  rather than only in a Tailwind class in the layout. */
const PEER_SHEET_GUTTER_PX = 8

/**
 * The slot beside the main sheet, if the shell is drawing one.
 *
 * Resolved in an effect rather than read during render: the slot is a plain
 * div in the layout, and on the first commit of a page that mounts a detached
 * region the ref is already there — but a story (or a test) that renders the
 * region with no shell around it has no slot at all, and must fall back to
 * rendering in place rather than vanishing.
 */
function usePeerSheetSlot(enabled: boolean): HTMLElement | null {
  const [slot, setSlot] = React.useState<HTMLElement | null>(null)
  React.useEffect(() => {
    if (!enabled) { setSlot(null); return }
    setSlot(document.getElementById(PEER_SHEET_SLOT_ID))
  }, [enabled])
  return slot
}

function DrawerRegion({
  className,
  size = "form",
  detached = false,
  open = true,
  children,
  ...props
}: React.ComponentProps<"aside"> & { size?: DrawerSize; detached?: boolean; open?: boolean }) {
  const slot = usePeerSheetSlot(detached)
  const region = (
    <DrawerMountContext.Provider value={detached ? "peer" : "region"}>
      <aside
        data-slot="drawer-region"
        // The column outside reads this to decide whether it is open. It is on
        // the PANEL rather than on the slot because the panel is what knows —
        // and because it has to stay `closed` for one frame after mounting, or
        // the track jumps to full width with nothing to animate from.
        data-state={detached ? (open ? "open" : "closed") : undefined}
        className={cn(
          "grid h-full flex-none grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto]",
          // **The sheet, not the frame.** It shipped on `--background` — the
          // paper the sheet is laid on — which was invisible while the canvas
          // beside it was also off-white. Now that the canvas is the sheet, the
          // inspector was the one grey region in the editor: a grey panel with a
          // white canvas on its left and a white sheet above it. §15 settled
          // that this is a region OF the sheet; this is that sentence in code.
          // **It casts `--shadow-region`, which is `lg` turned on its side.**
          //
          // A region does not float — it takes space from the canvas rather
          // than covering it — so it shipped with no shadow at all, held by one
          // hairline. Against a dot-grid canvas that hairline is the only thing
          // saying where the sheet stops, and a 1px line at 11% loses to a
          // field of dots. The shadow is what separates the panel from the
          // graph beside it; the hairline still draws the seam itself.
          //
          // `shadow-lg` was the first answer, because `elevation/lg` is what the
          // board draws on this frame. It was invisible: `lg` is a *downward*
          // pool (`0 20px 50px -22px`), and this panel is full height, so its
          // top and bottom are flush and the only edge it can cast from is the
          // left one — where `lg` reaches 3px. `--shadow-region` is the same
          // ink and the same blur with the offset moved from `y` to `-x`, so it
          // falls onto the canvas instead of into a clipped seam. See §5.
          // **`relative z-10`, or the shadow paints under the canvas.** The
          // region is a static block and its sibling — the ReactFlow wrapper —
          // is `position: relative`. Positioned elements paint in a later stage
          // than non-positioned ones regardless of `z-index: auto`, so the
          // canvas covered every pixel of shadow that fell onto it. Measured:
          // 0 of 40 columns to the left of the panel differed from the bare
          // canvas by a single value, in both themes. Giving the region a
          // position of its own puts it back in front of its own sibling.
          "relative z-10 bg-card",
          // ── attached: a region OF the sheet ──────────────────────────────
          // One hairline on the inner edge, inside the width, because a
          // one-sided rule is a divider between two things rather than an
          // outline around one of them. `--shadow-region` is `lg` turned on
          // its side so it falls onto the canvas instead of into a clipped
          // seam (see §5).
          // **`border-subtle` (6%), not the 11% hairline.**
          //
          // Both drawers are RAISED surfaces — this one carries
          // `--shadow-region`, the floating one `shadow-2xl` — and the ladder
          // gives 6% to a surface whose shadow is doing the lifting, 11% to a
          // hairline that separates on its own. The sheet and the detached
          // drawer were already at 6%, so the inspector's inner edge was the
          // one raised surface in the editor drawing a heavier line than the
          // surfaces either side of it.
          //
          // It stays a `border-l` and not an outline: a ONE-SIDED rule is a
          // divider between two things rather than an outline around one, so it
          // belongs inside the 480 (§8).
          !detached && "border-l border-border-subtle shadow-[var(--shadow-region)]",
          // ── detached: a SHEET beside the sheet ───────────────────────────
          // **The board's `canvas — 03 inspector` frame.** The panel stops
          // being a slice of the main sheet and becomes a peer of it: its own
          // radius, its own outline, its own shadow, and 8px of the paper
          // frame showing between the two. It runs the full height of the
          // window rather than starting under the page header, so its own
          // 108px band lands on the same baseline as the breadcrumb row.
          //
          // Same material as `SidebarInset` and for the same reason — two
          // cards on one mount have to be cut from one stock. The hairline is
          // an `outline`, not a `border`: it paints OUTSIDE the box, so it
          // costs the 480 nothing and the two headers stay in step.
          detached && "h-full rounded-lg shadow-md outline-1 outline-border-subtle",
          regionSizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    </DrawerMountContext.Provider>
  )
  // No slot means no shell around it — a story, a test, a page that has not
  // opted in. Render in place rather than disappearing.
  return slot ? createPortal(region, slot) : region
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
 * | `steps` | The journey form — the path, `New addon / Postgres` (§12a) |
 *
 * ### The path IS the back button
 *
 * There used to be an arrow to the left of it. It is gone, and the crumbs
 * themselves went live: pass a `{ label, onClick }` instead of a string and that
 * segment becomes a target.
 *
 * **An arrow beside a path is the same control twice.** The path already draws
 * the route — `New stack / A repository / Configure` — and every stop on it is
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
   * The kind mark — for a header naming a thing that has one (a canvas node, a
   * volume, an addon), where the glyph makes a distinction the word alone
   * doesn't (§7).
   *
   * **Pass the bare glyph.** The band draws the 32px tile around it and sizes
   * the mark to 16; a call site that also sets `size-4` or a colour is writing
   * the tile's job down a second time.
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
    <Button variant="ghost" size="icon" className="flex-none" onClick={mount !== "modal" ? onClose : undefined}>
      <XIcon aria-hidden />
      <span className="sr-only">{closeLabel}</span>
    </Button>
  )
  return (
    <div
      data-slot="drawer-header"
      // 20 all round, hairline below. `children` — a tab strip, when a drawer
      // has one — is a second row of the band and carries its own top margin,
      // so the column itself stays at gap 0.
      // **20 above, 16 below, and 12 between the two rows.**
      //
      // The band used to be a flat 20 all round with the tab strip carrying its
      // own `mt-3`, which put the gap in the strip rather than in the band that
      // owns it — so a header with no children spent 20 at the foot and one
      // with a tab strip spent 32, and neither number was written down where
      // you would look for it. The column's own gap is the 12 now, and the
      // shorter foot is what stops the strip floating in the middle of the band.
      className={cn(
        // **The rule is INSIDE the band, not a border on it.**
        //
        // `border-b` is part of the box: a band that pays 16 at the foot
        // measures 17, and the number you wrote down is never the number on
        // screen. Beside a peer sheet that 1px is visible — the sheet header
        // across the gutter draws the same line with `sheet-edge-b`, an inset
        // shadow that costs the box nothing, so the two hairlines landed a
        // pixel apart and the pair stopped reading as one plane.
        //
        // Same mark, same cost, in all three mounts. `sheet-edge-b` is the
        // utility the sheet header and the footer bar already use, and it
        // exists for exactly this reason (see `index.css`).
        "sheet-edge-b flex flex-col gap-3 px-5 pb-4 text-left",
        // **16 above in a peer, 20 in the other two — and that is the board's
        // 108, not a rounding.**
        //
        // A peer sheet's band has to land on the SAME baseline as the sheet
        // header beside it, or the two hairlines cross the 8px gutter at
        // different heights and the pair stops reading as one plane. That
        // header is `16 · 32 · 12 · 32 · 16`; this one has to be the same sum,
        // so the 20 that every other drawer opens with comes off the top.
        mount === "peer" ? "pt-4" : "pt-5",
        className,
      )}
      {...props}
    >
      {/* **One row: tile · text · fact · close, all centred on each other.**
          It used to be a 32px CONTROL row with the description hung underneath
          it as a sibling — which meant the pair's spacing was not a gap at all
          but the leftover of a 20px title inside a 32px box, corrected by a
          `-mt-0.5` that had to be re-derived every time the type changed. The
          text is a column now, so 2px means 2px. */}
      {/* `items-start`: with a 42px tile the row is taller than the 32 controls
          on its trailing edge, and centring those against it floated them in
          the band. They pin to the top of the row instead, level with the
          title. */}
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* **The glyph gets a tile — the same one `PickerRow` draws.**

            A bare 16px mark floating on the sheet beside a 14px word is the
            smallest thing in the band and reads as punctuation on the title
            rather than as the object's kind. Boxed at 32 it is an OBJECT, and
            it lands the header's left edge on the same rung as the row in the
            catalogue you picked this thing out of — so the drawer opens on a
            shape you have already seen.

            32, radius 8, `--control` (a recessed fill), hairline, 16px mark.
            No hover lift: a header is not a row and does not answer the
            pointer. `aria-hidden` because the title beside it says the word. */}
          {leading && (
            <span
              aria-hidden
              data-slot="drawer-header-tile"
              className={cn(
              // **Still 32, but raised instead of recessed.**
              //
              // It was a `--control` WELL — the same tile `PickerRow` draws, so
              // the drawer opened on the shape you picked the thing out of. It
              // is a raised card now: the sheet ground, a hairline and
              // `elevation/md`. The kind is a THING sitting on the band rather
              // than a slot cut into it.
              //
              // The SIZE stays on the 32 rung. Tried at 42 with a 24 glyph to
              // hold its own against the 16px title — that made the mark the
              // loudest thing in a band whose subject is the name beside it.
              // The lift does the work the size was being asked to do.
                "flex size-8 flex-none items-center justify-center rounded-md",
                "border border-border bg-card text-fg-2 shadow-md",
                "[&_svg]:size-4 [&_svg]:shrink-0",
              )}
            >
              {leading}
            </span>
          )}
          {/* Guarded, so a header given neither prop does not emit an EMPTY
            `DrawerTitle` beside whatever its children supply — two titles in
            one dialog, one of them blank, which Radix warns about and screen
            readers read. The slot still holds its width either way.

            **`min-h-8` keeps a title-only header on the 32 rung.** The close
            button is 32 and it is what sets the band's floor; without this the
            row would collapse to the title's own 20 and a header with no
            description would jump 12px shorter than one with. */}
          <div className="flex min-h-8 min-w-0 flex-1 flex-col justify-center gap-0.5">
            <div className="flex min-w-0 items-center gap-2">
              {steps ? (
                <DrawerPathSteps steps={steps} />
              ) : title !== undefined ? (
                <DrawerTitle className="truncate">{title}</DrawerTitle>
              ) : null}
            </div>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </div>
        </div>
        {/* **The close is part of `trailing`, not a sibling of it.**
            It used to render straight into the identity row, so the gap between
            the last trailing control and the ✕ was the ROW's 12 while the
            controls inside `trailing` sat at 6 — two spacings in one strip of
            icon buttons, and the ✕ read as belonging to the band rather than to
            the set beside it. One group at 6; the row's 12 now only separates
            that whole group from the title. */}
        <div className={cn("flex flex-none items-center", mount === "peer" ? "gap-0" : "gap-1.5")}>
          {trailing}
          {mount !== "modal" ? close : <DialogPrimitive.Close asChild>{close}</DialogPrimitive.Close>}
        </div>
      </div>
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
        "flex flex-col gap-4 border-t border-border-subtle p-6",
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
  const Comp = React.useContext(DrawerMountContext) !== "modal" ? "h2" : DialogPrimitive.Title
  return (
    <Comp
      data-slot="drawer-title"
      // **14/20 at 500 — `name/500`.** 500 not 600: semibold is off the
      // scale (§6). And `name`, not `title`: the drawer names itself one
      // rung above the 13px body it holds, matching `SheetHeader`. The
      // drawer keeps its OWN trail, so this does not come through there.
      className={cn("text-title font-medium", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const Comp = React.useContext(DrawerMountContext) !== "modal" ? "p" : DialogPrimitive.Description
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
 * phrase; a box around it would break the phrase into buttons and put the `/`
 * outside them. The row is 32 tall, so the word already clears the target floor
 * vertically.
 *
 * **The separator is `/`, the same mark the sheet's trail uses.** It was `›`,
 * on the reasoning that a slash means *contained by* and a journey is a sequence
 * rather than a hierarchy. True as a sentence, and invisible as a design: seen
 * live, `Stacks / docs-site` in the sheet and `New addon › Postgres` in the
 * drawer 12px below it read as **two components**, not as one idea at two rungs
 * — which is the whole reason this path and `SheetHeader`'s were unified in the
 * first place. A reader cannot recover "sequence vs hierarchy" from a glyph they
 * only ever see one of at a time; they only notice that the product punctuates
 * itself two ways. One mark, everywhere.
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
                /
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
  PEER_SHEET_SLOT_ID,
  PEER_SHEET_GUTTER_PX,
}
export type { DrawerMount, DrawerSize, DrawerStep }
