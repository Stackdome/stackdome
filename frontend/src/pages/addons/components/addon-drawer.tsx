import { useEffect, useState } from "react";
import { ZodError } from "zod";

import { AlertBanner, BlockedAction, reasonList } from "@/components/branded";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  type DrawerStep,
} from "@/components/ui/drawer";
import { useToast } from "@/components/ui/use-toast";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { useObjectStores } from "@/hooks/use-object-stores";
import { usePostgresAddons } from "@/hooks/use-postgres-addons";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import * as addonsApi from "@/api/addons";
import type { PostgresAddon } from "@/api/addons";
import type { BlockPreset } from "@/pages/stacks/data/blocks/types";

import {
  PostgresAddonFormSchema,
  defaultFormValues,
  type PostgresAddonFormValues,
} from "../schemas/form-schema";
import { addonToFormValues, buildCreateInput, JsonAreaParseError } from "../lib/payload";
import { eligibleRestoreSources } from "../lib/restore-sources";
import { AddonCatalogStep } from "./addon-catalog-step";
import { PostgresFormFields, PostgresDocsLink } from "./postgres-form-fields";

type FormErrors = Partial<Record<string, string>>;
type Step = "catalogue" | "configure";

interface AddonDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present to edit an existing addon; absent to create a new one. */
  addon?: PostgresAddon | null;
  /** Called after a successful create or save, so the list can refetch. */
  onSaved?: () => void;
}

/**
 * The addon journey — **one drawer, two steps** (§13 "Adding a thing").
 *
 * It replaces a type-picker dialog plus a full page carrying a sticky editorial
 * bar. Three surfaces for one act, and the dialog gated a single reachable
 * destination. What it is now:
 *
 *   step 1  New addon              the catalogue, off the service registry
 *   step 2  New addon › Postgres   the form, with the footer committing
 *
 * **Editing is a one-step journey**, so it opens straight on the form and the
 * header carries the addon's name alone — a path of one is a title with
 * punctuation (§12a).
 *
 * The width never changes between steps: a drawer picks its rung once, and a
 * width that moves mid-task reads as a different surface opening.
 */
export function AddonDrawer({ open, onOpenChange, addon, onSaved }: AddonDrawerProps) {
  const isEdit = Boolean(addon);
  const { toast } = useToast();
  const { projectNameById, defaultProjectName } = useResourceProjects();
  const { objectStores, loading: storesLoading } = useObjectStores();
  const { addons: allAddons } = usePostgresAddons();

  const [step, setStep] = useState<Step>(isEdit ? "configure" : "catalogue");
  const [service, setService] = useState<BlockPreset | null>(null);
  const [values, setValues] = useState<PostgresAddonFormValues>(() => defaultFormValues(""));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const restoreSources = eligibleRestoreSources(allAddons, addon?.id);

  // Reopening must not show the last visit's half-typed form.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    if (addon) {
      // Initialization is create-only and hidden on edit; the backend does not
      // return the original restore source, so it normalises to "new" to keep
      // schema validation green. `buildCreateInput` strips it from the payload.
      setValues({ ...addonToFormValues(addon), initialization: { type: "new" } });
      setStep("configure");
      setService(null);
    } else {
      setValues(defaultFormValues(""));
      setStep("catalogue");
      setService(null);
    }
  }, [open, addon]);

  const update = <K extends keyof PostgresAddonFormValues>(
    key: K,
    value: PostgresAddonFormValues[K],
  ) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: undefined }));
  };

  const validate = (): boolean => {
    try {
      PostgresAddonFormSchema.parse(values);
      if (values.plan === "custom") {
        const anyCustom =
          values.customCpuRequest ||
          values.customCpuLimit ||
          values.customMemoryRequest ||
          values.customMemoryLimit;
        if (!anyCustom) {
          setErrors({
            customCpuRequest: "Set at least one CPU or memory value for the Custom plan",
          });
          return false;
        }
      }
      setErrors({});
      return true;
    } catch (e) {
      if (e instanceof ZodError) {
        const next: FormErrors = {};
        for (const issue of e.issues) next[issue.path.join(".")] = issue.message;
        setErrors(next);
      }
      return false;
    }
  };

  const persist = async () => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) {
      setSubmitError("No organization selected");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const input = buildCreateInput(values, { isEdit });
      if (isEdit && addon?.id) {
        const projectName = projectNameById(addon.project_id);
        if (!projectName) {
          setSubmitError("Could not resolve the project for this addon.");
          return;
        }
        await addonsApi.updatePostgresAddon(orgId, projectName, addon.id, input);
        toast({
          title: "Addon updated",
          description: "Changes have been applied.",
          variant: "success",
        });
      } else {
        if (!defaultProjectName) {
          setSubmitError("You don't have a project to create addons in.");
          return;
        }
        await addonsApi.createPostgresAddon(orgId, defaultProjectName, input);
        toast({
          title: "Addon created",
          description: "Provisioning has started; status will update as it's ready.",
          variant: "success",
        });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      if (e instanceof JsonAreaParseError) {
        setErrors((errs) => ({ ...errs, advancedJson: e.message }));
      } else {
        console.error("Failed to save addon:", e);
        setSubmitError(getErrorMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!validate()) return;
    void persist();
  };

  // Every reason is phrased here, in the verb of THIS act — you pick a service,
  // you enter a name (§9). `reasonList` supplies no words of its own.
  const configureBlockers = [
    values.name.trim() ? null : "Enter a name.",
    defaultProjectName || isEdit ? null : "Create a project first. An addon lives in one.",
  ].filter((r): r is string => r !== null);

  const onCatalogue = step === "catalogue";
  // §12a: the task, then the step you are on. Step one used to show the task
  // alone, which under-applied the rule — a first step is still a step, and
  // "New addon" does not say what to do on it. "Pick a service" does, and it
  // makes the two steps read as one sequence rather than a title that changes.
  // **`New addon` is the way back now that the arrow is gone.** It is a live
  // crumb only on step two, where there is somewhere to return to — on step one
  // it is the task, and a crumb pointing at the screen you are on is a lie.
  const path: DrawerStep[] = isEdit
    ? [addon?.name ?? "Edit addon"]
    : onCatalogue
      ? ["New addon", "Pick a service"]
      : [{ label: "New addon", onClick: () => setStep("catalogue") }, service?.name ?? "Configure"];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* `work`, not `form`: two phases and a catalogue with categories need the
          wider rung, and the width must not change between steps. */}
      <DrawerContent size="work">
        {/* Step one only. By step two you have been oriented (§13). */}
        <DrawerHeader
          steps={path}
          description={
            onCatalogue || isEdit
              ? isEdit
                ? "Change what this database runs on. The name is fixed."
                : "A managed service your stacks can use."
              : undefined
          }
        />

        <DrawerBody>
          {/* **Picking advances**, and step one has no primary as a result —
              one behaviour for every add flow, so a row means the same thing
              here and in new stack's five starting points. A `Continue` beside
              a list that answers the question only ever repeats the click you
              just made. */}
          {onCatalogue ? (
            <AddonCatalogStep
              value={service?.id ?? null}
              onChange={(block) => {
                setService(block)
                setStep("configure")
              }}
            />
          ) : (
            <PostgresFormFields
              values={values}
              errors={errors}
              isEdit={isEdit}
              objectStores={objectStores}
              storesLoading={storesLoading}
              restoreSources={restoreSources}
              onChange={update}
            />
          )}
        </DrawerBody>

        {/* **Step one has no footer at all** (§13). It had one holding a lone
            `Cancel`, which is the exact shape the rule was written against:
            picking a service *advances* and nothing has been typed, so the
            button offered to undo a state that does not exist — and the band
            cost 81px of the sheet for the whole step to repeat a control the
            header already carries.

            **And `Cancel` is off step two as well.** The path's live crumbs go
            back a step and the ✕ leaves; a footer `Cancel` is a third control
            for an act two others already offer. The footer is where the thing
            gets made, so it holds the primary alone. */}
        {!onCatalogue && (
          <DrawerFooter>
            {submitError && <AlertBanner>{submitError}</AlertBanner>}
            {/* The docs link sits on the footer's free left half. It came off
                the `Advanced` section header, where it split that disclosure's
                hover target and left it behaving differently from `Backups`
                directly above it — and where it was only reachable if you
                happened to be looking at the section it was beside. */}
            <DrawerActions leading={<PostgresDocsLink />}>
              <BlockedAction reason={submitting ? null : reasonList(configureBlockers)}>
                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                  loadingText={isEdit ? "Saving…" : "Creating…"}
                >
                  {isEdit ? "Save changes" : "Create addon"}
                </Button>
              </BlockedAction>
            </DrawerActions>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
