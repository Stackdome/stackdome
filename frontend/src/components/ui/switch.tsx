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
 * The fix is `p-0.5` on the track and a 14px thumb. 20 − 2 border − 4 padding
 * = 14, so the thumb fills the height exactly and the 2px well is the padding
 * itself rather than a number that has to agree with one. Travel is then
 * `w-9` − 2 − 4 − 14 = **16px**, which is `translate-x-4` — a rung, not a
 * `calc` tuned against the thumb's own width.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=unchecked]:bg-muted data-[state=unchecked]:border-border inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        "focus-ring-edge",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-3.5 rounded-full transition-transform data-[state=checked]:bg-background data-[state=unchecked]:bg-muted-foreground data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
