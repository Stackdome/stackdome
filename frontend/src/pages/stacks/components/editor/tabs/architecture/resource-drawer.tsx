import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DrawerBody, DrawerHeader, DrawerRegion } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/branded";
import { LogViewer } from "@/pages/stacks/components/editor/tabs/logs/log-viewer";
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
import { deriveResourceOutputNames } from "@/pages/stacks/lib/derive-resource-outputs";
import { renameResourceReferences } from "@/pages/stacks/lib/rename-references";
import { NodeGlyph } from "./nodes/node-glyph";
import { DOT_CLASS, DOT_SIZE } from "./nodes/node-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** The drawer's two tabs. Named, not typed inline — a tab id is a value the
 *  component compares against in three places. */
export const RESOURCE_TAB = {
  settings: "settings",
  logs: "logs",
} as const;

interface ResourceDrawerProps {
  /** False for the frame before it opens and for the length of its exit — the
   *  column outside reads it to clip this panel in and out. **Defaults to
   *  open**, which is the honest state for a drawer rendered on its own: a
   *  story has no column to animate and nothing to wait for. */
  open?: boolean;
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
  /** Where this resource's log stream lives. **Undefined is the honest state
   *  for a draft** — a stack that has never been deployed has no stream to
   *  open, and the Logs tab says so rather than disappearing. */
  logs?: { stackId: string; organizationId: string };
  /** Push a volume's drawer onto the floating drawer stack. */
  onOpenVolume?: (name: string) => void;
  /** Open the add-volume dialog with this resource preselected. */
  onAddVolume?: () => void;
  /** Live per-resource status, keyed by resource name — from the status
   *  release's live_status.resources. Absent for drafts/never-deployed stacks. */
  liveStatusResources?: ReleaseLiveStatus["resources"];
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
  open = true,
  resourceIndex,
  session,
  baselineResources,
  serverOutputsByName,
  connectionAddonIds,
  errors,
  onClose,
  onRemove,
  logs,
  onOpenVolume,
  onAddVolume,
  liveStatusResources,
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

  const { dirtyTabs, isDirty, statusVariant, configurationProps, deploymentProps, environmentProps } =
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
        onOpenVolume,
        onAddVolume,
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
    /**
     * **Two tabs, and they are the two things you do to a running service:
     * change it, or watch it.**
     *
     * Both used to be reachable only from a footer of ghost buttons — `View
     * logs` on the left, `Remove resource` on the right — and the two had
     * nothing in common except that they were left over. `View logs` was not
     * even an action on this object: it closed the inspector, left the canvas
     * and switched the whole editor to the Logs tab, so the price of a glance
     * at stdout was losing the thing you were editing. It is a tab now, so
     * looking costs nothing and coming back costs nothing.
     *
     * `Remove` is not a peer of those. It is destructive and it is rare, so it
     * belongs where the other thing that ends the drawer already is — beside
     * the close, at the icon rung, not as a red word taking half a band.
     *
     * With both re-homed the footer has nothing left in it, and a band that
     * exists to hold a hairline is 81px of the column spent on a line.
     *
     * The tabs mount inside the REGION rather than around it (`asChild`), so
     * the three-row grid still owns the layout and the body is still the only
     * row that scrolls.
     */
    <Tabs asChild defaultValue={RESOURCE_TAB.settings}>
      <DrawerRegion detached open={open} aria-label={`Resource ${name}`} data-testid="resource-drawer">
        <DrawerHeader
          leading={<NodeGlyph glyph={pres.glyph} />}
          title={
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{name}</span>
              {/* **The canvas card's dot, not a second one.**
                  This was a flat 6px disc in a hand-rolled colour, and the
                  neutral case resolved to the same ink as the caption directly
                  under it — so the band's fast read was drawn in its quietest
                  tier, at a size `node-card.ts` had already rejected: "at that
                  size a solid dot reads as a printing artefact rather than as a
                  status lamp". The card got that fix; the drawer 400px away did
                  not, and the two dots for one fact drifted exactly as that
                  file's own comment predicted they would.

                  8px of the tone's ink inside a 3px halo of its 12% fill, and a
                  pulse on `pending` alone. One drawing, imported. */}
              <span
                className={cn(DOT_SIZE, "flex-none rounded-full", DOT_CLASS[statusVariant])}
                aria-hidden
              />
            </span>
          }
          trailing={
            <span className="flex flex-none items-center gap-1.5">
              {readOnly ? (
                <span className="text-meta text-fg-muted">Live · read-only</span>
              ) : isDirty ? (
                <span className="flex items-center gap-1 rounded-md border border-change py-0.5 pl-2 pr-1 text-meta font-medium text-change">
                  {changeCount === 1 ? "1 change" : `${changeCount} changes`}
                  <button
                    type="button"
                    onClick={() => session.discardResource(resourceIndex)}
                    aria-label="Discard changes to this resource"
                    title="Discard changes"
                    className="flex size-4 items-center justify-center rounded-sm hover:bg-change hover:text-background"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ) : null}
              {/* **Delete sits beside close because both end the drawer** — but
                  they are not peers, and the band said they were.

                  It shipped in danger ink at rest, which made **the loudest
                  mark in a 480px column the rarest action in it**: the only
                  saturated colour on the surface, permanently lit, on a thing
                  almost nobody does. §10 scales friction to blast radius, and
                  a colour spent at rest is not friction — it is noise, and it
                  drags the eye off the name and the status beside it.

                  It is `fg-muted` now and takes danger's ink AND ground on
                  approach, which is when the intent is real. The glyph never
                  changed; only the moment it shouts.

                  **The hairline is the same mark the sheet header uses** to
                  divide chrome that belongs to the SHELL from chrome that
                  belongs to the journey. Same job here: delete acts on the
                  OBJECT, close acts on the PANEL. At a flat 12 the two read as
                  one pair of equals, which is how a destroy comes to sit at the
                  same rung as a dismiss.

                  The word is a tooltip because the glyph is the only label an
                  icon button has, and a trash can is unambiguous but its SCOPE
                  is not — "Remove resource", not "remove the drawer". */}
              {!readOnly && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-fg-muted hover:bg-danger-bg hover:text-danger"
                        onClick={() => onRemove(resourceIndex)}
                      >
                        <Trash2 aria-hidden />
                        <span className="sr-only">Remove resource</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove resource</TooltipContent>
                  </Tooltip>
                  {/* **No divider.** It was there to say that delete acts on the
                      OBJECT while close acts on the PANEL — a real distinction,
                      drawn with a line, in a band that now carries a 42px tile,
                      a 16px title, a status dot and a tab strip. One more mark
                      to make a point the icons already make: a trash can and an
                      ✕ are not mistakable for each other. */}
                </>
              )}
            </span>
          }
          /**
           * **No sub-line — the board's band is one row (§15).**
           *
           * It carried `Service · git build`, and both halves of that phrase
           * are already on screen: the kind is the tile to its left and the
           * word the canvas card prints on its own right edge, and `git build`
           * is the first field of the Source section 200px below. A second
           * line for facts the band is sitting on top of cost 11px of a 108px
           * header — and that 11 is exactly what put this hairline out of step
           * with the sheet header across the gutter.
           *
           * The public URL went with it, and it did not leave the screen: the
           * shell prints every one of the stack's public endpoints in its own
           * header row (`PublicEndpointRow`), which is where a URL you want to
           * click belongs — reachable without first selecting the node that
           * serves it.
           */
          onClose={onClose}
        >
          {/* The band's second row. The 12 between it and the identity above
              is `DrawerHeader`'s own column gap — it used to be an `mt-3` here
              ON TOP of that gap, which put the strip 24 off the title. */}
          <TabsList className="w-full justify-start">
            <TabsTrigger value={RESOURCE_TAB.settings}>
              Settings
              {/* **The same dot the editor's own tab row carries**, one level
                  in: the top tabs say "something behind Architecture changed",
                  this says "and it is behind Settings". Without it the Logs tab
                  hides the fact entirely — you switch to a stream, come back,
                  and nothing on the strip says the form under it is dirty.

                  A dot, not the count: the band's own chip two rows above is
                  already counting, and two numbers for one fact is the mistake
                  the top row made and undid. On the trigger's `gap-1.5`, after
                  the word, so the strip does not shift when a field is edited. */}
              {isDirty && (
                <span
                  role="img"
                  aria-label="has unsaved changes"
                  className="size-1.5 flex-none rounded-full bg-change"
                />
              )}
            </TabsTrigger>
            <TabsTrigger value={RESOURCE_TAB.logs}>
              Logs
            </TabsTrigger>
          </TabsList>
        </DrawerHeader>

        {/**
          * **Eight sections in one scroll, not three tabs.**
          *
          * `Configuration ǀ Deployment ǀ Environment` put a four-field group at
          * the same rung as a fourteen-field one, and made you click to find out
          * which. Label-above halves the height of a row, which is what paid for
          * the tabs in the first place — so the whole object fits one column and
          * the sections do the ranking that the tab bar was pretending to do.
          *
          * **That still holds, and `Settings ǀ Logs` does not reopen it.** Those
          * three were one subject cut into arbitrary thirds; these two are a
          * form and a live stream, which cannot share a scroll at any length.
          *
          * One disabled fieldset covers every native input and Radix
          * button-based control at once — read-only without threading a flag
          * through each field. `min-w-0` because a fieldset defaults to
          * `min-content` width, which at 480 lets one long value push the
          * sections past the seam.
          */}
        <TabsContent value={RESOURCE_TAB.settings} asChild>
          {/* `p-0`: every child here is a `FormSection`, and a section pays
              its own 20 on all four sides so its rule can reach the seam. The
              body's own padding would be spent twice. */}
          <DrawerBody className="gap-0 p-0">
            <fieldset disabled={readOnly} className="min-w-0">
              <StackResourceConfigurationTab {...configurationProps} />
              <StackResourceDeploymentTab {...deploymentProps} />
              <StackResourceEnvironmentTab {...environmentProps} />
            </fieldset>
          </DrawerBody>
        </TabsContent>

        {/* **A tab that cannot stream still opens, and says why.** Hiding it on
            a draft would make the drawer's own shape depend on how far the
            stack has got, and a tab that appears later is one nobody learns is
            there. It carries the reason instead, in the verb of the act. */}
        <TabsContent value={RESOURCE_TAB.logs} asChild>
          <div className="flex min-h-0 flex-col">
            {logs ? (
              <LogViewer
                variant="panel"
                stackId={logs.stackId}
                organizationId={logs.organizationId}
                resources={allResources.map((r) => ({ name: r.name }))}
                liveStatusResources={liveStatusResources}
                initialSources={resource.name ? [resource.name] : undefined}
              />
            ) : (
              <div className="p-5">
                <EmptyState
                  icon={<ScrollText className="size-6" />}
                  title="Nothing to stream yet"
                  description="This stack has never been deployed. Logs start once a release is running."
                />
              </div>
            )}
          </div>
        </TabsContent>
      </DrawerRegion>
    </Tabs>
  );
}
