import { type ReactNode } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelectionSlide } from "@/hooks/use-selection-slide";
import { TAB_TRIGGER_CLASS, TabIndicator } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusChip } from "@/components/branded";
import type { StackLifecycle } from "@/api/stacks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AutosaveStatus } from "./autosave-status";
import { DeployPill } from "./deploy-pill";
import { CanvasOverlayContext } from "@/pages/stacks/lib/canvas/canvas-overlay";
import type { SyncStatus } from "@/pages/stacks/lib/draft-sync/constants";
import { PublicEndpointRow, type PublicEndpoint } from "./public-endpoint-row";
import { EDITOR_TABS, type EditorTabId } from "./editor-tabs";
import { rollupWord } from "@/pages/stacks/components/list/status";
import type { ReleaseHealth } from "./tabs/deployments/derive";


/**
 * The four editor modes, in display order.
 *
 * **No icons.** Each carried one, and not one of them made a distinction the
 * word did not already make — a grid, a clock, a scroll and a wave beside four
 * unambiguous nouns. They cost 22px each on a row that also has to hold a
 * status and three controls, and the active tab ended up wearing a border to
 * be found among them. Words alone, and the selection is the wash.
 */
const TAB_ITEMS = [
  { id: EDITOR_TABS.architecture, label: "Architecture" },
  { id: EDITOR_TABS.deployments, label: "Deployments" },
  { id: EDITOR_TABS.logs, label: "Logs" },
  { id: EDITOR_TABS.metrics, label: "Metrics" },
] as const;


export interface CanvasEditorShellProps {
  /** Persistence key for header collapse; falls back to a shared draft key. */
  stackId?: string;
  /** Health off the current/latest release (ReleaseHealth: "ok" | "progressing" | "degraded" |
   *  "failed"). Undefined → nothing ever deployed → a neutral "Not deployed" pill. */
  headerHealth?: string;
  /** The latest release failed while a different (healthy) release stays live — the
   *  main pill shows that release's health, so this drives a secondary error hint. */
  latestDeployFailed?: boolean;
  /** Stack entity lifecycle — "deleting" overrides health with a pending "Deleting" pill. */
  lifecycle?: StackLifecycle;
  /** Human subtitle, e.g. "3 services · 2 volumes". */
  subtitle: string;
  /** Optional contextual banner under the header (e.g. preview-environment notice). */
  notice?: ReactNode;
  /** At least one resource exists on the canvas — gates the draft deploy pill. */
  hasResources: boolean;
  /** New (unsaved) stack — Deploy creates the stack and starts the first release in one go. */
  isNewStack?: boolean;
  activeTab: EditorTabId;
  onTabChange: (tab: EditorTabId) => void;

  // ── dirty / action wiring (all from the existing session + deploy lifecycle) ──
  /** An edit session is open. */
  isActive: boolean;
  /** Count of resources with pending changes — drives the Configuration tab badge. */
  /** Total dirty entities (resources + volumes + addon links) — drives "View changes (N)". */
  dirtyTotal: number;
  /** A saved-but-undeployed diff exists (lifecycle.phase === "staged"). */
  isStaged: boolean;
  /** Open the review-and-discard modal for undeployed changes. */
  /** Autosave status for existing stacks (idle/saving/saved/error). */
  syncStatus: SyncStatus;
  deployBusy: boolean;
  canWrite: boolean;
  /** Draft-mode create action. */
  onDraftDeploy?: () => void;
  draftDeploying?: boolean;
  onDeploy: () => void;
  /** Session-scope discard of server-persisted draft changes. */
  /** Whether the "Discard draft changes" menu item should appear. */
  onDelete: () => void;
  /** Whether Delete is enabled. */
  canDeleteStack: boolean;

  /** Public endpoints to show in the expanded header (one row of chips). */
  publicEndpoints?: PublicEndpoint[];
  /**
   * Which copy of the stack is showing, and its menu. Built by the page (which
   * owns the mode) rather than here, because the canvas has to obey the same
   * state and the two are siblings.
   */
  versionChip?: ReactNode;

  // ── mode bodies (rendered by active tab) ──
  architecture: ReactNode;
  deployments: ReactNode;
  logs: ReactNode;
  metrics: ReactNode;
}

/**
 * Full-bleed editor chrome shown when the canvas flag is on. The title row is
 * identity only (name + single status pill); deploy actions now live in the
 * floating canvas deploy pill (see DeployPill) rather than the rail. The rail
 * keeps tabs on the left and, on the right, the autosave indicator, the stack
 * ⋮ actions menu, and the collapse chevron (header-only). Zen mode (⌘. or the
 * canvas control) also collapses the header through HeaderCollapseContext,
 * folding the sidebar with it.
 *
 * Presentation only: it owns no stack state. The autosave indicator and
 * deploy pill are wired straight to the caller's session + deploy lifecycle.
 */
export function CanvasEditorShell({
  headerHealth,
  latestDeployFailed,
  lifecycle,
  subtitle,
  notice,
  hasResources,
  isNewStack,
  activeTab,
  onTabChange,
  isActive,
  dirtyTotal,
  isStaged,
  syncStatus,
  deployBusy,
  canWrite,
  onDraftDeploy,
  draftDeploying,
  onDeploy,
  onDelete,
  canDeleteStack,
  publicEndpoints,
  versionChip,
  architecture,
  deployments,
  logs,
  metrics,
}: CanvasEditorShellProps) {
  // The inspector used to float over the canvas as a fixed-position panel, so
  // the shell had to shift its own header rows out from under it and hide the
  // panel on non-architecture tabs. It is now a region INSIDE the canvas body,
  // taking width from the graph rather than from the sheet — so the header
  // spans the full sheet at every panel state, and the ops-view overlay covers
  // the panel the same way it covers everything else on the canvas.

  // **The same word the list row said.** It used to be assembled here — raw
  // `headerHealth` when there was one, the string "Not deployed" when there was
  // not, "Deleting" over the top — which is the stacks list's rollup rule
  // written a second time, and it drifted: the list humanised its word and this
  // printed the wire's, so a stack that read `Degraded` on the list read
  // `degraded` in its own header. One function now, in the list that owns it.
  const rollup = rollupWord(lifecycle, headerHealth as ReleaseHealth | undefined);

  const { trackRef: tabTrack, box, armed } = useSelectionSlide(activeTab, TAB_ITEMS.length);


  // The canvas (Configuration) stays mounted so its open drawer + node
  // selection survive tab switches; ops views render as an opaque overlay on
  // top when active.
  const opsBody =
    activeTab === EDITOR_TABS.deployments
      ? deployments
      : activeTab === EDITOR_TABS.logs
        ? logs
        : activeTab === EDITOR_TABS.metrics
          ? metrics
          : null;

  const actionsMenu = !isNewStack && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* A face, not a ghost. It is the last thing on a row of three
            controls, and a ghost among two solid faces reads as absent until
            you hover it — the same material as the version chip at the other
            end of the cluster, which is what makes them read as one row. */}
        <Button type="button" variant="outline" size="icon" aria-label="Stack actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        {/* Defer the dialog-opening callback until after the menu has fully
            closed. Radix's DropdownMenu→Dialog composition races the menu's
            close (which resets document.body.style.pointerEvents) against the
            dialog's mount, and can leave pointer-events "none" on body forever
            once the dialog unmounts.
            See https://github.com/radix-ui/primitives/issues/1836 */}
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onSelect={() => setTimeout(() => onDelete(), 0)}
          disabled={!canDeleteStack}
        >
          <Trash2 className="size-4 text-danger" />
          Delete stack
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* **One header — the sheet's own, not a second one under it.**
          The editor drew its own 108px band directly beneath the sheet header,
          so the screen opened with two hairlines, two rows of chrome and the
          stack's name two rows above the status that described it. There was
          never a second header's worth of content: the trail was in the top
          band and everything else in the bottom one, which is one header split
          across two.

          It all portals into the real header now (§12a) — the status beside the
          name it belongs to, the version and the actions on the right, the four
          tabs in the toolbar row. The band the editor used to draw is gone, and
          with it 108px of the canvas back. */}
      <PageHeader
        identity={
          <>
            {/* **No name field here — the crumb is the name (§12a).**
                A draft used to open with a dashed input beside the trail and
                an empty value in it, which made the first thing the canvas
                asked for the one thing the user had least reason to have
                decided. It opens named now, and the trail's last segment
                renames it through the SAME control every saved stack uses. */}
            {/* A draft has no name yet, so the field IS the title — it stands
                where the breadcrumb's last segment would, rather than in a
                band of its own. */}
            {!isNewStack && <StatusChip domain="stack_rollup" state={rollup} />}
            {/* A SECOND fact, not a second reading of the first: the stack is
                serving, and the newest attempt to change it did not land. The
                rollup word cannot say it without lying about the live release.
                It is a button because the thing you want next is the deploy it
                came from. */}
            {latestDeployFailed && (
              <button
                type="button"
                onClick={() => onTabChange(EDITOR_TABS.deployments)}
                aria-label="Latest deploy failed — view deployments"
                className="focus-ring-edge rounded-sm transition-opacity hover:opacity-80"
              >
                {/* `release`, not `stack_rollup` — this reports one deploy
                    attempt, and the rollup beside it reports the stack. */}
                <StatusChip domain="release" state="Failed" />
              </button>
            )}
          </>
        }
        actions={
          // 6px through the whole cluster, and the cluster is one box so the
          // slot's own 8px gap cannot reach inside it. The `[&_button]:!text-body`
          // that used to sit here is gone with the reason for it: the bar ran
          // its buttons at 14 and this row had to force the documented 13 back.
          // The bar no longer sets type, so the Button's own size stands.
          <div className="flex items-center gap-1.5">
            {!isNewStack && <AutosaveStatus status={syncStatus} />}
            {versionChip}
            <DeployPill
              isDraft={isNewStack}
              hasResources={hasResources}
              dirtyTotal={dirtyTotal}
              isStaged={isStaged}
              isActive={isActive}
              deployBusy={deployBusy}
              draftDeploying={draftDeploying}
              canWrite={canWrite}
              onDeploy={onDeploy}
              onDraftDeploy={onDraftDeploy}
            />
            {actionsMenu}
          </div>
        }
        toolbar={
          // 2px apart. The tabs used to sit 4px apart in bordered boxes, which
          // made four navigation targets look like four controls; at 2px with
          // no border they read as one group and the wash is the only mark.
          // **The same face and the same travel as `TabsList`, from the same
          // two exports.** This row cannot BE a Radix `Tabs`: the canvas body
          // stays mounted across tab changes so an open inspector and a node
          // selection survive, and `TabsContent` unmounts. It shares the design
          // instead of copying it — which is what it was doing, 12px above a
          // drawer wearing the other version.
          <nav ref={tabTrack} aria-label="Editor sections" className="relative flex items-center gap-0.5">
            {box && <TabIndicator box={box} armed={armed} />}
            {TAB_ITEMS.map(({ id, label }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-tab
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onTabChange(id)}
                  className={cn(
                    TAB_TRIGGER_CLASS,
                    active ? "text-foreground" : "text-fg-muted hover:text-foreground",
                  )}
                >
                  {label}
                  {/* **A dot, not a count.** A number here counted a different
                      thing from the version chip on the row above — session
                      dirt against the chip's undeployed diff — so the header
                      showed two numbers that disagreed, and the tab lost the
                      argument because a tab is navigation.

                      A dot makes no claim about how many. It says only *there
                      is something changed behind this tab*, which is the one
                      fact navigation needs and the one the chip cannot give
                      you while you are standing on Logs. In `--change`, the
                      same blue as every other mark that means "differs from
                      what is deployed", so it reads as the same sentence the
                      dirty field rails and the View-changes rows are saying.

                      After the word, on the trigger's own `gap-1.5` — no
                      margin of its own, or the 6px becomes 12. A mark BEFORE
                      the label would shift every label on the row the moment
                      anything was edited. `aria-label` carries it, because a
                      coloured disc is not a word. */}
                  {id === EDITOR_TABS.architecture && dirtyTotal > 0 && (
                    <span
                      role="img"
                      aria-label="has unsaved changes"
                      className="size-1.5 flex-none rounded-full bg-change"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        }
      />
      <div>
        <PublicEndpointRow endpoints={publicEndpoints ?? []} />
        {notice}
      </div>

      {/* Mode body. The canvas is always mounted (keeps its drawer/selection);
          ops views overlay it. Ops views own their own max-width + padding. */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0">
          {/* Handed to the canvas rather than rendered here: the inspector
                takes 480 off the right, and this chrome has to sit inside what
                is left of the graph. See `CanvasOverlayContext`. */}
          <CanvasOverlayContext.Provider
            value={
              activeTab === EDITOR_TABS.architecture ? (
                // Resource/volume tally lives on the canvas (bottom-right)
                // rather than the header, keeping the header a line shorter.
                //
                // **Not mono.** `4 resources · 1 volume` is a count, and a count
                // is not a URL — it was the last mono left on this surface. And
                // **16 from both edges**, not 12/16: the canvas had three
                // overlays at three different insets (island 16, hint 18, tally
                // 12/16), so nothing on it lined up with anything else.
                <span className="pointer-events-none absolute bottom-4 right-4 z-10 text-label tabular-nums text-fg-muted">
                  {subtitle}
                </span>
              ) : null
            }
          >
            {architecture}
          </CanvasOverlayContext.Provider>
        </div>
        {opsBody && <div className="absolute inset-0 overflow-auto bg-background">{opsBody}</div>}
      </div>
    </div>
  );
}
