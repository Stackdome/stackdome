import type { SnapshotDiff, ItemDiff, ResourceDiff, DiffRow } from "../release-snapshot-diff";

/**
 * What a release changed: one card per entity, `key: from → to` inside it.
 *
 * **The card is what carries the grouping** — a run of hairline-separated
 * sections had no way to say that `LOG_LEVEL` belongs to `web` and `sync
 * before use` belongs to `uploads`, because every gap in it looked the same.
 *
 * What the card no longer does, and why:
 *
 * | Dropped | |
 * |---|---|
 * | The coloured dot beside the name | The change word already says it. Dot + chip fill + chip border + chip ink was four channels for one fact (§7) |
 * | The filled chip | Now one coloured word — the same treatment the timeline rows use for a release's state |
 * | `text-[9px]` section labels | Off the type scale entirely. `text-label` is the bottom rung |
 * | The bordered box around the whole set | The cards bring their own edge; that box put them three deep |
 *
 * The head band is `--well`, the product's one recessed ground — not `--muted`,
 * which read as a grey stripe across a white card.
 */
const CHANGE_INK: Record<ResourceDiff["change"], string> = {
  added: "text-success",
  removed: "text-danger",
  modified: "text-change",
  renamed: "text-change",
};

const CHANGE_LABEL: Record<ResourceDiff["change"], string> = {
  added: "Added",
  removed: "Removed",
  modified: "Modified",
  renamed: "Renamed",
};

function Row({ row }: { row: DiffRow }) {
  return (
    <div className="flex items-start gap-3 py-[3px]">
      <span className="w-[132px] flex-none truncate font-mono text-label text-fg-muted">{row.key}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-label">
        {row.kind === "added" && <span className="text-success">{row.to}</span>}
        {row.kind === "removed" && <span className="text-danger">{row.from}</span>}
        {row.kind === "changed" && (
          <>
            <span className="text-danger">{row.from}</span>
            <span className="text-fg-muted">→</span>
            <span className="text-success">{row.to}</span>
          </>
        )}
      </span>
    </div>
  );
}

function Card({
  name, change, fromName, note, sections, rows,
}: {
  name: string;
  change: ResourceDiff["change"];
  fromName?: string;
  note?: string;
  sections?: ResourceDiff["sections"];
  rows?: DiffRow[];
}) {
  const hasBody = (sections?.length ?? 0) > 0 || (rows?.length ?? 0) > 0 || !!note;
  return (
    // **`w-fit`, not full width.** A diff card holds a `key  from → to` and a
    // name — perhaps 350px of content — and spanning the column left most of
    // each card empty, with the value stranded a long way from its key. It is
    // sized by its widest row, floored so a one-word change is not a stub and
    // capped so a long value still wraps inside the column.
    <div className={`w-fit min-w-[280px] max-w-full overflow-hidden rounded-md border border-border-subtle ${change === "removed" ? "opacity-80" : ""}`}>
      <div className="flex items-baseline gap-2 bg-[var(--well)] px-3 py-2">
        <span className="min-w-0 flex-none truncate font-mono text-meta font-medium text-foreground">
          {change === "renamed" && fromName ? <>{fromName} <span className="text-fg-muted">→</span> {name}</> : name}
        </span>
        <span className={`flex-none text-label font-medium ${CHANGE_INK[change]}`}>{CHANGE_LABEL[change]}</span>
      </div>

      {hasBody && (
        <div className="space-y-2.5 px-3 py-2.5">
          {note && <p className="text-meta text-fg-muted">{note}</p>}
          {(sections ?? []).map((sec, si) => (
            <div key={si}>
              <div className="mb-1 text-label text-fg-muted">{sec.kind}</div>
              {sec.rows.map((row, ri) => <Row key={ri} row={row} />)}
            </div>
          ))}
          {rows && rows.length > 0 && <div>{rows.map((row, ri) => <Row key={ri} row={row} />)}</div>}
        </div>
      )}
    </div>
  );
}

export interface ConfigDiffProps {
  diff: SnapshotDiff;
  hasPrev: boolean;
  prevSeq?: number;
}

export function ConfigDiff({ diff, hasPrev, prevSeq }: ConfigDiffProps) {
  if (!diff.resources.length && !diff.volumes.length) {
    return (
      <div className="text-meta text-fg-muted">
        {hasPrev ? `No configuration changes since #${prevSeq ?? "previous"}.` : "Initial release — nothing to compare."}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {diff.resources.map((d) => (
        <Card key={d.name} name={d.name} change={d.change} fromName={d.fromName} note={d.note} sections={d.sections} />
      ))}
      {diff.volumes.length > 0 && (
        <div className="space-y-2 pt-1.5">
          <h4 className="text-meta font-medium text-fg-2">Volumes</h4>
          {diff.volumes.map((v: ItemDiff) => (
            <Card key={v.name} name={v.name} change={v.change} note={v.note} rows={v.rows} />
          ))}
        </div>
      )}
    </div>
  );
}
