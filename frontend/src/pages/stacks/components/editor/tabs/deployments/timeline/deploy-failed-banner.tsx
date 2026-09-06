import { AlertBanner } from "@/components/branded";

export interface DeployFailedBannerProps {
  message: string;
}

/**
 * Red "Deploy failed" box in a failed node's detail card. Shared by live and
 * historical bodies.
 *
 * **Uses `AlertBanner`'s `title` slot rather than stacking two paragraphs in
 * `children`.** Without it both lines rendered at `body/500`, so the reason
 * competed with the headline and the banner had no glyph. With it the component
 * gives its own pairing: headline at `body/500` in `--foreground`, reason at
 * `meta` in `fg-muted`, and the tone said once by the fill and the glyph.
 *
 * **`w-fit` here, not on `AlertBanner`.** A banner that spans its column is
 * right where it is the page's headline — the org limit warnings, the sign-in
 * thresholds — and the component still does that for every other caller. Inside
 * a release's detail it is one line among several, and a tint running the full
 * width for six words outweighed the failure it was reporting.
 */
export function DeployFailedBanner({ message }: DeployFailedBannerProps) {
  return (
    <AlertBanner className="mt-4 w-fit max-w-full" title="Deploy failed">
      {message}
    </AlertBanner>
  );
}
