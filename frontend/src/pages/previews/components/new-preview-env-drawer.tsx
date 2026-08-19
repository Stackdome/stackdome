import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
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
import { AlertBanner, BlockedAction, FieldShell, reasonList } from "@/components/branded";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPreviewEnv } from "@/api/preview-envs";
import { getErrorMessage, isErrorStatus } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import { cn } from "@/lib/utils";
import type { StackPreviewConfig } from "@/api/preview-configs";
import { parseImageOverrides } from "@/pages/previews/lib/parse-image-overrides";
import { newPreviewEnvSchema, type NewPreviewEnvValues } from "@/pages/previews/lib/form-schemas";

interface NewPreviewEnvDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every repository previews are on for. The drawer names its own target, so
   *  the action is offered from *All previews* as well as from a selection. */
  configs: StackPreviewConfig[];
  /** The rail's selection, if there is one — the field opens on it. */
  initialConfigId?: string;
  /** Environments already live for a repository, so the cap can block the
   *  create before it is attempted rather than after (§9). */
  activeCountFor: (configId: string) => number;
  onCreated: () => void;
}

/**
 * **New preview** — a `form` drawer (480), moved off the dialog.
 *
 * The label is `New preview` in the header, in the empty state and here: one
 * act, one word for it. `New preview environment` said the noun the page is
 * already made of, and the three places had drifted to three lengths of it.
 *
 * ### Why it stopped being a dialog
 *
 * A dialog is a decision: one question, two answers, and no way past without
 * giving one. This is not that. It is **attached to one object** — the
 * environment being made — and it has four fields, two of them long paste
 * areas. That is the drawer's job by the settled rule, and it is the same move
 * the secret form already made.
 *
 * It also wants the list behind it: the config's existing environments are what
 * tell you which PR still needs one, and a drawer keeps them visible.
 *
 * ### It names its own repository
 *
 * The field is here rather than implied by where you clicked, because the page
 * offers this action from *All previews* too — where there is no selection to
 * imply. With a repository picked in the rail the field opens on it, so the
 * common path is still one glance and no decision; §8 spans it, because it is
 * the field that **identifies** the object being made.
 *
 * The cap rides on the same field: the hint states `N of M active` for whatever
 * is chosen, and at the cap the primary blocks with the reason rather than
 * letting the API refuse after the click.
 *
 * ### The failure moved to the footer
 *
 * A 409 ("PR #42 already has an environment") used to sit at the end of the
 * body. In a band that scrolls, a failure scrolls away from the button that
 * produced it — the same failure as a toast, only slower. It lives in the
 * footer band now, above the actions.
 */
export function NewPreviewEnvDrawer({
  open,
  onOpenChange,
  configs,
  initialConfigId,
  activeCountFor,
  onCreated,
}: NewPreviewEnvDrawerProps) {
  const { defaultProjectName } = useResourceProjects();
  const [configId, setConfigId] = useState<string>("");
  const [prNumber, setPrNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [stackfileContent, setStackfileContent] = useState("");
  const [overridesText, setOverridesText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof NewPreviewEnvValues, string>>>({});
  const [saving, setSaving] = useState(false);

  const config = configs.find((c) => c.id === configId);
  const max = config?.max_active_previews ?? 0;
  const active = configId ? activeCountFor(configId) : 0;
  const atCap = max > 0 && active >= max;

  const reset = () => {
    setConfigId(initialConfigId ?? (configs.length === 1 ? (configs[0].id ?? "") : ""));
    setPrNumber("");
    setBranch("");
    setStackfileContent("");
    setOverridesText("");
    setError(null);
    setFieldErrors({});
    setAdvanced(false);
  };

  useEffect(() => {
    if (open) reset();
  }, [open]);

  /**
   * The two fields nothing can be made without, phrased as the thing to DO.
   *
   * Only the EMPTY ones. A malformed image override is a different kind of
   * wrong — the field has something in it and the something is bad — so it is
   * caught by the schema on submit and reported on the field itself, not
   * hoisted into a list of things you have not done yet.
   */
  const missingFields = (): string[] => {
    const missing: string[] = [];
    if (!configId) missing.push("Pick the repository to preview");
    if (!prNumber.trim()) missing.push("Enter the pull request number");
    if (!branch.trim()) missing.push("Enter the branch to deploy");
    // The cap is not a missing field, it is a refusal — and it is phrased as
    // what to do about it rather than as what is wrong.
    if (atCap) missing.push(`Delete one of ${config?.name}'s ${max} previews, or raise its limit in settings`);
    return missing;
  };

  const submit = async () => {
    const parsed = newPreviewEnvSchema.safeParse({ prNumber, branch, overridesText });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        prNumber: flat.prNumber?.[0],
        branch: flat.branch?.[0],
        overridesText: flat.overridesText?.[0],
      });
      if (flat.overridesText) setAdvanced(true);
      return;
    }
    setFieldErrors({});
    const orgId = getCurrentOrganizationId();
    if (!orgId || !defaultProjectName || !configId) return;
    setSaving(true);
    setError(null);
    try {
      const overrides = parseImageOverrides(parsed.data.overridesText);
      await createPreviewEnv(orgId, defaultProjectName, {
        config_id: configId,
        pr_number: parsed.data.prNumber,
        branch: parsed.data.branch,
        ...(stackfileContent.trim() ? { stackfile_content: stackfileContent } : {}),
        ...(overrides ? { image_overrides: overrides } : {}),
      });
      onCreated();
      onOpenChange(false);
      reset();
    } catch (e) {
      setError(
        isErrorStatus(e, 409)
          ? `PR #${prNumber} already has a preview.`
          : getErrorMessage(e),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        <DrawerHeader
          title="New preview"
          description="Deploys the repository's stackfile from a pull request branch."
        />

        {/* The body owns its 20 pad and its 16 gap, so the fields need no
            wrapper of their own. */}
        <DrawerBody>
          {/* The field that identifies the object, so it spans (§8). Full
              width, and the cap for whatever is chosen rides on its hint —
              which is the one place the number is true for the repository you
              are actually about to create into. */}
          <FieldShell
            label="Repository"
            htmlFor="env-config"
            required
            hint={
              config && max > 0
                ? `${active} of ${max} previews active.`
                : "Previews are created against this repository's base branch."
            }
          >
            <Select value={configId} onValueChange={setConfigId}>
              <SelectTrigger id="env-config" aria-label="Repository">
                <SelectValue placeholder="Pick a repository" />
              </SelectTrigger>
              <SelectContent>
                {configs.map((c) => (
                  <SelectItem key={c.id} value={c.id ?? ""}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>

          <FieldShell label="PR number" htmlFor="env-pr" required error={fieldErrors.prNumber}>
            <Input
              id="env-pr"
              type="number"
              min={1}
              value={prNumber}
              onChange={(e) => {
                setPrNumber(e.target.value);
                setFieldErrors((prev) => ({ ...prev, prNumber: undefined }));
              }}
              aria-invalid={!!fieldErrors.prNumber}
            />
          </FieldShell>
          <FieldShell
            label="Branch"
            htmlFor="env-branch"
            required
            hint="The preview deploys this branch's latest commit. Use Sync to pick up later ones."
            error={fieldErrors.branch}
          >
            <Input
              id="env-branch"
              placeholder="feat/my-change"
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
                setFieldErrors((prev) => ({ ...prev, branch: undefined }));
              }}
              aria-invalid={!!fieldErrors.branch}
            />
          </FieldShell>

          {/* **The disclosure says what is behind it.** "Advanced" named a
              difficulty rather than a thing, so the only way to find out
              whether the field you wanted was in there was to open it. The
              chevron turns rather than swapping glyph — one shape moving is
              read faster than two shapes alternating. */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={advanced}
            className="text-fg-2 -mx-2 self-start px-2"
            onClick={() => setAdvanced((v) => !v)}
          >
            <ChevronRight className={cn("transition-transform duration-150", advanced && "rotate-90")} />
            Advanced — stackfile and image overrides
          </Button>

          {advanced && (
            <>
              <FieldShell label="Stackfile content" htmlFor="env-stackfile">
                <Textarea
                  id="env-stackfile"
                  rows={6}
                  placeholder="Paste a stackfile to use instead of the one in the repository"
                  value={stackfileContent}
                  onChange={(e) => setStackfileContent(e.target.value)}
                  className="font-mono text-meta"
                />
              </FieldShell>
              <FieldShell
                label="Image overrides"
                htmlFor="env-overrides"
                error={fieldErrors.overridesText}
              >
                <Textarea
                  id="env-overrides"
                  rows={3}
                  placeholder={"resource=registry/image:tag\none per line"}
                  value={overridesText}
                  onChange={(e) => {
                    setOverridesText(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, overridesText: undefined }));
                  }}
                  className="font-mono text-meta"
                />
              </FieldShell>
            </>
          )}
        </DrawerBody>

        <DrawerFooter>
          {error && <AlertBanner>{error}</AlertBanner>}
          {/* The primary alone — the same call the secret drawer made, and for
              the same reason: a one-phase drawer has no path, so the ✕, Esc and
              the scrim are the exits and `Cancel` is a third control for them
              (§13). */}
          <DrawerActions>
            {/* Disabled until it can actually be sent, and it says why — the
                same rule the secret form follows: render the cost, never hide
                it. */}
            <BlockedAction reason={saving ? null : reasonList(missingFields())}>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Create preview
              </Button>
            </BlockedAction>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
