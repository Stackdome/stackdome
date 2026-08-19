import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/branded";
import { AlertBanner } from "@/components/branded/alert-banner";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useConfirm } from "@/components/branded/confirm";
import { useToast } from "@/components/ui/use-toast";
import {
  listRegistryCredentials, deleteRegistryCredential,
  type RegistryCredential,
} from "@/api/registry-credentials";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { RegistriesErrorState, RegistriesEmptyState } from "./components/page-states";
import { RegistryRow, RegistryListHeader, RegistryListSkeleton } from "./components/registry-row";
import { AddRegistryDialog } from "./components/add-registry-dialog";
import { UpdateCredentialsDialog } from "./components/update-credentials-dialog";
import { VerifyRegistryDialog } from "./components/verify-registry-dialog";

export default function ImageRegistriesPage() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<RegistryCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<RegistryCredential | null>(null);
  const [verifying, setVerifying] = useState<RegistryCredential | null>(null);
  const confirm = useConfirm();
  const { setCustomLabel, setPathLoading } = useBreadcrumb();

  // Without this the sheet header takes its title from the URL slug and says
  // "Image-registries".
  useEffect(() => {
    setCustomLabel("/image-registries", "Image registries");
    setPathLoading("/image-registries", loading);
  }, [setCustomLabel, setPathLoading, loading]);

  const refresh = useCallback(async () => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) {
      setError("No organization selected.");
      setLoading(false);
      return;
    }
    try {
      const list = await listRegistryCredentials(orgId);
      setCredentials(list.items ?? []);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = async (credential: RegistryCredential) => {
    const ok = await confirm({
      title: "Remove this registry?",
      description: "Stacks referencing these credentials lose pull/push access.",
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    const orgId = getCurrentOrganizationId();
    if (!orgId || !credential.id) {
      toast({
        title: "Remove failed",
        description: !orgId ? "No organization selected." : "Registry is no longer available.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await deleteRegistryCredential(orgId, credential.id);
      const affected = res.affected_stacks ?? [];
      if (affected.length > 0) {
        toast({
          title: "Registry removed",
          description: `Stacks affected: ${affected.map((s) => s.name ?? s.id).join(", ")}. Their image pulls or pushes may fail until another credential covers ${credential.host}.`,
          variant: "warning",
        });
      } else {
        toast({ title: "Registry removed", variant: "success" });
      }
      await refresh();
    } catch (e) {
      toast({ title: "Remove failed", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  const addButton = (
    <Button onClick={() => setAdding(true)}>
      <Plus />
      Add registry
    </Button>
  );

  return (
    <div className="flex flex-1 flex-col h-full">
      <PageHeader
        // §12a's one fact. No eyebrow, no subtitle: the explanation belongs to
        // the empty state, where it is actually needed.
        status={
          !loading && !error && credentials.length > 0 ? (
            <span className="text-name tabular-nums text-fg-muted">
              {credentials.length} {credentials.length === 1 ? "registry" : "registries"}
            </span>
          ) : undefined
        }
        actions={addButton}
      />

      {/* Full-page error only when there is nothing to show; a failed RE-fetch
          keeps the already-loaded list up and says so in a line above it. */}
      {loading ? (
        <RegistryListSkeleton />
      ) : error && credentials.length === 0 ? (
        <RegistriesErrorState message={error} onRetry={() => void refresh()} />
      ) : credentials.length === 0 ? (
        <RegistriesEmptyState onAdd={() => setAdding(true)} />
      ) : (
        <div>
          {error && (
            <AlertBanner tone="info" className="mb-2">
              These registries could not be refreshed: {error}
            </AlertBanner>
          )}
          <RegistryListHeader />
          {credentials.map((credential) => (
            <RegistryRow
              key={credential.id}
              credential={credential}
              onVerify={setVerifying}
              onUpdateCredentials={setEditing}
              onRemove={(c) => void remove(c)}
            />
          ))}
        </div>
      )}

      <AddRegistryDialog open={adding} onOpenChange={setAdding} onCreated={() => void refresh()} />

      <UpdateCredentialsDialog
        credential={editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onUpdated={() => void refresh()}
      />

      <VerifyRegistryDialog
        credential={verifying}
        onOpenChange={(o) => !o && setVerifying(null)}
      />

    </div>
  );
}
