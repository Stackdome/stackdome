import { Ellipsis, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusText } from "@/components/branded/status-text";
import {
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
  listGrid,
} from "@/components/branded/data-list";
import { relativeAge, absoluteAge } from "@/components/branded/entity-card";
import { cn } from "@/lib/utils";
import type { Stack } from "@/api/stack-types";
import { stackRollupState, statusReason, stateChangedAt } from "./status";

/**
 * One column template, used by the header and every row.
 *
 * **`Status` is the flexible column, not `Name`.** That is the whole layout
 * decision. `Name` used to take `1fr` and swallow every spare pixel, which left
 * a long empty run between the name and the status on a wide sheet. Now the
 * name is capped and the slack goes to the status cell — where the reason line
 * lives, and where extra width buys a sentence that finishes instead of one
 * that truncates.
 *
 * `Services` is gone. It was the stack's shape written as text, it could not be
 * recognised at a glance, and it did not survive the question every column has
 * to answer: does this help you choose a row, compare across rows, or finish
 * without leaving? The card carries the components by name instead.
 */
export const STACK_TRACKS = "grid-cols-[minmax(240px,420px)_minmax(0,1fr)_130px_32px]";

/** Kept for call sites that lay something else out on the same tracks. */
export const STACK_COLUMNS = listGrid(STACK_TRACKS);

/** The branch and the commit it is pinned to, as one machine string (§6). */
function sourceRef(stack: Stack): string | null {
  const git = stack.spec?.stack_resources?.find((r) => r.source?.git)?.source?.git;
  if (git?.branch) return git.commit ? `${git.branch}@${git.commit.slice(0, 7)}` : git.branch;
  const image = stack.spec?.stack_resources?.find((r) => r.source?.image)?.source?.image?.ref;
  return image ?? null;
}

/**
 * A stack as a hairline row (§11). Separation is a 1px rule — no box, no shadow,
 * no card per item.
 *
 * The row's job is *compare and find*: the same fact in the same place on every
 * line, so the odd one out jumps. Everything that answers "what is going on
 * inside this one" belongs to the card.
 *
 * Status is said ONCE, as a word — there is no row dot (§11 names this as the
 * exact place the rule slips). The line under it is not a second reading of the
 * word; it is **why**, and it appears only when there is a why. A healthy row
 * stays one line and a broken one is visibly taller.
 *
 * The row **box** carries the 12px sheet edge and the text sits 8px inside it,
 * so the hover wash extends past the name rather than starting at it.
 */
export function DeployStackRow({
  stack,
  projectName,
  onDelete,
}: {
  stack: Stack;
  /** `useResourceProjects().projectNameById` returns null for an unresolved id. */
  projectName?: string | null;
  onDelete?: (stack: Stack) => void;
}) {
  const navigate = useNavigate();
  const ref = sourceRef(stack);
  const changed = stateChangedAt(stack);
  const reason = statusReason(stack);
  const menuDisabled = stack.lifecycle === "deleting";

  // region and author are NOT on the stack list payload — the API carries a
  // `user_id` UUID and no region at all, and a rendered UUID is worse than an
  // absent field. The line is project + branch@sha until the payload grows.
  const provenance = [projectName, ref].filter(Boolean).join(" · ");

  return (
    <DataListRow
      columns={STACK_TRACKS}
      label={`${stack.name} stack`}
      onActivate={() => navigate(`/stacks/${stack.id}`)}
    >
      <DataListName name={stack.name ?? ""} secondary={provenance} />

      {/* The word, and — only when there is one — why. Same glyph as the card:
          a status has to look the same in both views or switching between them
          costs a re-read. */}
      <div className="flex min-w-0 flex-col">
        <StatusText domain="stack_rollup" state={stackRollupState(stack)} icon />
        {reason && (
          <span
            className={cn(
              "truncate text-meta",
              reason.tone === "danger" ? "text-danger" : "text-fg-2",
            )}
            title={reason.text}
          >
            {reason.text}
          </span>
        )}
      </div>

      <DataListCell numeric title={absoluteAge(changed) ?? undefined}>
        {relativeAge(changed)}
      </DataListCell>

      {/* §11 — the row's actions appear on hover. A kebab on every row at rest is
          eight pieces of chrome competing with eight names. Hidden by opacity so
          the control keeps its tab stop and the row does not reflow. */}
      <div className="flex justify-end">
        {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                shape="flat"
                aria-label={`Actions for ${stack.name}`}
                className="opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]" onClick={(e) => e.stopPropagation()}>
              {/* No deferral needed: the confirm service defers its own open
                  a tick past the menu close (radix-ui/primitives#1836). */}
              <DropdownMenuItem variant="destructive" disabled={menuDisabled} onSelect={() => onDelete(stack)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </DataListRow>
  );
}

/** The list's column headers — sentence case, `text-label`, `fg-muted`, one 1px
 *  rule underneath and nothing else (§11). An unlabelled column makes the reader
 *  infer what a bare timestamp is measuring.
 *
 *  **The label sits in a uniform 8px inset — 8 above, 8 each side, 8 below.**
 *  It was 16 above (the sheet's content inset) and 6 below, so the one piece of
 *  chrome on the page was the only thing not square with itself. `-mt-2` gives
 *  back half the content inset: a column header is chrome and sits tighter to
 *  the band than content does. Settled on the board (node `121:885`). */
export function StackRowHeader() {
  // "Last change", not "Updated" — this is the age of the STATE, not of the
  // record. The fourth track is the row menu and is deliberately unlabelled.
  return <DataListHeader columns={STACK_TRACKS} labels={["Name", "Status", "Last change", ""]} />;
}

/** Six rows at the real 64px pitch, so nothing moves when the data lands (§15
 *  loading). A `wash-hover` block and no shimmer — §14 rules out ambient
 *  movement on a working surface. */
export function StackRowSkeleton() {
  return (
    <DataListSkeleton
      columns={STACK_TRACKS}
      shape={[
        [
          { w: 160, h: 4 },
          { w: 224, h: 3 },
        ],
        { w: 96, h: 3 },
        { w: 64, h: 3 },
        null,
      ]}
    />
  );
}
