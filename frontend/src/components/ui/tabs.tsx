import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"
import { SELECTION_SLIDE_TRANSITION, useSelectionSlide } from "@/hooks/use-selection-slide"

/**
 * **`asChild` lends the root to something that already has a layout.**
 *
 * The default column (`flex flex-col gap-2`) is right when Tabs owns the box it
 * renders. It is wrong when the root is being merged onto a surface that lays
 * itself out — the drawer region is a three-row grid, and Radix's `Slot`
 * concatenates the two class strings without resolving them, so `flex` and
 * `grid` both land on one element and CSS source order decides which wins.
 *
 * Under `asChild` the child owns its layout and Tabs contributes only its
 * behaviour, which is the whole point of lending the root away.
 */
function Tabs({
  className,
  asChild,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      asChild={asChild}
      className={asChild ? className : cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

/**
 * **The look, in one string, because two rows wear it.**
 *
 * The stack editor's section row (`Architecture ǀ Deployments ǀ Logs ǀ Metrics`)
 * cannot be a Radix `Tabs`: its canvas body stays mounted across tab changes so
 * an open inspector and a node selection survive, and `TabsContent` unmounts.
 * So it stays a controlled `<nav>` — but it must not therefore be a second
 * DESIGN. These two exports are what it shares, and between them and
 * `useSelectionSlide` there is nothing left for the two rows to drift on.
 *
 * 32 tall at radius 8 (§2 makes radius a function of height, and a tab is a
 * 32px box like every other control on its row). Hover is **ink**, never a
 * second wash: a fainter tint under the pointer looks like the selection two
 * rungs down, and while the travelling face is mid-flight there would be two
 * washes lit and no telling which tab you were on (§7).
 */
export const TAB_TRIGGER_CLASS = cn(
  // `relative`, and no face of its own: the wash is drawn once by the
  // travelling indicator and the label sits on top of it.
  "relative inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3",
  "text-body font-medium whitespace-nowrap transition-colors duration-150",
  "focus-ring-edge disabled:pointer-events-none disabled:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
)

/**
 * The travelling face. Behind the labels, so the ink on top never cross-fades
 * with it. `armed` is false for the first placement only — opening a screen
 * must not slide the face in from the left.
 *
 * **`--well`, the segmented control's track tint — not `--wash-selected`.**
 * Jaseem, August 2026: the selected tab was too heavy. `--wash-selected` is the
 * selection rung of the interaction ladder, built to hold a picked ROW against
 * the rows either side of it; a tab strip has four items and one of them is
 * always lit, so it never needed that much ink to say which. `--well` is the
 * same ink two rungs back — 4% against the sheet — and it is the value already
 * standing for "a recess a control sits in".
 *
 * **Only the face changed.** The strip keeps its bare ground, the trigger keeps
 * 32/8, and the box is the same box: a tab strip is navigation on a surface,
 * not a closed choice in a well.
 */
export function TabIndicator({ box, armed }: { box: { x: number; w: number }; armed: boolean }) {
  return (
    <span
      aria-hidden
      data-slot="tab-indicator"
      className={cn(
        "absolute left-0 top-0 h-8 rounded-md bg-[var(--well)]",
        armed && SELECTION_SLIDE_TRANSITION,
      )}
      style={{ transform: `translateX(${box.x}px)`, width: box.w }}
    />
  )
}

/**
 * **Which trigger is active, read off the DOM.**
 *
 * `useSelectionSlide` needs a key that changes when the selection moves, and
 * `TabsList` has none: Radix keeps the value in a context it does not export,
 * and threading it in as a prop would mean every call site writing down a fact
 * the component is already standing next to.
 *
 * Radix stamps `data-state` on each trigger, so the list watches its own
 * subtree for that attribute changing. Self-contained — a consumer passes
 * nothing and gets the travel.
 */
function useActiveTabValue(track: HTMLElement | null) {
  const [value, setValue] = React.useState<string | null>(null)
  React.useLayoutEffect(() => {
    if (!track) return
    const read = () =>
      setValue(track.querySelector('[data-state="active"]')?.getAttribute("data-value") ?? null)
    read()
    const mo = new MutationObserver(read)
    mo.observe(track, { subtree: true, attributes: true, attributeFilter: ["data-state"] })
    return () => mo.disconnect()
  }, [track])
  return value
}

/**
 * **The track carries nothing but the travelling face.** No border, no rounding
 * of its own — the only mark on the row is the wash under the tab you are on. A
 * rounded box around a group of tabs is a segmented control, which is a form
 * input that commits a value; tabs are navigation, and drawing them the same
 * way was how one screen ended up with a picker and a nav that looked identical.
 *
 * 2px apart: at 4 in bordered boxes, four navigation targets read as four
 * controls; at 2 with no border they read as one group.
 *
 * ### The selection travels; it does not blink
 *
 * The wash used to belong to each trigger, so switching turned one background
 * off and another on in the same frame. Nothing carried you across — and on a
 * row of two or three words that is the one moment where motion earns its keep:
 * it says *this became that*, which is exactly what a selection change is.
 *
 * The mechanic is `useSelectionSlide`, the same one the stack editor's section
 * tabs and the segmented control already run on. **That is the whole point of it
 * living here**: the editor's row and this one were two implementations of one
 * idea, and only one of them moved.
 */
function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  // Held here as well as in the hook: the active-value watcher needs the node,
  // and the hook only hands back a setter for it.
  const [track, setTrack] = React.useState<HTMLElement | null>(null)
  const activeValue = useActiveTabValue(track)
  const { trackRef, box, armed } = useSelectionSlide(
    // The active value is the key; the child count is what re-measures when
    // triggers are added or removed.
    activeValue ?? "",
    React.Children.count(children),
    '[data-slot="tabs-trigger"]',
    '[data-state="active"]',
  )
  const setRefs = React.useCallback(
    (node: HTMLElement | null) => {
      setTrack(node)
      trackRef(node)
    },
    [trackRef],
  )
  return (
    <TabsPrimitive.List
      ref={setRefs}
      data-slot="tabs-list"
      // **No ground of its own.** A tab strip is not a segmented control: the
      // segment set is a closed choice in a well, and a tab strip is navigation
      // laid on the surface it belongs to. Only the SELECTED tab is painted.
      className={cn("relative inline-flex h-8 w-fit items-center gap-0.5", className)}
      {...props}
    >
      {box && <TabIndicator box={box} armed={armed} />}
      {children}
    </TabsPrimitive.List>
  )
}

/**
 * **One tab design, and it is the stack editor's.**
 *
 * The two were built apart and disagreed on every mark they share: this one had
 * a transparent border, `rounded-sm`, `px-2`, `flex-1` (so two tabs split their
 * track in half like a segmented control), and an active face of
 * `foreground/[0.07]` — a hand-thinned ink that skips the wash ladder's dark
 * correction, so it lands a different distance in each theme. The editor's ran
 * 32/8, `px-2.5`, no border, and `--wash-selected`. Both were on screen at once
 * on the stack editor, 12px apart, once the resource drawer grew tabs.
 *
 * | | |
 * |---|---|
 * | **32 tall, radius 8** | §2 makes radius a function of height, and a tab is a 32px box like every other control on its row |
 * | **`--wash-selected`, not a thinned ink** | The ladder is the only thing that corrects for dark; a hand-mixed alpha does not |
 * | **Hover is INK, never a second wash** | A fainter tint under the pointer looks like the selection two rungs down, and while the two are both lit there is no telling which tab you are on (§7) |
 * | **No `flex-1`** | A tab is as wide as its word. Stretching two tabs to fill a track is a segmented control's behaviour, and it is what made this look like one |
 */
function TabsTrigger({
  className,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      // Radix stamps `data-state`; it does not stamp the value. `TabsList`'s
      // watcher needs a key that identifies WHICH tab went active, not just
      // that one did — two triggers swapping state in the same frame are
      // otherwise indistinguishable from the DOM.
      data-value={value}
      className={cn(
        TAB_TRIGGER_CLASS,
        "text-fg-muted hover:text-foreground data-[state=active]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 focus-ring-edge",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
