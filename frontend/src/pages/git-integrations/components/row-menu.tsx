import { Ellipsis, ExternalLink, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function RowMenu({
  label,
  onVerify,
  onUpdateCredentials,
  manageUrl,
  onRemove,
}: {
  /** What the row is, so the trigger announces more than "row menu". */
  label?: string;
  /** Direct verification only works for credentials-type integrations
      (backend rejects github_app: access there flows through per-installation
      tokens, not stored credentials). Omit to hide the item. */
  onVerify?: () => void;
  /** Credential rotation only works for credentials-type integrations
      (backend PUT rejects github_app). Omit to hide the item. */
  onUpdateCredentials?: () => void;
  /** GitHub installation-management URL; github_app rows only. Omit to hide. */
  manageUrl?: string;
  onRemove: () => void;
}) {
  const hasPrimaryItems = !!(onVerify || onUpdateCredentials || manageUrl);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          shape="flat"
          variant="ghost"
          size="icon-sm"
          aria-label={label ? `Actions for ${label}` : "Open row menu"}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {/* Items that open a dialog defer their callback until after the menu
            has fully closed. Radix's DropdownMenu→Dialog composition races the
            menu's close (which resets document.body.style.pointerEvents)
            against the dialog's mount, and can leave pointer-events "none" on
            body forever if the dialog is cancelled.
            See https://github.com/radix-ui/primitives/issues/1836 */}
        {onVerify && (
          <DropdownMenuItem onSelect={() => setTimeout(() => onVerify(), 0)}>
            <ShieldCheck />
            Verify repository access
          </DropdownMenuItem>
        )}
        {onUpdateCredentials && (
          <DropdownMenuItem onSelect={() => setTimeout(() => onUpdateCredentials(), 0)}>
            <KeyRound />
            Update credentials
          </DropdownMenuItem>
        )}
        {manageUrl && (
          <DropdownMenuItem asChild>
            <a href={manageUrl} target="_blank" rel="noreferrer">
              <ExternalLink />
              Manage on GitHub
            </a>
          </DropdownMenuItem>
        )}
        {hasPrimaryItems && <DropdownMenuSeparator />}
        <DropdownMenuItem variant="destructive" onSelect={() => setTimeout(() => onRemove(), 0)}>
          <Trash2 />
          Remove integration
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
