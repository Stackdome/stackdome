import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataListActions,
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import type { Secret } from "../types";

/**
 * The Stacks list's track shape: the name is capped, one track takes the slack,
 * the rest are pinned.
 *
 * `Type` is the flexible one — it is the longest word in the row
 * ("Username/Password") and the only one that varies in length.
 */
const SECRET_TRACKS = "grid-cols-[minmax(240px,420px)_minmax(0,1fr)_130px_32px]";

const LABELS = ["Name", "Type", "Created", ""];

export function formatSecretType(type: string): string {
  switch (type) {
    case "Generic":
      return "Generic";
    case "DockerRegistry":
      return "Docker registry";
    case "GitCredentials":
      return "Git credentials";
    case "UsernamePassword":
      return "Username / password";
    case "Token":
      return "Token";
    case "SSHKey":
      return "SSH key";
    default:
      return type;
  }
}

function createdLabel(secret: Secret): string {
  return secret.created_at ? new Date(secret.created_at).toLocaleDateString() : "—";
}

export function SecretListHeader() {
  return <DataListHeader columns={SECRET_TRACKS} labels={LABELS} />;
}

/**
 * The real column headers, then six rows at the real 64px pitch — so the only
 * thing that changes when the data lands is the text.
 */
export function SecretListSkeleton() {
  return (
    <div>
      <SecretListHeader />
      <DataListSkeleton
        columns={SECRET_TRACKS}
        shape={[
          [
            { w: 152, h: 4 },
            { w: 200, h: 3 },
          ],
          { w: 88, h: 3 },
          { w: 72, h: 3 },
          null,
        ]}
      />
    </div>
  );
}

export function SecretList({
  secrets,
  onEdit,
  onDelete,
  canWrite,
}: {
  secrets: Secret[];
  onEdit: (secret: Secret) => void;
  onDelete: (secret: Secret) => void;
  canWrite?: (projectId?: string) => boolean;
}) {
  return (
    <div>
      <SecretListHeader />
      {secrets.map((secret) => {
        const rowCanWrite = canWrite ? canWrite(secret.project_id) : true;
        return (
          <DataListRow key={secret.id} columns={SECRET_TRACKS}>
            {/* The description is the name's second line. The key glyph that used
                to sit in a 40px bordered tile is gone: every row on this page is
                a secret, so it drew no distinction the word did not already make,
                and the tile was a card inside a list. */}
            <DataListName name={secret.name ?? ""} secondary={secret.description} mono={false} />
            <DataListCell>{formatSecretType(secret.type)}</DataListCell>
            <DataListCell numeric>{createdLabel(secret)}</DataListCell>
            <DataListActions>
              {rowCanWrite && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      shape="flat"
                      aria-label={`Actions for ${secret.name}`}
                    >
                      <Ellipsis />
                    </Button>
                  </DropdownMenuTrigger>
                  {/* `start`, not `end` — the menu opens INTO the row rather than
                      off the sheet edge. */}
                  <DropdownMenuContent align="start" className="w-[160px]">
                    {/* Edit opens a dialog; deferred so the dialog mounts only
                        after the menu has closed and released its body
                        pointer-events lock (radix-ui/primitives#1836). */}
                    <DropdownMenuItem onSelect={() => setTimeout(() => onEdit(secret), 0)}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => onDelete(secret)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </DataListActions>
          </DataListRow>
        );
      })}
    </div>
  );
}
