import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertBanner, BlockedAction, FieldShell, reasonList } from "@/components/branded";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentOrganizationId } from "@/lib/common";
import { getErrorMessage } from "@/api/client";
import { createObjectStore, updateObjectStore } from "@/api/object-stores";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import {
  formatProvider,
  objectStoreFormSchema,
  objectStoreProviderSchema,
  toApiPayload,
  type ObjectStoreFormValues,
  type ObjectStoreProvider,
} from "../schemas/form-schema";
import type { ObjectStore } from "../types";
import { SecretKeyPicker } from "./secret-key-picker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ObjectStore | null;
  onSaved: () => void;
};

/** Every provider the schema knows, so the control cannot drift from the payload. */
const PROVIDERS: ObjectStoreProvider[] = objectStoreProviderSchema.options;

const empty: ObjectStoreFormValues = {
  name: "",
  destinationPath: "",
  retentionPolicy: "7d",
  provider: "s3",
  s3: {
    region: "",
    endpointUrl: "",
    accessKeyId: { secret_id: "", key: "" },
    secretAccessKey: { secret_id: "", key: "" },
  },
  azure: {
    storageAccountName: "",
    connectionString: { secret_id: "", key: "" },
  },
  gcs: {
    serviceAccountCredentials: { secret_id: "", key: "" },
  },
};

function fromObjectStore(store: ObjectStore): ObjectStoreFormValues | null {
  const cfg = store.spec.configuration;
  if (cfg.s3_credentials) {
    return {
      name: store.name,
      destinationPath: store.spec.destination_path,
      retentionPolicy: store.spec.retention_policy ?? "7d",
      provider: "s3",
      s3: {
        region: cfg.s3_credentials.region,
        endpointUrl: cfg.s3_credentials.endpoint_url ?? "",
        accessKeyId: cfg.s3_credentials.access_key_id,
        secretAccessKey: cfg.s3_credentials.secret_access_key,
      },
      azure: empty.azure,
      gcs: empty.gcs,
    };
  }
  if (cfg.azure_credentials) {
    return {
      name: store.name,
      destinationPath: store.spec.destination_path,
      retentionPolicy: store.spec.retention_policy ?? "7d",
      provider: "azure",
      s3: empty.s3,
      azure: {
        storageAccountName: cfg.azure_credentials.storage_account_name ?? "",
        connectionString: cfg.azure_credentials.connection_string,
      },
      gcs: empty.gcs,
    };
  }
  if (cfg.gcs_credentials) {
    return {
      name: store.name,
      destinationPath: store.spec.destination_path,
      retentionPolicy: store.spec.retention_policy ?? "7d",
      provider: "gcs",
      s3: empty.s3,
      azure: empty.azure,
      gcs: {
        serviceAccountCredentials: cfg.gcs_credentials.service_account_credentials,
      },
    };
  }
  return null;
}

/**
 * **A drawer, one phase** — §13's table names `object store` under
 * *"None → drawer, one phase"*, and the code shipped a `Dialog` at `work` (760).
 * The table is right and the code was wrong: *"a dialog is never an add. It is a
 * decision — one question, two answers. If the answer is an object, it is a
 * drawer."* An object store is an object.
 *
 * **And the provider is a mode, not a phase.** The two-phase rung is for *"one
 * thing you choose before you can start"*, and you can start here without it:
 * `Name`, `Destination path` and `Retention` are all answerable above it. That
 * is the secret form's `Type` exactly, which is why the two are the same
 * question — and why moving one to a first phase (the parked Option D) has to
 * move both.
 *
 * What did have to change either way is the control. The provider was a `Tabs`
 * strip inside the body: the only place in the product where a form's mode is a
 * tab strip, and the only field on the form with no label, no required mark and
 * no error slot. `Tabs` is navigation everywhere else it appears.
 */
export function ObjectStoreFormDrawer({ open, onOpenChange, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { projectNameById, defaultProjectName } = useResourceProjects();
  const [values, setValues] = useState<ObjectStoreFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [unreadable, setUnreadable] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setSaveError(null);
      if (editing) {
        const next = fromObjectStore(editing);
        if (next === null) {
          setUnreadable(true);
          setValues({
            ...empty,
            name: editing.name,
            destinationPath: editing.spec.destination_path,
            retentionPolicy: editing.spec.retention_policy ?? "7d",
          });
        } else {
          setUnreadable(false);
          setValues(next);
        }
      } else {
        setUnreadable(false);
        setValues(empty);
      }
    }
  }, [open, editing]);

  const orgId = useMemo(() => getCurrentOrganizationId(), []);
  const [saveError, setSaveError] = useState<string | null>(null);

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /**
   * EVERY field still empty, phrased as the thing to DO about it — the shape
   * the secret drawer ships. A form speaks form: you *enter* what you type and
   * *pick* what you choose from a list.
   */
  function missingFields(): string[] {
    const missing: string[] = [];
    if (!values.name.trim()) missing.push("Enter a name");
    if (!values.destinationPath.trim()) missing.push("Enter a destination path");
    if (!values.retentionPolicy.trim()) missing.push("Enter how long backups are kept");
    const picked = (ref?: { secret_id: string; key: string }) => !!ref?.secret_id && !!ref?.key;
    switch (values.provider) {
      case "s3":
        if (!values.s3?.region.trim()) missing.push("Enter a region");
        if (!picked(values.s3?.accessKeyId)) missing.push("Pick the secret holding the access key ID");
        if (!picked(values.s3?.secretAccessKey))
          missing.push("Pick the secret holding the secret access key");
        break;
      case "azure":
        if (!picked(values.azure?.connectionString))
          missing.push("Pick the secret holding the connection string");
        break;
      case "gcs":
        if (!picked(values.gcs?.serviceAccountCredentials))
          missing.push("Pick the secret holding the service account key");
        break;
    }
    return missing;
  }

  async function handleSubmit() {
    const valuesForParse: ObjectStoreFormValues = {
      ...values,
      s3: values.provider === "s3" ? values.s3 : undefined,
      azure: values.provider === "azure" ? values.azure : undefined,
      gcs: values.provider === "gcs" ? values.gcs : undefined,
    };
    const parsed = objectStoreFormSchema.safeParse(valuesForParse);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join(".")] = issue.message;
      }
      setErrors(errs);
      return;
    }
    if (!orgId) {
      setSaveError("No organization is selected. Pick one from the account menu and try again.");
      return;
    }

    setSaveError(null);
    setSubmitting(true);
    try {
      const payload = toApiPayload(parsed.data);
      if (editing?.id) {
        const projectName = projectNameById(editing.project_id);
        if (!projectName) {
          setSaveError("This object store's project could not be resolved. Close this and reload the list.");
          return;
        }
        await updateObjectStore(orgId, projectName, editing.id, payload);
        toast({ title: "Object store updated", variant: "success" });
      } else {
        if (!defaultProjectName) {
          setSaveError("You don't have a project to create object stores in. Ask an admin to add you to one.");
          return;
        }
        await createObjectStore(orgId, defaultProjectName, payload);
        toast({ title: "Object store created", variant: "success" });
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setSaveError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  const setS3 = (patch: Partial<NonNullable<ObjectStoreFormValues["s3"]>>) =>
    setValues((v) => ({ ...v, s3: { ...(v.s3 ?? empty.s3!), ...patch } }));
  const setAzure = (patch: Partial<NonNullable<ObjectStoreFormValues["azure"]>>) =>
    setValues((v) => ({ ...v, azure: { ...(v.azure ?? empty.azure!), ...patch } }));
  const setGcs = (patch: Partial<NonNullable<ObjectStoreFormValues["gcs"]>>) =>
    setValues((v) => ({ ...v, gcs: { ...(v.gcs ?? empty.gcs!), ...patch } }));

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        onOpenChange(next);
      }}
    >
      <DrawerContent size="form">
        <DrawerHeader
          title={editing ? "Edit object store" : "New object store"}
          /* One line. At two the header band grows from 86 to 115, and §13's
             86 is not a coincidence — it is 20 padding, a `title/500` line and
             2 to a description of exactly one line. */
          description="Where Postgres backups are written."
        />

        <DrawerBody>
          {/* **A region explanation, not an instruction to destroy something.**
              The banner here used to read *"Editing Azure and GCS stores isn't
              supported yet. Delete this store and create it again."* — false on
              both counts. This form reads Azure and GCS perfectly well; the
              branch fires only when a store carries **none** of the three
              credential blocks, which the sentence never mentioned. And §10
              does not let a banner tell someone to delete a backup destination
              as a matter of course.

              It also blanked the whole form, so a store whose name, path and
              retention are all perfectly readable showed nothing at all. */}
          {unreadable && (
            <AlertBanner tone="blocking">
              This object store's credentials were saved in a form this screen cannot read, so
              saving would replace them. Its backups are unaffected.
            </AlertBanner>
          )}

          {/* **A field that can never be filled is not a field.** The name was a
              disabled `Input` on edit, and a disabled input dims to its own
              placeholder's tone — so a filled one reads as empty. It is a value
              on the grid instead, at the control rung (§8). */}
          {editing ? (
            <FieldShell label="Name">
              <p className="flex h-8 items-center font-mono text-body text-foreground">
                {values.name}
              </p>
            </FieldShell>
          ) : (
            <FieldShell label="Name" htmlFor="os-name" required error={errors.name}>
              <Input
                id="os-name"
                value={values.name}
                onChange={(e) => {
                  clearError("name");
                  setValues((v) => ({ ...v, name: e.target.value }));
                }}
                placeholder="minio-local"
              />
            </FieldShell>
          )}

          <FieldShell
            label="Destination path"
            htmlFor="os-destination"
            required
            error={errors.destinationPath}
          >
            <Input
              id="os-destination"
              value={values.destinationPath}
              onChange={(e) => {
                clearError("destinationPath");
                setValues((v) => ({ ...v, destinationPath: e.target.value }));
              }}
              placeholder="s3://acme-backups/postgres"
              className="font-mono"
              disabled={unreadable}
            />
          </FieldShell>

          {/* The format rule lived only in the zod error, so it arrived after a
              failed submit. A constraint is a hint (§6): it has to survive the
              first keystroke, which is when it starts mattering. */}
          <FieldShell
            label="Retention"
            htmlFor="os-retention"
            required
            hint="How long backups are kept. Use a value like 7d, 24h or 4w."
            error={errors.retentionPolicy}
          >
            <Input
              id="os-retention"
              value={values.retentionPolicy}
              onChange={(e) => {
                clearError("retentionPolicy");
                setValues((v) => ({ ...v, retentionPolicy: e.target.value }));
              }}
              disabled={unreadable}
            />
          </FieldShell>

          {/* The mode, directly above the fields it rewrites — the
              `Scheduled backups → Schedule` adjacency, and the shape the secret
              form's `Type` already ships. */}
          <FieldShell label="Provider" htmlFor="os-provider" required>
            <Select
              value={values.provider}
              onValueChange={(p) =>
                setValues((v) => ({ ...v, provider: p as ObjectStoreProvider }))
              }
              disabled={unreadable}
            >
              <SelectTrigger id="os-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {formatProvider(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>

          {values.provider === "s3" && !unreadable && (
            <>
              <FieldShell label="Region" htmlFor="os-region" required error={errors["s3.region"]}>
                <Input
                  id="os-region"
                  value={values.s3?.region ?? ""}
                  onChange={(e) => {
                    clearError("s3.region");
                    setS3({ region: e.target.value });
                  }}
                  placeholder="eu-west-1"
                />
              </FieldShell>

              {/* Not paired with `Region`. A region is *which one of a
                  provider's regions*; an endpoint URL replaces the host
                  entirely, and setting it is usually what makes the region a
                  formality. Two questions, and pairing them here would be
                  pairing by count — the `Branch ǀ Port` mistake.

                  The two WERE authored as a pair, in a raw `grid grid-cols-2`.
                  Measured in `dev:mock`: both rendered at 710, stacked, because
                  `FieldShell`'s span now defaults to 2 and overrode the grid.
                  It had been broken since the addon pass and no story caught
                  it, because this form had no stories at all. */}
              <FieldShell
                label="Endpoint URL"
                htmlFor="os-endpoint"
                hint="Set this for MinIO, or another S3-compatible endpoint."
                error={errors["s3.endpointUrl"]}
              >
                <Input
                  id="os-endpoint"
                  value={values.s3?.endpointUrl ?? ""}
                  onChange={(e) => {
                    clearError("s3.endpointUrl");
                    setS3({ endpointUrl: e.target.value });
                  }}
                  /* The parenthetical went to the hint. `http://localhost:9000
                     (for MinIO)` is a specimen with an aside stapled to it, and
                     the aside disappears on the first keystroke — the same
                     family as the `(optional)` that just came out. */
                  placeholder="http://localhost:9000"
                  className="font-mono"
                />
              </FieldShell>

              <SecretKeyPicker
                label="Access key ID"
                required
                value={values.s3?.accessKeyId ?? { secret_id: "", key: "" }}
                onChange={(next) => {
                  clearError("s3.accessKeyId.secret_id");
                  clearError("s3.accessKeyId.key");
                  setS3({ accessKeyId: next });
                }}
                expectedKeyHint="accessKeyId"
                error={errors["s3.accessKeyId.secret_id"] || errors["s3.accessKeyId.key"]}
              />

              <SecretKeyPicker
                label="Secret access key"
                required
                value={values.s3?.secretAccessKey ?? { secret_id: "", key: "" }}
                onChange={(next) => {
                  clearError("s3.secretAccessKey.secret_id");
                  clearError("s3.secretAccessKey.key");
                  setS3({ secretAccessKey: next });
                }}
                expectedKeyHint="secretAccessKey"
                error={
                  errors["s3.secretAccessKey.secret_id"] || errors["s3.secretAccessKey.key"]
                }
              />
            </>
          )}

          {values.provider === "azure" && !unreadable && (
            <>
              <FieldShell
                label="Storage account name"
                htmlFor="os-azure-account"
                error={errors["azure.storageAccountName"]}
              >
                <Input
                  id="os-azure-account"
                  value={values.azure?.storageAccountName ?? ""}
                  onChange={(e) => {
                    clearError("azure.storageAccountName");
                    setAzure({ storageAccountName: e.target.value });
                  }}
                  placeholder="acmebackups"
                  className="font-mono"
                />
              </FieldShell>

              <SecretKeyPicker
                label="Connection string"
                required
                value={values.azure?.connectionString ?? { secret_id: "", key: "" }}
                onChange={(next) => {
                  clearError("azure.connectionString.secret_id");
                  clearError("azure.connectionString.key");
                  setAzure({ connectionString: next });
                }}
                expectedKeyHint="connectionString"
                error={
                  errors["azure.connectionString.secret_id"] ||
                  errors["azure.connectionString.key"]
                }
              />
            </>
          )}

          {values.provider === "gcs" && !unreadable && (
            <SecretKeyPicker
              label="Service account key"
              required
              value={values.gcs?.serviceAccountCredentials ?? { secret_id: "", key: "" }}
              onChange={(next) => {
                clearError("gcs.serviceAccountCredentials.secret_id");
                clearError("gcs.serviceAccountCredentials.key");
                setGcs({ serviceAccountCredentials: next });
              }}
              expectedKeyHint="serviceAccountKey"
              error={
                errors["gcs.serviceAccountCredentials.secret_id"] ||
                errors["gcs.serviceAccountCredentials.key"]
              }
            />
          )}
        </DrawerBody>

        <DrawerFooter>
          {/* In the footer band, not the body. Inside a band that scrolls, a
              failure scrolls away from the button that produced it. */}
          {saveError && <AlertBanner>{saveError}</AlertBanner>}
          {/* **The primary alone.** `Cancel` came off every drawer footer: on a
              one-phase drawer the question is *what is it offering to undo*,
              and before the primary is pressed the answer is nothing — which is
              what the ✕, Esc and the scrim already do. */}
          <DrawerActions>
            <BlockedAction
              reason={
                submitting || unreadable ? null : reasonList(missingFields())
              }
            >
              <Button onClick={handleSubmit} disabled={submitting || unreadable}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create object store"}
              </Button>
            </BlockedAction>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
