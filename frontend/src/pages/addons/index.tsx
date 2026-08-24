import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import { usePostgresAddons } from "@/hooks/use-postgres-addons";
import { useConfirm } from "@/components/branded/confirm";
import { useToast } from "@/components/ui/use-toast";
import { deletePostgresAddon, type PostgresAddon } from "@/api/addons";
import { getErrorMessage, isErrorStatus } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { AddonList, AddonListSkeleton } from "./components/addon-list";
import { AddonDrawer } from "./components/addon-drawer";
import { AddonDetailsDrawer } from "./components/addon-details-drawer";
import {
  filterAndSortAddons,
  countByBucket,
  type AddonStatusFilter,
  type AddonSortKey,
} from "./lib/addon-list-filter";

const STATUS_FILTERS: { key: AddonStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready" },
  { key: "pending", label: "Pending" },
  { key: "error", label: "Failed" },
];

const SORT_OPTIONS: { key: AddonSortKey; label: string }[] = [
  { key: "created", label: "Recently created" },
  { key: "name", label: "Name (A–Z)" },
];

export default function AddonsPage() {
  const { addons, loading, error, refetch } = usePostgresAddons();
  const { canWriteAnyProject, canWrite } = useCurrentUser();
  const { projectNameById } = useResourceProjects();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Which row is open, not a boolean — the drawer is driven by the click, so
   *  there is no second `open` flag to keep in step with it. */
  const [detailsFor, setDetailsFor] = useState<PostgresAddon | null>(null);
  /** The addon being edited. Opening it CLOSES the details drawer: two stacked
   *  modals is two scrims and two focus traps for one object. */
  const [editing, setEditing] = useState<PostgresAddon | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AddonStatusFilter>("all");
  const [sortKey, setSortKey] = useState<AddonSortKey>("created");
  const { setCustomLabel, setPathLoading } = useBreadcrumb();

  useEffect(() => {
    setCustomLabel("/addons", "Addons");
    setPathLoading("/addons", loading);
  }, [setCustomLabel, setPathLoading, loading]);

  const counts = useMemo(() => countByBucket(addons), [addons]);
  const rows = useMemo(
    () => filterAndSortAddons(addons, query, status, sortKey),
    [addons, query, status, sortKey],
  );

  /**
   * **Say what goes, and say it before the click.** The words are the detail
   * page's, because deleting an addon from the list is the same act with the
   * same blast radius — a second phrasing of one destruction is how two screens
   * come to disagree about what it costs.
   */
  async function requestDelete(addon: PostgresAddon) {
    const ok = await confirm({
      title: "Delete addon?",
      description: `The underlying database and storage for “${addon.name}” are removed. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    const orgId = getCurrentOrganizationId();
    const projectName = projectNameById(addon.project_id);
    if (!orgId || !addon.id || !projectName) {
      toast({
        title: "Delete failed",
        description: "Could not resolve the project for this addon.",
        variant: "destructive",
      });
      return;
    }
    try {
      await deletePostgresAddon(orgId, projectName, addon.id);
      toast({
        title: "Addon deleted",
        description: `"${addon.name}" is being torn down.`,
        variant: "success",
      });
      setDetailsFor(null);
      refetch();
    } catch (e) {
      toast({
        title: "Delete failed",
        // A 409 is not a failure of the delete, it is a dependency the user can
        // clear — so it says which one rather than repeating the refusal.
        description: isErrorStatus(e, 409)
          ? `${getErrorMessage(e)} Remove the stack references first, then try again.`
          : getErrorMessage(e),
        variant: "destructive",
      });
    }
  }

  const statusLabel = STATUS_FILTERS.find((f) => f.key === status)?.label ?? "All";
  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Sort";

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
  };

  /**
   * §12a — the section's tools live in the header's second row, not in the page
   * body. They used to live inside `AddonList`, which put them 20px further in
   * than the title above them and made them disappear the moment the list did.
   *
   * The four status buttons became one dropdown with the same counts, matching
   * the Stacks toolbar: four controls plus a search plus a sort is six things
   * in a band that should read at a glance.
   *
   * Rendered in every state including loading — they do not depend on the data.
   * Not on error: there is nothing to filter, and a live control over a dead
   * list is a lie.
   */
  const toolbar = error ? undefined : (
    <>
      <SearchField
        className="w-[300px]"
        value={query}
        onChange={setQuery}
        placeholder="Filter addons…"
        label="Filter addons"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Filters are working controls: `flat`, never a pill (§9). */}
          <Button variant="outline" shape="flat">
            <span className="text-fg-2">Status:</span> <span>{statusLabel}</span>
            <DropdownMenuChevron />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[200px]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {STATUS_FILTERS.map((f) => (
            <DropdownMenuItem
              key={f.key}
              onSelect={() => setStatus(f.key)}
              className={cn(
                "justify-between text-body",
                status === f.key && "font-semibold text-foreground",
              )}
            >
              <span>{f.label}</span>
              <span className="tabular-nums text-fg-2">{counts[f.key]}</span>
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

  const newAddon = (variant: "default" | "outline") =>
    canWriteAnyProject ? (
      <Button variant={variant} onClick={() => setPickerOpen(true)}>
        <Plus />
        New addon
      </Button>
    ) : undefined;

  return (
    <div className="flex flex-1 flex-col h-full">
      <PageHeader
        actions={newAddon("default")}
        toolbar={toolbar}
      />

      {error ? (
        /* The retry REFETCHES. Reloading the page was never a retry: it threw
           away the router, the session and any dialog the user had open, to
           re-run one request. */
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoConnectionGlyph />}
          title="Addons could not be loaded"
          description={error}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      ) : loading ? (
        <AddonListSkeleton />
      ) : addons.length === 0 ? (
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoSecretsGlyph />}
          title="No addons yet"
          description="An addon is a managed service your stacks can use. Postgres is the one available today: Stackdome provisions it, backs it up and hands you the connection details."
          /* Outline, never filled (§9). The header already carries this exact
             action as the page's one fill, and two identical filled buttons on
             one screen is two primaries. */
          action={newAddon("outline")}
        />
      ) : rows.length === 0 ? (
        /* A filter that matched nothing is small and recoverable, so it gets
           the small mark and a way back — never the first-run glyph. The tools
           stay up: they are what got you here and what gets you out. */
        <EmptyState
          className="flex-1"
          icon={<SearchGlyph />}
          title="No addons match"
          description="Try a different search, or clear the filters."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <AddonList
          addons={rows}
          canWrite={(projectId?: string) => canWrite(projectId ?? "")}
          onOpen={setDetailsFor}
        />
      )}

      <AddonDrawer open={pickerOpen} onOpenChange={setPickerOpen} onSaved={refetch} />

      {/* The list stays on screen behind it — which is the whole reason one
          object's detail is a drawer and not a page (§13). */}
      <AddonDetailsDrawer
        addon={detailsFor}
        onOpenChange={(open) => !open && setDetailsFor(null)}
        canWrite={detailsFor ? canWrite(detailsFor.project_id ?? "") : false}
        onEdit={(addon) => {
          setDetailsFor(null);
          setEditing(addon);
        }}
        onDelete={(addon) => void requestDelete(addon)}
        onOpenPage={(addon) => navigate(`/addons/postgres/${addon.id}`)}
      />

      {editing && (
        <AddonDrawer
          open
          onOpenChange={(open) => !open && setEditing(null)}
          addon={editing}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
