import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * **The page's own name, wherever it is drawn — one rung, one definition.**
 *
 * The trail's last segment IS the title (§12a), and it had **two
 * implementations that disagreed about how big it is.** A page whose name is
 * fixed rendered it through `BreadcrumbPage` at `name/500`; a page whose name
 * can be renamed rendered the same slot through `RenameableTitle` at
 * `title/500`. Measured on `/stacks/s5`: `Stacks` at 14/20 and `auth-gateway`
 * beside it at 16/24, in one trail, one separator apart.
 *
 * Neither was a decision. `sheet-header.tsx` carries a long comment settling
 * this rung — *"it settles at NAME size, one rung above the 13px body it
 * introduces, which is enough to lead without announcing"* — and the rename
 * control, written separately, never heard about it. That is the same failure
 * as the canvas node and the drawer drawing two different status dots for one
 * fact: two places drawing one thing will drift, and the fix is that there is
 * only one place.
 *
 * ### It is a class, not a wrapper, because the slot is three elements
 *
 * The title is a `<span>` when it is fixed, a `<button>` when it can be
 * renamed, and an `<input>` while it is being renamed. A component that owned
 * the markup could serve one of those; what all three actually share is the
 * **rung**. So the rung is the export, `PageTitle` is the plain case built on
 * it, and the rename control composes it into its own elements.
 *
 * **14/20 at weight 500.** It has moved several times — 16/24 at 600 (a
 * headline, too loud), then 14/20, back up to 16/24 on the app-shell board,
 * briefly 13/20. §6 settled it: *the page title is a label, not a headline.*
 * The sidebar already said which section you are in and the trail already said
 * it; the title does not need to announce it a third time in 20px.
 */
export const pageTitleClass = "text-name font-medium text-foreground";

/**
 * The fixed page title — the last crumb on a page that cannot be renamed.
 *
 * A page whose name IS the object's name uses `RenameableTitle` instead, which
 * draws the same rung from the same constant.
 */
export function PageTitle({
  children,
  className,
  ...props
}: React.ComponentProps<"span"> & { children: ReactNode }) {
  return (
    <span
      data-slot="page-title"
      // **A hard ceiling in characters, and an ellipsis under it.** The title
      // is whatever the object is called, and an object can be called anything
      // — 60 characters of `asdfasdf` wrapped the trail onto a second line and
      // pushed the tab row down with it. `32ch` is the cap; `min-w-0` lets the
      // flex row take it below that when the band is tight, so it gives way to
      // the actions rather than crushing them.
      className={cn(pageTitleClass, "block min-w-0 max-w-[32ch] truncate", className)}
      {...props}
    >
      {children}
    </span>
  );
}
