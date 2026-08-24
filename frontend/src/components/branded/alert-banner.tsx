import type { ReactNode } from "react";
import { AlertCircle, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * `danger` — it failed. `blocking` — it will fail unless you deal with this
 * first. `info` — we did something to your input and you should know.
 *
 * A tone is one hue on a three-rung ladder (§4). The banner uses TWO of the
 * three: the light base thinned to 12% for the fill, and the opaque dark one
 * for the glyph and the action. The border rung exists but is deliberately not
 * used here — fill and edge together said the same thing twice. The message
 * itself stays ink, so the banner says its severity once.
 *
 * The action sits BELOW the message, not beside it. Right-aligned it competed
 * with the sentence for the same line and had nowhere to go when the copy ran
 * long; under the text it reads as the consequence of what was just said, and
 * the banner grows down instead of squeezing.
 *
 * ### A long message splits — a headline you can skim, the detail under it
 *
 * A banner's whole job is to be read from across the page, and three lines of
 * one weight is not read, it is skipped. `title` names the state in five words
 * at `body/500`; `children` become the detail at `meta` in `fg-muted`, which is
 * where you look once the headline has told you it matters.
 *
 * **Same pair as the danger zone and the empty state** — `body/500` over
 * `meta`/`fg-muted` at 2 — because they are the same sentence shape: what has
 * happened, then what follows from it. A banner with no `title` is unchanged:
 * one line of `body/500`, which is right when the message IS five words.
 */
export type AlertBannerTone = "danger" | "blocking" | "info";

const TONES = {
  danger: {
    icon: AlertCircle,
    box: "bg-danger-bg",
    ink: "text-danger",
    action: "text-danger focus-visible:outline-danger",
  },
  blocking: {
    icon: TriangleAlert,
    box: "bg-warn-bg",
    ink: "text-warn",
    action: "text-warn focus-visible:outline-warn",
  },
  info: {
    icon: Info,
    box: "bg-info-bg",
    ink: "text-info",
    action: "text-info focus-visible:outline-info",
  },
} as const;

export interface AlertBannerProps {
  /**
   * The state, in a handful of words — `At the limit of 5 environments`.
   *
   * Optional. Reach for it when the message runs past a line; a short banner
   * says everything it has to say in `children` alone.
   */
  title?: ReactNode;
  /** The message, or — when `title` is set — the detail under it. */
  children: ReactNode;
  /** Defaults to `danger` — every caller that predates tones is a failure. */
  tone?: AlertBannerTone;
  action?: { label: string; onClick: () => void; disabled?: boolean };
  className?: string;
}

export function AlertBanner({
  title,
  children,
  tone = "danger",
  action,
  className,
}: AlertBannerProps) {
  const { icon: Glyph, box, ink, action: actionInk } = TONES[tone];

  return (
  // No border, and `rounded-lg` (12px) rather than the 8px control default —
  // the banner is panel-sized, not control-sized, and the radius ladder is a
  // function of height (§8). Dropping the edge leaves the fill to carry the
  // tone on its own, which is one channel instead of two (§7).
    /* **`alert` interrupts; `status` waits its turn.** Every tone announced as
       `alert` — assertive — so an `info` banner reporting that we tidied your
       input cut across whatever a screen-reader user was already listening to.
       `danger` and `blocking` have earned the interruption; `info` has not.
       Restored from main's `notice` variant at the merge, where the distinction
       was already drawn and this branch's rewrite had flattened it. */
    <div
      role={tone === "info" ? "status" : "alert"}
      className={cn("flex items-start gap-2 rounded-lg p-4", box, className)}
    >
      {/* 16px glyph nudged 2px down, so it centres on the FIRST line of a 20px
          body however many lines the message runs to. Figma models the same
          thing as a 16x20 slot with 2px of top padding. */}
      <Glyph aria-hidden="true" className={cn("h-4 w-4 flex-none translate-y-0.5", ink)} />
      <div className="flex flex-1 flex-col items-start gap-2">
        {/* `text-body` carries size and line-height only — weight is explicit,
            or it inherits whatever the banner happens to be dropped into.

            **The ink stays `--foreground` in both halves' top line.** §4: the
            tone is said once, by the fill and the glyph. A coloured headline
            would be the third time. */}
        <div className="flex flex-col gap-0.5">
          {title && <div className="text-body font-medium">{title}</div>}
          <div className={title ? "text-meta text-fg-muted" : "text-body font-medium"}>
            {children}
          </div>
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            // Deliberate exception to the --ring focus convention: this action sits
            // inside a tinted banner, so its outline matches the tone instead.
            // **The exception is the COLOUR, not the width** — 1.5px tracks
            // `--ring-width` so every focus mark in the product is one weight.
            className={cn(
              "rounded text-body font-medium hover:underline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
              actionInk,
            )}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
