import * as React from "react"
import { ArrowBigUp, Command, CornerDownLeft, Option } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A keystroke, drawn as a key.
 *
 * **The string is the source of truth, and it is one string.** A shortcut has to
 * be said three times — on the key cap, in `aria-keyshortcuts`, and in the
 * listener that fires it — and three hand-written copies is how a button ends
 * up showing `⌘⏎` while listening for plain Enter. Everything here is derived
 * from one `"mod+enter"`.
 *
 * `mod` is **⌘ on a Mac and Ctrl everywhere else**, which is the only modifier
 * token that has to change per platform. Write `mod`, never `cmd` or `ctrl`,
 * unless you genuinely mean that one key on every machine.
 */

/** Platform, read once. Not in `useEffect` — the cap would flash the wrong key
 *  for a frame on every mount, and this cannot change during a session. */
const IS_MAC =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.userAgent + (navigator.platform ?? ""))

type KeyCap = { label: string; Glyph?: typeof Command; wide?: boolean }

const CAPS: Record<string, () => KeyCap> = {
  mod: () => (IS_MAC ? { label: "Command", Glyph: Command } : { label: "Ctrl", wide: true }),
  cmd: () => ({ label: "Command", Glyph: Command }),
  ctrl: () => ({ label: "Ctrl", wide: true }),
  shift: () => ({ label: "Shift", Glyph: ArrowBigUp }),
  alt: () => (IS_MAC ? { label: "Option", Glyph: Option } : { label: "Alt", wide: true }),
  enter: () => ({ label: "Enter", Glyph: CornerDownLeft }),
  esc: () => ({ label: "Esc", wide: true }),
  escape: () => ({ label: "Esc", wide: true }),
}

/** `"mod+enter"` → the caps to draw. Anything unrecognised is drawn as itself,
 *  uppercased — `mod+k` gives `⌘ K` with no entry needed. */
export function parseShortcut(shortcut: string): KeyCap[] {
  return shortcut
    .split("+")
    .map((raw) => raw.trim().toLowerCase())
    .filter(Boolean)
    .map((token) => CAPS[token]?.() ?? { label: token.toUpperCase(), wide: token.length > 1 })
}

/** The value `aria-keyshortcuts` wants — space-separated, `+` joined, and it
 *  names the keys rather than drawing them. */
export function ariaShortcut(shortcut: string): string {
  return shortcut
    .split("+")
    .map((raw) => raw.trim().toLowerCase())
    .filter(Boolean)
    .map((t) => (t === "mod" ? (IS_MAC ? "Meta" : "Control") : t.charAt(0).toUpperCase() + t.slice(1)))
    .join("+")
}

/** Does this event fire `shortcut`? The same string the cap was drawn from. */
export function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const tokens = shortcut
    .split("+")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  const wantMod = tokens.includes("mod")
  const wantShift = tokens.includes("shift")
  const wantAlt = tokens.includes("alt")
  const key = tokens.filter((t) => !["mod", "cmd", "ctrl", "shift", "alt"].includes(t))[0]
  if (!key) return false
  if (e.key.toLowerCase() !== (key === "esc" ? "escape" : key)) return false
  // `mod` is satisfied by EITHER ⌘ or Ctrl. A Mac user on an external PC
  // keyboard reaches for Ctrl, and refusing it is a bug they cannot report.
  if (wantMod !== (e.metaKey || e.ctrlKey)) return false
  if (wantShift !== e.shiftKey) return false
  if (wantAlt !== e.altKey) return false
  return true
}

/**
 * **It takes its colour from whatever it sits in.** `currentColor` throughout,
 * so one cap works on a near-black primary button, in a menu row and on the
 * sheet, with no variant per ground. Hard-coding is what made the first one
 * invisible in dark mode.
 *
 * ### 24 inside 32, four from the edge
 *
 * Drawn on the Shape + Hierarchy board (`815:42868`), and it solves the problem
 * two earlier attempts did not.
 *
 * The first cap was 16 tall, floating in the middle of a 32px button with 12px
 * of face all round it — a small box adrift inside a bigger box, which is why
 * it read as a button within a button. Quietening it (border off, tint down,
 * ink to 65%) treated the symptom. Deleting the box and leaving bare glyphs
 * treated it differently and lost the thing a cap is *for*: saying **key**.
 *
 * **There is no face — Jaseem took it off.** Pinning the box to the button's
 * right end stopped it floating, but a second filled rectangle inside every
 * button still added an edge the eye has to resolve, and across a screenful of
 * them that reads as clutter. The glyphs alone say *key*: they are ⌘ and
 * `corner-down-left`, marks that exist nowhere else in the product.
 *
 * With the face gone the cap is simply CONTENT, so it lives inside the button's
 * own padding — 12 from the right edge, the same inset the label has on the
 * left. The old `-mr-2` existed to pull a boxed cap out to 4, and a bare glyph
 * that close reads as falling off the end.
 *
 * | | |
 * |---|---|
 * | **No face, no border** | A filled box inside a filled button is a button within a button; quietening it (border off, tint down) only ever treated the symptom |
 * | **Glyphs at 70%** | The board sets `ink/fg-ghost` on ink; as an alpha of the button's own foreground that is ~72%, and expressed that way it survives every ground |
 * | **Content at 12/11, not 14/10** | The cap is a footnote on the verb, not a second label. A 14px ⌘ beside a 13px word read as loud as the word; and a 14px glyph next to a 10px letter meant the two kinds of cap did not even match each other. 12px glyph, 11px letter — one optical size, a rung under the label |
 * | **Stroke 1.5** | §13 — an icon carries the optical weight of the text beside it, and lucide's default 2 is a heavier line than a 13px/500 label |
 *
 * **The glyphs are lucide, not the characters.** The board types `⌘↩` because
 * Figma has no icon for either; the product has the real marks, and a typed
 * `↩` is a different shape from `corner-down-left` at a different weight.
 */
export function Kbd({
  keys,
  className,
  ...props
}: React.ComponentProps<"kbd"> & { keys: string }) {
  const caps = parseShortcut(keys)
  return (
    <kbd
      data-slot="kbd"
      aria-hidden
      className={cn(
        // **The face keeps full `currentColor`; only the CONTENT is dimmed.**
        // Dimming the element's own `color` would drag `bg-current/10` down
        // with it — the two multiply, and the cap goes half as visible as the
        // number says. Opacity on the children is the one place that cannot
        // happen.
        "inline-flex h-6 items-center gap-0.5 text-current",
        className,
      )}
      {...props}
    >
      {caps.map((cap, i) =>
        cap.Glyph ? (
          <cap.Glyph key={i} className="size-3 stroke-[1.5] opacity-70" />
        ) : (
          <span key={i} className="font-mono text-[11px] leading-none font-semibold opacity-70">
            {cap.label}
          </span>
        ),
      )}
    </kbd>
  )
}
