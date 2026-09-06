import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        // **`flex-nowrap`, and the last crumb truncates.** This ran
        // `flex-wrap break-words`, so a long object name broke onto a second
        // line — the header grew a row, the tab strip moved down, and the
        // band's fixed height stopped being fixed. A trail is one line by
        // definition: it says where you are, and "where you are" cannot be a
        // paragraph. `min-w-0` so the flex parent may actually shrink it.
        "text-muted-foreground flex min-w-0 flex-nowrap items-center gap-1.5 text-body sm:gap-2.5",
        className
      )}
      {...props}
    />
  )
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  )
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn("hover:text-foreground transition-colors", className)}
      {...props}
    />
  )
}

/**
 * The crumb you are already on — and `asChild` is not decoration.
 *
 * The last crumb is the PAGE TITLE (§12a), and on a detail page that title is
 * an object's name that can be renamed. Without `asChild` the rename control
 * could not BE the crumb, so it was rendered beside one instead — carrying its
 * own type, which is how the trail came to read `Stacks` at 14 and
 * `auth-gateway` at 16, one separator apart.
 *
 * `BreadcrumbLink` has had `asChild` since it was written, because a crumb
 * that navigates has to become a router `Link`. This is the same need one
 * element along, and its absence is why the two were not one thing.
 *
 * The a11y attributes stay on whatever it renders as: `aria-current="page"` is
 * what tells a screen reader which crumb is the destination, and it belongs on
 * the element the user actually reaches.
 */
function BreadcrumbPage({
  asChild,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      // **No weight here.** It carried `font-normal`, which is a statement
      // about the page title's rung — and that belongs to `PageTitle`, which
      // owns it for both of this slot's shapes. Worse, under `asChild` the two
      // classes are CONCATENATED by Slot rather than merged by `cn`, so
      // `tailwind-merge` never sees the conflict and the winner is decided by
      // stylesheet order instead of by the caller. Measured: the title came
      // back at weight 400 with `font-medium` sitting right there in the class
      // list. The element owns the a11y attributes and the ink; the caller
      // owns the type.
      className={cn("text-foreground", className)}
      {...props}
    />
  )
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("flex-none [&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  )
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-8 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
