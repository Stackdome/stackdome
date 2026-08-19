import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldShell, AlertBanner, BlockedAction, reasonList } from "@/components/branded";
import { DrawerActions, DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import { BranchField } from "@/components/git-source-picker/branch-field";
import { createPreviewConfig } from "@/api/preview-configs";
import { getErrorMessage, isErrorStatus } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import {
  configurePhaseSchema, DEFAULT_STACKFILE_PATH, type ConfigurePhaseValues,
} from "@/pages/previews/lib/form-schemas";
import { EnvVarsEditor, type EnvVarFormRow } from "@/pages/previews/components/env-vars-editor";
import type { PickedRepo } from "./enable-repo-wizard";

interface ConfigurePhaseProps {
  repo: PickedRepo;
  onCreated: (configId: string) => void;
}

/**
 * The second phase, as the drawer's **body and footer bands** rather than a
 * panel with a footer inside it.
 *
 * It returns a fragment of two band elements so they land as direct children of
 * `DrawerContent`'s grid — the drawer owns the three rows, and a wrapper here
 * would collapse body and footer into one of them.
 */
export function ConfigurePhase({ repo, onCreated }: ConfigurePhaseProps) {
  const { defaultProjectName } = useResourceProjects();
  const [name, setName] = useState(repo.fullName.split("/").pop() ?? "");
  const [baseBranch, setBaseBranch] = useState(repo.defaultBranch);
  const [stackfilePath, setStackfilePath] = useState(DEFAULT_STACKFILE_PATH);
  const [maxActive, setMaxActive] = useState(10);
  const [env, setEnv] = useState<EnvVarFormRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ConfigurePhaseValues, string>>>({});
  const [saving, setSaving] = useState(false);
  /** Which control `BranchField` settled on, so the reason names the right act. */
  const [branchControl, setBranchControl] = useState<"select" | "input">("input");
  const onBranchControlKind = useCallback((kind: "select" | "input") => setBranchControl(kind), []);

  /**
   * Everything standing between this form and the act, phrased in the act's own
   * verb — the rule the whole product's disabled primaries follow.
   *
   * `maxActive` is absent on purpose: its own `onChange` clamps to a whole
   * number ≥ 1, so it cannot reach here invalid and listing it would name a
   * problem the user cannot see.
   */
  const missingFields = () => {
    const missing: string[] = [];
    if (!name.trim()) missing.push("Enter a name");
    if (!baseBranch.trim()) {
      missing.push(branchControl === "select" ? "Choose a base branch" : "Enter a base branch");
    }
    // A row with a value but no name would be silently dropped on submit, so it
    // blocks instead. A wholly blank row is just an unused row and blocks nothing.
    if (env.some((row) => !row.name.trim() && row.value.trim())) {
      missing.push("Name every environment variable you gave a value");
    }
    const named = env.filter((row) => row.name.trim() !== "");
    if (new Set(named.map((row) => row.name.trim())).size !== named.length) {
      missing.push("Give every environment variable a different name");
    }
    // A half-written reference — `{{ secret. }}` with no name — would submit a
    // variable pointing at nothing. It is now typed rather than picked, so the
    // check matters more, not less.
    if (named.some((row) => /^\{\{\s*secret\.\s*\}\}$/.test(row.value))) {
      missing.push("Pick a secret for the Secret-sourced variable");
    }
    return missing;
  };

  const submit = async () => {
    const envRows = env.filter((row) => row.name.trim() !== "");
    const parsed = configurePhaseSchema.safeParse({ name, baseBranch, stackfilePath, maxActive, env: envRows });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        name: flat.name?.[0],
        baseBranch: flat.baseBranch?.[0],
        stackfilePath: flat.stackfilePath?.[0],
        maxActive: flat.maxActive?.[0],
        env: flat.env?.[0],
      });
      return;
    }
    setFieldErrors({});
    const orgId = getCurrentOrganizationId();
    if (!orgId || !defaultProjectName) {
      setError("No organization or default project available.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createPreviewConfig(orgId, defaultProjectName, {
        name: parsed.data.name,
        git_repository: { repo_url: repo.cloneUrl, base_branch: parsed.data.baseBranch },
        stackfile_path: parsed.data.stackfilePath || DEFAULT_STACKFILE_PATH,
        max_active_previews: parsed.data.maxActive,
        env: parsed.data.env,
      });
      onCreated(created.id ?? "");
    } catch (e) {
      setError(
        isErrorStatus(e, 409)
          ? "A configuration with this name already exists."
          : getErrorMessage(e),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* The body owns its 20 pad and its 16 gap. The repository name and the
          sentence about it moved to the drawer's header, where the title says
          what you are configuring — printed here as well, they said it twice. */}
      <DrawerBody>
        <FieldShell
          label="Name"
          htmlFor="cfg-name"
          required
          hint="Cannot be changed later."
          error={fieldErrors.name}
        >
          <Input
            id="cfg-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, name: undefined }));
            }}
            aria-invalid={!!fieldErrors.name}
          />
        </FieldShell>

        <FieldShell
          label="Base branch"
          htmlFor="cfg-branch"
          required
          hint="The branch pull requests target."
          error={fieldErrors.baseBranch}
        >
          <BranchField
            id="cfg-branch"
            value={baseBranch}
            onChange={(value) => {
              setBaseBranch(value);
              setFieldErrors((prev) => ({ ...prev, baseBranch: undefined }));
            }}
            integrationId={repo.integrationId}
            repoFullName={repo.fullName}
            onControlKindChange={onBranchControlKind}
          />
        </FieldShell>

        <FieldShell
          label="Stackfile path"
          htmlFor="cfg-stackfile"
          hint="Defines the full stack (services, ports, env). Fetched from the repository on every deploy. A wrong path shows up as a Failed environment."
          error={fieldErrors.stackfilePath}
        >
          <Input
            id="cfg-stackfile"
            value={stackfilePath}
            onChange={(e) => {
              setStackfilePath(e.target.value);
              setFieldErrors((prev) => ({ ...prev, stackfilePath: undefined }));
            }}
            aria-invalid={!!fieldErrors.stackfilePath}
          />
        </FieldShell>

        <FieldShell
          label="Max active previews"
          htmlFor="cfg-max"
          hint="Older environments stop being created once this many are live."
          error={fieldErrors.maxActive}
        >
          {/* **It fills, like every other field.** It shipped `w-28`, which put
              its trailing edge at 933 while the four fields around it ended at
              1420 — the "control sizes to its content" failure `FieldShell`
              exists to prevent (§8). A short value does not earn a short box:
              create-stack's `Port` is a number too and runs the full width. */}
          <Input
            id="cfg-max"
            type="number"
            min={1}
            value={maxActive}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              setMaxActive(Number.isNaN(n) ? 1 : Math.max(1, Math.floor(n)));
              setFieldErrors((prev) => ({ ...prev, maxActive: undefined }));
            }}
          />
        </FieldShell>

        {/* The same rows as `Repository settings`, deliberately: this is where
            the field is first filled in and that is where it is edited, minutes
            apart. Two shapes for one field is how the two drift. */}
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

      </DrawerBody>

      <DrawerFooter>
        {/* In the footer band, not at the end of the body. Inside a band that
            scrolls, a failure scrolls away from the button that produced it. */}
        {error && <AlertBanner>{error}</AlertBanner>}
        {/* The primary alone — `Cancel` is off every step of this journey. The
            path's first crumb goes back a phase and the ✕ leaves. */}
        <DrawerActions>
          {/* Disabled until the form can actually be sent, and it says why —
              while saving the reason is suppressed, because "enter a name" is
              not what a spinner is telling you. */}
          <BlockedAction reason={saving ? null : reasonList(missingFields())}>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Enable previews
            </Button>
          </BlockedAction>
        </DrawerActions>
      </DrawerFooter>
    </>
  );
}
