import { useCallback, useEffect, useMemo, useState } from "react";
import { GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  AlertBanner,
  EmptyState,
  FieldShell,
  NoProviderGlyph,
  PickerList,
  PickerRow,
  PickerRowTick,
} from "@/components/branded";
import { SearchGlyph } from "@/components/branded/empty-state";
import { SearchField } from "@/components/branded/search-field";
import { StickyBar } from "@/pages/stacks/components/create/sticky-bar";
import { parsePublicRepoUrl } from "@/pages/stacks/components/create/selection";
import {
  listGitIntegrations,
  listRepositories,
  getRepository,
  type GitIntegration,
  type GitRepository,
} from "@/api/git-integrations";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { ConnectProviderDrawer } from "@/components/git-source-picker/connect-provider-drawer";
import {
  GIT_INTEGRATION_TYPE_GITHUB_APP,
  GIT_INTEGRATION_TYPE_CREDENTIALS,
} from "@/lib/git-integrations";
import { CredentialsDropdown, usableIntegrations } from "./credentials-dropdown";
import type { PickedRepo } from "./types";

/** "https://github.com/acme/api(.git)" → "acme/api" */
export function repoTail(url: string): string {
  const trimmed = url.replace(/\.git$/, "").replace(/\/+$/, "");
  return trimmed.split("/").slice(-2).join("/");
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

type Tab = "provider" | "url";

/**
 * The two sources, as peers.
 *
 * A public URL is not a fallback for when the provider list fails — people
 * reach for it deliberately — so neither label is abbreviated to make room for
 * the other, and neither is listed first because it is expected to win.
 *
 * `Provider`, not `Connected provider` — the same call create-stack made.
 * "Connected" reports a state rather than naming a source, and it reports it on
 * the segment you are already standing on: that a provider IS connected is what
 * the list underneath proves. Losing it also takes the track from 225 to ~162,
 * which is what lets the switch and the search share one row.
 */
const SOURCES = [
  { value: "provider" as const, label: "Provider", showLabel: true },
  { value: "url" as const, label: "Public URL", showLabel: true },
];

interface GitSourcePickerProps {
  value: PickedRepo | null;
  onChange: (repo: PickedRepo | null) => void;
  /**
   * Which source is showing, and the Public URL tab's text — both **controlled
   * by the caller**.
   *
   * They are not internal state because the caller needs them for its own
   * copy: the new-stack drawer's blocked-action list says "Paste the
   * repository's URL" on one tab and "Pick a repository from the list" on the
   * other, which it cannot phrase without knowing which tab you are on. Owning
   * them also survives an unmount — stepping forward to the service step and
   * back used to be the only way to lose a URL you had already typed.
   */
  mode: Tab;
  onModeChange: (mode: Tab) => void;
  url: string;
  onUrlChange: (url: string) => void;
  /** Shown under the Public URL tab (e.g. preview wizard's PR-automation note). */
  publicUrlHint?: string;
}

export function GitSourcePicker({
  value,
  onChange,
  mode,
  onModeChange,
  url,
  onUrlChange,
  publicUrlHint,
}: GitSourcePickerProps) {
  const [integrations, setIntegrations] = useState<GitIntegration[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [repos, setRepos] = useState<GitRepository[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Seeded from the value so a token-connection URL comes back with the rest
     of the step. Only ever rendered for a credentials integration, where the
     picked repo's clone URL IS what was typed here. */
  const [hostUrl, setHostUrl] = useState(() => value?.cloneUrl ?? "");

  const selected = integrations.find((i) => i.id === selectedId) ?? null;
  const hasGithubApp = integrations.some((i) => i.type === GIT_INTEGRATION_TYPE_GITHUB_APP);
  // GitHub App integrations carry an install URL once credentials exist; empty
  // search results link there so users can grant the app more repositories.
  const configureUrl = selected?.install_url;

  const loadIntegrations = useCallback(async () => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) return;
    try {
      const list = usableIntegrations((await listGitIntegrations(orgId)).items ?? []);
      setIntegrations(list);
      setSelectedId((current) => {
        if (current && list.some((i) => i.id === current)) return current;
        const app = list.find((i) => i.type === GIT_INTEGRATION_TYPE_GITHUB_APP);
        return app?.id ?? list[0]?.id ?? null;
      });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  // Repos load once per integration; the query filters them client-side.
  useEffect(() => {
    if (mode !== "provider" || selected?.type !== GIT_INTEGRATION_TYPE_GITHUB_APP) return;
    const orgId = getCurrentOrganizationId();
    if (!orgId || !selected.id) return;
    let cancelled = false;
    setSearching(true);
    listRepositories(orgId, selected.id!)
      .then((page) => {
        if (cancelled) return;
        setRepos(page.items ?? []);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, selected?.id, selected?.type]);

  const pickRepo = async (repo: GitRepository) => {
    const orgId = getCurrentOrganizationId();
    if (!orgId || !selected?.id || !repo.full_name) return;
    const [owner, name] = repo.full_name.split("/");
    try {
      const detail = await getRepository(orgId, selected.id, owner, name);
      onChange({
        fullName: detail.full_name ?? repo.full_name,
        cloneUrl: detail.clone_url ?? repo.clone_url ?? "",
        defaultBranch: detail.default_branch ?? "",
        integrationId: selected.id,
      });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const selectIntegration = (integration: GitIntegration) => {
    setSelectedId(integration.id ?? null);
    setHostUrl(integration.type === GIT_INTEGRATION_TYPE_CREDENTIALS ? `https://${integration.host}/` : "");
    setError(null);
    onChange(null);
  };

  const switchTab = (next: Tab) => {
    onModeChange(next);
    setError(null);
    onUrlChange("");
    setHostUrl(selected?.type === GIT_INTEGRATION_TYPE_CREDENTIALS ? `https://${selected.host}/` : "");
    onChange(null);
  };

  const emitHostUrl = (url: string, integration: GitIntegration) => {
    setHostUrl(url);
    const trimmed = url.trim();
    let host: string | null = null;
    let path = "";
    try {
      const parsed = new URL(trimmed);
      host = parsed.host.toLowerCase();
      path = parsed.pathname.replace(/^\/+|\/+$/g, "");
    } catch {
      host = null;
    }
    if (host === (integration.host ?? "").toLowerCase() && path.includes("/")) {
      onChange({
        fullName: repoTail(trimmed),
        cloneUrl: trimmed,
        defaultBranch: "",
        integrationId: integration.id ?? null,
      });
    } else {
      onChange(null);
    }
  };

  /**
   * **One reading of the URL, and it is create-stack's** — `parsePublicRepoUrl`.
   *
   * What it emits and what the row below shows are now the same derivation, so
   * `Continue` cannot go live on a string the next phase then fails to use. It
   * also tightened the gate: any non-empty text used to count as a repository,
   * so `abc` unblocked the button.
   */
  const emitPublicUrl = (next: string) => {
    onUrlChange(next);
    const parsed = parsePublicRepoUrl(next);
    onChange(
      parsed
        ? { fullName: parsed.fullName, cloneUrl: parsed.cloneUrl, defaultBranch: "main", integrationId: null }
        : null,
    );
  };

  const hostMismatch =
    selected?.type === GIT_INTEGRATION_TYPE_CREDENTIALS &&
    hostUrl.trim() !== "" &&
    hostOf(hostUrl.trim()) !== (selected.host ?? "").toLowerCase();

  const needle = query.trim().toLowerCase();
  const filteredRepos = needle
    ? repos.filter((r) => r.full_name?.toLowerCase().includes(needle))
    : repos;

  /**
   * What the pasted URL resolves to, or `null` while it is not yet a
   * repository. Parsed, not fetched — a public URL has no integration to look
   * it up through — and the SAME parse `onChange` emits.
   */
  const parsed = useMemo(() => parsePublicRepoUrl(url), [url]);

  /* `flex-none` on the row, `self-start` on its own — either way the control
     hugs its segments rather than being stretched by the flex parent (§11). */
  const modes = (className: string) => (
    <SegmentedControl
      options={SOURCES}
      value={mode}
      onValueChange={switchTab}
      aria-label="Where the repository lives"
      className={className}
    />
  );

  /**
   * **The switch and the search are one band on one row**, and the whole band
   * pins — the same control band create-stack's repository step uses. Both
   * filter the same list, so they are one control; and a search box that
   * scrolls away above a long list of repositories is a search box you cannot
   * reach.
   *
   * A `StickyBar` has to be the first thing in its column, or its negative top
   * margin paints over whatever is above it.
   */
  const band = (searchDisabled?: boolean) => (
    /* **One band, rendered in EVERY mode, so the switch never leaves the tree.**
       It used to live in two places — inside this bar for a provider, and alone
       above the field for a URL — which are two different positions in the React
       tree, so switching unmounted the control and mounted a new one. The
       travelling face was then a brand-new node arriving un-armed, and it
       could not animate because it had never been anywhere else.

       In `url` mode the row holds the switch and nothing else, which is the
       layout that branch already had: the switch keeps the row to itself,
       because the URL box is content, not a tool over content. */
    <StickyBar dissolve={mode !== "url"}>
      <div className="flex items-center gap-4">
        {modes("flex-none")}
        {mode !== "url" && (
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search repositories…"
            label="Search repositories"
            disabled={searchDisabled}
            className="min-w-0 flex-1"
          />
        )}
        {/* Only when there is a choice to make. With one connected provider the
            chip names something that could not have been anything else. */}
        {mode !== "url" && integrations.length > 1 && (
          <CredentialsDropdown
            integrations={integrations}
            selectedId={selectedId}
            onSelect={selectIntegration}
            onConnectNew={() => setConnectOpen(true)}
          />
        )}
      </div>
    </StickyBar>
  );

  // The band is the same control in every branch, so its one variable is
  // resolved here rather than at three call sites.
  const searchDisabled =
    loaded && integrations.length === 0
      ? true
      : selected?.type !== GIT_INTEGRATION_TYPE_GITHUB_APP;

  return (
    <div className="flex flex-col gap-4">
      {band(searchDisabled)}
      {mode === "url" ? (
        <div className="flex flex-col gap-4">
          {/* **The URL does NOT take the search field's slot.** That position is
              a toolbar position — a tool OVER the content below it. A search
              field filters the list under it; the URL box has nothing under it
              because it IS the content, so putting it there promises "this
              narrows what you see" and does not keep the promise.

              So the switch keeps the row to itself and the URL becomes what it
              actually is: a form field, with a label saying what it is and a
              hint saying what it costs. The hint is the sentence that used to
              float above the row as loose body copy. */}
          <FieldShell
            label="Repository URL"
            htmlFor="git-source-public-url"
            hint="Any public repository. A private one needs a connected provider."
          >
            {/* Mono: a URL is a machine value (§6). No leading glyph — the
                magnifier belongs to the thing that filters a list, and a globe
                beside a field already labelled "Repository URL" says it twice. */}
            <Input
              id="git-source-public-url"
              className="font-mono"
              placeholder="https://github.com/acme/web-api.git"
              value={url}
              onChange={(e) => emitPublicUrl(e.target.value)}
            />
          </FieldShell>

          {/**
           * **Both sources end on the same object.**
           *
           * Turning `https://github.com/acme/awwdits.git` into `acme/awwdits` is
           * a derivation, and without this the first place its result appeared
           * was the NEXT phase, in a name box you would then have to correct.
           * The same 56 `PickerRow` the provider list is made of, ticked — no
           * new component.
           */}
          {parsed && (
            <div className="flex flex-col gap-2">
              <p className="text-label text-fg-muted">This will build</p>
              <PickerRow
                icon={<GitBranch />}
                name={parsed.fullName}
                meta={[{ text: "public URL" }, { text: "main" }]}
                selected
                trailing={<PickerRowTick />}
              />
            </div>
          )}

          {/* **Under the repository, not above it.** `blocking` — it will fail
              unless you deal with it first — but what it is about is the thing
              you just picked: this repository will not get pull-request
              automation. Above the field it interrupted you before you had
              chosen anything, and pushed the row it is about below the fold.

              The banner puts the tone in the glyph and the ground and leaves the
              sentence in ink, rather than saying its severity twice in coloured
              body copy. */}
          {publicUrlHint && <AlertBanner tone="blocking">{publicUrlHint}</AlertBanner>}
        </div>
      ) : loaded && integrations.length === 0 ? (
        <>
          {/* **The band stays, with the search off.** It is the same source in a
              different state, not a different source, so the controls do not
              rearrange themselves — and §9 is satisfied because the reason sits
              directly under the dead field, in full, with the fix as a button. */}
          {/* The first thing a brand-new organisation can ever see here, so it
              gets the page-grade first-run treatment rather than a dashed box:
              the same severed-connection drawing New stack and the Previews page
              use, so one situation has one picture across the product.

              `outline`, not filled — connecting a provider is a detour, and the
              one fill on this surface belongs to the action that finishes it
              (§9). The description names the OTHER source, because it is a peer
              and this is exactly the moment someone needs telling they are not
              stuck. */}
          <EmptyState
            className="gap-6"
            icon={<NoProviderGlyph />}
            title="No git provider connected yet"
            description="Connect one and your repositories show up here. You can also add a repository by public URL."
            action={
              <Button variant="outline" onClick={() => setConnectOpen(true)}>
                <Plus />
                Connect provider
              </Button>
            }
          />
        </>
      ) : (
        <>
          {/* A token connection cannot list anything, so the search above it is
              off and the reason is the field's own hint directly beneath. */}

          {error && <p className="text-meta text-danger">{error}</p>}

          {selected?.type === GIT_INTEGRATION_TYPE_GITHUB_APP && (
            <>
              {searching && <p className="text-meta text-fg-muted px-2">Searching…</p>}
              {/* §11's list: no box around it, no rule between rows. What
                  separates one repository from the next is space and the hover
                  wash, and what marks the chosen one is the selection wash plus
                  a single tick. */}
              {filteredRepos.length > 0 ? (
                <PickerList aria-label="Repositories">
                  {filteredRepos.map((r) => {
                    const fullName = r.full_name ?? repoTail(r.clone_url ?? "");
                    const selectedRow = !!value?.cloneUrl && value.cloneUrl === (r.clone_url ?? "");
                    return (
                      <PickerRow
                        key={fullName}
                        icon={<GitBranch />}
                        name={fullName}
                        /* **Visibility, then branch.** It used to say `private`
                           or nothing at all, so a public repository carried no
                           second line and the row read as half-drawn. Whether it
                           is private is what tells you the pick depends on the
                           connected provider rather than on a URL anybody could
                           paste. */
                        meta={[
                          { text: r.private ? "private" : "public" },
                          { text: r.default_branch || "main" },
                        ]}
                        selected={selectedRow}
                        trailing={selectedRow ? <PickerRowTick /> : null}
                        onClick={() => void pickRepo(r)}
                      />
                    );
                  })}
                </PickerList>
              ) : (
                !searching && (
                  <EmptyState
                    icon={<SearchGlyph />}
                    title="No repository matches that"
                    description="Try a shorter word, or grant the app access to more repositories."
                    action={
                      configureUrl ? (
                        <Button variant="outline" asChild>
                          <a href={configureUrl} target="_blank" rel="noreferrer">
                            Configure in GitHub
                          </a>
                        </Button>
                      ) : undefined
                    }
                  />
                )
              )}
            </>
          )}

          {/* A token connection has no list to pick from, so the URL you paste
              IS the content — the same reasoning that gave the Public URL side
              its own labelled field rather than the toolbar slot. */}
          {selected?.type === GIT_INTEGRATION_TYPE_CREDENTIALS && (
            <FieldShell
              label="Repository URL"
              htmlFor="git-source-host-url"
              hint={`Repository listing isn't available for token connections. Paste a repository URL on ${selected.host}; clones use the stored credentials.`}
              error={
                hostMismatch
                  ? `URL must be on ${selected.host} to use this connection.`
                  : undefined
              }
            >
              <Input
                id="git-source-host-url"
                className="font-mono"
                placeholder={`https://${selected.host}/group/project`}
                value={hostUrl}
                onChange={(e) => emitHostUrl(e.target.value, selected)}
                aria-invalid={hostMismatch}
              />
            </FieldShell>
          )}
        </>
      )}

      <ConnectProviderDrawer
        open={connectOpen}
        onOpenChange={setConnectOpen}
        hasGithubApp={hasGithubApp}
        onCreated={() => void loadIntegrations()}
      />
    </div>
  );
}
