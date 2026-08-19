# The canvas and the node inspector — the plan to code it

The board is settled: section `the canvas — shell and chrome` (`705:8610`) in
Figma `2IcCJOgsROpgajjXlay1h9`. Five 1440×900 shell frames, the node specimen
sheet, the inspector at 480 with its volume and full-form panels, and the
validation study. This is how it gets built.

**Rules:** `DESIGN-PRODUCT.md` · **Reasoning:** `docs/design/redesign-log.md`
(entries 2026-08-17) · **Open calls:** `docs/tasks.md`

---

## What changes, in one line

**The floating drawer stack becomes a region of the sheet.** A node opens in a
**480 panel flush to the sheet's right edge** — square, one hairline seam, no
scrim, no shadow — the canvas narrows to fit it, and a volume opens **in that
same panel** with the trail in its header. Everything else on the canvas follows
from the panel no longer floating.

**No backend change is required to ship the design.** One backend-adjacent fix
is in scope and called out in slice 8: the validation message that leaks a regex.

---

## What already exists, and what it becomes

| Today | Becomes | File |
|---|---|---|
| Floating, stackable drawer panels | **One region of the sheet** | `tabs/architecture/drawer-stack.tsx` → **deleted** |
| Stack/inset arithmetic for the float | — | `lib/canvas/drawer-stack.ts`, `lib/canvas/drawer-inset.ts` → **deleted** |
| Resource drawer, 3 sub-tabs | Inspector, **8 sections in one scroll** | `tabs/architecture/resource-drawer.tsx` → rewritten |
| `LedgerRow` / `LedgerSection` / `LedgerDisclosure` | **`FieldShell` + a section primitive** | `drawer-tabs/ledger.tsx` → **deleted** |
| Volume drawer (a second floating panel) | The **same panel**, one level deeper | `tabs/architecture/volume-drawer.tsx` → absorbed |
| `Draft ǀ Live` segmented over the canvas | **Version chip** beside the title | `tabs/architecture/live-view-toggle.tsx` → **deleted** |
| Header collapse + zen mode | **One header**, no collapse | `lib/canvas/header-collapse.ts` → **deleted** |
| `+ Add resource` popover at 560 | The create-stack catalogue at **272** | `tabs/architecture/add-resource-popover.tsx` → rewritten |
| Node card | The settled card | `tabs/architecture/nodes/` → rewritten |
| — | **Section** (rule + label, and a disclosure) | `components/branded/form-section.tsx` (new) |
| — | **Record row** (a repeating multi-control row) | `components/branded/record-row.tsx` (new) |

`architecture-tab.tsx` is **36,883 bytes** and holds the canvas, the drawer
wiring and the add flows in one file. It is split by this work, not rewritten
wholesale — see slice 0.

---

## Slices, in order

Each slice ends green — `pnpm --prefix frontend test:run`, `lint`, `tsc -b` —
and each is reviewable on its own. **Storybook first**, per `CLAUDE.md`.

### 0 · Split `architecture-tab.tsx` before touching it

No behaviour change. Lift the canvas, the drawer host and the add flows into
three files so every later slice has one place to land. Tests stay green
throughout; this slice is a pure move.

**Done =** the file is under 400 lines and nothing else changed.

### 1 · The ground and the node card

| | |
|---|---|
| `--surface-canvas` | New token. Light `#fbfbf8` (Jaseem's own value), dark `#181715` — derived at the same **59%** between frame and sheet, so it survives a palette change |
| Node elevation | **`shadow-md`.** A hairline needs 49% ink to clear 3:1 on white — measured — so tone cannot separate a white card from a white ground |
| Card | **240 wide.** Glyph 12, text column **36**. A **6px dot after the name**, in the state's tone |
| The word | Every state that asks you to act **says its word** on line 2 — `Pending`, `Failed`, `Unknown`, `Not deployed`. A Ready card shows its image and no word |
| Docked volumes | **Fully white, indent only** — no rule, no fill. The card is one surface |
| Strokes | `outline`, not `border` — the card is elevated (§ the outline rule) |
| Orange | **None, anywhere on the canvas** — wires, drop targets, the save bar's spinner and pulse, diff chips, timeline nodes |

**§5 needs one sentence first** (`docs/tasks.md`): *a canvas is a space, not a
surface, so the objects in it are the one content that floats.* That is Jaseem's
call and it gates the `shadow-md`.

### 2 · The header — four zones, not a ranked cluster

Actions are **sorted by kind**, not ranked into one cluster.

| Zone | Holds |
|---|---|
| Title row, left | Trail, then the **version chip** |
| Title row, right | The status fact, `Deploy`, kebab |
| Toolbar row | The four tabs — **nothing on the right** |
| The canvas | Zoom, fit, layout, connections, `Add resource` |

- The editor **stops printing its own title** — the sheet header already has it.
- `Draft ǀ Live` becomes the **version chip**: *which copy am I looking at*,
  carrying the change count, holding `Review changes` and `Discard draft
  changes` in its menu.
- **One collapse only** — the sidebar toggle. Zen mode and the header chevron
  both go, with `header-collapse.ts`.
- Band geometry is §12a's, not the list template's. **The 12/100 vs 16/108
  conflict is open in `docs/tasks.md` and must be settled before this slice.**

### 3 · The inspector region

The load-bearing slice. Build it in Storybook against fixture data first.

| | |
|---|---|
| Container | A **region of the sheet**, not an overlay. 480, flush right, `border-radius: 0`, **one hairline on the left edge** (a one-sided rule is a divider — it stays *inside*), **no scrim, no shadow** |
| Bands | **95 header · body `flex-1` scrolling · 81 footer.** Header and footer hairlines are permanent, not overflow affordances |
| Layout | `flex-col` on the region; the body is the only thing that scrolls |
| The canvas | Narrows to `calc(100% - 480px)`. At 480 the whole graph still fits beside it — that is the argument for the width |
| One panel | A volume opens **in the same panel**. The header becomes `web › uploads`; `web` is the way back. **No stack, no second surface** |

**Delete `drawer-stack.tsx`, `drawer-stack.ts` and `drawer-inset.ts` in this
slice**, not later — the inset arithmetic exists only to stagger floating panels.

**Keyboard:** `Esc` closes the panel. It used to pop one panel off a stack and
`Shift+Esc` closed all; with one panel both collapse to one binding. The volume
level goes back to its service, then closes.

### 4 · Sections, not sub-tabs

`Configuration ǀ Deployment ǀ Environment` become **eight sections in one
scroll**. Label-above halves the height of every row, which is what made three
tabs necessary.

| Section | Fields |
|---|---|
| General | Name · Depends on |
| Source | Build from → **git:** Repository, Revision, Branch name, Pin to commit · **image:** Registry, Image reference |
| ▸ Advanced | Dockerfile path · Build context · Push registry |
| Ports | per port: number, protocol, visibility, remove · `Add port` |
| Mounts | the volume row — read-only here, it **opens** the volume |
| Pre-deployment step | Init command · Init arguments |
| Main container step | Command · Arguments |
| Environment | per row: From, Name, Value, remove · `Add variable` · `paste .env` · `clear all` |

**Deployment is four fields.** It has been a whole tab at the same rung as a
Configuration carrying fourteen — that is the argument for sections, and it came
from the code rather than from taste.

**The section primitive**, two shapes, both already shipped on the addon drawer
(`pages/addons/components/postgres-form-fields.tsx` — lift it to `branded/`):

| | |
|---|---|
| Always-open | A **full-bleed top rule** and a `body/500` label. In code that is `border-t` on the section, not a `<hr>` |
| Collapsible | A **single leading chevron**, the label, then a **state word** — `Environment · 4 variables`. Content inset **44**, derived from the trigger above it so the two cannot drift |

**`ledger.tsx` is deleted with this slice** — `LedgerRow`'s label-left column and
its **right-margin mono `meta`** are both gone. What that `meta` was carrying
does not disappear; see slice 8.

### 5 · Fields and records

**A field** — `FieldShell`, label above, `space-y-1`, control fills its cell.
Pairs share a row **only when they are one subject**: `Revision ǀ Branch name`,
and nothing else. Two trailing edges, never five.

**A record** — a repeating row of controls (a port, a variable). New primitive,
because a record is not a field:

| Member | Sizing | Because |
|---|---|---|
| Holds an arbitrary value | **`flex-1`** | Port number, protocol, variable name, variable value |
| Holds a **closed set** | **fixed** | `Public ǀ Internal` at 130 · `From` at 116 |
| Remove | **fixed 32** | An icon button, packed straight after — **never `ml-auto`** |

**`ml-auto` is the bug this replaces.** Pushing one member to the far edge put a
hole in the middle of the record and is what made a port stop reading as one
thing. Gap **4** inside a record, **8** between records in a list.

**A two-way choice is a segmented, not a switch** — a switch needs a label beside
it to say what it toggles; a segmented is its own label. As a **field** it fills
and its halves split evenly; as a **member of a record** it hugs.

**Inside a table-shaped section the rhythm is 8, not 16** — column headers, the
list, its note and its add button are one subject.

### 6 · Value typography

Three primitives disagree about what a value looks like. **Fix the primitives**,
then audit the screens:

| Control | Ships | Should be |
|---|---|---|
| `Field` | `body/400` **muted** — a placeholder state only, so **every filled input reads as empty** | Filled: `body/400` at **ink**. Placeholder: same size, same weight, **muted** |
| `Select` | `body/500` **medium**, ink | `body/400`, ink |
| `Segmented` | `meta/500` at **12**, in a row of 13s | `body/400` at 13; selection carried by **colour alone** (§11) |

The label above keeps `body/500` — §6's binary doing its job: the label is
*about* the value.

**This reflows every screen that uses them.** Jaseem's call on the component edit
(`docs/tasks.md`); the canvas frames carry it as instance overrides so the
intent is judgeable first.

### 7 · Add resource

**The create-stack catalogue, literally.** `AddResourcePanel` already imports
`blockCatalog` and `BlockPicker`; what it must stop inheriting is the **added
badge**.

| | |
|---|---|
| Trailing slot | **None.** A click *is* the add and the graph is the record — there is no running set to report. The `×1` count and the tick are create-stack's, where the rail is the set you can take things out of |
| Width | **272** — 248 column plus 12 padding each side. Measured: text column starts at 56, widest line 180, right padding 12. Was 560 in code |
| Search | `Search resources…` — the long placeholder measured 198 and would have set the floor on its own. §8: shorten the copy before widening the field |

`BlockPicker` needs a prop for the trailing slot, or the canvas gets its own row
shape. **Do not fork the catalogue.**

### 8 · Validation — say the rule before it is broken

The rules exist and the UI never states them. Three defects, in order of blast
radius:

| | |
|---|---|
| **The regex reaches the user** | `pkg/validator/stackresource/input_rules.go:64` returns *"resource name 'Web API' must match `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` and be at most 63 characters"*. Rewrite to **"Use lowercase letters, numbers and hyphens."** The same leak is in `objectstore` and `postgresaddon` |
| **The browser never checks the pattern** | `pages/stacks/schemas/form-schema.ts` requires the resource name to be non-empty and nothing more, so the **round trip** is what tells you. Add the pattern and the 63-char cap to the zod schema, matching the backend exactly |
| **The constraint is stated nowhere** | `LedgerRow` carried `meta="lowercase · unique in stack"` and that was deleted with the right-margin metas. It comes back as a **`hint` under the field** |

**The pattern, on the board** (`791:32017`):

| State | |
|---|---|
| At rest | The rule as a **hint** under the control — *"Lowercase letters, numbers and hyphens."* |
| Broken | The **same rule in the imperative** replaces the hint — *"Use lowercase letters, numbers and hyphens."* — and the control takes a `danger` border |

**`Field` and `Select` have no error variant** — the board cannot draw a failed
field today, and neither can the component library. Adding one is a change to a
shared primitive: **ask before building it.**

Every field that has a rule gets a hint. Audit at minimum: resource `Name`,
`Port` number, port name (1–15 chars, at least one letter — enforced and never
surfaced), volume `Size`, and env var names.

### 9 · Live

Four differences, all consequences of one fact — **Live is read-only**:

| | |
|---|---|
| The version chip | `Live · no changes` |
| `Deploy` | **Disabled, with the reason immediately beside it.** §9 bans a disabled control that does not say why; here the why was already on screen and only needed to sit next to the button |
| The canvas tool group | **`Add resource` comes off** |
| The nodes | No draft stripe, and the degraded one **says its word** |

### 10 · Mono, on the canvas only

**Mono is for a URL.** Not a tag, not a path, not a branch name. The canvas
section went from **134 mono text nodes to 15**, all `ghcr.io/…`.

Off mono in this scope: kind labels (`Web`, `Service`, `Postgres`, `volume`),
status words, column headers, `paste .env` / `clear all`, `public`, change
counts, volume names, and every image tag and path.

**The rest of the product still ships §6's two mono rungs** — `font-mono` across
~40 files. That is a product-wide call in `docs/tasks.md`, **not part of this
work**. Scope this slice to the canvas and say so in the PR.

---

## The things a board cannot carry

Written down because they are invisible in Figma and will otherwise be lost.

| | |
|---|---|
| **The inspector is a region, so it is in the tab order** | Not a dialog. No focus trap, no `aria-modal`, no scrim. It is a landmark (`<aside>` with a label naming the node) |
| **`Esc` closes it** | One binding, because there is one panel. From a volume, `Esc` goes back to the service first |
| **The seam is `border-left`, inside** | A one-sided rule is a divider. The card outlines are `outline` because *those* float |
| **The canvas narrows, it does not slide under** | The graph must stay pannable to the full width; the viewport shrinks, the scene does not |
| **A borderless value still needs a focus ring** | Anywhere a control loses its border, `:focus-visible` has to put it back |
| **The remove button needs a label** | `Remove port 3000`, `Remove NODE_ENV` — an `✕` with no accessible name is 90% of a row's actions |
| **Tabular numbers** on the change count and replica counts | Both change under the reader |
| **The status dot is never alone** | It is legal only because the second line says the word (§7, WCAG) |
| **`shadow-md` on a node is content elevation** | The one exception §5 has to grant. Do not generalise it to anything else on the canvas |

---

## Definition of done

- Every board frame reachable in `dev:mock` **and** `dev:mock:empty`
- Stories for the inspector, the section primitive, the record row, the node card
  and the add-resource picker — covering empty, error, long text, read-only,
  disconnected stream, and a volume open one level deep
- `pnpm --prefix frontend test:run`, `lint` and `tsc -b` green
- **Measured in the browser, not eyeballed** — the gaps *between* elements, not
  only their positions. Assert: region 480 flush, bands 95/·/81, field gap 4,
  pair gutter 16, record gap 4, list gap 8, section padding 16/20/24/20
- A name with a capital in it fails **at the keystroke**, in words, with no regex
- No orange anywhere on the canvas, in any state
- The kebab holds every destructive action; the header holds none

---

## Risks

| | |
|---|---|
| `architecture-tab.tsx` at 36k | Slice 0 exists for this. Do not start slice 3 in the monolith |
| Deleting the drawer stack | `drawer-inset.ts` feeds the canvas's left shift and the header rows. Trace every consumer before removing it, or the header jumps |
| The value-typography fix | Three shared primitives, ~40 files. Gated on Jaseem's call; **do not sweep it inside this work** |
| `BlockPicker` gains a second caller with different rules | Add a prop; forking the catalogue is what this whole slice exists to prevent |
| The frontend/backend validation pair | Two regexes that must not drift. Put the pattern in one place the frontend imports, or a test that asserts they match |
| Six open calls in `docs/tasks.md` | §5's sentence gates slice 1, and §12a's band geometry gates slice 2. Neither is mine to make |
