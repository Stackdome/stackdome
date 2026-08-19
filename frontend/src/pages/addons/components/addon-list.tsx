import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { StatusText } from "@/components/branded/status-text";
import {
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { PostgresAddon } from "@/api/addons";

/**
 * The same track shape as the Stacks list: **the name is capped, `Status` takes
 * the slack, and everything after it is pinned.**
 *
 * `Status` is the flexible one for the same reason it is there — the reason line
 * lives in it, and extra width buys a sentence that finishes rather than one
 * that truncates.
 *
 * **Six tracks, down from eight columns.** `Type` said `postgres` on every row,
 * and `Backups` said "backups on" or "backups off" — a column whose value never
 * varies is not reporting, it is repeating, and one whose value is a word rather
 * than a fact belongs on the addon's own page. The type ICON went with the
 * column, for the same reason: a glyph earns its place by making a distinction
 * the word cannot, and with one addon type there is no distinction to make. Both
 * come back the day a second type ships.
 */
const ADDON_TRACKS = "grid-cols-[minmax(240px,420px)_minmax(0,1fr)_90px_90px_130px_32px]";

const LABELS = ["Name", "Status", "Version", "Size", "Created", ""];

function addonPath(a: PostgresAddon): string {
  return `/addons/postgres/${a.id}`;
}

function createdLabel(a: PostgresAddon): string {
  if (!a.created_at) return "—";
  return formatDistanceToNow(new Date(a.created_at), { addSuffix: true }).replace(/^about\s/, "");
}

export function AddonListHeader() {
  return <DataListHeader columns={ADDON_TRACKS} labels={LABELS} />;
}

/**
 * The real column headers, then six rows at the real 64px pitch — so the only
 * thing that changes when the data lands is the text.
 */
export function AddonListSkeleton() {
  return (
    <div>
      <AddonListHeader />
      <DataListSkeleton
        columns={ADDON_TRACKS}
        shape={[
          { w: 160, h: 4 },
          { w: 96, h: 3 },
          { w: 48, h: 3 },
          { w: 40, h: 3 },
          { w: 72, h: 3 },
          null,
        ]}
      />
    </div>
  );
}

export function AddonList({
  addons,
  canWrite,
}: {
  /** Already filtered and sorted — the tools live in the sheet header now. */
  addons: PostgresAddon[];
  // Gate per-row mutating actions by the row's project. Show by default when
  // undefined (caller hasn't opted into role-based gating).
  canWrite?: (projectId?: string) => boolean;
}) {
  const navigate = useNavigate();

  return (
    <div>
      <AddonListHeader />
      {addons.map((a) => {
        // The word, and — only when there is one — why. Exactly the Stacks row:
        // a healthy addon stays one line and a broken one is visibly taller.
        const reason = a.status?.state === "Error" ? a.status?.message : undefined;
        return (
          <DataListRow
            key={a.id || a.name}
            columns={ADDON_TRACKS}
            label={`${a.name} addon`}
            onActivate={() => navigate(addonPath(a))}
            data-can-write={canWrite ? canWrite(a.project_id) : true}
          >
            <DataListName name={a.name ?? ""} />

            <div className="flex min-w-0 flex-col">
              <StatusText domain="addon" state={a.status?.state} icon />
              {reason && (
                <span className="truncate text-meta text-danger" title={reason}>
                  {reason}
                </span>
              )}
            </div>

            <DataListCell mono>PG {a.spec.version.major}</DataListCell>
            <DataListCell mono>{a.spec.storage.size ?? "—"}</DataListCell>
            <DataListCell numeric>{createdLabel(a)}</DataListCell>

            {/* The chevron is the row's own affordance rather than an action, so
                it stays put instead of waiting for the pointer. */}
            <div className={cn("flex justify-end")}>
              <ChevronRight className="size-4 text-fg-muted" aria-hidden />
            </div>
          </DataListRow>
        );
      })}
    </div>
  );
}
