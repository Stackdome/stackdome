import { useNavigate } from "react-router-dom";
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
import type { Stack } from "@/api/stack-types";
import { stackRollupState, stateChangedAt } from "./status";

/**
 * One column template, used by the header and every row.
 *
 * **One fact per column** (Jaseem, 23 Aug 2026). `Name` used to carry three:
 * the name, the project and the ref, the last two stacked under it as one
 * sentence. Measured with realistic project names, that put the `branch@sha` at
 * **four different x positions spanning 100px** — so the one fact you would scan
 * down the column never landed twice in the same place. §11 asks for *the same
 * fact in the same place on every line*; a joined line cannot deliver it, and
 * neither half can be sorted.
 *
 * The fixture hid it: every stack ships in a project called `default`, so the
 * refs happened to line up.
 *
 * **Status paid for it.** Once its reason line came off, its cell was 560px
 * holding a word at most 95px wide — 465 doing nothing. Capping it at 200 funds
 * `Project` (140) and `Source` (260) with the sheet still at 1162 and no
 * horizontal scroll.
 *
 * **Status sits SECOND**, right of the name (Jaseem, 23 Aug 2026). It is the
 * column the page is opened to read — *is anything wrong* — so it goes where the
 * eye lands after the name rather than behind two facts that identify a row you
 * have already found.
 *
 * `Services` is gone. It was the stack's shape written as text, it could not be
 * recognised at a glance, and it did not survive the question every column has
 * to answer: does this help you choose a row, compare across rows, or finish
 * without leaving? The card carries the components by name instead.
 */
/**
 * **Five tracks.** The sixth was a 32px slot for a hover-revealed `Delete`.
 *
 * Deleting a stack takes everything running on it and everything that
 * references it — §10's blast-radius test, and the answer is the **danger
 * zone**, not a trash can that appears under the pointer on a row you were only
 * scanning. A list is for choosing; the act that ends an object belongs on the
 * object, where what it costs can be written next to it.
 */
export const STACK_TRACKS =
  "grid-cols-[minmax(200px,300px)_minmax(140px,200px)_140px_minmax(0,260px)_130px]";

/** Kept for call sites that lay something else out on the same tracks. */
export const STACK_COLUMNS = listGrid(STACK_TRACKS);

/** The branch and the commit it is pinned to, as one machine string (§6). */
function sourceRef(stack: Stack): string | null {
  const git = stack.spec?.stack_resources?.find((r) => r.source?.git)?.source
    ?.git;
  if (git?.branch)
    return git.commit ? `${git.branch}@${git.commit.slice(0, 7)}` : git.branch;
  const image = stack.spec?.stack_resources?.find((r) => r.source?.image)
    ?.source?.image?.ref;
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
 * exact place the rule slips). **Nothing sits under it.** Every row is the same
 * 64px whatever its state, so the status column scans as one straight run; the
 * *why* lives on the card and on the stack's own page.
 *
 * The row **box** carries the 12px sheet edge and the text sits 8px inside it,
 * so the hover wash extends past the name rather than starting at it.
 */
export function DeployStackRow({
  stack,
  projectName,
}: {
  stack: Stack;
  /** `useResourceProjects().projectNameById` returns null for an unresolved id. */
  projectName?: string | null;
}) {
  const navigate = useNavigate();
  const ref = sourceRef(stack);
  const changed = stateChangedAt(stack);

  // region and author are NOT on the stack list payload — the API carries a
  // `user_id` UUID and no region at all, and a rendered UUID is worse than an
  // absent field. Project and source are the two the payload does carry.

  return (
    <DataListRow
      columns={STACK_TRACKS}
      label={`${stack.name} stack`}
      onActivate={() => navigate(`/stacks/${stack.id}`)}
    >
      {/* Name alone. The card still stacks name over `project · ref` — a card is
          read one at a time and a table is read down a column, so the two views
          answer different questions with the same facts. */}
      <DataListName name={stack.name ?? ""} />

      {/* **The word, and nothing under it.** The reason line was removed
          23 Aug 2026 (Jaseem). It is not lost: the card view and the stack's own
          page both still carry it, so the detail is one click away from the row
          that prompts the click.

          What the table buys back is a **uniform 64px pitch** — every row the
          same height, so the eye scans the status column as one straight run
          instead of stepping over the broken ones. Same glyph as the card: a
          status has to look the same in both views or switching costs a
          re-read. */}
      <div className="flex min-w-0 flex-col">
        <StatusText
          domain="stack_rollup"
          state={stackRollupState(stack)}
          icon
        />
      </div>

      <DataListCell title={projectName ?? undefined}>
        {projectName}
      </DataListCell>

      {/* Mono, because a ref is a machine value (§6) — and it starts at the
          column edge on every row, which is the whole point of the split. */}
      <DataListCell mono title={ref ?? undefined}>
        {ref}
      </DataListCell>

      <DataListCell numeric title={absoluteAge(changed) ?? undefined}>
        {relativeAge(changed)}
      </DataListCell>
    </DataListRow>
  );
}

/** The list's column headers — sentence case, `text-column` (11.5/16), `fg-muted`, one 1px
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
  // record.
  return (
    <DataListHeader
      columns={STACK_TRACKS}
      labels={["Name", "Status", "Project", "Source", "Last change"]}
    />
  );
}

/** Six rows at the real 64px pitch, so nothing moves when the data lands (§15
 *  loading). A `wash-hover` block and no shimmer — §14 rules out ambient
 *  movement on a working surface. */
export function StackRowSkeleton() {
  return (
    <DataListSkeleton
      columns={STACK_TRACKS}
      shape={[
        { w: 160, h: 4 },
        { w: 96, h: 3 },
        { w: 88, h: 3 },
        { w: 148, h: 3 },
        { w: 64, h: 3 },
      ]}
    />
  );
}
