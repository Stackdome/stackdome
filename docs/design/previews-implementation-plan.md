# Previews — the plan to code it

The board is settled and approved: section `previews` in Figma `2IcCJOgsROpgajjXlay1h9`, six 1440×900 frames plus two drawers. This is how it gets built.

**Design record:** `docs/design/previews-figma-build.md` · **Rules:** `DESIGN-PRODUCT.md` · **Original brief:** `docs/design/previews-figma-handoff.md`

---

## What changes, in one line

Two pages become one. `/previews` is a list of *repositories* today and `/previews/:configId` is a grid of *environment cards*. They collapse into **one screen: a repository rail on the left, preview rows on the right** — and `/previews/:configId` resolves to that same screen with the repository selected.

**No backend change.** Every screen is drawable on the API that exists.

---

## What already exists, and what it becomes

| Today | Becomes | File |
|---|---|---|
| Repository list page | The **rail** | `pages/previews/index.tsx` → rewritten |
| Environment card grid | **Preview rows** on `DataListRow` | `components/preview-env-card.tsx` → **deleted** |
| Repository list rows | absorbed into the rail | `components/config-list.tsx` → **deleted** |
| Config detail page | absorbed into the one screen | `config-detail.tsx` → **deleted**, its filter/sort logic salvaged |
| Settings **dialog** | Settings **drawer**, 480 | `components/config-settings-modal.tsx` → rewritten |
| Enable-repo wizard | unchanged, moves to the rail footer | `components/enable-repo-wizard/` |
| New-preview drawer | unchanged, gains the cap line | `components/new-preview-env-drawer.tsx` |
| Sync dialog, delete confirm | copy only | `components/sync-env-dialog.tsx` |
| — | **Preview drawer** (new) | `components/preview-drawer.tsx` |
| — | **Context line + cap** (new) | `components/repository-context-line.tsx` |
| — | **Repository rail** (new) | `components/repository-rail.tsx` |

**API and hooks are untouched:** `api/preview-configs.ts`, `api/preview-envs.ts`, `hooks/use-preview-envs.ts` all already return what the screen needs.

---

## Slices, in order

Each slice ends green — `pnpm --prefix frontend test:run`, `lint`, `tsc -b` — and each is reviewable on its own. Storybook first, per `CLAUDE.md`.

### 1 · The preview row

Build it from `components/branded/data-list.tsx`. **No new list primitive** — eight pages share that one implementation and this is the ninth.

| | |
|---|---|
| Columns | Preview `280` · URL (slack) · Status `92` · Updated `66` · actions `64`, gap `20`, row `64`, `px-2` |
| Name cell | PR number `text-name`/500 over branch `text-meta` `font-mono` `fg-muted` |
| URL cell | `font-mono` `text-meta` `fg-2`. **`building…` / `tearing down…` / `no URL` are `fg-muted`, never `fg-ghost`** — ghost is disabled-only and measured 1.95:1 |
| Status | `StatusText`, never `StatusPill`. Word derived from phase so it cannot disagree with its colour |
| Age | `relativeAge`, exact timestamp as the cell's `title` |
| Actions | Two `ghost` `icon-sm` buttons via `DataListActions` — **never hand-rolled**, the primitive is what answers `focus-within` on the row |

**Also needs `Repository` (`120`) between Preview and URL when no repository is selected** — Preview drops to `240` there.

Stories: Ready · Deploying · Failed · Deleting · long branch name · with and without the Repository column.

### 2 · The rail

New `RepositoryRail`. 240 wide, the sheet's own white, `border-r` hairline on the right edge only, 12/8 padding, rows at 1px spacing.

| | |
|---|---|
| Rows | 224 × 32, radius `md`, `text-body`. `All previews` pinned top, `+ Enable repository` pinned bottom above a hairline |
| Selection | `washes(isActive)`, the same helper `sidebar.tsx` uses. **Branch in the component, never stacked `hover:` variants** |
| Trailing | The count at rest. On the selected row it **swaps for the settings gear on hover and focus** — one slot, so the row never reflows |
| Scroll | The list scrolls; the two pinned rows do not |
| **No search** | Deliberate. Revisit past ~40 repositories |

**The gear is a control inside a control.** The row cannot be an `<a>` wrapping a `<button>`. Make the row a `<button>`/`<a>` and the gear a **sibling** positioned in the trailing slot, or the markup is invalid and the keyboard order breaks.

### 3 · The screen

Rewrite `pages/previews/index.tsx` as the whole thing. Delete `config-detail.tsx` and re-home its filter/sort logic.

| | |
|---|---|
| Header | **Title is always `Previews`.** Never the selected repository — `DESIGN-PRODUCT.md` §12a |
| One fact | `N environments · M repositories` on *All previews*; **empty** when a repository is selected, because the context line already states the count |
| Actions | One filled `+ New preview` |
| Toolbar row | Search + Status filter. **Renders only when there are previews to filter** — frames 02 and 03 drop it |
| Routing | `/previews` = All previews. `/previews/:configId` = the same screen, that repository selected. **The route is absorbed, not deleted** — people have it bookmarked |

States to build, all six on the board: all previews · one repository · no previews yet · first run (no rail) · at the cap · dark.

### 4 · The context line and the cap

New, small, and it carries the page's third job.

| | |
|---|---|
| Left | Repository name `text-title`/500 ink, then `owner/repo · branch` in `font-mono` `text-meta` `fg-muted` at 12 from it |
| Right | `N of M active`, `text-meta` `fg-muted`, **tabular numbers** |
| At the cap | The number turns `state/warn` and an `AlertBanner` (`Tone=blocking`) appears above the list |
| **No meter** | A number said in words gets no second picture — §7 |

### 5 · Settings: dialog → drawer

`config-settings-modal.tsx` is the wrong surface. It edits one object you return from; that is a drawer (§13).

| | |
|---|---|
| Size | **480 — the regular drawer.** `work`/640 is earned by a rail, and this has none |
| Grid | Two columns 16 apart → **212 each** at 480. `Base branch` and `Max active previews` pair on one row; everything else spans |
| `Repository` | Read-only, so it is a **value, not a field**: `--control` well, radius `md`, 32 tall, mono `fg-2` (§9) |
| Env vars | `key-value-rows.tsx`. **Key and value both flex** — at 440 content width a fixed 213 key left the value narrower than the key it labels |
| Remove | `destructive-ghost` at the foot, behind a `Confirm`. **Copy: "Remove repository", never "Delete configuration"** — the object in the rail is a repository, and the sentence must say the code is untouched |
| Blocked | The API refuses while previews run. **Block before the click, with the count**, not after with a server error |

### 6 · The preview drawer

The only genuinely new surface. Clicking a row throws you onto `/stacks/<id>` today — a different object with different chrome, where nothing says *you are looking at PR #128*.

480 `form`. Status line · Preview URL in a well with `Copy` and `Open ↗` **inside** it · Branch / Commit / Created by / Stack · `Open the stack ↗` · footer `Delete` + `Sync`.

**The stack page keeps everything it has.** It stops being the only place the click can land.

### 7 · Copy and escalation

| Where | Change |
|---|---|
| Delete a preview | Add *"A new environment is created automatically if the pull request gets another commit."* Without it nobody presses the button |
| Remove a repository | Rename from "Delete configuration". Say the code is untouched |
| Everywhere | `New preview` — one label, header and empty state alike |

### 8 · Sweep

Delete `preview-env-card.tsx`, `config-list.tsx`, `config-detail.tsx` and their tests. Update `preview/handlers.ts` so `dev:mock` reaches every state, including **at the cap** and **first run**.

---

## The four things a board cannot carry

Written down because they are invisible in Figma and will otherwise be lost.

| | |
|---|---|
| The search field needs a **real label** | A placeholder is never one |
| Row actions reveal on **`focus-within` on the row** | Not hover. `DataListActions` already does this; a hand-rolled copy on the Stacks list got it wrong and cost keyboard users a tab stop |
| **Tabular numbers** on `4d ago` and `N of M active` | Both change under the reader |
| The rail gear is **nested interactive** | Not a `<button>` inside an `<a>` |

---

## Definition of done

- Every state on the board reachable in `dev:mock` **and** `dev:mock:empty`
- Stories for the row, the rail, the context line and both drawers, covering empty, error, long text, read-only and at-the-cap
- `pnpm --prefix frontend test:run`, `lint` and `tsc -b` green
- Measured in the browser, not eyeballed — **the gaps between elements, not only their positions**
- Read-only hides every control (§ the settled four); the URLs stay, because they are the whole point of the page for a reviewer

## Risks

| | |
|---|---|
| `config-detail.tsx` is 370 lines of filter, sort and dialog wiring | Salvage it into the new screen before deleting, not after |
| `DataListRow` gains a ninth caller | Any change to it ripples to eight pages. Add columns at the call site, not to the primitive |
| The route merge | `/previews/:configId` must keep working from a cold load with no history |
