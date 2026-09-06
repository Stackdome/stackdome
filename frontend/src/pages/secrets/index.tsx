import { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { useSecrets } from "@/hooks/use-secrets";
import { SecretList, SecretListSkeleton, formatSecretType } from "./components/secret-list";
import { SecretFormDrawer } from "./components/secret-form-drawer";
import type { Secret } from "./types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuChevron,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchField } from "@/components/branded/search-field";
import { PageHeader, EmptyState } from "@/components/branded";
import { NoConnectionGlyph, NoSecretsGlyph, SearchGlyph } from "@/components/branded/empty-state";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/branded/confirm";
import { useToast } from "@/components/ui/use-toast";
import { deleteSecret, createSecret, updateSecret } from "@/api/secrets";
import { getCurrentOrganizationId } from "@/lib/common";
import { getErrorMessage } from "@/api/client";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import { useCurrentUser } from "@/hooks/use-current-user";

type SortKey = "created" | "name";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "created", label: "Recently created" },
  { key: "name", label: "Name (A–Z)" },
];

const ALL_TYPES = "all";

export default function SecretsPage() {
  const { secrets, loading, error, refetch } = useSecrets();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [deletingSecret, setDeletingSecret] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();
  const confirm = useConfirm();
  const { setCustomLabel, setPathLoading } = useBreadcrumb();
  const { projectNameById, defaultProjectName } = useResourceProjects();
  const { canWrite, canWriteAnyProject } = useCurrentUser();

  // Set breadcrumb
  useEffect(() => {
    const currentPath = `/secrets`;
    setCustomLabel(currentPath, "Secrets");
    setPathLoading(currentPath, loading);
  }, [setCustomLabel, setPathLoading, loading]);

  function handleEdit(secret: Secret) {
    setEditingSecret(secret);
    setShowAddDialog(true);
  }

  async function requestDelete(secret: Secret) {
    if (!secret.id) return;
    // §6a level 2: a secret is rebuildable but nothing that reads it survives
    // its removal, so the gate is an acknowledgement — not a bare red button.
    const ok = await confirm({
      title: "Delete secret?",
      description: `Anything using “${secret.name}” starts failing the moment it is gone. The value cannot be recovered.`,
      confirmLabel: "Delete",
      variant: "destructive",
      gate: {
        kind: "acknowledge",
        label: `I understand that stacks reading ${secret.name} will break.`,
      },
    });
    if (!ok) return;
    const orgId = getCurrentOrganizationId();
    if (!orgId) {
      toast({ title: "Failed to delete secret", description: "No organization selected.", variant: "destructive" });
      return;
    }
    const projectName = projectNameById(secret.project_id);
    if (!projectName) {
      toast({ title: "Failed to delete secret", description: "Could not resolve the project for this secret.", variant: "destructive" });
      return;
    }
    setDeletingSecret(true);
    try {
      await deleteSecret(orgId, projectName, secret.id);
      // The drawer is the surface the act was taken FROM, so it is the surface
      // that has to close — leaving it open over a list that no longer holds
      // the row is a form editing something that is gone.
      handleCloseDialog();
      refetch();
      toast({
        title: "Secret deleted",
        description: "The secret has been deleted successfully.",
        variant: "success",
      });
    } catch (e) {
      console.error('Failed to delete secret:', e);
      toast({
        title: "Failed to delete secret",
        description: "Failed to delete secret. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingSecret(false);
    }
  }

  async function handleCreateOrUpdateSecret(secretData: Omit<Secret, "id" | "organisation_id" | "created_at" | "updated_at">) {
    const orgId = getCurrentOrganizationId();
    if (!orgId) {
      setFormError("No organization selected");
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      if (editingSecret?.id) {
        // Update existing secret — target the secret's own project.
        const projectName = projectNameById(editingSecret.project_id);
        if (!projectName) {
          setFormError("Could not resolve the project for this secret.");
          return;
        }
        await updateSecret(orgId, projectName, editingSecret.id, secretData);
        toast({
          title: "Secret updated",
          description: "The secret has been updated successfully.",
          variant: "success",
        });
      } else {
        // Create new secret in the user's default project.
        if (!defaultProjectName) {
          setFormError("You don't have a project to create secrets in.");
          return;
        }
        await createSecret(orgId, defaultProjectName, secretData);
        toast({
          title: "Secret created",
          description: "The secret has been created successfully.",
          variant: "success",
        });
      }
      refetch();
      setShowAddDialog(false);
      setEditingSecret(null);
    } catch (e) {
      console.error('Failed to save secret:', e);
      setFormError(getErrorMessage(e));
    } finally {
      setFormLoading(false);
    }
  }

  function handleCloseDialog() {
    setShowAddDialog(false);
    setEditingSecret(null);
    setFormError(null);
  }

  // Types present in the data drive the TYPE filter dropdown.
  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of secrets) counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [secrets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = secrets.filter(
      (s) =>
        (typeFilter === ALL_TYPES || s.type === typeFilter) &&
        (q === "" || s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)),
    );
    return [...rows].sort((a, b) =>
      sortKey === "name"
        ? (a.name ?? "").localeCompare(b.name ?? "")
        : (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
  }, [secrets, query, typeFilter, sortKey]);

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "";

  const clearFilters = () => {
    setQuery("");
    setTypeFilter(ALL_TYPES);
  };

  /**
   * §12a — the section's tools live in the header's second row, not in the page
   * body. They used to sit inside the list's own wrapper, which meant they
   * vanished with the list and were indented past the title above them.
   *
   * Rendered in every state including loading — they do not depend on the data.
   * Not on error: a live filter over a dead list is a lie.
   */
  const toolbar = error ? undefined : (
    <>
      <SearchField
        className="w-[300px]"
        value={query}
        onChange={setQuery}
        placeholder="Filter secrets…"
        label="Filter secrets"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Filters are working controls: `flat`, never a pill (§9). Default
              size, not `sm` — the toolbar is chrome, not a compact strip. */}
          <Button variant="outline" shape="flat">
            <span className="text-fg-2">Type:</span>{" "}
            <span>{typeFilter === ALL_TYPES ? "All" : formatSecretType(typeFilter)}</span>
            <DropdownMenuChevron />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[200px]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuItem
            onSelect={() => setTypeFilter(ALL_TYPES)}
            className={cn(
              "justify-between text-body",
              typeFilter === ALL_TYPES && "font-semibold text-foreground",
            )}
          >
            <span>All</span>
            <span className="tabular-nums text-fg-2">{secrets.length}</span>
          </DropdownMenuItem>
          {typeOptions.map((o) => (
            <DropdownMenuItem
              key={o.type}
              onSelect={() => setTypeFilter(o.type)}
              className={cn(
                "justify-between text-body",
                typeFilter === o.type && "font-semibold text-foreground",
              )}
            >
              <span>{formatSecretType(o.type)}</span>
              <span className="tabular-nums text-fg-2">{o.count}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" shape="flat">
            <span className="text-fg-2">Sort:</span> <span>{sortLabel}</span>
            <DropdownMenuChevron />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[200px]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {SORT_OPTIONS.map((o) => (
            <DropdownMenuItem
              key={o.key}
              onSelect={() => setSortKey(o.key)}
              className={cn("text-body", sortKey === o.key && "font-semibold text-foreground")}
            >
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  const newSecret = (variant: "default" | "outline") =>
    canWriteAnyProject ? (
      <Button variant={variant} onClick={() => setShowAddDialog(true)}>
        <Plus />
        New secret
      </Button>
    ) : undefined;

  return (
    <div className="flex flex-1 flex-col h-full">
      <PageHeader
        actions={newSecret("default")}
        toolbar={toolbar}
      />

      {error ? (
        /* The retry REFETCHES. Reloading the page was never a retry: it threw
           away the router, the session and any dialog the user had open, to
           re-run one request. */
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoConnectionGlyph />}
          title="Secrets could not be loaded"
          description={error}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      ) : loading ? (
        <SecretListSkeleton />
      ) : secrets.length === 0 ? (
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoSecretsGlyph />}
          title="No secrets yet"
          description="Secrets hold the values your stacks need at runtime: keys, tokens and passwords. A stack reads them by name, and nobody has to paste one into a config file."
          /* Outline, never filled (§9). The header already carries this exact
             action as the page's one fill. */
          action={newSecret("outline")}
        />
      ) : filtered.length === 0 ? (
        /* A filter that matched nothing is small and recoverable, so it gets the
           small mark and a way back — never the first-run glyph. The tools stay
           up: they are what got you here and what gets you out. */
        <EmptyState
          className="flex-1"
          icon={<SearchGlyph />}
          title="No secrets match"
          description="Try a different search, or clear the filters."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        /* The row opens the form. A secret has no live state a details drawer
           could show that the form does not — it is a name, a kind and a value,
           and all three are fields. */
        <SecretList secrets={filtered} onOpen={handleEdit} />
      )}

      <SecretFormDrawer
        open={showAddDialog}
        onOpenChange={handleCloseDialog}
        onSubmit={handleCreateOrUpdateSecret}
        isLoading={formLoading}
        error={formError}
        editingSecret={editingSecret}
        /* Only where the reader may write to that secret's project — a danger
           zone whose one control refuses is a warning about nothing. */
        onDelete={
          editingSecret && canWrite(editingSecret.project_id ?? "")
            ? (secret) => void requestDelete(secret)
            : undefined
        }
        deleting={deletingSecret}
      />
    </div>
  );
}
