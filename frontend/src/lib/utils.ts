import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"
import type { components } from "@/api/types/openapi"
import type { ZodIssue } from "zod";

/**
 * The product type scale is named by job (`text-body`, `text-meta`, …) rather
 * than by size. tailwind-merge cannot know that: it classifies any unfamiliar
 * `text-*` utility as a text COLOUR, so `cn("text-body", "text-fg-2")` used to
 * drop the size entirely and the element fell back to the inherited 16px.
 *
 * Teaching it the font-size group fixes that at the root — without this, every
 * component that merges a size and a colour through `cn` silently loses its
 * size.
 */
const TEXT_SCALE = ["label", "meta", "body", "name", "title", "head"] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TEXT_SCALE] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The interaction ladder for a **navigation** face — a sidebar row, a rail item
 * (§4). Two rungs only: reachable, and here.
 *
 * **Branch on the state, never stack the variants.** `hover:` and
 * `data-[active=true]:hover:` both match a selected row under the pointer and
 * which one wins is not reliably predictable, which is how a hovered row came to
 * be indistinguishable from the selected one. One call, one set of classes.
 *
 * **A selected row does not answer the pointer.** Selection is a statement about
 * where you are, not an offer — lifting it under the cursor made the row twitch
 * on the way past and put a fourth tint on a ladder that only needs to separate
 * "here" from "reachable".
 *
 * **A nav row has no pressed rung either.** A button's press is feedback for an
 * act that happens in place; a nav row's click *navigates*, so the 12% tint
 * landed at the same moment the route swapped and the row re-rendered as
 * selected — two fills fighting over one frame, which read as a flicker on
 * every click. Ghost BUTTONS keep `--wash-pressed` (see `button.tsx`); rows
 * that take you somewhere do not.
 *
 * Raw `var()` rather than `bg-wash-*`: the theme utility generates the selector
 * but resolves to transparent for both rungs.
 *
 * Lifted out of `sidebar.tsx`, which had the only copy — the previews rail is
 * the second face on this ladder and a second copy of the string is how the two
 * would drift.
 */
export function washes(isActive: boolean): string {
  return isActive ? "bg-[var(--wash-selected)]" : "hover:bg-[var(--wash-hover)]";
}

export function extractApiErrorMessage(
  error: Partial<components["schemas"]["Error"]>,
  fallbackMessage = "An error occurred. Please try again."
): string {
  if (!error) return fallbackMessage;
  if (error.reason) return `Error: ${error.reason}`;

  if (error.code || error.kind) {
    const kind = error.kind || "Error";
    const code = error.code ? ` (${error.code})` : "";
    return `${kind}${code}`;
  }

  return fallbackMessage;
}

function isApiError(error: unknown): error is Partial<components["schemas"]["Error"]> {
  return (
    typeof error === "object" &&
    error !== null &&
    ("reason" in error && "code" in error && "kind" in error)
  );
}

function isZodIssue(error: unknown): error is ZodIssue {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "path" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    Array.isArray((error as { path: unknown }).path)
  );
}

export function extractErrorMessage(
  error: Error | Partial<components["schemas"]["Error"]> | ZodIssue,
  fallbackMessage = "An error occurred. Please try again."
): string {
  if (isApiError(error)) return extractApiErrorMessage(error, fallbackMessage);
  if (isZodIssue(error)) return error.message;
  if (error instanceof Error) console.error(error.message);

  return fallbackMessage;
}
