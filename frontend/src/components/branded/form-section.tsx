import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { HelpTip } from "./field-shell";

/**
 * A group of fields inside a long form — **a heading and its own air, never a
 * card and (since August 2026) not a rule either.**
 *
 * Grey means pushed back into the frame (§3) and a section is the surface's own
 * content, so it gets no fill and no border box.
 *
 * ### What separates one section from the next is SPACE
 *
 * It used to be a full-bleed hairline, and the resource drawer is where that
 * failed loudly enough to measure. Every gap in its body was **16** — title to
 * its first field, field to field, last field to the rule, rule to the next
 * title — so the section heading sat dead centre in an unbroken 16px lattice,
 * at `body/500` in ink, which is **byte-for-byte the field label underneath
 * it**. Neither type nor space said a subject had changed. The line was
 * carrying the whole boundary alone, seven of them in one scroll, and the panel
 * read as a stack of boxes with a heading floating in each seam.
 *
 * §11 settled the same argument for lists: *a separator has to earn its place
 * by grouping*, and it cannot when the space either side of it is identical.
 * Give the space a ratio and the line has nothing left to do.
 *
 * | Gap | Was | Is |
 * |---|---|---|
 * | Heading → its first field | 16 | **8** |
 * | Field → field | 16 | 16 |
 * | Section → section | 16 · rule · 16 | **32**, no rule |
 *
 * 4 : 2 : 1, and the total is unchanged — the drawer is not one pixel longer
 * for it. The 16 that sat *above* the heading, doing nothing but centring it,
 * moved to the boundary where a reader actually needs it.
 *
 * ### And the heading gets its own rung
 *
 * `name/500` (14), one step above the `body/500` field labels it introduces.
 * §6 asks for weight or colour before size — neither is available here: weight
 * is already a binary and both lines are *the thing*, and colour can only push
 * the heading DOWN the ladder, below the fields it ranks. So size does it, at
 * the smallest step the scale has.
 *
 * ### Two shapes, one component
 *
 * | | |
 * |---|---|
 * | **Always open** (default) | The heading, then the fields. For a group you have to read |
 * | **`collapsible`** | A leading chevron, the label, then a **state word** — `Environment · 4 variables`. For a group most people never open |
 *
 * They are one component because they are one design, and because keeping them
 * apart is how the addon drawer ended up with two disclosures that looked
 * identical at rest and answered the pointer differently.
 *
 * **A collapsible section stays at `body/500` and keeps its rule.** It is a
 * *fold*, not a peer of the sections above it: it nests inside one, and a band
 * you can press needs an edge to read as a band. That single line is the only
 * one left in the body, which is what makes it legible as an affordance rather
 * than as another seam.
 *
 * ### Tools for the group sit ON its heading line
 *
 * `actions` is right-aligned on the same row as the label. The Environment
 * section is why it exists: `clear all`, `paste .env` and `import file` were
 * three hand-rolled bordered chips on a row of their own, **under** the heading
 * and above the list — so a group of eleven fields opened with a right-aligned
 * strip of borders that belonged to neither the heading nor the content, and
 * the heading it acted on was 24px away with nothing joining them.
 *
 * On the heading row they are what they are: the tools for this subject. The
 * row was already there and half empty, three borders leave the panel, and the
 * list starts where the heading says it does.
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
  help,
  actions,
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
  /**
   * A gloss on the group, behind a `?` on the heading row — the same mark
   * `FieldShell` puts beside a field label, from the same export.
   *
   * **`state` and `help` are not the same slot.** `state` is a FACT about the
   * group that changes with it — `4 variables`, `none`, `git repository` — and
   * it earns a permanent line because it is different every time you look. A
   * gloss never changes, so a section that always reads `runs before the main
   * container` is spending a line of the panel restating its own title. That
   * belongs behind the mark.
   */
  help?: ReactNode;
  /**
   * Controls that act on the whole group, right-aligned on the heading row —
   * `clear all`, `paste .env`. Use `Button` at `ghost`/`sm`; anything that
   * needs a border here is competing with the fields below it.
   *
   * Not for the control that ADDS a member. `Add port`, `Add variable` and
   * `Add mount` stay at the end of the list they extend, where the next row
   * will appear — a create button that jumps to the header stops pointing at
   * its own result.
   */
  actions?: ReactNode;
  /** Hide the content behind a disclosure. Reach for it only when most readers never open the group. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (collapsible) {
    return (
      <Collapsible defaultOpen={defaultOpen} className={cn("relative -mx-5 border-t border-border-subtle first:border-t-0", className)}>
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
        {/* Outside the trigger, deliberately: a `?` INSIDE the button that opens
            the section would toggle it on the way to its own tooltip. */}
        {help && (
          <span className="absolute right-5 top-4 flex h-5 items-center">
            <HelpTip>{help}</HelpTip>
          </span>
        )}
        <CollapsibleContent>
          <div className={cn(SECTION_CONTENT_INSET, "flex flex-col gap-4 pb-4")}>{children}</div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    // **20 above, 16 to its fields, 32 below — and a `subtle` rule under it.**
    //
    // The rule is back, and it is not the one that left. That one was
    // `--border` (11%) sitting in the middle of an unbroken 16px lattice, so it
    // was carrying the whole boundary on its own. This one is `border-subtle`
    // (6%) closing a group that has ALREADY been separated by space: 32 below
    // the last field against 16 between two of them. The line confirms the
    // boundary rather than being it, which is why it can be half the ink.
    //
    // The heading sits 16 off its own fields, not 8. At 8 it bound tightly
    // enough to read as a label ON the first field rather than over the group.
    <div
      className={cn(
        // **The section owns its inset; the body owns none.**
        //
        // It used to be `-mx-5 px-5` — a negative margin cancelling the body's
        // own 20 so the rule could reach both edges. That worked for the rule
        // and doubled the padding at the TOP: the body spent 20 before the
        // first section, and the section spent 20 again, so `General` opened
        // 40 below the header while every later heading sat at 32. A section
        // that pays its own inset needs no cancelling, and the rule reaches the
        // edges because nothing is holding it in.
        "border-b border-border-subtle px-5 pb-8 pt-5 last:border-b-0",
        className,
      )}
    >
      <div className="flex items-baseline gap-2">
        <h3 className="flex min-w-0 items-baseline gap-2 text-name font-medium text-foreground">
          {label}
          {/* On the heading, not after the state: the mark annotates the NAME
              of the group, and a `?` trailing a changing fact reads as a
              question about that fact. */}
          {/* `-ml-1.5`: the h3's own gap is 8 and it is spoken for — it also
              spaces the `state` beside it — so the mark pays the difference
              here. 8 − 6 + the box's 4px of air lands the seen gap on 6. */}
          {help && <HelpTip className="-ml-1.5">{help}</HelpTip>}
          {state && <span className="truncate text-meta font-normal text-fg-muted">{state}</span>}
        </h3>
        {actions && <div className="ml-auto flex flex-none items-center gap-1 self-center">{actions}</div>}
      </div>
      <div className="flex flex-col gap-4 pt-4">{children}</div>
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
