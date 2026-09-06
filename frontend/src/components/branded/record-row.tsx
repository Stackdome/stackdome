import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FieldShell } from "./field-shell";
import { FieldError } from "./field-error";

/**
 * **A repeating row of controls that together describe one thing** — a port, an
 * environment variable, a mount. Not a field: a field has one value, a record
 * has several that are only meaningful side by side.
 *
 * ### The sizing rule, and the bug it replaces
 *
 * | Member | Size | Because |
 * |---|---|---|
 * | Holds an arbitrary value | **`flex-1`** | A port number, a variable's name — nothing bounds how long it is |
 * | Holds a **closed set** | **fixed** | `Public ǀ Internal`, `From` — the widest option is known, so the box can be exactly that wide |
 * | Remove | **fixed 32**, packed straight after | It is not a member of the record; it is what removes the record |
 *
 * **`ml-auto` is what this exists to stop.** Pushing the last member to the far
 * edge put a hole in the middle of the row, and a port stopped reading as one
 * thing: the number and the protocol sat together on the left, the visibility
 * toggle sat alone on the right, and nothing said they were the same port. The
 * remove button belongs immediately after the last member for the same reason —
 * at the far edge it reads as an action on the *list* rather than on the row.
 *
 * ### The gaps
 *
 * **4 inside a record, 8 between records.** Same ratio argument §8 makes for a
 * label and its control: grouping is a ratio, not a distance. At 8 inside and
 * 16 between, a row's own members read as far apart as two different rows.
 *
 * ### The row is labelled by its COLUMNS when its label is an ordinal
 *
 * `label` is optional, and the test for whether to pass one is whether it names
 * the row or merely counts it.
 *
 * | List | Label | |
 * |---|---|---|
 * | Environment | `NODE_ENV` | The variable's own name. It IS the row |
 * | Ports | ~~`Port 1`~~ | An **ordinal**. Change 8080 to 3000 and it does not move |
 *
 * Ports shipped with `Port 1` / `Port 2` / `Port 3` down the left, which cost a
 * 20px label row per record — 56px to hold two numbers — and put the one thing
 * in the section that carries no information where the eye lands first. It also
 * left the three controls **unlabelled**: nothing said the `TCP` box was a
 * protocol or what `Public ǀ Internal` governed, so the reader inferred all
 * three from the values.
 *
 * Drop the label and the three names move to a `RecordColumns` header, which
 * says it once for the whole list instead of never. §11's rule for a list page
 * — *every column gets a header* — was always the right answer here; the
 * per-row ordinal was standing in its place.
 *
 * **A label-less row still needs accessible names**, and they go on the
 * controls themselves (`aria-label="Port 1"`, `"Protocol"`, `"Visibility"`).
 * The ordinal survives where it was always useful — announced, not drawn.
 *
 * ### A two-way choice inside a record is a segmented, not a switch
 *
 * A switch needs a word beside it to say what it toggles — which is a member
 * that carries no value, and it was `public` / `internal` in mono at the far end
 * of an `ml-auto`. A segmented control **is** its own label: both options are on
 * screen and the live one is inked. Inside a record it hugs its options (a
 * closed set has a known width); as a whole field it fills.
 */
export function RecordRow({
  label,
  htmlFor,
  error,
  onRemove,
  removeLabel,
  children,
  className,
}: {
  /**
   * Names this row in the list — the variable's own name, the addon it binds.
   *
   * **Omit it when the only label available is an ordinal** (`Port 1`) and put
   * the three names in a `RecordColumns` header instead — see above.
   */
  label?: ReactNode;
  htmlFor?: string;
  error?: ReactNode;
  onRemove?: () => void;
  /**
   * What removing this row actually does — `Remove port 3000`, `Remove
   * NODE_ENV`. Required whenever `onRemove` is: an `✕` with no accessible name
   * is most of a row's actions, announced as nothing.
   */
  removeLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const row = (
    <div className="flex items-center gap-1.5">
      {children}
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={removeLabel}
          className="flex-none text-fg-muted hover:bg-danger-bg hover:text-danger"
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  );

  // No label, no `FieldShell` — its whole job is the label row, and an empty
  // one would spend 20px per record saying nothing. The error slot is the only
  // other thing it was carrying, so the branch keeps that and nothing else.
  if (label === undefined) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        {row}
        {error && <FieldError>{error}</FieldError>}
      </div>
    );
  }

  return (
    <FieldShell label={label} htmlFor={htmlFor} error={error} className={className}>
      {row}
    </FieldShell>
  );
}

/**
 * **The header for a `RecordList` whose rows have no label of their own.**
 *
 * Says what the three controls in each row ARE, once, where a per-row ordinal
 * used to say nothing three times over (see `RecordRow` above).
 *
 * | | |
 * |---|---|
 * | Type | **`meta`** 12/16 weight 400, `fg-muted` — the same rung the section's `state` word takes, and the size the board sets on the Environment list's `From ǀ Name ǀ Value` |
 * | Gap to the first row | **8**, `RecordList`'s own — the header is a member of the list, not a thing above it |
 * | Rule under it | **None.** §11 keeps one on a list PAGE because the data below it is bare text at the same left edge, so without a line the header reads as a first row. Here the data is a row of **bordered 32px controls** — the boundary is already unambiguous, and the drawer body is down to three borders precisely by not adding lines that confirm what material already says |
 * | Announced | **No.** `aria-hidden`; the controls carry their own `aria-label`s, and a header a screen reader reads as three loose words before every row is worse than silence |
 *
 * **The cells must be sized exactly as the row's members are** — same widths,
 * same `flex-1` on the one that flexes, same trailing spacers for the reset
 * slot and the remove button. A header that drifts from its column is worse
 * than no header, because it asserts an alignment the eye then has to check.
 */
export function RecordColumns({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-1.5 text-meta text-fg-muted", className)}>
      {children}
    </div>
  );
}

/**
 * A list of records, and everything that belongs to it — **8 apart, not 16.**
 *
 * The rows, any column header above them, the note under them and the button
 * that adds one more are a single subject. 16 is the gap between one *field* and
 * the next; spending it inside a table breaks the table into parts.
 */
export function RecordList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}
