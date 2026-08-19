import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useClusters } from "./hooks/use-clusters";
import { ClusterList, ClusterListSkeleton } from "./components/cluster-list";
import AddClusterDrawer from "./components/add-cluster-drawer";
import type { ClusterData } from "./hooks/use-clusters";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState, BlockedAction } from "@/components/branded";
import { NoConnectionGlyph, NoSecretsGlyph } from "@/components/branded/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { createCluster } from "@/api/clusters";
import { getCurrentOrganizationId } from "@/lib/common";
import { getErrorMessage } from "@/api/client";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";

export default function ClustersPage() {
  const { clusters, loading, error, refetch } = useClusters();
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { toast } = useToast();
  const { setCustomLabel, setPathLoading } = useBreadcrumb();

  // Set breadcrumb
  useEffect(() => {
    const currentPath = `/clusters`;
    setCustomLabel(currentPath, "Clusters");
    setPathLoading(currentPath, loading);
  }, [setCustomLabel, setPathLoading, loading]);

  async function handleAddCluster(clusterData: ClusterData) {
    const orgId = getCurrentOrganizationId();
    if (!orgId) {
      setCreateError("No organization selected");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      await createCluster(orgId, clusterData);
      refetch();
      setShowAddDrawer(false);
      toast({
        title: "Cluster added",
        description: "The cluster has been added successfully.",
        variant: "success",
      });
    } catch (e) {
      console.error('Failed to create cluster:', e);
      setCreateError(getErrorMessage(e));
    } finally {
      setCreateLoading(false);
    }
  }

  const addCluster = (variant: "default" | "outline") => (
    <BlockedAction
      reason={clusters.length >= 1 ? "Only one cluster is supported today." : null}
    >
      <Button variant={variant} onClick={() => setShowAddDrawer(true)}>
        <Plus />
        Add cluster
      </Button>
    </BlockedAction>
  );

  return (
    <div className="flex flex-1 flex-col h-full">
      <PageHeader
        actions={addCluster("default")}
      />

      {error ? (
        /* The retry REFETCHES. Reloading the page was never a retry: it threw
           away the router, the session and any dialog the user had open, to
           re-run one request. */
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoConnectionGlyph />}
          title="Clusters could not be loaded"
          description={error}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      ) : loading ? (
        <ClusterListSkeleton />
      ) : clusters.length === 0 ? (
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoSecretsGlyph />}
          title="No clusters yet"
          description="A cluster is where your stacks actually run. Connect one with a kubeconfig and Stackdome installs its agent, then deploys to it."
          /* Outline, never filled (§9). The header already carries this exact
             action as the page's one fill. */
          action={addCluster("outline")}
        />
      ) : (
        <ClusterList clusters={clusters} />
      )}

      <AddClusterDrawer
        open={showAddDrawer}
        // Clearing on close, so a failure from a previous attempt does not
        // greet the next one from the footer of an empty form.
        onOpenChange={(next) => {
          if (!next) setCreateError(null);
          setShowAddDrawer(next);
        }}
        onAddCluster={handleAddCluster}
        isLoading={createLoading}
        error={createError}
      />
    </div>
  );
}
