import { ChevronsUpDown, Eye, FileDiff, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CanvasViewMode = "draft" | "live";

/**
 * **Which copy of the stack am I looking at** — and everything you can do about
 * that, in one control beside the title.
 *
 * It replaced a `Draft ǀ Live` segmented floating over the canvas. That control
 * answered the question by making you compare two words and spot which was
 * inked, it sat on the drawing rather than on the object it described, and it
 * had nowhere to put the two things you actually want next — reviewing the
 * changes and throwing them away. Those lived on a separate floating bar.
 *
 * A chip states the answer as a sentence — `Draft · 3 changes`, `Live · no
 * changes` — and carries the rest in its menu. It is the version, and the
 * version's actions, in the place the version belongs: on the title row, beside
 * the name of the thing it is a version of.
 *
 * **The count is tabular.** It changes under the reader as they edit, and
 * proportional digits shuffle the word beside them.
 *
 * **Two words, two weights, no `·`.** It shipped as one string — `Draft · 3
 * changes` — in one muted colour, which made the version and its count read as
 * a single grey label you skip. They are not the same rank: `Draft` is which
 * copy you are looking at and it is ink; `3 changes` is what is true about that
 * copy and it is muted. With the two ranked, the separator has nothing left to
 * do — weight and colour already say where one ends.
 *
 * **It carries a face.** A ghost chip beside a filled Deploy read as a label,
 * not a control, so the one thing on the row you can open looked like the one
 * thing you cannot. Control fill + hairline, the same material as the `⋯`
 * beside it — both are working controls (§9), neither is the commitment.
 */
export function VersionChip({
  mode,
  onModeChange,
  changeCount,
  canGoLive,
  onReviewChanges,
  canDiscard,
  onDiscardDraft,
}: {
  mode: CanvasViewMode;
  onModeChange: (mode: CanvasViewMode) => void;
  /** Undeployed edits in the draft. Zero reads as "no changes", not as blank. */
  changeCount: number;
  /** A converged release exists and its snapshot has loaded. Without one there
   *  is no second version to switch to, so the chip states the draft and stops. */
  canGoLive: boolean;
  onReviewChanges?: () => void;
  canDiscard?: boolean;
  onDiscardDraft?: () => void;
}) {
  const live = mode === "live";
  const version = live ? "Live" : "Draft";
  const count =
    live || changeCount === 0
      ? "no changes"
      : `${changeCount} ${changeCount === 1 ? "change" : "changes"}`;
  // One string for the accessible name, because a screen reader reads the
  // control, not the two spans it is made of.
  const label = `${version} · ${count}`;

  const face = (
    <>
      {live && <Eye className="size-3 flex-none" aria-hidden />}
      <span className="text-meta font-medium text-foreground">{version}</span>
      <span className="text-meta tabular-nums text-fg-muted">{count}</span>
    </>
  );

  // Nothing to switch to and nothing to do: the chip is a fact, so it renders
  // as one rather than as a menu that opens onto nothing. Same face, minus the
  // chevrons — the pair is the only thing that promised a menu.
  const hasMenu = canGoLive || !!onReviewChanges || !!onDiscardDraft;
  if (!hasMenu) {
    return (
      <span
        aria-label={label}
        className="flex h-8 flex-none items-center gap-1.5 rounded-md border border-border bg-control pl-[9px] pr-[9px]"
      >
        {face}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* 9 before the first word, 6 after the chevrons: the glyph carries
            invisible safe area a letterform does not (§9's optical rule). */}
        <Button
          variant="outline"
          aria-label={label}
          className="h-8 flex-none gap-1.5 rounded-md pl-[9px] pr-1.5 has-[svg]:pl-[9px] has-[svg]:pr-1.5"
        >
          {face}
          {/* A chevron PAIR: this cycles between versions, it does not open
              what is underneath it (§7). */}
          <ChevronsUpDown className="size-3 flex-none" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {canGoLive && (
          <>
            <DropdownMenuItem onSelect={() => onModeChange("draft")} disabled={!live}>
              <FileDiff aria-hidden />
              Draft
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onModeChange("live")} disabled={live}>
              <Eye aria-hidden />
              Live — read-only
            </DropdownMenuItem>
          </>
        )}
        {canGoLive && (onReviewChanges || onDiscardDraft) && <DropdownMenuSeparator />}
        {onReviewChanges && (
          <DropdownMenuItem onSelect={onReviewChanges} disabled={changeCount === 0}>
            <FileDiff aria-hidden />
            Review changes
          </DropdownMenuItem>
        )}
        {onDiscardDraft && (
          <DropdownMenuItem variant="destructive" onSelect={onDiscardDraft} disabled={!canDiscard}>
            <Undo2 aria-hidden />
            Discard draft changes
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
