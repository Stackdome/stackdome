import { cn } from "@/lib/utils";
import { statusVariant, type StatusDomain, type StatusVariant } from "./status-variant";
import { GLYPH, SPINS, humanise } from "./status-glyph";

/**
 * Status, said once, as a word (§4, §7).
 *
 * **The colour is derived, never passed.** This component takes no `children`,
 * no `variant`, no `className` and no `style` — the only inputs are the domain
 * and the state string the backend actually sent, and both the word and the
 * colour fall out of them. That is the whole point of it.
 *
 * The Figma critique found the defect this replaces: `StatusPill` takes a
 * `variant` and its `children` separately, so nothing stops
 * `<StatusPill variant="error">Healthy</StatusPill>` — a red row that reads
 * "Healthy". A prop pair cannot be made safe by convention; it has to stop
 * being a pair. Callers that need a coloured word use this. `StatusPill`
 * remains for the bordered chip, where the word is genuinely fixed by the
 * caller.
 *
 * No dot. §7: a coloured dot at the left of a row AND the status word in a
 * column is saying it twice. The dot survives only where there is no room for
 * a word, which is not here.
 *
 * **The word alone, on the page's own ground.** Where the status needs a
 * container of its own — a header, where it sits beside a title rather than in
 * a column of its peers — the filled form is `StatusChip`, and both read the
 * same glyph map (`status-glyph.ts`).
 */
const TONE: Record<StatusVariant, string> = {
  ready: "text-success",
  pending: "text-warn",
  error: "text-danger",
  info: "text-info",
  neutral: "text-fg-muted",
};

export function StatusText({
  domain,
  state,
  /** Layout only — `text-meta` is the §3 size for row data. */
  size = "meta",
  /** Prefix the word with the glyph for its STATE, 6px apart. Still no way to
   *  choose which glyph — see `GLYPH`. A domain with no map renders the word
   *  alone rather than a stand-in. */
  icon = false,
}: {
  domain: StatusDomain;
  state?: string | null;
  size?: "meta" | "body";
  icon?: boolean;
}) {
  const variant = statusVariant(domain, state);
  const word = humanise(state ?? "") || "Unknown";
  const key = (state ?? "").trim().toLowerCase();
  const Glyph = icon ? GLYPH[domain]?.[key] : undefined;

  return (
    <span
      data-slot="status-text"
      data-status-variant={variant}
      className={cn(
        "font-medium whitespace-nowrap",
        size === "meta" ? "text-meta" : "text-body",
        TONE[variant],
      )}
    >
      {/* INLINE, never inline-flex. The card sets the name and the status word
          on a shared baseline (§8); an inline-flex box takes its baseline from
          its first flex item, so the glyph would drag the word off that line.
          An inline-block glyph with an optical nudge keeps the text baseline
          exactly where it was and centres the mark on the x-height. */}
      {Glyph && (
        <Glyph
          className={cn(
            "mr-1.5 inline-block align-[-0.22em]",
            size === "meta" ? "size-3.5" : "size-4",
            SPINS.has(key) && "motion-safe:animate-spin",
          )}
          aria-hidden
        />
      )}
      {word}
    </span>
  );
}
