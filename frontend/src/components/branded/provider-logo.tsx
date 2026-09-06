import { GitBranch } from "lucide-react";
import { BrandIcon } from "./brand-icons";
import { hasBrandIcon } from "./brand-icon-registry";
import type { ProviderId } from "@/lib/git-integrations";

/**
 * A git host's mark, off the **central** brand-icon registry.
 *
 * It used to hand-roll its own four-entry `BRAND` map and its own light/dark
 * `<img>` pair — as did the image-registries copy, from the same two GitHub
 * SVGs, while `brand-icon-registry.ts` opened by calling itself *"one place to
 * grow the icon set"*. Three maps, one of them claiming to be alone.
 *
 * `ProviderId` and the registry's slugs are the same words, so there is no
 * translation table here either: the id **is** the slug, and `other` is the one
 * id with no brand to draw.
 */
export function ProviderLogo({ providerId, className }: { providerId: ProviderId; className?: string }) {
  if (!hasBrandIcon(providerId)) {
    return <GitBranch className={className} aria-hidden />;
  }
  return <BrandIcon slug={providerId} className={className} />;
}
