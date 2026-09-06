import { blockCatalog, BLOCK_CATEGORY_META } from "@/pages/stacks/data/blocks/registry";
import { DATA_BLOCK_CATEGORIES } from "@/pages/stacks/data/blocks/types";
import type { BlockCategory, BlockPreset } from "@/pages/stacks/data/blocks/types";

/**
 * The addon catalogue is a **filter over the service registry**, never a list
 * of its own.
 *
 * It used to be three options hand-written in a dialog, and the two lists
 * drifted the moment they existed: the same database was `Postgres` in the
 * registry and `PostgreSQL` in the dialog, the dialog offered an Ollama the
 * registry had never heard of, and the other nine services could not be
 * offered at all without editing a screen.
 *
 * Adding a managed service is now `managed: true` on its registry entry.
 */

/**
 * Only data stores. A web service is something you deploy, not something
 * Stackdome runs on your behalf — `services` is in the registry for stack
 * building and has no meaning here.
 */
function isDataStore(block: BlockPreset): boolean {
  return DATA_BLOCK_CATEGORIES.has(block.category);
}

/**
 * ONE sentence for the whole unavailable region — not one per row.
 *
 * It was built the other way first, and the render is what settled it: nine
 * rows each repeating "Postgres is the only service Stackdome manages today"
 * is the failure §9 names outright — twelve tooltips saying the same fact is
 * twelve chances to learn it and one certainty nobody reads any of them. The
 * unavailable services are off **together, for one reason**, which is the
 * definition of a region, so the sentence sits above them once.
 */
/*
 * Shortened when the drawer came down to 480: it broke to leave `as a
 * container.` on a second line at 19% of the first. `today` went with it — the
 * heading directly above already reads **Not managed yet**, so the word was
 * that heading said twice, six words apart.
 */
export const NOT_MANAGED_YET =
  "Stackdome manages Postgres. The others run as containers in a stack.";

export interface AddonCatalogGroup {
  id: BlockCategory;
  label: string;
  blocks: BlockPreset[];
}

export interface AddonCatalog {
  /** What you can actually pick, grouped by the registry's own categories. */
  available: AddonCatalogGroup[];
  /** Everything else, flat — they are one region with one reason, not categories. */
  unavailable: BlockPreset[];
}

/**
 * The whole catalogue, always. **There is no query.**
 *
 * It took one for a while, and the filter was the only thing that could ever
 * produce a zero-result state — a state the step then needed an empty state to
 * recover from. Ten data stores fit on one screen without scrolling, so the
 * field could only ever hide rows the user could already see. Restore both the
 * search and its empty state on the day the registry stops fitting.
 */
export function addonCatalog(): AddonCatalog {
  const dataStores = blockCatalog.filter(isDataStore);

  const available = BLOCK_CATEGORY_META.map((category) => ({
    id: category.id,
    label: category.label,
    blocks: dataStores.filter((b) => b.category === category.id && isManaged(b)),
  })).filter((group) => group.blocks.length > 0);

  return { available, unavailable: dataStores.filter((b) => !isManaged(b)) };
}

export function isManaged(block: BlockPreset): boolean {
  return block.managed === true;
}
