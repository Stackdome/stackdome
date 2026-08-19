import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertBanner, FieldShell } from "@/components/branded";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentOrganizationId } from "@/lib/common";
import { getErrorMessage } from "@/api/client";
import { createObjectStore, updateObjectStore } from "@/api/object-stores";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import {
  objectStoreFormSchema,
  toApiPayload,
  type ObjectStoreFormValues,
} from "../schemas/form-schema";
import type { ObjectStore } from "../types";
import { SecretKeyPicker } from "./secret-key-picker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ObjectStore | null;
  onSaved: () => void;
};

const empty: ObjectStoreFormValues = {
  name: "",
  destinationPath: "",
  retentionPolicy: "7d",
  provider: "s3",
  s3: {
    region: "us-east-1",
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

export function ObjectStoreFormDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { projectNameById, defaultProjectName } = useResourceProjects();
  const [values, setValues] = useState<ObjectStoreFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [unsupportedEdit, setUnsupportedEdit] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      if (editing) {
        const next = fromObjectStore(editing);
        if (next === null) {
          setUnsupportedEdit(true);
          setValues(empty);
        } else {
          setUnsupportedEdit(false);
          setValues(next);
        }
      } else {
        setUnsupportedEdit(false);
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
      // Above the footer, not a toast — the form that failed is still here.
      setSaveError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent size="work">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit object store" : "New object store"}</DialogTitle>
            <DialogDescription>
              Configure a backup destination. Credentials reference an existing Secret.
            </DialogDescription>
          </DialogHeader>

          <DialogSection>
            {unsupportedEdit ? (
              <AlertBanner tone="blocking">
            Editing Azure and GCS stores isn't supported yet. Delete this store and create it again.
              </AlertBanner>
            ) : (
              <div className="flex flex-col gap-4">
                <FieldShell label="Name" htmlFor="os-name" required error={errors.name}>
                  <Input
                    id="os-name"
                    value={values.name}
                    onChange={(e) => {
                      clearError("name");
                      setValues((v) => ({ ...v, name: e.target.value }));
                    }}
                    placeholder="minio-local"
                    disabled={!!editing}
                  />
                </FieldShell>

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
                    placeholder="s3://stackdome-backups/db1"
                    className="font-mono"
                  />
                </FieldShell>

                <FieldShell
                  label="Retention"
                  htmlFor="os-retention"
                  required
                  error={errors.retentionPolicy}
                >
                  <Input
                    id="os-retention"
                    value={values.retentionPolicy}
                    onChange={(e) => {
                      clearError("retentionPolicy");
                      setValues((v) => ({ ...v, retentionPolicy: e.target.value }));
                    }}
                    placeholder="7d"
                  />
                </FieldShell>

                <Tabs
                  value={values.provider}
                  onValueChange={(p) =>
                    setValues((v) => ({ ...v, provider: p as ObjectStoreFormValues["provider"] }))
                  }
                >
                  <TabsList>
                    <TabsTrigger value="s3">S3 / S3-compatible</TabsTrigger>
                    <TabsTrigger value="azure">Azure</TabsTrigger>
                    <TabsTrigger value="gcs">GCS</TabsTrigger>
                  </TabsList>

                  <TabsContent value="s3" className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FieldShell label="Region" htmlFor="os-region" required error={errors["s3.region"]}>
                        <Input
                          id="os-region"
                          value={values.s3?.region ?? ""}
                          onChange={(e) => {
                            clearError("s3.region");
                            setValues((v) => ({
                              ...v,
                              s3: { ...(v.s3 ?? empty.s3!), region: e.target.value },
                            }));
                          }}
                          placeholder="us-east-1"
                        />
                      </FieldShell>
                      <FieldShell label="Endpoint URL" htmlFor="os-endpoint" error={errors["s3.endpointUrl"]}>
                        <Input
                          id="os-endpoint"
                          value={values.s3?.endpointUrl ?? ""}
                          onChange={(e) => {
                            clearError("s3.endpointUrl");
                            setValues((v) => ({
                              ...v,
                              s3: { ...(v.s3 ?? empty.s3!), endpointUrl: e.target.value },
                            }));
                          }}
                          placeholder="http://localhost:9000 (for MinIO)"
                          className="font-mono"
                        />
                      </FieldShell>
                    </div>

                    <SecretKeyPicker
                      label={<>Access Key ID <span className="text-name font-semibold text-danger leading-none" aria-hidden>*</span></>}
                      helpText="A Generic secret and the key inside it that holds the access key id."
                      value={values.s3?.accessKeyId ?? { secret_id: "", key: "" }}
                      onChange={(next) => {
                        clearError("s3.accessKeyId.secret_id");
                        clearError("s3.accessKeyId.key");
                        setValues((v) => ({
                          ...v,
                          s3: { ...(v.s3 ?? empty.s3!), accessKeyId: next },
                        }));
                      }}
                      expectedKeyHint="accessKeyId"
                      error={errors["s3.accessKeyId.secret_id"] || errors["s3.accessKeyId.key"]}
                    />

                    <SecretKeyPicker
                      label={<>Secret Access Key <span className="text-name font-semibold text-danger leading-none" aria-hidden>*</span></>}
                      helpText="A Generic secret and the key inside it that holds the secret access key."
                      value={values.s3?.secretAccessKey ?? { secret_id: "", key: "" }}
                      onChange={(next) => {
                        clearError("s3.secretAccessKey.secret_id");
                        clearError("s3.secretAccessKey.key");
                        setValues((v) => ({
                          ...v,
                          s3: { ...(v.s3 ?? empty.s3!), secretAccessKey: next },
                        }));
                      }}
                      expectedKeyHint="secretAccessKey"
                      error={
                        errors["s3.secretAccessKey.secret_id"] || errors["s3.secretAccessKey.key"]
                      }
                    />
                  </TabsContent>

                  <TabsContent value="azure" className="flex flex-col gap-4">
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
                          setValues((v) => ({
                            ...v,
                            azure: {
                              ...(v.azure ?? empty.azure!),
                              storageAccountName: e.target.value,
                            },
                          }));
                        }}
                        placeholder="mystorageaccount"
                        className="font-mono"
                      />
                    </FieldShell>

                    <SecretKeyPicker
                      label={<>Connection string <span className="text-name font-semibold text-danger leading-none" aria-hidden>*</span></>}
                      helpText="A Generic secret and the key inside it that holds the Azure connection string."
                      value={values.azure?.connectionString ?? { secret_id: "", key: "" }}
                      onChange={(next) => {
                        clearError("azure.connectionString.secret_id");
                        clearError("azure.connectionString.key");
                        setValues((v) => ({
                          ...v,
                          azure: { ...(v.azure ?? empty.azure!), connectionString: next },
                        }));
                      }}
                      expectedKeyHint="connectionString"
                      error={
                        errors["azure.connectionString.secret_id"] ||
                    errors["azure.connectionString.key"]
                      }
                    />
                  </TabsContent>

                  <TabsContent value="gcs" className="flex flex-col gap-4">
                    <SecretKeyPicker
                      label={<>Service account credentials <span className="text-name font-semibold text-danger leading-none" aria-hidden>*</span></>}
                      helpText="A Generic secret and the key inside it that holds the GCS service account JSON."
                      value={
                        values.gcs?.serviceAccountCredentials ?? { secret_id: "", key: "" }
                      }
                      onChange={(next) => {
                        clearError("gcs.serviceAccountCredentials.secret_id");
                        clearError("gcs.serviceAccountCredentials.key");
                        setValues((v) => ({
                          ...v,
                          gcs: {
                            ...(v.gcs ?? empty.gcs!),
                            serviceAccountCredentials: next,
                          },
                        }));
                      }}
                      expectedKeyHint="serviceAccountKey"
                      error={
                        errors["gcs.serviceAccountCredentials.secret_id"] ||
                    errors["gcs.serviceAccountCredentials.key"]
                      }
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* The error slot: above the footer, so a failed save lands next to
                the button that failed instead of flying past as a toast. */}
            {saveError && <AlertBanner>{saveError}</AlertBanner>}
          </DialogSection>
        </DialogBody>

        <DialogFooter>
          <Button shape="flat"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || unsupportedEdit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Create object store"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
