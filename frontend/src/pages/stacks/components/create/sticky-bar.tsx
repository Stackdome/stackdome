import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * The controls above a long list stay put while the list scrolls under them.
 *
 * **A search box that scrolls away is a search box you cannot reach.** These
 * catalogues run to dozens of rows, and the one control that makes them usable
 * was the first thing to leave the screen.
 *
 * **The edge is §12a's dissolve, not a rule and not a scrim.** 8px of the
 * sheet's own colour fading to transparent on the underside, so a row sliding
 * beneath is never sliced. `-mb-2` cancels its height, so it costs nothing in
 * flow. §12a's other half applies here too: **dissolve or hairline, never
 * both** — the boundary should be felt, not seen, because nothing below it is
 * a separate region.
 *
 * **The colour is `card`, not `background`.** This sits on the content sheet,
 * which is white (§3); `background` is the paper frame and painting it here
 * lays a grey band across the sheet.
 *
 * `pt-5 -mt-5 -top-5`: the drawer body's own 20px inset scrolls away, so
 * once the bar pins it would sit hard against whatever is above. The padding
 * paints that 20 back as part of the bar and the negative margin keeps it out
 * of layout, so nothing moves before you scroll. It was 16 on the page this
 * flow used to be; the drawer body is p-5, so the three numbers moved together.
 * They must stay equal to the container inset or the bar pins in the wrong
 * place.
 *
 * **`-top-5` is not optional.** Sticky constrains the MARGIN box, so a −20
 * margin pins the painted edge 20px LOW and a row stays visible in the gap
 * above the bar. Offsetting the stick point by the same −20 puts the painted
 * edge back on the scrollport. Measured, not reasoned: it shipped wrong first.
 */
export function StickyBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("bg-card sticky -top-5 z-10 -mt-5 pt-5", className)}>
      {children}
      <div
        aria-hidden
        className="from-card pointer-events-none -mb-2 h-2 bg-gradient-to-b to-transparent"
      />
    </div>
  )
}
