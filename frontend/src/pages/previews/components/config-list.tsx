import {
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import type { StackPreviewConfig } from "@/api/preview-configs";

/**
 * The Stacks list's track shape, third time: the name is capped, one track takes
 * the slack, the rest are pinned.
 *
 * `Base branch` is the flexible one — it is the only cell whose length varies
 * with what the user named things.
 */
const CONFIG_TRACKS = "grid-cols-[minmax(240px,420px)_minmax(0,1fr)_130px]";

const LABELS = ["Repository", "Base branch", "Environments"];

/** "https://github.com/acme/webapp.git" → "github.com/acme/webapp" */
export function repoLabel(url?: string): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}

export function ConfigListHeader() {
  return <DataListHeader columns={CONFIG_TRACKS} labels={LABELS} />;
}

/** The real headers, then six rows at the real 64px pitch — so the only thing
 *  that changes when the data lands is the text. */
export function ConfigListSkeleton() {
  return (
    <div>
      <ConfigListHeader />
      <DataListSkeleton
        columns={CONFIG_TRACKS}
        shape={[
          [
            { w: 132, h: 4 },
            { w: 210, h: 3 },
          ],
          { w: 64, h: 3 },
          { w: 88, h: 3 },
        ]}
      />
    </div>
  );
}

/**
 * The repositories wired up for previews.
 *
 * ### What went, and why
 *
 * It was a `Panel` — a bordered, tinted box with an eyebrow header and a
 * hairline between every row. That is the shape every other list page was moved
 * off: a box around a list draws a boundary the page edge already draws, and a
 * rule between 64px rows groups nothing that space was not grouping already
 * (§11).
 *
 * The **provider logo in a 40px bordered tile** went with it, for the reason the
 * secrets list dropped its key glyph: a tile is a card inside a list, and it
 * drew no distinction the text did not. The host was the only thing it carried,
 * so the host moved into the name's second line where it can be read rather than
 * recognised.
 *
 * The **branch pill** went too. A pill is for a status that changes; a base
 * branch is a machine value, so it is set in mono like every other one (§6).
 */
export function ConfigList({
  configs,
  envCount,
  onOpen,
}: {
  configs: StackPreviewConfig[];
  envCount: (configId?: string) => number;
  onOpen: (configId: string) => void;
}) {
  return (
    <div>
      <ConfigListHeader />
      {configs.map((config) => {
        const count = envCount(config.id);
        return (
          <DataListRow
            key={config.id}
            columns={CONFIG_TRACKS}
            label={`${config.name} previews`}
            onActivate={() => config.id && onOpen(config.id)}
          >
            <DataListName
              name={config.name ?? ""}
              secondary={repoLabel(config.git_repository?.repo_url)}
            />
            <DataListCell mono>{config.git_repository?.base_branch}</DataListCell>
            {/* The number alone. "3 environments" under a column headed
                `Environments` says the word twice and costs the count its
                alignment — every other list page sets its pinned cell as the
                value and lets the header do the naming. */}
            <DataListCell numeric>{count}</DataListCell>
          </DataListRow>
        );
      })}
    </div>
  );
}
