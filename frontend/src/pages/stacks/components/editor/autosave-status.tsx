import { Cloud, CloudAlert, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SYNC_STATUS, type SyncStatus } from "@/pages/stacks/lib/draft-sync/constants";

/**
 * Autosave state for the canvas header — **a glyph, not a sentence.**
 *
 * It ran as icon-plus-words (`All changes saved`, `Save failed, retrying`) in a
 * row that already carries the version chip, the deploy button and the actions
 * menu. Three of those four are controls; this one is a readout, and at
 * seventeen characters it was the widest thing in the cluster and the only
 * thing in it you never act on. On a narrow shell it pushed the row.
 *
 * | State | Mark |
 * |---|---|
 * | `saving` | A spinner — the only one of the three that is a *moment*, and the one drawing that can say "still happening" |
 * | `saved` | A **cloud**: the work is somewhere other than this browser tab |
 * | `error` | The **same cloud with an alert**, in danger ink |
 *
 * **Two of the three are the same drawing.** A check and a warning triangle
 * are two unrelated marks that happen to sit in the same slot; a cloud and a
 * cloud-with-an-alert are one subject in two states, so the reader learns the
 * shape once and only has to notice what changed on it. The spinner stays
 * outside that pair on purpose — it is the only transient one, and a rotating
 * cloud would say "weather" rather than "in flight".
 *
 * **The failure is the exception, and it earns its colour.** Saved and saving
 * are the ordinary path and stay in the muted tier; a save that did not land is
 * the one state where the user's work is at risk, so it takes `--danger` — the
 * only colour in this readout, which is what makes it findable at a glance in
 * a header that is otherwise ink and grey.
 *
 * **A glyph is not a word, so each carries one.** The tooltip is the label and
 * `sr-only` is the same string for anyone not using a pointer: an icon-only
 * readout with no accessible name is a decoration, and this one is the only
 * thing on screen that says whether the work survived.
 */
const MARKS = {
  [SYNC_STATUS.saving]: {
    Icon: Loader2,
    label: "Saving…",
    className: "text-muted-foreground",
    iconClass: "animate-spin",
  },
  [SYNC_STATUS.error]: {
    Icon: CloudAlert,
    label: "Save failed, retrying",
    className: "text-danger",
    iconClass: "",
  },
  [SYNC_STATUS.saved]: {
    Icon: Cloud,
    label: "All changes saved",
    className: "text-muted-foreground",
    iconClass: "",
  },
} as const;

export function AutosaveStatus({ status }: { status: SyncStatus }) {
  if (status === SYNC_STATUS.idle) return null;
  const mark = MARKS[status as keyof typeof MARKS] ?? MARKS[SYNC_STATUS.saved];
  const { Icon, label, className, iconClass } = mark;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* 32 square, like every other piece of chrome on this row — the glyph
            is 14 and the box around it is what puts it on the row's centreline
            and gives the tooltip something to hang off. */}
        <span
          className={`flex size-8 flex-none items-center justify-center ${className}`}
        >
          <Icon className={`size-3.5 ${iconClass}`} aria-hidden />
          <span className="sr-only">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
