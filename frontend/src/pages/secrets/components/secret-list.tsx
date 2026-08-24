import {
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
/**
 * **Three tracks.** The fourth was a 64px slot for a hover-revealed `Edit` and
 * `Delete`.
 *
 * A secret has no live state to read — a name, a kind and a value — so there is
 * nothing for a details drawer to show that the form does not. **The row opens
 * the form**, which is what both of those buttons were for, and `Delete` moves
 * into the drawer's danger zone: it takes every stack that reads the secret
 * with it, and §10 puts an act with dependents on the object rather than under
 * a pointer on a row you were scanning.
 */
const SECRET_TRACKS = "grid-cols-[minmax(240px,420px)_minmax(0,1fr)_130px]";

const LABELS = ["Name", "Type", "Created"];

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
        ]}
      />
    </div>
  );
}

export function SecretList({
  secrets,
  onOpen,
}: {
  secrets: Secret[];
  /** The row opens the form. A secret is entirely settings, so there is no
   *  read-first step to put in front of it — see the tracks above. */
  onOpen: (secret: Secret) => void;
}) {
  return (
    <div>
      <SecretListHeader />
      {secrets.map((secret) => {
        return (
          <DataListRow
            key={secret.id}
            columns={SECRET_TRACKS}
            label={`${secret.name} secret`}
            onActivate={() => onOpen(secret)}
          >
            {/* The description is the name's second line. The key glyph that used
                to sit in a 40px bordered tile is gone: every row on this page is
                a secret, so it drew no distinction the word did not already make,
                and the tile was a card inside a list. */}
            <DataListName name={secret.name ?? ""} secondary={secret.description} mono={false} />
            <DataListCell>{formatSecretType(secret.type)}</DataListCell>
            <DataListCell numeric title={absoluteAge(secret.created_at) ?? undefined}>
              {createdLabel(secret)}
            </DataListCell>
          </DataListRow>
        );
      })}
    </div>
  );
}
