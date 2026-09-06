import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SnapshotDiff } from "../release-snapshot-diff";
import { RailNode } from "./rail-node";
import { ConfigDiff } from "./config-diff";

export interface DraftNodeProps {
  /** editing = unsaved edits in flight; staged = saved draft, not deployed. */
  phase: "editing" | "staged";
  /** Saved spec vs the comparison release. Absent when it couldn't be diffed. */
  diff?: SnapshotDiff;
  /** Sequence the draft is diffed against — live, or the in-flight release when superseding it. */
  vsSeq?: number;
  /** True when no release nodes follow (hides the rail connector). */
  isLast?: boolean;
  defaultOpen?: boolean;
}

function changedNames(diff?: SnapshotDiff): string[] {
  if (!diff) return [];
  const names: string[] = [];
  for (const r of diff.resources) {
    if (r.change === "renamed" && r.fromName) names.push(r.fromName, r.name);
    else names.push(r.name);
  }
  for (const v of diff.volumes) names.push(v.name);
  return names;
}

/**
 * Leads the rail when there are saved-but-undeployed changes. Mirrors a release
 * node's two-line shape, with a hollow muted ring for "never deployed".
 */
export function DraftNode({ phase, diff, vsSeq, isLast, defaultOpen = false }: DraftNodeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const names = changedNames(diff);
  const hasChanges = names.length > 0;
  const namesLabel = hasChanges
    ? `${names.slice(0, 2).join(", ")}${names.length > 2 ? ` +${names.length - 2}` : ""} changed`
    : "";
  const chipLabel = phase === "editing" ? "Unsaved" : "Draft";

  return (
    <RailNode tone="muted" shape="draft" isLast={isLast}>
      <div>
        {/* Same two-line shape as a release node: identity on top, state and
            detail below. The chip is gone — orange is never a status (§7), and
            `Draft` is the state word this row's second line is for. */}
        <div
          className="-mx-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-[var(--wash-hover)]"
          onClick={() => setOpen((o) => !o)}
        >
          {/* `min-h-8` matches a release row, whose first line is 32px because it
              carries the overflow menu. Without it the draft's line sat 12px
              shorter, so one rail dot offset could not serve both rows. */}
          <div className="flex min-h-8 items-center gap-2.5">
            {/* Same branch mark as a release row — the draft is a node on the
                same tree, and it opens into a diff the same way. */}
            <ChevronDown className={`h-3.5 w-3.5 flex-none translate-y-[2px] text-fg-muted transition-transform ${open ? "" : "-rotate-90"}`} />
            <span className="flex-none truncate text-body font-medium text-foreground">Staged changes</span>
            {vsSeq != null && <span className="flex-none text-column text-fg-muted">vs #{vsSeq}</span>}
            <span className="min-w-0 flex-1" />
          </div>
          <div className="mt-[3px] flex items-center gap-1.5 pl-6 text-column">
            <span className="flex-none text-fg-2">{chipLabel}</span>
            {namesLabel && <span className="min-w-0 truncate text-fg-muted">· {namesLabel}</span>}
          </div>
        </div>

        {/* No card around the diff. A release node dropped its wrapper when its
            body became sections; the draft kept one, so the diff sat in a box
            inside a box. ConfigDiff brings its own structure. */}
        {open && (
          <div className="mb-1 mt-2.5 max-w-[900px] pl-6">
            {hasChanges && diff ? (
              <ConfigDiff diff={diff} hasPrev prevSeq={vsSeq} />
            ) : (
              <div className="text-meta text-fg-muted">Saved changes are staged for deploy.</div>
            )}
          </div>
        )}
      </div>
    </RailNode>
  );
}
