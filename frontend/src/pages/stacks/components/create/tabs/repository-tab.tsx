import { useCallback, useEffect, useMemo, useState } from "react"
import { GitBranch } from "lucide-react"


import { EmptyState, FieldShell, NoProviderGlyph, PickerList, PickerRow, PickerRowTick, SearchGlyph } from "@/components/branded"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { getErrorMessage } from "@/api/client"
import { listGitIntegrations, listRepositories, type GitRepository } from "@/api/git-integrations"
import { usableIntegrations } from "@/components/git-source-picker/credentials-dropdown"
import { repoTail } from "@/components/git-source-picker/git-source-picker"
import type { PickedRepo } from "@/components/git-source-picker/types"
import { getCurrentOrganizationId } from "@/lib/common"

import { parsePublicRepoUrl } from "../selection"
import { SearchField } from "../search-field"
import { StickyBar } from "../sticky-bar"

type Mode = "provider" | "url"

/**
 * `Provider`, not `Connected provider`.
 *
 * The two segments now share the same shape — one word for where the code
 * lives, then how you name it. "Connected" was reporting a state rather than
 * naming a source, and it was doing it on the segment you are already on: the
 * fact that a provider IS connected is what the list underneath proves. Losing
 * it also buys back ~60px, which is what lets the switch and the search share
 * one row (board `564:6733`).
 */
const MODES = [
  { value: "provider" as const, label: "Provider", showLabel: true },
  { value: "url" as const, label: "Public URL", showLabel: true },
]

/**
 * Your own code — either from a provider this organisation has connected, or
 * from any public URL.
 *
 * **Nothing here asks for a branch, a port or a Dockerfile path.** Those belong
 * to a resource, and a resource is edited in the node inspector on the canvas.
 * Asking for them before the stack exists made a five-field form out of a
 * decision that is really just "which repository".
 */
export function RepositoryTab({
  mode,
  onModeChange,
  repo,
  onRepoChange,
  url,
  onUrlChange,
}: {
  mode: Mode
  onModeChange: (mode: Mode) => void
  repo: PickedRepo | null
  onRepoChange: (repo: PickedRepo | null) => void
  url: string
  onUrlChange: (url: string) => void
}) {
  const [integrationId, setIntegrationId] = useState<string | null>(null)
  const [hasProvider, setHasProvider] = useState<boolean | null>(null)
  const [repos, setRepos] = useState<GitRepository[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")

  const loadIntegrations = useCallback(async () => {
    const orgId = getCurrentOrganizationId()
    if (!orgId) return
    try {
      const list = usableIntegrations((await listGitIntegrations(orgId)).items ?? [])
      setHasProvider(list.length > 0)
      setIntegrationId(list[0]?.id ?? null)
    } catch (e) {
      setError(getErrorMessage(e))
      setHasProvider(false)
    }
  }, [])

  useEffect(() => {
    void loadIntegrations()
  }, [loadIntegrations])

  useEffect(() => {
    const orgId = getCurrentOrganizationId()
    if (!orgId || !integrationId) return
    let live = true
    setLoading(true)
    listRepositories(orgId, integrationId)
      .then((page) => live && setRepos(page.items ?? []))
      .catch((e) => live && setError(getErrorMessage(e)))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [integrationId])

  // What the typed URL resolves to, or null while it is still half-typed. The
  // SAME reading the commit uses, so the row cannot promise a name the seed
  // does not carry.
  const parsed = useMemo(() => parsePublicRepoUrl(url), [url])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return repos.filter((r) => !q || (r.full_name ?? "").toLowerCase().includes(q))
  }, [repos, query])

  /* `self-start`/`flex-none`, or the flex parent stretches the track to 620px
     and the control stops reading as a control (§11 — it hugs its segments). */
  const modes = (className: string) => (
    <SegmentedControl
      options={MODES}
      value={mode}
      onValueChange={onModeChange}
      aria-label="Where the code lives"
      className={className}
    />
  )

  /**
   * **The switch and the search are one band on one row** (board `564:6733`).
   *
   * They shipped stacked, because on the 620px page this flow used to be there
   * was no room: with a 240 rail the left column was 340, and 162 for the
   * segmented control plus a gap left 170 for a field that needs 277 — shared,
   * the search collapsed to an icon-only square. Two things changed. The
   * repository step has **no rail**, so the band gets the drawer's full 600, and
   * `Connected provider` became `Provider`, which takes the track to ~104. That
   * leaves 480 for the field, well over its floor.
   *
   * One row is the right shape because they are one control: both filter the
   * same list, and stacking them read as two decisions in sequence.
   *
   * The WHOLE band pins — and a sticky bar has to be the first thing in its
   * column, or its negative top margin paints over whatever is above it.
   */
  const band = (searchDisabled?: boolean) => (
    <StickyBar>
      <div className="flex items-center gap-4">
        {modes("flex-none")}
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search repositories…"
          label="Search repositories"
          disabled={searchDisabled}
          className="min-w-0 flex-1"
        />
      </div>
    </StickyBar>
  )

  return (
    <div className="flex flex-col gap-4">
      {mode === "url" ? (
        <div className="flex flex-col gap-4">
          {/* **The URL does NOT take the search field's slot** (board
              `597:6952`, option B).

              It did for a while, on the reasoning that a segmented control
              exists precisely to change what the box beside it means. The
              reasoning is right about segmented controls and wrong about this
              slot: **that position is a toolbar position — a tool OVER the
              content below it.** A search field filters the list under it. The
              URL box has nothing under it; it IS the content. Putting it there
              promises "this narrows what you see" and then does not keep the
              promise, and it leaves the whole body empty beneath.

              So the switch keeps the row to itself and the URL becomes what it
              actually is: a form field, with a label saying what it is and a
              hint saying what it costs. */}
          {modes("self-start")}
          <FieldShell
            label="Repository URL"
            htmlFor="repo-url"
            hint="Any public repository. A private one needs a connected provider."
          >
            {/* Mono: a URL is a machine value (§6). No leading glyph — the
                magnifier belongs to the thing that filters a list. */}
            <Input
              id="repo-url"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              placeholder="https://github.com/acme/web-api.git"
              className="font-mono"
            />
          </FieldShell>

          {/**
           * **What we read out of that URL** (board `597:6952`, option C).
           *
           * The URL side had a labelled field and then 500px of nothing, which
           * made it visibly the smaller of two paths §14 calls peers. This is
           * what belongs in that space — and it is not decoration:
           *
           * You type `https://github.com/acme/awwdits.git` and we build
           * `acme/awwdits`. That derivation is a guess about your URL, and
           * until now the first time you saw its result was the NEXT step, in
           * a service-name box you would then have to correct.
           *
           * It is the same 56 row the provider list is made of, ticked — so
           * both paths end on the same object, seen the same way, before you
           * continue. No new component: `PickerRow` with `selected`.
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
        </div>
      ) : hasProvider === false ? (
        <>
          {/* **The band stays, with the search off** (board `564:6845`). It is
              the same tab in a different state, not a different tab, so the
              controls do not rearrange themselves — and §9 is satisfied because
              the reason sits directly under the dead field, in full, with the
              fix as a button. */}
          {band(true)}
          {/* A brand-new organisation has connected nothing, so the first thing
              this tab can ever show is this — not an empty list. */}
          <EmptyState
            icon={<NoProviderGlyph />}
            className="gap-6"
            title="No git provider connected yet"
            description="Connect one and your repositories show up here. You can also paste a public URL instead."
            action={
              /* `outline`, not filled: the page's one fill is `Create stack`
                 (§9), and this is not it — it is a detour to another page and
                 back. `flat`, not a pill: connecting a provider is work, not the
                 commitment that ends the flow. */
              <Button variant="outline" asChild>
                <a href="/git-integrations">Connect provider</a>
              </Button>
            }
          />
        </>
      ) : (
        <>
          {band()}
          {error ? (
            <EmptyState title="Those repositories could not be loaded" description={error} />
          ) : loading && repos.length === 0 ? (
            <p className="text-meta text-fg-muted px-2 py-6">Loading your repositories…</p>
          ) : matches.length === 0 ? (
            <EmptyState
              icon={<SearchGlyph />}
              title="No repository matches that"
              description="Try a shorter word, or paste a public URL instead."
            />
          ) : (
            <PickerList aria-label="Repositories">
              {matches.map((r) => {
                const fullName = r.full_name ?? repoTail(r.clone_url ?? "")
                const selected = repo?.fullName === fullName
                return (
                  <PickerRow
                    key={fullName}
                    icon={<GitBranch />}
                    name={fullName}
                    /* **Visibility, then branch — and no timestamp** (board
                       `564:6733`). "updated 3 days ago" is the one fact on the
                       row that cannot change what you pick: you are choosing
                       which repository to build, not which is freshest, and a
                       stale one is still the right one if it is the one you
                       want. Whether it is private is what tells you the pick
                       depends on the connected provider rather than on a URL
                       anybody could paste. */
                    meta={[
                      { text: r.private ? "private" : "public" },
                      { text: r.default_branch || "main" },
                    ]}
                    selected={selected}
                    trailing={selected ? <PickerRowTick /> : null}
                    onClick={() =>
                      onRepoChange({
                        fullName,
                        cloneUrl: r.clone_url ?? "",
                        defaultBranch: r.default_branch ?? "",
                        integrationId,
                      })
                    }
                  />
                )
              })}
            </PickerList>
          )}
        </>
      )}
    </div>
  )
}
