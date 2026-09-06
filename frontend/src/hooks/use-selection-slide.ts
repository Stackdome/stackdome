import { useLayoutEffect, useState } from "react"

/**
 * **The selection travels; it does not blink.**
 *
 * The face used to belong to each item, so switching turned one background off
 * and another on in the same frame. Nothing carried you across, and on a row of
 * a few words that is the one moment where motion earns its keep: it says *this
 * became that*, which is exactly what a selection change is.
 *
 * One absolutely-positioned face behind the row, moved to the active item's box.
 *
 * | | |
 * |---|---|
 * | **A CSS transition, never keyframes** | These get clicked fast and often, and a transition is interruptible — a second click retargets from wherever the face is, instead of queueing a second run |
 * | **`transform` and `width` only, never `all`** | Both composite; `all` would sweep up the colour change and cost a paint per frame |
 * | **180ms** | Long enough to be followed across ~300px, short enough to be over before the body under it has repainted |
 * | **Nothing animates on arrival** | The face is placed before first paint and only then allowed to transition, so opening the screen does not slide it in from the left |
 * | **Motion is never the only signal** | The label changes tier at the same time, and the ARIA state is what actually reports the selection |
 *
 * Lifted out of `canvas-editor-shell.tsx`, which had the only copy — the
 * segmented control is the second face on this mechanic and a second copy is
 * how the two would drift.
 *
 * @param activeKey re-measure when the selection moves
 * @param count re-measure when items are added or removed
 * @param itemSelector the children to watch for resize, alongside the track
 * @param activeSelector how the active child announces itself. Defaults to the
 *   hand-rolled `data-active`; Radix-backed rows are already publishing
 *   `data-state="active"` and must not be made to write the fact twice.
 */
export function useSelectionSlide(
  activeKey: string,
  count: number,
  itemSelector = "[data-tab]",
  activeSelector = "[data-active='true']",
) {
  // **A callback ref, not `useRef`.** One caller PORTALS its row into a sheet
  // header, and the portal target is only found after the header has mounted —
  // so on the first layout pass the row does not exist yet, a plain ref reads
  // null, and nothing re-runs the effect when it finally appears. The face
  // measured zero and never drew. Holding the node in state is what makes its
  // arrival a dependency.
  const [track, setTrack] = useState<HTMLElement | null>(null)
  const [box, setBox] = useState<{ x: number; w: number } | null>(null)
  // The first placement must not animate. Anything after it must.
  const [armed, setArmed] = useState(false)

  useLayoutEffect(() => {
    if (!track) return
    const measure = () => {
      const active = track.querySelector<HTMLElement>(activeSelector)
      if (!active) return
      setBox({ x: active.offsetLeft, w: active.offsetWidth })
    }
    measure()
    // Widths are set by their words, so they move when the webfont swaps in or
    // the container is resized. Without this the face keeps the width it was
    // measured at and sits proud of the label it is meant to be behind.
    // Wrapped rather than passed straight in: `measure` takes no arguments and
    // ResizeObserver hands its callback two, which reads as a mismatched
    // signature to a static analyser and to the next person.
    const ro = new ResizeObserver(() => measure())
    ro.observe(track)
    track.querySelectorAll(itemSelector).forEach((el) => ro.observe(el))
    return () => ro.disconnect()
  }, [track, activeKey, count, itemSelector, activeSelector])

  useLayoutEffect(() => {
    if (!box || armed) return
    const id = requestAnimationFrame(() => setArmed(true))
    return () => cancelAnimationFrame(id)
  }, [box, armed])

  return { trackRef: setTrack, box, armed }
}

/** The one motion string, so the two faces cannot drift apart. */
export const SELECTION_SLIDE_TRANSITION =
  "transition-[transform,width] duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
