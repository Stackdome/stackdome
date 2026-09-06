import { cn } from "@/lib/utils";

export type StageStatus = "done" | "active" | "failed" | "todo" | "skipped";

export interface Stages {
  build: StageStatus;
  deploy: StageStatus;
  ready: StageStatus;
}

const ORDER: Array<{ key: keyof Stages; label: string }> = [
  { key: "build", label: "Build" },
  { key: "deploy", label: "Deploy" },
  { key: "ready", label: "Ready" },
];

/**
 * **The mark is the same 8px dot the deploy timeline's rail uses.** It was a
 * 15px ring carrying a typed `✓` / `✕` in JetBrains at 9px — a second mark
 * vocabulary for the same job as the rail beside it, and glyphs that sat low in
 * their disc because a text character has no optical centre to align to.
 * Jaseem's call on the board, August 2026.
 *
 * `skipped` (an image-only stack has no build step) stays distinguishable from
 * `todo`: both are muted, but skipped is hollow — inert rather than pending.
 * They were a solid-vs-hollow pair before and collapsing them would drop a
 * distinction the tracker is the only place to see.
 */
const DOT: Record<StageStatus, string> = {
  done: "bg-success",
  failed: "bg-danger",
  todo: "bg-fg-muted",
  skipped: "border-[1.5px] border-fg-muted",
  active: "",
};

function Mark({ status }: { status: StageStatus }) {
  // In-flight is the only thing that moves (§7), and it is `motion-safe:` so
  // reduced motion still gets the mark — just still.
  if (status === "active") {
    return (
      <span className="h-2 w-2 flex-none rounded-full border-[1.5px] border-warn border-t-transparent motion-safe:animate-spin" />
    );
  }
  return <span className={cn("box-border h-2 w-2 flex-none rounded-full", DOT[status])} />;
}

export function StageTracker({ stages, className }: { stages: Stages; className?: string }) {
  return (
    <div className={cn("flex items-center", className)} role="list">
      {ORDER.map((stage, i) => {
        const status = stages[stage.key];
        return (
          <div key={stage.key} className="flex items-center" data-status={status}>
            <div className="flex items-center gap-1.5" role="listitem">
              <Mark status={status} />
              <span
                className={cn(
                  "font-sans text-meta font-medium",
                  status === "todo" || status === "skipped" ? "text-fg-muted" : "text-foreground",
                )}
              >
                {stage.label}
              </span>
            </div>
            {/* A fixed 20px rule, not `flex-1`. It used to stretch to 86px each,
                so 172px of a 340px component was line. It also used to turn
                green when the stage before it was done — the fact that stage's
                own dot already reported (§7). */}
            {i < ORDER.length - 1 && <span className="mx-[9px] h-[1.5px] w-5 flex-none bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
