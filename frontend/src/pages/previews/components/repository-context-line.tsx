import { cn } from "@/lib/utils";
import { repoLabel } from "@/pages/previews/lib/repo-label";
import type { StackPreviewConfig } from "@/api/preview-configs";

/**
 * Which repository you are looking at, and how much of its budget is spent.
 *
 * **This is the only thing naming the selection.** The sheet title is always
 * `Previews` — a landmark that changes as you click around the page stops being
 * one (§12a) — so the context line carries the name, and it carries it in ink at
 * `title/500` rather than as furniture. That is the row's own name-then-meta
 * pattern laid out horizontally: the name you recognise, then the machine string
 * beside it in muted mono.
 *
 * It outranks the rows under it by one rung, which is why it is `title` and not
 * the `name/500` the first build used — a container set at the same size as the
 * items inside it does not read as containing them.
 *
 * ### No meter
 *
 * `3 of 5 active` is exact. A 44×4 bar beside it says the same thing
 * approximately, and §7 bans the second picture: *a number said in words gets no
 * second picture*. The bar was drawn on the board, judged live, and removed.
 */
export function RepositoryContextLine({
  config,
  activeCount,
}: {
  config: StackPreviewConfig;
  /** Environments that count against the cap right now. */
  activeCount: number;
}) {
  const max = config.max_active_previews ?? 0;
  const atCap = max > 0 && activeCount >= max;
  const repo = repoLabel(config.git_repository?.repo_url);
  const branch = config.git_repository?.base_branch;

  return (
    /* `px-2` is the ROW's own inset, not a margin of its own: a list row's box
       lands on the sheet's edge and its text sits 8px inside, so a line that
       introduces the list has to spend the same 8 or its name starts left of
       the column header under it. Measured — the two were 8px apart. */
    <div className="flex min-h-6 items-baseline gap-3 px-2">
      <h2 className="truncate text-title font-medium text-foreground">{config.name}</h2>
      {repo && (
        <p className="min-w-0 truncate font-mono text-meta text-fg-muted" title={repo}>
          {repo}
          {branch && ` · ${branch}`}
        </p>
      )}
      {max > 0 && (
        // Tabular: both halves change under the reader, and a count that jitters
        // as it polls is one you have to re-find rather than re-read.
        <p
          className={cn(
            "ml-auto flex-none text-meta tabular-nums",
            atCap ? "text-warn" : "text-fg-muted",
          )}
        >
          {activeCount} of {max} active
        </p>
      )}
    </div>
  );
}

/** Whether this repository can take another environment. The screen asks this
 *  twice — once for the cap line's colour, once to block `New preview` — so it
 *  is one function rather than two comparisons that can drift apart. */
export function isAtCap(config: StackPreviewConfig, activeCount: number): boolean {
  const max = config.max_active_previews ?? 0;
  return max > 0 && activeCount >= max;
}
