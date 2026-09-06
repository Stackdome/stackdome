import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/branded";
import { NoConnectionGlyph } from "@/components/branded/empty-state";

/**
 * The load failed. **The retry refetches** — this page already had a real
 * `refresh()` rather than a page reload, and that behaviour is kept.
 */
export function IntegrationsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      className="flex-1 gap-6"
      icon={<NoConnectionGlyph />}
      title="Git providers could not be loaded"
      description={message}
      action={
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}

export function IntegrationsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      className="flex-1 gap-6"
      /* The same drawing as a failed load, and deliberately so: a provider that
         is not connected and a provider that cannot be reached are the same
         picture, so they are the same art. */
      icon={<NoConnectionGlyph />}
      title="No git providers yet"
      description="Connect a provider and Stackdome can clone your repositories, build them on every push, and open a preview environment per pull request."
      action={
        /* Outline, never filled (§9). The header already carries this exact
           action as the page's one fill. */
        <Button variant="outline" onClick={onAdd}>
          <Plus />
          Connect provider
        </Button>
      }
    />
  );
}
