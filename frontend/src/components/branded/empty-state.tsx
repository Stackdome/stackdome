import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** A glyph or illustration. See `SearchGlyph` / `StackArchitectureGlyph`. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * A page or list with nothing in it (§11).
 *
 * **There is no box.** It used to draw a dashed bordered panel, which
 * re-introduced exactly the frame §11 removes from lists — the state sits ON
 * the sheet, like the rows it replaces.
 *
 * The type is deliberately quiet: `text-body` medium over `text-meta` muted.
 * An empty state is not a headline, and a page that says nothing does not get
 * to shout about it. Settled on the Shape + Hierarchy board (nodes `199:2386`,
 * `199:2399`).
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 px-10 py-18 text-center",
        className,
      )}
    >
      {icon && <div className="text-fg-2">{icon}</div>}
      {/* 4px between the two lines — they are one statement, not two. The
          description is capped at 292px (the board's measure): unbounded, it
          ran the full 1000px of the sheet as a single line, which reads as a
          system message rather than as copy. */}
      <div className="flex flex-col items-center gap-1">
        <div className="text-body font-medium text-foreground">{title}</div>
        {description && (
          <p className="text-meta max-w-[292px] text-balance text-fg-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}


/* ───────────────────────────────────────────────────────────────────────────
   The empty-state illustrations.

   **These are exported artwork, not drawn in code.** Each state ships as a
   light/dark PAIR straight out of the Shape + Hierarchy board, and the theme
   picks one — the same arrangement `provider-logo.tsx` already uses for the
   GitHub mark. Redrawing them here with tokens was tried and thrown away: the
   art is the designer's, and a hand-rebuild is a second copy that drifts.

   Placement is the board's (nodes `199:2386`, `199:2399`, `310:15106`):

   | State         | Art      | Gap to text |
   |---------------|----------|-------------|
   | No results    | 62 × 62  | 20          |
   | No stacks     | 222 × 132| 24          |
   | No connection | 222 × 132| 24          |
   | No secrets    | 222 × 132| 24          |

   The two large ones therefore pass `className="gap-6"` at the call site;
   `EmptyState`'s own default of 20 is the small state's number.
   ─────────────────────────────────────────────────────────────────────────── */

import noStacksLight from "@/assets/empty-states/no-stacks-light.svg";
import noStacksDark from "@/assets/empty-states/no-stacks-dark.svg";
import noConnectionLight from "@/assets/empty-states/no-connection-light.svg";
import noConnectionDark from "@/assets/empty-states/no-connection-dark.svg";
import noResultsLight from "@/assets/empty-states/no-results-light.svg";
import noResultsDark from "@/assets/empty-states/no-results-dark.svg";
import noSecretsLight from "@/assets/empty-states/no-secrets-light.svg";
import noSecretsDark from "@/assets/empty-states/no-secrets-dark.svg";

function Art({
  light,
  dark,
  width,
  height,
  /** The board's art box, when the SVG carries shadow bleed around it. */
  box,
  offset,
}: {
  light: string;
  dark: string;
  width: number;
  height: number;
  box?: { width: number; height: number };
  offset?: { left: number; top: number };
}) {
  const img = "absolute max-w-none";
  return (
    <div
      aria-hidden
      className="relative"
      // Layout sees the ART, not the bleed — otherwise the shadow pads one side
      // and the illustration sits off the centreline the board specifies.
      style={{ width: box?.width ?? width, height: box?.height ?? height }}
    >
      <img
        src={light}
        alt=""
        width={width}
        height={height}
        className={cn(img, "dark:hidden")}
        style={{ left: offset?.left ?? 0, top: offset?.top ?? 0 }}
      />
      <img
        src={dark}
        alt=""
        width={width}
        height={height}
        className={cn(img, "hidden dark:block")}
        style={{ left: offset?.left ?? 0, top: offset?.top ?? 0 }}
      />
    </div>
  );
}

/** **No stacks yet** — the first screen a new organisation ever sees. */
export function StackArchitectureGlyph() {
  return <Art light={noStacksLight} dark={noStacksDark} width={222} height={132} />;
}

/**
 * **No secrets yet** — a record whose value is masked, drawn as the row of
 * orange dots the product uses for a hidden value.
 *
 * It doubles as the **stand-in for every other list page's first-run state**
 * (object stores, addons, clusters, domains, git integrations, image
 * registries) until each earns its own drawing. That is deliberate and
 * temporary: one piece across seven secondary pages costs a fraction of seven,
 * and the component takes art per call site, so upgrading one page later
 * touches only that call site. Board node `360:3102`.
 */
export function NoSecretsGlyph() {
  return <Art light={noSecretsLight} dark={noSecretsDark} width={222} height={132} />;
}

/**
 * **The reach failed** — a thing on one side, a thing on the other, and the
 * line between them not arriving.
 *
 * It carries both jobs: no git provider connected, and a list that could not be
 * loaded. They are the same picture, so they are the same drawing.
 */
export function NoConnectionGlyph() {
  return <Art light={noConnectionLight} dark={noConnectionDark} width={222} height={132} />;
}

/** The name this art shipped under, kept so its call sites still compile. */
export const NoProviderGlyph = NoConnectionGlyph;

/**
 * **No results** — a filter that matched nothing.
 *
 * The export is 66×68 because the disc casts a shadow past its own edge; the
 * art is the 62×62 ring at `x=1.75`. The box below is the ring, and the image
 * is nudged back onto it, so centring is the board's and not the bleed's.
 */
export function SearchGlyph() {
  return (
    <Art
      light={noResultsLight}
      dark={noResultsDark}
      width={66}
      height={68}
      box={{ width: 62, height: 62 }}
      offset={{ left: -1.75, top: 0 }}
    />
  );
}
