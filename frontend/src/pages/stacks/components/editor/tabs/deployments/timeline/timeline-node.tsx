import { ChevronDown } from "lucide-react";
import type { StackRelease } from "@/api/releases";
import type { Stack } from "@/api/stacks";
import type { EditSessionTab } from "@/pages/stacks/hooks/use-stack-edit-session";
import { causeLabel, releaseGitSha, formatDuration, formatReleaseTime } from "../derive";
import { ReleaseState, isDeploying } from "../release-states";
import { useConfirm } from "@/components/branded/confirm";
import type { ReleaseDetail } from "../use-release-detail";
import { ReleaseMenu } from "./release-menu";
import { ReleasePostMortem } from "./release-post-mortem";
import { LiveReleaseBody } from "./live-release-body";
import type { LogContext } from "./split-console";

export interface TimelineNodeProps {
  release: StackRelease;
  prevReleaseId?: string;
  prevSeq?: number;
  detail: ReleaseDetail;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onRollback: (id: string) => void;
  onCancel: (id: string) => void;
  /** releases[0] — render LIVE progress from the stack rather than the stored outcome. */
  isActive: boolean;
  /** This release currently serves traffic (stack.converged_release). */
  isLive: boolean;
  stack: Stack;
  logContext?: LogContext;
  onJumpToResource?: (resourceName: string, tab: EditSessionTab) => void;
  /** Hybrid progress driver: forwarded to the live body's release-scoped event handler. */
  refetchReleases?: () => void;
}

/**
 * One node in the deploy timeline: a lean toggle row + a detail card below. Same shape per
 * release; only the body differs (live progress for the latest, stored post-mortem for earlier).
 */
export function TimelineNode(props: TimelineNodeProps) {
  const { release, prevReleaseId, prevSeq, detail, isOpen, onToggle, onRollback, onCancel, isActive, isLive, stack, logContext, onJumpToResource, refetchReleases } = props;
  const id = release.id ?? "";
  const state = release.state ?? "";
  const confirm = useConfirm();
  const deploying = isDeploying(state);

  /**
   * **Rolling back asks first, and it is never offered on the live release.**
   * Both came from main at the merge. It put the control on the detail card;
   * this branch keeps it in the row's actions menu, so only the guards move —
   * and they are the half that matters. A rollback redeploys an old snapshot
   * over what is serving traffic, which is not something a single click should
   * do; and offering to roll back TO the release already live is an act with no
   * effect, which §11 says should not be offered at all rather than offered and
   * ignored.
   */
  const canRollback = state === ReleaseState.Released && !!release.id && !isLive;
  const requestRollback = async () => {
    const ok = await confirm({
      title: `Roll back to release #${release.sequence}?`,
      description: "The stack redeploys this release's snapshot, replacing what is currently live.",
      confirmLabel: "Roll back",
    });
    if (ok) onRollback(id);
  };

  const sha = releaseGitSha(release);
  const dur = formatDuration(release.rendered_at, release.completed_at);
  const subline = state === ReleaseState.Released
    ? [sha && `git ${sha}`, dur !== "—" && `took ${dur}`].filter(Boolean).join(" · ")
    : release.message || (dur !== "—" ? `took ${dur}` : undefined);
  const ts = formatReleaseTime(release.completed_at ?? release.created_at);

  // **The state is a word on the second line, not a chip on the first.**
  // Grouped by axis: line one is identity and trigger, line two is the whole
  // outcome. A chip put the verdict between `#4` and its cause — two facts from
  // different axes with the explanation stranded on the line below — and it
  // made line one ragged, because a released node has no chip and its cause
  // started 60px left of a failed one's. Jaseem's call on the board, Aug 2026.
  const stateWord = isLive
    ? "Live"
    : state === ReleaseState.Failed
      ? "Failed"
      : deploying
        ? "Deploying"
        : state === ReleaseState.Released
          ? "Released"
          : state;
  // One channel: the rail dot and this word. No fill, no border.
  const stateInk = isLive
    ? "text-success"
    : state === ReleaseState.Failed
      ? "text-danger"
      : deploying
        ? "text-warn"
        : "text-fg-2";

  return (
    <div>
      <div
        className="group -mx-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-[var(--wash-hover)]"
        onClick={() => onToggle(id)}
      >
        <div className="flex items-center gap-2.5">
          {/* **The disclosure leads the row.** On the right it was a control you
              had to travel to; on the left it is the branch mark, and the row's
              own content indents past it — the shape of a tree, which is what a
              rail of releases that open into detail actually is. Rotates from
              closed (pointing at the row) to open (pointing at what it revealed). */}
          <ChevronDown className={`h-3.5 w-3.5 flex-none translate-y-[2px] text-fg-muted transition-transform ${isOpen ? "" : "-rotate-90"}`} />
          <span className="flex-none font-sans text-body font-medium text-foreground">#{release.sequence}</span>
          <span className="flex-none truncate text-body font-medium text-foreground">{causeLabel(release.cause)}</span>
          {/* **The time reads with the row, not against the far edge.** Pinned
              right it was a column of its own, with a gulf between it and the
              release it belongs to that grew with the viewport. */}
          {ts && <span className="flex-none text-column text-fg-muted">{ts}</span>}
          {/* **The menu appears on hover but never leaves the tab order.**
              `opacity`, not `hidden`: it still takes focus, and `focus-within`
              brings it back for anyone arriving by keyboard. */}
          <span
            onClick={(e) => e.stopPropagation()}
            className="flex-none opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
          >
            <ReleaseMenu release={release} onRollback={canRollback ? requestRollback : undefined} onCancel={onCancel} />
          </span>
          <span className="min-w-0 flex-1" />
        </div>
        {/* `pl-6` = the chevron (14) plus the row gap (10): everything under the
            branch mark hangs off the title, not off the rail. */}
        <div className="mt-[3px] flex items-center gap-1.5 pl-6 text-column">
          <span className={`flex-none ${stateInk}`}>{stateWord}</span>
          {subline && <span className="min-w-0 truncate text-fg-muted">· {subline}</span>}
        </div>
      </div>

      {/* The detail no longer sits in one white card. Each section below brings
          its own surface — the diff card, the console, the tinted banner — and
          wrapping them in a second card stacked a sheet on a sheet. */}
      {isOpen && (
        // **Capped, not full-bleed.** The detail is a column of short rows — a
        // `key  from → to`, a resource and its state — and stretched to the
        // sheet's full width each box was mostly empty, with the value column
        // marooned from its key. 900 is the widest thing in here: the console's
        // longest activity line beside its 256px resource pane.
        <div data-testid="release-detail" className="mb-1 mt-1.5 max-w-[900px] pl-6">
          {isActive ? (
            <LiveReleaseBody
              release={release}
              stack={stack}
              logContext={logContext}
              detail={detail}
              prevReleaseId={prevReleaseId}
              prevSeq={prevSeq}
              onJumpToResource={onJumpToResource}
              refetchReleases={refetchReleases}
            />
          ) : (
            <ReleasePostMortem
              detail={detail}
              release={release}
              stack={stack}
              prevReleaseId={prevReleaseId}
              prevSeq={prevSeq}
              logContext={logContext}
              onJumpToResource={onJumpToResource}
            />
          )}
        </div>
      )}
    </div>
  );
}
