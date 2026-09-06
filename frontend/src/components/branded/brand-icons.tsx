import { cn } from "@/lib/utils";
import { BRAND_ICONS } from "./brand-icon-registry";

/**
 * Themed brand logo for a registered slug; render only when `hasBrandIcon`.
 *
 * **`size` is optional and has no default**, because an inline `width`/`height`
 * beats any class a caller passes — a `size-4` on a component that also writes
 * `style={{width:18}}` is a class that silently does nothing. The canvas and
 * wizard callers size in numbers and pass one; the provider logos size in
 * Tailwind and pass none.
 */
export function BrandIcon({ slug, size, className }: { slug: string; size?: number; className?: string }) {
  const art = BRAND_ICONS[slug];
  if (!art) return null;
  const dims = size === undefined ? undefined : { width: size, height: size };
  return (
    <>
      <img src={art.light} alt="" aria-hidden style={dims} className={cn("object-contain dark:hidden", className)} />
      <img src={art.dark} alt="" aria-hidden style={dims} className={cn("hidden object-contain dark:block", className)} />
    </>
  );
}
