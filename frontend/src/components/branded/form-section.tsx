import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * A group of fields inside a long form — **a rule and a label, never a card.**
 *
 * Grey means pushed back into the frame (§3) and a section is the surface's own
 * content, so it gets no fill and no border box. What separates one group from
 * the next is a single full-bleed hairline: the cheapest mark that still says
 * "a new subject starts here", and the only one that survives eight of them in
 * one scroll without the form turning into a stack of boxes.
 *
 * ### Two shapes, one component
 *
 * | | |
 * |---|---|
 * | **Always open** (default) | The rule, then a `body/500` label. For a group you have to read |
 * | **`collapsible`** | A leading chevron, the label, then a **state word** — `Environment · 4 variables`. For a group most people never open |
 *
 * They are one component because they are one design, and because keeping them
 * apart is how the addon drawer ended up with two disclosures that looked
 * identical at rest and answered the pointer differently.
 *
 * ### A collapsible section must say what it is hiding
 *
 * `state` is not optional decoration. A closed section with only a name gives no
 * signal whether there is anything in it, so the only way to find out is to open
 * every one — which is the cost the collapse was supposed to save. The word goes
 * in the trigger at `meta`, weight 400: it is *about* the label, so §6's binary
 * puts it a tier down.
 *
 * ### It is an `h3`, not a styled div
 *
 * A long form's sections are the only structure in it, so they are the document
 * outline a screen reader has to navigate by.
 */
export function FormSection({
  label,
  state,
  collapsible,
  defaultOpen = false,
  children,
  className,
}: {
  label: ReactNode;
  /**
   * A fact about the group, a tier down and beside the label — `git repository`,
   * `4 variables`, `none`. Required in practice on a `collapsible` section (see
   * above); optional on an open one, where the content is already visible.
   */
  state?: ReactNode;
  /** Hide the content behind a disclosure. Reach for it only when most readers never open the group. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (collapsible) {
    return (
      <Collapsible defaultOpen={defaultOpen} className={cn("-mx-5 border-t border-border", className)}>
        <CollapsibleTrigger asChild>
          {/* The whole row is the target. A trigger that stops partway across —
              because something else shares its line — hovers to a seam, and two
              rows that look the same at rest must not behave differently.
              Anything else that wants a place goes in the surface's footer.

              The wash is `--wash-hover`, not a hand-thinned `bg-muted`: §3 keeps
              those apart, and thinning a ground by hand skips the ladder's dark
              correction so it lands a different distance in each theme. */}
          <button
            type="button"
            className="group focus-ring-edge flex w-full items-center gap-2 px-5 py-4 text-left text-body font-medium text-foreground transition-colors hover:bg-[var(--wash-hover)]"
          >
            <ChevronDown className="size-4 text-fg-muted transition-transform group-data-[state=open]:rotate-180" />
            {label}
            {state && <span className="text-meta font-normal text-fg-muted">{state}</span>}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={cn(SECTION_CONTENT_INSET, "pb-4")}>{children}</div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className={cn("-mx-5 border-t border-border px-5 pt-4", className)}>
      <h3 className="flex items-baseline gap-2 text-body font-medium text-foreground">
        {label}
        {state && <span className="text-meta font-normal text-fg-muted">{state}</span>}
      </h3>
      <div className="pt-4">{children}</div>
    </div>
  );
}

/**
 * **What a disclosure hides lines up with its own name, not with the edge.**
 *
 * The trigger spends 20 of inset, a 16 chevron and an 8 gap before the label —
 * so the word starts at 44, and content padded to the surface's own 20 sat 24 to
 * the LEFT of the thing that named it. Every field inside then read as belonging
 * to the form rather than to the section it had just been opened out of.
 *
 * This is that 44, derived from the trigger above it so the two cannot drift.
 */
const SECTION_CONTENT_INSET = "pl-11 pr-5";
