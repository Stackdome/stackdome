import * as React from "react"

import { cn } from "@/lib/utils"
import {
  useSelectionSlide,
  SELECTION_SLIDE_TRANSITION,
} from "@/hooks/use-selection-slide"

export interface SegmentedControlOption<T extends string> {
  value: T
  /** Omit for an icon-only segment — `label` is still required as the a11y name. */
  label: string
  icon?: React.ReactNode
  /** Renders the label visually; an icon-only segment keeps it for screen readers. */
  showLabel?: boolean
  disabled?: boolean
}

const SIZES = {
  // §8 — the track takes the radius of its own height and the segment takes one
  // rung down, because it sits 2px inside it. Concentric, not coincident: an
  // inset face repeating its container's radius reads as a fatter corner.
  // **32 is the control rung** (§5), and the 2px well is inside it — so the
  // segment is 28, not 32. `iconOnly` drops the horizontal padding entirely and
  // pins the width to that same 28, because a lone glyph in a square is the
  // shape this control has; `px` on an icon makes a squat rectangle instead.
  sm: { track: "h-7 rounded-sm p-0.5", segment: "px-[11px] gap-1 rounded-[4px]", iconOnly: "w-6 px-0" },
  default: { track: "h-8 rounded-md p-0.5", segment: "px-[13px] gap-1.5 rounded-sm", iconOnly: "w-7 px-0" },
} as const

/**
 * Two or three mutually exclusive views of the same thing (§7 — the list/cards
 * toggle). Not two buttons and not a dropdown: a segmented control shows every
 * option and which one is live in a single glance.
 *
 * **Selection is carried by ink, never by opacity.** A dimmed icon reads as
 * disabled, and the one state this control exists to report would then be
 * indistinguishable from the one state it must never be confused with.
 *
 * **A card in a well** (board 227:1175). The track is the FRAME colour with
 * 2px of padding and no line of its own; the selected segment is `--card` with
 * `elevation/sm`, inset on all four sides. The gap around it IS the divider,
 * so there are no rules to draw and none to double.
 *
 * This replaced a bordered strip: track hairline, segments flush to its edge,
 * and the selected segment drawing the divider as its own border so the two
 * lines could never sit 2px apart. That worked, but it spent a hairline and two
 * conditional borders to say what 2px of padding says on its own.
 *
 * **Radius is concentric.** The segment takes one rung below the track — 6
 * inside 8 — because an inset face repeating its container's corner reads as a
 * fatter corner, not a nested one.
 *
 * **Hover moves the ink only.** Same as the tabs: an unselected segment is a
 * word you can reach, not a face to light up. A wash there would put a second
 * raised shape inside a control whose whole job is to show which one is live.
 *
 * Keyboard: `role="radiogroup"` with roving focus — arrows move the selection,
 * Home/End jump to the ends, and Tab enters and leaves the group once.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  size = "default",
  fill = false,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: {
  options: SegmentedControlOption<T>[]
  value: T
  onValueChange: (value: T) => void
  size?: keyof typeof SIZES
  /**
   * Fill the width and split the segments evenly — the shape a **form field**
   * needs, where every control's trailing edge lands on the grid (`FieldShell`).
   *
   * Off by default, which is the toolbar shape: `Status: All` hugs its word and
   * a record's member hugs its options, because there is no column to line up
   * with. A two-way choice inside a repeating row is the same control at its
   * natural width.
   */
  fill?: boolean
  disabled?: boolean
  className?: string
  "aria-label"?: string
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const s = SIZES[size]
  // The selected face travels rather than blinking — the same mechanic the
  // editor tabs use, from the same hook so the two cannot drift.
  const { trackRef, box, armed } = useSelectionSlide(value, options.length, "[data-segment]")

  const selectable = options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !o.disabled && !disabled)

  function move(from: number, step: number) {
    if (!selectable.length) return
    const at = selectable.findIndex(({ i }) => i === from)
    const next = selectable[(at + step + selectable.length) % selectable.length]
    onValueChange(next.o.value)
    refs.current[next.i]?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1
          : 0
    if (step) {
      e.preventDefault()
      move(index, step)
      return
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault()
      const edge = e.key === "Home" ? selectable[0] : selectable[selectable.length - 1]
      if (!edge) return
      onValueChange(edge.o.value)
      refs.current[edge.i]?.focus()
    }
  }

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "relative",
        // **A WELL, not a bordered strip** (board 227:1175). The track is the
        // FRAME colour with 2px of padding and no line at all, and the selected
        // segment is a card floating inside it. It used to be `--control` plus
        // a hairline with the segments flush to its edge, which meant the
        // selected segment had to draw the divider as its own border to avoid
        // doubling up beside the track's. Inset, there is nothing to double —
        // the gap IS the divider, so the rules are gone.
        "bg-background inline-flex items-center overflow-hidden",
        fill && "flex w-full",
        s.track,
        disabled && "opacity-50",
        className,
      )}
    >
      {/* The travelling face. Behind the labels, so the ink on top never
          cross-fades with it. `inset-y-0.5` is the well's own 2px, so the card
          is inset on all four sides without the hook having to carry a y. */}
      {box && (
        <span
          aria-hidden
          data-slot="segment-indicator"
          className={cn(
            "bg-card absolute left-0 inset-y-0.5 shadow-sm",
            s.segment.match(/rounded-\S+/)?.[0],
            armed && SELECTION_SLIDE_TRANSITION,
            disabled && "opacity-50",
          )}
          style={{ transform: `translateX(${box.x}px)`, width: box.w }}
        />
      )}
      {options.map((option, index) => {
        const selected = option.value === value
        const isDisabled = disabled || option.disabled
        const iconOnly = Boolean(option.icon) && !(option.showLabel ?? !option.icon)
        return (
          <button
            key={option.value}
            ref={(el) => { refs.current[index] = el }}
            type="button"
            role="radio"
            data-segment=""
            data-active={selected}
            aria-checked={selected}
            aria-label={option.label}
            disabled={isDisabled}
            // Roving tabstop: the group is one Tab stop, arrows move inside it.
            tabIndex={selected ? 0 : -1}
            onClick={() => !isDisabled && onValueChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              // **`meta/500` — 12/16 at weight 500**, per the board. This ran at
              // body size and weight 400; the control is chrome sitting beside
              // content, so it steps down a rung and takes the medium weight
              // that every other piece of chrome in the shell carries.
              "relative inline-flex h-full items-center justify-center whitespace-nowrap text-meta font-medium transition-colors",
              "focus-ring-inset",
              "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              s.segment,
              iconOnly && s.iconOnly,
              // Even halves, so a two-option field reads as one control split
              // down the middle rather than two words of different lengths.
              fill && "flex-1",
              // Ink vs fg-muted. NOT opacity — see the component note.
              //
              // `shadow-sm` is the one place a piece of CONTENT is allowed an
              // elevation (§5). The selected segment is not floating over the
              // page — it is a raised face inside a well, the same idea as a
              // key on a keyboard, and the board draws it that way. The track's
              // `overflow-hidden` clips the shadow at three sides, so what you
              // actually see is a soft lift along the divider.
              //
              // On focus the ring (unlayered CSS) overwrites this shadow, which
              // is fine: a 3.5% lift under a solid 2px blue ring is invisible.
              // **Hover moves the INK and nothing else** — the same thing the
              // tabs do. An unselected segment is a word you can reach, not a
              // face you can light up; giving it a wash put a second raised
              // shape in a control whose entire job is to show which ONE is
              // live.
              // The FACE is the indicator above; the button only owns its ink.
              selected ? "text-foreground" : "text-fg-muted hover:text-foreground",
              isDisabled && "cursor-not-allowed text-fg-ghost hover:text-fg-ghost",
            )}
          >
            {option.icon}
            {(option.showLabel ?? !option.icon) && <span>{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
