import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataListActions,
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import { relativeAge, absoluteAge } from "@/components/branded/entity-card";
import type { Secret } from "../types";

/**
 * The Stacks list's track shape: the name is capped, one track takes the slack,
 * the rest are pinned.
 *
 * `Type` is the flexible one — it is the longest word in the row
 * ("Username/Password") and the only one that varies in length.
 */
/** 64, not 32 — the actions are two buttons on the row, not one kebab (§11). */
const SECRET_TRACKS = "grid-cols-[minmax(240px,420px)_minmax(0,1fr)_130px_64px]";

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

/**
 * **A time column on a list page is an age, not a date.**
 *
 * This shipped `toLocaleDateString()` — `8/1/2026` — which is the one thing a
 * column you scan cannot be: a value you have to subtract from today before it
 * means anything. `relativeAge` is the same helper the Stacks list's
 * `Last change` uses, and the exact timestamp rides along as the cell's title
 * for the one case where the date itself is the question.
 */
function createdLabel(secret: Secret): string {
  return relativeAge(secret.created_at) ?? "—";
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
            <DataListCell numeric title={absoluteAge(secret.created_at) ?? undefined}>
              {createdLabel(secret)}
            </DataListCell>
            {/* **Two actions, so they are ON the row** (§11). A kebab that only
                ever opens two items spends a click and a menu to hide what fits
                — and the Object stores list, with the same Edit and Delete, had
                been showing them inline all along.

                The `setTimeout` around Edit went with the menu. It existed to
                let the dropdown release its body pointer-events lock before a
                dialog mounted (radix-ui/primitives#1836); with no dropdown
                there is nothing to wait for. */}
            <DataListActions>
              {rowCanWrite && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    shape="flat"
                    aria-label={`Edit ${secret.name}`}
                    onClick={() => onEdit(secret)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    shape="flat"
                    aria-label={`Delete ${secret.name}`}
                    onClick={() => onDelete(secret)}
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            </DataListActions>
          </DataListRow>
        );
      })}
    </div>
  );
}
