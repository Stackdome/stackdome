## 2026-08-17 06:40 — Validation, and the canvas gets an implementation plan

**"There are validations for some fields — how are we handling this?"** Audited,
and the honest answer is badly, with one of the three defects mine:

| | |
|---|---|
| The regex reaches the user | `input_rules.go:64` returns the raw pattern in the message. Same in `objectstore` and `postgresaddon` |
| The browser checks nothing | `form-schema.ts` requires the resource name **non-empty and nothing more** — the round trip is what tells you a capital is illegal |
| The rule is stated nowhere | It was `LedgerRow`'s right-margin `meta` — *"lowercase · unique in stack"* — and **that came off with the mono hints** |

**The pattern, drawn** (`791:32017`): *a constraint is said under its field before
it is broken, and the error replaces the hint with the same rule in the
imperative.* `Lowercase letters, numbers and hyphens.` → `Use lowercase letters,
numbers and hyphens.` Same sentence, indicative then imperative, so the
correction reads as the rule you were already shown.

**The board cannot draw a failed field.** `Field` and `Select` ship
default/hover/focus/disabled and **no error state** — which is why no frame in the
product has ever shown one. A shared primitive, so it is an ask.

**Then: the implementation plan.** `docs/design/canvas-implementation-plan.md` —
eleven slices, slice 0 being *split `architecture-tab.tsx` (36k) before touching
it*. The load-bearing one is slice 3: the drawer stack becomes a region of the
sheet, and `drawer-stack.tsx`, `drawer-stack.ts` and `drawer-inset.ts` are
deleted in that same slice because the inset arithmetic exists only to stagger
floating panels.

Everything settled this session is in it — the ground token and `shadow-md`, the
four header zones, sections instead of sub-tabs, the record's fill/fixed rule and
the `ml-auto` bug it replaces, the value-typography fix across three primitives,
the picker at 272 with no trailing slot, Live, mono scoped to the canvas, and
validation. Plus nine things a board cannot carry — the region is in the tab
order and is **not** a dialog, the seam is a `border-left` while the cards are
`outline`, and the remove buttons need accessible names.

## 2026-08-17 06:05 — Jaseem's final pass: 251 nodes, 5 diffs, 2 rules

Diffed his version of the inspector body (`779:32086`) against the copy in the
shell. Two real changes, both of them general:

**1. A segmented that is a FIELD fills and splits evenly.** `Build from`'s
segments had been `HUG` at 124 and 106 — sized by their own labels — and are now
both `FILL` at **220**. The port row's `Public ǀ Internal` stays `HUG` at 135.
Same test as a record's members, one level down: **alone in its cell it is the
field, so it fills; beside other controls it is one member, so it hugs.** An
unevenly split segmented also reads as a *result* rather than a choice — the
wider half looks selected before you have read either label.

**2. Inside a table-shaped section the rhythm is 8, not 16.** Environment's
content gap went 16 → 8 for the column headers, the variables list, the note and
`Add variable`. 16 is right *between fields* because two fields are two subjects;
the environment block is **one** subject, so its parts sit at the tighter rung —
and the variables list was already at 8, so the block now agrees with itself.

**Everything else held**: section padding `16/20/24/20`, section gap 12, field
gap 4, record gap 4, list gap 8, `From` 116 fixed, `Name`/`Value` 140 filling,
remove 32.

Re-cloned into the shell frame (`789:32016`). The canvas section is now: five
shell frames, the settled inspector at 480, its volume panel, and the full form
at `761:31657`.

## 2026-08-17 05:45 — The record fills after all, and the value had three weights

**Jaseem stretched the port row to 440** (`780:31978`). Better — and it means the
first reading was half wrong. **The hole was never caused by the record being
wide**; it was caused by `ml-auto` pushing one member away while the rest stayed
packed. Remove the push and the width stops mattering.

| Member | Sizing |
|---|---|
| Port number, protocol | **FILL** — arbitrary values |
| `Public ǀ Internal` | **HUG** 130 — a closed two-value enum |
| Remove | **FIXED** 32 |

**So §8 stands.** A control in a form does not size to its content, and the record
lands on the same trailing edge as every field above it. What §8 needs is not an
exception for records but one sentence: **a member of a record may be fixed when
its content is a closed set.** Extended to the variable row for free — `From`
FIXED at 116, `Name` and `Value` FILL at 140, remove 32, 440 exactly.

**Then: "why are some of the values medium and some regular font weight?"** A
defect in three shared primitives, not in the layout:

| Control | Shipped its value as |
|---|---|
| `Field` | `body/400` **muted** — it has only a placeholder state, so every filled input read as empty |
| `Select` | `body/500` **medium**, ink |
| `Segmented — label` | `meta/500` medium at **12**, inside a row of 13s |

**The rule: a value is `body/400` at ink; a placeholder is the same size and the
same weight and only the colour changes; the label above keeps `body/500`** —
§6's binary doing its job, the label being *about* the value. 70 text nodes
corrected across the three inspector panels, with `Dockerfile` and `.` left muted
because those two genuinely are placeholders. The segmented's selection is now
colour alone, which is what §11 already said the mechanic was.

**Fixed as instance overrides only.** `Field`, `Select` and `Segmented` are
product-wide; the component edit and the code audit are a separate call.

## 2026-08-17 05:10 — A record is left-packed, and the inspector goes on auto-layout

**Jaseem answered the ports question by drawing it** (`773:41580`) rather than
picking one of the four options on the board. The settled record:

| | |
|---|---|
| Spacing | Every control **4** apart |
| Nothing pinned | No `ml-auto` — the old row pushed the switch to the far edge and put a **hole in the middle of the record** |
| Two-way choice | A **segmented** (`Public ǀ Internal`), not a switch with a floating word |
| Remove | A **32 icon button**, packed straight after |
| Width | Port **350**, variable **424**, inside a 440 column — neither stretches |

**Two causes, one of them outside the ladder.** Gap-inside equalling gap-around
is real and proximity fixes it, but the hole was doing more damage and no spacing
value fixes a pinned control. **And it overturns §8's "a field fills its cell"
for this case** — that rule is about *fields*; a record is a row of values, and
stretching it to the column edge is what made the hole. §8 needs the distinction.

`Build from` took the same segmented, being the same shape of question.

**Then: "also use autolayout, now everything is just laid flat."** The inspector
was entirely absolute `x`/`y`. Rebuilt:

- **The region** is VERTICAL — Header `FIXED 95`, Body `FILL`, Footer `FIXED 81`;
  the seam is the one **`ABSOLUTE`** child so it spans without joining the stack.
- **A section** is VERTICAL, padding `16/20/24/20`, gap 12, and its rule is the
  frame's own **`strokeTopWeight = 1`** rather than a child rectangle — which is
  what lets a section hug its content instead of carrying a fixed height.
- **A field** is VERTICAL gap 4; **a pair** HORIZONTAL gap 16 both `FILL`;
  **a record** HORIZONTAL gap 4 `HUG`, so left-packed is a property, not
  coordinates; a trailing item rides a `FILL` spacer.

Applied to all three panels — the shell inspector (`783:32079`), the full form
(`761:31657`) and the volume (`784:32016`). The four-option study came off the
board; the settled shape lives in the frames.

## 2026-08-17 04:20 — Mono comes off the canvas, and an env row learns to delete itself

**Two things, both from *Jaseem* looking at the environment block.**

**"How do I delete env variable?"** — it had From, Name and Value and nothing
else, while `env-row.tsx` ships a remove *and* a reset. The row is now four
columns: **103 ǀ 120 ǀ 177** at an 8 gap plus a **16** remove on the far edge —
440 exactly — and the port row's `✕` moved onto the same edge so the two share a
trailing rail.

**"You need to calm down with the use of mono text."** Then: *"why everywhere?
dev tool doesn't mean mono font everywhere."* Then the instruction: **"remove
mono from everywhere in the last design you did except from url — this includes
nodes etc."**

**The canvas section held 134 mono text nodes. It now holds 15**, all
`ghcr.io/…`. Off mono: 45 kind labels (`Web`, `Service`, `Postgres`, `volume`),
5 status words, 3 column headers, `paste .env` / `clear all`, `public`,
`3 changes`, volume names, nine specimen annotations — and every image tag,
version and path, because the line he drew is **URLs**, not machine values.

**Two narrower rules were tried first and both were mine, not his** — "a machine
value", then "a string you could paste into a terminal". Both left ~53 nodes. His
line is simpler and holds: **a tag is not a URL, a path is not a URL, a branch
name is not a URL.**

**This reached `node specimens`**, his own settled sheet — 24 kind labels, 5
status words, 9 annotations. Flagged rather than done quietly; the instruction
named nodes explicitly.

**Same size, same rung, sans instead of mono** — 11 → `label/400`, 12 →
`meta/400`. One variable changed, so the effect is judgeable.

**And the menu shrank a second time.** Sans is narrower, so re-fitting Add
resource to its own ink took it **248 → 222**. From 380, that is a **42% cut**.

**One bug on the way:** the re-alignment pass treated the picker's FILL-width
`name`/`sub` as right-aligned and floated them off their left edge. Restored to
FILL; nothing else in the section uses auto-layout text.

**Open, now product-wide:** create-stack's `Picker row` still ships a mono
sub-line and §6 still carries two mono rungs used across list pages, drawers and
previews. The canvas is the only surface holding this line — first screen of a
sweep, or an inconsistency. **Jaseem's call.**

## 2026-08-17 03:35 — The picker loses its trailing slot, and the inspector gets unrolled

**Two corrections, both live, both on `05 add resource` and the inspector.**

**The canvas picker is not create-stack's twin.** *Jaseem:* **"we don't need ×1
here, once I click on an item it gets added to the canvas"**, then **"we don't
have to show the plus button as well, and reduce the width of the menu max."**
Same catalogue, different act — create-stack is **assembling a set** you can take
things out of, so a row reports how many are in it; on the canvas a click **is**
the add and the graph is the record. `Trailing=none` on every row.

**With the trailing slot gone the ink decides the width.** Measured: text column
starts at **56**, widest line is **180** (`your image · :80 · public`, mono 12),
right padding **12** → column **248**, popover **272**. Was 380 — a **28% cut**.
The search placeholder was the other constraint at 198, so it shortened to
`Search resources…` (111) rather than setting the floor. **First attempt was 264
and wrapped** — the probe measured the sub-line at 11 when the row ships 12.

**And the inspector was hiding two thirds of itself.** *Jaseem:* **"show me all
the inputs that exist in configuration, deployment and environment, I don't see
port, source section etc."** The panel frame shows the first **592** of a form
that is **1952** tall. New frame `inspector — every field, unscrolled`
(`761:31657`) is the whole thing at its natural height.

**What it turned up:** Configuration is **General** (Name, Depends on),
**Source** (Build from, then the git branch — Repository, Revision, Branch name,
Pin to commit — with ▸Advanced holding Dockerfile path, Build context, Push
registry), **Ports** (number, protocol, public switch, remove, `Add port`) and
**Mounts**. Deployment is **four fields** — Init command, Init arguments,
Command, Arguments. Environment is a row of From ǀ Name ǀ Value plus
`Add variable`, `paste .env`, `clear all`.

**Deployment being four fields is the argument for sections over sub-tabs**, made
by the code rather than by preference: as a tab it claims a third of the strip and
pays it back with two commands and two argument strings.

**The env value's shape follows `From`** — `Plain text` is one input, `Resource`
and `Secret` are **two stacked selects**, `Addon` is one select in a group that
carries the addon and database pickers. Columns sized off measured ink:
**103 ǀ 120 ǀ 201** at an 8 gap, 440 exactly.

**Also fixed:** `Add port` and `Add variable` were shipping the Button set's
default upload glyph; both are a plus now.

## 2026-08-17 02:40 — The inspector, Live and Add resource — and 640 lost to 480

**Board.** Section `the canvas — shell and chrome` (`705:8610`), grown to 4900.
Three new 1440×900 shells — `03 inspector` (`740:19956`), `04 live`
(`740:20067`), `05 add resource` (`740:20178`) — plus two 480 region studies:
`a volume, in the same panel` (`750:31438`) and `the same panel, scrolled`
(`755:31599`).

**The inspector is a region, and it is 480.** Built to the brief at 640, judged
live, and *Jaseem*: **"drawer size, it's big, we should use default."** The
number turned out to argue against the premise — at 640 the canvas keeps 546 and
half the graph runs under the panel, which is exactly what a region is supposed
to avoid. At 480 the canvas keeps **706**, both node columns fit, and there is
**32** of air between the nearest card and the seam. Flush right, square, one
hairline seam, no scrim, no shadow. Bands **95 ǀ 592 ǀ 81**.

**Sections came from the addon drawer, not from the ledger.** *Jaseem:*
**"accordion — we already have one implemented I think on addons."** So the
section marker is a **full-bleed rule and a `body/500` label**, and a collapsed
section is a **single leading chevron, the label, then a state word** —
`Environment 4 variables`. The mono-marker-on-a-rule the first build carried over
from `LedgerSection` is gone, and so are the **right-margin mono hints**.

**That closed the sub-tab question without a study.** Label-above halves every
row's height, so the drawer's three sub-tabs become five sections in one scroll —
General, Source, Ports, Mounts, then Environment and Advanced as disclosures. A
second tab strip 95px under the sheet header's own never had to be drawn.

**A pair has to be one subject.** *Jaseem:* **"only keep fields side by side if
they have a direct relationship."** `Port ǀ Protocol` is the only pair left;
everything else is 440 full width. The form still lands on §8's **two trailing
edges — 232 and 460**.

**Live, finally drawn.** The version chip reads `Live · no changes`; `Deploy` is
**disabled with its reason immediately beside it**; `Add resource` comes off the
canvas tool group because Live is read-only; no draft stripe, and the degraded
node says its word.

**Add resource is the create-stack catalogue, literally** — a clone of
`New stack › Building blocks`'s catalogue frame (`565:6840`), same rows, same
groups, same order. The code already shares `blockCatalog`; the board now agrees.

**Two board bugs found on the way.** Frames **01 and 02 had their Light/Dark
variable modes swapped** — `01 · Light` was pinned to Dark and `02 · Dark` had no
override at all. Fixed. And **01/02 still draw the pre-edit node card**; every new
frame clones from `node specimens`.

**Measured** — region 480 flush (0 to the sheet edge), bands 95/592/81 = 768,
gutter 16, stacked field gap 16, across-a-section gap 72, seam-to-node 32.

**Open:** the inspector footer holds **two ghosts and no primary** (§13's footer
was written for a form that commits — this one saves into the draft); two new
single chevrons (`chevron-down`, `chevron-right`) are vectors, not components.

## 2026-08-17 00:07 — The canvas: seven calls, then the reference that overturned two of them

**Board.** New section `the canvas — shell and chrome` (`705:8610`), below
previews. Two shell frames — `canvas — 01 draft · Light` (`705:8611`) and
`02 draft · Dark` (`714:9219`) — plus a `node specimens` sheet (`725:19851`)
carrying 24 node cards and 3 attachment nodes across six groups.

**Scoped the canvas.** ~20 components across five clusters: shell, canvas chrome,
nodes and wires, the inspector, overlays. Seven blocking questions answered off
the existing rules, in an artifact, then rebuilt twice.

**Seven calls, as first made:** one header (the editor stops printing its own
title); tabs into §12a's toolbar row; the inspector becomes a **region of the
sheet**, 640 and flush, not a floating panel — which settles §15's *split detail
layout*; label-above on the two-column grid; one panel, not a stack; one collapse
(the sidebar toggle) — zen mode and the header chevron both go; **no orange
anywhere, wires included**.

**Then an interface review found two HIGHs and the reference found more.** The
Live state was never drawn, and the canvas had been painted at sheet white so the
cards had **1.00:1** against their ground. Both fixed. *Jaseem*, from the
ElevenLabs editor: the action cluster is not ranked, it is **sorted by kind into
four zones** — identity left, one publish action right, tabs alone on their row,
every canvas tool on the canvas. That overturned the segmented Draft ǀ Live (now
a **version chip** beside the title, carrying the change count and holding
`Review changes` and `Discard` in its menu) and moved `Add resource` onto the
canvas tool group.

**The ground, settled.** Sheet-white hid the cards; frame-grey dissolved the
sheet. **Neither is a colour problem alone** — a hairline needs **49% ink** to
clear 3:1 against white, so the edge can never come from tone. Two mechanisms:
a **`surface/canvas`** token of its own (*Jaseem's* `#fbfbf8`; dark derived at the
same 59% between frame and sheet → `#181715`) plus **`shadow-md` on the node**.
Needs one sentence in §5: *a canvas is a space, not a surface, so the objects in
it are the one content that floats.*

**Node card, after Jaseem's own edit.** Per-state glyph **out**, 6px **dot after
the name** in the state's tone; text column at **36**; docked volume rows fully
white with **indent-only** separation — no rule, no fill; **10 dividers deleted**
from the canvas tool group. Four separation options were drawn and the indent won.

**Added to the ramp:** `mono/label` 11/16 — mono had exactly one rung while every
sans family has two, and the card's second line needs the 11 the code already uses.

**Decided:** the hairline on an **elevated surface** is an **outline**, drawn
outside the box and costing the layout nothing. 40 strokes flipped to `OUTSIDE`
in the canvas section. *Jaseem:* **elevated surfaces only** — not every border —
and the code audit is **screen by screen, never a sweep**.

**Open:** `new` vs `edited` share one stripe; the drop target is the ring dashed
where the code uses orange; seven glyphs and three components on the board are
hand-built and need approval; `Avatar` is stroked INSIDE inside `Sidebar`.

**Not built:** the Live shell frame, the inspector, add-resource.

## 2026-08-16 22:10 — Previews, in code: the board ships, and four of its calls do not

**Built:** all eight slices of `docs/design/previews-implementation-plan.md`.
`/previews` and `/previews/:configId` are **one screen** — a 241px repository
rail beside 64px preview rows. The second route is absorbed, not deleted, and it
grows **no crumb**: `registerSelectionPath` marks a segment as an in-page
selection and `SheetHeader` drops it from the trail.

**Deleted:** `config-detail.tsx` (370 lines), `config-list.tsx`,
`preview-env-card.tsx`, `config-settings-modal.tsx` and their tests.
**New:** `preview-row`, `repository-rail`, `repository-context-line`,
`repository-settings-drawer`, `preview-drawer`, plus a `Pages/Previews` story
with nine states.

**Product-wide, from Jaseem mid-build:**
- **A chevron pair PICKS a value; a single chevron OPENS what is under it** →
  §7. `chevrons-up-down` on every select, filter, sort, combobox and switcher.
  In the primitives — `SelectTrigger` and a new `DropdownMenuChevron` — because
  six list pages had hand-written the same glyph beside their own triggers.

**Decided, live, against the board:**
- *Jaseem:* the env-var **source select stays**. It was dropped because the board
  draws the row without it and it did not fit; restored by taking the chip
  110 → 88 and pinning the key at 120 so the value takes the slack.
- *Jaseem:* the **toolbar stays up** on a repository with nothing open — the rail
  is a selector, and the body was jumping 44px on every click down it.
- *Jaseem:* **Sort comes back.**
- *Jaseem:* **`Remove repository` is solid `destructive`**, not the ghost §10
  left triggers on.
- *Jaseem:* the rail's **`+ Enable repository` stays pinned at the foot**. Two
  alternatives were built and both reverted.
- *Jaseem:* the row **gear is `outline`, on every row** — `ghost` has nothing to
  change against on a row that is already washed.
- The status **dot became a per-STATE glyph**: a family dot repeats the colour.

**Two lessons worth keeping:**
1. **Judge the board against real data before building to it.** All four board
   calls that lost were drawn for a case the product does not have — a full
   column, a wide-enough row, a list with something in it.
2. **When a batch is rejected, ask which part.** *"none of the new stuff is
   working"* reverted three changes and two came straight back.

**Measured, not eyeballed** (`.measure-previews.mjs`): rail 241/224×32 at pitch
33, body inset 16, context line → column header 16, header → first row 0, and one
ink edge shared by the context line, the column header and the row name — their
boxes share a different edge 8 outside it. Three of those were wrong on the first
build and only measuring found them.

**Green:** `tsc` clean, lint 0 errors, **2104 tests / 281 files**. Eleven flows
walked in the running app, no console errors.

**Open, all in `docs/tasks.md`:** the board frames are now behind the code in
five places (Jaseem updates those himself), and the settings drawer carries two
filled buttons.

## 2026-08-16 19:48 — Previews goes on the board, then gets reviewed

**Built:** section `previews` (`655:7536`) — six 1440×900 frames (all previews ·
one repository · no previews yet · first run · at the cap · dark) and two
drawers. Repository settings moved dialog → drawer; the **preview drawer** is the
only genuinely new surface.

**Component work:** `List row` gained `Columns=preview + repository` (4 variants,
for the Repository column on *All previews*); the status word came off `mono` in
all 8 preview variants (§6 names a status word as the example — the 5 `stack`
variants were already right); the action track became **64px with two 32px ghost
icon buttons**, replacing 16px bare glyphs 2px apart.

**Reviewed** frame 01 with `better-interface` — 2 HIGH, 4 MEDIUM. Built the fixes
in a side-by-side frame (`01b`), then applied the approved ones to **every**
artboard, most of them at the component so nothing can drift.

**Decided:**
- *Jaseem:* **the section title never changes with an in-page selection.** The
  rail already names the repository; a title that moves stops being a landmark.
  The selection is named in the body's context line instead → §12a.
- *Jaseem:* **the cap meter is useless.** `3 of 5 active` states the number
  exactly; a 44×4 bar restated it approximately → §7.
- *Jaseem:* **`New preview` is enough** — rejected the review's finding #6, which
  wanted the longer `New preview from a branch` in both places.
- *Jaseem:* the rail is the sheet's **white**, not a grey ground; the 24px icon
  button drops to `sm` (6); the rail chip goes back to `Tone=secondary`,
  overturning the ghost call made earlier in the session.
- **A value you copy is a grey well, not bare text** → §9, from his edit to the
  preview drawer's URL.
- **A seam between two regions takes the 11% hairline** → §4. Four rails on the
  board drew the same boundary on the inside-a-control rung.

**Open:** the gear's concentric radius (needs his rail-item padding to go 4 → 2);
the `Drawer` component still ships `head/500` where both previews drawers now use
`title/500`; the board template's header band (100 at a 12 inset) contradicts
§12a (64/108 at 16).

**Next:** `docs/design/previews-implementation-plan.md` — eight slices, Storybook
first, no backend change.

## 2026-08-16 16:43 — `Add image registry`, and the phase test loses one

**Two phases**, `Add registry › Pick a registry` → `Add registry › GHCR`, at
480. The twin of `Connect git provider`, converted the day after it, off the
same copy-paste and with the same tells.

**Decided, against the rule:** §13's phase test reads **one phase** on this form
— same four fields for every registry, the choice only prefills `Host` and swaps
a hint, and the provider **is not in the record** (`RegistryCredential` is
`{host, username, password, purpose}`; the list row derives it back from the
host). A one-phase version was built and measured before it was overruled.

- *Jaseem, on the running screen:* **"for git integration we have to select the
  service first, I think it has to be same here as well."** §13 gained *"the
  phase test is answered per FLOW, not per form — siblings match"*. It does not
  repeal the mode rule: the object store's provider has no sibling to match.

**Also came off:** `WizardFooter` and its story (**deleted** — the product's last
`Back`); the `sr-only` title and `pr-12` band → `DrawerHeader`; five
`min-h-[76px]` tiles → `PickerRow`; `max-h-[80vh] min-h-[440px]` on a
`DialogContent`, which makes that grep **empty** product-wide.

**And three brand-art maps became one.** `brand-icon-registry.ts` opened by
calling itself the only one while both `ProviderLogo`s hand-rolled their own and
imported the same GitHub and GitLab SVGs. Found underneath it: `BrandIcon` wrote
an inline `width`/`height` unconditionally, so any `size-*` class a caller passed
did nothing.

**Fixed on the way:** the empty state offered **ECR** (never in the catalogue)
and never named GitLab or Quay (both in it) — the phrase derives now; the primary
was live on an empty form; `Purpose` had no `*` over a select with no blank; the
label was resolved by `.find()` at two call sites.

**Verified:** 8 stories and 7 unit tests where the add flow had **none**. Full
suite 2083 passing, `tsc` clean, lint 0 errors. Measured in both previews — 480 ·
header 95/73 · footer none/81 · one leading and one trailing edge · pair gutter
16. The first description ran two lines and took the header to 115.

**Open:** the header band is **95 on step one and 73 on step two**, because §13
gives step two no description. Shared with `Connect git provider`, so it is a
pattern rather than this screen's bug — but §13 fixes the *width* for a whole
journey and says nothing about the height. Logged in §15.

# Session log

Newest first. A trail, not a transcript — decisions live in `DESIGN-PRODUCT.md`,
reasoning in `docs/design/redesign-log.md`.

## 2026-08-16 15:45 — the toast's contact shadow, taken

**Did:** Added `--shadow-toast` — `elevation/lg` plus a contact layer — and
pointed `toast.tsx` at it. Verified on rendered pixels: light now paints **3**
shadow layers at **1.52 / 1.72**; dark paints 2 and is unchanged at 1.44 / 1.32.

**Decided:** *Jaseem, after seeing the two side by side:* **take it.** The four
rungs are all soft pools with negative spread — they blur out below a card and
leave nothing at its own edge, which is right for a popover (it has its trigger)
and a dialog (it has a scrim) and wrong for the one surface with **nothing
behind it**. Recorded as `lg` **plus a layer**, not as a fifth rung: §5's ladder
still has four entries, and the exception is the *surface*, not the component.

**Dark aliases `lg`, measured.** A contact shadow darkens the ground at the
edge, and dark's ground is already near-black.

## 2026-08-16 15:26 — the toast, built to the board for the first time

**Did:** Rebuilt `toast.tsx` / `toaster.tsx` / `use-toast.tsx` to board
`427:5102`. §13 had described this component for weeks; the code had never been
it — border tinted per tone, no glyph, `font-semibold` title over a dimmed
caption, no clock. Now 380 / radius 12 / padding 16 / gaps 8 / `elevation/lg`,
one paragraph of `body/400`, tone in the glyph alone. 7 stories where it had
none. Committed `7f30a23`.

**Decided:**
- **It dismisses itself**, on ~1s per three words over a 3s base, clamped 4–10s
  — the reading-time guideline behind WCAG 2.2.1. **A toast carrying an action
  never times out.** Closing is not removing; the store drops it after the exit.
- **One paragraph, one tier.** A bold heading over a dimmed caption in a 380px
  box that leaves in five seconds is hierarchy nobody reads. The join supplies
  the stop the fragment titles never carried — one place, not 97 rewrites.
- `box-content` on the viewport, or its own padding is taken out of the toast
  and 380 quietly becomes 348.

**Corrected, on the render:**
- *Jaseem:* **top centre was wrong.** The argument — land where you were looking
  — was true and incomplete: what is drawn there is the sheet header, and in
  light both are white, so it read as chrome. Back to bottom right.
- *Jaseem:* **put the hairline outside so the shadow darkens it.** Right
  mechanic, measured smaller than it sounds — +0.09 on the bottom edge, nothing
  on the sides, because `elevation/lg`'s spreads pull the shadow under the box.
  Kept; the **alpha rung** is what moved it, `line/subtle` → `line/strong`.

**Open:** a tight contact layer under `elevation/lg` measures 1.52/1.72 in light
and nothing in dark — a fifth shadow for one component. Logged in §13, not taken.

## 2026-08-16 14:51 — connect git provider becomes a drawer, and a progress list turns out to be fiction

**Did:** Replaced `add-integration-wizard.tsx` (455 lines, `Dialog size="form"`)
with `connect-provider-drawer.tsx` at 480. Both call sites moved — the
git-integrations page and `git-source-picker.tsx`, which is not a page. The
five-phase machine is three steps, the polling wait is a state inside the GitHub
step, and success closes and toasts. Nine stories where there were none, fifteen
unit tests replacing a 281-line one written against the old phases.

**Also came off:** the hand-rolled `Stepper` and its `STEP_FOR_PHASE` patch → the
path; five `min-h-[76px]` tiles → `PickerRow`; the `sr-only` title and `pr-12`
header band → `DrawerHeader`; `WizardFooter` with `Back` (**file kept** —
`add-registry-dialog.tsx` still uses it); `h-[480px] max-h-[80vh]`; centred body
copy; `p-8`/`mb-7`/`gap-2.5`.

**Decided:**
- *Jaseem, before building:* **the GitHub arm is a third step, not a mode
  field.** Both precedents were live; the object-store test — *can you start
  without it?* — settles it, because the App branch has no form to start.
- *Jaseem:* **the wait stays in place and the receipt becomes a toast.** Neither
  screen deleted; "not a step" is about the path, not about existing.
- **The provider list is a registry.** `GIT_PROVIDERS`, with
  `PROVIDER_DISPLAY_NAMES` derived — the wizard's own copy had already drifted
  (`Other` vs `Git host`). Third time after `Postgres`/`PostgreSQL` and the
  secret `Type` select.
- **`Username` is required on Bitbucket and optional elsewhere.** It shipped
  marked optional over a hint saying required.

**Corrected, in the running app:**
- *Jaseem:* **the checkboxes go, and the list with them.** §13's *"a completed
  step is a ticked `Checkbox`"* is about a journey's **step pip** and was applied
  to a background process. Underneath it, `useGithubConnect` has two states while
  the list drew three — the middle line was lit by an `i === 1` literal. The
  screen was more confident than the code. §13 gained the scope limit.
- *Jaseem:* **the error banner goes to the top of the body**, not the footer.
  §13's footer slot is for a *form's* failure; nothing commits on the wait, and
  the banner sat under copy it contradicted.

**Closed the next session:** `WizardFooter` is **deleted**, with its story.
`Add image registry` was its one caller, and that was the last `Back` button in
the product — the only arrow left anywhere is a **page** journey's (§12a).

## 2026-08-16 14:00 — the last two adds come off the dialog

**Did:** Converted `Add cluster` and `Add domain` from dialogs to one-phase
drawers at `size="form"` (480) — the two flows §13 still named by name as
exceptions. Files renamed `*-dialog.tsx` → `*-drawer.tsx` with history kept.
Committed as `83ebdde` and `7be3397` on `graphite-pass-2`.

**On cluster, beyond the surface:** the hand-rolled `Switch` + `Label` + `<p>`
row onto `FieldShell inline` (and the `mt-0.5` §8 removed with it); the switch
label naming the **thing** (`Image registry`) rather than the act; the `pl-11`
inset dropped so the field it reveals sits on the body's own column; Title Case
swept; `Cluster URL` → `API server URL`; the doubled `20Gi` hint/placeholder cut
to one job each. Both primaries now say what is missing, all of it at once.

**Decided:**
- **A dialog that scrolls has already answered the question.** `Add cluster`
  carried `max-h-[80vh] overflow-y-auto` — a dialog's levels are made of air,
  which only works because its body does not scroll. Written into §13 and
  `frontend/CONTEXT.md` as a grep-able tell.
- **One field is not an argument for a dialog.** `Add domain` is a single
  `FieldShell` — the literal description of the `ask` rung — and is a drawer
  anyway. The rung describes the *question*; the rule is about the *answer*.
- **Nothing shares a subject on the cluster form.** CA certificate and service
  account token are the tempting pair and are not one answer in two boxes: one
  verifies the server to us, the other authenticates us to it. Full width,
  chosen rather than defaulted.
- *Jaseem:* **none of the three things found on the way need fixing now.** They
  are logged, not blocking.
- *Jaseem:* **`Connect git provider` is next, and it should be like addons** —
  catalogue step, then form step.

**Corrected:** Jaseem read the three findings as needing a backend person. Only
the third does — *should the product support many clusters?* The other two are
frontend-only (a mock fixture, one `type` attribute).

**Found:** the default preview shows **two** clusters while `/clusters` says
*"Only one cluster is supported today."* Checked: nothing in the frontend routes
a stack to a chosen cluster, so the **reason is true and the fixture is wrong**.
Also: the CA certificate is masked like a secret, and it is public trust
material. Both in `docs/tasks.md`, deferred.

**Verified:** `tsc` clean, lint 0 errors, 278 test files / 2065 tests passing.
31 measured checks in `dev:mock:empty` (the *empty* scenario — the populated one
leaves both add buttons blocked at one row), read as gaps after the 200ms slide
settled, all match.

**Open:** `Connect git provider` is now the only thing in **Now** that is a
build; everything else there is a call waiting on Jaseem.

## 2026-08-16 13:33 — closing audit: what is still on a dialog

**Did:** Audited the whole product from the router, not from the task list, to
answer *"what all is pending to be revamped?"*

**Found:**
- **Eight adds are still dialogs**, where §13 says every add is a drawer at 480:
  cluster, domain, image registry, connect git provider, create project, add
  member, invite user, add volume. Three more are *edits* on a dialog and are a
  judgement call.
- **Never reached at all:** sign-in / sign-up (0 stories), the canvas editor,
  cluster detail, preview config detail. Projects has **no route** — it is four
  dialogs.
- **`font-semibold`: 60 occurrences across 39 files**, still unswept since §6
  took weight 600 off the scale.

**Decided:**
- *Jaseem:* **`New cluster` + `Add domain` go in one sweep, straight to code** —
  no board, the pattern is settled.
- *Jaseem:* **`Connect git provider` and `Add image registry` are separate
  jobs**, one each.

**Stale, corrected:** the `PR the branch` task named four commits and the branch
is **71 ahead of `main`** at `bf63694`.

**Open:** everything above is now in `docs/tasks.md` under **Next**.

## 2026-08-16 — object stores

**Did:** Object stores' add flow, the same exercise as secrets, previews and
addons. Audited in `dev:mock` first, put the two open calls on a new Figma board
section, then built everything the rules already decide.

**Decided:**
- **The surface: the code was wrong, not §13's table.** An add is a drawer, and
  an object store is an object. `Dialog` at `work` (760) → **drawer at `form`
  (480), one phase.**
- **The provider is a mode, not a phase**, because you can start without it —
  `Name`, `Destination path` and `Retention` all sit above it. So the table's
  entry stands. **It is secrets' `Type` exactly**, which means Option D now moves
  both forms or neither.
- §13 contradicted itself — *"pick a provider… it stays a dialog"* against *"a
  dialog is never an add"*. The first was answering the **phase** question and
  phrasing it as a surface. Corrected in place.

**Found, not asked for:**
- **`Region ǀ Endpoint URL` was authored as a pair and rendered stacked**, both
  at 710. `FieldShell`'s span default flipped last pass and overrode the raw
  grid. Broken for a whole pass, and no story existed to catch it.
- **The blocking banner was false.** The form reads Azure and GCS fine; the
  branch fires when a store has *no* readable credentials at all. It also told
  people to **delete a backup destination**, as prose, with no gate — and blanked
  a form whose name, path and retention all loaded.
- **Editing an S3 store showed two empty 34px boxes** where its credentials
  should be — the secret `Type` failure again (a value with no matching option),
  made visible by `w-fit`.
- **The preview fixtures could not reach the edit form at all** — every store
  referenced a secret that did not exist.
- **§13's drawer bands were 9px behind the code.** 86/80 in the doc; 95/81 in the
  product and on the board. The doc moved.
- The logged flake was a `toBeVisible` on drawer content, read mid-animation.

**Verified:** 20 gap checks in `dev:mock`, all match. 277 test files, 2054 tests,
0 failures; `tsc` clean; lint 0 errors. Seven stories added.

**Board:** section `object stores — the surface, and what shares a subject`
(`626:7202`) — three surfaces, three readings of the credential control, two
provider controls. Two calls open.

### Same day — one width for every add

*Jaseem, reading the shipped drawers:* **"adding a new addon is much bigger than
the other ones… can we make everything the same width."**

He is right, and the 640 was **inherited, not measured**. §13 said *"the
two-phase journey is `work`"* on the strength of a 596 two-column floor — and
those numbers were taken on **new stack's step one, with its 240 rail**. Neither
`New addon` nor `Enable repository` has a rail, and the addon catalogue has no
search either.

| | Was | Now |
|---|---|---|
| New addon | 640 | **480** |
| Enable repository | 640 | **480** |
| New stack | 640 | **640** — the one with a rail |

**Decided:** *Jaseem:* every add is one width. **`work` is earned by a second
column, not by a second step.**

**Measured:** the addon form ends on the same two trailing edges at 480 that it
had at 640 (pairs 292 → 212, what every other form ships), and the previews
control band still shares a row — **160 + 16 + 263 = 439**. §13's claim that the
search field "needs 277" was the rail's arithmetic again.

**Cost:** two hints, shortened. `text-wrap: pretty` was tried first and
**measured to change nothing**, so it came back out rather than shipping as a
no-op.

**Stale frames flagged, not swept:** every 640 add drawer on the board —
`533:5453` (`543:5556`, `535:5453`), all of `597:6952`, all of `483:5283`.
`556:6373` (New stack) is still correct.

## 2026-08-16 — row actions

**Did:** Converged the row-action shape across every list page, off Jaseem's
reading of the shipped product.

**Decided:**
- *Jaseem:* **one or two actions sit on the row; three or more get a kebab.** The
  threshold is a property of the row, not of the page. Secrets and Stacks moved
  inline; Image registries and Git integrations keep their menus, because
  `Verify repository access` is a phrase and not a glyph.

**Found, not asked for:**
- **Stacks had hand-rolled `DataListActions`** and revealed on `focus-visible`
  on the button where the primitive reveals on `focus-within` on the row — so a
  keyboard user reached it one tab later than on five other pages, and no test
  caught it because both end at opacity 1.
- **Stacks' `Delete` was disabled with no reason at all** while a stack was
  deleting. It is a `BlockedAction` now.
- The harness's "revealed on focus" check failed on all six pages including the
  two that had not changed — it was reading opacity in the same tick as the
  `focus()`, mid-transition. **A check that fails where nothing changed is
  measuring itself.**

**Verified:** 56 gap-and-relationship checks in `dev:mock` across all six pages,
all match. 276 test files, 2047 tests, 0 failures; `tsc` clean; lint 0 errors.
`new-stack-drawer > No Provider Connected` flaked once and passed twice after —
logged, untouched by this pass.

## 2026-08-16 — secrets

**Did:** Secrets, the same exercise as previews and addons. Audited in `dev:mock`
first, put four options on a new Figma board, then built the one Jaseem picked.

**The drawer** — `Username ǀ Password` paired (`span={1}`, 211.5 each) and
everything else left filling, because on the Generic form nothing shares a
subject and full width was the right answer that had never been *chosen*. On Git
credentials the pair also fixes the `or` divider, which had been separating two
rows from one. `Cancel` off the footer. Placeholders turned into specimens;
`(optional)` dropped. The `Type` select derived from `SecretTypeSchema`.

**The list** — `Created` moved onto `relativeAge` + `absoluteAge`; Addons brought
onto the same helper.

**Decided:**
- *Jaseem:* option **C** — pair the credential, keep `Type` as a field. Option D
  (the kind becomes step one) parked with its board frames drawn.
- *Jaseem:* **`(optional)` goes everywhere**, previews' env label included. The
  red `*` states required and its absence states optional.
- *Jaseem:* **leave the 8px name drift**. Pinning the name buys one baseline and
  spends it on a row with air hanging under it.
- `Cancel` on a one-phase drawer: **off** — and the journey's reasoning was
  remade rather than reused, because a one-phase drawer has no path. §13.

**Found, not asked for:**
- **The `Type` select offered three kinds; the API, the schema and this form's
  own switch all carry six.** `Token`, `SSH key` and `Username / password` could
  not be created at all, and editing one showed an **empty** Type box over a form
  full of its fields. Reproduced on the `STRIPE_API_KEY` fixture.
- The same select said `Docker Registry` while the rows said `Docker registry` —
  two spellings of one type, one of them breaking sentence case.
- Three renderings of a time column across eight list pages.

**Left for Jaseem:** whether secret names are `stripe-api-key` or
`STRIPE_API_KEY` — the placeholder and the fixtures now disagree, and the backend
enforces neither.

**Verified, not assumed:** 21 gap assertions in `dev:mock` with the drawer
settled, all match, two trailing edges not three. 276 test files, 2046 tests, 0
failures; `tsc` clean; lint 0 errors.

## 2026-08-16 (later)

**Did:** Brought the previews repo-picker onto create-stack's flow, then ran the
same exercise over the addon drawer. Six shared primitives changed as a result.

**Previews** — `GitSourcePicker` now uses the `StickyBar` band, `SearchField`,
`Provider`, a labelled `FieldShell` URL, `visibility · branch` meta and the
resolved `This will build` row. It had a **fifth, looser copy** of the repo-URL
parse, so `Continue` went live on `abc`; it shares `parsePublicRepoUrl` now.
`Cancel` came off both steps. 24 gap assertions in `dev:mock`.

**Addons** — step one's lone-`Cancel` footer deleted outright (§13); `Cancel` off
step two; `Documentation` moved from the `Advanced` header (where it split that
disclosure's hover target) to the footer as a **ghost Button**; both disclosures
made one full-bleed target and stacked flush; section content aligned to the
section **title** (44, not the section's 20); `Plan ǀ Storage size` paired by
meaning and `Version` freed; the backups section reordered so the shared
destination leads and each switch is adjacent to what it turns on.

**Decided:**
- *Jaseem:* the PR-automation warning goes **under** the resolved repository, not
  above the field. A consequence sits under the thing it is about.
- *Jaseem:* **"why are these fields smaller?"** — half width was `FieldShell`'s
  default, so it happened wherever nobody decided. Default flipped to full width;
  `span={1}` now states "this is half of a pair", and there are six pairs.
- *Jaseem:* **"schedule is a sub of scheduled backup and now its separated"** —
  right, and the fix was an order, not a style: shared prerequisite first, then
  each switch immediately followed by what it turns on.
- *Jaseem:* a switch label names the **thing** (`Scheduled backups`), not the act.
- *Jaseem:* a setting the switch has not unlocked is **hidden**, not greyed.
- *Jaseem:* the toggle gap goes to **24** and the switch centres on the whole
  statement — globally.

**Found, not asked for:**
- The env-var row collapsed to a **26px** name box, because `FieldShell`'s fill
  rule reached inside a composite. Narrowing it to a direct-child rule would have
  broken the addon `Schedule` field — **the suite is green either way, because it
  is geometry, not behaviour.** Reverted; the one real conflict declares its own
  width with `!`.
- The backups disabled-reason promised *"how long backups are kept"*. There is no
  retention field on that form; `retention_policy` belongs to the **object store**.
- `dev:mock` had no single-repository handler, so previews' required `Base branch`
  opened empty on a repo whose branch the list had just shown.

**Left for Jaseem:** the addon detail page (`← All addons`, `Delete` outside a
kebab, bordered panels, a 330px empty region); where `Version` and `Superuser
credentials` belong; `(optional)` on the previews env label.

**Next:** Secrets, same exercise — in a new chat.

## 2026-08-16 03:34

**Did:** Closed the create-stack journey. Repository step rebuilt from boards
`564:6733` / `564:6845` (switch + search on one row, `Provider` not `Connected
provider`, `visibility · branch` meta, search stays but disabled in the
no-provider state). Restored the service step deleted by the graphite pass, plus
its schema. Back arrow removed from every drawer and the path crumbs made
clickable. `PickerRow`'s 56 rung dropped to 13/500. Fixed the `Switch`'s uneven
thumb gaps and the page-behind-drawer padding jump. Explored the public-URL
input in Figma (`597:6952`, four options) and shipped B + C. Audited every file
the redesign deleted and fixed two silent regressions. Updated `DESIGN-PRODUCT.md`
§12a/§13, `frontend/CONTEXT.md` (8 stale entries corrected, 9 terms added), and
`docs/design/redesign-log.md`.

**Decided:**
- *Jaseem:* 56 picker row name is **13/500**, not `name/500` — his Figma had both.
- *Jaseem:* remove the back arrow, make the breadcrumb clickable, **all drawers**.
- *Jaseem:* **"we can't remove any steps"** — the configure step comes back. It had
  been deleted on sound reasoning about where fields *live*, which was the wrong
  question.
- *Jaseem:* pair fields **only where it means something**; `Branch | Port` did not.
- *Jaseem:* option **B** for the URL input, then **C** on top.
- *Jaseem:* **no warnings in the template rail.** Measured after he asked: all seven
  templates warn, ToolJet with the same sentence five times. Overruled my own
  addition from an hour earlier.
- Step names go **short** (`Select a service`, `Select repository`), reversing two
  earlier passes that had made them longer.

**Open:** `SOURCE_LEDE` and `import-warnings-toast.tsx` are both orphaned — his
call. Nothing committed (26 files on `graphite-pass-2`). Previews' `GitSourcePicker`
has not had any of this applied. Stale Figma frames flagged, not swept. `Cancel` on
the one-phase drawers still undecided.

**Verified, not assumed:** all six paths driven in `dev:mock` to `/stacks/draft`
with no console errors; the seed carries the typed service name, port 8080,
`exposed_to_public: false`, Dockerfile path and build context. 275 test files,
2035 tests, 0 failures; `tsc` clean; lint 0 errors.
