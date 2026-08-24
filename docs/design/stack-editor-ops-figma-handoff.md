# Handoff — the stack editor's ops tabs on the Figma board

**Paste the prompt at the bottom of this file into a fresh chat to continue.**

Repo `/Users/jaseem/Projects/Stackdome` · branch `graphite-pass-2`
Working with **Jaseem** — a designer with basic coding knowledge. Short lines, tables,
bold what he must not miss. Show, don't describe.

---

## What this job is

Jaseem's brief, verbatim:

> now let's fix this page, can you create design on figma, you know our principles, now the
> screenshots I shared does not have enough data, so we need to populate it with some
> **do not add anything that is not supported, only add what is existing currently**
> do all the pages — deployment, logs and metrics

The stack editor's three ops tabs render almost empty on his screen, so nothing about them
can be judged. The job is to put them on the board **populated with realistic data**, and to
draw **only what the code already ships**. Not a feature exercise.

**The order is Artifact → Figma → code.** This is the Figma step. Nothing has been written
to the product for these three tabs.

---

## Read these first, in this order

| # | What | Why |
|---|---|---|
| 1 | `DESIGN-PRODUCT.md` | **The only authority.** If code and it disagree, the code is wrong |
| 2 | The three tab sources (below) | So you draw what ships, not what you'd like |
| 3 | This file | The component map, the node ids, the gotchas |
| 4 | `docs/design/previews-figma-build.md` | Only for its *conventions* — frame naming, caption habit |

### The code these frames are drawn from

| Tab | Entry | The parts that matter |
|---|---|---|
| Deployments | `frontend/src/pages/stacks/components/editor/tabs/deployments/deployments-tab.tsx` | `timeline/timeline-rail.tsx`, `timeline-node.tsx`, `draft-node.tsx`, `rail-node.tsx`, `live-release-summary.tsx`, `release-post-mortem.tsx`, `release-body-tabs.tsx`, `split-console.tsx`, `config-diff.tsx`, `deploy-failed-banner.tsx`, `derive.ts` |
| Logs | `.../tabs/logs/logs-tab.tsx` | `log-viewer.tsx`, `utils.ts` (`convertLogsToLazyLogFormat` is the line format) |
| Metrics | `.../tabs/metrics/metrics-tab.tsx` | `utils.ts` (`formatCpuUsage`, `formatMemoryUsage`) |

Shared: `frontend/src/components/branded/stage-tracker.tsx`, `alert-banner.tsx`.

---

## The board

Figma file **`2IcCJOgsROpgajjXlay1h9`** — *Stackdome — Shape + Hierarchy Pass*. One page, `0:1`.

Section **`stack editor — deployments, logs, metrics`** = `991:36666`, at x 160 / y 63500, 3200 × 3100.

| Frame | Node | Body node | State |
|---|---|---|---|
| `deployments — 01 timeline · Light` | `991:36667` | `991:36711` | **done** |
| `logs — 01 streaming · Light` | `991:40646` | `991:40690` | **done** |
| `metrics — 01 live · Light` | `991:44625` | `991:44669` | **done** |

### How the shell was made — do this again for any new frame

Clone **`908:45282`** (`canvas — 03 inspector · Light`, 1440 × 900). Then:

1. In `Frame 47`, remove the child whose name starts with `inspector` — the ops tabs have no
   peer sheet.
2. Set `Sheet` to `layoutSizingHorizontal = "FILL"` → it becomes **1190** wide.
3. Rename `canvas` → `body`, clear its children, set `fills = [surface/frame]`,
   `layoutMode = VERTICAL`, `counterAxisAlignItems = CENTER`, `clipsContent = true`.
   **The body ground is `surface/frame`, not `surface/sheet`** — the header band is white and
   the tab body below it is the app ground. That is what ships.
4. Retarget the selected tab in `Frame 6 > Frame 7 > Tabs`:
   selected = one fill bound to `VariableID:55:1082` + label bound to `VariableID:2:8`,
   name suffixed `· selected`; unselected = **no fill** + label bound to `VariableID:2:11`.

### Node ids inside the finished frames

| | |
|---|---|
| Deployments page column | `996:37053` · rail `996:37066` |
| Deployments — expanded `#4` row | `999:37069` · detail card `999:37089` · split console `1000:37074` |
| Logs page column | `995:37053` · terminal `995:37079` |
| Metrics page column | `992:37053` · summary cards `992:37063` / `992:37089` · per-resource grid `993:37056` |

---

## The design system, as discovered — do not rediscover this

**Fonts:** `Geist` (Medium, Regular) and `JetBrains Mono` (Regular). **Never Inter.**
Load all three before any text write.

**Variable collections:** `Colour` (modes Light / Dark, 48 vars) · `Radius` (`xs sm md lg xl full`) · `Elevation` (Light / Dark).

**Colour names** (bind by name — build a `name → variable` map once per script):

```
accent/primary · brand/bg · brand/border · brand/hover · brand/orange · brand/press
canvas/grid · canvas/grid-bold
ink/fg-2 · ink/fg-ghost · ink/fg-muted · ink/on-primary · ink/primary · ink/primary-hover · ink/primary-press
line/hairline · line/ring · line/strong · line/subtle
state/change · state/change-bg · state/change-border
state/danger · state/danger-bg · state/danger-border
state/info · state/info-bg · state/info-border
state/success · state/success-bg · state/success-border
state/warn · state/warn-bg · state/warn-border
surface/accent · surface/canvas · surface/control · surface/control-hover · surface/frame
surface/hover · surface/input · surface/popover · surface/pressed · surface/selected
surface/selected-hover · surface/sheet · surface/sheet-2 · surface/well
```

**Text style ids** — apply with `await node.setTextStyleIdAsync(id)`:

| Style | Id |
|---|---|
| label/400 | `S:baa3c27da8ab8a6674c74bbb797027c2ebb27101,` |
| label/500 | `S:11a87a1e33437c664a8f800a16b813d003b8d1b5,` |
| meta/400 | `S:3e494c2b42eff5be5ff36934f5ad1e5b28d4515e,` |
| meta/500 | `S:2b78d1912b6a4d1ee8ceac757dd5f7dfbabb841e,` |
| body/400 | `S:a540b42649bd90a357ea3c093e07e3f6e8b2304b,` |
| body/500 | `S:519a0b5a40eeeb1b21962a1116649015cd564b11,` |
| name/400 | `S:00b86c0b31aec3dd2077c8719a00d059dc15e0ad,` |
| name/500 | `S:fd8f8664e8181e1671bcf36bf1ebd61657220f2b,` |
| title/400 | `S:141b2a499bc4c44368e02df47b0489115be2a832,` |
| title/500 | `S:c96ad3a4717051bd362fe7a2493b11f0ce7201fb,` |
| head/500 | `S:65dff933c67879c1b0c14d9f5f84d1b7319b0141,` |
| mono/label | `S:20b10d222142aa90183ff7a347d7baf54650db24,` |
| mono/meta | `S:dd45b3529b5b621ef441275e1947a04387739d06,` |

**Effect styles:** `elevation/sm md lg 2xl` · `press/soft mid strong well` · `focus/ring ring-inset ring-edge`.
`elevation/sm` = `S:803ccf05c8a57c9328ad30ba06820fa4f2b81e49,`

**Components on the board** (76): `Sidebar`, `Nav item`, `Account block`, `Button`,
`icon button`, `Field`, `Multi-select`, `Single-select`, `Chip`, `Segmented — label`,
`canvas/dot grid`, `canvas/dot row`, `brand/postgres`, `brand/redis`, and ~30 `icon/*` +
`lucide/*` glyphs.

---

## Three gotchas that cost time — read these

| Gotcha | What to do |
|---|---|
| **The board's icons are LOCAL components.** `importComponentByKeyAsync(key)` fails with *"Component with key … not found"* | `page.findAllWithCriteria({ types: ["COMPONENT"] })`, build a `name → node` map, call `.createInstance()`, then `.resize(14, 14)` |
| **`node.query('FRAME[name=toggle row]')` returns null** for any layer name containing a space | `node.findAllWithCriteria({ types: ["FRAME"] }).find(n => n.name === "toggle row")` |
| **A caption/section text needs `textAutoResize = "HEIGHT"` set before `resize()`** | Otherwise it collapses to a thread |

---

## The data set — reuse it verbatim on any new frame

One stack, three tabs. Keeping it identical is what makes the frames comparable.

**Stack:** `orders-api` · header status `Degraded` · version chip `Draft · 1 change`
**Resources:** `web`, `worker`, `postgres`, `cache`

**Releases**

| Seq | Cause | State | Detail | When |
|---|---|---|---|---|
| #4 | Manual deploy | **Failed** | `1 of 4 resources failed to become ready` | Aug 5 17:32 |
| #3 | Webhook push | Released · **Live** | `git a3f9d2e · took 1m 12s` | Aug 5 16:04 |
| #2 | Manual deploy | Released | `git 7c1b8e4 · took 58s` | Aug 4 11:20 |
| #1 | Manual deploy | Released | `git 2f90aa1 · took 1m 04s` | Aug 2 09:12 |

Draft node: `Draft` chip · `Staged changes` · `web changed` · `vs #3`
#4 failure reason: `readiness probe failed: HTTP 503 on /healthz after 12 attempts`
Stages on #4: Build **done** · Deploy **failed** · Ready **todo**

**Split console** — rail `3/4 ready`; `web` failed, `worker`/`postgres`/`cache` ready.
Activity (time · level · resource · message):

```
17:31:12  info      release   rendering release #4
17:31:14  success   web       build succeeded              [Build logs →]
17:31:20  info      web       rolling out revision 5
17:31:22  info      worker    rolling out revision 5
17:31:41  success   worker    Ready
17:31:58  success   postgres  Ready
17:32:03  success   cache     Ready
17:32:19  warning   web       readiness probe failed: HTTP 503 on /healthz
17:32:31  error     web       back-off 5m0s restarting failed container
17:32:31  error     release   deploy failed — 1 of 4 resources not ready
```

**Logs** — filters `Resources (4)` and `Live Tail (4h)`. Line format is
`[HH:mm:ss.SSS][source] message`, 24 lines across all four resources, 17:31:57 → 17:32:04.

**Metrics** — Stack CPU `450m` (millicores), Stack memory `952 MiB` (mebibytes),
`updated 17:32:04`. Per resource, peer-relative bars:

| Resource | State | CPU | Memory |
|---|---|---|---|
| web | Ready | `180m` (86%) | `200 Mi` (31%) |
| worker | Ready | `60m` (29%) | `112 Mi` (18%) |
| postgres | Ready | `210m` (100%) | `640 Mi` (100%) |
| cache | Pending | — `Waiting for resource` | — |

---

## Six findings the populated frames exposed

**These are the point of the exercise.** None is fixed yet; all are real.

| # | Finding |
|---|---|
| 1 | **The live release is stated twice** — pinned at the top *and* in the rail, both wearing a `Live` chip. `showLiveAnchor` fires whenever the live release is buried, which is every time a newer deploy fails |
| 2 | **Deployments has no page heading.** Logs says `Stack logs`, Metrics says `Stack metrics`; Deployments opens on a mono `Deploy timeline` label. Three tabs, two conventions |
| 3 | **No connection pill on Deployments** — the one tab that streams release events. Logs and Metrics both have one |
| 4 | **Four status vocabularies in one frame:** header `Degraded`, release `Failed`, resource `failed` (lowercase, in a pill), stage tracker `Deploy`. Invisible when empty; loud when populated |
| 5 | **Two different "1"s that read as the same one** — the header's `Draft 1 change` and the card's `Changes 1`. Different objects, adjacent, same digit |
| 6 | **The metric bars are peer-relative, not limit-relative.** `postgres` draws a full bar at 210m, which reads as saturated and isn't. There is no per-resource limit in the API, so the bar cannot mean what it looks like |

## Two board gaps hit while building

Both were drawn with literal hex and **want adding to the `Colour` collection before code**:

| Missing token | Code value | Used for |
|---|---|---|
| `chart/1`, `chart/2` | `--chart-1: #3B6FE0`, `--chart-2: #1B8A54` (dark `#6E9BFF`, `#46C98A`) | Metrics CPU sparkline + usage bars |
| `code/bg`, `code/fg` | `--code-bg: #181611`, `--code-fg: #A9A399` | The log terminal panel |

---

## Left to do

**Superseded 24 Aug 2026 — the three tabs were built.** Rules are in
`DESIGN-PRODUCT.md` **§16**, reasoning in `docs/design/redesign-log.md`, remaining
work in `docs/tasks.md`. This section is kept for what it still says.

| # | What | State |
|---|---|---|
| 1 | `deployments — 02 changes tab` | **Done differently.** Tabs became sections — `Changes` and the console render together, so there is no Changes *tab* to draw |
| 2 | `deployments — 03 resource selected` | **Still open on the board.** The pinned detail band ships in code (`split-console.tsx`) and was never drawn |
| 3 | Dark variants of all three | **Still open.** No frame has been set to the Dark mode |
| 4 | Empty / first-run states | **Still open.** All three `EmptyState`s exist in code, none is drawn |
| 5 | Decide the six findings | **Three landed** — the duplicated live release (1), the missing page heading (2), and the four status vocabularies (4) are reduced to one channel per row. **Three still open** and now tracked in `docs/tasks.md`: the connection pill on Deployments (3), the two different `1`s (5), and the peer-relative metric bars (6) |

### The two board gaps, resolved

| Token | Outcome |
|---|---|
| `chart/1`, `chart/2` | Still literal hex on the board. The code uses `--chart-1`; the metrics bar fill is bound to `accent/primary`, which carries the same value |
| `code/bg`, `code/fg` | **Moot.** The log stream moved onto the white sheet, so the near-black terminal is gone and neither token is needed |

## State of the repo

Branch `graphite-pass-2`, **nothing committed**, working tree green:

```
pnpm --prefix frontend test:run   → 303 files, 2334 tests passing
pnpm --prefix frontend lint       → 10 errors, ALL pre-existing
```

The 10 lint errors are in `configuration-tab.tsx` (7 × indent), `env-row.tsx` and
`canvas-editor-shell.test.tsx` (3 × trailing space) — none from any recent session.

**Stage by path. Never `git add -A`** — Jaseem edits in his IDE in parallel.

Two other sweeps are uncommitted on this branch and are **done**:
`docs/design/row-actions-sweep-handoff.md` (row actions → drawers + danger zones, and the
product-wide `hint` → `help` pass), plus a canvas pass (uniform 2px dot grid at OKLCH
L 86.5%, node cards and controls island on one 6% outline + `shadow-sm`, node/volume/stack
deletes moved into danger zones).

---

## The prompt to paste into the fresh chat

> Continuing the Figma redesign of Stackdome's stack-editor ops tabs.
>
> Read `docs/design/stack-editor-ops-figma-handoff.md` in `/Users/jaseem/Projects/Stackdome`
> first — it has the Figma file and node ids, the full component/token/style map, three
> Plugin-API gotchas, the exact data set to reuse, and six findings the populated frames
> exposed. Then `DESIGN-PRODUCT.md` for the rules.
>
> Three frames are already on the board and done: deployments, logs and metrics, populated,
> in the section `stack editor — deployments, logs, metrics` (`991:36666`) of file
> `2IcCJOgsROpgajjXlay1h9`.
>
> **The hard constraint: draw only what the code already ships. Do not invent features.**
> Verify against the tab sources listed in the handoff before drawing anything.
>
> Start by showing me the three finished frames so I can see where we are, then tell me
> which of the "Left to do" items you'd take first and why.
