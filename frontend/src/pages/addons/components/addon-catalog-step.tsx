import { useId } from "react";

import { PickerList, PickerRow, PickerRowTick } from "@/components/branded";
import { BlockGlyph } from "@/pages/stacks/components/blocks/block-glyph";
import type { BlockPreset } from "@/pages/stacks/data/blocks/types";

import { addonCatalog, NOT_MANAGED_YET } from "../lib/addon-catalog";

interface AddonCatalogStepProps {
  /** The block id of the service picked so far, if any. */
  value: string | null;
  onChange: (block: BlockPreset) => void;
}

/**
 * Step one of the addon journey — **pick a service**.
 *
 * This replaces a dialog that offered three hand-written options in front of a
 * form with exactly one reachable destination. It is the same shape the stack
 * builder already uses for its blocks: category groups and picker rows
 * (§13 "Adding a thing").
 *
 * **There is no search.** It shipped with one, and the render is what settled
 * it: ten rows on one screen, no scroll, every one of them visible at a
 * glance. A field that filters a list you can already see in full is a control
 * that can only ever remove information — and it cost a whole state (the
 * zero-result empty state) that existed purely to recover from using it. When
 * the registry outgrows one screen, the search comes back with the scroll that
 * justifies it.
 *
 * **The unavailable services are a REGION, and regions explain themselves
 * once** (§9). The first build put the reason on all nine rows and the render
 * settled it: nine copies of one sentence is a wall, not an explanation. They
 * are off together for one reason, so the reason sits above them — and they
 * are still listed, because someone who came looking for Redis should learn
 * where they stand rather than conclude the product has never heard of it.
 */
export function AddonCatalogStep({ value, onChange }: AddonCatalogStepProps) {
  const { available, unavailable } = addonCatalog();
  // The region's sentence has to be reachable to a reader, not merely adjacent
  // to the rows on screen. `PickerList` points at it.
  const reasonId = useId();

  return (
    <>
      {available.map((group) => (
        <div key={group.id}>
          <div className="text-label text-fg-muted px-2 pb-1.5">{group.label}</div>
          <PickerList aria-label={group.label}>
            {group.blocks.map((block) => (
              <PickerRow
                key={block.id}
                icon={<BlockGlyph icon={block.icon} size={16} />}
                name={block.name}
                meta={[{ text: block.summary, mono: true }]}
                selected={value === block.id}
                trailing={value === block.id ? <PickerRowTick /> : null}
                onClick={() => onChange(block)}
              />
            ))}
          </PickerList>
        </div>
      ))}

      {unavailable.length > 0 && (
        <div>
          <div className="text-label text-fg-muted px-2 pb-1">Not managed yet</div>
          {/* The region's one explanation. Above the rows, not inside each. */}
          <p id={reasonId} className="text-meta text-fg-2 px-2 pb-2 leading-relaxed">
            {NOT_MANAGED_YET}
          </p>
          <PickerList aria-label="Not managed yet" describedBy={reasonId}>
            {unavailable.map((block) => (
              <PickerRow
                key={block.id}
                icon={<BlockGlyph icon={block.icon} size={16} />}
                name={block.name}
                meta={[{ text: block.summary, mono: true }]}
                // Off, with the reason carried by the region above. Passing
                // `reason` here is what would rebuild the wall.
                blockedByRegion
              />
            ))}
          </PickerList>
        </div>
      )}
    </>
  );
}
