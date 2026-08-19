import { useCallback, useMemo } from "react";
import { usePostgresAddons } from "@/hooks/use-postgres-addons";
import type {
  FormStackResourceData,
  FormVolumeExtendedData as VolumeFormData,
} from "@/pages/stacks/schemas/form-schema";
import type { EditSessionDraft, UseStackEditSession } from "@/pages/stacks/hooks/use-stack-edit-session";
import { addBlockToStack } from "@/pages/stacks/lib/block-to-form";
import { blockCatalog, getBlockById } from "@/pages/stacks/data/blocks/registry";
import { addMount, newVolume, removeMountsOf } from "@/pages/stacks/lib/canvas/volume-ops";
import { useConfirm } from "@/components/branded/confirm";

export interface UseCanvasDraftInput {
  session: UseStackEditSession;
  /** Diff baseline (the deployed release snapshot when one exists). */
  baselineResources: Partial<FormStackResourceData>[];
  baselineVolumes: Partial<VolumeFormData>[];
  /** Current server state — what a lazily-started session's draft seeds from. */
  draftResources: Partial<FormStackResourceData>[];
  draftVolumes: Partial<VolumeFormData>[];
  connectionAddonIds: ReadonlySet<string>;
  /** The resource list the canvas is showing — drives the picker's "added" badge. */
  resources: Partial<FormStackResourceData>[];
  /** Null for draft (unsaved) stacks — nothing exists server-side to delete. */
  topologyIds: { orgId: string; projectName: string; stackId: string } | null;
  /** Immediate, confirm-gated server-side volume deletion. */
  onDeleteVolume?: (name: string) => Promise<boolean>;
  /** Called after a mutation that invalidates open drawers (a delete). */
  onCloseDrawers: () => void;
}

/**
 * Every canvas action that writes to the draft: adding a block, linking an
 * addon, creating/attaching/deleting a volume, deleting a resource. Each starts
 * the edit session lazily, so the canvas can be driven straight from server
 * state without the caller pre-arming a session.
 */
export function useCanvasDraft({
  session,
  baselineResources,
  baselineVolumes,
  draftResources,
  draftVolumes,
  connectionAddonIds,
  resources,
  topologyIds,
  onDeleteVolume,
  onCloseDrawers,
}: UseCanvasDraftInput) {
  const confirm = useConfirm();

  /** Apply a pure draft mutation, starting a session lazily when needed. */
  const applyDraft = useCallback(
    (fn: (draft: EditSessionDraft) => EditSessionDraft) => {
      const current: EditSessionDraft = session.isActive
        ? { resources: session.draft.resources, volumes: session.draft.volumes }
        : { resources: draftResources, volumes: draftVolumes };
      const next = fn(current);
      if (!session.isActive) {
        session.start(
          { resources: baselineResources, volumes: baselineVolumes },
          { linkedAddonIds: new Set(connectionAddonIds), draft: next },
        );
      } else {
        session.updateResources(() => next.resources);
        session.updateVolumes(() => next.volumes);
      }
    },
    [session, baselineResources, baselineVolumes, draftResources, draftVolumes, connectionAddonIds],
  );

  // Block ids already present in the stack (drives the picker's "added" badge).
  const addedBlockIds = useMemo(() => {
    const names = new Set(resources.map((r) => r.name));
    return blockCatalog
      .filter((b) => names.has(b.id) || [...names].some((n) => n?.startsWith(`${b.id}-`)))
      .map((b) => b.id);
  }, [resources]);

  const onAddBlock = useCallback(
    (blockId: string) => {
      const block = getBlockById(blockId);
      if (!block) return;
      const current = session.isActive
        ? { resources: session.draft.resources, volumes: session.draft.volumes }
        : { resources: draftResources, volumes: draftVolumes };
      const working = { name: "", labels: [], spec: { stack_resources: current.resources, volumes: current.volumes } };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WorkingStack uses full FormStackResourceData; the draft holds Partial, structurally compatible here
      const next = addBlockToStack(working as any, block);
      // block-to-form yields base FormVolumeData; the session works in the extended
      // form (adds an optional sourceType) — structurally compatible at runtime.
      const nextVolumes = next.spec.volumes as unknown as VolumeFormData[];
      if (!session.isActive) {
        session.start(
          { resources: baselineResources, volumes: baselineVolumes },
          {
            linkedAddonIds: new Set(connectionAddonIds),
            draft: { resources: next.spec.stack_resources, volumes: nextVolumes },
          },
        );
      } else {
        session.updateResources(() => next.spec.stack_resources);
        session.updateVolumes(() => nextVolumes);
      }
    },
    [session, baselineResources, baselineVolumes, draftResources, draftVolumes, connectionAddonIds],
  );

  const { addons: allAddons } = usePostgresAddons();
  const pickableAddons = useMemo(
    () => allAddons.filter((a) => a.id && a.name).map((a) => ({ id: a.id!, name: a.name! })),
    [allAddons],
  );

  const onLinkAddon = useCallback(
    (addonId: string) => {
      if (!session.isActive) {
        session.start(
          { resources: baselineResources, volumes: baselineVolumes },
          {
            linkedAddonIds: new Set([...connectionAddonIds, addonId]),
            draft: { resources: draftResources, volumes: draftVolumes },
          },
        );
      } else {
        session.setLinkedAddonIds((prev) => new Set(prev).add(addonId));
      }
    },
    [session, baselineResources, baselineVolumes, draftResources, draftVolumes, connectionAddonIds],
  );

  const onDisconnectVolume = useCallback(
    (volumeName: string) => {
      applyDraft((draft) => ({ ...draft, resources: removeMountsOf(draft.resources, volumeName) }));
    },
    [applyDraft],
  );

  const onDeleteVolumeConfirmed = useCallback(
    (volumeName: string) => {
      applyDraft((draft) => ({
        resources: removeMountsOf(draft.resources, volumeName),
        volumes: draft.volumes.filter((v) => v.name !== volumeName),
      }));
      // Saved stacks: destroy the volume server-side now (confirm dialog already
      // carried the data-loss warning). Draft stacks have nothing to delete yet —
      // onDeleteVolume is undefined and the local edit above is the whole story.
      void onDeleteVolume?.(volumeName);
    },
    [applyDraft, onDeleteVolume],
  );

  const onRequestDeleteVolume = useCallback(
    async (volumeName: string) => {
      const ok = await confirm(
        topologyIds == null
          ? {
            title: `Remove volume “${volumeName}”?`,
            confirmLabel: "Remove",
            variant: "destructive",
          }
          : {
            title: `Delete volume “${volumeName}”?`,
            description:
                "This immediately and permanently destroys the volume and all data stored on it. Any mounts are removed first. This cannot be undone.",
            confirmLabel: "Delete",
            variant: "destructive",
          },
      );
      if (!ok) return;
      onDeleteVolumeConfirmed(volumeName);
    },
    [confirm, topologyIds, onDeleteVolumeConfirmed],
  );

  const onRequestDeleteResource = useCallback(
    async (resourceName: string) => {
      const ok = await confirm({
        title: `Delete service “${resourceName}”?`,
        description:
          "The service and its configuration are removed when the stack deploys. This cannot be undone after deploy.",
        confirmLabel: "Delete",
        variant: "destructive",
      });
      if (!ok) return;
      applyDraft((draft) => ({ ...draft, resources: draft.resources.filter((r) => r.name !== resourceName) }));
      onCloseDrawers();
    },
    [confirm, applyDraft, onCloseDrawers],
  );

  const removeResource = useCallback(
    (idx: number) => {
      session.updateResources((prev) => prev.filter((_, i) => i !== idx));
      onCloseDrawers();
    },
    [session, onCloseDrawers],
  );

  const onCreateVolume = useCallback(
    (input: { name: string; size: string; resourceIdx: number; targetPath: string }) => {
      applyDraft((draft) => ({
        resources: addMount(draft.resources, input.resourceIdx, {
          volumeName: input.name,
          targetPath: input.targetPath,
        }),
        volumes: [...draft.volumes, newVolume({ name: input.name, size: input.size })],
      }));
    },
    [applyDraft],
  );

  const onAttachVolume = useCallback(
    (input: { volumeName: string; resourceIdx: number; targetPath: string }) => {
      applyDraft((draft) => ({
        ...draft,
        resources: addMount(draft.resources, input.resourceIdx, {
          volumeName: input.volumeName,
          targetPath: input.targetPath,
        }),
      }));
    },
    [applyDraft],
  );

  return {
    addedBlockIds,
    onAddBlock,
    pickableAddons,
    onLinkAddon,
    onDisconnectVolume,
    onRequestDeleteVolume,
    onRequestDeleteResource,
    removeResource,
    onCreateVolume,
    onAttachVolume,
  };
}
