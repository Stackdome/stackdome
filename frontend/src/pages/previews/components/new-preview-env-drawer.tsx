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
  config: StackPreviewConfig;
  onCreated: () => void;
}

/**
 * **New preview environment** — a `form` drawer (480), moved off the dialog.
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
 * ### The failure moved to the footer
 *
 * A 409 ("PR #42 already has an environment") used to sit at the end of the
 * body. In a band that scrolls, a failure scrolls away from the button that
 * produced it — the same failure as a toast, only slower. It lives in the
 * footer band now, above the actions.
 */
export function NewPreviewEnvDrawer({ open, onOpenChange, config, onCreated }: NewPreviewEnvDrawerProps) {
  const { defaultProjectName } = useResourceProjects();
  const [prNumber, setPrNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [stackfileContent, setStackfileContent] = useState("");
  const [overridesText, setOverridesText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof NewPreviewEnvValues, string>>>({});
  const [saving, setSaving] = useState(false);

  const reset = () => {
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
    if (!prNumber.trim()) missing.push("Enter the pull request number");
    if (!branch.trim()) missing.push("Enter the branch to deploy");
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
    if (!orgId || !defaultProjectName || !config.id) return;
    setSaving(true);
    setError(null);
    try {
      const overrides = parseImageOverrides(parsed.data.overridesText);
      await createPreviewEnv(orgId, defaultProjectName, {
        config_id: config.id,
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
          ? `PR #${prNumber} already has an environment.`
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
          title="New preview environment"
          description={`Deploys the stackfile from a pull request branch of ${config.name}.`}
        />

        {/* The body owns its 20 pad and its 16 gap, so the fields need no
            wrapper of their own. */}
        <DrawerBody>
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
            hint="The environment deploys this branch's latest commit; use Sync to pick up new commits later."
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
              <FieldShell label="Stackfile content (optional)" htmlFor="env-stackfile">
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
                label="Image overrides (optional)"
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
          <DrawerActions>
            <Button shape="flat" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            {/* Disabled until it can actually be sent, and it says why — the
                same rule the secret form follows: render the cost, never hide
                it. */}
            <BlockedAction reason={saving ? null : reasonList(missingFields())}>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Create environment
              </Button>
            </BlockedAction>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
