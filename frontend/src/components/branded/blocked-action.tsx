import { cloneElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BlockedActionProps {
  /**
   * Why the action cannot be taken right now, or `null` when it can.
   *
   * A message rather than a boolean, because a disabled control that does not
   * say what is wrong is a dead end: the user can see the cost is unavailable
   * but not what to do about it. Takes a node so several missing things can be
   * listed rather than run together into one sentence.
   */
  reason: React.ReactNode | null;
  children: React.ReactElement<{ disabled?: boolean }>;
}

/**
 * Disables an action and explains itself on hover and on focus.
 *
 * Covers both shapes of "not yet": a platform limit ("only one cluster is
 * supported today") and an incomplete form ("enter a name and one key/value
 * pair"). They are the same mechanic, so they are the same component.
 */
/**
 * Renders one reason as a sentence and several as a list.
 *
 * **It supplies no words of its own.** Every reason arrives already phrased by
 * the call site, because the verb belongs to the act: you FILL IN a form, you
 * PICK from a list, you PASTE a file. A shared lead-in like "Still needed"
 * flattens all three into the same shrug and says nothing about what kind of
 * thing is being asked for.
 */
export function reasonList(reasons: string[]): React.ReactNode | null {
  if (reasons.length === 0) return null;
  if (reasons.length === 1) return reasons[0];
  return (
    <ul className="flex list-disc flex-col gap-1 pl-4">
      {reasons.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );
}

export function BlockedAction({ reason, children }: BlockedActionProps) {
  if (!reason) return children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Disabled buttons swallow pointer events, so the tooltip anchors to a
            focusable wrapper — which is also what makes the reason reachable by
            keyboard rather than hover alone. */}
        <span tabIndex={0}>{cloneElement(children, { disabled: true })}</span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
