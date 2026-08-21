import { useCallback, useEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type {
  FormStackResourceData,
  FormVolumeExtendedData as VolumeFormData,
} from "@/pages/stacks/schemas/form-schema";
import type { EditSessionTab, UseStackEditSession } from "@/pages/stacks/hooks/use-stack-edit-session";
import type { ReleaseLiveStatus } from "@/api/releases";
import type { PublicEndpoint } from "@/pages/stacks/components/editor/public-endpoint-row";
import { CanvasEditor } from "./canvas-editor";
import type { CanvasViewMode } from "@/pages/stacks/components/editor/version-chip";
import { AddVolumeDialog } from "./add-volume-dialog";
import { CanvasContextMenu, type CanvasMenuTarget } from "./canvas-context-menu";
import { MountPathDialog } from "./mount-path-dialog";
import {
  openVolumeFrom,
  pruneSelection,
  stepBack,
  type InspectorSelection,
} from "@/pages/stacks/lib/canvas/inspector-selection";
import { InspectorHost } from "./inspector-host";
import { useCanvasGraph } from "./use-canvas-graph";
import { useCanvasDraft } from "./use-canvas-draft";
import { useCanvasViewMode } from "./use-canvas-view-mode";
import { useCanvasOverlay } from "@/pages/stacks/lib/canvas/canvas-overlay";

interface ArchitectureTabProps {
  session: UseStackEditSession;
  /** Diff baseline (the deployed release snapshot when one exists). */
  baselineResources: Partial<FormStackResourceData>[];
  baselineVolumes: Partial<VolumeFormData>[];
  /** Current server state — what the canvas shows when no session is active,
   *  and what a lazily-started session's working draft seeds from. */
  draftResources: Partial<FormStackResourceData>[];
  draftVolumes: Partial<VolumeFormData>[];
  /** Server-computed resource outputs keyed by resource name — used to populate
   *  the env-var output pickers for resources whose draft copy has no outputs. */
  serverOutputsByName?: ReadonlyMap<string, string[]>;
  connectionAddonIds: ReadonlySet<string>;
  addonNameById: ReadonlyMap<string, string>;
  /** addonId → live state (e.g. "Ready"), for canvas addon node dots. */
  addonStateById?: ReadonlyMap<string, string>;
  errors: { [index: number]: { [field: string]: string | undefined } };
  /** Null for draft (unsaved) stacks — no server topology exists yet. */
  topologyIds: { orgId: string; projectName: string; stackId: string } | null;
  /** Bump to force a topology refetch (wired to autosave refreshes). */
  topologyRefreshKey: number;
  /** Immediate, confirm-gated server-side volume deletion. Undefined for draft
   *  (unsaved) stacks — nothing exists server-side to delete yet. */
  onDeleteVolume?: (name: string) => Promise<boolean>;
  /** Names of volumes that already exist server-side; their spec is immutable. */
  persistedVolumeNames?: ReadonlySet<string>;
  /** A release is in flight — node status dots show pending until it terminates
   *  (per-resource server state lags the deploy and would flash a stale Ready). */
  releaseInFlight?: boolean;
  /** Live per-resource status, keyed by resource name — from the status
   *  release's live_status.resources. Drives node dots + the resource drawer. */
  liveStatusResources?: ReleaseLiveStatus["resources"];
  /** Service → best live URL (as shown in the header's PUBLIC row); feeds the
   *  resource drawer's endpoint line. */
  publicEndpoints?: PublicEndpoint[];
  /** Bumped by the parent to request opening a resource drawer (banner "jump to
   *  error") on the tab holding the field; the nonce distinguishes repeat jumps
   *  to the same resource. */
  openResourceSignal?: { index: number; tab: EditSessionTab; nonce: number } | null;
  /** The converged (live) release's snapshot as form data. Present once a
   *  converged release exists and its detail has loaded — enables the
   *  Draft/Live canvas toggle; the Live view is read-only. */
  liveView?: {
    resources: Partial<FormStackResourceData>[];
    volumes: Partial<VolumeFormData>[];
    linkedAddonIds: ReadonlySet<string>;
  };
  /** Which version the canvas shows. Owned by the header's version chip — the
   *  canvas no longer carries a control for it. */
  viewMode: CanvasViewMode;
  /** Ask for a different version. The canvas needs this for one case only: a
   *  banner "jump to error" is draft-indexed, so it has to leave Live first. */
  onViewModeChange: (mode: CanvasViewMode) => void;
}

function StackCanvasFlow({
  session,
  baselineResources,
  baselineVolumes,
  draftResources,
  draftVolumes,
  serverOutputsByName,
  connectionAddonIds,
  addonNameById,
  addonStateById,
  errors,
  topologyIds,
  topologyRefreshKey,
  onDeleteVolume,
  persistedVolumeNames,
  releaseInFlight,
  liveStatusResources,
  publicEndpoints,
  openResourceSignal,
  liveView,
  viewMode,
  onViewModeChange: setViewMode,
}: ArchitectureTabProps) {
  const [selection, setSelection] = useState<InspectorSelection | null>(null);
  const [menuTarget, setMenuTarget] = useState<CanvasMenuTarget | null>(null);
  const [addVolumeOpen, setAddVolumeOpen] = useState(false);
  const [addVolumeResourceIdx, setAddVolumeResourceIdx] = useState<number | null>(null);
  const [attachRequest, setAttachRequest] = useState<{ volumeName: string; resourceIdx: number | null } | null>(
    null,
  );

  const overlay = useCanvasOverlay();

  const closeInspector = useCallback(() => setSelection(null), []);
  const backOneLevel = useCallback(() => setSelection((s) => stepBack(s)), []);

  const { liveMode, resources, linkedAddonIds, volumes, volumeNames, dirty } =
    useCanvasViewMode({
      session,
      baselineResources,
      baselineVolumes,
      draftResources,
      draftVolumes,
      connectionAddonIds,
      liveView,
      selection,
      setSelection,
      viewMode,
    });

  const draft = useCanvasDraft({
    session,
    baselineResources,
    baselineVolumes,
    draftResources,
    draftVolumes,
    connectionAddonIds,
    resources,
    topologyIds,
    onDeleteVolume,
    onCloseDrawers: closeInspector,
  });

  const openResourceDrawer = useCallback(
    (idx: number, tab: EditSessionTab = "configuration") => {
      // Draft-indexed entry point (banner jump, context menu): indexes only
      // make sense against the draft list, so leave live view first.
      setViewMode("draft");
      // Activate an edit session lazily so drawer edits land in a draft.
      if (!session.isActive) {
        session.start(
          { resources: baselineResources, volumes: baselineVolumes },
          {
            linkedAddonIds: new Set(connectionAddonIds),
            openResourceIdx: idx,
            openTab: tab,
            draft: { resources: draftResources, volumes: draftVolumes },
          },
        );
      } else {
        session.setOpenTab(tab);
      }
      setSelection({ kind: "resource", index: idx });
    },
    [session, baselineResources, baselineVolumes, draftResources, draftVolumes, connectionAddonIds, setViewMode],
  );

  // Open the requested resource drawer when the parent bumps the signal (banner
  // jump). Gated on the nonce so an unrelated re-render can't reopen the drawer.
  const lastJumpNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!openResourceSignal) return;
    if (lastJumpNonceRef.current === openResourceSignal.nonce) return;
    lastJumpNonceRef.current = openResourceSignal.nonce;
    openResourceDrawer(openResourceSignal.index, openResourceSignal.tab);
  }, [openResourceSignal, openResourceDrawer]);

  const openVolumeFromCanvas = useCallback(
    (volumeName: string) => {
      // The volume drawer reads session.draft — make sure a session exists first.
      if (!session.isActive) {
        session.start(
          { resources: baselineResources, volumes: baselineVolumes },
          { linkedAddonIds: new Set(connectionAddonIds), draft: { resources: draftResources, volumes: draftVolumes } },
        );
      }
      setSelection((s) => openVolumeFrom(s, volumeName, resources));
    },
    [session, baselineResources, baselineVolumes, draftResources, draftVolumes, connectionAddonIds, resources],
  );

  const openVolume = useCallback(
    (name: string) => {
      // Guard dangling mount references (mount rows can outlive a deleted
      // volume): pushing one would render an empty panel.
      const current = session.isActive ? session.draft.volumes : draftVolumes;
      if (!current.some((v) => v.name === name)) return;
      setSelection((s) => openVolumeFrom(s, name, resources));
    },
    [session, draftVolumes, resources],
  );

  // Read-only live inspection opens the disabled drawer without a session.
  const onGraphOpenResource = useCallback(
    (idx: number) => {
      if (liveMode) {
        setSelection({ kind: "resource", index: idx });
        return;
      }
      openResourceDrawer(idx);
    },
    [liveMode, openResourceDrawer],
  );

  const onRequestAttach = useCallback(
    (request: { volumeName: string; resourceIdx: number }) => setAttachRequest(request),
    [],
  );

  const graph = useCanvasGraph({
    resources,
    linkedAddonIds,
    addonNameById,
    addonStateById,
    volumeNames,
    dirty,
    topologyIds,
    topologyRefreshKey,
    releaseInFlight,
    liveStatusResources,
    publicEndpoints,
    liveMode,
    inspectorOpen: selection != null,
    onOpenResource: onGraphOpenResource,
    onOpenVolume: openVolumeFromCanvas,
    onRequestAttach,
    onContextMenu: setMenuTarget,
  });

  /** Radix modal-from-menu race: opening a Dialog/AlertDialog in the same commit
   *  that closes the modal DropdownMenu makes the dialog save the menu's
   *  `pointer-events: none` body lock as the value to restore on close, wedging
   *  the page. Defer the open one tick so the menu's lock is released first. */
  const deferOpen = useCallback((fn: () => void) => {
    setTimeout(fn, 0);
  }, []);

  // Drop a selection whose target no longer exists in the shown list (deleted
  // resource/volume — or a view switch shrinking the list).
  useEffect(() => {
    const names = new Set(volumes.map((v) => v.name).filter((n): n is string => !!n));
    setSelection((s) => {
      const next = pruneSelection(s, resources.length, names);
      // Same-ref bailout: skip the state update (and re-render) when nothing changed.
      return next === s ? s : next;
    });
  }, [resources.length, volumes]);

  return (
    <div className="flex h-full w-full">
      {/* The canvas column. Everything that floats over the graph belongs in
          here — the inspector takes its width off this column, so chrome
          positioned against the full body would land on top of the panel.

          **Edge to edge, deliberately.** It spent a pass inset 16 from the sheet
          on three sides with a rounded top, on the theory that a gap would keep
          the two grounds from merging. Judged live it did the opposite: the
          canvas IS the working surface of this screen, and framing it made it
          read as a widget dropped into the page rather than the thing the page
          is for. Separating it from the sheet is the GRID's job now — see
          `--surface-canvas` and `--grid` in `index.css`. */}
      <div className="relative min-w-0 flex-1">
        <CanvasEditor
          nodes={graph.nodes}
          edges={graph.showConnections ? graph.edges : []}
          onNodesChange={graph.onNodesChange}
          onEdgesChange={graph.onEdgesChange}
          onNodeClick={graph.onNodeClick}
          onNodeContextMenu={graph.onNodeContextMenu}
          onNodeDragStart={graph.onNodeDragStart}
          onNodeDrag={graph.onNodeDrag}
          onNodeDragStop={graph.onNodeDragStop}
          showConnections={graph.showConnections}
          onToggleConnections={graph.toggleConnections}
          onAutoLayout={graph.autoLayout}
          addedBlockIds={draft.addedBlockIds}
          onAddBlock={draft.onAddBlock}
          addons={draft.pickableAddons}
          linkedAddonIds={linkedAddonIds}
          onLinkAddon={draft.onLinkAddon}
          canAddVolume={resources.length > 0}
          onAddVolume={() => setAddVolumeOpen(true)}
          readOnly={liveMode}
        />
        {overlay}
      </div>
      <InspectorHost
        selection={selection}
        session={session}
        baselineResources={baselineResources}
        serverOutputsByName={serverOutputsByName}
        connectionAddonIds={connectionAddonIds}
        errors={errors}
        liveMode={liveMode}
        liveView={liveView}
        liveStatusResources={liveStatusResources}
        persistedVolumeNames={persistedVolumeNames}
        // The drawer streams this resource's logs in its own Logs tab, so it
        // needs the stream's address rather than a way to navigate to it. Null
        // topology means a draft stack — nothing deployed, nothing to stream.
        logs={topologyIds ? { stackId: topologyIds.stackId, organizationId: topologyIds.orgId } : undefined}
        onClose={closeInspector}
        onBack={backOneLevel}
        onRemoveResource={draft.removeResource}
        onOpenVolume={openVolume}
        // The same two lines the canvas context menu runs for "Add volume" —
        // one act, one dialog, reached from either place.
        onAddVolumeToResource={(idx) => {
          setAddVolumeResourceIdx(idx);
          setAddVolumeOpen(true);
        }}
        onRequestDeleteVolume={draft.onRequestDeleteVolume}
      />
      <AddVolumeDialog
        open={addVolumeOpen}
        onOpenChange={(o) => {
          setAddVolumeOpen(o);
          if (!o) setAddVolumeResourceIdx(null);
        }}
        resources={resources}
        volumes={volumes}
        initialResourceIdx={addVolumeResourceIdx}
        onCreate={draft.onCreateVolume}
      />
      <CanvasContextMenu
        target={menuTarget}
        onClose={() => setMenuTarget(null)}
        onOpenResource={openResourceDrawer}
        onAddVolumeToResource={(idx) => {
          deferOpen(() => {
            setAddVolumeResourceIdx(idx);
            setAddVolumeOpen(true);
          });
        }}
        onDeleteResource={draft.onRequestDeleteResource}
        onDisconnectVolume={draft.onDisconnectVolume}
        onOpenVolume={openVolumeFromCanvas}
        onRequestDeleteVolume={draft.onRequestDeleteVolume}
        onRequestAttach={(volumeName) => deferOpen(() => setAttachRequest({ volumeName, resourceIdx: null }))}
      />
      <MountPathDialog
        volumeName={attachRequest?.volumeName ?? null}
        resources={resources}
        resourceIdx={attachRequest?.resourceIdx ?? null}
        onCancel={() => {
          const req = attachRequest;
          setAttachRequest(null);
          if (req) graph.restoreDragStart(req.volumeName);
        }}
        onAttach={(input) => {
          draft.onAttachVolume(input);
          graph.clearDragStart();
          setAttachRequest(null);
        }}
      />
    </div>
  );
}

/**
 * Flag-gated entry mounted in the Configuration tab. Renders the stack as a node
 * graph; clicking a service node opens the config drawer. The `relative` wrapper
 * anchors the drawer overlay.
 */
export function ArchitectureTab(props: ArchitectureTabProps) {
  return (
    // Edge-to-edge inside the full-bleed editor shell (shell owns the chrome).
    <div className="relative h-full w-full overflow-hidden">
      <ReactFlowProvider>
        <StackCanvasFlow {...props} />
      </ReactFlowProvider>
    </div>
  );
}
