import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FieldShell } from "./field-shell";

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
  /** Names this row in the list — `Port 1`, or the variable's own name. */
  label: ReactNode;
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
  return (
    <FieldShell label={label} htmlFor={htmlFor} error={error} className={className}>
      <div className="flex items-center gap-1">
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
    </FieldShell>
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
