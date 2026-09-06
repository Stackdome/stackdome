import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuChevron,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertBanner,
  BlockedAction,
  EmptyState,
  NoProviderGlyph,
  PageHeader,
  SearchGlyph,
  StackArchitectureGlyph,
} from "@/components/branded";
import { SearchField } from "@/components/branded/search-field";
import { useConfirm } from "@/components/branded/confirm";
import { useToast } from "@/components/ui/use-toast";
import { previewStatusVariant, statusVariantLabel } from "@/components/branded/status-variant";
import { cn } from "@/lib/utils";
import { listAllPreviewConfigs, type StackPreviewConfig } from "@/api/preview-configs";
import { deletePreviewEnv, PREVIEW_PHASE, type PreviewStack } from "@/api/preview-envs";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePreviewEnvs } from "@/hooks/use-preview-envs";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import { EnableRepoWizard } from "./components/enable-repo-wizard/enable-repo-wizard";
import { RepositorySettingsDrawer } from "./components/repository-settings-drawer";
import { NewPreviewEnvDrawer } from "./components/new-preview-env-drawer";
import { SyncEnvDialog } from "./components/sync-env-dialog";
import { PreviewListHeader, PreviewListSkeleton, PreviewRow } from "./components/preview-row";
import { RepositoryRail } from "./components/repository-rail";
import { RepositoryContextLine, isAtCap } from "./components/repository-context-line";
import { PreviewDrawer } from "./components/preview-drawer";

const ALL_STATUSES = "all";

type SortKey = "updated" | "created" | "pr";

/** Three readings of the same list, and every one of them is a question people
 *  actually ask: what changed, what is new, and which pull request. */
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "updated", label: "Recently updated" },
  { key: "created", label: "Recently created" },
  { key: "pr", label: "Pull request number" },
];

/** Display order for the status filter — the exact words the rows render,
 *  healthiest first. Unknown words sort last, alphabetically. */
const STATUS_WORD_ORDER = [
  statusVariantLabel.ready,
  statusVariantLabel.pending,
  statusVariantLabel.error,
];

function statusWordRank(word: string): number {
  const i = STATUS_WORD_ORDER.indexOf(word);
  return i === -1 ? STATUS_WORD_ORDER.length : i;
}

/** The bucket a row falls into for the filter. Rows show the raw phase word;
 *  the filter groups them, and both readings come off the same function so a
 *  bucket can never contain a row that does not answer to it. */
function envStatusWord(phase?: string | null): string {
  return statusVariantLabel[previewStatusVariant(phase)];
}

/** Environments counting against a repository's cap. One being torn down has
 *  already given its slot back, so it is not active — everything else is,
 *  including a failure, which is still occupying a name. */
/** `pr_number` is a string on the wire, so sorting it raw puts #99 above #128.
 *  Anything unparseable sorts last rather than as zero. */
function prRank(env: PreviewStack): number {
  const n = Number.parseInt(env.pr_number ?? "", 10);
  return Number.isNaN(n) ? -1 : n;
}

function activeEnvs(envs: PreviewStack[]): PreviewStack[] {
  return envs.filter((e) => e.status?.phase !== PREVIEW_PHASE.deleting);
}

/**
 * **Previews — one screen.**
 *
 * It was two pages: a list of repositories, and a grid of environment cards one
 * click below it. They answered the same question at two depths, so scanning
 * "which of my previews is broken" meant visiting each repository in turn and
 * holding the answers in your head.
 *
 * Now the repositories are a **rail** and the environments are **rows** beside
 * them, and `/previews/:configId` resolves to this same screen with that
 * repository selected. **The route is absorbed, not deleted** — people have it
 * bookmarked — but it does not grow a crumb, because it is a selection inside
 * one page rather than a place under it (§12a, and see `registerSelectionPath`).
 *
 * The title is **always `Previews`**. A landmark that renames itself as you
 * click around the page stops being one; the rail already says which repository,
 * and the context line names it in the body.
 */
export default function PreviewsPage() {
  const { configId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { canWriteAnyProject } = useCurrentUser();
  const { defaultProjectName } = useResourceProjects();
  const { registerSelectionPath } = useBreadcrumb();

  const [configs, setConfigs] = useState<StackPreviewConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [settingsFor, setSettingsFor] = useState<StackPreviewConfig | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [syncing, setSyncing] = useState<PreviewStack | null>(null);
  const [viewing, setViewing] = useState<PreviewStack | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [sortKey, setSortKey] = useState<SortKey>("updated");

  // Every environment, not just the selected repository's: the rail needs a
  // count per row and *All previews* needs the lot, so one request answers the
  // whole screen and the selection is a filter over it.
  const { envs, loading: envsLoading, error: envsError, refresh: refreshEnvs } = usePreviewEnvs();

  const refresh = useCallback(async () => {
    const orgId = getCurrentOrganizationId();
    if (!orgId || !defaultProjectName) return;
    try {
      const list = await listAllPreviewConfigs(orgId, defaultProjectName);
      // A–Z. The rail is a place you look something up by name, and the API's
      // order is creation order — which is the one order nobody in the rail is
      // scanning by.
      setConfigs([...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")));
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [defaultProjectName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The address stays; the crumb does not. Registered rather than special-cased
  // in the header, so the next master/detail screen gets the same treatment
  // without another `if` in the shell.
  useEffect(() => {
    if (!configId) return;
    return registerSelectionPath(`/previews/${configId}`);
  }, [configId, registerSelectionPath]);

  const selected = configId ? (configs.find((c) => c.id === configId) ?? null) : null;
  // A cold load on a bookmark whose repository has since been removed. The rail
  // is right and the URL is stale, so fall back to *All previews* rather than
  // showing a body about nothing.
  const staleSelection = Boolean(configId) && !loading && !selected;
  useEffect(() => {
    if (staleSelection) navigate("/previews", { replace: true });
  }, [staleSelection, navigate]);

  const envCount = useCallback(
    (id?: string) => (id ? envs.filter((e) => e.config_id === id).length : envs.length),
    [envs],
  );

  const configName = useCallback(
    (id?: string) => configs.find((c) => c.id === id)?.name ?? "",
    [configs],
  );

  /** The environments this screen is about, before the toolbar narrows them. */
  const inScope = useMemo(
    () => (selected ? envs.filter((e) => e.config_id === selected.id) : envs),
    [envs, selected],
  );

  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of inScope) {
      const word = envStatusWord(e.status?.phase);
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
    const words = [...new Set([...STATUS_WORD_ORDER, ...counts.keys()])];
    return words
      .map((word) => ({ word, count: counts.get(word) ?? 0 }))
      .sort(
        (a, b) => statusWordRank(a.word) - statusWordRank(b.word) || a.word.localeCompare(b.word),
      );
  }, [inScope]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = inScope.filter((e) => {
      if (statusFilter !== ALL_STATUSES && envStatusWord(e.status?.phase) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        (e.pr_number ?? "").toLowerCase().includes(q) ||
        (e.branch ?? "").toLowerCase().includes(q) ||
        (e.commit ?? "").toLowerCase().startsWith(q) ||
        configName(e.config_id).toLowerCase().includes(q)
      );
    });

    return [...rows].sort((a, b) => {
      // Descending, because a PR list is read newest-first in every other tool
      // the reader has open.
      if (sortKey === "pr") return prRank(b) - prRank(a);
      const at = sortKey === "created" ? a.created_at : a.updated_at || a.created_at;
      const bt = sortKey === "created" ? b.created_at : b.updated_at || b.created_at;
      return new Date(bt || 0).getTime() - new Date(at || 0).getTime();
    });
  }, [inScope, statusFilter, query, configName, sortKey]);

  const active = selected ? activeEnvs(inScope).length : 0;
  const atCap = selected ? isAtCap(selected, active) : false;
  const max = selected?.max_active_previews ?? 0;
  /** **The state, then the consequence.** The headline is the fact you can act
   *  on from across the page; the line under it is the thing that is about to
   *  go wrong and nobody would guess — the next pull request silently gets
   *  nothing. Run together as one paragraph, the second half was never read. */
  const capTitle = `At the limit of ${max} ${max === 1 ? "environment" : "environments"}`;
  const capMessage =
    "New pull requests will not get one until you delete an environment, or raise the limit in its settings.";
  /** The blocked button says the ACT, in the verb of the act (§9). Not the same
   *  sentence: a tooltip on a control is read in the middle of reaching for it. */
  const capReason = atCap ? `Delete an environment, or raise the limit in settings` : null;

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "";

  const clearFilters = () => {
    setQuery("");
    setStatusFilter(ALL_STATUSES);
  };

  const requestDeleteEnv = async (env: PreviewStack) => {
    const ok = await confirm({
      title: `Delete the PR #${env.pr_number} preview?`,
      // Without the second sentence nobody presses the button: the reversal is
      // the whole reason deleting a preview is safe, and it is invisible.
      description:
        "The environment's stack and resources are torn down. A new environment is created automatically if the pull request gets another commit.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    const orgId = getCurrentOrganizationId();
    if (!orgId || !defaultProjectName || !env.id) return;
    try {
      await deletePreviewEnv(orgId, defaultProjectName, env.id);
      toast({ title: `Deleting the PR #${env.pr_number} preview`, variant: "info" });
      await refreshEnvs();
    } catch (e) {
      toast({ title: "Delete failed", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  /**
   * A row opens the PREVIEW, not the stack. Clicking one used to land you on
   * `/stacks/<id>` — a different object with different chrome, where nothing
   * says you are looking at PR #128. The stack is still one click from here.
   */
  const openPreview = (env: PreviewStack) => setViewing(env);

  const showRail = !loading && !error && configs.length > 0;
  /**
   * **The tools stay up whenever the rail does**, including on a repository with
   * nothing open. The board drops them there and that was wrong when judged
   * live: the rail is a selector, so the toolbar appears and disappears as you
   * click down it and the whole body jumps 44px each time. They do not depend on
   * the data — they are the section's tools — and on a no-results state they are
   * what got you there and what gets you out.
   *
   * First run has no rail and no repository, so there is nothing to filter and
   * the row genuinely collapses.
   */
  const showToolbar = showRail;

  /** One label, header and empty state alike. `New preview environment` said the
   *  noun the page is already made of. */
  const newPreview = (variant: "default" | "outline") =>
    canWriteAnyProject ? (
      <BlockedAction reason={capReason}>
        <Button variant={variant} onClick={() => setCreateOpen(true)}>
          <Plus />
          New preview
        </Button>
      </BlockedAction>
    ) : undefined;

  /** On *All previews* there is no one repository to create into, so the action
   *  is the one that grows the rail instead. */
  const enableRepository = (variant: "default" | "outline") =>
    canWriteAnyProject ? (
      <Button variant={variant} onClick={() => setWizardOpen(true)}>
        <Plus />
        Enable repository
      </Button>
    ) : undefined;

  const toolbar = showToolbar ? (
    <>
      {/* A placeholder is not a label. The field's own name has to survive the
          first keystroke, and a screen reader has to hear it at all — which is
          `SearchField`'s `label`, not something this page arranges itself. */}
      <SearchField
        className="w-[300px]"
        value={query}
        onChange={setQuery}
        placeholder="Filter previews…"
        label="Filter previews"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Filters are working controls: `flat`, never a pill, never a fill. */}
          <Button variant="outline" shape="flat">
            <span className="text-fg-2">Status:</span>{" "}
            <span>{statusFilter === ALL_STATUSES ? "All" : statusFilter}</span>
            <DropdownMenuChevron />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[200px]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuItem
            onSelect={() => setStatusFilter(ALL_STATUSES)}
            className={cn(
              "justify-between text-body",
              statusFilter === ALL_STATUSES && "font-medium text-foreground",
            )}
          >
            <span>All</span>
            <span className="tabular-nums text-fg-2">{inScope.length}</span>
          </DropdownMenuItem>
          {statusOptions.map((o) => (
            <DropdownMenuItem
              key={o.word}
              onSelect={() => setStatusFilter(o.word)}
              className={cn(
                "justify-between text-body",
                statusFilter === o.word && "font-medium text-foreground",
              )}
            >
              <span>{o.word}</span>
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
              className={cn("text-body", sortKey === o.key && "font-medium text-foreground")}
            >
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  ) : undefined;

  return (
    <div className="flex h-full flex-1 flex-col">
      <PageHeader
        // The page's one fill, and it changes with what you can actually do:
        // with a repository selected you make a preview, without one you grow
        // the rail.
        /* `New preview` wherever there is a repository to preview into — the
           drawer names its own, so *All previews* offers it too. Only first
           run, which has no repository at all, offers the other act. */
        actions={configs.length > 0 ? newPreview("default") : enableRepository("default")}
        toolbar={toolbar}
      />

      {error ? (
        /* The retry REFETCHES rather than reloading the page. No art — the
           first-run glyph below is a different situation and one drawing must
           not answer two. */
        <EmptyState
          className="flex-1 gap-6"
          title="Previews could not be loaded"
          description={error}
          action={
            <Button variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          }
        />
      ) : loading ? (
        <PreviewListSkeleton showRepository />
      ) : configs.length === 0 ? (
        /* First run: no rail at all. There is nothing to select between, and a
           rail holding one pinned row and a button is chrome around an empty
           room. */
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoProviderGlyph />}
          title="Preview every pull request"
          description="Enable a repository and each pull request gets its own temporary environment with a shareable URL."
          /* Outline, never filled (§9) — the header already carries this exact
             action as the page's one fill. */
          action={enableRepository("outline")}
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          <RepositoryRail
            configs={configs}
            envCount={envCount}
            selectedId={selected?.id}
            onSelect={(id) => navigate(id ? `/previews/${id}` : "/previews")}
            onSettings={setSettingsFor}
            onEnableRepository={() => setWizardOpen(true)}
            canWrite={canWriteAnyProject}
          />

          {/* 16 left, 8 right — the rows' own inset, so the column headers and
              the context line above them share one left edge. */}
          <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto py-4 pl-4 pr-2">
            {selected && <RepositoryContextLine config={selected} />}

            {/* `blocking`: it has not failed, it will fail unless you deal with
                this first. Above the list, because it is about the whole list.

                **This is the only place the cap is reported now.** The context
                line used to carry `3 of 5 active` on its right, which spent a
                permanent slot on a number that matters on exactly one day — and
                on that day the banner says it, with what to do about it. */}
            {atCap && (
              <AlertBanner tone="blocking" title={capTitle}>
                {capMessage}
              </AlertBanner>
            )}

            {envsError ? (
              <EmptyState
                className="flex-1 gap-6"
                title="Previews could not be loaded"
                description={envsError}
                action={
                  <Button variant="outline" onClick={() => void refreshEnvs()}>
                    Try again
                  </Button>
                }
              />
            ) : envsLoading ? (
              <PreviewListSkeleton showRepository={!selected} />
            ) : inScope.length === 0 ? (
              /* Previews are ON — this is the state where the product is
                 working and there is simply nothing open. Say that, or the
                 screen reads as broken. */
              <EmptyState
                className="flex-1 gap-6"
                icon={<StackArchitectureGlyph />}
                title="No open pull requests"
                description={
                  selected
                    ? `Previews are on for this repository. The next pull request against ${selected.git_repository?.base_branch ?? "the base branch"} gets its own environment automatically.`
                    : "Previews are on. The next pull request against a base branch gets its own environment automatically."
                }
                action={newPreview("outline")}
              />
            ) : filtered.length === 0 ? (
              /* A filter that matched nothing is small and recoverable: the
                 small mark and a way back, never the first-run drawing. The
                 tools stay up — they are what got you here. */
              <EmptyState
                className="flex-1"
                icon={<SearchGlyph />}
                title="No previews match"
                description="Try a different search, or clear the filters."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              /* `mt-2` cancels `DataListHeader`'s own `-mt-2`. That negative
                 margin is calibrated for a column header sitting directly under
                 the sheet's 16px content inset — chrome sits tighter to the
                 band than content does — and here the inset is already spent on
                 the context line above it. Without this the two are 8 apart
                 instead of the board's 16, measured. */
              <div className="mt-2">
                <PreviewListHeader showRepository={!selected} />
                {filtered.map((env) => (
                  <PreviewRow
                    key={env.id}
                    env={env}
                    showRepository={!selected}
                    repositoryName={configName(env.config_id)}
                    onOpen={openPreview}
                    onSync={setSyncing}
                    canWrite={canWriteAnyProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <EnableRepoWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => {
          void refresh();
          void refreshEnvs();
        }}
      />
      {settingsFor && (
        <RepositorySettingsDrawer
          open
          onOpenChange={(o) => !o && setSettingsFor(null)}
          config={settingsFor}
          activeCount={activeEnvs(envs.filter((e) => e.config_id === settingsFor.id)).length}
          onSaved={(updated) => {
            setConfigs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSettingsFor(updated);
          }}
          onDeleted={() => {
            setSettingsFor(null);
            navigate("/previews");
            void refresh();
          }}
        />
      )}
      <NewPreviewEnvDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        configs={configs}
        initialConfigId={selected?.id}
        activeCountFor={(id) => activeEnvs(envs.filter((e) => e.config_id === id)).length}
        onCreated={() => void refreshEnvs()}
      />
      <PreviewDrawer
        env={viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        onSync={(env) => {
          setViewing(null);
          setSyncing(env);
        }}
        onDelete={(env) => {
          setViewing(null);
          void requestDeleteEnv(env);
        }}
        onOpenStack={(env) => navigate(`/stacks/${env.stack_id}`)}
        canWrite={canWriteAnyProject}
      />
      <SyncEnvDialog
        env={syncing}
        onOpenChange={(o) => !o && setSyncing(null)}
        onSynced={() => void refreshEnvs()}
      />
    </div>
  );
}
