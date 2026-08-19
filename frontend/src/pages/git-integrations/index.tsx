import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/branded";
import { AlertBanner } from "@/components/branded/alert-banner";
import { ConnectProviderDrawer } from "@/components/git-source-picker/connect-provider-drawer";
import { useConfirm } from "@/components/branded/confirm";
import { useToast } from "@/components/ui/use-toast";
import {
  listGitIntegrations, deleteGitIntegration,
  type GitIntegration,
} from "@/api/git-integrations";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { GIT_INTEGRATION_TYPE_GITHUB_APP } from "@/lib/git-integrations";
import { IntegrationsErrorState, IntegrationsEmptyState } from "./components/page-states";
import {
  IntegrationRow,
  IntegrationListHeader,
  IntegrationListSkeleton,
} from "./components/integration-row";
import { VerifyIntegrationDialog } from "./components/verify-integration-dialog";
import { UpdateCredentialsDialog } from "./components/update-credentials-dialog";

export default function GitIntegrationsPage() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<GitIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<GitIntegration | null>(null);
  const [editing, setEditing] = useState<GitIntegration | null>(null);
  const confirm = useConfirm();
  const [wizardOpen, setWizardOpen] = useState(false);
  const { setCustomLabel, setPathLoading } = useBreadcrumb();

  useEffect(() => {
    setCustomLabel("/git-integrations", "Git providers");
    setPathLoading("/git-integrations", loading);
  }, [setCustomLabel, setPathLoading, loading]);

  const refresh = useCallback(async () => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) {
      setError("No organization selected.");
      setLoading(false);
      return;
    }
    try {
      const list = await listGitIntegrations(orgId);
      setIntegrations(list.items ?? []);
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

  const remove = async (integration: GitIntegration) => {
    const ok = await confirm({
      title: "Remove this integration?",
      description: "Repositories using this integration lose access for clones.",
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    const orgId = getCurrentOrganizationId();
    if (!orgId || !integration.id) {
      toast({
        title: "Remove failed",
        description: !orgId ? "No organization selected." : "Integration is no longer available.",
        variant: "destructive",
      });
      return;
    }
    try {
      await deleteGitIntegration(orgId, integration.id);
      toast({ title: "Integration removed", variant: "success" });
      await refresh();
    } catch (e) {
      toast({ title: "Remove failed", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  const hasGithubApp = integrations.some((i) => i.type === GIT_INTEGRATION_TYPE_GITHUB_APP);
  const addButton = (
    <Button onClick={() => setWizardOpen(true)}>
      <Plus />
      Connect provider
    </Button>
  );

  return (
    <div className="flex flex-1 flex-col h-full">
      <PageHeader
        actions={addButton}
      />

      {/* Full-page error only when there is nothing to show; a failed RE-fetch
          keeps the already-loaded list up and says so in a line above it. */}
      {loading ? (
        <IntegrationListSkeleton />
      ) : error && integrations.length === 0 ? (
        <IntegrationsErrorState message={error} onRetry={() => void refresh()} />
      ) : integrations.length === 0 ? (
        <IntegrationsEmptyState onAdd={() => setWizardOpen(true)} />
      ) : (
        <div>
          {error && (
            <AlertBanner tone="info" className="mb-2">
              These providers could not be refreshed: {error}
            </AlertBanner>
          )}
          <IntegrationListHeader />
          {integrations.map((integration) => (
            <IntegrationRow
              key={integration.id}
              integration={integration}
              onVerify={setVerifying}
              onRemove={(i) => void remove(i)}
              onUpdateCredentials={setEditing}
            />
          ))}
        </div>
      )}

      <ConnectProviderDrawer
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        hasGithubApp={hasGithubApp}
        onCreated={() => void refresh()}
      />

      <VerifyIntegrationDialog
        integration={verifying}
        onOpenChange={(o) => !o && setVerifying(null)}
      />

      <UpdateCredentialsDialog
        integration={editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onUpdated={() => void refresh()}
      />

    </div>
  );
}
