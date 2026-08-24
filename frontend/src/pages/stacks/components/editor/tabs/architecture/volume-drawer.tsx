import { useCallback } from "react";
import { HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DangerZone, DangerZoneRow } from "@/components/branded";
import { DrawerBody, DrawerHeader, DrawerRegion } from "@/components/ui/drawer";
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
        {/* **The footer band is gone with the button that was in it.**

            `Remove volume` was a lone red-inked ghost in an 81px band, which
            made a destroy the only thing this drawer appeared to be FOR — and
            said nothing about what it costs. The same act, in the same material
            as every other destroy in the product, at the foot of the body: §10.

            A drawer with nothing to commit has no footer, and a band that exists
            to hold a hairline is 81px of the column spent on a line.

            The sections pay their own 20 (`p-0` on the body), so this pays its
            own. **16 on top, not 0** — measured at 0 the tint butted straight
            onto the last section's full-bleed hairline, which made the block
            read as one more section of the form rather than as the thing after
            it. The rule says the form ended; the 16 is what lets that reading
            land. */}
        <div className="p-5 pt-4">
          <DangerZone>
            <DangerZoneRow
              title="Remove this volume"
              description="Every service that mounts it loses the mount, and its data goes."
              action={
                /* No glyph — every other danger zone in the product is a word
                   alone. The tint and the red ink have said what kind of act
                   this is; a trash can inside a danger zone is the third time. */
                <Button variant="destructive-ghost" shape="flat" onClick={onRemove}>
                  Remove volume
                </Button>
              }
            />
          </DangerZone>
        </div>
      </DrawerBody>
    </DrawerRegion>
  );
}
