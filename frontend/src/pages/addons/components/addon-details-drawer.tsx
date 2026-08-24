import { ExternalLink, Pencil } from "lucide-react";
import cronstrue from "cronstrue";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BlockedAction,
  DangerZone,
  DangerZoneRow,
  DetailList,
  DetailRow,
} from "@/components/branded";
import { StatusText } from "@/components/branded/status-text";
import { relativeAge, absoluteAge } from "@/components/branded/entity-card";
import { copyText } from "@/lib/clipboard";
import { useToast } from "@/components/ui/use-toast";
import { detectPlan } from "@/pages/addons/lib/payload";
import { PLAN_PRESETS } from "@/pages/addons/lib/plan-presets";
import type { PostgresAddon } from "@/api/addons";

/** The state a managed database is in while it is on its way out. */
const DELETING = "Deleting";

/** The plan's word, not its id. `custom` is a real answer — it means the
 *  resources were set by hand and no preset matches them. */
function planLabel(addon: PostgresAddon): string {
  const id = detectPlan(addon.spec.resources);
  return PLAN_PRESETS.find((p) => p.id === id)?.label ?? "Custom";
}

/**
 * The schedule in words — `Every day at 02:00`, not `0 0 2 * * *`.
 *
 * Falls back to the expression itself rather than to nothing: an unparseable
 * cron is still the answer to "when", and hiding it would report a repository
 * with backups on as though it had none.
 */
function scheduleLabel(expr?: string): string | undefined {
  if (!expr) return undefined;
  try {
    return cronstrue.toString(expr, { use24HourTimeFormat: true });
  } catch {
    return expr;
  }
}

/** The calendar date a row reports — an age is for what moves, a date for what
 *  happened once. `Created` never changes, so it is never "12d ago". */
function onDate(timestamp?: string | null): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * **One managed database, in full.**
 *
 * The addons list used to throw you onto `/addons/postgres/<id>` for every
 * glance — "which version is this one on", "is its backup schedule the one I
 * set" — and coming back cost a navigation each time. The page keeps everything
 * it has: credentials, the backups list, the connection panel. It stops being
 * the only place the click can land.
 *
 * **The same three bands and the same body idiom as the preview drawer** — a
 * label and its value on the 32 rung, in groups separated by space, with the
 * object's actions on the header and no footer at all. A drawer that only READS
 * an object has nothing to commit, and a footer holding two buttons and a
 * hairline is 81px of the column spent on a band.
 *
 * ### Two rows lead out, and they name where they go
 *
 * `Databases` and `Backups` are subjects with their own lists on the addon's
 * page — credentials, a backup history, restore. Neither fits in a 480 column,
 * and neither is a reason to make the whole drawer a doorway: the row that
 * names the subject is the way to it, which is the same move the preview
 * drawer's `Stack` row makes.
 */
export function AddonDetailsDrawer({
  addon,
  onOpenChange,
  onEdit,
  onDelete,
  onOpenPage,
  canWrite = true,
}: {
  /** `null` closes it. The drawer is driven by which row was clicked, so there
   *  is no second `open` prop to keep in step with it. */
  addon: PostgresAddon | null;
  onOpenChange: (open: boolean) => void;
  /** Hands off to the edit form. The caller closes this drawer first — two
   *  stacked modals is two scrims and two focus traps for one object. */
  onEdit: (addon: PostgresAddon) => void;
  onDelete: (addon: PostgresAddon) => void;
  /** The addon's own page, where credentials and the backup history live. */
  onOpenPage: (addon: PostgresAddon) => void;
  canWrite?: boolean;
}) {
  const { toast } = useToast();
  if (!addon) return null;

  const state = addon.status?.state;
  const conn = addon.status?.connection_info;
  const host = conn?.host ? `${conn.host}:${conn.port}` : undefined;
  const backup = addon.spec.backup;
  const databases = conn?.databases?.map((d) => d.name).filter(Boolean) ?? [];
  const teardownReason =
    state === DELETING ? "This addon is being deleted" : null;

  const copy = async () => {
    if (!host) return;
    await copyText(host);
    toast({ title: "Connection host copied", variant: "success" });
  };

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        {/* The version is the description slot: a name says WHICH database and
            says nothing about what it is. Sans, not mono (§6) — `PostgreSQL 16`
            is a sentence about the object, not a value it produced. */}
        <DrawerHeader
          title={addon.name}
          description={`PostgreSQL ${addon.spec.version.major}`}
          trailing={
            canWrite ? (
              <>
                <HeaderAction
                  label="Edit addon"
                  reason={teardownReason}
                  onClick={() => onEdit(addon)}
                >
                  <Pencil aria-hidden />
                </HeaderAction>
              </>
            ) : undefined
          }
        />

        <DrawerBody>
          <DetailList>
            <DetailRow label="Status">
              <StatusText domain="addon" state={state} icon />
            </DetailRow>
            {/* The word says WHAT; only a failure has a why, and it is the
                  one fact on this drawer you cannot get anywhere else. */}
            <DetailRow label="Reason">
              {state === "Error" ? addon.status?.message : undefined}
            </DetailRow>
            <DetailRow label="Host">
              {host ? (
                <>
                  <span
                    className="min-w-0 truncate font-mono text-meta"
                    title={host}
                  >
                    {host}
                  </span>
                  {/* `outline` — the board's `secondary`. It is the one
                        control in the body, and a ghost among a column of plain
                        text reads as absent until you hover it. */}
                  <Button
                    variant="outline"
                    shape="flat"
                    className="ml-auto flex-none"
                    onClick={() => void copy()}
                  >
                    Copy
                  </Button>
                </>
              ) : (
                /* `fg-muted`, never `fg-ghost` — this is live status text and
                     ghost is the disabled tier (§7). */
                <span className="text-fg-muted">
                  {state === DELETING ? "tearing down…" : "provisioning…"}
                </span>
              )}
            </DetailRow>

            <DetailRow label="Plan">{planLabel(addon)}</DetailRow>
            <DetailRow label="Instances">
              {addon.spec.instances.count}
            </DetailRow>
            <DetailRow label="Storage">{addon.spec.storage.size}</DetailRow>
            <DetailRow label="Databases">
              {databases.length > 0 ? (
                <PageLink
                  addon={addon}
                  onOpenPage={onOpenPage}
                  label="Databases"
                >
                  {databases.join(", ")}
                </PageLink>
              ) : undefined}
            </DetailRow>

            {/* **`Off` is an answer, not an absence.** A backup schedule that
                  is switched off is a decision someone made, and a row that
                  vanished would read as "we could not tell you". */}
            <DetailRow label="Backups">
              {backup?.enabled ? (
                <PageLink addon={addon} onOpenPage={onOpenPage} label="Backups">
                  {scheduleLabel(backup.schedule) ?? "On"}
                </PageLink>
              ) : (
                "Off"
              )}
            </DetailRow>
            <DetailRow
              label="Created"
              title={absoluteAge(addon.created_at) ?? undefined}
            >
              {onDate(addon.created_at)}
            </DetailRow>
            <DetailRow
              label="Updated"
              title={absoluteAge(addon.updated_at) ?? undefined}
            >
              {relativeAge(addon.updated_at)}
            </DetailRow>
          </DetailList>

          {/* **Delete has a blast radius, so it is not a glyph on the band.**
              An act whose cost lands on OTHER things gets the danger zone; an
              act with no dependents stays where it is convenient — the preview
              drawer keeps its trash in the header because a preview
              environment is regenerable and nothing references it. This one
              destroys storage that cannot be rebuilt, and the API refuses
              outright while a stack still points at it.

              At the FOOT of the body, after everything you would read before
              deciding. */}
          {canWrite && (
            <DangerZone className="mt-1">
              <DangerZoneRow
                title="Delete this database"
                description="The database and its storage are destroyed."
                action={
                  <BlockedAction reason={teardownReason}>
                    <Button
                      variant="destructive-ghost"
                      shape="flat"
                      onClick={() => onDelete(addon)}
                    >
                      Delete addon
                    </Button>
                  </BlockedAction>
                }
              />
            </DangerZone>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * A value that is also the way to the subject it names.
 *
 * The trailing ↗ modifies the DESTINATION (§9) — this leaves the drawer for the
 * addon's own page. `aria-label` says which subject, because the visible text
 * is a list of database names and "app, analytics" does not tell a screen-reader
 * user where the link goes.
 */
function PageLink({
  addon,
  onOpenPage,
  label,
  children,
}: {
  addon: PostgresAddon;
  onOpenPage: (addon: PostgresAddon) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenPage(addon)}
      aria-label={`${label}: open ${addon.name}`}
      className="focus-ring-edge flex min-w-0 items-center gap-1 rounded-sm text-left hover:underline"
    >
      <span className="min-w-0 truncate">{children}</span>
      <ExternalLink className="size-3 flex-none text-fg-muted" aria-hidden />
    </button>
  );
}

/**
 * One of the header band's object actions — a glyph, its verb in a tooltip, and
 * the reason in the same tooltip's place when it cannot be taken.
 *
 * **An icon button's only label is its glyph**, so the word has to come from
 * somewhere; and §11's rule that nothing is disabled without saying why means
 * the blocked case needs the same slot. `BlockedAction` brings its own tooltip,
 * so the two are alternatives rather than nested.
 */
function HeaderAction({
  label,
  reason,
  onClick,
  className,
  children,
}: {
  label: string;
  reason: React.ReactNode | null;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={onClick}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  );
  if (reason) return <BlockedAction reason={reason}>{button}</BlockedAction>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
