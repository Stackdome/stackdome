import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * **The last block on a form — the acts that end the object it edits.**
 *
 * Settled on the board August 2026, and it is the shape every destructive act
 * takes from here on.
 *
 * ### Two materials, and that is the whole idea
 *
 * The tint is the FRAME and the card is the OBJECT. A flat tinted box with the
 * button sitting straight on it was the first build, and it read as one
 * undifferentiated warning panel: the heading, the act and the consequence all
 * on one plane, none of them ranked. Lifting the row onto its own white card
 * inside the tint gives the block a subject — *this is a thing you can do* —
 * and leaves the tint doing the one job a ground is good at, which is saying
 * what KIND of region you have reached before you read a word of it.
 *
 * | | |
 * |---|---|
 * | Frame | `danger-bg` (12%), radius 12, **no border** |
 * | Inset | 4 on three sides; the heading takes the top |
 * | Heading | `body/500` in `danger`, 12/16 padding |
 * | Card | `--card`, radius 10, `shadow-sm` — the raised rung |
 * | Row | 16 sides, 12 ends, gap 16 |
 * | Row copy | `body/500` in ink over `meta` in `fg-muted`, at 2 |
 *
 * **Fill, no border.** §7 settled it for the alert banner and it is the same
 * argument here: the fill carries the tone alone, and a tinted box inside a red
 * edge is the same fact twice.
 *
 * ### The heading is not a label for one row
 *
 * It names the region, so it stays the same word however many acts the card
 * holds — one on a preview repository, two on a workspace you can either leave
 * or delete. Rows divide with a hairline and nothing else.
 */
export function DangerZone({
  label = "Danger zone",
  children,
  className,
}: {
  /** Only override it where "danger" is the wrong word for what is in here. */
  label?: ReactNode;
  /** One or more `DangerZoneRow`. */
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        // 4 on three sides — the heading owns the top, so the frame pays no
        // padding there and the heading's own 12 sets the distance instead.
        "flex flex-col rounded-lg bg-danger-bg px-1 pb-1",
        className,
      )}
    >
      {/* Same 16 as the card's content inset, so the heading and the row titles
          under it stand on one left edge. */}
      <h3 className="px-4 py-3 text-body font-medium text-danger">{label}</h3>
      {/* `shadow-sm` is the raised rung (§5) — a contact layer and an ambient
          one. It is what makes the card read as sitting ON the tint rather than
          as a hole cut out of it.

          **Radius 10, which is off the ladder** (§8 runs 6 · 8 · 12). It is the
          number on the board: concentric with a 12px frame at a 4px inset would
          be 8, and 8 looked mean against the heading above it. */}
      <div className="flex flex-col rounded-[10px] bg-card shadow-sm">{children}</div>
    </section>
  );
}

/**
 * One destructive act — what it is, what it costs, and the control.
 *
 * **The description is not a hint and does not go on a `?`.** A hint annotates
 * a field you are filling in; you reach for it when you are unsure and it is
 * noise the rest of the time. A blast radius has to be legible at the moment
 * you notice the button, which is the whole reason the block is tinted.
 *
 * §10's words apply: say what will break, in plain words — *"All requests using
 * this key will start failing"* — and leave "cannot be undone" to the confirm
 * behind it.
 */
export function DangerZoneRow({
  title,
  description,
  action,
}: {
  title: ReactNode;
  /** One line. Two wrapped under a one-line title and read as a paragraph. */
  description?: ReactNode;
  /**
   * The trigger. `Button` at `destructive-ghost`, `shape="flat"` — the ground
   * is already saying this is destructive, and a saturated fill inside a
   * saturated tint says it twice. §10's red FILL still governs the confirm's
   * commit button, which is the click that actually destroys something.
   */
  action: ReactNode;
}) {
  return (
    // The divider is between rows, never above the first — a rule under the
    // card's own top edge is a line drawn on a corner.
    <div className="flex items-center gap-4 border-t border-border-subtle px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-body font-medium text-foreground">{title}</p>
        {description && <p className="text-meta text-fg-muted">{description}</p>}
      </div>
      <div className="flex flex-none items-center">{action}</div>
    </div>
  );
}
