import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useClusters, useDeleteCluster } from "./hooks/use-clusters";
import { ClusterList, ClusterListSkeleton } from "./components/cluster-list";
import AddClusterDrawer from "./components/add-cluster-drawer";
import { ClusterDetailsDrawer } from "./components/cluster-details-drawer";
import type { ClusterData } from "./hooks/use-clusters";
import type { Cluster } from "./types";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState, BlockedAction } from "@/components/branded";
import { NoConnectionGlyph, NoSecretsGlyph } from "@/components/branded/empty-state";
import { useConfirm } from "@/components/branded/confirm";
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
  /** Which row is open, not a boolean — the drawer is driven by the click, so
   *  there is no second `open` flag to keep in step with it. */
  const [detailsFor, setDetailsFor] = useState<Cluster | null>(null);
  const { deleteCluster } = useDeleteCluster();
  const confirm = useConfirm();
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

  /**
   * §10 level 3 — a cluster has dependents, so the gate is the NAME retyped.
   * The words say what breaks rather than that it cannot be undone.
   */
  async function requestDelete(cluster: Cluster) {
    if (!cluster.id) return;
    const ok = await confirm({
      title: "Delete cluster?",
      description: `Every stack deployed to “${cluster.name}” stops running, and the addons on it are destroyed with their storage.`,
      confirmLabel: "Delete",
      variant: "destructive",
      gate: { kind: "retype", name: cluster.name },
    });
    if (!ok) return;
    try {
      await deleteCluster(cluster.id);
      // The object this drawer is about is gone, so the drawer goes with it.
      setDetailsFor(null);
      toast({
        title: "Cluster deleted",
        description: `"${cluster.name}" has been removed.`,
        variant: "success",
      });
      refetch();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: getErrorMessage(e),
        variant: "destructive",
      });
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
        <ClusterList clusters={clusters} onOpen={setDetailsFor} />
      )}

      {/* The list stays on screen behind it — which is the whole reason one
          object's detail is a drawer and not a page (§13). */}
      <ClusterDetailsDrawer
        cluster={detailsFor}
        onOpenChange={(open) => !open && setDetailsFor(null)}
        onDelete={(cluster) => void requestDelete(cluster)}
      />

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
