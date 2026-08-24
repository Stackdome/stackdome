import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * **More options, behind a control — not behind a section.**
 *
 * The other disclosure in the system is `FormSection collapsible`: a full-bleed
 * band with its own rule, its own hover wash and a 44px content inset. That one
 * is a SECTION you can fold — a peer of the sections above it, holding a
 * subject of its own.
 *
 * This is not that. It is a **control inside a group**, revealing a few more
 * fields of the same subject — `Advanced — build & push`, `Advanced — stackfile
 * and image overrides`. Giving those a section's chrome draws a full-width rule
 * across the panel to hide four inputs, and gives one group a second group's
 * frame.
 *
 * | | |
 * |---|---|
 * | Trigger | `ghost` at `sm`, **its own width**, `-mx-2 px-2` so the LABEL lands on the group's edge |
 * | Ink | `fg-2` — it is a way in, not the subject |
 * | Chevron | `ChevronRight` that **turns 90°**, never a swapped glyph |
 * | Content | Unmounted while closed, at the group's own gap |
 *
 * **The chevron turns rather than swapping.** One shape moving is read faster
 * than two shapes alternating, and a rotation carries the direction — down means
 * open — where a substituted `▾` only asserts it.
 *
 * **A single chevron OPENS what is under it; a pair PICKS a value** (§7). This
 * is the single, and it points right when closed because what is hidden is
 * *after* the label, not below the whole group.
 *
 * ### Name the thing, not the difficulty
 *
 * `Advanced` alone names a difficulty, so the only way to learn whether the
 * field you want is behind it is to open it. Say what is in there — `Advanced —
 * build & push`. The em dash is the pattern: the word people scan for, then the
 * contents.
 */
export function Disclosure({
  label,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: {
  /** `Advanced — build & push`. Name the contents, never the difficulty. */
  label: React.ReactNode;
  defaultOpen?: boolean;
  /** Pass with `onOpenChange` where the owner needs the state — a form that
   *  opens the group because a field inside it failed validation. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolled;
  const toggle = () => {
    if (controlledOpen === undefined) setUncontrolled((v) => !v);
    onOpenChange?.(!open);
  };

  return (
    <>
      {/* `-mx-2 px-2`: a ghost has no visible box, so the button is pulled back
          by its own padding to put the LABEL on the group's left edge rather
          than 8px inside it. Same correction every ghost on a form edge takes. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        className={cn("-mx-2 self-start px-2 text-fg-2", className)}
        onClick={toggle}
      >
        <ChevronRight
          className={cn(
            "transition-transform duration-150",
            open && "rotate-90",
          )}
        />
        {label}
      </Button>
      {/* Unmounted, not hidden. A closed group's inputs are not in the tab
          order, and a validation error inside one cannot be read by a screen
          reader from a box nobody can reach — the owner opens it instead. */}
      {open && children}
    </>
  );
}
