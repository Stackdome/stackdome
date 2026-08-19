import { Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, washes } from "@/lib/utils";
import type { StackPreviewConfig } from "@/api/preview-configs";

/**
 * The repositories, down the left of the previews sheet.
 *
 * **240 = 224 item + 8 either side.** It carries the sheet's own white and one
 * hairline on its right edge — a rail is not a card and not a well, it is a
 * region of the sheet, and the seam between two regions takes the **default**
 * 11% rung rather than `subtle` (§4). `subtle` is the line *inside* a control.
 *
 * | | |
 * |---|---|
 * | Rows | 224 × 32, `rounded-md`, `text-body`, 1px apart |
 * | `All previews` | Pinned at the top, under the group label |
 * | `+ Enable repository` | Pinned at the foot, above a hairline |
 * | The list between them | The only part that scrolls |
 * | Search | **None.** Revisit past ~40 repositories |
 *
 * **The two pinned rows are the rail's fixed points.** Two other placements for
 * the add were tried live and both lost — under the group label, and as the last
 * row of the list. The column is *chrome*, and chrome that moves as the data
 * changes stops being somewhere you can look without thinking.
 *
 * ### The trailing slot holds one thing at a time
 *
 * At rest every row shows its environment count. **On any row**, hover or focus
 * swaps that count for the settings gear — one slot, both marks absolutely
 * placed in it, so the row never reflows under the pointer.
 *
 * It revealed on the selected row alone at first, which meant reaching a
 * repository's settings cost a click to select it before you could ask for
 * them — a step that produced nothing, in a rail whose whole job is to save
 * you one.
 *
 * ### The gear is a control inside a control
 *
 * Which HTML has no way to express: a `<button>` inside an `<a>` (or inside
 * another `<button>`) is invalid, and browsers recover from it by breaking the
 * keyboard order. So the gear is a **sibling** of the row's button, positioned
 * over the trailing slot the row leaves empty. Two controls, two tab stops, one
 * visual row.
 */
export function RepositoryRail({
  configs,
  envCount,
  selectedId,
  onSelect,
  onSettings,
  onEnableRepository,
  canWrite = true,
}: {
  configs: StackPreviewConfig[];
  /** How many environments this repository has right now. `undefined` selects
   *  the all-repositories total. */
  envCount: (configId?: string) => number;
  /** `undefined` is *All previews* — the rail's own pinned row, not a config. */
  selectedId?: string;
  onSelect: (configId?: string) => void;
  onSettings: (config: StackPreviewConfig) => void;
  onEnableRepository: () => void;
  canWrite?: boolean;
}) {
  return (
    <nav
      aria-label="Repositories"
      // **241, and it is 240 plus the seam.** The board's own arithmetic —
      // "240 = 224 item + 8 either side" — leaves no room for the 1px hairline,
      // so at `w-60` the item measures 223. The item's width is what you look
      // at; the column's total is what nothing depends on (the body is
      // `flex-1`), so the pixel is paid out of the column rather than the row.
      className="flex w-[241px] flex-none flex-col border-r border-border bg-card py-3"
    >
      <div className="px-2">
        {/* The group label names the column the way the sidebar names its own
            groups — 11px, muted, and not a header the rows sit under a rule
            from. This is chrome for a list of eight, not a table. */}
        <p className="px-2 pb-2 text-label text-fg-muted">Repositories</p>
        <RailRow
          name="All previews"
          count={envCount(undefined)}
          isActive={selectedId === undefined}
          onSelect={() => onSelect(undefined)}
        />
      </div>

      {/* Only the middle scrolls. The two pinned rows are the rail's fixed
          points: one is where you go to see everything, the other is how the
          list grows, and neither should ever be somewhere you have to scroll
          to find. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-px">
        <div className="flex flex-col gap-px">
          {configs.map((config) => (
            <RailRow
              key={config.id}
              name={config.name ?? ""}
              count={envCount(config.id)}
              isActive={selectedId === config.id}
              onSelect={() => onSelect(config.id)}
              onSettings={canWrite ? () => onSettings(config) : undefined}
            />
          ))}
        </div>
      </div>

      {canWrite && (
        <div className="mt-2 border-t border-border px-2 pt-2">
          {/* `ghost`, matching the row's own gear and the preview row's
              actions — the rail holds no bordered box, so an `outline` here
              would be the only one and it reads lighter than the selected row
              above it. Judged in situ on the board, and again in the running
              app when `outline` was tried and reverted. */}
          <Button
            variant="ghost"
            shape="flat"
            className="w-full justify-start"
            onClick={onEnableRepository}
          >
            <Plus />
            Enable repository
          </Button>
        </div>
      )}
    </nav>
  );
}

function RailRow({
  name,
  count,
  isActive,
  onSelect,
  onSettings,
}: {
  name: string;
  count: number;
  isActive: boolean;
  onSelect: () => void;
  /** Every row reveals a gear on approach, wherever the user can write. */
  onSettings?: () => void;
}) {
  const showsGear = Boolean(onSettings);

  return (
    <div className="group/rail relative">
      <button
        type="button"
        aria-current={isActive ? "true" : undefined}
        onClick={onSelect}
        className={cn(
          // `pr-9` reserves the trailing slot on every row, selected or not, so
          // the name truncates at the same x whatever is sitting in it.
          "relative flex h-8 w-full items-center rounded-md pl-2 pr-9 text-left text-body focus-ring-edge",
          "transition-colors",
          washes(isActive),
        )}
      >
        <span className="truncate">{name}</span>
        {/* Inside the button, so the count joins the row's accessible name —
            "web-storefront, 3" is what the row actually says. Absolutely
            placed, so swapping it for the gear costs no reflow. Tabular,
            because it changes under the reader as environments come and go. */}
        <span
          className={cn(
            "absolute right-3 top-0 flex h-8 items-center text-meta tabular-nums text-fg-muted",
            showsGear &&
              "transition-opacity group-hover/rail:opacity-0 group-focus-within/rail:opacity-0",
          )}
        >
          {count}
        </span>
      </button>

      {showsGear && (
        <Button
          variant="outline"
          size="icon-sm"
          shape="flat"
          aria-label={`Settings for ${name}`}
          onClick={onSettings}
          // 24 inside a 32 row at 4 padding. A sibling of the row's button and
          // never a child of it — see the component note above.
          //
          // **`outline`, not the `ghost` the preview row's actions use.** A row
          // action on the list sits on the sheet's own white and a wash is
          // enough to lift it. This one lands on a row that is ALREADY washed —
          // hovered, selected, or both — so a transparent face has nothing left
          // to change against. The hairline is what gives it an edge on the one
          // ground §7 says to solve against: the worst one.
          className="absolute right-1 top-1 size-6 opacity-0 transition-opacity group-hover/rail:opacity-100 group-focus-within/rail:opacity-100"
        >
          <Settings2 />
        </Button>
      )}
    </div>
  );
}
