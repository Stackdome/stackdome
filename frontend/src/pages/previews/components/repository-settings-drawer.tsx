import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertBanner, BlockedAction, FieldGrid, FieldShell, reasonList } from "@/components/branded";
import { useConfirm } from "@/components/branded/confirm";
import { useToast } from "@/components/ui/use-toast";
import {
  updatePreviewConfig,
  deletePreviewConfig,
  type StackPreviewConfig,
} from "@/api/preview-configs";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import {
  configSettingsSchema,
  DEFAULT_STACKFILE_PATH,
  type ConfigSettingsValues,
} from "@/pages/previews/lib/form-schemas";
import { EnvVarsEditor, type EnvVarFormRow } from "@/pages/previews/components/env-vars-editor";
import { repoLabel } from "@/pages/previews/lib/repo-label";

/**
 * **Repository settings — a drawer, not a dialog.**
 *
 * §13's test is what the user does between opening it and finishing it. A dialog
 * is a decision: one question, two answers, and no way past without giving one.
 * This edits **one object you return from** — five fields, a growable list of
 * environment variables, and a removal at the foot — with the list of that
 * repository's environments behind it, which is exactly what you check before
 * lowering a cap.
 *
 * **480, the `form` rung.** `work`/640 is earned by a second column, and this
 * has none (§13). Two columns 16 apart makes each 212.
 *
 * ### No `Cancel`
 *
 * The board drew one. It comes off for the reason the last five drawers'
 * did: before the primary is pressed, what `Cancel` offers to undo is nothing —
 * which is what closing does — and the ✕, Esc and the scrim are all already
 * exits. A `Dialog` and a `Confirm` keep theirs; a drawer does not.
 */
export function RepositorySettingsDrawer({
  open,
  onOpenChange,
  config,
  activeCount,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: StackPreviewConfig;
  /** Environments live right now. The API refuses to remove a repository while
   *  any are running, so the block is stated here rather than discovered. */
  activeCount: number;
  onSaved: (updated: StackPreviewConfig) => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const { defaultProjectName } = useResourceProjects();
  const confirm = useConfirm();

  const [baseBranch, setBaseBranch] = useState("");
  const [stackfilePath, setStackfilePath] = useState("");
  const [maxActive, setMaxActive] = useState(10);
  const [env, setEnv] = useState<EnvVarFormRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ConfigSettingsValues, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  // True from the moment `Remove repository` is pressed until the confirm
  // settles: the confirm portals as a sibling, so without this Radix reads its
  // clicks as "outside" and dismisses the drawer underneath it.
  const [removeFlowActive, setRemoveFlowActive] = useState(false);

  // Re-seed from the latest config every time it opens — discards unsaved edits
  // on close and picks up anything saved elsewhere.
  useEffect(() => {
    if (!open) return;
    setBaseBranch(config.git_repository?.base_branch ?? "");
    setStackfilePath(config.stackfile_path ?? DEFAULT_STACKFILE_PATH);
    setMaxActive(config.max_active_previews ?? 10);
    setEnv((config.env ?? []).map(({ name, value }) => ({ name, value: value ?? "" })));
    setFieldErrors({});
    setError(null);
  }, [open, config]);

  const missingFields = (): string[] => {
    const missing: string[] = [];
    if (!baseBranch.trim()) missing.push("Enter the branch pull requests target");
    if (!stackfilePath.trim()) missing.push("Enter the stackfile path");
    return missing;
  };

  const save = async () => {
    const envRows = env.filter((row) => row.name.trim() !== "");
    const parsed = configSettingsSchema.safeParse({
      baseBranch,
      stackfilePath,
      maxActive,
      env: envRows,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        baseBranch: flat.baseBranch?.[0],
        stackfilePath: flat.stackfilePath?.[0],
        maxActive: flat.maxActive?.[0],
        env: flat.env?.[0],
      });
      return;
    }
    setFieldErrors({});
    setError(null);
    const orgId = getCurrentOrganizationId();
    if (!orgId || !defaultProjectName || !config.id) return;
    setSaving(true);
    try {
      // PUT is a full replace server-side, so unchanged fields are echoed back
      // or they are dropped by the save.
      const updated = await updatePreviewConfig(orgId, defaultProjectName, config.id, {
        git_repository: {
          repo_url: config.git_repository?.repo_url ?? "",
          base_branch: parsed.data.baseBranch,
        },
        stackfile_path: parsed.data.stackfilePath,
        max_active_previews: parsed.data.maxActive,
        env: parsed.data.env,
        ...(config.description != null ? { description: config.description } : {}),
        ...(config.labels != null ? { labels: config.labels } : {}),
        ...(config.annotations != null ? { annotations: config.annotations } : {}),
      });
      toast({ title: "Repository settings saved", variant: "success" });
      onSaved(updated);
      onOpenChange(false);
    } catch (e) {
      // In the footer, not a toast — the settings that failed are still here,
      // and a failure that scrolls away from its button is the same loss.
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const requestRemove = async () => {
    setError(null);
    setRemoveFlowActive(true);
    try {
      const ok = await confirm({
        title: `Remove ${config.name} from previews?`,
        // Say what is NOT happening. "Delete configuration" read as though the
        // repository itself were at stake, which is the one thing this cannot
        // touch.
        description:
          "Pull requests on this repository stop getting environments. Your code is not touched: this only removes Stackdome's rule.",
        confirmLabel: "Remove repository",
        variant: "destructive",
      });
      if (!ok) return;
      const orgId = getCurrentOrganizationId();
      if (!orgId || !defaultProjectName || !config.id) return;
      setRemoving(true);
      try {
        await deletePreviewConfig(orgId, defaultProjectName, config.id);
        toast({ title: `${config.name} removed from previews`, variant: "success" });
        onOpenChange(false);
        onDeleted();
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setRemoving(false);
      }
    } finally {
      setRemoveFlowActive(false);
    }
  };

  /**
   * The API refuses while environments are running. **Block before the click,
   * with the count** — a server error after the confirm is a rejection you have
   * already committed to.
   */
  const removeReason =
    activeCount > 0
      ? `Delete this repository's ${activeCount} ${activeCount === 1 ? "environment" : "environments"} first`
      : null;

  const repository = repoLabel(config.git_repository?.repo_url);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        size="form"
        onInteractOutside={(e) => {
          if (removeFlowActive) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (removeFlowActive) e.preventDefault();
        }}
      >
        <DrawerHeader
          title="Repository settings"
          description="Applies to every preview environment built from this repository."
        />

        <DrawerBody>
          {/* **A field that can never be filled is not a field** (§9). A
              disabled input dims to its own placeholder's tone, so a filled one
              reads as empty. It is a VALUE: the control well, the control
              radius, the control height, and mono because it is a machine
              string you reference and copy. */}
          <FieldShell
            label="Repository"
            hint="Cannot be changed. Remove the repository and add it again to point at a different one."
          >
            <div className="flex h-8 items-center rounded-md bg-control px-3 font-mono text-meta text-fg-2">
              <span className="truncate" title={repository}>
                {repository}
              </span>
            </div>
          </FieldShell>

          {/* The one pair on this form, and it is a pair by MEANING: both
              answer "which pull requests, and how many at once". Everything
              else asks its own question and fills the row. */}
          <FieldGrid>
            <FieldShell
              label="Base branch"
              htmlFor="rs-branch"
              required
              span={1}
              hint="The branch pull requests target."
              error={fieldErrors.baseBranch}
            >
              <Input
                id="rs-branch"
                value={baseBranch}
                onChange={(e) => {
                  setBaseBranch(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, baseBranch: undefined }));
                }}
                aria-invalid={!!fieldErrors.baseBranch}
              />
            </FieldShell>
            <FieldShell
              label="Max active previews"
              htmlFor="rs-max"
              span={1}
              hint="New environments stop being created once this many are live."
              error={fieldErrors.maxActive}
            >
              {/* Full width, like every other field. A short value does not earn
                  a short box — `w-28` put this field's trailing edge 487px left
                  of the ones around it. */}
              <Input
                id="rs-max"
                type="number"
                min={1}
                value={maxActive}
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  setMaxActive(Number.isNaN(n) ? 1 : Math.max(1, Math.floor(n)));
                  setFieldErrors((prev) => ({ ...prev, maxActive: undefined }));
                }}
                aria-invalid={!!fieldErrors.maxActive}
              />
            </FieldShell>
          </FieldGrid>

          <FieldShell
            label="Stackfile path"
            htmlFor="rs-stackfile"
            required
            hint="Defines the full stack. Fetched from the repository on every deploy: a wrong path shows up as a Failed environment."
            error={fieldErrors.stackfilePath}
          >
            <Input
              id="rs-stackfile"
              value={stackfilePath}
              onChange={(e) => {
                setStackfilePath(e.target.value);
                setFieldErrors((prev) => ({ ...prev, stackfilePath: undefined }));
              }}
              aria-invalid={!!fieldErrors.stackfilePath}
            />
          </FieldShell>

          {/* **Key and value are peers, so they flex equally** — 148 each
              beside the 88 source chip and the 32 remove button.

              The `Plain ǀ Secret` source stays. It came off for one build on the
              board's shape, and that was wrong: without it you have to already
              know the `{{ secret.name }}` grammar and you cannot see which
              secrets exist, which is the "screens explain themselves" rule
              (§1). The chip paid for itself out of its own width instead —
              110 → 88, and `Plain text` → `Plain`. */}
          <FieldShell
            label="Environment variables"
            hint="Applied to every preview. Reference a saved secret with the Secret source rather than pasting the value here."
            error={fieldErrors.env}
          >
            <EnvVarsEditor
              value={env}
              onChange={(rows) => {
                setEnv(rows);
                setFieldErrors((prev) => ({ ...prev, env: undefined }));
              }}
            />
          </FieldShell>

          {/* Remove sits at the foot of the body, behind a hairline and a
              confirm — not in the footer, which is where THIS form commits. */}
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-5">
            <h3 className="text-body font-medium text-foreground">Remove from previews</h3>
            <p className="text-meta text-muted-foreground leading-relaxed">
              Pull requests on this repository stop getting environments. Your code is not touched:
              this only removes Stackdome&apos;s rule.
            </p>
            {/* **Solid `destructive`.** §10 put the red fill on the confirm's
                commit button and left the trigger in `destructive-ghost`, on
                the reasoning that the trigger is not the commit. Jaseem's call,
                August 2026: a red word inside a section already headed *Remove
                from previews* is the same thing said quietly twice, and the
                fill is what makes the act legible from across the form. The
                confirm behind it is what makes it safe, not the button's
                material. */}
            <BlockedAction reason={removeReason}>
              <Button
                variant="destructive"
                shape="flat"
                // No `-ml-3`. A ghost has no visible box, so it was pulled back
                // to put its LABEL on the body's edge with the sentence above
                // it. A filled button has a box, and the box is what lands on
                // the edge — the same rule the footer's primary follows.
                className="self-start"
                disabled={removing}
                onClick={() => void requestRemove()}
              >
                {removing && <Loader2 className="animate-spin" />}
                Remove repository
              </Button>
            </BlockedAction>
          </div>
        </DrawerBody>

        <DrawerFooter>
          {error && <AlertBanner>{error}</AlertBanner>}
          <DrawerActions>
            <BlockedAction reason={saving ? null : reasonList(missingFields())}>
              <Button onClick={() => void save()} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Save changes
              </Button>
            </BlockedAction>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
