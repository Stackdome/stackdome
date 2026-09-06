import { Copy as CopyGlyph, Loader2, RefreshCw, Trash2 } from "lucide-react";
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
import { BlockedAction, DetailList, DetailRow } from "@/components/branded";
import { StatusText } from "@/components/branded/status-text";
import { relativeAge, absoluteAge } from "@/components/branded/entity-card";
import { copyText } from "@/lib/clipboard";
import { useToast } from "@/components/ui/use-toast";
import { PREVIEW_PHASE, type PreviewStack } from "@/api/preview-envs";
import { previewUrl } from "./preview-row";

/** What made this environment, in the reader's words rather than the wire's. */
const SOURCE_LABEL: Record<NonNullable<PreviewStack["source"]>, string> = {
  webhook: "Pull-request webhook",
  manual: "By hand",
};

/** The calendar date a row reports — an age is for what moves, a date for what
 *  happened once. `Created` never changes, so it is never "12d ago". */
const onDate = (timestamp?: string | null): string | null => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * **One preview environment, in full.**
 *
 * The only genuinely new surface on this screen, and it exists because clicking
 * a row used to throw you onto `/stacks/<id>` — a different object with
 * different chrome, where nothing says *you are looking at PR #128*. The stack
 * page keeps everything it has; it stops being the only place the click can
 * land.
 *
 * 480, the `form` rung: it is attached to **one object** and you leave and come
 * back from it — you open the preview URL in another tab, look, and return to
 * sync or delete. That is §13's drawer test almost word for word.
 *
 * ### The actions are in the header, and there is no footer
 *
 * Settled August 2026, on the board, against the stack detail page — which puts
 * its one primary and its destructive act on the header band and keeps no
 * footer at all. A drawer that only READS an object has nothing to commit, so
 * its footer was 81px of column spent holding two buttons and a hairline.
 *
 * They are icon buttons rather than words because there are two of them beside
 * a ✕ that is already one: `Sync`, `Delete`, `Close` reads as three controls of
 * one kind, which is what they are. Neither hides in a menu — **every action on
 * this object is visible** (Jaseem, August 2026).
 *
 * ### The body is one idiom, top to bottom
 *
 * Every fact is a label and its value on the 32 rung. It used to be four
 * different shapes — a status line, a stacked label over a grey well, a column
 * of side-by-side rows, and a link — so the eye restarted four times in 280px.
 * The URL was the worst of them: a stacked label directly above rows that put
 * their labels beside the value.
 *
 * The groups are 20 apart and carry no headings: **what it is doing**, **what
 * it was built from**, **how it got here**.
 */
export function PreviewDrawer({
  env,
  onOpenChange,
  onSync,
  onDelete,
  onOpenStack,
  canWrite = true,
}: {
  /** `null` closes it. The drawer is driven by which row was clicked, so there
   *  is no second `open` prop to keep in step with it. */
  env: PreviewStack | null;
  onOpenChange: (open: boolean) => void;
  onSync: (env: PreviewStack) => void;
  onDelete: (env: PreviewStack) => void;
  onOpenStack: (env: PreviewStack) => void;
  canWrite?: boolean;
}) {
  const { toast } = useToast();
  if (!env) return null;

  const phase = env.status?.phase;
  const url = previewUrl(env);
  const fullUrl = env.status?.outputs?.urls?.find((u) => u.url)?.url;
  const teardownReason =
    phase === PREVIEW_PHASE.deleting
      ? "This environment is being deleted"
      : null;

  const copy = async () => {
    if (!fullUrl) return;
    await copyText(fullUrl);
    toast({ title: "Preview URL copied", variant: "success" });
  };

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        {/* The branch is the description slot, in mono — it is the machine
            string that identifies which code this is, and the heading is the
            number a human quotes. Same name-then-meta pair the row carries. */}
        <DrawerHeader
          title={`PR #${env.pr_number}`}
          description={<span className="font-mono">{env.branch}</span>}
          trailing={
            canWrite ? (
              <>
                <HeaderAction
                  label="Sync"
                  reason={teardownReason}
                  onClick={() => onSync(env)}
                >
                  {phase === PREVIEW_PHASE.deploying ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw aria-hidden />
                  )}
                </HeaderAction>
                {/* **Named for its scope, not its glyph.** A trash can is
                    unambiguous about the verb and silent about the object — and
                    the panel it sits on has a ✕ two controls away. Same call as
                    the node inspector's `Remove resource`.

                    `fg-muted` at rest, danger's ink AND ground on approach.
                    §10 scales friction to blast radius, and a saturated colour
                    spent at rest is not friction — it is the loudest mark in
                    the band on the rarest act in it. */}
                <HeaderAction
                  label="Delete preview"
                  reason={teardownReason}
                  onClick={() => onDelete(env)}
                  className="text-fg-muted hover:bg-danger-bg hover:text-danger"
                >
                  <Trash2 aria-hidden />
                </HeaderAction>
              </>
            ) : undefined
          }
        />

        <DrawerBody>
          {/* Three groups, 20 apart, no headings. A heading over two rows names
              what the rows already say; the space is what groups them (§11). */}
          <DetailList>
            <DetailRow label="Status">
              <StatusText domain="preview" state={phase} icon />
            </DetailRow>
            <DetailRow label="Preview URL">
              {url ? (
                <>
                  {/* **The URL is the link.** A button called `Open` beside
                        the URL it opens is the same act twice, and it cost the
                        value 68px in a 304px cell — enough to truncate the one
                        string the drawer exists to hand you. The trailing ↗
                        modifies the DESTINATION: this leaves for another tab
                        (§9). */}
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={fullUrl}
                    className="focus-ring-edge min-w-0 truncate rounded-sm hover:underline"
                  >
                    {url} ↗
                  </a>
                  {/* `outline` — the board's `secondary`. Copy is the one
                        control in the body, and a ghost among a column of plain
                        text reads as absent until you hover it. */}
                  <Button
                    variant="outline"
                    shape="flat"
                    className="ml-auto flex-none"
                    onClick={() => void copy()}
                  >
                    <CopyGlyph />
                    Copy
                  </Button>
                </>
              ) : (
                /* `fg-muted`, never `fg-ghost` — this is live status text and
                     ghost is the disabled tier (§7).

                     Sans, not mono (§6): `building…` is a sentence ABOUT the
                     environment, not a value the environment produced. */
                <span className="text-fg-muted">
                  {phase === PREVIEW_PHASE.deleting
                    ? "tearing down…"
                    : "building…"}
                </span>
              )}
            </DetailRow>

            <DetailRow label="Branch">{env.branch}</DetailRow>
            <DetailRow label="Commit">{env.commit?.slice(0, 7)}</DetailRow>
            {/* **The stack row IS the way to the stack.** It used to be a
                  ghost button under the list — `Open the stack: logs, metrics
                  and resources ↗` — which named the destination twice, once as
                  a value and once as a sentence. */}
            <DetailRow label="Stack">
              {env.stack_id ? (
                <button
                  type="button"
                  onClick={() => onOpenStack(env)}
                  className="focus-ring-edge min-w-0 truncate rounded-sm text-left hover:underline"
                >
                  {/* **Never a naked arrow.** An unnamed stack rendered as
                        ` ↗` alone — a link with nothing to click and nothing to
                        read. The name is what the row is FOR, so when there
                        isn't one the link says the act instead of pointing at
                        an empty space. */}
                  {env.name || "Open stack"} ↗
                </button>
              ) : (
                env.name
              )}
            </DetailRow>

            <DetailRow label="Created by">
              {env.source ? SOURCE_LABEL[env.source] : undefined}
            </DetailRow>
            <DetailRow
              label="Created"
              title={absoluteAge(env.created_at) ?? undefined}
            >
              {onDate(env.created_at)}
            </DetailRow>
            <DetailRow
              label="Updated"
              title={absoluteAge(env.updated_at) ?? undefined}
            >
              {relativeAge(env.updated_at)}
            </DetailRow>
          </DetailList>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
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
