import { Plus, Check } from "lucide-react";
import type { BlockCategoryMeta, BlockPreset } from "@/pages/stacks/data/blocks/types";
import { cn } from "@/lib/utils";
import { BlockGlyph } from "./block-glyph";

interface BlockPickerProps {
  catalog: BlockPreset[];
  categories: BlockCategoryMeta[];
  addedIds: string[];
  onAdd: (id: string) => void;
  query: string;
  /** Suppress the "No matches" note — for callers that render several pickers
   *  and show a single combined empty state instead. */
  hideEmptyMessage?: boolean;
  /**
   * Tiles per row. **2 for the wizard's rail, 1 on the canvas** — the canvas
   * panel is 272 wide, which is the widest tile plus its padding, so a second
   * column there would either overflow the popover or halve the tile.
   */
  columns?: 1 | 2;
  /**
   * Report which blocks are already in the stack, with a tick.
   *
   * **On by default, and off on the canvas.** In the wizard the rail IS the set
   * you are building — you can take things back out of it, so it has to say
   * what is in. On the canvas a click *is* the add and the graph beside it is
   * the record: there is no running set for a badge to report, and a tick on a
   * tile you can click again reads as "already done" rather than "one of these
   * exists".
   */
  showAdded?: boolean;
}

/** Shared query predicate so split-picker callers can pre-compute matches. */
export function blockMatchesQuery(b: BlockPreset, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || b.name.toLowerCase().includes(q) || b.summary.toLowerCase().includes(q);
}

export function BlockPicker({
  catalog,
  categories,
  addedIds,
  onAdd,
  query,
  hideEmptyMessage,
  columns = 2,
  showAdded = true,
}: BlockPickerProps) {
  const visible = catalog.filter((b) => blockMatchesQuery(b, query));

  if (visible.length === 0) {
    if (hideEmptyMessage) return null;
    return (
      <p className="px-1 py-6 text-body text-muted-foreground">
        No matches for "{query}"
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {categories.map((cat) => {
        const blocks = visible.filter((b) => b.category === cat.id);
        if (blocks.length === 0) return null;
        return (
          <div key={cat.id}>
            <div className="mb-3 font-mono text-label text-muted-foreground">
              {cat.label}
            </div>
            <div className={cn("grid gap-2.5", columns === 1 ? "grid-cols-1" : "grid-cols-2")}>
              {blocks.map((b) => {
                const added = showAdded && addedIds.includes(b.id);
                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => onAdd(b.id)}
                    className={cn(
                      "flex min-h-[60px] items-center gap-3 rounded-md border bg-card px-3 py-3 text-left transition-colors hover:border-primary",
                      added && "border-primary/60",
                    )}
                  >
                    <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded bg-muted text-muted-foreground">
                      <BlockGlyph icon={b.icon} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-medium text-foreground">{b.name}</span>
                      <span className="block truncate font-mono text-label text-muted-foreground">{b.summary}</span>
                    </span>
                    {showAdded &&
                      (added ? (
                        <Check className="h-[17px] w-[17px] text-success" />
                      ) : (
                        <Plus className="h-[17px] w-[17px] text-primary" />
                      ))}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
