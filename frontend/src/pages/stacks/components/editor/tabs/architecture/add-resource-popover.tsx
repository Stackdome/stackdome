import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { HardDrive, Plus } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { EmptyState, PickerList, PickerRow, PickerRowTick } from "@/components/branded";
import { AddonTypeIcon } from "@/components/branded/addon-type-icon";
import {
  blockCatalog,
  BLOCK_CATEGORY_META,
  blockMatchesQuery,
} from "@/pages/stacks/data/blocks/registry";
import type { BlockPreset } from "@/pages/stacks/data/blocks/types";
import { BlockGlyph } from "@/pages/stacks/components/blocks/block-glyph";
import { SearchField } from "@/components/branded/search-field";

/**
 * **Order is by how often you reach for it, not by how the registry is keyed.**
 * Services and Storage are the two picks that account for most adds and both
 * stay open, so they sit together at the top; everything with a long tail
 * follows. Rendering the registry straight through put Storage — one row, always
 * visible — *below* two collapsed sections, which read as a section that had
 * been left behind.
 */
const SERVICE_CATEGORIES = BLOCK_CATEGORY_META.filter((c) => c.id === "services");
const DATA_CATEGORIES = BLOCK_CATEGORY_META.filter((c) => c.id !== "services");

export interface AddResourcePanelProps {
  /** Block ids already present in the stack. Kept for API parity; the canvas
   *  reports no running set (see the trailing-slot note on `PickerRow`). */
  addedIds: string[];
  onAdd: (blockId: string) => void;
  /** Provisioned managed addons available to link. */
  addons: { id: string; name: string }[];
  /** Addon ids already linked to this stack. */
  linkedAddonIds: ReadonlySet<string>;
  onLinkAddon: (addonId: string) => void;
  /** False while the stack has no services — volumes are born attached. */
  canAddVolume: boolean;
  onAddVolume: () => void;
  /** Close the hosting surface (popover / context panel) before a modal opens. */
  onRequestClose: () => void;
}

/**
 * **The search box keeps focus for as long as the panel is open, so the arrows
 * move a POINTER rather than the focus.**
 *
 * The first build moved DOM focus onto each row. That works, but it means the
 * field loses focus the instant you press `↓` — so typing after arrowing goes
 * nowhere, and the caret has to be put back by hand. It also made the field's
 * focus ring flicker on and off down the list.
 *
 * This is the combobox pattern instead: focus never leaves the input, the input
 * carries `aria-activedescendant` pointing at the highlighted row, and `Enter`
 * clicks it. Typing and arrowing become the same uninterrupted gesture, and the
 * ring stays exactly where the caret is — which is why the field can drop its
 * ring and its border entirely (`bare` on `SearchField`): a ring that is lit
 * from the first frame to the last reports nothing.
 *
 * The rows are `tabIndex={-1}` so `Tab` cannot walk into the list and strand the
 * caret behind it. They are still real buttons and options, so a mouse works
 * unchanged.
 */
const ROW_ID = (index: number) => `add-resource-row-${index}`;

/**
 * A catalogue section — a label and its rows, and nothing else.
 *
 * It spent one pass as a `Collapsible`, folding anything over three rows behind
 * a chevron and a count. Judged in the running app that was worse: the panel is
 * 272 wide and already scrolls, so folding traded a scroll people know how to do
 * for a click they have to discover — and it hid the thirteen data stores behind
 * a word rather than letting the eye find `Redis` on the way past. A search box
 * sits directly above; that is the disclosure.
 */
function PickerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {/* Sentence case, always (§11) — the registry's own labels are uppercase
          and that is what this heading is correcting. Same three numbers the
          create-stack tab prints it with, because it is the same heading. */}
      <div className="text-label text-fg-muted px-2 pb-1.5 pt-4">{label}</div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

/**
 * The add-resource picker body — search, then the catalogue as rows.
 *
 * **It is the create-stack picker, not a copy of it.** Both flows add out of one
 * catalogue, and until this pass they drew it two different ways: the drawer on
 * `PickerRow`/`SearchField`/`EmptyState`, the canvas on a `BlockPicker` grid of
 * bordered cards. Measured in the running app, that grid put **16 outlined white
 * cards on an outlined white panel** — §11 is explicit that a list is space, not
 * lines, and that a row is not a card — and the managed add-ons inside it
 * rendered at **118 × 82** against every other row's **246 × 62**, because a
 * two-column grid was hard-coded inside a 272px popover. `BlockPicker` is
 * deleted; this file and the drawer now render the same row.
 *
 * **One flat list.** Sections are labels, not doors, and every row is reachable
 * by scrolling or by typing. A collapsing variant was built and judged live and
 * came off: in a 272px panel that already scrolls, folding sold a scroll for a
 * click and hid names people find by scanning past them.
 */
export function AddResourcePanel({
  onAdd,
  addons,
  linkedAddonIds,
  onLinkAddon,
  canAddVolume,
  onAddVolume,
  onRequestClose,
}: AddResourcePanelProps) {
  const [query, setQuery] = useState("");
  // -1 is "nothing pointed at". The panel opens there rather than on the first
  // row: a highlight before you have asked for one is the panel guessing.
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim().toLowerCase();
  const matches = blockCatalog.filter((b) => blockMatchesQuery(b, query));
  // "Storage" is the section header shown for the Volume tile — match either name.
  const showStorage = !trimmed || "volume".includes(trimmed) || "storage".includes(trimmed);
  const visibleAddons = addons.filter((a) => !trimmed || a.name.toLowerCase().includes(trimmed));
  const showAddons = visibleAddons.length > 0 || (addons.length === 0 && !trimmed);
  const nothingMatches = matches.length === 0 && !showStorage && !showAddons;

  /**
   * **One flat list of what is on screen, built before anything renders.**
   *
   * The arrows need an order, and the order is the reading order — services,
   * storage, the data lists, then add-ons — across section boundaries, because
   * the person pressing `↓` is looking at one list and not at four. Deriving it
   * here rather than counting rows in the DOM means the index and the markup
   * cannot disagree after a filter.
   */
  const rows = useMemo(() => {
    const out: { key: string; run: () => void; blocked?: boolean }[] = [];
    const push = (key: string, run: () => void, blocked?: boolean) => out.push({ key, run, blocked });
    SERVICE_CATEGORIES.forEach((c) =>
      matches.filter((b) => b.category === c.id).forEach((b) => push(b.id, () => onAdd(b.id))),
    );
    if (showStorage) {
      push("volume", () => {
        onRequestClose();
        onAddVolume();
      }, !canAddVolume);
    }
    DATA_CATEGORIES.forEach((c) =>
      matches.filter((b) => b.category === c.id).forEach((b) => push(b.id, () => onAdd(b.id))),
    );
    if (showAddons) {
      if (addons.length === 0) {
        // **Same tab, not a new one.** It opened `/addons` with `target="_blank"`
        // from a popover sitting on an unsaved draft — a second tab whose
        // changes the canvas behind it would never see. The draft autosaves, so
        // leaving and coming back is the honest path.
        push("create-addon", () => {
          onRequestClose();
          window.location.assign("/addons");
        });
      } else {
        visibleAddons.forEach((a) => push(a.id, () => onLinkAddon(a.id)));
      }
    }
    return out;
  }, [
    matches, showStorage, showAddons, canAddVolume, addons.length, visibleAddons,
    onAdd, onAddVolume, onLinkAddon, onRequestClose,
  ]);

  const indexOf = (key: string) => rows.findIndex((r) => r.key === key);
  // A filter can leave the pointer past the end of a shorter list.
  const activeRow = active >= 0 && active < rows.length ? rows[active] : undefined;

  const move = (delta: number) => {
    if (rows.length === 0) return;
    let next = active;
    // Skip anything that cannot be picked — a blocked row is on screen to
    // explain itself, not to be arrowed onto and refuse.
    for (let step = 0; step < rows.length; step += 1) {
      next = (next + delta + rows.length) % rows.length;
      if (!rows[next].blocked) break;
    }
    setActive(next);
    scrollerRef.current
      ?.querySelector(`#${ROW_ID(next)}`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
    else if (event.key === "Enter" && activeRow && !activeRow.blocked) {
      event.preventDefault();
      activeRow.run();
    }
  };

  /** Shared by every row: the pointer, the id the input names, and no tab stop. */
  const rowProps = (key: string) => {
    const index = indexOf(key);
    return {
      id: ROW_ID(index),
      tabIndex: -1,
      "data-picker-row": "",
      "data-active": index === active ? "" : undefined,
      // The pointer borrows the selection wash — it is "you are here", which is
      // the same thing selection says (§4). A blocked row never takes it.
      className: index === active ? "bg-[var(--wash-hover)]" : undefined,
      onMouseEnter: () => setActive(index),
    };
  };

  const blockRow = (block: BlockPreset) => (
    <PickerRow
      key={block.id}
      {...rowProps(block.id)}
      icon={<BlockGlyph icon={block.icon} size={16} />}
      name={block.name}
      // **No trailing anything.** A click on the row IS the add, so a `+` at the
      // end is a second affordance for the act the whole row already performs —
      // and on a row that reports no state afterwards, the only thing it can be
      // mistaken for is a target you have to hit. The wizard's rail keeps its
      // `+` and its count because that rail is a set you take things back out
      // of; this panel has no set.
      meta={[{ text: block.summary }]}
      onClick={() => onAdd(block.id)}
    />
  );

  const renderCategory = (category: (typeof BLOCK_CATEGORY_META)[number]) => {
    const inCategory = matches.filter((b) => b.category === category.id);
    if (inCategory.length === 0) return null;
    return (
      <PickerSection key={category.id} label={category.label}>
        {inCategory.map(blockRow)}
      </PickerSection>
    );
  };

  const listId = "add-resource-list";

  return (
    <div>
      {/* **The search area IS the field.** It was a 32px input inside an 8px
          band, so the top of the panel spent 48px to show one control and the
          field drew a second edge inside a band that already ends in a hairline.
          Full-bleed with the band's rule under it, the search box reads as the
          panel's own top rather than as a widget parked in it. `SearchField`'s
          `bare` mode owns the geometry — see the note there for why it is 40 and
          why the glyph sits where it does. */}
      <div className="border-b border-border-subtle">
        <SearchField
          value={query}
          onChange={(next) => {
            setQuery(next);
            // A new query is a new list; keeping the old index would leave the
            // pointer on whatever now happens to sit at that position.
            setActive(-1);
          }}
          /* §8: if the copy sets the floor on the field's width, shorten the
             copy. `Search services, data stores…` measured 198 and would have
             decided this panel's width on its own. */
          placeholder="Search resources…"
          label="Search resources"
          bare
          inputProps={{
            ref: inputRef,
            autoFocus: true,
            role: "combobox",
            "aria-expanded": true,
            "aria-controls": listId,
            "aria-activedescendant": activeRow ? ROW_ID(active) : undefined,
            autoComplete: "off",
            onKeyDown,
            // **Focus cannot leave while the panel is open.** Clicking a row
            // blurs the field for a frame; putting the caret straight back is
            // what lets you add three things and keep typing between them.
            onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
              const next = event.relatedTarget as HTMLElement | null;
              if (next && !next.closest("[data-slot='popover-content']")) return;
              requestAnimationFrame(() => inputRef.current?.focus());
            },
          }}
        />
      </div>
      <div ref={scrollerRef} id={listId} className="max-h-[440px] overflow-y-auto px-2 pb-2">
        {nothingMatches ? (
          <div className="py-2">
            <EmptyState
              title="Nothing matches that"
              description="Try a shorter word, or right-click the canvas to add from anywhere."
            />
          </div>
        ) : (
          <>
            {/* Section order: services, then storage — the two most adds come
                from — then the long data lists, then add-ons. */}
            {SERVICE_CATEGORIES.map(renderCategory)}

            {showStorage && (
              <PickerSection label="Storage">
                <PickerRow
                  {...rowProps("volume")}
                  icon={<HardDrive />}
                  name="Volume"
                  meta={[{ text: "persistent storage" }]}
                  // **The reason is the row's own second line, not a tooltip.**
                  // §9: an item inside a list explains itself inline — a tooltip
                  // in here fights the panel's dismissal, and the focusable
                  // wrapper it needed was breaking keyboard traversal.
                  reason={canAddVolume ? undefined : "Add a service first — volumes attach to a service"}
                  onClick={() => {
                    onRequestClose();
                    onAddVolume();
                  }}
                />
              </PickerSection>
            )}

            {DATA_CATEGORIES.map(renderCategory)}

            {showAddons && (
              <PickerSection label="Managed add-ons">
                {addons.length === 0 ? (
                  <PickerRow
                    {...rowProps("create-addon")}
                    icon={<Plus />}
                    name="Create an add-on"
                    meta={[{ text: "none in this workspace yet" }]}
                    onClick={() => {
                      onRequestClose();
                      window.location.assign("/addons");
                    }}
                  />
                ) : (
                  // **A `listbox`, because these rows SELECT.** Passing
                  // `selected` makes a `PickerRow` an option, and an option
                  // outside a listbox is a role with nothing to belong to.
                  // `multiple` because a stack can link several add-ons — the
                  // same wrapper the create-stack tab puts them in.
                  <PickerList multiple aria-label="Managed add-ons">
                    {visibleAddons.map((addon) => (
                      <PickerRow
                        key={addon.id}
                        {...rowProps(addon.id)}
                        icon={<AddonTypeIcon type="postgres" size={16} />}
                        name={addon.name}
                        meta={[{ text: "managed postgres" }]}
                        // An add-on CAN be linked and unlinked, so unlike a
                        // block it does have a running state worth reporting.
                        selected={linkedAddonIds.has(addon.id)}
                        // A tick, not a plus: it reports that this add-on is
                        // already linked, which is state — the one thing the
                        // trailing slot is still for here.
                        trailing={linkedAddonIds.has(addon.id) ? <PickerRowTick /> : undefined}
                        onClick={() => onLinkAddon(addon.id)}
                      />
                    ))}
                  </PickerList>
                )}
              </PickerSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type AddResourcePopoverProps = Omit<AddResourcePanelProps, "onRequestClose">;

/**
 * "+ Add resource" control for the canvas. Renders the same catalogue rows the
 * create-stack drawer does. Stays open after an add so several blocks can be
 * dropped in a row.
 */
export function AddResourcePopover(props: AddResourcePopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* A cell in its own island: `ghost` for the transparent face and the
            product's one wash ladder, `sm` for the 28px rung that sits inside
            the island's 2px padding. */}
        <Button variant="ghost" size="sm">
          <Plus />
          Add resource
        </Button>
      </PopoverTrigger>
      {/* **272 — 248 of row plus 12 either side.** Measured: the text column
          starts at 56 and the widest line in the catalogue runs to 180, so 248
          clears every row with the right padding intact. 560 was two columns'
          worth of room for a list you scan down.

          align="start": the trigger sits in the canvas's top-LEFT island, so the
          panel hangs from its left edge. */}
      <PopoverContent align="start" className="w-[272px] p-0">
        <AddResourcePanel {...props} onRequestClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
