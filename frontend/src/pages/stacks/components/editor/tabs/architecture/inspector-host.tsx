import { useEffect } from "react";
import type {
  FormStackResourceData,
  FormVolumeExtendedData as VolumeFormData,
} from "@/pages/stacks/schemas/form-schema";
import type { UseStackEditSession } from "@/pages/stacks/hooks/use-stack-edit-session";
import type { ReleaseLiveStatus } from "@/api/releases";
import type { PublicEndpoint } from "@/pages/stacks/components/editor/public-endpoint-row";
import { selectionKey, type InspectorSelection } from "@/pages/stacks/lib/canvas/inspector-selection";
import { ResourceDrawer } from "./resource-drawer";
import { VolumeDrawer } from "./volume-drawer";

interface InspectorHostProps {
  /** What is open. Null renders nothing and the canvas takes the full width. */
  selection: InspectorSelection | null;
  /** The resource list the canvas is showing — the selection indexes into it. */
  resources: Partial<FormStackResourceData>[];
  session: UseStackEditSession;
  baselineResources: Partial<FormStackResourceData>[];
  serverOutputsByName?: ReadonlyMap<string, string[]>;
  connectionAddonIds: ReadonlySet<string>;
  /** Per-resource-index field errors, as the editor holds them. */
  errors: { [index: number]: { [field: string]: string | undefined } };
  liveMode: boolean;
  liveView?: { resources: Partial<FormStackResourceData>[]; volumes: Partial<VolumeFormData>[] };
  liveStatusResources?: ReleaseLiveStatus["resources"];
  publicEndpoints?: PublicEndpoint[];
  /** Names of volumes that already exist server-side; their spec is immutable. */
  persistedVolumeNames?: ReadonlySet<string>;
  onViewLogs?: (resourceName?: string) => void;
  onClose: () => void;
  /** One level up — a volume back to the service it was opened from. */
  onBack: () => void;
  onRemoveResource: (index: number) => void;
  onOpenVolume: (name: string) => void;
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
  resources,
  session,
  baselineResources,
  serverOutputsByName,
  connectionAddonIds,
  errors,
  liveMode,
  liveView,
  liveStatusResources,
  publicEndpoints,
  persistedVolumeNames,
  onViewLogs,
  onClose,
  onBack,
  onRemoveResource,
  onOpenVolume,
  onRequestDeleteVolume,
}: InspectorHostProps) {
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

  if (!selection) return null;

  if (selection.kind === "resource") {
    return (
      <ResourceDrawer
        key={selectionKey(selection)}
        resourceIndex={selection.index}
        session={session}
        baselineResources={baselineResources}
        serverOutputsByName={serverOutputsByName}
        connectionAddonIds={connectionAddonIds}
        errors={liveMode ? {} : errors[selection.index] ?? {}}
        onClose={onClose}
        onRemove={onRemoveResource}
        onViewLogs={onViewLogs}
        onOpenVolume={liveMode ? undefined : onOpenVolume}
        liveStatusResources={liveStatusResources}
        publicUrls={publicEndpoints?.find((e) => e.service === resources[selection.index]?.name)?.urls}
        live={liveMode ? liveView : undefined}
      />
    );
  }

  return (
    <VolumeDrawer
      key={selectionKey(selection)}
      volumeName={selection.name}
      session={session}
      onClose={onClose}
      from={selection.from ? { name: selection.from.name, onBack } : undefined}
      onRequestRemove={onRequestDeleteVolume}
      persisted={persistedVolumeNames?.has(selection.name) ?? false}
    />
  );
}
