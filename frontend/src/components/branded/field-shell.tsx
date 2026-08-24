import * as React from "react";
import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FieldError } from "./field-error";

interface FieldShellProps {
  /** Field label rendered above the input. */
  label: ReactNode;
  /** Forwarded to the underlying <Label> for input association. */
  htmlFor?: string;
  /** Marks the field required with a red asterisk after the label. */
  required?: boolean;
  /**
   * Helper copy rendered below the input, and the error replaces it.
   *
   * **This is the default, and it is where a fact you need at rest belongs** —
   * `Relative to the build context.`, `Blank uses the internal cluster
   * registry.` Keep it to one line at 480.
   */
  hint?: ReactNode;
  /**
   * The same guidance, behind a `?` on the label row.
   *
   * **Reach for it when the field explains ITSELF and the sentence is a gloss,
   * not an instruction.** `Depends on` already says what it does — the list
   * shows what you picked, and the control performs the picking. "These start
   * first." is the *consequence*, worth having and not worth a permanent line
   * under a 32px control.
   *
   * A field the reader must be TOLD something to fill in correctly keeps its
   * `hint`. A rule the field itself enforces gets neither — see the name
   * fields, which correct as you type and say nothing at all.
   *
   * `hint` and `help` can both be set; the error still replaces the `hint`.
   */
  help?: ReactNode;
  /** Validation error rendered below the hint. */
  error?: ReactNode;
  /**
   * How many columns of the enclosing `FieldGrid` this field takes.
   *
   * **Default 2 — a field fills the body unless it has a partner.** It used to
   * default to 1, which made half width the thing that happened when nobody
   * decided anything: `Version`, `Object store`, `Create` and `Source addon`
   * were all 292 with an empty cell beside them, not because a narrow box suited
   * them but because that is what a two-column grid does to a lone child. Two
   * drawers away, `Port`, `Base branch` and `Max active previews` — the same
   * short values — ran the full width.
   *
   * `span={1}` is now a **statement that this field is half of a pair**, and it
   * only appears where the two share a subject (§ "pairing by meaning"). There
   * are four such pairs in the product.
   */
  span?: 1 | 2;
  /**
   * Control trailing, label and hint leading, on one line — the shape a switch
   * needs. A switch and its sentence are one statement, so stacking the label
   * above it reads as two.
   *
   * It is not a second component: same label, same hint, same error, same
   * `span`. Only the axis changes.
   */
  inline?: boolean;
  /** Wraps the input(s). */
  children: ReactNode;
  className?: string;
}

/**
 * Form field wrapper aligning every input to the Stackdome label/hint/error
 * rhythm. Use in place of bespoke <Label> + <Tooltip Info /> + manual
 * <p text-danger> blocks.
 *
 * **The control fills the field; it never sizes to its content.** This is the
 * one place that enforces it, so no call site has to remember. `SelectTrigger`
 * ships `w-fit`, which is right in a toolbar — `Status: All` should hug its
 * word — and wrong in a form, where it puts the field's trailing edge wherever
 * the longest option happens to land. Measured on the addon drawer before this
 * rule existed: seven controls, **five different trailing edges** (196, 205,
 * 312, 495, 619), two of them 9px apart. Near-alignment reads as a mistake,
 * not as a choice.
 */
/**
 * **The label row's trailing slot, handed down so a descendant can fill it.**
 *
 * The per-field reset arrow belongs beside the label — it acts on the field as a
 * whole, not on the control — but it is owned by `DirtyField`, which wraps the
 * CONTROL and is therefore a child of this component. A child cannot render into
 * its parent's markup, so `DirtyField` used to fake it: `absolute bottom-full
 * right-2`, pinned to the far end of a 440px row, which put the arrow as far
 * from the word it belongs to as the row allows.
 *
 * The slot is a real element here and the node is published on context; the
 * child portals into it. Focus order follows the DOM, so the arrow now comes
 * right after the label instead of last.
 */
const FieldActionSlotContext = React.createContext<HTMLElement | null>(null);

export function useFieldActionSlot() {
  return React.useContext(FieldActionSlotContext);
}

/**
 * **The `?` on a label row — one mark, two owners.**
 *
 * `FieldShell` draws it beside a field's label and `FormSection` beside a
 * group's heading, and they are the same punctuation doing the same job at two
 * altitudes. It lives here rather than in a file of its own because this is
 * where it was designed and where its reasoning is written down; a section
 * heading importing it is cheaper than a second one drifting.
 */
export function HelpTip({
  children,
  className,
}: {
  children: React.ReactNode
  /** A correction from the row it sits in. **The box carries 4px of air inside
   *  it**, so a parent that wants the documented 6px between the word and the
   *  mark sets its own gap to 2 — or, where the row's gap is spoken for by
   *  something else (a section's `state`), pays the difference here. */
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A button, not a bare glyph — it is the only way to reach the text
          from the keyboard, and guidance the tab order skips is guidance only
          a mouse can read. `type="button"` because this sits inside a form
          and a bare button submits it.

          **The target is 20 and the mark is 14, so the margin pays only the
          difference.** The gap that matters is the one you can SEE — glyph to
          word, 4, the same distance a Button puts between its icon and its
          label. The box carries 3px of air inside it, so the margin is 1: a
          flat 4 here would draw the mark at 7 and a 20px hit area is not
          negotiable. */}
        <button
          type="button"
          aria-label="What does this do?"
          // **No wash on hover — the tooltip IS the response.**
          //
          // It lit a `--wash-hover` face behind a 12px glyph, which made a mark
          // that annotates the label look like a control that does something,
          // and put a second thing on screen at the same moment the tooltip
          // opens. The ink alone answers the pointer, the same way the reset
          // arrow beside it does.
          className={cn(
            "focus-ring-edge inline-flex size-5 flex-none items-center justify-center rounded-sm align-middle text-fg-muted transition-colors hover:text-foreground",
            className,
          )}
        >
          {/* 12, not 14 — against a 13px label a 14px mark was the larger of
          the two, so the punctuation outweighed the word it annotates. */}
          <CircleHelp className="size-3" aria-hidden />
        </button>
      </TooltipTrigger>
      {/* Wider than the tooltip's `w-fit` default, or a sentence comes back as
        a one-word-per-line column. */}
      <TooltipContent className="max-w-[260px]">{children}</TooltipContent>
    </Tooltip>
  );
}

export function FieldShell({
  label,
  htmlFor,
  required,
  hint,
  help,
  error,
  span = 2,
  inline,
  children,
  className,
}: FieldShellProps) {
  const [actionSlot, setActionSlot] = React.useState<HTMLElement | null>(null);

  const helpNode = help && <HelpTip>{help}</HelpTip>;

  const labelNode = (
    // **2, so the SEEN gap is 6.** `Label` spaces its children for a control
    // sitting beside the words (a checkbox, a switch); a help mark is
    // punctuation ON the words, so the two spacings are not the same job.
    //
    // The number to reason about is the one you can see — word to glyph — and
    // the 20px target carries 4px of air around its 12px mark. So the row pays
    // 2 and the box pays 4. At `gap-1` the seen distance measured 8.
    //
    // **The mark is a SIBLING of the `<label>`, never inside it.** A `<label>`
    // associates every labelable control it contains, so a `?` nested in one
    // answers to the field's own name: `getByLabelText(/base branch/)` returns
    // the input AND the help button, and a screen reader announces "Base
    // branch, button" beside "Base branch, edit text". The gap moved out with
    // it, so the seen 6 is unchanged.
    <span className="flex min-w-0 items-center gap-0.5">
      <Label htmlFor={htmlFor} className="min-w-0 text-body font-medium text-foreground">
        <span className="truncate">
          {label}
          {/* Red. It was ink at 70%, which put the one mark on the form that
              says "you cannot skip this" below the label it belongs to in
              contrast — nothing looked at it. */}
          {required && (
            <span className="ml-0.5 text-name font-semibold text-danger leading-none" aria-hidden>*</span>
          )}
        </span>
      </Label>
      {helpNode}
    </span>
  );

  // 4 off the label, the same gap the `?` takes — it is punctuation on the
  // words, not a control floating on the row.
  const labelRow = (
    <div className="flex min-w-0 items-center gap-1">
      {labelNode}
      <span ref={setActionSlot} data-slot="field-action" className="flex flex-none items-center" />
    </div>
  );

  // `text-wrap: pretty` was tried here when the addon drawer came down to 480
  // and a hint broke to leave `number.` alone. **Measured: it changed nothing**
  // — Chromium's orphan avoidance is a hint, not a guarantee, and on a two-line
  // paragraph it declines to reflow.
  //
  // **`balance` is the one that works, and it is global now** — `p { text-wrap:
  // balance }` in `index.css`, so this hint and every other paragraph in the
  // product evens its lines rather than dumping the remainder on the last one.
  // Nothing to set here.
  //
  // **The error REPLACES the hint; the two are never on screen together.**
  //
  // Where a field has a rule, the error is that same rule in the imperative —
  // "Lowercase letters, numbers and hyphens." becomes "Use lowercase letters,
  // numbers and hyphens." Rendered together they are the sentence twice, in two
  // moods, and the form grows a line at the moment you are trying to fix it.
  //
  // Where the two say different things the error is still the one that matters:
  // it is about what you just did, and the hint will be back the moment the
  // field is valid again. Nothing is lost, only deferred.
  const hintNode = hint && !error && (
    <p className="text-meta text-muted-foreground leading-relaxed">{hint}</p>
  );

  // Any control handed to a field fills it. Inputs and textareas already do;
  // a select has to be told, and telling it here is what keeps the trailing
  // edges on the grid.
  //
  // **It reaches every descendant on purpose.** Tried as a direct-child rule
  // once, to stop it overriding a composite's internal widths — and that broke
  // the addon drawer's `Schedule`, whose select sits in a `flex-col` wrapper and
  // very much wants the fill. Nested controls in a column are the common case;
  // a control that needs its own width says so with `!`, which is what the
  // preview config's 110px `Value source` select does.
  const fill = "[&_[data-slot=select-trigger]]:w-full";

  // **The control is centred on the whole statement, and stands 24 off it.**
  //
  // It was `items-start` with a 2px nudge, which pinned the switch to the
  // label's first line — so a one-line row looked centred and a row with a
  // two-line hint looked top-heavy, on the same form. What the switch answers
  // is the label AND its hint together, so it centres on both.
  //
  // 24, not 16: at 16 the switch read as the last word of the sentence rather
  // than the control that answers it. 16 is the gap between fields, and a gap
  // that says "these are two things" cannot also say "these are one statement".
  //
  // **This block lived INSIDE the JSX, and JSX rendered it.** `//` in child
  // position is not a comment — it is text, so every inline field on the
  // product printed 500 characters of design reasoning above its own label.
  // Prose about a return goes above the return; prose inside one is `{/* */}`.
  if (inline) {
    return (
      <FieldActionSlotContext.Provider value={actionSlot}>
        <div className={cn("flex items-center gap-6", span === 2 && "col-span-2", className)}>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {labelRow}
            {hintNode}
            <FieldError>{error}</FieldError>
          </div>
          {/* `flex`, not a plain block. A block wrapping an inline-level control
            inherits the line box's descender, which made the wrapper ~4 taller
            than the switch and left it centred 2px high inside a row that was
            itself centred correctly. Measured, not reasoned. */}
          <div className="flex flex-none items-center">{children}</div>
        </div>
      </FieldActionSlotContext.Provider>
    );
  }

  return (
    // 4, not 6. Grouping is a ratio: against the 16 between one field and the
    // next, a pair at 6 reads too close to the list gap to bind. At 4 the label
    // belongs to its control and the list still reads as a list.
    <FieldActionSlotContext.Provider value={actionSlot}>
      <div className={cn("space-y-1", fill, span === 2 && "col-span-2", className)}>
        {labelRow}
        {children}
        {hintNode}
        <FieldError>{error}</FieldError>
      </div>
    </FieldActionSlotContext.Provider>
  );
}

/**
 * The grid every form field sits on — **two columns, 16 apart**.
 *
 * A form is a set of fields, and a set needs edges. Before this existed each
 * control found its own width and the form had as many trailing edges as it
 * had fields. Two columns give it two: the gutter and the far edge. A field
 * takes one column, or spans both when it identifies the object.
 *
 * Rows are their own grids rather than one grid with explicit breaks, so a
 * section can pair two fields on a line without the next section inheriting
 * the pairing.
 */
export function FieldGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid grid-cols-2 gap-4", className)}>{children}</div>;
}
