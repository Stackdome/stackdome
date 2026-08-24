import * as React from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { BreadcrumbProvider } from "@/contexts/breadcrumb-context";
import { SheetHeader } from "@/components/sheet-header";
import { PEER_SHEET_SLOT_ID } from "@/components/ui/drawer";
// The provider stays mounted here; the crumb building it feeds moved into
// `SheetHeader`, and `stacks/editor` sets the lineage.
import { PreviewLineageProvider } from "@/contexts/preview-lineage-context";
import { HeaderCollapseContext } from "@/pages/stacks/lib/canvas/header-collapse";
import { useGithubSetupLanding } from "@/hooks/use-github-setup-landing";
import { NEW_STACK_PATH } from "@/pages/stacks/lib/routes";

function AppLayoutContent({
  children,
  defaultSidebarOpen = true,
}: {
  children?: React.ReactNode;
  /** Start with the sidebar collapsed to its 56px rail. Stories use this to
   *  show the collapsed shell; the user's own toggle takes over from there. */
  defaultSidebarOpen?: boolean;
}) {
  useGithubSetupLanding();
  const location = useLocation();

  /**
   * **Zen mode: the header folds away so the canvas gets the whole sheet.**
   *
   * The state lives here rather than in the editor because on this branch the
   * editor draws no header of its own — it portals its title, status and tabs
   * into the sheet header above (§12a), and that header belongs to the layout.
   * `HeaderCollapseContext` is what lets the canvas control reach it without
   * threading a prop through five components that do not care.
   *
   * **Not persisted, where main persisted it per stack.** main had a slim
   * collapsed HEADER to fall back to; here the band goes entirely, and a mode
   * that hides your chrome and survives a reload is a mode people get stuck in.
   * It is a thing you turn on to read a big graph, and a reload gives it back.
   */
  const [headerCollapsed, setHeaderCollapsed] = React.useState(false);
  const collapseCtx = React.useMemo(
    () => ({ collapsed: headerCollapsed, setCollapsed: setHeaderCollapsed }),
    [headerCollapsed],
  );
  // Leaving the canvas leaves zen — the mode is about a graph, and every other
  // screen needs its trail back.
  React.useEffect(() => {
    setHeaderCollapsed(false);
  }, [location.pathname]);

  /**
   * Full-bleed: **the canvas editor, and only the canvas editor** —
   * `/stacks/draft` and `/stacks/<id>`. It draws to the sheet's own edges and
   * pins its own footer, so it cannot sit inside the standard 16px page
   * padding. A single trailing segment only, so `/stacks` itself is unaffected.
   *
   * **`/stacks/new` is excluded, and that is a fix, not an exception.** It was
   * in here because the New stack journey used to be a full PAGE with a
   * full-bleed strip of five tabs across the top. That page is gone — the
   * journey is a drawer now — so the route renders the ordinary stacks LIST
   * with a drawer over it, and stripping the padding stripped it from the list.
   *
   * The symptom was that opening New stack made the page behind it jump: the
   * rows slid 16 left and 16 up, measured, because their container lost the
   * inset that every other page keeps. Nothing about the drawer caused it —
   * the route did, and the rule outlived the screen it was written for.
   */
  /**
   * **Previews is the second one, and for the same reason.** Its repository
   * rail is a REGION of the sheet: it meets the sheet's left edge, runs the full
   * height, and draws the seam between itself and the body with a hairline (§4).
   * Inside the standard 16px inset the rail would float 16px off the edge with a
   * strip of sheet showing beside it, and its hairline would stop short of both
   * ends — a boundary that does not reach either side reads as a mistake.
   *
   * The page pays for the exception itself: the body column supplies the 16px
   * the shell stopped supplying, so the rows land on the same left edge as the
   * title above them.
   *
   * Both segments, because `/previews/<repo>` is the same screen (§12a).
   */
  const isPreviews = /^\/previews(\/[^/]+)?$/.test(location.pathname);

  const isFullBleed =
    isPreviews ||
    (/^\/stacks\/[^/]+$/.test(location.pathname) && location.pathname !== NEW_STACK_PATH);

  return (
    <HeaderCollapseContext.Provider value={collapseCtx}>
      <SidebarProvider defaultOpen={defaultSidebarOpen}>
        {/* 8px gutter on every free edge (§12). The sidebar sits flush to the
          window's left edge; the sheet is inset from the other three.

          The board tightened this from 12 to 8: the frame is a MOUNT, not a
          margin. At 12 the grey read as a band of its own around the sheet;
          at 8 it reads as the edge the sheet is seated in, and the content
          plane gets the 8px back on both axes. */}
        <div className="flex h-screen max-h-screen w-full overflow-hidden bg-background py-2 pr-2">
          <AppSidebar />
          {/* The content plane is a white sheet floating on the paper frame —
            white floats, grey recedes. The sidebar needs no divider: the
            sheet's own edge draws the seam. */}
          {/* The sheet's hairline is an OUTLINE, not a border — the board draws
            it as an outside stroke, which is not part of the frame's 1186×876.
            A `border` would be, and it pushed the header's row down by 1px,
            which is exactly what put the two planes' centrelines out of step.
            `outline` paints outside the box, follows the radius, and costs the
            layout nothing.

            `ml-0.5` is the board's 2px gap between the rail and the sheet, and
            it is load-bearing rather than decorative: an outline is painted
            OUTSIDE the box, so with the two columns flush the left edge of it
            landed under the `fixed` sidebar and was clipped away. The gap is
            what lets the card be a card on all four sides.

            The line is `border-subtle` (6%), not the 11% hairline — the shadow
            now does the separating, so the edge only has to describe the shape. */}
          <SidebarInset className="ml-0.5 min-h-0 overflow-hidden rounded-lg bg-card shadow-md outline-1 outline-border-subtle">
            {/* The scroll container is a flex column so the header can be a
              sticky block of ANY height and nothing downstream needs to know
              what that height is. The old layout hardcoded `top-[52px]` in
              three places and `calc(100% - 52px)` in a fourth; the header is
              now 64px or 108px depending on whether the page has a toolbar, so
              every one of those numbers was about to become wrong. */}
            <div className="flex min-h-0 flex-grow flex-col overflow-auto scrollbar-hide">
              {/* Header, the page's sticky bar and the fade travel together as
                one sticky block pinned to the top of the sheet. */}
              <div className="sticky top-0 z-40 shrink-0">
                {/* Chrome, not content: 32px hit area, 16px glyph, fg-2.
                  Zen folds it with the same grid-rows trick the rail uses, so
                  the band travels rather than blinking out; `inert` keeps its
                  controls off the tab order while it is closed. */}
                <div
                  className="grid transition-[grid-template-rows] duration-[--rail-duration] ease-[var(--ease-panel)] motion-reduce:transition-none"
                  style={{ gridTemplateRows: headerCollapsed ? "0fr" : "1fr" }}
                  inert={headerCollapsed}
                  aria-hidden={headerCollapsed}
                >
                  <div className="overflow-hidden">
                    <SheetHeader leading={<SidebarTrigger className="size-8 text-fg-2" />} />
                  </div>
                </div>
                {/* Forms pin a save bar directly beneath the header. */}
                <div id="page-sticky-bar" />
                {/* No fade. The band now carries a 1px hairline, and a dissolve
                  under a crisp line is two answers to the same question — the
                  gradient only blurred the 8px directly beneath the rule and
                  weakened it. Content is cut by the line instead. */}
              </div>

              {/* Both branches carry `data-slot="page-content"`. The two are
                addressed by the same name because they are the same slot in two
                states, and because matching on `.px-4` picks up the sheet
                header, which happens to use the same utilities. */}
              {isFullBleed ? (
                <div data-slot="page-content" className="min-h-0 flex-1">
                  {children ? children : <Outlet />}
                </div>
              ) : (
              /* The sheet's content edge is 16px — the SAME edge the header
                 uses (§12a). It ran at 32px, so the page title sat on one edge
                 and everything under it on another, 20px in, with nothing on
                 screen explaining why.

                 `max-w-6xl` is gone with it. It capped the body at 1152 while
                 the header spanned the full sheet, so above 1280 the two
                 planes drifted apart — a second alignment bug waiting for a
                 wider monitor. A row's BOX lands on the edge and its text sits
                 8px inside, so the hover wash extends past the name. */
                <div data-slot="page-content" className="px-4 py-4">
                  {children ? children : <Outlet />}
                </div>
              )}
            </div>
          </SidebarInset>
          {/* **The peer sheet** (§15). A detached `DrawerRegion` portals itself
            in here, and while it is empty the div is zero-wide with no gap —
            the main sheet keeps the whole plane.

            It is a SIBLING of the sheet, not a region inside it, which is the
            whole point: the node inspector gets its own edge, its own radius
            and its own shadow, with 8px of the paper frame showing between the
            two cards. `ml-2` is that gutter; `pr-2` on the frame supplies the
            matching one on the far side.

            `empty:hidden` rather than conditional rendering, because the slot
            has to be in the DOM *before* the region looks for it. */}
          <div id={PEER_SHEET_SLOT_ID} className="peer-sheet min-h-0 [&>*]:ml-2" />
        </div>
      </SidebarProvider>
    </HeaderCollapseContext.Provider>
  );
}

export function AppLayout({
  children,
  defaultSidebarOpen,
}: {
  children?: React.ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  return (
    <PreviewLineageProvider>
      <BreadcrumbProvider>
        <AppLayoutContent defaultSidebarOpen={defaultSidebarOpen}>{children}</AppLayoutContent>
      </BreadcrumbProvider>
    </PreviewLineageProvider>
  );
}
