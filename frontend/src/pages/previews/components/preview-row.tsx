import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockedAction } from "@/components/branded";
import {
  DataListActions,
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import { StatusText } from "@/components/branded/status-text";
import { relativeAge, absoluteAge } from "@/components/branded/entity-card";
import { PREVIEW_PHASE, type PreviewStack, type PreviewPhase } from "@/api/preview-envs";

/**
 * One preview environment, as a row on the shared list primitive.
 *
 * **No new list component.** Eight pages already sit on `data-list.tsx` and this
 * is the ninth; the environment *card* it replaces was a second view of the same
 * facts, in a grid that could not be scanned down a column.
 *
 * ### The tracks
 *
 * | | Preview | Repository | URL | Status | Updated | actions |
 * |---|---|---|---|---|---|---|
 * | A repository is selected | **280** | — | slack | 92 | 66 | 64 |
 * | All previews | **240** | **120** | slack | 92 | 66 | 64 |
 *
 * `Status` and `Updated` land on the same x in both, so switching the rail
 * selection does not slide the two columns you were reading.
 *
 * **The name column is pinned and the URL takes the slack.** Re-cut the other
 * way round — slack on the name — and the void moves from after the URL to
 * after the branch rather than shrinking: measured on the board, the largest ink
 * gap went 247 → 188 that way and 247 → **179** this way.
 */
const PREVIEW_TRACKS = "grid-cols-[280px_minmax(0,1fr)_92px_66px_64px]";
const PREVIEW_REPO_TRACKS = "grid-cols-[240px_120px_minmax(0,1fr)_92px_66px_64px]";

const LABELS = ["Preview", "URL", "Status", "Updated", ""];
const REPO_LABELS = ["Preview", "Repository", "URL", "Status", "Updated", ""];

export function previewTracks(showRepository: boolean): string {
  return showRepository ? PREVIEW_REPO_TRACKS : PREVIEW_TRACKS;
}

/** The first URL the environment reports, with its scheme stripped — the host is
 *  what you compare down a column, and `https://` on every row is not a fact. */
export function previewUrl(env: PreviewStack): string | undefined {
  const url = env.status?.outputs?.urls?.find((u) => u.url)?.url;
  return url?.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/**
 * What the URL column says when there is no URL yet.
 *
 * **Never `fg-ghost`.** Ghost is the disabled tier and it measured **1.95:1** on
 * the sheet — this is live status text, so it takes `fg-muted` at 5.60:1 (§7).
 *
 * `no URL` rather than `—`: a dash withholds the answer in a column where the
 * row above it is reporting one.
 */
function urlPlaceholder(phase?: PreviewPhase): string {
  if (phase === PREVIEW_PHASE.provisioning || phase === PREVIEW_PHASE.deploying) return "building…";
  if (phase === PREVIEW_PHASE.deleting) return "tearing down…";
  return "no URL";
}

export function PreviewListHeader({ showRepository }: { showRepository: boolean }) {
  return (
    <DataListHeader
      columns={previewTracks(showRepository)}
      labels={showRepository ? REPO_LABELS : LABELS}
    />
  );
}

/** The real headers, then rows at the real 64px pitch — so the only thing that
 *  changes when the data lands is the text. */
export function PreviewListSkeleton({ showRepository }: { showRepository: boolean }) {
  return (
    <div>
      <PreviewListHeader showRepository={showRepository} />
      <DataListSkeleton
        columns={previewTracks(showRepository)}
        shape={[
          [
            { w: 68, h: 4 },
            { w: 148, h: 3 },
          ],
          ...(showRepository ? ([{ w: 96, h: 3 }] as const) : ([] as const)),
          { w: 196, h: 3 },
          { w: 56, h: 3 },
          { w: 44, h: 3 },
          null,
        ]}
      />
    </div>
  );
}

export function PreviewRow({
  env,
  repositoryName,
  showRepository,
  onOpen,
  onSync,
  onDelete,
  canWrite = true,
}: {
  env: PreviewStack;
  /** The repository this environment belongs to. Rendered only when the list is
   *  showing more than one, so the column is never a value repeated N times. */
  repositoryName?: string;
  showRepository: boolean;
  onOpen: (env: PreviewStack) => void;
  onSync: (env: PreviewStack) => void;
  onDelete: (env: PreviewStack) => void;
  canWrite?: boolean;
}) {
  const phase = env.status?.phase;
  const url = previewUrl(env);
  const when = env.updated_at || env.created_at;
  // The one moment the user most needs telling the thing is already on its way
  // out (§11). A row action that refuses in silence is the failure this rule
  // was written for.
  const teardownReason = phase === PREVIEW_PHASE.deleting ? "This environment is being deleted" : null;
  const label = `PR #${env.pr_number}`;

  return (
    <DataListRow
      columns={previewTracks(showRepository)}
      label={`${label} preview`}
      onActivate={() => onOpen(env)}
    >
      <DataListName name={label} secondary={env.branch} />
      {showRepository && (
        /* `fg-2`, not `fg-muted` — §7 puts a sibling object's name in the tier
           you read, and this one identifies a different repository on every
           row. It is furniture only when it is the same word all the way down,
           which is exactly when the column is not rendered. */
        <DataListCell className="text-fg-2" title={repositoryName}>
          {repositoryName}
        </DataListCell>
      )}
      <DataListCell mono className={url ? "text-fg-2" : undefined} title={url}>
        {url ?? urlPlaceholder(phase)}
      </DataListCell>
      {/* `StatusText`, never `StatusPill`: the word, its colour AND its glyph
          are all derived from the phase, so a green "Failed" is unbuildable
          rather than merely discouraged. The glyph is per STATE — the board drew
          a per-family dot, which repeats the colour and adds no fact (§7); this
          is the same treatment the Stacks row beside it already ships. */}
      <div className="min-w-0">
        <StatusText domain="preview" state={phase} icon />
      </div>
      {/* Tabular, because the number changes under the reader as it polls. */}
      <DataListCell numeric title={absoluteAge(when) ?? undefined}>
        {relativeAge(when)}
      </DataListCell>
      {/* `DataListActions` and never a hand-rolled copy — the primitive is what
          answers `focus-within` on the ROW, so a keyboard user reaches these on
          the same tab as everywhere else in the product (§11). */}
      <DataListActions>
        {canWrite && (
          <>
            <BlockedAction reason={teardownReason}>
              <Button
                variant="ghost"
                size="icon-sm"
                shape="flat"
                aria-label={`Sync ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSync(env);
                }}
              >
                <RefreshCw />
              </Button>
            </BlockedAction>
            {/* `ghost`, not `destructive`. A red trash on every hovered row
                makes deletion the loudest thing on the page; the escalation
                belongs to the confirm that follows (§11). */}
            <BlockedAction reason={teardownReason}>
              <Button
                variant="ghost"
                size="icon-sm"
                shape="flat"
                aria-label={`Delete ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(env);
                }}
              >
                <Trash2 />
              </Button>
            </BlockedAction>
          </>
        )}
      </DataListActions>
    </DataListRow>
  );
}
