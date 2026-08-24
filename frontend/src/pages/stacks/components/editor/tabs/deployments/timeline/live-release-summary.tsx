import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { StackRelease } from "@/api/releases";
import type { Stack } from "@/api/stacks";
import { causeLabel, formatReleaseTime, formatDuration, releaseGitSha } from "../derive";
import { useReleaseDetailContext } from "../use-release-detail";
import { LiveReleaseBody } from "./live-release-body";
import type { LogContext } from "./split-console";

export interface LiveReleaseSummaryProps {
  /** The release currently serving traffic (stack.converged_release). */
  release: StackRelease;
  stack: Stack;
  /** Previous release, for the config diff inside the expanded body. */
  prevReleaseId?: string;
  prevSeq?: number;
  logContext?: LogContext;
}

/**
 * Pins the live release above the timeline so what serves traffic is visible
 * without scrolling (it sinks below newer deploys in a newest-first rail).
 *
 * **It is a line, not a banner.** This was a full-width card with a green fill,
 * a green border, a green chip and a green dot — four channels for a fact that
 * is not the page's news, and it fires precisely when a NEWER deploy has failed,
 * so the loudest, greenest element on the page was reporting "fine" above a red
 * failure. §7 allows the tone one channel however many marks it takes.
 *
 * `pl-0.5` puts its dot on the rail's centre line — the same 274px column the
 * sheet header's leading button sits on. It is release #N condensed, not a
 * second object, and it says so by sitting on that column.
 */
export function LiveReleaseSummary({ release, stack, prevReleaseId, prevSeq, logContext }: LiveReleaseSummaryProps) {
  const [open, setOpen] = useState(false);
  const detail = useReleaseDetailContext();
  const ts = formatReleaseTime(release.completed_at ?? release.created_at);
  const sha = releaseGitSha(release);
  const dur = formatDuration(release.rendered_at, release.completed_at);
  const subline = [sha && `git ${sha}`, dur !== "—" && `took ${dur}`].filter(Boolean).join(" · ");

  return (
    <div>
      <button
        type="button"
        aria-label={`Live release #${release.sequence}`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 border-b border-border pb-2.5 pl-0.5 pt-2 text-left"
      >
        <span className="h-2 w-2 flex-none rounded-full bg-success" aria-hidden />
        <span className="flex-none text-body text-success">Live</span>
        <span className="flex-none text-body font-medium text-foreground">#{release.sequence}</span>
        <span className="flex-none text-body text-fg-2">{causeLabel(release.cause)}</span>
        {subline && <span className="min-w-0 truncate text-body text-fg-muted">· {subline}</span>}
        {ts && <span className="flex-none text-column text-fg-muted">{ts}</span>}
        <span className="min-w-0 flex-1" />
        <ChevronDown className={`h-3.5 w-3.5 flex-none text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="pt-3">
          <LiveReleaseBody
            release={release}
            stack={stack}
            detail={detail}
            prevReleaseId={prevReleaseId}
            prevSeq={prevSeq}
            logContext={logContext}
          />
        </div>
      )}
    </div>
  );
}
