import { useEffect, useState } from "react";
import { GitBranch, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogSnapshot } from "@/components/branded";
import { fetchLogSnapshot } from "@/api/observability";
import { BuildLogsLinkTarget, ReleaseEventLinkKind, type ReleaseEvent } from "@/api/releases";
import type { FailingResource, ResourceSource } from "../derive";
import { phaseTone, toneTextClass, toneDotClass, ResourceFailureType, compactEventMessage } from "../derive";
import { BuildLogsModal } from "../build-logs-modal";

export interface LogContext { orgId: string; projectName: string; stackId: string; }
export interface ResourceRowVM { name: string; phase: string; replicas?: string; msg?: string; tag?: string; failure?: FailingResource; source?: ResourceSource; }

type ReleaseEventLevel = NonNullable<ReleaseEvent["level"]>;
const DEFAULT_LEVEL: ReleaseEventLevel = "info";

/**
 * **The level is an 8px dot, the same mark the deploy timeline's rail uses.**
 * It was a typed `✓` / `✕` / `!` / `•` set in JetBrains — a second mark
 * vocabulary for the same job, and characters have no optical centre to align
 * a column on. Jaseem's call on the board, August 2026.
 */
const levelDot: Record<ReleaseEventLevel, string> = {
  success: "bg-success",
  error: "bg-danger",
  warning: "bg-warn",
  info: "bg-fg-ghost",
};

function CrashLog({ ctx, name }: { ctx: LogContext; name: string }) {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    void fetchLogSnapshot(ctx.orgId, ctx.projectName, ctx.stackId, name, 50).then((l) => { if (alive) setLines(l); });
    return () => { alive = false; };
  }, [ctx.orgId, ctx.projectName, ctx.stackId, name]);
  if (!lines.length) return null;
  return <div className="mt-2.5"><LogSnapshot lines={lines} /></div>;
}

export interface SplitConsoleProps {
  rows: ResourceRowVM[];
  events: ReleaseEvent[];
  streaming: boolean;
  logContext?: LogContext;
}

/**
 * "Bright panels" split console: resource rail on the left, activity console on the
 * right. Clicking a resource filters the console to its events and pins its detail
 * (status, source, last failure) above the stream; "all resources" zooms back out.
 * Shared by the live body (streaming) and post-mortem (historical one-shot fetch).
 */
export function SplitConsole({ rows, events, streaming, logContext }: SplitConsoleProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [buildLogs, setBuildLogs] = useState<{ buildId: string; resourceName: string } | null>(null);
  if (rows.length === 0 && events.length === 0 && !streaming) return null;

  const selectedRow = rows.find((r) => r.name === selected);
  const visible = selectedRow ? events.filter((e) => e.resource_name === selectedRow.name) : events;
  const readyCount = rows.filter((r) => phaseTone(r.phase) === "ok").length;
  const failure = selectedRow?.failure;
  const detailMsg = failure ? (failure.message ?? failure.reason) : selectedRow?.msg;
  const isRuntimeCrash = failure?.type === ResourceFailureType.Runtime;

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border-subtle bg-card">
      <div className="flex items-stretch">
        <div className="w-64 flex-none border-r border-border-subtle px-2.5 pb-3.5 pt-3">
          <div className="flex items-baseline px-2 pb-2.5">
            <span className="text-meta text-fg-muted">Resources</span>
            <span className="ml-auto text-meta text-fg-2">{readyCount}/{rows.length} ready</span>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2.5 py-[7px] text-left",
              // Keyed off the RESOLVED row, not raw state: a selection whose row
              // vanished (e.g. topology refresh) falls back to "all resources".
              // Branched, never stacked as a `hover:` variant — a selected face
              // takes no hover at all (picker-row.tsx, §4).
              selectedRow == null ? "bg-[var(--wash-selected)]" : "hover:bg-[var(--wash-hover)]",
            )}
          >
            <span className="h-[7px] w-[7px] flex-none rounded-full border-[1.5px] border-fg-muted" />
            <span className="whitespace-nowrap text-meta text-fg-2">all resources</span>
            <span className="ml-auto text-meta text-fg-muted">{rows.length}</span>
          </button>
          {rows.map((vm) => {
            const tone = phaseTone(vm.phase);
            return (
              <button
                key={vm.name}
                type="button"
                onClick={() => setSelected(vm.name)}
                className={cn(
                  "mt-0.5 flex w-full items-center gap-2 rounded px-2.5 py-[7px] text-left",
                  selected === vm.name ? "bg-[var(--wash-selected)]" : "hover:bg-[var(--wash-hover)]",
                )}
              >
                <span className={cn("h-2 w-2 flex-none rounded-full", toneDotClass(tone))} />
                <span className="min-w-0 truncate text-meta font-medium text-foreground">{vm.name}</span>
                <span className={cn("ml-auto flex-none text-meta", toneTextClass(tone))}>{vm.phase}</span>
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
            <span className="text-meta text-fg-muted">Activity</span>
            <span className="whitespace-nowrap text-meta text-fg-2">· {selectedRow ? selectedRow.name : "all resources"}</span>
            {streaming && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-meta text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> live
              </span>
            )}
          </div>

          {selectedRow && (
            <div className="border-b border-border-subtle bg-muted px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className={cn("h-[7px] w-[7px] flex-none rounded-full", toneDotClass(phaseTone(selectedRow.phase)))} />
                <span className="text-meta font-semibold text-foreground">{selectedRow.name}</span>
                <span className={cn("text-meta font-medium", toneTextClass(phaseTone(selectedRow.phase)))}>{selectedRow.phase}</span>
                {selectedRow.replicas && <span className="text-meta text-fg-muted">{selectedRow.replicas} replicas</span>}
                {selectedRow.tag && <span className="text-meta text-warn">{selectedRow.tag}</span>}
                {failure?.exitCode != null && <span className="text-meta text-fg-muted">exit {failure.exitCode}</span>}
                {failure?.restartCount != null && (
                  <span className="text-meta text-fg-muted">{failure.restartCount} {failure.restartCount === 1 ? "restart" : "restarts"}</span>
                )}
                {selectedRow.source && (
                  <span className="ml-auto flex min-w-0 items-center gap-1.5 text-fg-muted">
                    {/* Replaces a `▢` typed in the copy — a glyph per source KIND
                        makes a distinction the box never did (§7). */}
                    {selectedRow.source.kind === "git"
                      ? <GitBranch aria-hidden="true" className="h-3 w-3 flex-none" />
                      : <Package aria-hidden="true" className="h-3 w-3 flex-none" />}
                    <span className="min-w-0 truncate font-mono text-label">{selectedRow.source.label}</span>
                  </span>
                )}
              </div>
              {detailMsg && <div className={cn("mt-1.5 font-mono text-label leading-relaxed", failure ? "text-danger" : "text-foreground")}>{detailMsg}</div>}
              {/* Crash-log snapshot is a one-shot follow=false read — the only log surface
                  that captures a crashing container's output (the Logs tab is live-only). */}
              {logContext && isRuntimeCrash && failure && <CrashLog ctx={logContext} name={failure.name} />}
            </div>
          )}

          <div className="py-1.5">
            {visible.length === 0 && (
              <div className="px-4 py-2 text-meta text-fg-muted">No activity yet</div>
            )}
            {visible.map((e) => {
              const lv = levelDot[e.level ?? DEFAULT_LEVEL] ?? levelDot[DEFAULT_LEVEL];
              return (
                <div key={e.sequence} className="flex items-start gap-2.5 px-4 py-[5px] hover:bg-[var(--wash-hover)]">
                  {/* `text-column` (11.5/16) — the rung the app's column headers
                      use. Time is furniture (§7), and mono bought nothing here
                      once `tabular-nums` was already holding the column. */}
                  {/* Wide enough for a 12-hour locale — `5:28:12 PM` is 10
                      glyphs and wrapped onto two lines in the old 56px slot. */}
                  <span className="w-[72px] flex-none pt-0.5 text-column tabular-nums text-fg-muted">
                    {e.occurred_at ? new Date(e.occurred_at).toLocaleTimeString() : ""}
                  </span>
                  <span className="flex w-3 flex-none justify-center pt-[7px]">
                    <span className={cn("h-2 w-2 rounded-full", lv)} />
                  </span>
                  <span className="w-[90px] flex-none truncate pt-0.5 text-meta text-fg-muted">{e.resource_name || "release"}</span>
                  <span className="min-w-0 flex-1 break-words text-meta leading-[1.45] text-fg-2">
                    {compactEventMessage(e)}
                    {(e.links ?? []).map((l, i) => {
                      const buildId = l.target?.[BuildLogsLinkTarget.BuildID];
                      return l.kind === ReleaseEventLinkKind.BuildLogs && buildId && logContext ? (
                        <button
                          key={`${l.kind}-${i}`}
                          type="button"
                          className="mt-0.5 flex items-center gap-1 text-label font-medium text-fg-muted transition-colors hover:text-foreground"
                          onClick={() => setBuildLogs({
                            buildId,
                            resourceName: l.target?.[BuildLogsLinkTarget.ResourceName] ?? e.resource_name ?? "",
                          })}
                        >
                          {l.label} &rarr;
                        </button>
                      ) : (
                        <span
                          key={`${l.kind ?? "link"}-${i}`}
                          className="mt-0.5 flex items-center gap-1 text-label font-medium text-fg-muted"
                        >
                          {l.label} &rarr;
                        </span>
                      );
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {buildLogs && logContext && (
        <BuildLogsModal
          open
          onClose={() => setBuildLogs(null)}
          orgId={logContext.orgId}
          projectName={logContext.projectName}
          stackId={logContext.stackId}
          buildId={buildLogs.buildId}
          resourceName={buildLogs.resourceName}
        />
      )}
    </div>
  );
}
