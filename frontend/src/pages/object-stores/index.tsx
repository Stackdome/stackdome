import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useObjectStores } from "@/hooks/use-object-stores";
import { ObjectStoreList, ObjectStoreListSkeleton } from "./components/object-store-list";
import { ObjectStoreFormDrawer } from "./components/object-store-form-drawer";
import type { ObjectStore } from "./types";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/branded";
import { NoConnectionGlyph, NoSecretsGlyph } from "@/components/branded/empty-state";
import { useConfirm } from "@/components/branded/confirm";
import { useToast } from "@/components/ui/use-toast";
import { getErrorMessage } from "@/api/client";
import { deleteObjectStore } from "@/api/object-stores";
import { getCurrentOrganizationId } from "@/lib/common";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useCurrentUser } from "@/hooks/use-current-user";

const IN_USE_FALLBACK = "This object store is in use by one or more Postgres add-ons.";

export default function ObjectStoresPage() {
  const { objectStores, loading, error, refetch } = useObjectStores();
  const { setCustomLabel, setPathLoading } = useBreadcrumb();
  const { canWrite, canWriteAnyProject } = useCurrentUser();
  const { projectNameById } = useResourceProjects();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<ObjectStore | null>(null);

  async function requestDelete(store: ObjectStore) {
    if (!store.id) return;
    const ok = await confirm({
      title: "Delete object store?",
      description: (
        <>
          <span className="font-mono">{store.name}</span> will no longer be available as a backup
          destination. Existing backup files in the destination are not removed. This cannot be
          undone.
        </>
      ),
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;

    const orgId = getCurrentOrganizationId();
    const projectName = projectNameById(store.project_id);
    if (!orgId || !projectName) {
      toast({
        title: "Could not delete object store",
        description: orgId
          ? "Could not resolve the project for this object store."
          : "No organization selected.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteObjectStore(orgId, projectName, store.id);
      toast({ title: "Object store deleted", variant: "success" });
      refetch();
    } catch (e: unknown) {
      toast({
        title: "Failed to delete",
        description: getErrorMessage(e) || IN_USE_FALLBACK,
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    const path = `/object-stores`;
    setCustomLabel(path, "Object stores");
    setPathLoading(path, loading);
  }, [setCustomLabel, setPathLoading, loading]);

  const openNew = () => {
    setEditingStore(null);
    setShowForm(true);
  };

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* §12a — the page's one fact and its one action live in the sheet
          header, not in a band on the body. No `eyebrow`, no `subtitle`: the
          component ignores both, and the explanation belongs to the empty
          state, where it is actually needed. This page has no search, no filter
          and no sort, so it passes no `toolbar` and the header's second row
          collapses itself. */}
      <PageHeader
        actions={
          canWriteAnyProject ? (
            <Button onClick={openNew}>
              <Plus />
              New object store
            </Button>
          ) : undefined
        }
      />

      {error ? (
        /* The retry REFETCHES. Reloading the page was never a retry: it threw
           away the router, the session and any dialog the user had open, to
           re-run one request. */
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoConnectionGlyph />}
          title="Object stores could not be loaded"
          description={error}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      ) : loading ? (
        <ObjectStoreListSkeleton />
      ) : objectStores.length === 0 ? (
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoSecretsGlyph />}
          title="No object stores yet"
          description="An object store is where Postgres backups are written: an S3 bucket, an S3-compatible endpoint such as MinIO, an Azure container or a GCS bucket."
          action={
            /* Outline, never filled (§9). The header already carries this exact
               action as the page's one fill, and two identical filled buttons
               on one screen is two primaries. */
            canWriteAnyProject ? (
              <Button variant="outline" onClick={openNew}>
                <Plus />
                New object store
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* Bare. No `Panel`, no box, no card per row (§11) — the rows and the
           sheet edge are the only boundaries there are. */
        <ObjectStoreList
          objectStores={objectStores}
          onEdit={(store) => {
            setEditingStore(store);
            setShowForm(true);
          }}
          onDelete={(store) => void requestDelete(store)}
          canWrite={(projectId?: string) => canWrite(projectId ?? "")}
        />
      )}

      <ObjectStoreFormDrawer
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingStore(null);
        }}
        editing={editingStore}
        onSaved={() => {
          refetch();
        }}
      />
    </div>
  );
}
