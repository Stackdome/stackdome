import { Ellipsis, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
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
  onRemove,
}: {
  /** What the row is, so the trigger announces more than "row menu". */
  label?: string;
  onVerify: () => void;
  onUpdateCredentials: () => void;
  onRemove: () => void;
}) {
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
        {/* Items open dialogs; defer callbacks until the menu has fully closed.
            Radix's DropdownMenu→Dialog composition races the menu's close
            against the dialog's mount and can leave body pointer-events "none".
            See https://github.com/radix-ui/primitives/issues/1836 */}
        <DropdownMenuItem onSelect={() => setTimeout(() => onVerify(), 0)}>
          <ShieldCheck />
          Verify registry access
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTimeout(() => onUpdateCredentials(), 0)}>
          <KeyRound />
          Update credentials
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setTimeout(() => onRemove(), 0)}>
          <Trash2 />
          Remove registry
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
