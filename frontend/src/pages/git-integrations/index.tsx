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
import { useGithubConnect } from "@/hooks/use-github-connect";
import { GIT_INTEGRATION_TYPE_GITHUB_APP } from "@/lib/git-integrations";
import { IntegrationsErrorState, IntegrationsEmptyState } from "./components/page-states";
import {
  IntegrationRow,
  IntegrationListHeader,
  IntegrationListSkeleton,
} from "./components/integration-row";
import { VerifyIntegrationDialog } from "./components/verify-integration-dialog";
import { GitIntegrationDrawer } from "./components/git-integration-drawer";

export default function GitIntegrationsPage() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<GitIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<GitIntegration | null>(null);
  /** Which row is open, not a boolean — the drawer is driven by the click, so
   *  there is no second `open` flag to keep in step with it. */
  const [openFor, setOpenFor] = useState<GitIntegration | null>(null);
  const confirm = useConfirm();
  const [wizardOpen, setWizardOpen] = useState(false);
  const { setCustomLabel, setPathLoading } = useBreadcrumb();
  const github = useGithubConnect();


  useEffect(() => {
    setCustomLabel("/git-integrations", "Git providers");
    setPathLoading("/git-integrations", loading);
  }, [setCustomLabel, setPathLoading, loading]);

  // A failed install callback lands back here with the reason in the URL
  // (the popup itself relays it to its opener and closes).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setupError = params.get("setup_error");
    if (!setupError) return;
    toast({ title: "GitHub App install failed", description: setupError, variant: "destructive" });
    params.delete("setup_error");
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
  }, [toast]);

  // "Add GitHub account" runs the same connect flow as the wizard; the hook
  // polls until the new installation is bound.
  useEffect(() => {
    if (github.state === "connected") void refresh();
    if (github.state === "error" && github.error) {
      toast({ title: "GitHub App install failed", description: github.error, variant: "destructive" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [github.state, github.error]);

  /** Install the GitHub App on ANOTHER account. main's, kept whole — it hung
   *  off the row menu this branch replaced with a drawer, so it is handed to
   *  the drawer instead. Platform rows only: a BYO row carries `install_url`
   *  and links straight out to GitHub. */
  const addAccount = () => {
    void github.connect();
    toast({ title: "Finish the install in the GitHub popup", description: "Pick the account or organization to add." });
  };

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
      title: "Remove this provider?",
      description: "Every stack and preview built from this provider stops cloning, and any preview repository enabled on it stops getting environments.",
      confirmLabel: "Remove",
      variant: "destructive",
      gate: {
        kind: "acknowledge",
        label: "I understand that builds using this provider will start failing.",
      },
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
      // The object the drawer is about is gone, so the drawer goes with it.
      setOpenFor(null);
      toast({ title: "Provider removed", variant: "success" });
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
              onOpen={setOpenFor}
              onVerify={setVerifying}
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

      {/* The list stays on screen behind it — which is the whole reason one
          object's detail is a drawer and not a page (§13). */}
      <GitIntegrationDrawer
        onAddAccount={addAccount}
        integration={openFor}
        onOpenChange={(o) => !o && setOpenFor(null)}
        onUpdated={() => void refresh()}
        onVerify={(i) => {
          // Two stacked modals is two scrims and two focus traps for one
          // object, so the drawer closes as the check opens.
          setOpenFor(null);
          setVerifying(i);
        }}
        onRemove={(i) => void remove(i)}
      />

    </div>
  );
}
