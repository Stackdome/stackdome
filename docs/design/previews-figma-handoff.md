# Handoff — build the Previews screens on the Figma board

**Paste this whole file into a fresh chat to start.**

Repo: `/Users/jaseem/Projects/Stackdome` · branch `graphite-pass-2`
Working with **Jaseem** — a designer with basic coding knowledge.

---

## Read these first, in this order

| # | What | Why |
|---|---|---|
| 1 | `DESIGN-PRODUCT.md` | **The only authority.** If code and it disagree, the code is wrong |
| 2 | **The design board** (below) | Every screen you are drawing, in every state |
| 3 | This file, "The frames" | What to build, in order |
| 4 | `docs/design/create-stack-figma-plan.md` | Only for its *conventions* — the create-stack work itself is done |

**The design, agreed over six rounds:**
https://claude.ai/code/artifact/22900a99-6ff8-4dac-bc5b-e8da3388c28a

**Do not re-derive the design.** It is settled. Your job is to put it on the board.

Figma file `2IcCJOgsROpgajjXlay1h9` — *Stackdome — Shape + Hierarchy Pass*. One page, `0:1`.

---

## What the feature actually is

Read from the API spec, services and worker — do not re-derive, but do not contradict:

- **A preview *is* a stack.** Each pull request gets a real stack built from the repo's
  `stackfile.yaml`, tagged `preview-stack: true`. `/stacks` filters those out.
- A preview stack **cannot take a release and cannot be rolled back**. `Sync` is the only
  way it moves, because the branch is the source of truth.
- **Three levels:** repository (the rule) → preview (one PR) → stack (what runs).
- **There is no repository entity in Stackdome.** No table, no page, no id — a repo is a URL
  string on whatever object needed it. So the rail lists *repositories enabled for previews*,
  not "your repositories".
- `max_active_previews` caps environments per repo. **Removing a repository is blocked by the
  API while any preview is running** (`cannot delete preview config with N active preview stack(s)`).

---

## Phase 1 — components — **DONE**

All built, verified, and bound to `Colour` / `Radius` variables. No raw hex.

| Component | Node | State |
|---|---|---|
| **`List row`** | `96:1268` | Was `Stacks row`. Gained `Columns` = `stack` \| `preview`. **9 variants** |
| ↳ preview variants | — | `Status` = `Ready` \| `Deploying` \| `Failed` \| `Deleting` |
| **`Rail item`** | `640:7408` | `State` = default/hover/selected × `Trailing` = count/action. 224 × 32 |
| **`icon button`** | `50:1822` | Gained `Size` = `32` \| `24`. **60 variants**; the 24 block mirrors the 32 block |
| `icon/settings-2` | `638:7375` | New, in `Icons — lucide` (`17:4`) |
| `icon/refresh-cw` | `642:7399` | New, same set |

**Measurements already settled — match them.**

| | |
|---|---|
| Preview row tracks | `220 · fill · 92 · 66 · 56`, gap **20**, padding `0 8`, height **64** |
| Row cells | PR over branch (`name/500` + `mono/meta`) · URL (`mono/meta`, `ink/fg-2`) · dot + word (`mono/meta`, tone) · age (`meta/400`) · two actions |
| Rail item | radius **8**, padding left **8**, padding right **4** when the action is present, gap 8 |
| Rail action | `icon button` `Size=24, Shape=flat, Tone=secondary, State=default`, icon swapped to `settings-2` |

> **Jaseem adjusted the rail item himself** (radius, right padding, 24px action). Those values
> are his. Do not "tidy" them.

**One open judgement:** the rail action chip is `Tone=secondary` (`surface/control`) and reads
bright on the component sheet's grey. **Judge it on the real rail ground in frame 01.** If it is
too loud, `Tone=ghost` is a one-property swap — no rebuild.

---

## Phase 2 — the screens — **YOUR JOB**

New section `previews`, placed clear of everything else. The page's lowest content ends
around **y ≈ 41520**; put the section at **y ≈ 43000**.

Every frame is **1440 × 900**, built by cloning `00 list page — populated` (`411:7765`) and
swapping the sheet's contents. That frame is `Sidebar` (240) + `Sheet` (1186 × 876).

| # | Frame | What it must prove |
|---|---|---|
| 00 | `previews — all previews · Light` | The landing state. Rail with `All previews` selected, Repository as a column, 4 rows |
| 01 | `previews — one repository · Light` | Rail selection, **no Repository column**, the context line with the cap meter, one row hovered with actions showing, and **the rail gear on approach** |
| 02 | `previews — no previews yet · Light` | Rail exists, body is the "No open pull requests" state |
| 03 | `previews — first run · Light` | **No rail at all.** One first-run state, header carries `+ Enable repository` |
| 04 | `previews — at the cap · Light` | Cap meter turned, inline alert, `+ New preview` blocked |
| 05 | `previews — one repository · Dark` | Proves the rail, row and status tokens flip |

**The rail** (new, inside the Sheet): 224 wide, `surface/sheet-2`-ish ground, `line/hairline`
on its right edge, 12px padding, `Rail item`s at 1px spacing, an 11px `ink/fg-muted` label
"Repositories", and `+ Enable repository` pinned to the bottom above a hairline.

**The context line** (frames 01, 02, 04): repo URL + base branch in `mono/meta` `ink/fg-muted`,
and right-aligned `N of M active` with a 44 × 4 meter. In frame 04 the meter and the number
turn `state/warn`.

---

## Phase 3 — the two drawers

| Drawer | Why | Reuse |
|---|---|---|
| **Repository settings** | It is a **dialog** in code today — wrong surface. Four fields plus a repeating env-var list is one object being edited | `Drawer` `466:5322`, `Drawer — states` `466:5336`, `Field` `21:191`, `Key/value row` `493:5452` |
| **Preview drawer** | **The only genuinely new surface.** Clicking a row today throws you onto `/stacks/<id>` | Same drawer primitives |

Also on the board and **already correct — reuse, do not redraw**: the `enable repository`
section (`483:5283`) has all four phases of the add flow.

Both drawers are specified in full, with copy, in the artifact.

---

## Things that will cost you time if you don't know them

**Reuse before you create.** The board already has: `app shell` (`357:3140`), the six-frame
`list page — the template` (`367:3024`), `Sidebar` (`50:2360`), `Dialog` (`403:4896`),
`Confirm` (`415:4974`), `Button` (`3:14`), `Field`, `Select`, `Inline alert` (`231:1158`),
empty-state patterns (`310:15276`, incl. `state / nothing yet (shared)` `360:3102`).

**"Update the existing primitive rather than creating a new component — and ask first."**
This is the rule broken most often. It is why `Stacks row` became `List row` instead of a
`Preview row` being forked, and why the rail action is an `icon button` and not a chip.
Jaseem made both calls. **If a new component seems necessary, ask.**

**Two rules break most designs here.** Both in `DESIGN-PRODUCT.md`, both easy to skim past:
- **No orange** (§7). Black is the only action colour.
- **No uppercase** (§11) — not for eyebrows, not for column headers.

**Row actions: one or two sit on the row, three or more collapse into a menu** (`34d71ba`).
A preview row has two (Sync, Delete) so they are on the row. A rail row has one (Settings),
so it takes the count's slot on approach — the row must not reflow.

**Never sweep the board.** Jaseem updates frames one at a time. Add new frames; flag stale
ones in chat rather than editing them.

**When adding a variant property to a live component**, prefix the existing variant *names*
(`Status=Failed` → `Columns=stack, Status=Failed`). Instances keep their values and nothing
re-renders. Screenshot a frame that instances it, before and after, to prove it.

**`docs/superpowers/` is gitignored.** Anything that must persist goes in `docs/design/`.

---

## Four decisions already settled — do not reopen

All four take the answer the shipped product already gives, so **nothing here needs a backend change.**

| Question | Answer |
|---|---|
| Preview named by PR or branch? | **PR first, branch second** — what the card already does |
| Read-only: hide or disable controls? | **Hide** — what the code already does |
| Can a repository be paused? | **No.** There is no on/off, and the cap floors at 1. Remove is the only off switch |
| Does settings get its own URL? | **No route.** It is a dialog with no route today |

---

## How to work with Jaseem

- **Short lines, bullets, tables.** No long paragraphs. Bold what must not be missed.
- **Show, don't describe.** Screenshot every frame you build; he judges pictures, not prose.
- **Measure, don't eyeball.** He will ask for numbers, and he is right to.
- Give a rough time estimate before starting something.
- Skip engineering detail unless he asks.
- He pushes back hard and usually correctly. When he does, **check the evidence** rather than
  defending the design. In this session his pushback on where repository settings lives was
  right, and the codified row-actions rule backed him.

---

## State of the repo

Uncommitted, additive, **already verified — 2055 frontend tests green, tsc and lint clean**:

```
 M frontend/src/components/git-source-picker/git-source-picker.tsx
 M frontend/src/components/git-source-picker/tests/git-source-picker.test.tsx
 M frontend/src/pages/stacks/components/create/new-stack-drawer.tsx
 M frontend/src/pages/stacks/components/create/new-stack-drawer.stories.tsx
 D frontend/src/pages/stacks/components/create/tabs/repository-tab.tsx
```

That change **deleted a forked repository picker**: the new-stack step kept its own copy of
`GitSourcePicker`, and the copy could not offer a choice between providers, had no field at all
for a token connection, and navigated out of the drawer to connect one. Both journeys now render
one component. **Not committed** — the working tree also carries unrelated object-stores changes
from another session, so staging is Jaseem's call.

Nothing else in `frontend/` or `pkg/` was touched.

---

## Suggested skills

| Skill | When |
|---|---|
| **`figma:figma-use`** | **Mandatory before every `use_figma` call.** Do not skip it |
| `figma:figma-generate-design` | Phase 2/3, assembling the screen frames |
| `figma:figma-generate-library` | Only if a new component is approved |

`get_metadata` and `get_screenshot` need no skill and are the cheapest way to read the board.
`get_metadata` on the whole page (`0:1`) **exceeds the token limit** — pass a section id, or
grep the saved output. `search_design_system` is **useless here**: these components are local
to the file, not published, so it returns nothing.

---

## Definition of done

- Six Light/Dark frames and two drawers on the board
- Every fill, stroke and shadow bound to a variable — spot-check with `get_variable_defs`
- No orange, no uppercase, radius matching height
- Each frame screenshotted and compared to the artifact at 1440
- The rail chip tone judged in situ and settled
- **Jaseem has seen the screenshots and said yes**

Then, and only then, code — Storybook-first per `CLAUDE.md`.
