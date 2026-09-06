import { Package } from "lucide-react";
import { BrandIcon } from "@/components/branded/brand-icons";
import { registryProvider, type RegistryProviderId } from "../lib/providers";

/**
 * An image registry's mark, off the **central** brand-icon registry.
 *
 * It used to hand-roll a three-entry `BRAND` map and its own light/dark `<img>`
 * pair, importing the same GitHub and GitLab SVGs the git `ProviderLogo` was
 * importing beside it — while `brand-icon-registry.ts` opened by calling itself
 * *"one place to grow the icon set"*. Three maps, one of them claiming to be
 * alone; one now.
 *
 * The id→slug mapping lives on `REGISTRY_PROVIDERS` (`brandSlug`), not here:
 * GHCR is drawn with GitHub's mark and Docker Hub with Docker's, and that fact
 * belongs with the rest of what the registry knows. Quay and Other have no mark
 * and fall back to the container glyph.
 */
export function ProviderLogo({ providerId, className }: { providerId: RegistryProviderId; className?: string }) {
  const { brandSlug } = registryProvider(providerId);
  if (!brandSlug) return <Package className={className} aria-hidden />;
  return <BrandIcon slug={brandSlug} className={className} />;
}
