import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusText } from "@/components/branded/status-text";
import {
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import { cn } from "@/lib/utils";
import {
  listInstallations,
  type GitIntegration,
  type GitInstallation,
} from "@/api/git-integrations";
import { getCurrentOrganizationId } from "@/lib/common";
import {
  deriveRow,
  providerIdFor,
  GIT_INTEGRATION_TYPE_GITHUB_APP,
  PROVIDER_DISPLAY_NAMES,
  type RowViewModel,
} from "@/lib/git-integrations";

/**
 * The Stacks list's track shape: the name is capped, one track takes the slack,
 * the rest are pinned. `Access` is the flexible one — it carries a sentence
 * ("all repositories", "4 of 12 selected") and extra width buys one that
 * finishes instead of one that truncates.
 *
 * The 40px bordered provider tile is gone: it was a card inside a list, and the
 * logo drew no distinction the provider name did not already make one line
 * above the host.
 *
 * **Four tracks, because the row has no actions.** It carried a trailing 32 for
 * a kebab holding `Verify`, `Update credentials`, `Manage on GitHub` and
 * `Remove` — four acts you had to open a menu to discover. The row opens the
 * provider's drawer and all four live there, in the open. Removing an action
 * means removing its track, its header label and its skeleton shape.
 */
const INTEGRATION_TRACKS = "grid-cols-[minmax(240px,420px)_150px_minmax(0,1fr)_150px]";

const LABELS = ["Provider", "Auth", "Access", "Status"];

export function IntegrationListHeader() {
  return <DataListHeader columns={INTEGRATION_TRACKS} labels={LABELS} />;
}

/**
 * The real column headers, then six rows at the real 64px pitch — so the only
 * thing that changes when the data lands is the text.
 */
export function IntegrationListSkeleton() {
  return (
    <div>
      <IntegrationListHeader />
      <DataListSkeleton
        columns={INTEGRATION_TRACKS}
        shape={[
          [
            { w: 112, h: 4 },
            { w: 152, h: 3 },
          ],
          { w: 88, h: 3 },
          { w: 160, h: 3 },
          { w: 80, h: 3 },
        ]}
      />
    </div>
  );
}

/**
 * Why the row needs attention, and what to do about it.
 *
 * **It is a sub-row, not a cell.** It spans the row's full width because the
 * sentence is about the whole integration rather than about one column, and it
 * sits under the row it belongs to so the pairing is positional rather than
 * remembered. A row with a banner is visibly taller — that is the point.
 */
function Banner({
  banner,
  statusKey,
  onVerify,
  onUpdateCredentials,
}: {
  banner: NonNullable<RowViewModel["banner"]>;
  statusKey: RowViewModel["statusKey"];
  onVerify: () => void;
  onUpdateCredentials?: () => void;
}) {
  const Icon = statusKey === "action_needed" ? CircleAlert : TriangleAlert;
  const toneClasses =
    statusKey === "action_needed"
      ? "border-danger-border bg-danger-bg text-danger"
      : "border-warn-border bg-warn-bg text-warn";

  return (
    <div className={cn("flex items-center gap-2 border-y px-2 py-2 text-meta", toneClasses)}>
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1 text-foreground/80">{banner.message}</span>
      {statusKey === "needs_setup" ? (
        banner.ctaHref ? (
          <a
            href={banner.ctaHref}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap font-medium text-foreground underline-offset-2 hover:underline"
          >
            {banner.ctaLabel}
          </a>
        ) : (
          <Button variant="outline" disabled>
            {banner.ctaLabel}
          </Button>
        )
      ) : statusKey === "action_needed" ? (
        // github_app rows can't be PUT-updated: message without a CTA.
        onUpdateCredentials && (
          <Button variant="outline" onClick={onUpdateCredentials}>
            {banner.ctaLabel}
          </Button>
        )
      ) : (
        <Button variant="outline" onClick={onVerify}>
          {banner.ctaLabel}
        </Button>
      )}
    </div>
  );
}

export function IntegrationRow({
  integration,
  onOpen,
  onVerify,
}: {
  integration: GitIntegration;
  /** The row's one act: open this provider's drawer. */
  onOpen: (integration: GitIntegration) => void;
  /** The banner's `Verify access` CTA. Verifying is a CHECK, not an edit, so it
   *  runs its own dialog rather than routing through the drawer. */
  onVerify: (integration: GitIntegration) => void;
}) {
  const [installations, setInstallations] = useState<GitInstallation[]>([]);
  const requestSeq = useRef(0);

  const isGithubApp = integration.type === GIT_INTEGRATION_TYPE_GITHUB_APP;

  const load = useCallback(async () => {
    // Only GitHub App integrations have installations; a credentials row would
    // burn a GitHub refresh call for an always-empty list.
    if (!isGithubApp) return;
    const orgId = getCurrentOrganizationId();
    if (!orgId || !integration.id) return;
    const seq = ++requestSeq.current;
    try {
      // refresh=true re-lists installations from GitHub, so state lost to a
      // missed webhook (backend downtime, local dev without a public URL)
      // self-heals on every page visit — no manual sync action needed.
      const list = await listInstallations(orgId, integration.id, true);
      if (seq === requestSeq.current) setInstallations(list.items ?? []);
    } catch {
      // Row keeps its last-known installations on failure; reload retries.
    }
  }, [integration.id, isGithubApp]);

  useEffect(() => {
    void load();
  }, [load]);

  const row = deriveRow(integration, installations);
  const providerName = PROVIDER_DISPLAY_NAMES[providerIdFor(integration)];

  return (
    <div>
      <DataListRow
        columns={INTEGRATION_TRACKS}
        label={`${providerName} at ${row.host}`}
        onActivate={() => onOpen(integration)}
      >
        <DataListName name={providerName} secondary={row.host} />
        <DataListCell>{row.authLabel}</DataListCell>
        {/* The count, then what it covers. They used to sit at opposite ends of
            a flex row, which is why they need a separator now that they are
            adjacent: "0 installations selected repositories" reads as one
            broken phrase. */}
        <DataListCell title={[row.access.label, row.access.hint].filter(Boolean).join(" · ")}>
          {row.access.label}
          {row.access.hint && (
            <>
              <span className="mx-1.5 text-fg-2">·</span>
              <span className="font-mono">{row.access.hint}</span>
            </>
          )}
        </DataListCell>
        {/* Status is said ONCE, as a word, with the glyph for its state — the
            same component and the same treatment as the Stacks row. Never a
            bordered chip: the word and its colour already carry it. */}
        <div className="min-w-0">
          <StatusText domain="git_integration" state={row.statusKey} icon />
        </div>
      </DataListRow>

      {row.banner && (
        <Banner
          banner={row.banner}
          statusKey={row.statusKey}
          onVerify={() => onVerify(integration)}
          onUpdateCredentials={isGithubApp ? undefined : () => onOpen(integration)}
        />
      )}
    </div>
  );
}
