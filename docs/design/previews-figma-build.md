# Previews — what landed on the board

Figma file `2IcCJOgsROpgajjXlay1h9` · page `0:1` · section **`previews`** (`655:7536`), at y ≈ 43000.
Built from the handoff in `previews-figma-handoff.md` and the settled artifact.

## The frames

| # | Frame | Node | Proves |
|---|---|---|---|
| 00 | all previews · Light | `655:7537` | The landing state. `All previews` selected, Repository as a column, 4 rows |
| 01 | one repository · Light | `660:7723` | Rail selection, no Repository column, context line + cap meter, one row hovered, the rail gear on approach |
| 02 | no previews yet · Light | `664:7907` | Rail exists, body is "No open pull requests". Single-row header |
| 03 | first run · Light | `665:8320` | No rail. One first-run state, header carries `+ Enable repository` |
| 04 | at the cap · Light | `665:8043` | Meter turned to `state/warn`, inline alert, `+ New preview` blocked |
| 05 | one repository · Dark | `665:8567` | Rail, row and status tokens flip. Colour + Elevation pinned to Dark mode |

## The drawers

| Drawer | Node | Size |
|---|---|---|
| Repository settings | `668:8562` | 640 (`Size=work`) |
| Preview | `670:8615` | 480 (`Size=form`) |

## Measurements

| | |
|---|---|
| Rail column | **240** = 224 item + 8 padding each side. **`surface/sheet` — white, Jaseem's call.** 1px `line/hairline` on the right edge is the only separation. (`surface/sheet-2` was the first attempt and is now unused) |
| Rail internals | 12 top/bottom padding, label at 11px `ink/fg-muted`, items at 1px spacing, footer = hairline + 8 + ghost `+ Enable repository` |
| Body column | **946** (1186 sheet − 240 rail). Rows and headers inset 16 left, 8 right → **922** wide |
| Row tracks — preview | `220 · fill(392) · 92 · 66 · 56`, gap 20, padding `0 8`, height 64 |
| Row tracks — preview + repository | `220 · 140 · fill(232) · 92 · 66 · 56` — Status and Updated land on the same x in both |
| Context line | y 16, height 20. **`web-storefront` in `name/500` ink leads**, then the URL + `·` + branch in `mono/meta` `ink/fg-muted` at 12 from it; right-aligned `N of M active` + meter |
| Context line → column headers | **20** |
| Meter | 44 × 4, radius `full`. Track `surface/selected`, fill `ink/fg-muted` — both turn `state/warn` at the cap |
| Column headers | y 56 (with a context line) or y 8 (without), height 24, 1px bottom rule, rows follow with no gap |
| Single-row header band | **56** — 12/32/12, matching the board template's own rhythm |

## Decisions taken while building

| Call | Why |
|---|---|
| **Rail action is `Tone=ghost`, not `secondary`** | Judged in situ on frame 01. `secondary` is `surface/control` + a hairline, which on the selected row's wash reads **lighter** than its own row and is the only bordered box in the rail. Ghost matches the preview row's own Sync/Delete glyphs — the same rule twice, as the artifact intended. Changed on all three `Trailing=action` variants of `Rail item` |
| **New `Columns` value: `preview + repository`** | Frame 00 needs a Repository column and the set had no cell for it. Four new variants (Ready/Deploying/Failed/Deleting) cloned from the `preview` block with a `meta/400` `ink/fg-2` cell inserted at index 1. `stack` and `preview` instances are untouched — verified by screenshotting `411:7765` before and after |
| **New colour variable `surface/sheet-2`** | The rail ground. Light `#FAF9F6`, dark `#232220` — the resolved snapshot of `--secondary` / `--control` in code, which the board did not carry. No raw hex anywhere |
| **The actions track stays, its glyphs hide** | Hiding the `actions` frame collapses the auto-layout track and pushes Status and Updated 76px right. Hiding only the two icons keeps the row from reflowing, which is what §11 asks for |
| **Repository cell is `ink/fg-2`, not `fg-muted`** | §7 puts "project" in the `fg-2` tier. It identifies a different object on every row, so it is data you read, not furniture |
| **Destructive triggers are `destructive-ghost`** | `Remove repository` and the preview drawer's `Delete`. §10's "red fill, not red text" governs the confirm's commit button; the trigger that opens it is not the commit |
| **Read-only `Repository` is a value, not a field** | §9 — a field that can never be filled is not a field |
| **The section title is always `Previews`** | Jaseem, after seeing it live. A title that changes with the rail selection is confusing: the rail already says which repository, and the header stops being a fixed landmark. The selection is named in the context line instead |
| **The context line leads with the repository name at `name/500` ink** | Once the title stops changing, the context line is the only thing naming the selection, so it cannot be furniture. Name in ink, machine string beside it in muted mono — the row's own name-then-meta pattern, laid horizontally |

## Copy corrected against §6

| Artifact | On the board |
|---|---|
| "Fetched from the repository on every deploy — a wrong path…" | "…on every deploy: a wrong path…" |
| "Open the stack — logs, metrics, resources ↗" | "Open the stack: logs, metrics and resources ↗" |

## Propagated to the rest of the board

Asked for after the previews frames were approved. Checked every full-screen frame on the page (30 of them) and every rail-like panel.

| Rule | Where it fired |
|---|---|
| **The title never changes with an in-page selection** | **Nowhere else.** All 30 full-screen frames already title themselves with a section name — `Stacks`, `New stack`, `Secrets`, `Object stores`, `Addons`, `Git integrations`, `Image registries`, `Clusters`, `Domains`, `Section`. Previews was the only page with an in-page selector, so it was the only page that could break it |
| **The rail ground is the sheet's own white** | **Already true everywhere else.** The three new-stack rails and the new-stack drawer rail carry no fill at all. Previews now matches them |
| **The rail seam is `line/hairline`, not `line/subtle`** | **Four rails changed** — `565:6996` (new-stack drawer), `549:5816` and `553:6150` (journeys — show the path), `554:6387` (Section 1). They drew a region boundary on the inside-a-control rung. Rule written into `DESIGN-PRODUCT.md` §4 |

**Left alone, needs a call:** the four rails run at **three widths and four left paddings** — 300/24, 300/24, 240/16, 240/20, against previews' 240/8. Normalising them would reflow those frames, so it is not a change to make unasked.

### Round two — from Jaseem's edits to the Preview drawer

He took the title down a rung, took the status word off mono, and turned the preview URL into a grey well. Two of the three had to travel.

| His edit | Where else it fired |
|---|---|
| **Status word `mono/meta` → `meta/500`** | **All eight preview row variants.** The five `stack` variants were already `meta/500`; the preview block shipped mono, so `Ready` and `Deploying` read as values you are not allowed to change (§6 names a status word as the example). Fixed at the component, so every frame followed |
| **Read-only value becomes a grey well** | **The settings drawer's `Repository` field.** Same case — a machine string you reference and copy. `--control`, radius `md`, 32 tall. Rule written into `DESIGN-PRODUCT.md` §9 |
| **Drawer title `head/500` → `title/500`** | Nowhere — he had already changed both previews drawers. **The `Drawer` component and the older built drawers on the board still ship `head/500`.** His call |

**Still mono, and arguably shouldn't be:** the URL cell's `building…` and `tearing down…` placeholders. They are human phrases in the machine-value column. Left as-is because switching typeface mid-column is its own kind of wrong — worth one decision either way.

## The review, and what shipped from it

A `better-interface` review of frame 01 found 2 HIGH and 4 MEDIUM. They were built in a side-by-side frame first (`01b`, `686:8589`), then **approved onto every artboard**.

| Finding | Verdict | Where it landed |
|---|---|---|
| 1 · ghost tier | approved | **The `List row` component** — all 8 preview variants. Every frame follows |
| 2 · action track | approved | **The component** — 64px track, two 32px `ghost` icon buttons |
| 3 · name column | approved | **The component** — 280 on `preview`, 240 + a 120 repository column on `preview + repository` |
| 4 · context-line rank | approved | Frames 01, 02, 04, 05, 01b |
| 5 · square hover | approved | Every row on every frame |
| 6 · button label | **rejected** | *"New preview is enough."* Both the header and frame 02's empty state say `New preview`; the longer label is gone |
| 7 · gear radius | not applied | The rail item's padding is Jaseem's |
| 8 · `no URL` | approved | The component |

**Also removed: the cap meter.** `3 of 5 active` states the number exactly; the 44×4 bar restated it approximately. Rule written into `DESIGN-PRODUCT.md` §7 — *a number said in words gets no second picture*.

**`01b` is now redundant.** It was the before/after frame; with everything approved onto `01` it is an exact duplicate. Its rows were relinked to the component so it cannot drift, but it can be deleted whenever.

### The findings as built

| # | Was | Is | Measured |
|---|---|---|---|
| 1 | `building…` and `—` at `ink/fg-ghost` | `ink/fg-muted`, and `—` says `no URL` | **1.95:1 → 5.60:1** on the sheet (APCA Lc 37.6 → 78.0). §7 reserves ghost for disabled; this was live status text |
| 2 | Two 16×16 bare glyphs, 2px apart, 56px track | Two **32px `ghost` icon buttons**, 64px track | Clears WCAG 2.5.8's 24×24 floor and matches §11's stated 64px pair track |
| 3 | Preview column **220** — under §11's own `minmax(240,420)` | Preview **280** pinned, URL takes the slack | Largest ink gap on the row **247 → 179**; spread 84–247 → 49–179 |
| 4 | Context line and row name both `name/500` ink | Context line → `title/500` | The container now outranks the items in it |
| 5 | Hover wash `radius md` | `radius 0` | Matches the shipped stacks row (`96:1228`), and a square wash is a band rather than the per-row card §11 bans |
| 6 | `New preview` vs `New preview from a branch` | **`New preview from a branch`** in both | One action, one label. The longer form is what stops it reading as a second way to do the automatic thing |
| 8 | `—` | `no URL` | `building…` reported and `—` withheld — two answers in one column |

**Not applied:** finding #7, the gear's radius. Concentric wants 4 inside a radius-8 row with 4px padding, and 4 is not on the `Radius` ladder. The clean fix is dropping the rail item's right padding to 2 so the existing `sm` (6) becomes concentric — **but that padding is Jaseem's own value.** Flagged, not touched.

**Re-measured mid-build:** the first re-cut gave the slack to the Preview column and made things worse — it moved the void from after the URL (247) to after the branch (188) rather than shrinking it. Pinning Preview at 280 and leaving the slack on the URL is what got the max down to 179.

**Build notes the board cannot carry:** the search field needs a real label; the rail's gear is an interactive control nested in an interactive row, so it cannot ship as a `<button>` inside an `<a>`; row actions reveal on **`focus-within` on the row**, not hover; `4d ago` and `3 of 5 active` need `tabular-nums`.

## Open — for Jaseem

| | |
|---|---|
| **Header geometry disagrees with `DESIGN-PRODUCT.md` §12a** | The doc says 64/108 with a 16px inset; the board template `411:7765` ships **100** with a **12px** inset. The frames clone the template, so they carry 12/100 (and 56 for a single row). One of the two is stale |
| **No external-link icon in `Icons — lucide` (`17:4`)** | `Open ↗` and `Open the stack … ↗` use the `↗` character in the label. A real `arrow-up-right` would be a new icon — asking first |
| **Rail width 240, not 224** | The handoff said "224 wide"; the `Rail item` component is 224, so the column is 224 + 8 + 8. Says the same thing, but the number in the handoff is the item, not the column |
| **`+ New preview` kept the toolbar row on frame 04** | The artifact's case 6 drops the status filter; case 4 keeps it. Frames 01, 04 and 05 keep it because there are previews to filter (§12a). Frames 02 and 03 drop it |
