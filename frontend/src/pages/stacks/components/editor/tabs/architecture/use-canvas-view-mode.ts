import { useEffect, useMemo, useRef } from "react";
import type {
  FormStackResourceData,
  FormVolumeExtendedData as VolumeFormData,
} from "@/pages/stacks/schemas/form-schema";
import type { UseStackEditSession } from "@/pages/stacks/hooks/use-stack-edit-session";
import { remapSelectionByName, type InspectorSelection } from "@/pages/stacks/lib/canvas/inspector-selection";
import type { CanvasViewMode } from "@/pages/stacks/components/editor/version-chip";

/** Live view is read-only, so nothing is ever "edited" — an empty dirty set. */
const NO_DIRTY_IDX: ReadonlySet<number> = new Set();

export interface UseCanvasViewModeInput {
  session: UseStackEditSession;
  baselineResources: Partial<FormStackResourceData>[];
  baselineVolumes: Partial<VolumeFormData>[];
  draftResources: Partial<FormStackResourceData>[];
  draftVolumes: Partial<VolumeFormData>[];
  connectionAddonIds: ReadonlySet<string>;
  /** The converged release's snapshot; absent until one exists and has loaded. */
  liveView?: {
    resources: Partial<FormStackResourceData>[];
    volumes: Partial<VolumeFormData>[];
    linkedAddonIds: ReadonlySet<string>;
  };
  selection: InspectorSelection | null;
  setSelection: (next: InspectorSelection | null) => void;
  /**
   * Which version is showing. **Controlled**, because the chip that switches it
   * sits in the sheet header — above this component, not on the canvas.
   */
  viewMode: CanvasViewMode;
}

/**
 * Which copy of the stack the canvas is showing — the live snapshot, the edit
 * session's draft, or plain server state — and the lists derived from that
 * choice. Switching views carries drawers across by name.
 */
export function useCanvasViewMode({
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
}: UseCanvasViewModeInput) {
  // Live mode needs the snapshot data — never trust a stale "live" viewMode
  // if the converged detail hasn't loaded (or went away).
  const liveMode = viewMode === "live" && !!liveView;

  // Read from the live snapshot in live mode; otherwise the draft when the
  // session is active, server state when not.
  const resources = liveMode ? liveView!.resources : session.isActive ? session.draft.resources : draftResources;
  const linkedAddonIds = liveMode
    ? liveView!.linkedAddonIds
    : session.isActive
      ? session.linkedAddonIds
      : connectionAddonIds;
  const volumes = liveMode ? liveView!.volumes : session.isActive ? session.draft.volumes : draftVolumes;
  const volumeNames = useMemo(() => volumes.map((v) => v.name).filter((n): n is string => !!n), [volumes]);

  const dirty = useMemo(
    () =>
      liveMode
        ? {
          // What's deployed can't be "edited"/"new" relative to itself.
          dirtyResourceIdx: NO_DIRTY_IDX,
          baselineResourceCount: resources.length,
          baselineAddonIds: linkedAddonIds,
        }
        : {
          dirtyResourceIdx: session.dirty.dirtyResourceIdx,
          baselineResourceCount: baselineResources.length,
          baselineAddonIds: connectionAddonIds,
        },
    [liveMode, resources.length, linkedAddonIds, session.dirty, baselineResources.length, connectionAddonIds],
  );

  /**
   * Carry the open panel across a version switch.
   *
   * **An effect, not a handler.** The control that switches versions is the
   * header's chip, which sits above this component — so the mode ARRIVES here
   * as a prop rather than being set here. What has to happen on the way across
   * is local, though: the panel is holding a resource by index, and the two
   * lists do not line up, so it is rebound by name and dropped if the target
   * has no counterpart in the version being switched to.
   */
  const prevMode = useRef(viewMode);
  // The list as of the PREVIOUS committed render. By the time the switch
  // effect runs, `resources` already points at the version being switched TO —
  // remapping from that maps every index onto itself and the panel silently
  // lands on whatever happens to sit at the same position.
  const lastResources = useRef(resources);
  useEffect(() => {
    if (prevMode.current === viewMode) return;
    prevMode.current = viewMode;
    const from = lastResources.current;
    const target =
      viewMode === "live" && liveView
        ? { resources: liveView.resources, volumes: liveView.volumes }
        : session.isActive
          ? session.draft
          : { resources: draftResources, volumes: draftVolumes };
    const remapped = remapSelectionByName(selection, { resources: from }, {
      resources: target.resources,
      volumeNames: new Set(target.volumes.map((v) => v.name).filter((n): n is string => !!n)),
    });
    // The panel edits through a session — make sure one exists before a
    // surviving selection lands on the draft side.
    if (viewMode === "draft" && remapped && !session.isActive) {
      session.start(
        { resources: baselineResources, volumes: baselineVolumes },
        {
          linkedAddonIds: new Set(connectionAddonIds),
          openResourceIdx: remapped.kind === "resource" ? remapped.index : remapped.from?.index,
          draft: { resources: draftResources, volumes: draftVolumes },
        },
      );
    }
    setSelection(remapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on the switch itself, against whatever is open at that moment
  }, [viewMode]);

  // Declared AFTER the switch effect, so on the render that flips the mode the
  // effect above still sees the previous version's list.
  useEffect(() => {
    lastResources.current = resources;
  });

  return { liveMode, resources, linkedAddonIds, volumes, volumeNames, dirty };
}
