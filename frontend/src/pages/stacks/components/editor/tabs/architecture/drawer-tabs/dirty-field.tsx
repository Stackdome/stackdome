import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { useFieldActionSlot } from "@/components/branded/field-shell";
import { isFieldDirty } from "@/pages/stacks/lib/stack-model/field-dirt";

interface DirtyFieldProps {
  /** The draft object to compare. Pass the resource (or whatever subtree the path resolves against). */
  draft: unknown;
  /** Baseline counterpart. When undefined, the field renders unwrapped. */
  baseline: unknown;
  /** Dot-path within draft/baseline to compare. */
  path: string;
  /**
   * Called when the user clicks the reset arrow. Should restore the path on
   * the underlying source-of-truth (typically `session.discardResourceField`).
   */
  onReset?: () => void;
  /** Compact mode tightens the inset for inline cells (e.g. ports table rows). */
  compact?: boolean;
  /** When true, hides the reset arrow even if dirty (use in read-only previews). */
  hideReset?: boolean;
  /**
   * Where the reset arrow goes.
   *
   * **`label` (default) — the field's own label row**, right-aligned, and it is
   * only in the DOM while the field is actually dirty. The control then spans
   * the full field at all times.
   *
   * It used to be `inline`, always rendered and merely `invisible` when clean —
   * which meant **every field in this drawer gave up 44px of width** (32 button
   * + 8 gap + 4 inset) to a control almost nobody ever sees. Measured on a 480
   * drawer: a 439px field held a 395px input. Rendering it conditionally in
   * that slot is not the fix either — the control would jump 44px narrower the
   * moment you started typing in it.
   *
   * The label row already has the room: `Name` is 45px of a 439px line, so 394
   * of it is empty. Putting the arrow there costs the control nothing and
   * shifts nothing.
   *
   * **`inline` is for a wrapper with no label row of its own** — the volume
   * mount card, which is the one of fifteen that wraps a whole grid rather than
   * a single field.
   */
  resetPlacement?: "label" | "inline";
  /**
   * Hold the inline reset slot open even while this field is clean.
   *
   * **Default true, and it is not defensiveness — it is the anti-jump.** A slot
   * that appears with the arrow makes the row 26px narrower until you type,
   * which on a list with column headers slides every member out from under the
   * word naming it, on the keystroke that made the row worth looking at.
   *
   * Pass `false` when the OWNER can answer "is anything in this list dirty?"
   * for the whole list at once. Then the columns still move together — every
   * row gains the slot in the same commit — and a list you have not touched
   * does not carry 26px of empty column between its last control and its
   * remove button.
   */
  reserveInlineReset?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Visual wrapper that flags a field as modified vs baseline. When dirty:
 * adds a brand-tinted background + amber left edge and surfaces a small
 * RotateCcw button to reset that one field.
 *
 * Critically, the DOM tree shape is IDENTICAL whether dirty or clean — only
 * classes toggle and the reset button's `visibility` flips. If the tree
 * structure changed on dirty, React would unmount/remount the input inside
 * and the user would lose focus on the very first keystroke (which is what
 * triggers the dirty state).
 */
export function DirtyField({
  draft,
  baseline,
  path,
  onReset,
  compact = false,
  hideReset = false,
  resetPlacement = "label",
  reserveInlineReset = true,
  className,
  children,
}: DirtyFieldProps) {
  // No baseline means there's no edit session to diff against (e.g., the
  // create-stack page). Skip the visual frame entirely so inputs sit flush
  // with their labels instead of leaving a permanently-empty inset.
  // Above the early return: a hook cannot be called conditionally, and the
  // `baseline === undefined` bail-out below is a branch.
  const actionSlot = useFieldActionSlot();

  if (baseline === undefined) {
    return <>{children}</>;
  }

  const dirty = isFieldDirty(draft as never, baseline as never, path);
  const showReset = dirty && !hideReset && !!onReset;

  // Negative margin extends the wrapper out to the accordion's left edge so the
  // 4px change stripe aligns with the accordion border. Padding pushes children
  // back to the original FieldShell edge, so labels and inputs stay flush.
  // Compact mode (ledger rows) skips the stripe entirely — the change tint and
  // reset arrow already mark the row, and rows sit flush against hairlines. Its
  // own pl/-ml pair bleeds the tint slightly past the control's left edge so
  // the wash doesn't look cut off flush against the input border.
  const inline = resetPlacement === "inline";
  /**
   * **It belongs to the change, so it wears the change's colour.**
   *
   * Three passes. It shipped as a `ghost` `Button` in `text-brand` that hovered
   * to a `brand-bg` wash, and §7 is explicit that **orange is visual expression
   * and never interface** — so the one saturated mark in the column was on the
   * rarest act in it. It went `fg-muted`, answering the pointer with ink alone,
   * which was right while "changed" had no colour of its own.
   *
   * It has one now. This arrow **exists only while the field is dirty** — it is
   * not a control the form always offers, it is the second half of the mark on
   * the left edge, and the two were saying the same thing in two colours. In
   * `--change` it reads as one sentence with the rail: *this differs, and here
   * is the way back*.
   *
   * That does not reopen §7. Orange is the product's accent and stays out of
   * the interface; blue is the system's STATE mark (§5), the same one the ring
   * and the selection already use — and a revert arrow is part of a state, not
   * a new action colour. The hover is the `--change-bg` wash rather than a
   * deeper ink: 9% is quiet enough that a 20px box beside a 13px label still
   * annotates the field instead of looming over it, which is what the old 24px
   * brand face got wrong. Hit area stays 20 for a 14px glyph — the same trade
   * `FieldShell`'s `?` makes.
   */
  const resetButton = (extra?: string) => (
    <button
      type="button"
      className={cn(
        "focus-ring-edge flex size-5 flex-none items-center justify-center rounded-sm",
        "text-change transition-colors hover:bg-change-bg",
        extra,
      )}
      onClick={onReset}
      aria-label="Reset to original value"
      title="Reset to original value"
    >
      <RotateCcw className="size-3.5" aria-hidden />
    </button>
  );

  return (
    <div
      // A structural hook for the wrapper, so nothing has to find this element
      // by a class it happens to be painted with. The mount-row tests used to
      // reach it via `[class*='border-b']` — a rule that was removed the day
      // sections stopped being drawn with lines, and a test that breaks on a
      // paint change was never testing the row.
      data-slot="dirty-field"
      className={cn(
        // `relative` is the anchor for the label-row reset. It costs nothing
        // when the arrow is absent, which is most of the time.
        "relative transition-colors",
        // **`-my-1` against the `py-1`: the tint keeps its body, the FORM keeps
        // its rhythm.**
        //
        // The vertical padding is here so the dirty wash has a little air above
        // and below the control rather than stopping flush against its border.
        // That is a paint decision — but it was also taking 4px of LAYOUT at
        // each end, on every field in this drawer and nowhere else in the
        // product. Measured against `New secret`:
        //
        // |                        | every other drawer | here |
        // |---|---|---|
        // | label → its control    | **4**  | 8  |
        // | control → its hint     | **4**  | 8  |
        // | control → next label   | **16** | 20 |
        //
        // `FieldShell` sets the 4 deliberately — "against the 16 between one
        // field and the next, a pair at 6 reads too close to the list gap to
        // bind" — and this wrapper was quietly doubling it, which is exactly
        // the ratio that comment exists to protect. At 8 over 20 a label no
        // longer reads as attached to its own field.
        //
        // Cancelling it with `-my-1` was tried and is wrong: `space-y-1` sets
        // its gap through a zero-specificity `:where()` rule, so the negative
        // margin beats it on the BOTTOM edge only — measured, that closed the
        // control-to-hint gap to 0 while fixing the top. The padding simply
        // goes. The wash is the control's own box now, which is what a mark
        // that means "this field changed" should be.
        compact
          // **The tint bleeds equally both sides and costs the control nothing.**
          // It was `pr-1` with no matching negative margin, so the wash's right
          // inset came straight off the field's width — 4px on top of the 40 the
          // reset slot was taking.
          ? "rounded-md pl-1.5 -ml-1.5 pr-1.5 -mr-1.5"
          : cn(
            "border-l-4 -ml-5 pl-4 pr-2",
            dirty ? "border-l-change" : "border-l-transparent",
          ),
        // **The wash is gone where the arrow can carry the mark.**
        //
        // A whole field restaining itself is the loudest thing on a form — a
        // 439px block of brand tint for a change to one value — and it says the
        // same thing the arrow beside the label already says, twice as loudly.
        // The arrow is brand-coloured and only exists while the field is dirty,
        // so it IS the indicator; the tint was the indicator drawn a second
        // time at fifty times the area.
        //
        // It survives on a row that has no arrow — `hideReset` is set where
        // resetting would silently detach a volume, and there the tint is the
        // ONLY thing reporting the difference. One mark either way, never both.
        dirty && hideReset && "bg-change-bg",
        className,
      )}
    >
      {/* **Beside the label, through the slot `FieldShell` publishes.**
          It used to be `absolute bottom-full right-2` — the only way a child
          could reach its parent's label row — which pinned the arrow to the far
          end of a 440px row, as far from the word it belongs to as the row
          allows. It also came last in the tab order, after the control it
          resets.

          The fallback stays for the fields that are not inside a `FieldShell`
          (record rows, mount rows): same button, same absolute anchor. */}
      {!inline && showReset && (
        actionSlot
          ? createPortal(resetButton(), actionSlot)
          : resetButton(cn("absolute bottom-full", compact ? "right-1.5" : "right-2"))
      )}
      {/* **6, the gap a record uses inside itself** (`RecordRow`), so the arrow
          sits the same distance from its row as the remove button does on the
          other side of it. It was 8, then 4; both were a number of their own,
          and on the port list — whose columns are labelled — any number that is
          not the record's own pushes every member off the header naming it. */}
      <div className={cn("flex items-center", inline && "gap-1.5")}>
        <div className="grow min-w-0">{children}</div>
        {/* **The inline slot is reserved by default** — see `reserveInlineReset`.
            The arrow lands in space that was already its own, so nothing beside
            it moves on the keystroke that makes the row dirty.

            An owner that can answer for the WHOLE list turns it off: then a
            clean list has no empty column standing between its last control and
            its remove button, and when the list does go dirty every row gains
            the slot in the same commit, so the members still travel together. */}
        {inline &&
          (showReset ? (
            resetButton()
          ) : onReset && reserveInlineReset ? (
            <span aria-hidden className="size-5 flex-none" />
          ) : null)}
      </div>
    </div>
  );
}
