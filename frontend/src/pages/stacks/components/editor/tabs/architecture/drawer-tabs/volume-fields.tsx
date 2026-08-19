import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { CornerDownRight } from "lucide-react";
import { FieldGrid, FieldShell, FormSection } from "@/components/branded";
import { NAME_RULE_HINT } from "@/pages/stacks/lib/name-rule";
import type { FormVolumeExtendedData as VolumeFormData, FormStackResourceData } from "@/pages/stacks/schemas/form-schema";

/** Derive the list of resources that mount this volume. */
export function volumeMountingInfo(
  volume: Partial<VolumeFormData>,
  allStackResources: Partial<FormStackResourceData>[],
): { resourceName: string; targetPath: string }[] {
  if (!volume.name) return [];
  return allStackResources
    .map((resource) => {
      if (!resource.name || !resource.volume_mounts) return null;
      const mountDetail = resource.volume_mounts.find(
        (vm) => vm.source_volume_name === volume.name,
      );
      return mountDetail ? { resourceName: resource.name, targetPath: mountDetail.target_path } : null;
    })
    .filter(Boolean) as { resourceName: string; targetPath: string }[];
}

interface VolumeFieldsProps {
  volume: Partial<VolumeFormData>;
  index: number;
  onChange: (index: number, updated: Partial<VolumeFormData>) => void;
  errors: { [field: string]: string | undefined };
  allVolumes: Partial<VolumeFormData>[];
  allStackResources?: Partial<FormStackResourceData>[];
  /**
   * Render the Name input read-only. Used by VolumeDrawer, where drawer
   * entries are keyed by volume name — a live rename would orphan the open
   * entry and close the drawer mid-edit.
   */
  nameReadOnly?: boolean;
  /**
   * Render the spec inputs (size) read-only. Used for server-persisted
   * volumes: PVC size is immutable once provisioned, and the autosave engine
   * has no volume-update op — an edit here would silently go nowhere.
   */
  specReadOnly?: boolean;
}

/** Shared form body for a volume: spec ledger and mount details. Removing it
 *  is the owning surface's footer action, not a row at the end of the form. */
export function VolumeFields({
  volume,
  index,
  onChange,
  errors,
  allVolumes,
  allStackResources = [],
  nameReadOnly = false,
  specReadOnly = false,
}: VolumeFieldsProps): ReactNode {
  const update = (patch: Partial<VolumeFormData>) => {
    onChange(index, { ...volume, ...patch });
  };

  const isDuplicate = allVolumes.filter((v) => v.name?.length && v.name === volume.name).length > 1;

  const mountingInfo = volumeMountingInfo(volume, allStackResources);

  return (
    <>
      <FormSection label="Specification">
        <FieldGrid>
          <FieldShell
            label="Name"
            htmlFor={`volume-name-${index}`}
            required
            hint={nameReadOnly ? "Rename from the volumes list." : NAME_RULE_HINT}
            error={errors.name || (isDuplicate ? "Volume name must be unique" : undefined)}
          >
            <Input
              id={`volume-name-${index}`}
              placeholder="Volume name"
              value={volume.name || ""}
              onChange={(e) => update({ name: e.target.value })}
              disabled={nameReadOnly}
              className="h-9 text-meta"
              aria-invalid={!!errors.name || isDuplicate}
            />
          </FieldShell>
          <FieldShell
            label="Size"
            htmlFor={`volume-size-${index}`}
            required
            hint={specReadOnly ? "Fixed once provisioned." : "For example 1Gi or 500Mi."}
            error={errors["spec.size"]}
          >
            <Input
              id={`volume-size-${index}`}
              placeholder="e.g., 1Gi, 500Mi"
              value={volume.spec?.size || ""}
              onChange={(e) =>
                update({
                  spec: {
                    ...volume.spec,
                    size: e.target.value,
                    needs_sync_before_use: volume.spec?.needs_sync_before_use ?? false,
                    access_mode: volume.spec?.access_mode ?? "ReadWriteOnce",
                  },
                })
              }
              disabled={specReadOnly}
              className="h-9 text-meta"
              aria-invalid={!!errors["spec.size"]}
            />
          </FieldShell>
          <FieldShell label="Access mode" hint="One resource at a time, read and write.">
            {/* deliberate off-scale: ~22px-tall code chip, rounded-sm reads too round */}
            <code className="inline-block rounded-[3px] bg-secondary px-2 py-1 text-label text-muted-foreground">
            ReadWriteOnce (RWO)
            </code>
          </FieldShell>
        </FieldGrid>
      </FormSection>

      {mountingInfo.length > 0 && (
        <FormSection
          label="Mounts"
          state={`${mountingInfo.length} ${mountingInfo.length === 1 ? "resource" : "resources"}`}
        >
          {mountingInfo.map((mount, mountIdx) => (
            <div key={mountIdx} className="border-b border-secondary/80 py-1">
              <div className="flex items-center gap-3 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/20">
                <div className="flex w-[150px] shrink-0 items-center gap-2 text-body text-foreground/80 dark:text-fg-2">
                  <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden />
                  <span className="truncate">{mount.resourceName}</span>
                </div>
                {/* deliberate off-scale: ~22px-tall code chip, rounded-sm reads too round */}
                <code className="shrink-0 rounded-[3px] bg-secondary px-2 py-1 text-label text-muted-foreground">
                  {mount.targetPath}
                </code>
              </div>
            </div>
          ))}
        </FormSection>
      )}

    </>
  );
}
