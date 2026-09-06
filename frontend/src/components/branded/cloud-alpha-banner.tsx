import { useState } from "react";
import { AlertBanner } from "./alert-banner";

export const CLOUD_HOSTNAME = "cloud.stackdome.com";
export const DISMISSED_KEY = "stackdome.cloud-alpha-notice.v1";
const LIMITATIONS_URL = "https://docs.stackdome.com/reference/alpha-limitations";

function isCloudAlpha(): boolean {
  return window.location.hostname === CLOUD_HOSTNAME;
}

function wasDismissed(): boolean {
  return localStorage.getItem(DISMISSED_KEY) === "true";
}

export function CloudAlphaBanner() {
  const [hidden, setHidden] = useState(() => !isCloudAlpha() || wasDismissed());

  if (hidden) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setHidden(true);
  };

  return (
    /* **Ported at the merge, not designed.** `main` built this against the old
       AlertBanner (`variant="notice"` plus an `onDismiss` ✕); this branch had
       already replaced that component — tones are `danger | blocking | info`,
       and the one affordance sits BELOW the message rather than as a corner ✕.
       `notice` maps to `info`, and dismissal becomes that affordance.

       Its copy is left exactly as main wrote it, including the inline brand
       link. Worth a design pass: this banner has a headline and a detail, which
       is what AlertBanner's `title` prop is for. */
    <AlertBanner tone="info" action={{ label: "Dismiss", onClick: dismiss }}>
      <span className="font-semibold">Alpha:</span> Stackdome Cloud is ephemeral
      and capacity is limited. Stacks are deleted 6 hours after they are created.{" "}
      <a
        href={LIMITATIONS_URL}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-brand hover:underline"
      >
        Learn more
      </a>
    </AlertBanner>
  );
}
