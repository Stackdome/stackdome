import { AlertBanner } from "@/components/branded";

export interface DeployFailedBannerProps {
  message: string;
}

/** Red "Deploy failed" box in a failed node's detail card. Shared by live and historical bodies. */
export function DeployFailedBanner({ message }: DeployFailedBannerProps) {
  return (
    <AlertBanner className="mt-4">
      <p>Deploy failed</p>
      {/* The reason is machine output — mono, regular, and it keeps its own leading. */}
      <p className="font-mono text-label font-normal leading-relaxed">{message}</p>
    </AlertBanner>
  );
}
