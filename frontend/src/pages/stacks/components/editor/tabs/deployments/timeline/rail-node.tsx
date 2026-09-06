import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "../derive";
import { toneDotClass, toneTextClass } from "../derive";

export type RailDotShape = "solid" | "ring" | "spinner" | "draft";

export interface RailNodeProps {
  tone: Tone;
  /** Dot rendering. Defaults to "ring" when `big`, else "solid". `draft` is a
   *  hollow muted ring — the change exists but has never been deployed. */
  shape?: RailDotShape;
  big?: boolean;
  pulse?: boolean;
  isLast?: boolean;
  /** DOM id on the row, used as a scroll-into-view anchor (e.g. jump-to-live). */
  id?: string;
  children: React.ReactNode;
}

/**
 * **The dot is 8px and optically centred on the row's first line.** It was 10px
 * sitting 8px below that line's centre, which read as a marker floating beside
 * the row rather than belonging to it. The gutter came in from 34 to 24 and the
 * gap from 14 to 12 at the same time — the rail was spending 48px to place one
 * 8px mark. Jaseem's call on the board, August 2026.
 *
 * `mt-5` is that centring, and it is measured, not derived from the line box.
 * A row's first line is **32px** tall — its height comes from the overflow
 * menu button, not the 20px text line — and text centres on its CAP HEIGHT,
 * which sits ~2.9px below the line box's centre. Cap centre lands 23.9px below
 * the row top, so an 8px dot starts at 20. Aligning to the line box instead put
 * the dot 8.9px high, which is what read as "the dot is above the title".
 * The 14px spinner takes `mt-[17px]` to reach the same centre.
 *
 * **The gutter is 12 wide so the rail lands on the sheet header's own left
 * column.** With the page's 26px inset, a 12px gutter puts the dots' centre at
 * exactly the centre of the header's leading icon button — measured, 274px in
 * both cases. At 24 they sat 6px right of it, which read as a rail that nearly
 * lined up with the chrome above and missed.
 */
export function RailNode({ tone, shape, big, pulse, isLast, id, children }: RailNodeProps) {
  const resolved: RailDotShape = shape ?? (big ? "ring" : "solid");

  const dot =
    resolved === "spinner" ? (
      <Loader2 data-testid="rail-dot" className={cn("mt-[17px] h-3.5 w-3.5 flex-none animate-spin", toneTextClass(tone))} />
    ) : resolved === "draft" ? (
      <span data-testid="rail-dot" className="mt-5 h-2 w-2 flex-none rounded-full border-[1.5px] border-fg-muted bg-background" />
    ) : resolved === "ring" ? (
      <span data-testid="rail-dot" className={cn("mt-5 h-2 w-2 flex-none rounded-full border-[1.5px] border-current bg-background", toneTextClass(tone), pulse && "animate-pulse")} />
    ) : (
      <span data-testid="rail-dot" className={cn("mt-5 h-2 w-2 flex-none rounded-full", toneDotClass(tone), pulse && "animate-pulse")} />
    );

  return (
    <div id={id} className="flex items-stretch gap-3 scroll-mt-24">
      <div className="flex w-3 flex-none flex-col items-center">
        {dot}
        {/* **Nudged half a pixel so the line lands ON a pixel.** Centred in a
            12px gutter a 1px rule sits at x.5, straddling two device pixels: it
            renders soft and grey while the 8px dot above it renders crisp, and
            a soft line beside a hard dot reads as misaligned even though the
            geometry is exact (measured delta: 0). */}
        <span
          data-testid="rail-connector"
          className={["mt-1 w-px flex-1 translate-x-[0.5px] bg-border", isLast ? "invisible" : "visible"].join(" ")}
          style={{ minHeight: isLast ? 0 : 16 }}
        />
      </div>
      <div className={["min-w-0 flex-1", isLast ? "pb-1" : "pb-8"].join(" ")}>{children}</div>
    </div>
  );
}
