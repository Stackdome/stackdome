import { cn } from "@/lib/utils";

/**
 * The list-page row, extracted from the Stacks list so every list page is
 * literally the same code rather than the same intention (§11).
 *
 * It is **not** the `Table` primitive. `Table` is right for dense tabular data —
 * `backups-list.tsx`, the users list — where rows are ~40px, a rule between them
 * earns its place, and `text-body` is the size. A list PAGE is a different
 * object: 64px rows, no rule, a 14px name over a 12px second line, and a 20px
 * column gap. Every one of those is a `Table` default overridden at the call
 * site, and five pages overriding the same seven defaults is a fork wearing a
 * primitive's name.
 *
 * The measurements below are the Stacks page's, taken off the running app:
 *
 * | | |
 * |---|---|
 * | Row | 64px, `px-2`, no rule, hover wash, inset focus ring |
 * | Column gap | **20px** |
 * | Header | `text-column` 11.5/16 **`fg-muted`** — chrome, inset 8 above / 8 sides / 8 below, one 1px rule, **0 gap to the first row** |
 * | Name | `text-name` 14/20 weight 500, `foreground` |
 * | Second line | `text-meta` 12/16 `fg-muted` |
 * | Every other cell | `text-meta` 12/16 **`foreground`** — it is data, not caption |
 *
 * The header's 8px above is `-mt-2` against the sheet's 16px content inset: a
 * column header is chrome and sits tighter to the band than content does.
 */

/** Shared by the header, every row and the skeleton, so the three can never
 *  disagree about where a column starts. Callers supply their own track list. */
export function listGrid(columns: string): string {
  return cn("grid items-center gap-5", columns);
}

export function DataListHeader({
  columns,
  labels,
}: {
  columns: string;
  /** One per track. An empty string draws the track and no label — that is how
   *  an actions or chevron column is titled, never with the word "Actions". */
  labels: string[];
}) {
  return (
    <div
      data-slot="data-list-header"
      className={cn(
        listGrid(columns),
        "-mt-2 border-b border-border-subtle px-2 pb-2 text-column text-fg-muted",
      )}
    >
      {labels.map((l, i) => (
        <div key={l || `col-${i}`}>{l}</div>
      ))}
    </div>
  );
}

export function DataListRow({
  columns,
  onActivate,
  label,
  className,
  children,
  ...rest
}: {
  columns: string;
  /** Makes the whole row the hit area, with a keyboard equivalent. Omit for a
   *  row that is not itself a destination. */
  onActivate?: () => void;
  /** Required when `onActivate` is set — what the row announces. */
  label?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "onClick" | "onKeyDown" | "children">) {
  return (
    <div
      {...rest}
      data-slot="data-list-row"
      {...(onActivate
        ? {
          role: "link",
          tabIndex: 0,
          "aria-label": label,
          onClick: onActivate,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter") onActivate();
          },
        }
        : {})}
      className={cn(
        listGrid(columns),
        // No rule between rows. A separator earns its place by GROUPING, and at
        // 64px it groups nothing — space was already doing all of it. Row extent
        // on approach is the hover wash's job.
        "group/row h-16 px-2 transition-colors",
        onActivate && "cursor-pointer",
        // The row is full-bleed, so its ring turns inward — an outside ring
        // would be clipped by the sheet and lose a side.
        "hover:bg-[var(--wash-hover)] focus-ring-inset",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The name, and — only when there is one — the machine string under it.
 *
 * **`mono` covers the WHOLE secondary line, so a mixed line cannot use it.**
 * §6: mono means a machine produced this and a machine will read it back. Five
 * of the seven callers pass a pure machine value — a host, a cluster id, a
 * branch — so `true` stays the default. But a line like `default · main@a3f9d2e`
 * is a project NAME and a ref, and setting the whole thing in mono makes the
 * project look like something you could paste into a terminal.
 *
 * For that case pass a node and turn `mono` off; `secondaryTitle` carries the
 * plain string for the tooltip, which a node cannot.
 */
export function DataListName({
  name,
  secondary,
  secondaryTitle,
  mono = true,
}: {
  name: string;
  secondary?: React.ReactNode;
  secondaryTitle?: string;
  mono?: boolean;
}) {
  const title = secondaryTitle ?? (typeof secondary === "string" ? secondary : undefined);
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-name font-medium text-foreground" title={name}>
        {name}
      </span>
      {secondary && (
        <span
          className={cn("truncate text-meta text-fg-muted", mono && "font-mono")}
          title={title}
        >
          {secondary}
        </span>
      )}
    </div>
  );
}

/**
 * Any other cell: 12/16, **primary ink**, truncating. `mono` for machine values.
 *
 * **Data is `foreground`, chrome is `fg-muted`** (Jaseem, 23 Aug 2026). Every
 * cell used to be muted, which put the table's actual content on the same tier
 * as its column headers — the row read as a caption of itself. The header stays
 * muted because a header is chrome; what it labels is the thing you came to
 * read.
 *
 * A call site may still drop a cell to `fg-2` where it is genuinely supporting
 * rather than primary — previews does it for the repository name, which
 * qualifies the environment beside it.
 */
export function DataListCell({
  children,
  mono,
  numeric,
  title,
  className,
}: {
  children: React.ReactNode;
  mono?: boolean;
  numeric?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "truncate text-meta text-foreground",
        mono && "font-mono",
        numeric && "tabular-nums",
        className,
      )}
      title={title}
    >
      {children}
    </div>
  );
}

/**
 * The row's actions, revealed on approach — a control on every row at rest is
 * chrome competing with content.
 *
 * Hidden by opacity rather than by mounting, so each control keeps its tab stop
 * and the row does not reflow when the pointer arrives.
 */
export function DataListActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="data-list-actions"
      className={cn(
        "flex items-center justify-end gap-1 opacity-0 transition-opacity",
        "group-hover/row:opacity-100 group-focus-within/row:opacity-100",
        "has-[[data-state=open]]:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** One column's placeholder: a single bar, or a stacked pair for a name cell. */
export type SkeletonBar = { w: number; h: 3 | 4 } | [{ w: number; h: 3 | 4 }, { w: number; h: 3 | 4 }] | null;

/**
 * Rows at the **real 64px pitch**, so nothing moves when the data lands (§11).
 *
 * A `wash-hover` block and **no shimmer** — §14 rules out ambient movement on a
 * working surface, which is why this does not use the `Skeleton` primitive,
 * whose `animate-pulse` is exactly that movement.
 *
 * Every row is the same width, matching the Stacks skeleton. Varying the widths
 * row to row was tried and dropped: it is a second thing to keep in step across
 * five pages, and the two-line name cell already stops the block reading as a
 * bar chart.
 */
export function DataListSkeleton({
  columns,
  shape,
  rows = 6,
}: {
  columns: string;
  /** One entry per track, in order. `null` draws an empty track. */
  shape: SkeletonBar[];
  rows?: number;
}) {
  const bar = (b: { w: number; h: 3 | 4 }, k: number) => (
    <div
      key={k}
      className={cn("rounded-sm bg-[var(--wash-hover)]", b.h === 4 ? "h-4" : "h-3")}
      style={{ width: b.w }}
    />
  );

  return (
    <div aria-hidden data-slot="data-list-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn(listGrid(columns), "h-16 px-2")}>
          {shape.map((s, j) => {
            if (!s) return <div key={j} />;
            if (Array.isArray(s)) {
              return (
                <div key={j} className="flex min-w-0 flex-col gap-1.5">
                  {s.map((b, k) => bar(b, k))}
                </div>
              );
            }
            return <div key={j}>{bar(s, 0)}</div>;
          })}
        </div>
      ))}
    </div>
  );
}
