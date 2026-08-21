import { useEffect, useRef, useState } from "react";
import type {
  FormStackResourceData,
  FormVolumeExtendedData as VolumeFormData,
} from "@/pages/stacks/schemas/form-schema";
import type { UseStackEditSession } from "@/pages/stacks/hooks/use-stack-edit-session";
import type { ReleaseLiveStatus } from "@/api/releases";
import { selectionKey, type InspectorSelection } from "@/pages/stacks/lib/canvas/inspector-selection";
import { useSidebarOptional } from "@/components/ui/sidebar";
import { ResourceDrawer } from "./resource-drawer";
import { VolumeDrawer } from "./volume-drawer";

/** The width below which a peer sheet and an expanded nav rail cannot both be
 *  afforded. The shell is 1440 by design; 1280 is the rung under it, and at
 *  1280 the canvas keeps ~630 with the rail folded. */
const NARROW_SHELL_PX = 1280;

/** `--rail-duration`. The panel outlives its selection by exactly the time the
 *  column takes to close, and not a frame longer. */
const RAIL_DURATION_MS = 200;

/**
 * **What is on screen, and whether the column holding it is open.**
 *
 * Two facts, because they are not the same fact for the length of one
 * transition. Opening, the panel has to exist for a frame while the track is
 * still `0fr`, or there is nothing for the browser to animate FROM and the
 * column snaps to full width. Closing, the track has to reach `0fr` while the
 * panel is still mounted, or an empty column collapses on nothing — which
 * reads as the panel popping out of existence and the sheet growing after it.
 *
 * So `shown` trails `selection` on the way out and `open` trails it on the way
 * in. The rail does this without any state at all, because its content never
 * unmounts; a selection-driven panel has to say it out loud.
 */
function usePanelPresence(selection: InspectorSelection | null) {
  const [shown, setShown] = useState<InspectorSelection | null>(selection);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selection) {
      setShown(selection);
      // **Two frames, not one.** `open` in the same commit that mounts the
      // panel gives the column no closed state to leave. One frame later is
      // still not enough: mounting a whole form overruns its frame, so the
      // flip lands in the SAME paint as the mount — measured, the column went
      // 0 → 389 of 408 in a single frame and only the last 19px eased. The
      // second frame is the one guaranteed to have painted the closed state.
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setOpen(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    setOpen(false);
    const t = setTimeout(() => setShown(null), RAIL_DURATION_MS);
    return () => clearTimeout(t);
  }, [selection]);

  return { shown, open };
}

interface InspectorHostProps {
  /** What is open. Null renders nothing and the canvas takes the full width. */
  selection: InspectorSelection | null;
  session: UseStackEditSession;
  baselineResources: Partial<FormStackResourceData>[];
  serverOutputsByName?: ReadonlyMap<string, string[]>;
  connectionAddonIds: ReadonlySet<string>;
  /** Per-resource-index field errors, as the editor holds them. */
  errors: { [index: number]: { [field: string]: string | undefined } };
  liveMode: boolean;
  liveView?: { resources: Partial<FormStackResourceData>[]; volumes: Partial<VolumeFormData>[] };
  liveStatusResources?: ReleaseLiveStatus["resources"];
  /** Names of volumes that already exist server-side; their spec is immutable. */
  persistedVolumeNames?: ReadonlySet<string>;
  /** Where a resource's log stream lives — null while the stack is a draft. */
  logs?: { stackId: string; organizationId: string };
  onClose: () => void;
  /** One level up — a volume back to the service it was opened from. */
  onBack: () => void;
  onRemoveResource: (index: number) => void;
  onOpenVolume: (name: string) => void;
  /** Open the add-volume dialog with this resource preselected — the same act
   *  the canvas context menu offers, reached from the Mounts empty state. */
  onAddVolumeToResource: (resourceIndex: number) => void;
  onRequestDeleteVolume: (name: string) => void;
}

/**
 * Which of the two inspector bodies is showing, and the one key that closes it.
 *
 * There is no stacking left to do here. The panel is a region of the sheet and
 * there is exactly one of it, so this is a switch plus a keybinding — the
 * arithmetic that used to live in a `DrawerStack` (stagger, inset, depth,
 * truncate-to-index) went with the float.
 */
export function InspectorHost({
  selection,
  session,
  baselineResources,
  serverOutputsByName,
  connectionAddonIds,
  errors,
  liveMode,
  liveView,
  liveStatusResources,
  persistedVolumeNames,
  logs,
  onClose,
  onBack,
  onRemoveResource,
  onOpenVolume,
  onAddVolumeToResource,
  onRequestDeleteVolume,
}: InspectorHostProps) {
  /**
   * **Under 1280 the panel takes the room from the nav, not from the canvas.**
   *
   * The inspector is a peer sheet: opening it costs the main sheet 408px, and
   * on a 13" laptop that leaves the canvas about 530 — narrow enough that the
   * graph it exists to edit stops being readable. The nav rail is the cheapest
   * 200 on the screen at that moment: it is a list of places you are not
   * going while you configure a node.
   *
   * **It collapses on the way in and stays collapsed on the way out.** An
   * automatic re-expand would move two columns every time a panel closed, and
   * half of those closes are on the way to opening the next node — the rail
   * would flap. Collapsing is a suggestion the user can overrule at any time
   * with the trigger; re-expanding would be the shell overruling THEM.
   *
   * Measured on the transition into open, so a resize while a panel is already
   * up does not yank the rail, and a manual re-expand mid-session sticks.
   */
  const sidebar = useSidebarOptional();
  const wasOpen = useRef(false);
  useEffect(() => {
    const isOpen = selection !== null;
    const justOpened = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (!justOpened || !sidebar || sidebar.isMobile) return;
    if (window.innerWidth < NARROW_SHELL_PX) sidebar.setOpen(false);
  }, [selection, sidebar]);

  const { shown, open } = usePanelPresence(selection);

  /**
   * **One binding, because there is one panel.** It used to be two: `Esc`
   * popped the front panel off the stack and `Shift+Esc` closed all of them.
   * With a single panel the two collapse — `Esc` steps a volume back to its
   * service, and closes from anywhere else.
   *
   * `defaultPrevented` is the guard that lets a Select or a Popover inside the
   * panel take its own Escape first; without it, dismissing a dropdown would
   * close the whole inspector behind it.
   */
  useEffect(() => {
    if (!selection) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (selection.kind === "volume" && selection.from) onBack();
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, onBack, onClose]);

  if (!shown) return null;

  if (shown.kind === "resource") {
    return (
      <ResourceDrawer
        key={selectionKey(shown)}
        open={open}
        resourceIndex={shown.index}
        session={session}
        baselineResources={baselineResources}
        serverOutputsByName={serverOutputsByName}
        connectionAddonIds={connectionAddonIds}
        errors={liveMode ? {} : errors[shown.index] ?? {}}
        onClose={onClose}
        onRemove={onRemoveResource}
        logs={logs}
        onOpenVolume={liveMode ? undefined : onOpenVolume}
        onAddVolume={liveMode ? undefined : () => onAddVolumeToResource(shown.index)}
        liveStatusResources={liveStatusResources}
        live={liveMode ? liveView : undefined}
      />
    );
  }

  return (
    <VolumeDrawer
      key={selectionKey(shown)}
      open={open}
      volumeName={shown.name}
      session={session}
      onClose={onClose}
      from={shown.from ? { name: shown.from.name, onBack } : undefined}
      onRequestRemove={onRequestDeleteVolume}
      persisted={persistedVolumeNames?.has(shown.name) ?? false}
    />
  );
}
