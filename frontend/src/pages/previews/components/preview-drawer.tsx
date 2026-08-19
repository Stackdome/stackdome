import { Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { BlockedAction } from "@/components/branded";
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
 * The URL sits in a **well with its own actions inside it**. A grey well is for
 * input and reference (§3), and this is the reference the whole page exists to
 * hand you; putting `Copy` and `Open` inside the box means the control is on the
 * thing it acts on rather than somewhere below it.
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
  const when = env.updated_at || env.created_at;
  const teardownReason =
    phase === PREVIEW_PHASE.deleting ? "This environment is being deleted" : null;

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
        />

        <DrawerBody>
          {/* One line, one fact each: what it is doing, and when it last did
              anything. The word and its colour are derived from the phase. */}
          <div className="flex items-baseline gap-1.5">
            <StatusText domain="preview" state={phase} icon />
            <span className="text-meta text-fg-muted" title={absoluteAge(when) ?? undefined}>
              · updated <span className="tabular-nums">{relativeAge(when)}</span>
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-body font-medium text-foreground">Preview URL</p>
            {url ? (
              <div className="flex h-8 items-center gap-1 rounded-md bg-control pl-3 pr-1">
                <span className="min-w-0 flex-1 truncate font-mono text-meta text-fg-2" title={fullUrl}>
                  {fullUrl}
                </span>
                <Button variant="ghost" size="sm" shape="flat" onClick={() => void copy()}>
                  Copy
                </Button>
                {/* A trailing ↗ modifies the DESTINATION — this leaves for
                    another tab, and a control that does that has to say so. */}
                <Button variant="ghost" size="sm" shape="flat" asChild>
                  <a href={fullUrl} target="_blank" rel="noreferrer">
                    Open ↗
                  </a>
                </Button>
              </div>
            ) : (
              /* `fg-muted`, never `fg-ghost` — this is live status text and
                 ghost is the disabled tier (§7). */
              <p className="flex h-8 items-center rounded-md bg-control px-3 font-mono text-meta text-fg-muted">
                {phase === PREVIEW_PHASE.deleting ? "tearing down…" : "building…"}
              </p>
            )}
          </div>

          <dl className="flex flex-col gap-2">
            <DetailRow label="Branch" value={env.branch} mono />
            <DetailRow label="Commit" value={env.commit?.slice(0, 7)} mono />
            <DetailRow label="Created by" value={env.source ? SOURCE_LABEL[env.source] : undefined} />
            <DetailRow label="Stack" value={env.name} mono />
          </dl>

          {env.stack_id && (
            <Button
              variant="link"
              shape="flat"
              className="-mx-3 self-start"
              onClick={() => onOpenStack(env)}
            >
              Open the stack: logs, metrics and resources ↗
            </Button>
          )}
        </DrawerBody>

        {canWrite && (
          <DrawerFooter>
            <DrawerActions>
              {/* `destructive-ghost`: §10's red fill belongs to the confirm's
                  commit button, and this is the trigger that opens it. */}
              <BlockedAction reason={teardownReason}>
                <Button variant="destructive-ghost" shape="flat" onClick={() => onDelete(env)}>
                  Delete
                </Button>
              </BlockedAction>
              <BlockedAction reason={teardownReason}>
                <Button onClick={() => onSync(env)}>
                  {phase === PREVIEW_PHASE.deploying && <Loader2 className="animate-spin" />}
                  Sync
                </Button>
              </BlockedAction>
            </DrawerActions>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** A label and its value on one line — the read-only sibling of a field, on the
 *  same left edge, so a column of them reads as one block rather than four. */
function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-4">
      <dt className="w-[120px] flex-none text-body text-fg-muted">{label}</dt>
      <dd className={`min-w-0 truncate text-body text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
