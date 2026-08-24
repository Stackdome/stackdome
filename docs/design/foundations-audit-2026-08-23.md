# Foundations audit — 23 August 2026

Every foundation in `DESIGN-PRODUCT.md` §3–§9, measured against the code and
against the five Interface Craft notes in [`reading/`](reading/).

**Scope:** 559 files scanned, 438 excluding stories and tests. Every number here
is counted, not estimated. Where a count would mislead, it is classified before
it is reported.

**Nothing was changed.** This is a findings list.

## Verdict per foundation

| Foundation | State |
|---|---|
| **Colour — discipline** | **Excellent.** Zero hardcoded colours in product UI |
| **Colour — palettes** | **One real failure** — `--chart-*` is not lightness-normalised |
| **Iconography** | **Clean.** One library, one stroke width, one size ladder |
| **Borders** | **Done, and the open task tracking it is wrong** |
| **Shadows** | **One real gap** (`2xl`) and **one rule that has quietly stopped being true** |
| **Type — the scale** | **Sound, and unenforced.** 53 weight violations, an undocumented rung |
| **Type — copy** | **Fails.** 44 to 5 on apostrophes |
| **Space** | **The weakest area.** One region of the app runs its own system |
| **Alignment** | **Not audited** — needs the browser harness |

---

## Colour

### ✓ Discipline is the best thing in the codebase

| Check | Result |
|---|---|
| Hardcoded hex in product UI | **0** — three matches, all in comments or a dev-console style string |
| Hardcoded `rgb()` / `rgba()` | **0** |
| Raw Tailwind palette (`text-gray-500`, `bg-blue-600`…) | **0** |

Across 438 files. Every colour in the product comes from a token. **This is
rarer than it sounds and worth protecting** — it is what made the rest of this
audit possible.

### ✗ 1 — `--chart-*` is not lightness-normalised

| Set | OKLCH L spread |
|---|---|
| State ink, light | 2.1 — fine |
| State ink, dark | 0.2 — the file says *"all four sit at L\* 77"* |
| **`--chart-1…5`, light** | **6.8** |
| **`--chart-1…5`, dark** | **7.0** |

`--chart-4` (amber) is the brightest series in both themes; `--chart-1` (blue) is
the dimmest in dark. Chart series have no inherent order, so a brightness spread
reads as **emphasis nobody assigned** — the exact failure
[color-details.md](reading/color-details.md) names.

**The states were solved deliberately and the comments prove it. The chart
palette never was.** Cost: five hex values per theme, each also carrying a
contrast obligation. Not a find-and-replace.

---

## Iconography

**Passes the [style-details.md](reading/style-details.md) test on all three
sub-axes.**

| Sub-axis | Result |
|---|---|
| One library | **lucide only** — 133 imports, nothing else |
| One stroke width | **Default everywhere.** One override: `checkbox.tsx` at 2.67, deliberate |
| Fill vs stroke | No mixing. The only non-`none` fills are the brand mark, the addon-type glyph and a canvas wire — all vector art, not icons |

| Size | Count |
|---|---|
| `size-4` (16) | 74 |
| `size-3.5` (14) | 35 |
| `size-3` (12) | 20 |

### ~ 2 — five off-ladder icon sizes

`size-[18px]` ×2 · `size-[22px]` · `size-[30px]` · `size-[15px]`. Small, but each
is a value nobody can trace to a rule. **Low priority.**

---

## Borders

### ✗ 3 — the open task is wrong on both counts

`docs/tasks.md` carries *"Left: `card` and `select`."* Measured:

| Component | Mechanic | Elevated? | Correct? |
|---|---|---|---|
| `popover` `dropdown-menu` `dialog` `tooltip` | `outline outline-1` | yes | ✓ |
| **`select`** | **`[outline-width:1px]`** | — | **✓ already converted** |
| **`card`** | `border border-border` | **no** — its own comment: *"a card is white fill, 1px hairline, `rounded-lg`, and NO shadow"* | **✓ border is correct** |
| **`drawer`** | `border-l border-border-subtle` | yes | **✓ one-sided → §4 says a divider stays inside** |

**Nothing is left in that task.** `select` was done and the note never updated;
`card` is not elevated so it was never in scope; `drawer`'s line is one-sided,
which §4 explicitly exempts.

**§4's own list is also stale** — it names `card` among *"the first four [that]
are elevated"*, and `card` carries no shadow.

### ✓ Verified live, not from the class list

Measured in `dev:mock` with computed styles, 23 Aug, after Jaseem asked for each
one to be an outline at the subtle rung. **All three already were.**

| Surface | Outline | Border |
|---|---|---|
| Nav selected row (`sidebar.tsx`) | `1px solid var(--border-subtle)` | none |
| **Main sheet** (`app-layout.tsx`) | `1px solid rgba(53,35,0,0.06)` | **0px, all four sides** |
| **Detail sheet** (`drawer.tsx`, detached) | `1px solid rgba(53,35,0,0.06)` | **0px, all four sides** |

The two sheets are byte-identical, which is the rule — §12a wants two cards on
one mount cut from one stock.

**And the edge is not invisible.** Sampled across the main sheet's left edge:
frame **233.7** → edge **217.8** → card **255**. **Δ 15.9**, outline plus shadow.

> **Three requests in a row turned out to be already-conformant.** Worth noting as
> a working pattern rather than a fault: the rules are further ahead of the
> perception than the perception expects. **Measure the surface before changing a
> token** — twice now the class list said one thing and only the computed style
> settled it.

> This is the item Jaseem flagged as *"we are struggling especially with the
> borders."* On the technique itself we are **fully conformant** — every rung is
> alpha over a derived warm ink, which is more than the article asks for. **The
> struggle is the bookkeeping, not the borders.**

---

## Shadows

### ✓ 4 — FIXED 23 Aug. `--shadow-2xl` was a single blur, both themes

`0 28px 64px -20px`, one layer, no contact. Callers:

| |
|---|
| `ui/dialog.tsx` — every dialog |
| `ui/alert-dialog.tsx` — every destructive confirm |
| `ui/drawer.tsx` — **every drawer**, which §12a makes the main object-editing surface |

The rung that floats furthest was the only large rung with nothing tight
underneath it.

**Landed the same day, along with `sm`** — which turned out to be the worse of the
two, moving luminance by **2.0 across one pixel**. Jaseem took candidate **C** for
both from the specimen panes.

| | Edge Δlum | Reach |
|---|---|---|
| `sm` light | 2.0 → **6.0** | 1px → **5px** |
| `sm` dark | 2.9 → **5.1** | 2px → **9px** |
| `2xl` light | 15.9 → **31.0** | — |
| `2xl` dark | 6.9 → **11.1** | — |

See §5, *"Every rung is a contact layer plus an ambient one"*.

### ~ 5 — the contact layer runs lighter than the ambient

| Rung | Outer → inner |
|---|---|
| `md` | 0.06 → 0.035 |
| `lg` | 0.11 → 0.06 |

[compositing.md](reading/compositing.md)'s model is *tight and **dark*** plus
*wide and soft*. Ours is two ambient falloffs. Not wrong — the layers overlap so
the edge is still darker — but the tight layer carries the smaller share.
**`--shadow-toast` is the one value done the other way, and it was Jaseem's call
on 16 Aug.** A judgement to make in the running app, not from the numbers.

### ✗ 6 — "content is flat" has one stated exception and five real ones

§5: *"Rows, cards, chips and nav items get nothing"*, with exactly one exception
— the selected segment.

| `shadow-sm` on content | Documented? |
|---|---|
| `segmented-control.tsx` — selected segment | **✓ the stated exception** |
| `picker-row.tsx:175–176` — **selected AND hover** | commented, not in §5 |
| `template-tab.tsx:91` — the template chip | commented, not in §5 |
| `sidebar.tsx` — the menu button | commented, not in §5 |
| `canvas-controls.tsx` — the canvas toolbar | arguably an overlay, so arguably fine |

Each has reasoning at its call site. **None of them is in the rule.** A rule with
one stated exception and five real ones is not governing anything — either §5
absorbs them or they come off.

---

## Type

### ✗ 7 — 53 call sites above weight 500

§6 settled two weights (400 / 500) in August and put 600 off the scale, noting
*"roughly sixty call sites still ship 600."* Measured: **52 `font-semibold` + 1
`font-bold`, across 35 files.**

| Worst |
|---|
| `clusters/.../cluster-create-form.tsx` — 5 |
| `stacks/components/list/index.tsx` — 4 |
| `branded/failure-card.tsx` · `not-found.tsx` · `secrets/index.tsx` — 3 each |

The rule was deliberately landed ahead of the code, to be corrected per journey.
**A year from now it is either swept or it is not a rule.**

### ✗ 8 — `index.css:714` contradicts §6

The token file still reads *"Weights: 400 default · 500 interactive/emphasis ·
**600 titles. Only three.**"* **One line, wrong since August.**

### ✗ 9 — an undocumented 9px rung, used 12 times

§6's floor is `text-label` at 11. `text-[9px]` appears **12 times**, mostly on
`font-mono` micro-labels — entity cards, the stage tracker, config diffs, the
split console, metrics, project chips.

**It is a real rung doing a real job and it is not on the scale.** Either §6
gains it or the call sites come up to 11.

### ~ 10 — six raw `text-[11px]`

That is `text-label`'s exact size, typed as a raw value. §6 opens with *"use the
token, never `text-[13px]`."*

### ✗ 11 — 44 straight apostrophes to 5 curly

`Couldn't refresh stack` · `You don't have a project to create secrets in.` ·
`Changes couldn't be saved.` · `Paste the repository's URL`

§6 legislates punctuation in copy — it bans the em dash outright — and says
nothing about apostrophes, so both conventions have been running side by side.
**The cheapest fix on this list and the easiest to regress.**

### ~ 12 — no middle truncation

69 `truncate` call sites, all end-clipping. Image refs, branch names, paths and
volume mounts are values whose **tail** carries the meaning.

---

## Space

**The weakest foundation, and the count needs classifying before it means
anything.** 55 arbitrary px values across 34 distinct numbers — but a third of
them are correct.

### ✓ Correct, do not touch

| | |
|---|---|
| `button.tsx` — 10 values | §9's optical padding: `icon side = base − 3`, `label side = base + 2`. `pl-[7px]` `px-[15px]` `pr-[12px]` `pl-[17px]` are the rule, not violations |
| `input.tsx` `select.tsx` — `px-[15px]` | The `lg` base, so a field and the button beside it align |

### ✗ 13 — the stack editor's tabs run their own spacing system

| File | Values |
|---|---|
| `deployments-tab.tsx` | `px-[30px] py-[26px]` |
| `metrics-tab.tsx` | `px-[30px] py-[26px] p-[18px] mb-[18px] gap-[3px]` |
| `logs/log-viewer.tsx` | `px-[30px]` |

**30 and 26 are not on any ladder** — §8's rungs there are 32 and 24. The three
files agree with each other and with nothing else in the product. This reads as
**a region the graphite pass never reached**.

`metrics-tab.tsx` alone carries five off-ladder values.

### ✗ 14 — three near-identical values in one file

`timeline/rail-node.tsx` — `mt-[13px]`, `mt-[14px]`, `mt-[15px]`.

[alignment.md](reading/alignment.md)'s A3: **near-alignment reads as a mistake,
not a choice.** §8 already contains the same finding measured on the addon
drawer — *"two of them 9px apart"*. Three values within 2px of each other, in one
component, is that failure in its purest form.

### ~ 15 — two one-off page paddings

`app-layout.tsx` `p-[52px]` · `dialog.tsx` `p-[29px]`. Both may be measured
optical calls; neither says so at the call site, which is what makes them
indistinguishable from drift.

### ~ 16 — 22 arbitrary heights

`h-[7px]` ×7 · `h-[18px]` ×3 · `h-[22px]` ×2, and 9 more. Some are graph
geometry and legitimately off the control ladder.

---

## Alignment — not audited

[alignment.md](reading/alignment.md)'s first principle is **count the invisible
alignment lines.** That cannot be counted from source: it needs
`.measure.mjs` in the running app, reporting the distinct x-edges on a surface.

**Not run.** The sidebar, the drawer, a detail section and the canvas card are
the four surfaces worth measuring first.

---

## What this adds up to

**Ranked by what actually costs the product something:**

| # | Finding | Cost to fix |
|---|---|---|
| 11 | 44 copy strings on a typewriter apostrophe | Small |
| 8 | `index.css:714` contradicts §6 | One line |
| 3 | The border task tracks work that is already done | Delete it |
| 13 | The editor's tabs run their own spacing | Medium |
| ~~4~~ | ~~`--shadow-2xl` has no contact layer~~ | **Done 23 Aug — with `sm`** |
| 6 | Content-is-flat has five undocumented exceptions | A decision, then small |
| 7 | 53 call sites above weight 500 | Medium, and explicitly per-journey |
| 9 | An undocumented 9px rung | A decision |
| 1 | `--chart-*` not normalised | Medium — contrast obligations |
| 14 | Three near-identical values in `rail-node` | Small |
| 5 | Contact layer lighter than ambient | A judgement, in the browser |
| 12 | No middle truncation | Small, one utility |

**The pattern across all of it:** the rules are sound and the token layer is
genuinely strong. **What decays is the bookkeeping** — a rule landed ahead of the
code (7), a note never updated (3), a comment left behind (8), a region the sweep
missed (13), an exception never written into the rule it breaks (6).

**Six of the twelve are documentation drift, not design failure.**

> **Closed since this audit was written:** finding 4 (`2xl`), plus `sm`, which
> the audit had let pass as *"defensible"* and Jaseem overruled on sight. The
> measurement agreed with him — 1px of reach is not a shadow.
