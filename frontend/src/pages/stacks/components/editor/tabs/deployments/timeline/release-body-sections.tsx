import type { SnapshotDiff } from "../release-snapshot-diff";
import { ConfigDiff } from "./config-diff";

export interface ReleaseBodySectionsProps {
  /** The split console — resources and their activity. */
  children: React.ReactNode;
  diff: SnapshotDiff;
  /** A previous release exists to diff against. */
  hasPrev: boolean;
  /** Sequence the diff is taken against (the previous release). */
  prevSeq?: number;
  /** Previous snapshot still loading — show a placeholder instead of a false "no changes". */
  loading?: boolean;
}

/**
 * A release's body: what changed, then what happened. Identical across live and
 * historical bodies.
 *
 * **These were `Outcomes | Changes` tabs.** Two halves of one question — *what
 * did this deploy alter, and how did it go* — where reading either one hid the
 * other, on a card with room for both. A tab is for things you choose between;
 * these are read together, and the count on `Changes` existed only because the
 * content behind it was invisible. Jaseem's call on the board, August 2026.
 */
export function ReleaseBodySections({ children, diff, hasPrev, prevSeq, loading = false }: ReleaseBodySectionsProps) {
  const changeCount = diff.resources.length + diff.volumes.length;

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center gap-1.5">
        <h3 className="text-meta font-medium text-fg-2">Changes</h3>
        {changeCount > 0 && <span className="text-meta text-fg-muted">{changeCount}</span>}
        {hasPrev && <span className="ml-auto text-column text-fg-muted">vs #{prevSeq ?? "previous"}</span>}
      </div>
      {loading
        ? <div className="text-meta text-fg-muted">Loading changes…</div>
        : <ConfigDiff diff={diff} hasPrev={hasPrev} prevSeq={prevSeq} />}
      {/* The console brings its own `mt-4` and its own `Activity` head. */}
      {children}
    </div>
  );
}
