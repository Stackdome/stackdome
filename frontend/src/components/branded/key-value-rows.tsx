import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface KeyValueRow {
  key: string;
  value: string;
}

interface KeyValueRowsProps<T extends KeyValueRow> {
  rows: T[];
  onChange: (rows: T[]) => void;
  /** Label on the full-width add control, e.g. "Add variable". */
  addLabel: string;
  /** A fresh row. Supplied by the caller because rows may carry extra fields. */
  makeRow: () => T;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keyLabel?: string;
  valueLabel?: string;
  /** Replaces the value input — for a row whose value is picked, not typed. */
  renderValue?: (row: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
  /** An extra control between the value and the remove button. */
  trailing?: (row: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
  /** Per-row messages, keyed by index. */
  errorFor?: (row: T, index: number) => { key?: string; value?: string } | undefined;
  /** The list never shrinks below this — one empty row beats an empty void. */
  minRows?: number;
  /** What the remove button announces. Named by the caller, because "row" tells
   *  a screen-reader user nothing about what they are about to delete. */
  removeLabel?: string;
  className?: string;
}

/**
 * Rows of key and value, with a full-width control to add another.
 *
 * **The add control is a row, not a button beside the label.** A `+ Add` tucked
 * up next to the group's heading reads as chrome and sits nowhere near the last
 * row it extends; full width and directly under the list, it reads as the next
 * row — which is what it makes.
 *
 * The key is mono because it is an identifier the machine reads back. **The
 * value is not** — a value is arbitrary text, and setting it in mono makes
 * ordinary prose look like a token.
 *
 * **The placeholders are lower case.** They shipped as `KEY` and `NAME`, which
 * is not the field shouting a convention — it is a placeholder pretending to be
 * a value. Env vars are conventionally upper case and secret keys are not, so
 * the caps were also telling half the callers the wrong thing.
 */
export function KeyValueRows<T extends KeyValueRow>({
  rows,
  onChange,
  addLabel,
  makeRow,
  keyPlaceholder = "key",
  valuePlaceholder = "value",
  keyLabel = "Key",
  valueLabel = "Value",
  renderValue,
  trailing,
  errorFor,
  minRows = 0,
  removeLabel = "Remove row",
  className,
}: KeyValueRowsProps<T>) {
  const update = (index: number, patch: Partial<T>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {rows.map((row, index) => {
        const err = errorFor?.(row, index);
        return (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                value={row.key}
                onChange={(e) => update(index, { key: e.target.value } as Partial<T>)}
                placeholder={keyPlaceholder}
                aria-label={keyLabel}
                aria-invalid={!!err?.key}
                // **Both halves flex equally — unless the row carries a third
                // control, and then the key gives way.**
                //
                // The key ran at a fixed 36%, which at a 480 drawer's 440 is
                // 158 against a 218 value: a near-alignment rather than a ratio
                // anyone chose (§8). Peers, so equal.
                //
                // A `trailing` control changes the arithmetic, not the
                // principle. Measured on the previews env-var row: at 147/147
                // the value truncated `https://staging.acme.dev` while the key
                // had 4 characters of headroom nobody was using. An env-var
                // NAME is short by convention and a value is a URL, a token or
                // a connection string — so the fixed side is the key, and the
                // slack goes where the length actually is.
                //
                // `min-w-0` is what lets a flex child truncate at all.
                className={cn(
                  "font-mono text-meta",
                  trailing ? "w-[120px] flex-none" : "min-w-0 flex-1",
                  err?.key && "border-danger",
                )}
              />
              {renderValue ? (
                renderValue(row, index, (patch) => update(index, patch))
              ) : (
                <Input
                  value={row.value}
                  onChange={(e) => update(index, { value: e.target.value } as Partial<T>)}
                  placeholder={valuePlaceholder}
                  aria-label={valueLabel}
                  aria-invalid={!!err?.value}
                  className={cn("flex-1", err?.value && "border-danger")}
                />
              )}
              {trailing?.(row, index, (patch) => update(index, patch))}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="flex-none hover:bg-danger-bg hover:text-danger"
                onClick={() => remove(index)}
                disabled={rows.length <= minRows}
                aria-label={row.key ? `${removeLabel}: ${row.key}` : removeLabel}
              >
                <X className="size-3.5" />
              </Button>
            </div>
            {(err?.key || err?.value) && (
              <p className="text-label text-danger leading-tight">{err.key || err.value}</p>
            )}
          </div>
        );
      })}
      {/* `outline`, which is the board's Tone=secondary — the same variant
          Cancel uses. The code's variant literally named `secondary` drops the
          hairline on purpose, for sitting beside an outline button; alone and
          full width against a column of fields it just reads as another one. */}
      <Button
        type="button"
        variant="outline"
        shape="flat"
        className="w-full"
        onClick={() => onChange([...rows, makeRow()])}
      >
        <Plus />
        {addLabel}
      </Button>
    </div>
  );
}
