import { Button } from "@/components/ui/button";

export interface DeployPillProps {
  isDraft?: boolean;
  /** Draft gate: at least one resource exists on the canvas. */
  hasResources: boolean;
  dirtyTotal: number;
  isStaged: boolean;
  isActive: boolean;
  deployBusy: boolean;
  draftDeploying?: boolean;
  canWrite: boolean;
  onDeploy: () => void;
  onDraftDeploy?: () => void;
}

/**
 * **Deploy — in the header, on the title row, beside the thing it deploys.**
 *
 * It was a pill floating at the top of the canvas: a bar that appeared over the
 * drawing the moment you changed anything, said `Apply 3 changes`, and carried
 * `Details` and a ⋯ of its own. Three problems. It covered the graph at the
 * exact moment you were editing it. It put an action about the STACK on the
 * surface that draws the stack's parts. And the two things in its menu —
 * reviewing the diff and throwing it away — are things you do to a *version*,
 * which is now what the version chip beside it is for.
 *
 * What is left is the one thing that was always the point: commit. It appears
 * only when there is something to commit — pending changes on a saved stack, a
 * deploy in flight, or a draft with at least one resource. Deploy on a draft
 * creates the stack and starts the first release in one go; there is no
 * separate create action.
 */
export function DeployPill({
  isDraft,
  hasResources,
  dirtyTotal,
  isStaged,
  isActive,
  deployBusy,
  draftDeploying,
  canWrite,
  onDeploy,
  onDraftDeploy,
}: DeployPillProps) {
  // Same rule the shell rail used: mid-session dirt or a saved-but-undeployed
  // diff; never for drafts (nothing server-side to review).
  const hasChanges = !isDraft && dirtyTotal > 0 && (isStaged || isActive);
  const visible = isDraft ? hasResources : hasChanges || deployBusy;
  const busy = isDraft ? !!draftDeploying : deployBusy;
  const deployDisabled = isDraft
    ? !!draftDeploying
    : deployBusy || !canWrite || !(isStaged || (isActive && dirtyTotal > 0));
  const fireDeploy = isDraft ? onDraftDeploy : onDeploy;

  if (!visible) return null;

  return (
    <div data-testid="deploy-pill" className="flex flex-none items-center gap-2">
      {/* **Nothing is disabled without saying why**, and the why sits beside the
          button rather than under a hover: a tooltip on a disabled control is a
          reason you have to go looking for. */}
      {deployDisabled && !busy && !canWrite && (
        <span className="whitespace-nowrap text-meta text-fg-muted">Ask an admin for deploy access</span>
      )}
      {/* **No rocket.** The label is the verb, and a glyph that only illustrates
          the word it sits beside is the duplication §7 bans — it also pushed the
          one filled button on the screen wider than the row it lives in.
          The spinner stays: that reports a state the word cannot.

          **⌘⏎ belongs to the button, not to this file.** The cap, the
          `aria-keyshortcuts` value and the listener all come off `shortcut` —
          they used to be a hand-drawn `<kbd>` beside a `window` listener that
          only this component knew about, which is the same fact written twice
          in two places that nothing keeps in step. */}
      <Button
        type="button"
        variant="default"
        shortcut="mod+enter"
        loading={busy}
        loadingText="Deploying"
        onClick={fireDeploy}
        disabled={deployDisabled}
      >
        Deploy
      </Button>
    </div>
  );
}
