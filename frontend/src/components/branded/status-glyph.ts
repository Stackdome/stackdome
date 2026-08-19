import {
  CircleCheck,
  CircleDashed,
  CircleOff,
  CircleX,
  Loader2,
  TriangleAlert,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { StatusDomain } from "./status-variant";

/**
 * One glyph per **state** — derived from domain + state, never passed in, so an
 * icon that disagrees with the word beside it is as unbuildable as a colour
 * that disagrees. Same contract as `statusVariant`, for the mark instead of the
 * hue.
 *
 * **Why per state and not per family.** Three glyphs for three families meant
 * `Degraded`, `Unavailable` and `Failed` all drew the same triangle — and that
 * is precisely the distinction that changes what you do next.
 *
 * | State | Glyph | Reads as |
 * |---|---|---|
 * | Healthy | `CircleCheck` | serving, nothing to do |
 * | Deploying | `Loader2`, spinning | in flight, wait |
 * | Degraded | `TriangleAlert` | serving, but not fully |
 * | Unavailable | `CircleOff` | not serving at all |
 * | Failed | `CircleX` | the deploy did not land |
 * | NotDeployed | `CircleDashed` | never run — a fact, not a fault |
 * | Deleting | `Trash2` | on its way out |
 *
 * Outline glyphs at the product's stroke weight; nothing here is filled.
 *
 * **It lives in its own module because two components read it.** `StatusText`
 * draws the coloured word for a list row; `StatusChip` draws the filled tag for
 * a header. They must never drift into two maps — a stack that reads `Degraded`
 * with a triangle in the list and `Degraded` with a cross in its own header is
 * the same fork the list-page sweep spent a day undoing.
 */
export const GLYPH: Partial<Record<StatusDomain, Record<string, LucideIcon>>> = {
  stack_rollup: {
    healthy: CircleCheck,
    deploying: Loader2,
    degraded: TriangleAlert,
    unavailable: CircleOff,
    failed: CircleX,
    notdeployed: CircleDashed,
    deleting: Trash2,
  },
  // One release attempt, not the stack's rolled-up health. The distinction that
  // matters is DID IT LAND: `Superseded` and `Cancelled` are both "this one
  // stopped mattering" and neither is a fault, so both take the stopped mark.
  // pkg/models/stack_release.go:14
  release: {
    pending: CircleDashed,
    inprogress: Loader2,
    released: CircleCheck,
    failed: CircleX,
    superseded: CircleOff,
    cancelled: CircleOff,
  },
  // The same seven readings, in the addon's words. A managed database has one
  // extra: `Hibernated` and `Fenced` are both "up but not serving", and neither
  // is a fault — `CircleOff` says stopped, `TriangleAlert` says held back.
  // pkg/models/postgres_addon.go:21-31
  addon: {
    ready: CircleCheck,
    pending: CircleDashed,
    creating: Loader2,
    initializing: Loader2,
    updating: Loader2,
    "backing up": Loader2,
    restoring: Loader2,
    deleting: Trash2,
    error: CircleX,
    hibernated: CircleOff,
    fenced: TriangleAlert,
  },
  // A provider is either reaching your repositories or it is not, and if it is
  // not there are two different reasons — which is exactly the distinction the
  // glyph has to carry.
  git_integration: {
    connected: CircleCheck,
    needs_setup: CircleDashed,
    action_needed: CircleX,
  },
  // A preview environment's five phases, and the distinction that matters is
  // WAITING versus BUILDING versus GONE — `Provisioning` means nothing has
  // started yet, `Deploying` means it is in flight, `Deleting` means the URL you
  // are about to copy will stop answering. A single family dot flattens all
  // three, which is why the board's coloured dot is not what shipped: it repeats
  // the colour and adds no fact (§7).
  // pkg/models/preview_stack.go — PreviewStackPhase
  preview: {
    provisioning: CircleDashed,
    deploying: Loader2,
    ready: CircleCheck,
    failed: CircleX,
    deleting: Trash2,
  },
};

/** States whose glyph turns. `motion-safe:` so reduced-motion gets a still mark
 *  rather than no mark — the shape still reports "in flight". */
export const SPINS = new Set([
  "deploying",
  "creating",
  "initializing",
  "updating",
  "backing up",
  "restoring",
]);

/**
 * The word the backend sent, made readable — `InProgress` → `In progress`,
 * `image_pull_failed` → `Image pull failed`.
 *
 * The raw state is shown rather than a bucket label because the buckets are
 * lossy: `Degraded` and `Failed` are both `error`, and which one you are
 * looking at changes what you do next.
 */
export function humanise(state: string): string {
  const words = state
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "";
  return (
    words[0].charAt(0).toUpperCase() +
    words[0].slice(1) +
    (words.length > 1 ? " " + words.slice(1).join(" ") : "")
  );
}
