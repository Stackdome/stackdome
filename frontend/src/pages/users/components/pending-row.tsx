import { Mail } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProjectChip } from "./project-chip";
import type { PendingRow as PendingRowModel } from "../hooks/use-users";
import { formatRelative } from "../lib/format-relative";

interface PendingRowProps {
  row: PendingRowModel;
  /** The row's one act: open this invite's drawer. It carried a trailing cell
   *  holding a kebab — `Resend` and `Revoke`, neither visible until the menu
   *  was open. Removing the action means removing its cell too. */
  onOpen: (row: PendingRowModel) => void;
  /** Name of the default project in the org (to render star on chip) */
  defaultProjectName?: string;
}

export function PendingRow({ row, onOpen, defaultProjectName }: PendingRowProps) {
  // Use invite.created_at for "invited X ago" label
  const invitedAgo = formatRelative(row.invite.created_at);

  // Build a synthetic ProjectMembership shape for ProjectChip
  const projectMembership = row.project_name
    ? {
      project_name: row.project_name,
      role: row.role,
      default_project: defaultProjectName ? row.project_name === defaultProjectName : false,
    }
    : null;

  return (
    <TableRow
      role="link"
      tabIndex={0}
      aria-label={`${row.email} invite`}
      className="cursor-pointer border-b border-border-subtle hover:bg-[var(--wash-hover)]"
      onClick={() => onOpen(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(row);
      }}
    >
      {/* User */}
      <TableCell className="py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded shrink-0 flex items-center justify-center bg-muted text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-meta text-foreground truncate">{row.email}</span>
              <Badge variant="warning" className="shrink-0">invited</Badge>
            </div>
            <div className="text-meta text-fg-muted truncate mt-0.5">
              Invited by {row.invited_by ?? "—"} · {invitedAgo}
            </div>
          </div>
        </div>
      </TableCell>

      {/* Org role — en dash for pending */}
      <TableCell className="py-3.5">
        <span className="text-meta text-fg-muted">–</span>
      </TableCell>

      {/* Projects */}
      <TableCell className="py-3.5">
        {projectMembership ? (
          <ProjectChip
            membership={projectMembership}
            isDefault={defaultProjectName ? row.project_name === defaultProjectName : undefined}
          />
        ) : (
          <span className="text-meta text-fg-muted">–</span>
        )}
      </TableCell>

      {/* Last active */}
      <TableCell className="py-3.5">
        <span className="text-meta text-fg-muted">–</span>
      </TableCell>

    </TableRow>
  );
}
