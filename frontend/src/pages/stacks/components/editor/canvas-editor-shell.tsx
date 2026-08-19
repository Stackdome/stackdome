import { type ReactNode } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSelectionSlide, SELECTION_SLIDE_TRANSITION } from "@/hooks/use-selection-slide";
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
  stackName: string;
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
  /** Render the title as an editable input (draft only). */
  nameEditable: boolean;
  onNameChange?: (name: string) => void;
  /** Validation error message for the stack name — shown when nameEditable and set. */
  nameError?: string;
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
  stackName,
  headerHealth,
  latestDeployFailed,
  lifecycle,
  subtitle,
  notice,
  hasResources,
  isNewStack,
  nameEditable,
  onNameChange,
  nameError,
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
            {/* A draft has no name yet, so the field IS the title — it stands
                where the breadcrumb's last segment would, rather than in a
                band of its own. */}
            {nameEditable && (
              <div className="group flex min-w-0 items-center gap-2">
                <Input
                  aria-label="Stack name"
                  aria-invalid={!!nameError}
                  value={stackName}
                  onChange={(e) => onNameChange?.(e.target.value)}
                  placeholder="name-your-stack"
                  className={cn(
                    "h-8 w-[22ch] rounded-md border-dashed bg-transparent",
                    nameError
                      ? "border-danger"
                      : "border-border/60 hover:border-border focus-visible:border-foreground",
                  )}
                />
                <Pencil className="size-4 flex-none text-muted-foreground/60 transition-opacity group-focus-within:opacity-0" />
                {/* The message was a line under the band. With no band left it
                    sits where the fault is — beside the field, in the row that
                    is already the width of the sheet. */}
                {nameError && <span className="text-meta text-danger">{nameError}</span>}
              </div>
            )}
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
          <nav ref={tabTrack} aria-label="Editor sections" className="relative flex items-center gap-0.5">
            {/* The travelling face. Behind the labels, so the ink on top never
                cross-fades with it. */}
            {box && (
              <span
                aria-hidden
                data-slot="tab-indicator"
                className={cn(
                  "absolute left-0 top-0 h-8 rounded-md bg-[var(--wash-selected)]",
                  armed && SELECTION_SLIDE_TRANSITION,
                )}
                style={{ transform: `translateX(${box.x}px)`, width: box.w }}
              />
            )}
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
                    // 8, not 6. §2 makes radius a function of HEIGHT — 28/6 ·
                    // 32/8 · 40/12 — and a tab is a 32px box like every other
                    // control on the row. At 6 the three controls beside it
                    // carried two different corners.
                    "focus-ring-edge relative flex h-8 items-center rounded-md px-2.5 text-body font-medium",
                    "transition-colors duration-150",
                    // **The wash means selected, and nothing else.** Hover was
                    // a second, fainter wash — so pointing at a tab drew a box
                    // that looked like the selection two rungs down, and while
                    // the face was mid-slide there were briefly two boxes lit
                    // and no way to tell which one you were on.
                    //
                    // Hover is the ink coming up to full, and that is all. §7's
                    // rule for the segmented control: selection is carried by
                    // ink and by the raised face, never by a competing tint.
                    active ? "text-foreground" : "text-fg-muted hover:text-foreground",
                  )}
                >
                  {/* No count here. The version chip on the row above already
                      states what is unsaved, and it counted a different thing —
                      session dirt, against the chip's undeployed diff — so the
                      header showed two numbers that disagreed. A tab is
                      navigation; status belongs with the version. */}
                  {label}
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
