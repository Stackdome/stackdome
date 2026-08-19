import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DrawerActions, DrawerBody, DrawerFooter, DrawerHeader, DrawerRegion } from "@/components/ui/drawer";
import { X, ScrollText, Trash2 } from "lucide-react";
import { useSecrets } from "@/pages/stacks/hooks/use-secrets";
import { usePostgresAddons } from "@/hooks/use-postgres-addons";
import type { PostgresAddon } from "@/api/addons";
import type { ReleaseLiveStatus } from "@/api/releases";
import type { UseStackEditSession } from "@/pages/stacks/hooks/use-stack-edit-session";
import type { FormStackResourceData, FormVolumeExtendedData } from "@/pages/stacks/schemas/form-schema";
import { StackResourceConfigurationTab } from "@/pages/stacks/components/editor/tabs/architecture/drawer-tabs/configuration-tab";
import { StackResourceDeploymentTab } from "@/pages/stacks/components/editor/tabs/architecture/drawer-tabs/deployment-tab";
import { StackResourceEnvironmentTab } from "@/pages/stacks/components/editor/tabs/architecture/drawer-tabs/environment-tab";
import { useResourceTabProps } from "@/pages/stacks/components/editor/tabs/architecture/drawer-tabs/use-resource-tab-props";
import { nodePresentation } from "@/pages/stacks/lib/canvas/node-presentation";
import { EndpointInlineList, type EndpointUrl } from "@/pages/stacks/components/editor/public-endpoint-row";
import { deriveResourceOutputNames } from "@/pages/stacks/lib/derive-resource-outputs";
import { renameResourceReferences } from "@/pages/stacks/lib/rename-references";
import { NodeGlyph } from "./nodes/node-glyph";

interface ResourceDrawerProps {
  /** Index into `session.draft.resources` of the resource being configured. */
  resourceIndex: number;
  session: UseStackEditSession;
  baselineResources: Partial<FormStackResourceData>[];
  /** Server-computed resource outputs keyed by resource name. The draft copy of a
   *  newly-added resource has no outputs, so the env-var output pickers read from
   *  this server-truth map (matched by name) instead. */
  serverOutputsByName?: ReadonlyMap<string, string[]>;
  /** Addon ids linked to the stack — filters the addon picker + drives bindings. */
  connectionAddonIds: ReadonlySet<string>;
  errors: { [field: string]: string | undefined };
  onClose: () => void;
  onRemove: (index: number) => void;
  /** Open the stack's Logs view (from the footer "View logs"),
   *  pre-filtered to this resource. */
  onViewLogs?: (resourceName?: string) => void;
  /** Push a volume's drawer onto the floating drawer stack. */
  onOpenVolume?: (name: string) => void;
  /** Live per-resource status, keyed by resource name — from the status
   *  release's live_status.resources. Absent for drafts/never-deployed stacks. */
  liveStatusResources?: ReleaseLiveStatus["resources"];
  /** This resource's live public URLs, best-first (same order as the header's
   *  PUBLIC row). Absent when the resource has no live public ingress. */
  publicUrls?: EndpointUrl[];
  /** Read-only live view: the drawer renders this data (the converged release's
   *  snapshot) instead of the edit session's draft, and every field is disabled.
   *  `resourceIndex` then indexes into `live.resources`. */
  live?: { resources: Partial<FormStackResourceData>[]; volumes: Partial<FormVolumeExtendedData>[] };
}

/**
 * Slide-in drawer for a selected canvas node. It wraps the SAME three sub-tab
 * bodies the accordion form uses (via `useResourceTabProps`), so env-var
 * grouping and per-tab dirty marks come for free. Edits flow straight into the
 * edit session; the drawer owns no stack state.
 */
export function ResourceDrawer({
  resourceIndex,
  session,
  baselineResources,
  serverOutputsByName,
  connectionAddonIds,
  errors,
  onClose,
  onRemove,
  onViewLogs,
  onOpenVolume,
  liveStatusResources,
  publicUrls,
  live,
}: ResourceDrawerProps) {
  const readOnly = !!live;
  const shownResources = live?.resources ?? session.draft.resources;
  const shownVolumes = live?.volumes ?? session.draft.volumes;
  const resource = shownResources[resourceIndex] ?? {};
  // Read-only view: baseline == shown resource, so every dirty computation
  // (tab dots, "N changes" chip, per-field discards) reads as clean.
  const baselineResource = readOnly ? resource : baselineResources[resourceIndex];
  const liveStatus = resource.name ? liveStatusResources?.[resource.name] : undefined;

  const secrets = useSecrets();
  const { addons: allAddons } = usePostgresAddons();
  // An addon linked during this session is only in the session's set until the
  // stack is saved — the canvas reads the same way, so the picker matches it.
  const linkedAddonIds = session.isActive ? session.linkedAddonIds : connectionAddonIds;
  const addons = useMemo(
    () => allAddons.filter((a: PostgresAddon) => a.id && linkedAddonIds.has(a.id)),
    [allAddons, linkedAddonIds],
  );
  const addonNameById = useMemo(
    () =>
      new Map(
        allAddons
          .filter((a: PostgresAddon) => a.id && a.name)
          .map((a: PostgresAddon) => [a.id!, a.name!] as [string, string]),
      ),
    [allAddons],
  );
  // Keep the draft's resource name/index/order (preserves unsaved edits &
  // ordering) but source outputs from the server-truth map by name — a
  // resource added on the canvas has none in its draft copy until saved.
  const allResources = useMemo(
    () =>
      shownResources.map((r, i) => ({
        name: r.name || `Resource ${i + 1}`,
        index: i,
        outputs:
          serverOutputsByName?.get(r.name ?? "") ??
          deriveResourceOutputNames(r),
      })),
    [shownResources, serverOutputsByName],
  );

  // Replace just this resource in the draft. The read-only guard is a belt on
  // top of the disabled fieldset — no edit may ever reach the session.
  const onChange = useCallback(
    (index: number, updated: Partial<FormStackResourceData>) => {
      if (readOnly) return;
      session.updateResources((prev) => {
        const next = prev.map((r, i) => (i === index ? updated : r)) as FormStackResourceData[];
        // Siblings address this resource by name, so a rename has to carry them
        // with it or their connections point at a resource that no longer exists.
        return renameResourceReferences(next, prev[index]?.name ?? "", updated.name ?? "");
      });
    },
    [session, readOnly],
  );

  const { dirtyTabs, isDirty, statusDotColor, configurationProps, deploymentProps, environmentProps } =
    useResourceTabProps({
      resource,
      index: resourceIndex,
      baselineResource,
      onChange,
      liveStatus,
      context: {
        errors,
        // Draft volumes, not baseline: an inline-added volume must be pickable
        // (and resolvable by existing mount rows) before the next autosave
        // cycle advances the baseline. In the read-only live view these are
        // the snapshot's volumes instead, so mount rows resolve consistently.
        volumes: shownVolumes,
        allResources,
        serverOutputsByName,
        secrets,
        addons,
        addonNameById,
        onDiscardField: (path) => session.discardResourceField(resourceIndex, path),
        onDiscardEnvRow: (envIdx) => session.discardEnvRow(resourceIndex, envIdx),
        mountsReadOnly: true,
        onOpenVolume,
      },
    });

  // Kind glyph + summary sub-line, derived the same way the node card is.
  const pres = useMemo(
    () =>
      nodePresentation({
        isAddon: false,
        image: resource.source?.image?.ref,
        hasBuild: !!resource.source?.git,
        ports: (resource.ports ?? []).map((p) => ({
          number: p.number,
          protocol: p.protocol,
          exposedToPublic: p.exposed_to_public,
        })),
      }),
    [resource.source?.image?.ref, resource.source?.git, resource.ports],
  );

  // "N changes" counts the dirty sub-tabs (config / deployment / environment).
  const changeCount = [dirtyTabs.configuration, dirtyTabs.deployment, dirtyTabs.environment].filter(Boolean).length;

  const name = resource.name || `Resource ${resourceIndex + 1}`;

  return (
    <DrawerRegion aria-label={`Resource ${name}`} data-testid="resource-drawer">
      <DrawerHeader
        leading={<NodeGlyph glyph={pres.glyph} className="size-4 flex-none text-fg-muted" />}
        title={
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{name}</span>
            {/* Legal alone only because the summary line under it says the word
                (§7). The dot is the fast read, never the only one. */}
            <span className={`size-1.5 flex-none rounded-full ${statusDotColor}`} aria-hidden />
          </span>
        }
        trailing={
          readOnly ? (
            <span className="flex-none text-meta text-fg-muted">Live · read-only</span>
          ) : isDirty ? (
            <span className="flex flex-none items-center gap-1 rounded-md border border-brand py-0.5 pl-2 pr-1 text-meta font-medium text-brand">
              {changeCount === 1 ? "1 change" : `${changeCount} changes`}
              <button
                type="button"
                onClick={() => session.discardResource(resourceIndex)}
                aria-label="Discard changes to this resource"
                title="Discard changes"
                className="flex size-4 items-center justify-center rounded-sm hover:bg-brand hover:text-background"
              >
                <X className="size-3" />
              </button>
            </span>
          ) : (
            <span className="flex-none text-meta text-fg-muted">{pres.kindLabel}</span>
          )
        }
        description={
          <span className="block truncate">
            {pres.summary}
            {publicUrls && publicUrls.length > 0 && (
              <EndpointInlineList service={resource.name || "resource"} urls={publicUrls} />
            )}
          </span>
        }
        onClose={onClose}
      />

      {/**
        * **Eight sections in one scroll, not three tabs.**
        *
        * `Configuration ǀ Deployment ǀ Environment` put a four-field group at
        * the same rung as a fourteen-field one, and made you click to find out
        * which. Label-above halves the height of a row, which is what paid for
        * the tabs in the first place — so the whole object fits one column and
        * the sections do the ranking that the tab bar was pretending to do.
        *
        * One disabled fieldset covers every native input and Radix
        * button-based control at once — read-only without threading a flag
        * through each field. `min-w-0` because a fieldset defaults to
        * `min-content` width, which at 480 lets one long value push the
        * sections past the seam.
        */}
      <DrawerBody className="gap-0">
        <fieldset disabled={readOnly} className="min-w-0">
          <StackResourceConfigurationTab {...configurationProps} />
          <StackResourceDeploymentTab {...deploymentProps} />
          <StackResourceEnvironmentTab {...environmentProps} />
        </fieldset>
      </DrawerBody>
      <DrawerFooter>
        <DrawerActions
          leading={
            <Button
              type="button"
              variant="ghost"
              disabled={!onViewLogs}
              onClick={() => onViewLogs?.(resource.name)}
            >
              <ScrollText aria-hidden />
              View logs
            </Button>
          }
        >
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:bg-danger-bg"
              onClick={() => onRemove(resourceIndex)}
            >
              <Trash2 aria-hidden />
              Remove resource
            </Button>
          )}
        </DrawerActions>
      </DrawerFooter>
    </DrawerRegion>
  );
}
