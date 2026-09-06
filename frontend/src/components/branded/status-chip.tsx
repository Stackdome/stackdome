import { cn } from "@/lib/utils";
import { statusVariant, type StatusDomain, type StatusVariant } from "./status-variant";
import { GLYPH, SPINS, humanise } from "./status-glyph";

/**
 * **Status where it has to hold its own ground** — the sheet header, beside the
 * name of the thing it describes. Glyph, word, and a tinted face at the 6px
 * rung, 22px tall.
 *
 * Three status marks now exist and each answers a different question:
 *
 * | | Shape | Where |
 * |---|---|---|
 * | `StatusText` | the coloured word + its glyph, no container | A list row, in a column of its peers |
 * | `StatusChip` | glyph + word on a tinted face | The header, next to a title — nothing around it to make it read as data |
 * | `StatusPill` | bordered full-round chip with a dot | Legacy. Being retired as screens are reworked |
 *
 * **Fill and ink; no border.** §4 gives every state three rungs — fill, ink,
 * border — and using all three at once is what makes one pill say one fact
 * four times. The word carries the hue, the face carries the tint, and the
 * hairline is the rung this shape spends nowhere.
 *
 * **Nothing about it can be passed in.** Word, glyph and colour all fall out of
 * `domain` + the state string the backend actually sent — the same contract
 * `StatusText` holds, off the same map, so a stack cannot read `Degraded` in
 * amber in its header and `Degraded` in red in the list it came from.
 *
 * **22px, not 24 or 20.** It sits inside a 32px control row without touching
 * either edge, and it must not read as a control you can press — a 32px tinted
 * box beside a 32px button is a button.
 */
const TONE: Record<StatusVariant, string> = {
  ready: "bg-success-bg text-success",
  pending: "bg-warn-bg text-warn",
  error: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  neutral: "bg-fg-muted/12 text-fg-muted",
};

export function StatusChip({
  domain,
  state,
  className,
}: {
  domain: StatusDomain;
  state?: string | null;
  /** Layout only — position and flex behaviour. Never colour. */
  className?: string;
}) {
  const variant = statusVariant(domain, state);
  const word = humanise(state ?? "") || "Unknown";
  const key = (state ?? "").trim().toLowerCase();
  const Glyph = GLYPH[domain]?.[key];

  return (
    <span
      data-slot="status-chip"
      data-status-variant={variant}
      className={cn(
        "inline-flex h-[22px] flex-none items-center gap-[5px] rounded-sm px-2",
        "text-meta font-medium whitespace-nowrap",
        TONE[variant],
        className,
      )}
    >
      {Glyph && (
        <Glyph
          className={cn("size-3 flex-none", SPINS.has(key) && "motion-safe:animate-spin")}
          aria-hidden
        />
      )}
      {word}
    </span>
  );
}
