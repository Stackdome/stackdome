import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, EmptyState } from "@/components/branded";
import { NoConnectionGlyph, NoSecretsGlyph, SearchGlyph } from "@/components/branded/empty-state";
import { cn } from "@/lib/utils";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePostgresAddons } from "@/hooks/use-postgres-addons";
import { AddonList, AddonListSkeleton } from "./components/addon-list";
import { AddonDrawer } from "./components/addon-drawer";
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
  const [pickerOpen, setPickerOpen] = useState(false);
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
      <div className="relative w-[300px]">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-muted" />
        <Input
          placeholder="Filter addons…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-[30px]"
          aria-label="Filter addons"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Filters are working controls: `flat`, never a pill (§9). */}
          <Button variant="outline" shape="flat">
            <span className="text-fg-2">Status:</span> <span>{statusLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 flex-none text-fg-2" />
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
            <ChevronDown className="h-3.5 w-3.5 flex-none text-fg-2" />
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
        // §12a's one fact — a count of what is ON SCREEN, so it tracks the
        // filters. Absent while loading, absent when empty, absent when the
        // load failed: a count of nothing is not a fact.
        status={
          !loading && !error && rows.length > 0 ? (
            <span className="text-name tabular-nums text-fg-muted">
              {rows.length} {rows.length === 1 ? "addon" : "addons"}
            </span>
          ) : undefined
        }
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
        <AddonList addons={rows} canWrite={(projectId?: string) => canWrite(projectId ?? "")} />
      )}

      <AddonDrawer open={pickerOpen} onOpenChange={setPickerOpen} onSaved={refetch} />
    </div>
  );
}
