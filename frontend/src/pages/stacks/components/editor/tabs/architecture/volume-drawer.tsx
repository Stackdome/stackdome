import { useCallback } from "react";
import { HardDrive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrawerActions, DrawerBody, DrawerFooter, DrawerHeader, DrawerRegion } from "@/components/ui/drawer";
import type { UseStackEditSession } from "@/pages/stacks/hooks/use-stack-edit-session";
import type { FormVolumeExtendedData as VolumeFormData } from "@/pages/stacks/schemas/form-schema";
import { VolumeFields } from "@/pages/stacks/components/editor/tabs/architecture/drawer-tabs/volume-fields";
import { removeMountsOf } from "@/pages/stacks/lib/canvas/volume-ops";

interface VolumeDrawerProps {
  /** False for the frame before it opens and for the length of its exit — the
   *  column outside reads it to clip this panel in and out. **Defaults to
   *  open**, which is the honest state for a drawer rendered on its own: a
   *  story has no column to animate and nothing to wait for. */
  open?: boolean;
  /** Draft volume name — the stack entry's identity. */
  volumeName: string;
  session: UseStackEditSession;
  onClose: () => void;
  /**
   * The service this volume was opened from, when there is one. It becomes the
   * first crumb — `web / uploads` — and clicking it is the way back to the
   * service, one level up in the same panel.
   */
  from?: { name: string; onBack: () => void };
  /** When provided, "Remove volume" defers to a caller-owned confirm dialog
   *  instead of removing immediately (e.g. ArchitectureTab's shared confirm). */
  onRequestRemove?: (name: string) => void;
  /** True when the volume already exists server-side — its spec (size) is
   *  immutable once the PVC is provisioned. */
  persisted?: boolean;
}

/** The inspector, one level deep: a volume, in the same panel as its service. */
export function VolumeDrawer({
  open = true,
  volumeName,
  session,
  onClose,
  from,
  onRequestRemove,
  persisted = false,
}: VolumeDrawerProps) {
  const volumes = session.draft.volumes;
  const index = volumes.findIndex((v) => v.name === volumeName);
  const volume = (volumes[index] ?? {}) as Partial<VolumeFormData>;

  const onChange = useCallback(
    (idx: number, updated: Partial<VolumeFormData>) => {
      session.updateVolumes((prev) => prev.map((v, i) => (i === idx ? updated : v)));
    },
    [session],
  );

  const onRemove = useCallback(() => {
    const name = volumes[index]?.name;
    if (onRequestRemove) {
      if (name) onRequestRemove(name);
      return;
    }
    session.updateVolumes((prev) => prev.filter((_, i) => i !== index));
    if (name) session.updateResources((prev) => removeMountsOf(prev, name));
    onClose();
  }, [session, volumes, index, onClose, onRequestRemove]);

  if (index < 0) return null;

  const name = volume.name || volumeName;

  return (
    <DrawerRegion detached open={open} aria-label={`Volume ${name}`} data-testid="volume-drawer">
      <DrawerHeader
        leading={<HardDrive />}
        steps={from ? [{ label: from.name, onClick: from.onBack }, name] : [name]}
        // **The kind leads the sub-line; it does not sit alone in the corner.**
        // `Volume` was a lone word pinned to the header's right edge with
        // nothing to belong to — the only thing on that end of the band, and
        // the eye had to travel back to the name to learn what it described.
        // In front of the facts it is the first word of one phrase.
        description={`Volume · ${volume.spec?.size || "size unset"} · ${volume.spec?.access_mode || "ReadWriteOnce"}`}
        onClose={onClose}
      />
      {/* Sections pay their own inset — see `FormSection`. */}
      <DrawerBody className="gap-0 p-0">
        <VolumeFields
          volume={volume}
          index={index}
          onChange={onChange}
          errors={{}}
          allVolumes={volumes}
          allStackResources={session.draft.resources}
          nameReadOnly
          specReadOnly={persisted}
        />
      </DrawerBody>
      <DrawerFooter>
        <DrawerActions>
          <Button type="button" variant="ghost" className="text-danger hover:bg-danger-bg" onClick={onRemove}>
            <Trash2 aria-hidden />
            Remove volume
          </Button>
        </DrawerActions>
      </DrawerFooter>
    </DrawerRegion>
  );
}
