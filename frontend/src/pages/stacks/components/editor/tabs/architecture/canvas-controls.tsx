import type { ReactNode } from "react";
import { Panel, useReactFlow, useViewport } from "@xyflow/react";
import { Minus, Plus, Wand2, Workflow } from "lucide-react";
import { cn, washes } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CanvasControlsProps {
  showConnections: boolean;
  onToggleConnections: () => void;
  onAutoLayout: () => void;
  /** The add-resource trigger. Its own island, after the other two. */
  children?: ReactNode;
}

/**
 * **A viewport change is a large surface moving, so it moves.**
 *
 * `zoomIn()`, `zoomOut()` and `zoomTo()` are called with a duration now. They
 * had none, so every step was a hard cut — the graph was simply somewhere else
 * on the next frame and you had to re-find what you were looking at. 200ms is
 * the rail's and the drawer's number (`--rail-duration`); React Flow takes
 * milliseconds and applies its own curve, so the token cannot be passed through,
 * but the *duration* is the same one the rest of the product's large movements
 * use.
 */
const VIEWPORT_MS = 200;

/** Reset target for the zoom readout — 1:1, the scale the nodes are drawn at. */
const ZOOM_RESET = 1;

/**
 * **The island holds the control; it does not decorate it.**
 *
 * Card ground, hairline, `shadow-sm` — the same three things that make a card a
 * card (§3), and the same material `Button variant="outline"` and the selected
 * nav row already ship. It replaced `bg-control` with a border and no shadow,
 * which put the chrome **below** the drawing: measured, the group was `#F7F6F3`
 * on a `#FBFBF8` canvas with `box-shadow: none`, while every node card beside it
 * was white and carried `shadow-md`. Grey recedes (§3), so the toolbar read as a
 * hole in the canvas and the thing it sits over floated above it.
 *
 * **An outline, not a border.** The island floats, and §5's rule puts the
 * hairline outside the box so the drawn size and the spec'd size stay one
 * number — 32 high with 2px of padding and a 28px cell inside it, not 34.
 *
 * **`--border-subtle` (6%), not `--border` (11%).** The ladder splits by job,
 * and the job here is the same one the node cards do: a surface that FLOATS and
 * carries its own shadow does not need the line to hold it off the ground. At
 * 11% the toolbar drew a heavier line than the cards it sits among, which put
 * the chrome above the drawing — the opposite of the fault this island was last
 * fixed for. One value across all three islands and the cards.
 *
 * **32 outside, 2 of padding, 28 inside — concentric.** The old group was `h-8
 * p-0.5` around `size-8` cells, so the padding never happened: measured, cell
 * and track were both 32 tall at the same `y`, the cell's hover wash ran *under*
 * the track's own border, and a 5px corner sat inside an 8px corner at the same
 * point. `size="icon-sm"` is 28 and takes `rounded-sm` from the radius ladder on
 * its own (§2), which is the same well the segmented control settled on.
 */
const ISLAND =
  "flex h-8 flex-none items-center gap-0.5 rounded-md bg-card p-0.5 shadow-sm " +
  "[outline-width:1px] [outline-style:solid] [outline-color:var(--border-subtle)]";

/**
 * **Everything that acts on the DRAWING, at the canvas's top-left — in three
 * islands, sorted by what each one acts on.**
 *
 * These were three clusters in two corners: a vertical zoom pill and a layout
 * pill at the bottom-left, and `Add resource` alone at the top-right. That split
 * them by *shape* — icons here, a labelled button there — when what they have in
 * common is the thing they act on. None of them is an operation on the stack;
 * the stack's own actions live in the header (§12a's four zones).
 *
 * They then spent a pass as **one** bar with a single divider, which was the
 * opposite mistake: seven controls in one track says they are seven of a kind,
 * and they are not. A divider inside a track ranks things; a gap between islands
 * says they are different *kinds*.
 *
 * | Island | Holds | Acts on |
 * |---|---|---|
 * | **The view** | `−` · the level · `+` | The viewport. **Nothing changes** — you are only looking from somewhere else |
 * | **The drawing** | Auto layout · connections | How the graph is drawn: one rearranges it, one shows or hides the wires |
 * | **The add** | `Add resource` | The stack's contents. The only one that puts something new on the canvas |
 *
 * **8 between islands** — the ladder's step below the default (§8), and four
 * times the 2px inside a track, so the two rhythms cannot be confused.
 */
export function CanvasControls({
  showConnections,
  onToggleConnections,
  onAutoLayout,
  children,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, zoomTo } = useReactFlow();
  // `useViewport` re-renders on every viewport change, including pinch and
  // wheel — so the readout reports the actual scale, not just what the two
  // buttons beside it did.
  const { zoom } = useViewport();

  return (
    <Panel position="top-left" className="!m-4">
      <div className="flex items-center gap-2">
        <div className={ISLAND}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            onClick={() => zoomOut({ duration: VIEWPORT_MS })}
          >
            <Minus />
          </Button>
          {/* **The readout is the control.** A number you cannot act on would be
              the one dead thing in a row of live ones — and "back to 1:1" had no
              home before this. It is also the ONLY way back to 100%: `Fit to
              view` sat beside it as a second icon doing a job you could not tell
              apart, because `FIT_OPTIONS` caps at `maxZoom: 1` and therefore
              lands on exactly 100% for any graph that already fits. Fitting
              still happens — on load, and after every auto layout
              (`use-canvas-graph.ts`) — it just no longer has a button competing
              with the number for the same outcome.

              **A fixed 56 — two cell widths — so the island never resizes.**
              `tabular-nums` pins the digit ADVANCE, not the digit COUNT: at
              `50%` the readout is one glyph narrower than at `200%`, so the
              island and everything right of it stepped sideways on the way
              through 100%. The width now covers the widest value the zoom range
              can produce and the `+` never moves under the cursor that is
              clicking it. 56 is 28 × 2 — the cell rung, not a measured
              one-off. */}
          <Button
            variant="ghost"
            size="sm"
            className="w-14 px-0 tabular-nums font-normal text-fg-muted"
            aria-label="Reset zoom to 100%"
            title="Reset zoom to 100%"
            onClick={() => zoomTo(ZOOM_RESET, { duration: VIEWPORT_MS })}
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            onClick={() => zoomIn({ duration: VIEWPORT_MS })}
          >
            <Plus />
          </Button>
        </div>

        <div className={ISLAND}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Auto layout"
            title="Auto layout"
            onClick={onAutoLayout}
          >
            <Wand2 />
          </Button>
          {/* **The only STATE in the group, and the ladder is what says so.**
              Hover and "on" both used to paint 6% ink, measured — so a button
              you were merely pointing at was the same pixel as the toggle that
              was live, which is the exact fault the editor tabs fixed. `washes`
              is the one implementation of the three rungs: hover 4%, selected
              6%, and a selected face takes no hover (§4). */}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={showConnections ? "Hide connections" : "Show connections"}
            aria-pressed={showConnections}
            title={showConnections ? "Hide connections" : "Show connections"}
            onClick={onToggleConnections}
            className={cn(washes(showConnections), !showConnections && "text-fg-muted")}
          >
            <Workflow />
          </Button>
        </div>

        {children && <div className={ISLAND}>{children}</div>}
      </div>
    </Panel>
  );
}
