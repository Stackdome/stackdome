import { Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { getStacksByOrg } from "@/api/stacks";
// **`deleteStack` is not imported here, and that is deliberate.** main deleted
// a stack from a row menu on this page; the row-actions sweep took menus off
// every list, and deleting a stack moved to the editor's ⋮ — a danger zone in a
// popover, where §10 says an act that lands on every service, volume and
// preview built from the stack belongs. The list opens a stack; the stack's own
// screen is where you destroy it.
import { buildHelloStackSeed } from "@/pages/stacks/lib/onboarding/hello-stack-seed";
import {
  startCanvasStage,
  isTourDone,
  markTourDone,
} from "@/pages/stacks/lib/onboarding/tour";
import { WelcomeDialog } from "@/pages/stacks/components/onboarding/welcome-dialog";
import { SearchField } from "@/components/branded/search-field";
import { useResourceProjects } from "@/hooks/use-resource-projects";
import { useStacks } from "@/pages/stacks/contexts/stack-context";
import { getCurrentOrganizationId } from "@/lib/common";
import { getErrorMessage } from "@/api/client";
import {
  DropdownMenu,
  DropdownMenuChevron,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, EmptyState, CloudAlphaBanner } from "@/components/branded";
import {
  SearchGlyph,
  StackArchitectureGlyph,
} from "@/components/branded/empty-state";
import { ViewToggle, useViewMode } from "@/components/branded/view-toggle";
// `StackCreateWizard` is not imported: this branch replaced the wizard with the
// New stack drawer, and its files are gone.
import type { Stack } from "@/api/stack-types";
import {
  DeployStackCard,
  StackCardSkeleton,
  STACK_CARD_GRID,
} from "./stack-card";
import { DeployStackRow, StackRowHeader, StackRowSkeleton } from "./stack-row";
import { needsAttention, stackRollupState } from "./status";
import { usePreviewEnvs } from "@/hooks/use-preview-envs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { NEW_STACK_PATH, STACK_DRAFT_PATH } from "@/pages/stacks/lib/routes";
import { NewStackDrawer } from "@/pages/stacks/components/create/new-stack-drawer";

type SortKey = "attention" | "updated" | "created" | "name";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "attention", label: "Needs attention" },
  { key: "updated", label: "Recently updated" },
  { key: "created", label: "Recently created" },
  { key: "name", label: "Name (A–Z)" },
];

const ALL_STATUSES = "all";

/** Display order for the status filter — the exact words StatusText renders,
 *  healthiest first. Unknown words from the data sort last, alphabetically. */
const STATUS_ORDER = [
  "Healthy",
  "Deploying",
  "Degraded",
  "Unavailable",
  "Failed",
  "NotDeployed",
  "Deleting",
];

function statusRank(state: string): number {
  const i = STATUS_ORDER.indexOf(state);
  return i === -1 ? STATUS_ORDER.length : i;
}

/** The rollup states, in the same words the rows show. `NotDeployed` is one
 *  token on the wire and two words on screen; the filter menu shows the latter
 *  and matches on the former. */
function statusLabel(state: string): string {
  return state.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export default function StacksPage() {
  const { stacks, setStacks } = useStacks();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [query, setQuery] = useState("");
  // Failures first by default: on the page this replaces, the one row that
  // needed a human was fourth.
  const [sortKey, setSortKey] = useState<SortKey>("attention");
  const [view, setView] = useViewMode("stacks");
  const { canWriteAnyProject } = useCurrentUser();
  const { projectNameById } = useResourceProjects();
  const [searchParams] = useSearchParams();

  const { envs, loading: envsLoading } = usePreviewEnvs();

  useEffect(() => {
    const currentOrgId = getCurrentOrganizationId();

    if (currentOrgId) {
      const fetchStacks = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await getStacksByOrg(currentOrgId);
          setStacks(data.items || []);
        } catch (err) {
          console.error("Failed to fetch stacks:", err);
          setError(getErrorMessage(err));
        }
        setIsLoading(false);
      };

      fetchStacks();
    } else {
      setError("Organization ID not found. Unable to load stacks.");
      setIsLoading(false);
    }
  }, [setStacks]);

  // The demo exposes a public port, and the org's own domain list has no
  // bearing on whether that is allowed: the backend waives the requirement
  // whenever a platform base domain is configured. Cloud configures one and
  // adds the domain internally, so a Cloud org's list is empty by design.
  //
  // A self-hosted install with neither a base domain nor an org domain is the
  // one case left where the tour is offered and Deploy then fails validation
  // with "organisation has no domain configured". Gating that needs the base
  // domain exposed on /api/v1/config, which the frontend cannot see today.
  const navigate = useNavigate();

  // **The URL is what opens the drawer**, not a piece of component state.
  // `/stacks/new` is still a linkable address for the journey even though a
  // drawer is not a page: the list renders behind it, which is exactly the
  // readable-background §13 chose a drawer for. Closing returns to `/stacks`,
  // so the exit and the browser's back button do the same thing.
  const atNewStack = useLocation().pathname === NEW_STACK_PATH;

  const tourOffered = useRef(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  useEffect(() => {
    if (isLoading || error || stacks.length > 0 || tourOffered.current) return;
    if (!canWriteAnyProject || isTourDone()) return;
    tourOffered.current = true;
    setWelcomeOpen(true);
  }, [isLoading, error, stacks, canWriteAnyProject]);

  const acceptTour = () => {
    setWelcomeOpen(false);
    startCanvasStage();
    navigate(STACK_DRAFT_PATH, { state: { seed: buildHelloStackSeed() } });
  };

  const closeTour = () => setWelcomeOpen(false);

  const optOutTour = () => {
    markTourDone();
    setWelcomeOpen(false);
  };

  // Stacks created by preview environments are shown on the Previews page only.
  const previewStackIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of envs) if (e.stack_id) s.add(e.stack_id);
    return s;
  }, [envs]);

  const deployedStacks = useMemo(
    () => stacks.filter((s) => !s.id || !previewStackIds.has(s.id)),
    [stacks, previewStackIds],
  );

  // Every rollup state with its count (0 when absent), healthiest first — drives
  // the Status filter. Unknown states from the data still surface, appended
  // after the known set.
  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of deployedStacks) {
      const state = stackRollupState(s);
      counts.set(state, (counts.get(state) ?? 0) + 1);
    }
    const states = [...new Set([...STATUS_ORDER, ...counts.keys()])];
    return states
      .map((state) => ({ state, count: counts.get(state) ?? 0 }))
      .sort(
        (a, b) =>
          statusRank(a.state) - statusRank(b.state) ||
          a.state.localeCompare(b.state),
      );
  }, [deployedStacks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = deployedStacks.filter((s) => {
      if (statusFilter !== ALL_STATUSES && stackRollupState(s) !== statusFilter)
        return false;
      if (q && !s.name?.toLowerCase().includes(q)) return false;
      return true;
    });

    const recency = (s: Stack, key: SortKey) =>
      key === "created"
        ? new Date(s.created_at || 0).getTime()
        : new Date(s.updated_at || s.created_at || 0).getTime();

    return [...out].sort((a, b) => {
      if (sortKey === "name") return (a.name || "").localeCompare(b.name || "");
      // Failures first, then most recently touched within each group — a broken
      // stack nobody has poked in a week still outranks a healthy deploy from
      // this morning.
      if (sortKey === "attention") {
        const rank = Number(needsAttention(b)) - Number(needsAttention(a));
        if (rank !== 0) return rank;
        return recency(b, "updated") - recency(a, "updated");
      }
      return recency(b, sortKey) - recency(a, sortKey);
    });
  }, [deployedStacks, statusFilter, query, sortKey]);

  // Old previews-tab links redirect to the dedicated /previews page.
  if (searchParams.get("view") === "previews") {
    return <Navigate to="/previews" replace />;
  }

  // Wait for the preview-env list too: rendering before the exclusion set
  // arrives flashes preview-created stacks in the deployed grid.
  const loading = isLoading || envsLoading;
  const sortLabel =
    SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Sort";

  // §12a — the section's tools live in the header's second row, not in the page
  // body. Rendered in every state including loading: they do not depend on the
  // data, and the old centred spinner threw the whole layout away and then
  // threw it back.
  const toolbar = error ? undefined : (
    <>
      <SearchField
        className="w-[300px]"
        value={query}
        onChange={setQuery}
        placeholder="Filter stacks…"
        label="Filter stacks"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Filters are working controls: `flat`, never a pill (§9). */}
          <Button variant="outline" shape="flat">
            <span className="text-fg-2">Status:</span>{" "}
            <span>
              {statusFilter === ALL_STATUSES
                ? "All"
                : statusLabel(statusFilter)}
            </span>
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
              statusFilter === ALL_STATUSES && "font-semibold text-foreground",
            )}
          >
            <span>All</span>
            <span className="tabular-nums text-fg-2">
              {deployedStacks.length}
            </span>
          </DropdownMenuItem>
          {statusOptions.map((o) => (
            <DropdownMenuItem
              key={o.state}
              onSelect={() => setStatusFilter(o.state)}
              className={cn(
                "justify-between text-body",
                statusFilter === o.state && "font-semibold text-foreground",
              )}
            >
              <span>{statusLabel(o.state)}</span>
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
              className={cn(
                "text-body",
                sortKey === o.key && "font-semibold text-foreground",
              )}
            >
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* §11 — content toolbar, right side, last: after the filters, before
          nothing. */}
      <div className="ml-auto">
        <ViewToggle value={view} onValueChange={setView} />
      </div>
    </>
  );

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Kept from main at the merge: the hosted-alpha notice. Its own padding
          comes from the page below it — this branch's shell owns the frame's
          insets, so main's `p-8 space-y-6` on the container is not carried. */}
      <CloudAlphaBanner />
      <PageHeader
        actions={
          canWriteAnyProject ? (
            <Button onClick={() => navigate(NEW_STACK_PATH)}>
              <Plus />
              New stack
            </Button>
          ) : undefined
        }
        toolbar={toolbar}
      />

      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-danger mb-4" />
          <h2 className="text-head font-semibold mb-2">
            Stacks could not be loaded
          </h2>
          <p className="text-fg-2 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      ) : loading ? (
        /* §15 loading — the header and toolbar are already on screen because
           they do not depend on the data. Six rows at the real pitch means
           nothing moves when it lands. */
        view === "list" ? (
          <>
            <StackRowHeader />
            <StackRowSkeleton />
          </>
        ) : (
          <StackCardSkeleton />
        )
      ) : deployedStacks.length === 0 ? (
        /* First run. This is the only screen in the product that gets to
           define its core noun, so it does — and it earns the decorated
           glyph because it is the first thing a new user ever sees. `gap-6`
           because the bigger illustration wants more air than a 34px lens. */
        <EmptyState
          className="flex-1 gap-6"
          icon={<StackArchitectureGlyph />}
          title="No stacks yet"
          description="A stack is your app and everything it needs to run: services, databases and domains, deployed together from a Git branch."
          action={
            /* `outline`, not filled. The header already carries `+ New stack`
               as the page's one fill (§9), and this is the same action — two
               identical filled buttons on one screen is the duplication §7's
               "say it once" bans, in button form. The empty state repeats the
               offer where the user is looking; it does not compete for it. */
            canWriteAnyProject ? (
              <Button
                variant="outline"
                onClick={() => navigate(NEW_STACK_PATH)}
              >
                <Plus />
                New stack
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {filtered.length === 0 ? (
            /* A filter that matched nothing is small and recoverable, so it
               gets a small mark and a way back — never the first-run glyph. */
            <EmptyState
              className="flex-1"
              icon={<SearchGlyph />}
              title="No stacks match"
              description="Try a different search, or clear the filters."
              action={
                /* `outline`, not `secondary`. The board's secondary TONE is a
                   control fill plus a hairline; code's `secondary` variant
                   dropped the hairline on purpose, so it renders as an edgeless
                   blob on the sheet. `outline` is the variant that matches. */
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter(ALL_STATUSES);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : view === "list" ? (
            /* Hairlines, not cards: separation is a 1px rule, and the list is
               not boxed either — the rows and the sheet edge are the only
               boundaries there are (§7). */
            <div>
              <StackRowHeader />
              {filtered.map((stack) => (
                <DeployStackRow
                  key={stack.id || stack.name}
                  stack={stack}
                  projectName={projectNameById(stack.project_id)}
                />
              ))}
            </div>
          ) : (
            /* Same rows, same filters, same sort — a card view that quietly
               drops a fact is a different page wearing the same name (§11). */
            <div className={STACK_CARD_GRID}>
              {filtered.map((stack) => (
                <DeployStackCard
                  key={stack.id || stack.name}
                  stack={stack}
                  projectName={projectNameById(stack.project_id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <WelcomeDialog
        open={welcomeOpen}
        onTakeTour={acceptTour}
        onClose={closeTour}
        onOptOut={optOutTour}
      />

      {/* The New stack journey. Closing it goes back to the list rather than
          just hiding the drawer, so the ✕, Cancel, Escape and the browser's
          back button all land in the same place. */}
      <NewStackDrawer
        open={atNewStack}
        onOpenChange={(open) => {
          if (!open) navigate("/stacks");
        }}
      />
    </div>
  );
}
