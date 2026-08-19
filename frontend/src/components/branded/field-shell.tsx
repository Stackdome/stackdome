import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { FieldError } from "./field-error";

interface FieldShellProps {
  /** Field label rendered above the input. */
  label: ReactNode;
  /** Forwarded to the underlying <Label> for input association. */
  htmlFor?: string;
  /** Marks the field required with a red asterisk after the label. */
  required?: boolean;
  /** Helper copy rendered below the input — replaces tooltip-on-icon for permanent affordance. */
  hint?: ReactNode;
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
export function FieldShell({
  label,
  htmlFor,
  required,
  hint,
  error,
  span = 2,
  inline,
  children,
  className,
}: FieldShellProps) {
  const labelNode = (
    <Label htmlFor={htmlFor} className="text-body font-medium text-foreground">
      <span>
        {label}
        {/* Red. It was ink at 70%, which put the one mark on the form that
            says "you cannot skip this" below the label it belongs to in
            contrast — nothing looked at it. */}
        {required && (
          <span className="ml-0.5 text-name font-semibold text-danger leading-none" aria-hidden>*</span>
        )}
      </span>
    </Label>
  );

  // `text-wrap: pretty` was tried here when the addon drawer came down to 480
  // and a hint broke to leave `number.` alone. **Measured: it changed nothing**
  // — Chromium's orphan avoidance is a hint, not a guarantee, and on a two-line
  // paragraph it declines to reflow. Removed rather than shipped as a no-op.
  // §8's answer stands: shorten the copy.
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

  if (inline) {
    return (
      // **The control is centred on the whole statement, and stands 24 off it.**
      //
      // It was `items-start` with a 2px nudge, which pinned the switch to the
      // label's first line — so a one-line row looked centred and a row with a
      // two-line hint looked top-heavy, on the same form. What the switch
      // answers is the label AND its hint together, so it centres on both.
      //
      // 24, not 16: at 16 the switch read as the last word of the sentence
      // rather than the control that answers it. 16 is the gap between fields,
      // and a gap that says "these are two things" cannot also say "these are
      // one statement".
      <div className={cn("flex items-center gap-6", span === 2 && "col-span-2", className)}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {labelNode}
          {hintNode}
          <FieldError>{error}</FieldError>
        </div>
        {/* `flex`, not a plain block. A block wrapping an inline-level control
            inherits the line box's descender, which made the wrapper ~4 taller
            than the switch and left it centred 2px high inside a row that was
            itself centred correctly. Measured, not reasoned. */}
        <div className="flex flex-none items-center">{children}</div>
      </div>
    );
  }

  return (
    // 4, not 6. Grouping is a ratio: against the 16 between one field and the
    // next, a pair at 6 reads too close to the list gap to bind. At 4 the label
    // belongs to its control and the list still reads as a list.
    <div className={cn("space-y-1", fill, span === 2 && "col-span-2", className)}>
      {labelNode}
      {children}
      {hintNode}
      <FieldError>{error}</FieldError>
    </div>
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
