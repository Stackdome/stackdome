import * as React from "react";
import { Link, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { usePreviewLineage } from "@/hooks/use-preview-lineage";
import { RenameableTitle } from "@/components/renameable-title";
import { PageTitle } from "@/components/page-title";

interface BreadcrumbItemType {
  name: string;
  path: string;
  clickable: boolean;
}

/**
 * The top of the sheet (§12a) — **two parts, one component.**
 *
 *   1. The **title row** identifies the section: the collapse toggle, the page
 *      title, the page's one fact and its actions.
 *   2. The **toolbar row** holds the tools for that section — search, filters,
 *      sort, a view toggle. Whatever the section needs.
 *
 * The toolbar row is **conditional**, and it collapses itself: pages portal
 * into `#sheet-toolbar`, and `empty:hidden` removes the row when nothing
 * arrives. A `display:none` child takes no part in the flex gap either, so the
 * band falls from 108px to 64px with no height math anywhere.
 *
 *   16 + 32 + 16           = 64   title row only
 *   16 + 32 + 12 + 32 + 16 = 108  with a toolbar
 *
 * **The padding is 16 and the gap between rows is 12.** They are deliberately
 * not the same number: the outer inset is the sheet's own margin, the inner one
 * is the distance between two rows of controls.
 *
 * Measurements come from the `app shell` Figma board. The band carries a **1px
 * bottom hairline**, full sheet width, drawn INSIDE the 108 — content is cut by
 * it as it scrolls under, rather than dissolving into it.
 *
 * ### Journeys get an exit; nested pages get a trail
 *
 * A page that calls `useJourney(origin)` is declaring itself a **task launched
 * from a main screen** — `New stack` — rather than a place you navigated down
 * into. The header then renders a back arrow and **the title alone.**
 *
 * The trail is dropped on purpose. The sidebar is always on screen with the
 * section highlighted, so `Stacks /` would be the *third* way back off one
 * screen, and it pushes the page title into third position. The two marks were
 * never doing the same job: a crumb says *where you are*, an arrow says *this
 * is a task you can leave* — and only the second was unmet.
 *
 * Back steps through **history**, so it returns you the way you came. Deep
 * linked, with nothing to step back to, it falls back to the journey's origin.
 */
export function SheetHeader({ leading }: { leading?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const {
    customLabels,
    loadingLabels,
    nonClickablePaths,
    journeyOrigin,
    selectionPaths,
    renameHandlers,
  } = useBreadcrumb();
  const { lineage } = usePreviewLineage();

  const pathSegments = location.pathname.split("/").filter(Boolean);

  // There is no "Home" crumb. Every top-level destination is one click away in
  // the sidebar, so a Home hop says nothing the frame isn't already saying —
  // and it pushed the real page title out of first position. The trail's LAST
  // segment is the page title (§12a).
  const breadcrumbItems: BreadcrumbItemType[] = pathSegments.map(
    (segment, index): BreadcrumbItemType => {
      const path = "/" + pathSegments.slice(0, index + 1).join("/");
      const clickable = !nonClickablePaths[path];
      if (index === pathSegments.length - 1 && loadingLabels?.[path]) {
        return { name: "...", path, clickable };
      }
      if (customLabels[path]) {
        return { name: customLabels[path], path, clickable };
      }
      const name = segment.charAt(0).toUpperCase() + segment.slice(1);
      return { name, path, clickable };
    },
  );

  // A segment registered as an in-page SELECTION is dropped from the trail
  // entirely: `/previews/<repo>` is the previews screen with that repository
  // picked in its rail, not a page below it. §12a bans such a selection from
  // renaming the title, and a crumb is the same claim in the same band — it
  // would offer a way back to a screen you never left. The address still
  // resolves, because people have it bookmarked.
  // **A preview stack belongs to its preview config, not to Stacks.**
  // Carried over from main at the merge, where it lived in `app-layout`'s own
  // crumb builder — this branch had already moved crumb building in here, so
  // neither side of that conflict had both halves. A preview environment sits
  // at `/stacks/<id>` like any other stack, and without this its trail claims
  // it came from the Stacks list, which is not where the reader was and not
  // where Back should take them. The ancestors REPLACE the leading crumb
  // rather than joining it, for the same reason.
  const previewAncestors: BreadcrumbItemType[] | null = lineage
    ? [
      { name: "Previews", path: "/previews", clickable: true },
      {
        name: lineage.configName ?? "…",
        path: `/previews/${lineage.configId}`,
        clickable: !!lineage.configName,
      },
    ]
    : null;

  const withLineage = previewAncestors
    ? [...previewAncestors, ...breadcrumbItems.slice(1)]
    : breadcrumbItems;

  const placeItems = withLineage.filter((item) => !selectionPaths[item.path]);

  // A journey shows its title alone (§12a). The trail's last segment IS the
  // title, so keep that and drop the wayfinding in front of it: the sidebar
  // already says which section you are in, and the arrow is the way out.
  const trailItems = journeyOrigin ? placeItems.slice(-1) : placeItems;

  function goBack() {
    // Did we arrive here by navigating inside the app? Only then is there an
    // entry to step back to. A deep link, a fresh tab or a reload all arrive as
    // POP, and stepping back from those leaves the product entirely — so those
    // fall back to wherever the journey is launched from.
    if (navigationType === "PUSH") navigate(-1);
    else navigate(journeyOrigin ?? "/");
  }

  return (
    <div className="sheet-edge-b flex flex-col gap-3 bg-card px-4 py-4">
      {/* ── 1. Title row — what section am I in, and what can I do to it? ── */}
      <div className="flex h-8 items-center gap-1.5">
        {leading}
        {journeyOrigin && (
          <>
            {/* The divider separates chrome belonging to the SHELL (collapse)
                from chrome belonging to THIS JOURNEY (back). */}
            <div aria-hidden className="bg-border h-5 w-px flex-none" />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-fg-2"
              onClick={goBack}
              aria-label="Back"
            >
              <ArrowLeft />
            </Button>
          </>
        )}
        {/* **The same path the drawer draws, one rung down.**
            The two were built apart and drifted on five separate details: the
            trail ran 400 where the drawer's steps run 500, in `fg-2` against
            the drawer's `fg-muted`, its separator was knocked back a further
            50%, the steps sat 8px apart instead of 6, and a hovered crumb
            changed colour with no underline while a hovered step got both. None
            of that was a decision — it is two implementations of one idea.

            **The size stays different, and that one IS a decision.** A drawer
            step is `title/500` because it is the drawer's title; a sheet crumb
            is `body` under a `name/500` title (§12a). The rung differs; the
            treatment should not. */}
        {/* `min-w-0`: without it a flex child refuses to go below its content
            width, so the trail pushed the actions off the row instead of
            truncating. This is the one element on the band that gives way. */}
        <Breadcrumb className="min-w-0">
          {/* **The whole trail is `name/500` — 14/20 at weight 500.** The
              breadcrumb used to run at body size with the current page one rung
              above it, which made the seam between "where you are" and "how you
              got here" a SIZE change. It is a weight and a colour change now;
              the trail and its last item are the same rung. Sheet, drawer and
              page header all come through here, so they cannot drift apart. */}
          <BreadcrumbList className="text-name font-medium gap-1.5 sm:gap-1.5">
            {trailItems.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <BreadcrumbSeparator className="text-fg-muted font-normal [&>svg]:hidden">
                    <span>/</span>
                  </BreadcrumbSeparator>
                )}
                {index === trailItems.length - 1 && renameHandlers[item.path] ? (
                  // **The title renames itself.** A page registers a handler to
                  // say its name is the object's name and can be changed; a
                  // page that does not gets the plain title below. See
                  // `registerRename`.
                  <BreadcrumbItem className="min-w-0">
                    {/* **It IS the crumb, not something beside one.** It used
                        to render outside `BreadcrumbPage`, which cost it
                        `aria-current="page"` — the attribute that tells a
                        screen reader which crumb is the destination — and left
                        it free to carry its own type, which it did, at the
                        wrong rung. Both branches are the same element now. */}
                    <BreadcrumbPage asChild>
                      <RenameableTitle name={item.name} onRename={renameHandlers[item.path]} />
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                ) : index === trailItems.length - 1 ? (
                  <BreadcrumbItem className="min-w-0">
                    {/* The page title. The trail before it is wayfinding.
                        **The rung lives in `PageTitle`** — this branch and the
                        renameable one above it are the same slot, and they
                        disagreed about its size for as long as they each
                        carried their own classes. */}
                    <BreadcrumbPage asChild>
                      <PageTitle>{item.name}</PageTitle>
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                ) : !item.clickable ? (
                  <BreadcrumbItem className="flex-none">
                    <span className="text-fg-muted font-medium whitespace-nowrap">{item.name}</span>
                  </BreadcrumbItem>
                ) : (
                  <BreadcrumbItem className="flex-none">
                    <BreadcrumbLink
                      asChild
                      className="text-fg-muted font-medium whitespace-nowrap transition-colors hover:text-foreground hover:underline underline-offset-4"
                    >
                      <Link to={item.path}>{item.name}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                )}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* **The fact that belongs to the TITLE, not to the row.**
            §12a puts the page's one fact on the right, opposite the title, and
            that is right for a fact ABOUT the page — `20 stacks` counts what
            the list is showing, and it belongs with the tools that change the
            count.

            A detail page's status is not that. `Degraded` is a property of
            `orders-api` itself, and read from the far end of a 1200px bar it
            has nothing to attach to — the eye has to travel back to the name to
            learn what is degraded. Beside the name it is one phrase.

            12px from the trail: 6 from the row's own gap, 6 from here. */}
        <div id="sheet-identity" className="ml-1.5 flex flex-none items-center gap-2 empty:hidden" />

        {/* The page's actions. Only things scoped to the page you are looking
            at may land here; global helpers stay in the grey frame. 8px
            between actions.

            **The type size is the Button's own.** This carried
            `[&_button]:text-name`, which put every button in the band at 14 —
            and there is no 14px button in the system: every size runs at
            `text-body`, height is the only thing a size changes (§6). Because
            a container rule outranks the button's own class, a call site could
            not opt out; the stack editor had to force `!text-body` back onto
            its row just to get the documented size. Nothing here sets type. */}
        <div id="topnav-actions" className="ml-auto flex flex-none items-center gap-2" />
      </div>

      {/* ── 2. Toolbar row — the tools for that section. Conditional. ── */}
      <div id="sheet-toolbar" className="flex h-8 items-center gap-1.5 empty:hidden" />
    </div>
  );
}
