import type { StatusVariant } from "@/components/branded/status-variant";

/**
 * **One card, two sizes — so there is one rulebook, not two.**
 *
 * The resource card and the attachment card were built independently and
 * disagreed about almost everything they had in common. These are the numbers
 * both now share; they are exported rather than duplicated because a constant
 * copied into a second file is a constant that will drift.
 *
 * **The shape is a shell around a card** — see `shell` and `card`. Both node
 * kinds take it, at their own widths: a workload at 240, an attachment at 180.
 * The size difference is what says one is a workload and the other is not, so
 * it survives the redesign rather than being flattened into one width.
 */
export const NODE_CARD = {
  /**
   * **The shell — the tray a card sits in.** From Jaseem's Figma, Aug 2026
   * (`Shape + Hierarchy Pass`, node 1063:51565).
   *
   * A node is now TWO boxes: a recessed shell and a raised card inside it, with
   * 4px of shell showing all the way round. What docks into a service — its
   * volumes — lives in the shell BELOW the card rather than inside it, which is
   * the whole point of the shape: a volume is attached to the service, not part
   * of it, and the old design said so with nothing but a divider.
   *
   * **The shell is always drawn, even empty.** Jaseem's call. A shell that
   * appeared only when something was docked would make two different objects
   * out of one card, and the board would have two silhouettes for the same
   * kind of thing.
   *
   * `--surface-shell` rather than the board's flat `#f6f6f6`: the product's own
   * recessed rung (4% ink, the value `--well` carries for the tab track and the
   * switch) rather than a cool grey on a warm palette, and it flips to dark on
   * its own. It is that value **flattened** — an OPAQUE colour, not the tint:
   * over a dot grid a 4% film let the field read straight through the tray, so
   * the shell looked like a hole cut in the node rather than a surface under it.
   */
  shell: "rounded-xl bg-surface-shell p-1 outline outline-1 shadow-md transition-[outline-color]",
  /**
   * **The card, inside the shell.** `border`, not `outline` — the one place the
   * product's stroke rule (§8, the hairline is an outline) is deliberately
   * inverted, and the reason is arithmetic: an outline is drawn OUTSIDE the box,
   * so it would eat a quarter of the 4px of shell that is the entire visual idea
   * here. Inside the box, `box-sizing: border-box` keeps the card 232 wide and
   * the gap reads as the 4 it is.
   */
  card: "rounded-lg border border-border-subtle bg-surface-node",
  /**
   * **Hover lifts the LINE, never the fill.** The same rule the `outline` button
   * follows, and here it is load-bearing: selection is a line too, so a hover
   * wash would be a second mechanism for the same job. It lands on the SHELL —
   * the shell is the object you are pointing at.
   */
  hover: "hover:outline-border-strong",
  /**
   * **Selection changes the LINE, never the ground.**
   *
   * It used to drop a `--wash-selected` overlay across the whole card, and the
   * complaint was exact: click or drag a node and its background changes and
   * never comes back. It never came back because it was not a press state — it
   * was selection, and the node stays selected. A wash is the wrong instrument
   * for it either way: the inspector sliding out at 480 is what actually reports
   * "this one", and a card that also restains itself is the same news twice.
   *
   * The ring colour carries it instead (§5 — the ring is blue and it also
   * carries selection), which keeps hover and selected distinguishable: hover
   * firms the hairline, selection replaces it. Nothing marks press or drag; the
   * card moving under the cursor is the feedback.
   */
  selected: "outline-[var(--ring)]",
  /**
   * **16 of inset, a 16px glyph, an 8 gap.** Measured off the board: the glyph
   * lands at 16 and the text column at 40, on the identity row, the summary and
   * every docked row. A card on the canvas is the only surface in the product
   * with nothing around it to give it air — it floats on a dot grid — so it has
   * to carry its own.
   */
  inset: "px-4",
  /** 16 top and bottom inside the card — `identity` at 16, `summary` ending at 56
   *  of a 72-tall card. */
  padY: "py-4",
  /**
   * **16, on the docked rows too — the board draws them at 14.**
   *
   * The board shrank the instance frame to 14 but the glyph inside it is still
   * the 16px lucide import (`icon/hard-drive`: *"rescaled to 16 — so the stroke
   * lands on the board's 1.33"*), so 14 is the frame, not the drawing. At 16 the
   * docked row's text lands on 40, the same column as the name above it; at 14
   * it lands on 38, and two pixels is the distance that reads as a mistake
   * without ever looking like one.
   */
  glyph: "size-4",
  gap: "gap-2",
  /**
   * **`cursor-grab`.** Both cards are draggable and both open an inspector. The
   * pointer said "click me and something happens elsewhere"; the hand says
   * "this is a thing you can move", which is the truer of the two for a node.
   */
  cursor: "cursor-grab",
  /** Clip, so a hover wash on the last docked row rounds into the shell's own
   *  bottom corners instead of squaring off over them. */
  clip: "overflow-hidden",
} as const;

/**
 * **Every state that asks you to act says its word — and now it says it without
 * taking the source line hostage.**
 *
 * The word used to REPLACE the summary, so a failing service stopped telling you
 * what it was built from at the exact moment you needed to know. It sits in the
 * header row's right slot instead, where the kind label used to be — the glyph
 * already says the kind, and on a Redis card that label was the word *Redis*
 * beside the Redis logo.
 *
 * Ready has no word, deliberately: it wants nothing from you, and `Ready` on
 * four cards at once is four words nobody reads. The slot is empty exactly when
 * there is nothing to say.
 */
export const STATE_WORD: Partial<Record<StatusVariant, string>> = {
  pending: "Pending",
  error: "Failed",
  neutral: "Not deployed",
  info: "Unknown",
};

/**
 * The word takes the state's ink, not a tinted face (§4's state ladder). A chip
 * would be a third container on a card that already has an outline and a docked
 * volume; the coloured word is `StatusText`'s mechanism, which is the one meant
 * for a mark sitting among its peers rather than beside a page title.
 */
export const STATE_WORD_CLASS: Record<StatusVariant, string> = {
  ready: "text-fg-muted",
  pending: "text-warn",
  error: "text-danger",
  info: "text-fg-muted",
  neutral: "text-fg-muted",
};

/**
 * **A light, not a speck.**
 *
 * It was a flat 6px disc — the smallest mark on the card, in the strongest
 * colour on it, with nothing around it. At that size a solid dot reads as a
 * printing artefact rather than as a status lamp, which is what it is meant to
 * be.
 *
 * It is now a **core in a halo**: 8px of the tone's ink with a 3px ring of the
 * same tone's 12% fill around it. That is §4's fill-plus-ink pairing — the two
 * rungs the alert banner uses — and explicitly not all three, which is the bug
 * that rule exists to name. The halo is a `ring`, so it is a box-shadow and
 * costs the row no width; the core grew 6 → 8 because a halo needs a core big
 * enough to sit inside, and 8 lands the mark at about the x-height of the name
 * beside it.
 *
 * **Motion means something is happening.** Every healthy dot used to breathe on
 * a slow loop, forever — so on a screen of working services the only moving
 * thing was the news that nothing was moving. A pulse belongs to `pending`
 * alone, the one state where the system is actually mid-flight.
 *
 * **`info` is grey, not blue.** Blue is the focus and selection colour (§5), and
 * spending it on a state put a permanent false "you are here" on any card whose
 * status could not be read. `Unknown` is the absence of information, which is
 * what the neutral tier is for — so it takes an ink halo rather than a hue.
 */
export const DOT_SIZE = "size-2";

export const DOT_CLASS: Record<StatusVariant, string> = {
  ready: "bg-success ring-[3px] ring-[var(--success-bg)]",
  pending: "bg-warn ring-[3px] ring-[var(--warn-bg)] animate-pulse",
  error: "bg-danger ring-[3px] ring-[var(--danger-bg)]",
  info: "bg-fg-muted ring-[3px] ring-[var(--wash-selected)]",
  neutral: "bg-fg-muted ring-[3px] ring-[var(--wash-selected)]",
};

/**
 * **A draft card's word beats its live one.**
 *
 * The unsaved mark used to be a 3px ink bar down the card's left edge, and it
 * was saying a thing the card was already saying: a newly added service reads
 * `Not deployed` in the header slot, so the bar was the same fact drawn twice —
 * once in words and once as a rule that belonged to no column and lined up with
 * nothing.
 *
 * The word carries it alone now, and when a card is dirty the DRAFT fact takes
 * the slot ahead of the live one. That is not a ranking, it is accuracy: a live
 * status describes the version that is deployed, so a service you have just
 * edited is genuinely `Ready` — as the old copy of itself. Printing `Ready` over
 * changes you have not shipped is the one reading of that slot that is wrong.
 *
 * `new` is absent on purpose. A new resource has no deployed version, so its own
 * status already resolves to `Not deployed` and there is nothing to override —
 * which is also why new and edited never needed two different marks.
 */
export const DRAFT_WORD: Record<"new" | "edited" | "removed", string | undefined> = {
  new: undefined,
  edited: "Edited",
  removed: "Removing",
};
