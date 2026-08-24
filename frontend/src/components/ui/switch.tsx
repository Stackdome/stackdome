import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * **The thumb sits in a 2px well on all four sides.**
 *
 * It did not. The track was `h-5 w-9` with `border` and no padding, and the
 * thumb was `size-4` translated by `calc(100% - 2px)`. Measured inside the
 * 34×18 content box that leaves:
 *
 * | | Left | Right | Top / bottom |
 * |---|---|---|---|
 * | Off | **0** | 18 | 1 |
 * | On | 14 | **4** | 1 |
 *
 * So off, the thumb was flush against the track's own border with no well at
 * all; on, it stopped 4px short. The eye reads that as the control being
 * lopsided rather than as the thumb having travelled — which is the one thing
 * a switch has to say.
 *
 * The fix is `p-0.5` on the track and a thumb that fills the height exactly, so
 * the 2px well is the padding itself rather than a number that has to agree
 * with one.
 *
 * ### It is a WELL, not a bordered pill — the same one the segmented control is
 *
 * The track shipped with a hairline and `--muted`: a border AND a fill, which
 * is the tone said twice (§7), and a solid grey where every other recessed
 * ground in the system is an alpha tint. `--well` is the tint the segmented
 * control's track already uses, and dropping the border is what makes the two
 * read as the same material rather than as a pill and a well.
 *
 * **The border was also load-bearing on the geometry, so both numbers moved.**
 * Without it the content box is 32 × 16, so the thumb is **16** (`size-4`) and
 * the travel is 32 − 16 = **16px** — still `translate-x-4`, still a rung.
 *
 * ### The thumb is the ink, and only while it is off
 *
 * `--primary` off, against the well; `--background` on, against the primary
 * track. It cannot be the ink in both states — a near-black thumb on a
 * near-black track is a switch with nothing in it. What stays constant is the
 * CONTRAST, which is the only thing the thumb has to hold.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-[var(--well)] inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        "focus-ring-edge",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full transition-transform data-[state=checked]:bg-background data-[state=unchecked]:bg-primary data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
