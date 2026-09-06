import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/branded";
import { NoConnectionGlyph, NoSecretsGlyph } from "@/components/branded/empty-state";
import { namedRegistries } from "../lib/providers";

/**
 * The load failed. **The retry refetches** — this page already had a real
 * `refresh()` rather than a page reload, and that behaviour is kept.
 */
export function RegistriesErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      className="flex-1 gap-6"
      icon={<NoConnectionGlyph />}
      title="Registries could not be loaded"
      description={message}
      action={
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}

export function RegistriesEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      className="flex-1 gap-6"
      icon={<NoSecretsGlyph />}
      title="No registries yet"
      /* The registries named here are the ones the drawer actually offers.
         It used to read "Docker Hub, GHCR, ECR or any registry you host" —
         `REGISTRY_PROVIDERS` has no **ECR**, and it never mentioned GitLab or
         Quay, which it does have. A hand-written list beside a registry, drifted
         (§13) — the fourth on this pass, after `Postgres`/`PostgreSQL`, the
         secret `Type` select and the git provider tiles. */
      description={`A registry credential lets a build pull private base images and push what it produces. Add one for ${namedRegistries()}, or any registry you host.`}
      action={
        /* Outline, never filled (§9). The header already carries this exact
           action as the page's one fill. */
        <Button variant="outline" onClick={onAdd}>
          <Plus />
          Add registry
        </Button>
      }
    />
  );
}
