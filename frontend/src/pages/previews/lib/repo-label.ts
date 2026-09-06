/**
 * `https://github.com/acme/web-storefront.git` → `github.com/acme/web-storefront`
 *
 * The host stays. `parsePublicRepoUrl` in create-stack answers a different
 * question — *which repository is this, as GitHub names it* — and drops the host
 * to do it. Previews shows the string you would paste back, because a
 * repository enabled here can live on any host and `acme/web-storefront` alone
 * cannot tell you which.
 *
 * Lifted out of `config-list.tsx` when the repository list became the rail.
 */
export function repoLabel(url?: string): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}
