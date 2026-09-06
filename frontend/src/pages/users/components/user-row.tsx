import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProjectChip } from "./project-chip";
import type { ActiveRow } from "../hooks/use-users";
import { formatRelative } from "../lib/format-relative";

interface UserRowProps {
  row: ActiveRow;
  /** The row's one act: open this person's drawer. It carried a trailing cell
   *  holding a kebab — `Promote`, `Demote` and `Copy ID`, none of them visible
   *  until the menu was open. Removing the action means removing its cell and
   *  its header label too. */
  onOpen: (row: ActiveRow) => void;
  /** Name of the default project in the org (to render star on chip) */
  defaultProjectName?: string;
}

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
  }
  return (name.slice(0, 2) || "?").toUpperCase();
}

export function UserRow({ row, onOpen, defaultProjectName }: UserRowProps) {
  const isAdmin = row.role === "OrgAdmin";
  // last_active_at is not yet on the User model — show — until it is
  const lastActive = formatRelative((row.user as Record<string, unknown>)["last_active_at"] as string | undefined);

  return (
    <TableRow
      role="link"
      tabIndex={0}
      aria-label={`${row.name} member`}
      className="cursor-pointer border-b border-border-subtle hover:bg-[var(--wash-hover)]"
      onClick={() => onOpen(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(row);
      }}
    >
      {/* User */}
      <TableCell className="py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded shrink-0 flex items-center justify-center bg-muted text-foreground text-label font-mono select-none">
            {monogram(row.name)}
          </div>
          <div className="min-w-0">
            <div className="text-body font-medium text-foreground truncate">{row.name}</div>
            <div className="font-mono text-meta text-muted-foreground truncate">{row.email}</div>
          </div>
        </div>
      </TableCell>

      {/* Org role */}
      <TableCell className="py-3.5">
        {isAdmin ? (
          <Badge variant="secondary">{row.role}</Badge>
        ) : (
          <Badge variant="outline">{row.role ?? "—"}</Badge>
        )}
      </TableCell>

      {/* Projects */}
      <TableCell className="py-3.5">
        <div className="flex flex-wrap gap-1.5">
          {row.projects.length > 0
            ? row.projects.map((t, i) => (
              <ProjectChip
                key={t.project_id ?? i}
                membership={t}
                isDefault={defaultProjectName ? t.project_name === defaultProjectName : undefined}
              />
            ))
            : <span className="text-muted-foreground text-meta">—</span>
          }
        </div>
      </TableCell>

      {/* Last active */}
      <TableCell className="py-3.5">
        <span className="text-meta text-fg-muted">{lastActive}</span>
      </TableCell>

    </TableRow>
  );
}
