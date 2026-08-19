# Product redesign — running log

> ## This document is HISTORY, not instruction
>
> **`DESIGN-PRODUCT.md` is the only authority. Read that first, not this.**
>
> This log records how the system got here — what was tried, what was reverted,
> and why. It is useful for understanding a decision's reasoning. It is **never**
> a source of rules, and where it disagrees with `DESIGN-PRODUCT.md` it is simply
> out of date.
>
> **Two known defects in this record, kept deliberately:**
>
> - Its goal statement — *"bring the website's design language into the
>   product"* — was **superseded**. The product follows the console reference;
>   the website's language is confined to thresholds. This is now §1 and §7 of
>   the rules.
> - The section headed *"Promoted — the rules are now the real components"*
>   claims 457 replacements across 129 files. **Git shows those tokens first
>   appearing in a single commit two days later.** Treat that section as
>   narrative, not as a record of what shipped when.

**Historical handoff notes follow.** They describe where things stood at the time
of writing, not where they stand now.

Last updated: 2026-08-16 (chip lift; row radius 12; DrawerHeader owns the band)

---

## The goal

Bring the **website's** design language into the **product**, and write it down
as rules so that anyone prompting Claude gets the same result.

The team likes the website. The product is stock shadcn. PR #211 already
attempted the port; it got the tokens right and the translation wrong.

---

## Where things live

| What | Where |
|---|---|
| Product repo | `~/Projects/Stackdome` (this repo) |
| Website repo | `~/Projects/stackdome-website` |
| Stale local website copy — **ignore**, `src/` is empty | `~/Projects/stackdome-react` |
| Audit screenshots | `~/Projects/audit/` |
| Website token source of truth | `stackdome-website/src/directions/graphite.ts` |
| Website design reasoning | `stackdome-website/DESIGN.md`, `DESIGN-PROMPT.md` |

**There is no `DESIGN-LANGUAGE.md`.** It was believed to exist; it does not,
anywhere. The website language lives in `DESIGN.md` + `DESIGN-PROMPT.md`.

### Branches

```
main
 └── graphite-redesign      ← PR #211, Akshay's redesign (do not edit)
      └── graphite-pass-2   ← ours, local only, nothing pushed yet
```

PR #211 already contains PR #200's Storybook — one branch has everything.
When we push, the PR targets `graphite-redesign`, **never `main`**.

### Working surface

`pnpm --prefix frontend storybook` → <http://localhost:6006> → **Shell / Platform**

`frontend/src/stories/shell/platform-shell.stories.tsx` renders the **real**
sidebar + topnav + Stacks page together on mocked data — real components, not a
mock-up. **All design decisions get made against this**, never against an
isolated component.

**The rules themselves live in `DESIGN-PRODUCT.md` at the repo root.** Read that
first; this log is the reasoning and the history behind it.

---

## How we work (the user's explicit instruction)

**Never present a component decision in isolation.** Asked "how should the input
look?" with no screen around it, he has no basis to answer. Build the real
screen, show whole-screen variants as images, let the reactions become component
rules. Component-by-component coverage is the goal, reached *through* screens.

**Screen order** — chosen so the component surface is covered fastest:

1. App shell + Stacks — nav, page header, card, filters, status, buttons
2. Stack detail — tabs, logs, timeline, metrics, empty states
3. Users — tables, chips, menus, dialogs
4. Create flow — inputs, selects, validation, wizard
5. Auth — threshold screens

**Also:** flag context-window cost *before* image-heavy steps. Screenshots are
~95% of token burn. Save to `~/Projects/audit/` and let him open the folder
rather than pulling every image into the conversation.

---

## The reference: OpenAI

The website was based on OpenAI's design. The component styles come from there.
Studied ChatGPT web UI on Mobbin. **Three systems make it feel crafted:**

### 1. Radius scales with the size of the element

| Element | Radius |
|---|---|
| Small buttons, chips, toggles | full pill |
| Sidebar items, list rows, menu items | ~8px |
| Modals, composer, panels | ~16–20px |

Pill is **not a style** — it is what small things get. The current product makes
everything a pill regardless of size. That is the single biggest craft failure.

### 2. Filled buttons are rare

Nearly every button is a **white pill with a hairline border** (`Manage`,
`Archive all`, `Log out`, `Share`). Filled appears twice only: the send button
(black circle) and destructive (red pill).

The current product fills black for every primary action.

### 3. Separation is hairlines, not cards

Settings rows are label-left / control-right with a 1px line between. No boxes,
no shadows, no card per item. The product wraps everything in bordered,
shadowed cards.

### Three more

- **Colour is nearly absent.** Greyscale throughout; colour only for destructive
  red and app logos. No decorative brand colour anywhere.
- **Active state** is a soft grey rounded rect — no colour, no border, no pill.
- **Nothing is large.** Body ~13–14px, section titles ~16px semibold. **There is
  no display type in the product at all.**

**Conclusion:** the website copied OpenAI's *marketing* scale. The product needs
OpenAI's *product* scale. Same family, different system. That gap is the missing
translation layer.

---

## Audit of PR #211 — what's right, what isn't

**Right, leave alone:**

- **Tokens are exact.** Every value matches `graphite.ts` — `#f5f4f1` paper,
  `#191714` ink, `#ff6007` brand, status greens. No drift.
- **Tables read well** — Users and Projects have sensible product density.
- Black-as-action is applied consistently (though see OpenAI §2 — it may be
  applied too often).

**Wrong — one root cause: marketing rules copied literally instead of translated.**

1. **Page headers are marketing-scale.** `Stacks`, `Projects` at hero size with
   an orange eyebrow (`Platform`, `Settings`) above.
2. **The eyebrow is the worst offender** — it breaks the project's own rule,
   *"if a colour doesn't report something, it's a bug."* "Settings" reports
   nothing, in the colour reserved for signal.
3. **Air became emptiness.** On Stacks, one card occupied ~12% of a 1440px
   screen. Cards are ~180px tall to show a name, two numbers and a status.
4. **Everything is a pill** — search, filters, dropdowns, chips, badges, buttons,
   sidebar active item. Nothing signals "this is the action."
5. **Status shouts three times** — mono uppercase coloured text + coloured dot +
   coloured card edge, for one fact.
6. **Sidebar doesn't hold.** Same background as the page, active item is a
   floating grey pill, ~44px row pitch. Reads as links, not structure.
7. **Mono type is scattered** — email mono, name sans, `INVITED` mono,
   `Developer` mono. No rule behind it.
8. **"Manage members"** sits in a table column as plain grey text — reads as
   data, not a link. Identical on every row.
9. **Dropdown menus are oversized** relative to the tables they open from.

**Real bug, not styling:** the sidebar avatar renders `CN` while the user is
`Ada Lovelace` — initials are hardcoded. `frontend/src/components/nav-user.tsx`.

---

## Decisions made

- **Fix on top of PR #211, do not restart it.** Foundation is sound; the
  translation layer is missing.
- **Work on `graphite-pass-2`, branched off `graphite-redesign`.** Our PR will
  target their branch. Nothing merges to `main` until both agree.
- **Screen-driven redesign**, order above.
- Rules land in **`DESIGN-PRODUCT.md`** — **written**, at the repo root. That is
  the file to read before changing anything visual; this log is the reasoning
  and the history behind it.

## Settled since

| Question | Answer |
|---|---|
| Radius scale | **6 / 8 / 12 / 16**, pill for small controls only |
| Card vs row for Stacks | **Rows.** Cards stay as a second view; toggle planned |
| Eyebrow on page headers | **Gone**, everywhere |
| Surfaces | White sheet on a paper frame |
| Type | Named scale anchored on 13px |
| Control heights | 28 / 32 / 40 |

## Still not decided

- **Motion.** Inconsistent across the app; the user named this explicitly. The
  button press is the only motion with a rule behind it so far.
- **List/cards toggle** for Stacks — agreed in principle, not built.
- **The card itself** still says status three times (rail + mono word + dot).
  Needs its own pass before the toggle ships.

---

## Stacks pass 2 — the exploration (file since deleted)

**Where it was:** Storybook → **Shell / Stacks pass 2**
(`frontend/src/stories/shell/stacks-pass2.stories.tsx`)

Self-contained on purpose — it borrows nothing from the live shell, so the three
systems can be judged without the current components arguing back. Nothing is
wired to the app. What survives the reaction gets promoted into the real
components.

Two stories: **White sheet** (adopted) and **Flat paper** (comparison only).

**Images** (`~/Projects/audit/`): `p2-sheet-light.png`, `p2-sheet-dark.png`
(adopted); `p2-stacks-light.png`, `p2-stacks-dark.png` (flat paper);
before = `p2-before-stacks-light.png`.

What changed, against the audit list:

| Audit item | Applied |
|---|---|
| 1 · marketing-scale header | Title is 16px semibold, count beside it, no subtitle |
| 2 · orange eyebrow | Gone |
| 3 · air became emptiness | 8 stacks now occupy the space 3 cards used |
| 4 · everything is a pill | Pill = small buttons only. Rows, nav items, text field = 8px |
| 5 · status shouts three times | One 7px dot + one neutral word. No rail, no mono, no colour text |
| 6 · sidebar doesn't hold | Own surface + right hairline, 32px rows, 8px soft-grey active |
| 7 · mono scattered | No mono on the screen at all |
| 9 · oversized menus | List rows carry the actions; kebab appears on hover |

Filled buttons: exactly one on the screen (`New stack`). Everything else is a
hairline control.

### Finding — the radius tokens are themselves marketing-scale

`--radius-sm: 9px`, `--radius-md: 14px`, `--radius-lg: 22px` (`frontend/src/index.css`).
So `rounded-lg` on a 32px control produces a near-pill. **The "everything is a
pill" symptom is partly a token bug, not just call-site misuse** — pass 2 had to
hard-code `rounded-[8px]` to escape it.

Proposed product ladder (not yet applied): `sm 6 / md 8 / lg 12 / xl 16`, pill
reserved as an explicit `rounded-full`.

### Real bug still open

`frontend/src/components/nav-user.tsx` hardcodes the avatar initials (`CN`).

---

## Surfaces — the OpenAI system (from Mobbin, ChatGPT web)

| Surface | Colour |
|---|---|
| Sidebar (the frame) | grey |
| Main content plane | white |
| Composer / search field | grey, **no border** |
| Code blocks, plan-benefit panels | grey rounded box |
| User's own message | grey pill |
| Assistant's reply | no container at all |
| Modals, dialogs, popovers | white |
| Buttons (`Manage`, `Export`) | white + hairline |
| Active nav item, hover | grey rounded rect |

**The rule — and it inverts the common instinct:**

> **White floats. Grey recedes.** Higher elevation = whiter. Grey never means
> "a card"; grey means *pushed back into the frame*.

Corollaries: the greys are 2–4% ink, never mid-grey. Grey boxes are for things
you **type into** or **read but don't act on** — never for a list of things you
click.

**We already own the tokens.** `graphite.ts` defines `surface: #FFFFFF`,
`surface2: #FAF9F6`, `bg: #F5F4F1`. Pure white *is* the website's main surface.
No new value needed — `--card` is already `#FFFFFF`.

**Decided (user, this session): white is the main surface.** The screen is
`Shell / Stacks pass 2 → White sheet`; `Flat paper` is kept only as the
comparison.

---

## Grouping — what lives in the frame vs the sheet

The surface a thing sits on **is** a statement about its scope. OpenAI splits it
cleanly:

| Plane | Holds |
|---|---|
| **Grey frame** (sidebar) | Navigation, global helpers (`View plans`), the account block |
| **White sheet** (content + its top bar) | Only what is scoped to the thing you are looking at (`Share`, the kebab) |

**Applied:** `Docs` moved out of the sheet's top bar into the sidebar bottom.
Docs is about the product, not about Stacks. The sheet's top bar is now
breadcrumb-only — **an empty right side is correct, not unfinished.**

### The org section

ChatGPT's sidebar head is the quietest thing on the screen — no workspace name.
The switchable context sits in the **account block at the bottom** (`Alex Smith`
/ `Free`).

**Applied:** sidebar head is `stackdome` alone, one line. The org moved to the
account block's second line (`Ada Lovelace` / `Acme Corp`), replacing the email.
The org is the thing you *switch*; the account menu is where switching lives. An
email is not switchable and does not earn a permanent line.

**Reported, not applied:** the alternative is an org switcher in the sheet's top
bar (ChatGPT's `ChatGPT 4o ⌄` slot). Rejected for now — the breadcrumb already
owns that position.

### Type scale — anchored on 13px body (**decided**)

**13px is the base.** Named by job, not by size, so a call site declares what
the text *is* and cannot drift. Shipped as Tailwind tokens in
`frontend/src/index.css` — use `text-body`, never `text-[13px]`.

| Token | Size / line | Job |
|---|---|---|
| `text-label` | 11 / 16 | Group labels, avatar initials, overline |
| `text-meta` | 12 / 16 | Row data — branch, counts, status, timestamps |
| **`text-body`** | **13 / 20** | **BASE.** Nav, buttons, breadcrumbs, prose, inputs |
| `text-name` | 14 / 20 | The thing you scan a list for |
| `text-title` | 16 / 24 | Page and section titles — the largest type we ship |
| `text-head` | 20 / 28 | Dialogs and empty-state headlines only |

**Every line-height is a multiple of 4** (user's rule), so text lands on the same
rhythm as the 4px spacing grid and never pushes a row off by a pixel.

Nothing above 20px exists in the product — display type belongs to the website.
**Three weights only:** 400 default, 500 interactive/emphasis, 600 titles.

#### Spend the scale sparingly (**user's rule**)

> Having the tier ≠ using the tier. **13px carries the screen.** A size step has
> to be *earned* — and in a product this complex, exceptions will happen. Break
> the rule knowingly, not by default.

| Tier | Budget per screen |
|---|---|
| `text-head` 20 | Dialogs only. Never on a page. |
| `text-title` 16 | **Exactly one** — the page title. |
| `text-name` 14 | Only where a list has *one* scannable subject. Prefer weight. |
| **`text-body` 13** | **Everything else.** The default; no justification needed. |
| `text-meta` 12 | Pure furniture — group labels, avatar initials. |
| `text-label` 11 | Reserve. Not currently earned by any screen. |

**Test it before adding a size:** can weight (400/500/600) or colour
(ink/fg-2/fg-muted) do this instead? If yes, use those — they were already
carrying most of the hierarchy.

**Proved on screen.** `Shell / Stacks pass 2 → Restrained type` drops the list
from 5 sizes to 3 (16 title · 13 everything · 12 furniture). Images:
`p2-restrained-light.png` / `p2-restrained-dark.png`.

| | Scaled | Restrained |
|---|---|---|
| Sizes on screen | 5 | **3** |
| Name vs data | size + weight + colour | weight + colour |
| Row height | same | same |
| Cost | — | long image refs truncate; 13px is wider than 12px |

#### Why these steps

- **13 is the base because it is the interaction size.** The smallest size that
  stays legible without focusing. Everything you click lives here.
- **Row data is 12 because it is scanned, not read.** A stack row has five
  fields; at 13px they all have equal claim on the eye and the row reads as a
  sentence instead of a record. 12 makes the name the *subject* and the rest the
  *predicate*, and buys the horizontal room five columns need.
  **Not 11** — branch, status and counts are load-bearing facts and must never
  read as fine print. The 13→12 step is ~8%: enough to rank, not enough to
  demote.
- **Names are 14 — one step above base.** Enough to lead their row, not enough
  to tie with the page title.
- **Titles are 16, and we stop there.** In a product the page title is the least
  useful text on screen: you already know what page you are on, you clicked to
  get here. It is orientation, not reading. On the website the title *is* the
  content — that is why the website runs to 64px+. Same family, opposite job.
- **Five sizes over a 5px range, because size is one of four channels.** Colour
  (ink / fg-2 / fg-muted), weight (400/500/600) and position carry the hierarchy
  with it. If size worked alone we would need eight steps and a 2× range — the
  reason the screen reads calm is that **nothing has to be big to be important.**
  A textbook 1.25× modular scale gives 13/16/20/25: too coarse to get three
  distinguishable sizes inside one table row.
- **Line heights follow the job.** 13/20 is generous — the base carries prose and
  stacked nav and needs air. 12/16 is tight — row data is always one line, and
  extra leading only inflates the row. 14/20 deliberately *shares* 20 with body
  so a name and a body line sit on the same rhythm. 11 and 12 share 16 so a
  label and a meta value swap without relayout.

### Text colour — three tiers, one job each

Audit of the rendered screen found **four** tiers, with jobs overlapping:
inactive nav labels and row data both `#5C574E`; project name, group label and
timestamp all `#8B8579`.

| Tier | Token | Job |
|---|---|---|
| **ink** | `#191714` | What you came to find — stack names, **all nav labels** |
| **fg-2** | `#5C574E` | Data you read — project, branch, counts, status word |
| **fg-muted** | `#726C63` | Furniture and time — group labels, ages, breadcrumb `/` |
| ghost | `#BEB9AF` | Placeholder text only |

**`fg-muted` was darkened this session.** At `#8B8579` it measured **3.67:1** on
white and **3.33:1** on the paper frame — below the 4.5:1 AA needs for text under
18px. That was survivable while metadata sat at 13px; the moment the type scale
put row data at **12px** it became a real failure in a list people scan. Now
`#726C63` (5.2:1 white / 4.73:1 paper) and `#8A8479` in dark (4.64:1 card /
5.04:1 page) — **dark was failing too.** Both are the lightest greys that clear
their worst-case background, so the tier stays as quiet as the rule allows.
`--fg-ghost` is untouched: WCAG exempts placeholder and disabled text.

**The correction that mattered most:** OpenAI's nav labels are **near-black at
rest**. The grey is carried by the *icon*, never the word. Greying the labels
made the entire sidebar read as disabled.

---

## Control heights — proposed ladder

Primitives currently use **seven** heights (28/32/36/40/44/48/64). Proposed:

| Height | For |
|---|---|
| 28px | Chips, tags, in-row actions |
| **32px** | **Default** — buttons, search, filters, selects on a page toolbar |
| 40px | Form fields in a create/edit flow, and that form's primary button |

Nothing else. Rule: **height follows density, not importance** — an important
button gets *filled*, not taller. Structure: sidebar rows 32px (aligns with the
control default), topnav + sidebar header 52px.

User's reaction: "that's good." Not yet proven on a form-heavy screen.

---

## Promoted — the rules are now the real components

Pass 2 stopped being a picture. Everything below is in the shipped app, not a
story file. **1844 tests pass; lint and tsc clean.**

Images: `promoted-stacks-light.png`, `promoted-stacks-dark.png`.

| File | Change |
|---|---|
| `frontend/src/index.css` | Radius ladder **6 / 8 / 12 / 16** (was 9/14/22/22); `--radius` 14→12 |
| `components/ui/button.tsx` | Height ladder **28 / 32 / 40**; `icon` 40→32, new `icon-sm`; `text-body` |
| `components/ui/input · select · textarea` | Fields take the **8px step, not the pill**, and the 32px height |
| `components/ui/sidebar.tsx` | 32px rows, body-size **ink** labels, `fg-2` icons |
| `components/app-layout.tsx` | White sheet (`bg-card`, 12px, hairline) on the paper frame; 52px topnav; theme toggle out |
| `components/app-sidebar.tsx` | 52px head, `stackdome` alone; theme toggle moved into the frame as an "Appearance" row |
| `components/nav-user.tsx` | **`CN` bug fixed** — real initials; second line is the org, not the email |
| `components/theme-toggle.tsx` | New `presentation="row"` for the frame placement |
| `components/branded/page-header.tsx` | Eyebrow **ignored**, 16px title, no bottom rule |
| `pages/stacks/components/list/stack-row.tsx` | **New.** Hairline row replacing the 210px card |
| `pages/stacks/components/list/index.tsx` | Grid of cards → `divide-y` rows; count in the header |
| `pages/stacks/components/list/stack-card.tsx` | `HEALTH_LABEL` — `"ok"` → `Healthy`, `"progressing"` → `Deploying` |

### Two things the real screen exposed that the story could not

| Found | Fix |
|---|---|
| Search/select were **pills** — a field is not a small control | Inputs, selects, textareas moved to `rounded-md` (8px) |
| Status showed raw API strings (`ok`, `progressing`) beside `Not deployed` — one column, two voices | `HEALTH_LABEL`, typed by `ReleaseHealth` so a new value fails the build |

### The eyebrow

`PageHeader` accepts `eyebrow` and **ignores** it, so all twelve call sites still
compile and every page loses its eyebrow at once. `EyebrowLabel` itself stays —
`panel.tsx` and the canvas nodes still use it legitimately.

## Storybook is the source of truth (**user's rule**)

> **No new component if one already exists** — update the primitive and use it.
> Ask first, every time. A design story that hand-rolls its own button or row is
> a standalone picture, and a standalone picture is useless: it proves nothing
> and gets built twice.

**Applied:** `stacks-pass2.stories.tsx` is **deleted**. Everything it
hand-rolled — QuietButton, PrimaryButton, NavItem, NavGroup, its own sidebar and
its own row — now lives in the real primitives. `Shell / Platform` renders the
same screen out of `AppLayout` + `AppSidebar` + `StacksPage`, so it *is* the
design. Also removed: a `ViewToggle` started without permission.

### Full primitive sweep

The scale is now enforced everywhere, not just where Stacks touched it.

| Was | Now | Scope |
|---|---|---|
| `text-sm` (14) | `text-body` (13) | 18 primitives + 111 files |
| `text-xs` (12) | `text-meta` | same |
| `text-lg` (18) | `text-title` (16) | dialog + alert-dialog titles |
| `text-xl / 2xl / 3xl` | `text-head` (20) | error states, wizard headlines — **`head` finally earns its slot** |
| `font-bold` (700) | `font-semibold` (600) | 3 weights only |
| `text-[10.5px]` mono uppercase | `text-meta` | badge — mono had no rule behind it |
| `text-[11.5px]` mono | `text-meta` | toast description is copy, not terminal output |
| `size-9`, `h-9`, `h-12` | the 28 / 32 / 40 ladder | breadcrumb, tabs, command |

**457 replacements across 129 files. Nothing above 20px exists in the product.**

### The bug that broke every merged component — read this before adding a token

Naming the type scale by job (`text-body`, `text-meta`) collided with
**tailwind-merge**: it classifies any `text-*` utility it does not recognise as a
text **colour**. So `cn("text-body", "text-fg-2")` dropped the size entirely and
the element fell back to the **inherited 16px**.

Silent, and only in components that merge through `cn()` — which is every
primitive. The sidebar group labels rendering at 16px were the visible symptom;
the cause was in `frontend/src/lib/utils.ts`.

**Fixed at the root:** `cn` now uses `extendTailwindMerge` with the scale
declared as a `font-size` class group.

> **Any new named utility that shadows a Tailwind prefix must be registered
> there too, or it will be silently dropped wherever `cn` merges it.**

### Half-sizes removed

162 further replacements: `15px` → `name`, `12.5px` → `meta`, `11.5 / 10.5 / 10px`
→ `label`, `29 / 30px` → `head`. **The scale has no half-steps.**

Verified by rendering: every text node on Stacks, Users, Secrets, Tabs now
computes to one of **11 / 12 / 13 / 14 / 16 / 20**.

Two deliberate exceptions, both flagged rather than swept:

| Exception | Why it stays |
|---|---|
| `9 / 9.5px` mono micro-labels in the stack editor | Whole editor is unconverted; belongs to the Stack-detail pass |
| `120–200px` numeral on the 404 page | A threshold screen, not a product screen |

### Primary button — the white rim

The visible "border" on the black button was **`--edge`**:
`inset 0 1px 0 rgba(255,255,255,0.7)`. That token is tuned for *light* controls
on cream, where 70% white is almost invisible. On a black fill it is a hard
white rim.

New token **`--edge-fill`** — 12% white in light, 35% in dark (where the primary
button inverts to a light fill and needs an ink-side lift instead). Applied to
`default`, `destructive`, `inverse`. `--edge` stays on the light controls it was
designed for.

| | Was | Now |
|---|---|---|
| Top highlight | 70% white — reads as a border | **12%** — reads as a lift |
| Icon | 16px, out-weighing 13px text | **14px** |
| Icon → label gap | 8px | **6px** |
| Glyph | `PlusCircle` — a circle inside a pill | **`Plus`** — no competing curve |
| Size | 109 × 32 | 105 × 32 |

**Rule:** a highlight tuned for one surface is not a highlight on its inverse.
Any inset-light token needs a fill-side counterpart.

### Press — the Polaris model (**user's ask: "tactile, like Shopify"**)

Sources: [Polaris `Button.module.css`](https://github.com/Shopify/polaris/blob/main/polaris-react/src/components/Button/Button.module.css),
[shadow tokens](https://polaris-react.shopify.com/tokens/shadow),
[Uplifting Shopify Polaris](https://halfool.medium.com/uplifting-shopify-polaris-7c54fc6564d9).

**The button does not move. Its content does.** Polaris applies
`transform: translate3d(0, 1px, 0)` to the button's *children*; the pressable
element stays put. Three things fire together and none of them works alone:

| On press | |
|---|---|
| 1. Highlight | **disappears** |
| 2. Inner shadow | **appears** — 3px, hard, zero blur |
| 3. Label + icon | **shift 1px down** |
| 4. Background | **darkens** |

The rest highlight is offset **and** spread — `inset 0 0.5px 0 1.5px` — not a
flat 1px line. That inset ring is what reads as moulded plastic rather than a
drawn border.

**They took 10 iterations on the primary button alone**, and the article names
the blocker: *"the primary button initially lacked darker values to make it feel
three dimensional… after making the default button a touch lighter, we landed on
the level of juiciness."* Our face is ink at rest, so the press gets its own
darker step: **`--primary-press` `#0D0C0A`**.

**Implementation:** `Button` wraps its children in a content span (skipped for
`asChild`, which already supplies one element), and the base class carries
`active:[&>*]:translate-y-px`. Either path gives the button exactly one element
child to move — a bare text node cannot be transformed, which is why the wrapper
is needed at all. `has-[>svg]:` became `has-[svg]:` since the icon is now a
grandchild.

**Three wrong turns, recorded so they are not repeated:**

| Wrong | Why it failed |
|---|---|
| Blurred inner shadows | Reads as a dent, not a key |
| 1px *spread* on the bottom edge | Haloed the whole pill |
| Translating the button itself | The body must stay planted; only the content travels |

Also fixed: press inherited `hover:bg-primary-hover` and got **lighter** when
pushed — `:active` always fires while `:hover` is true.

### Then: keep the mechanic, drop the material (**user's call**)

> *"Imitating exactly was a bad idea, it does not look great. Keep the recess,
> the inner shadow and the label moving. Remove everything else — the glow, the
> box shadow."*

Copying Polaris's full material wholesale fought the Bone language: the
shine and the bevel read as someone else's product sitting inside ours.

| Kept | Dropped |
|---|---|
| Inner-shadow recess on press | Rest highlight / "shine" |
| Label + icon travelling 1px | Bottom-edge thickness |
| Fill darkening on press | Ground shadow |

**Buttons are now flat at rest — `box-shadow: none`, verified in the browser.**
Depth exists only while you are touching the button.

### Optical padding — icon side tightens

A glyph carries its own whitespace inside its bounding box, so equal padding
*measures* equal and *reads* lopsided. The side with the icon gets less.

**Anchored by tightening the icon side, not widening the label side**, so the
label sits the same distance from the edge on every button and a column of
buttons reads aligned.

**Measure the glyph, do not guess it.** Two rounds were wrong because the
correction was assumed:

| Attempt | Icon-side inset | Optical result |
|---|---|---|
| 1 | widened label side by 4px | ~2× over-corrected |
| 2 | tightened icon side to 10px | left still ~1px heavy |
| **3** | **9px** | **11.9 vs 12.0 — level** |

A lucide 14px icon carries **2.92px of air each side** (`getBBox()` against the
24-unit viewBox), not the 2px assumed. Icon inset = label inset − glyph air.

**The gap mattered more than the padding.** At 6px box (≈8.9px optical) it was
nearly as wide as the 12px side inset, so the icon read as a *separate object*
beside the label rather than part of it. Now 4px box ≈ 6.9px optical.

### Variants: 11 → 7

Four rendered **identically** to something that already existed — confirmed by
comparing computed style, not by reading the class strings.

| Removed | Was identical to | Call sites |
|---|---|---|
| `mono` | `ghost` | 0 |
| `railGhost` | `ghost` | 1 |
| `railPrimary` | `secondary` | 1 |
| `railDanger` | — (distinct, but existed only to pair with the rail set) | 0 |
| `size="rail"` | `size="default"` | 2 |

All of it lived in **one file**, `sticky-action-bar.tsx`, which also
hand-rolled its own spinner — now migrated onto `loading` / `loadingText`, so
the removal deleted code rather than moving it.

Safe because the Button styles children with **descendant** selectors
(`[&_svg]`), not direct-child ones, so the content wrapper does not affect them.

**Remaining: `default · destructive · outline · secondary · ghost · link ·
inverse`.** Anyone picking a variant now gets one obvious answer instead of four
ways to spell the same button.

### Loading state

`loading` swaps the content for a spinner and makes the button inert.
`loadingText` says **what is happening** — `"Creating…"`, `"Deploying…"` — not
that something is; the spinner already reports *that*.

| | |
|---|---|
| `loadingText` given | Replaces `children` wholesale, so a leading icon disappears on its own — no doubled glyph |
| `loadingText` omitted | The idle label stays beside the spinner. Fine for a verb that reads the same either way (`Save`) |
| Contrast | **Stays at 100%.** A request in flight is not a disabled control, and the label must stay readable |
| Accessibility | `disabled` + `aria-busy="true"` |

The dim is suppressed for this case only —
`disabled:[&:not([data-loading])]:opacity-50` — so a genuinely disabled button
still greys out.

Before this, call sites hand-rolled `{isLoading && <Loader2 className="h-4 w-4
animate-spin" />}` alongside their own `disabled` prop, each slightly
differently. Those can now collapse onto the primitive.

### Optical correction — the discipline, not a vibe

This has a name and a body of practice: **optical alignment**. Mathematical
alignment is exact and based on numerical rules; optical alignment is
perceptual, and the two do not agree because the eye reads **centre of mass**,
not bounding boxes. The same principle produces overshoot in type (a round `O`
is drawn taller than a flat `H` so the two *appear* the same height) and the
nudge that shifts a play triangle right of a circle's true centre.

**We aim for optical correction. The measurement is an input to it, not the
answer.** Three things carry invisible space that geometry cannot see:

| Invisible space | Effect |
|---|---|
| Icon safe area | The glyph sits inside built-in padding, so the icon side reads roomier than it measures |
| Text bounding box | Ascender/descender space above and below the ink |
| Rounded corners | A pill's curve pulls the visual edge inward near the ends |

**One rule, derived from each size's base inset** — not hand-set per size, which
is exactly how `sm` drifted to only +0.5px of correction while `default` had
+2.1:

```
icon side  = base − 3      (pays back the glyph's safe area)
label side = base + 2      (the optical margin dense letterforms need)
```

| Size | Base | Icon side | Label side |
|---|---|---|---|
| `sm` | 10 | 7 | 12 |
| `default` | 12 | **9** | **14** |
| `lg` | 15 | 12 | 17 |
| `rail` | 12 | 9 | 14 | 

**Verified optically, ink to ink:**

| Button | Icon side | Label side |
|---|---|---|
| `New stack` — leading `+` (2.9px safe area) | 11.9 | 14.0 |
| `Sort ⌄` — trailing chevron (4.5px safe area) | 11.5 | 13.0 |

The two glyphs carry different safe areas, so the correction lands slightly
differently on each — correct behaviour, not drift. **Chasing per-glyph values
would be over-fitting**; the rule holds the family together.

**Vertical needed nothing.** Measured against the font's real ink extents
(`actualBoundingBoxAscent/Descent` via canvas, not the line box): **11.27 above,
11.34 below — 0.04px drift.** Geist centres cleanly at 13/20. Descenders are
left to hang, which is the convention.

Sources: [Optical alignment — Gonçalo Dias](https://zalodias.com/notes/optical-alignment) ·
[Optical vs mathematical alignment in UI](https://railsdesigner.com/mathematical-optical-alignment-design/) ·
["Eyeballing" or optical alignment in design](https://medium.com/ringcentral-ux/eyeballing-or-optical-alignment-in-design-4ef5ab2d326f)

Final, `default` size: **11.9 | 6.9 | 14.0** (optical, ink to ink).

| Size | Text only | Icon side | Label side | Gap |
|---|---|---|---|---|
| `sm` 28px | 10 / 10 | 8 | **12** | 4 |
| `default` 32px | 12 / 12 | **9** | **14** | **4** |
| `lg` 40px | 15 / 15 | 13 | **17** | 4 |

Symmetric is kept where there is nothing to balance against: **icon-only**
buttons and **icons on both sides** (`not-has-` guards).

**One thing this needed:** the label is now wrapped in a `<span>`. Without it an
icon+label button has exactly one *element* child — a text node is not an
element — so the icon matches both `:first-child` and `:last-child` and CSS
cannot tell which side it is on.

### One geometry, intensity by face lightness

The recess was zero-blur on `destructive` and soft everywhere else — two
different components. Now every variant shares **1px side walls · 2px top
shadow · 2px blur**, and only the alpha moves:

| Token | Faces | Colour |
|---|---|---|
| `--btn-press-soft` | Light — `outline`, `secondary`, `ghost`, rail | ink @ .10/.18 |
| `--btn-press-mid` | Mid-tone — `destructive` | black @ .18/.34 |
| `--btn-press-strong` | Near-black — `default`, `inverse` | black @ .38/.62 |

> **Intensity is set by how light or dark the face is — never by how important
> the button is.** Importance is carried by the fill.

Dark theme flips the recess colour (light faces recess with black, the
near-white primary recesses with ink) but keeps the identical geometry. `--edge`
and `--press` are untouched — they belong to cards and non-button controls.

### Per-primitive design pass

Tokens alone were not enough — these needed a decision, not a find-and-replace.

| Primitive | Was | Now | Why |
|---|---|---|---|
| `card` | 8px, 24px padding | **12px (panel step), 16px padding** | A card is a panel, not a row. 24px of inset on a card holding a name and two numbers is what made the old grid read as empty. Keeps the `--edge` inset per D13/D14. |
| `dropdown-menu` | 8px, `shadow-lg` | **12px, `shadow-md`** | A menu is a floating panel. One opening from a 32px row should not cast a 24px shadow (audit item 9). |
| `tabs` | Filled grey trough, `bg-muted` | **Transparent track, soft-ink active chip** | The trough was a second surface competing with the sheet. Active is now the same wash sidebar rows use — "selected" means one thing product-wide. |
| `badge` | Tinted fill **+** coloured border **+** coloured text | **Fill + text, no border** | Three channels for one fact. Same de-shout as the status column. |
| `table` | Header 40px, body-size ink | **Header 32px, meta-size `fg-2`; cells body size** | A header is a row of labels; the data is the point. |

### Known debt

| Item | Note |
|---|---|
| `stack-card.tsx` | **Not debt — a second view.** The card stays; a list/cards toggle is planned. The card still says status three times (rail + mono word + dot) and needs its own pass. |
| Every other page | Inherits the new tokens (corners, heights, type) but keeps its old layout until its own pass. Expected, not a regression. |

---

## Next step

Stack detail — tabs, logs, timeline, metrics, empty states. Biggest screen,
most new components, and it now sits inside a shell that actually exists.

Open questions the screen is meant to settle:

1. **Row vs card** for the Stacks list — pass 2 commits to rows.
2. **Title at 16px** — is that too quiet for a page header?
3. **Status = dot + neutral word** — enough signal, or does failure need more?
4. **Sidebar on its own surface** — right call, or should chrome stay flat?
5. **Radius ladder** — adopt `6/8/12/16` as tokens?

After that: promote the survivors into the real components, then Stack detail.

---

## Housekeeping done this session

- Status line added showing live context usage:
  `~/.claude/statusline-command.sh`, wired in `~/.claude/settings.json`.
  Reads the session transcript and reports percent used and tokens left.
- Screenshot harness: `frontend/.shot.mjs` (Playwright, 1440×900 @2x, drives
  Storybook's `?globals=theme:` for light/dark). Untracked scratch file.
- **Tailwind gotcha:** new files added while Storybook is already running are
  missed by the Tailwind scan — arbitrary classes silently produce no CSS.
  `touch src/index.css` to force a rescan.

---

## The sheet header — pass 3

Screenshots: `tn-a…tn-d` (band count), `sc-d/sc-e/sc-f` (scale), `oai-header.png`
(ChatGPT, measured live at 1440px).

### What was wrong

The sheet stacked **three bars** before a single stack appeared — breadcrumb,
page header, filter toolbar — and said "Stacks" twice while the topnav's right
side sat empty. Separately, the sidebar wordmark sat **9px** above the
breadcrumb: the code claimed the two lined up across the seam, and they did not.
The sheet is inset 8px and draws a 1px hairline, so its band starts 9px down.

### Four options, judged on the real screen

| | Topnav right | Bands | Data starts |
|---|---|---|---|
| A · today | empty | 3 | 195px |
| B · action up | `+ New stack` | 3 | 187px |
| C · search ⌘K | search | 3 | 195px |
| **D · header absorbed** | fact + action | **2** | **143px** |

B saves 8px — not worth a move. C needs a product-wide search that does not
exist. **D chosen.**

### The bar is the top of the sheet, not a band on it

User's correction, checked against ChatGPT: their bar has **no divider at all**
and content slides under it. Ours now does the same — sticky inside the scroll
container, opaque `bg-card`, 8px fade on its underside so rows dissolve instead
of being sliced.

Three defects this introduced and the measurement that caught each:

| Defect | Found by | Fix |
|---|---|---|
| Fade at z-40, above `#page-sticky-bar` (z-30) | reading computed z-index | fade → z-20 |
| Fade cost **7px** of flow — a phantom scrollbar on the one full-bleed page | summing `offsetHeight + marginTop` per child | `-mt-2` cancels its own height → 0 |
| Padding drifted to 20/28 | same pass | back to 28/28 |

### Scale — measured, then translated

ChatGPT at 1440px: band **52px** (8px padding around a 36px row), title
**18/28 w600**, buttons **36px** pill at **14/20 w500**, icon buttons 36×36 with
a 20px glyph, 8px between actions.

Two candidates built and shot side by side:

| | E · their numbers | **F · chosen** | was |
|---|---|---|---|
| Title | 18 / 600 | **16 / 600** | 13 / 400 |
| Button | 36px, 14px | **32px, 14px** | 28px, 13px |
| Title ÷ body | 1.38× | **1.23×** | 1.0× |

Their 18px sits on a **16px** base; ours sits on **13px**. Copying the number
would have made our title *louder relative to the page* than ChatGPT's own is —
and added an 18px step to a scale that stops at 16 for titles. F takes the
ratio, not the number.

**The move worth stealing at any scale:** their button text is a step *up* from
the trail. Ours had trail, title, fact and button all at 13px — four things on
one line at one size, which is why the bar read flat.

### `Home` deleted

Every top-level destination is one click away in the sidebar, so a Home hop said
nothing the frame wasn't already saying — and it pushed the real title out of
first position. Consequence: `/` had no segment to name itself with, so it now
redirects to `/stacks` instead of rendering the page directly.

### Still open

- All 15 `PageHeader` call sites are untouched; the fact and action live in the
  topnav **in the story only**.
- The canvas stack editor is the only full-bleed page and has no shell story —
  its `h-[calc(100%-52px)]` fix has not been seen running.

---

## Alpha lines, and why Figma and the code never matched

The board drew its hairline as `#E8E6E2`. The code drew it as
`rgba(25, 23, 20, 0.11)`. Both looked defensible; neither was the other.

Composited over the sheet, the code's line lands on `#E6E5E5` — **flat neutral
grey**. The reason is the ink: `--border` was an alpha of `--foreground`, the
*text* ink, and `#191714` is very nearly achromatic. So the line got colder as
it got stronger — `#E6E5E5` at the hairline, `#D6D5D5` at the strong rung — on
a palette that is warm everywhere else. The designer had compensated by hand,
picking a warmer solid, which is exactly why the two sides drifted.

The fix is to derive the ink instead of borrowing it. Alphredo's method: solve
for the colour that, at the smallest alpha keeping every channel in range,
composites to the target on the background.

```
a   = max((bg − target) / bg)      per channel
ink = (target − bg × (1 − a)) / a
```

For `#E8E6E2` on white: **`rgb(53 35 0)` at 11.37%**, round-tripping exactly.
Three rungs off it (6 / 11 / 18%) now render `#F3F2F0`, `#E9E7E3`, `#DBD7D1` —
warm all the way up, and within one unit of *both* solids the board had chosen
independently. That agreement is the tell that the derived ink was the right
one: two hand-picked values, months apart, sitting on the same ramp.

Alpha rather than a solid because one line has to work on the white sheet, the
paper frame and a control fill. A solid is correct on one and wrong on two.

### Alphredo

<https://alphredo.app/> — generates translucent colours that match their opaque
counterparts against a known background. We use the method, not the tool.

## The toggle: the fix was the padding, not the border

The first segmented control avoided a doubled edge by giving the thumb no
border at all — a white block floating in a grey well. The updated board keeps
the border and removes the **track's padding** instead.

That is the better answer. The problem was never that the thumb had a border;
it was that an inset bordered thumb puts two edges 2px apart, and at that
distance the eye reads a doubled line rather than a raised surface. Run the
segment flush and both edges land on the same pixel. `overflow-hidden` gives
the segment the track's radius, so its corners *are* the track's corners.

The divider is drawn by the selected segment's own edge rather than by a
separate rule — a rule would eventually sit beside that edge and double it.

## The bevel, and the shadow scale that wasn't

`--edge` — an inset white top highlight — was applied at 14 places while §6 said
content is flat at rest. It is gone. The two worth naming were the switch thumb
and the radio dot, which are physical controls rather than content; neither was
relying on it, since both separate from their track by fill in every state.

The shadow scale advertised eight rungs and held four values: `2xs`/`xs`/`sm`
were one shadow, `shadow`/`md` a second, `lg`/`xl` a third. Four remain defined
and the rest alias them, so a call site still renders and now says out loud
which rung it lands on.

### Figma had no effect styles at all

Eight now exist — four elevations, four press insets — built from values
**measured in the running app**, not transcribed from the stylesheet. The
elevation styles carry the aliasing in their descriptions so the duplication
cannot quietly come back.

### The audit that prompted all of this

| | Figma | Code |
|---|---|---|
| Colour tokens | 16 | 64 |
| Radius | 5 | 5 ✓ |
| Shadows | 0 | 8 names, 4 values |
| Themes | 1 mode | light + dark |

Two variables had drifted outright: `surface/control` held `#FAF9F6`, which is
code's `--control-hover`, so a control at rest on the board was drawn as a
hovered one; and `surface/selected` had no code counterpart at all. The first is
corrected, the second deleted.

**Still open:** Figma has no dark mode, so dark is designed nowhere and exists
only in code. 48 code colour tokens — the status tints especially — have no
Figma counterpart, which means a designer cannot mock an alert or a badge
truthfully.

---

# Session — 2026-08-05 · the restart, and Phase 1 (shell)

The session that reset the project. Read `DESIGN-PRODUCT.md` for the rules; this
records what happened and why, including the things that went wrong.

## What triggered it

The concern raised: old and new tokens coexisting, principles not respected, the
direction drifting. **Audited — the concern was right, but the cause was not
drift.** Five documents claimed authority across two repos:

| Doc | Claimed |
|---|---|
| `DESIGN-PRODUCT.md` | The rules |
| `docs/design/redesign-log.md` | "Bring the *website's* language into the product" |
| `docs/design/openai-platform-study.md` | Console: "no brand colour anywhere", "no display type at all" |
| `stackdome-website/DESIGN.md`, `DESIGN-PROMPT.md` | The website's rules — which the auth screens were following |

The stated goal and the stated reference were **opposites**. Where research and
rules disagreed, nobody updated the losing document, so the code followed the
study on some points (`shape` defaulted to `pill` because the study said to keep
it) and the rules on others.

## Decisions taken

| # | Decision |
|---|---|
| 1 | **Split by surface.** Thresholds carry the website language; working surfaces are pure console. Test: *is there work in front of the user right now?* |
| 2 | Threshold = **auth · 404 · empty states · onboarding** |
| 3 | Tokens: **alias now, migrate later** |
| 4 | `DESIGN-PRODUCT.md` is the **only** authority. The study is evidence, the log is history — both now carry banners saying so |
| 5 | **Not optimising for mobile.** Desktop widths only |
| 6 | New component only when none exists in Storybook, or the existing look and feel cannot be altered. **Otherwise add a variant** |
| 7 | Done = when we are happy with what is on screen |
| 8 | Order: structure/nav/shell first, then page by page, journey by journey. Routing gets fixed per section as we reach it |
| 9 | Workflow: **artifact → Figma → code.** Figma lays the foundation; it is usually not exhaustive, and the design is extended in code using the rules. When the picture is unclear, Figma scopes it fully first |

Answered along the way: the product is for a **platform team, a developer who
explicitly does not want to learn infra, and a CTO** — from the website's own
copy. That settles density (comfortable) and makes the **canvas the headline**,
since "topology you can see beats YAML you can't" is the marketing promise.

## Phase 1 — the shell

Built to the `app shell` Figma board, every number verified in the browser.

- **10 `nav-*.tsx` files → `nav-items.ts` + `nav-item.tsx`.** 312 lines → ~90, and
  the nav became a list you can reorder rather than ten imports in a fixed order
- Grouping by **who touches it**: Stacks + Previews unlabelled, then Platform,
  then Infrastructure (already the admin-gated set)
- **Two-part sheet header** — title row identifies, toolbar row serves it. The
  toolbar row is conditional and collapses itself via `empty:hidden`, so the band
  is 56px or 100px with no height math anywhere
- **Every hardcoded `52px` offset removed.** Header, form save-bar and fade now
  travel as one sticky block
- Sheet: 2px gap to the rail, `outline` not `border`, `shadow-md`
- Collapse choreography — `rail-x` / `rail-y` / `rail-y-in` / `rail-logo`
- **The wash ladder** (§4) — hover/selected/pressed had all been 6%
- Figma: states built for Nav item (12 variants), Account block (8), Button (30),
  icon button (30), View toggle (6)

## Things that were wrong, and what they cost

Worth keeping — each one cost real time and each has a rule now.

| What | Why it mattered |
|---|---|
| **My verification measured the wrong things** | Positions and centres were asserted, but never the *gaps between* them — so a uniform-looking column with the wrong pitch passed three times |
| **A test that clicked a nav link** | It navigated, moved the selection, then measured. Reported two false failures, and I chased the code instead of the harness |
| **A probe testing classes Tailwind had never scanned** | "The utility resolves to transparent" was an artefact of the test |
| **Greys measured as channel alpha** | Overstated every warm grey. Measure the **L\* drop**, never "% of the text ink" — the same trap as the line ink, one level up |
| **A Figma paint bound to a variable but built from a placeholder hex** | Renders the placeholder. Screenshot disagreed with inspection |
| **`-mt-8` still on the collapsed group label** | Stacked on top of the new height collapse and knocked every group out of rhythm |

## Open

- **Auto-collapse at 1024–1280** — §12b states it; it is not built. Parked
- **Field + Select states** — they appear only in the toolbar row, which is Stacks
  content in the shell's slot. They land with that work

**Closed since this was written:** the Stacks toolbar now portals into
`#sheet-toolbar` via `PageHeader`'s `toolbar` prop, and the sheet's content edge
came in from 32px to the header's 12px (`max-w-6xl` removed with it — it capped
the body at 1152 while the header spanned the sheet, so the two planes drifted
apart above 1280).
- `--muted` → alpha ink tint (77 call sites)
- Users / Projects fully built and unrouted; `/settings/*` redirects away
- Below 1024 the rail becomes a drawer — inherited shadcn, undesigned
- Account component is 40px tall in Figma while every instance is 48px

---

# Session — 2026-08-05 (cont.) · Phase 2, the Stacks list

Rules live in `DESIGN-PRODUCT.md`; the implementation handoff is
`docs/superpowers/plans/stacks-list-page.md`. This records only what was learned.

## The job came first, and it cut more than it added

The artifact settled one sentence — *"tell me where things stand, take me to
whatever needs me"* — and then one test: **an item earns a place on the list only
if it does something a click cannot.** Help you choose a row, compare across
rows, or finish without leaving. Anything else belongs on the stack page.

That test killed four things, three of which were mine:

| Cut | Why |
|---|---|
| The public URL | Fails all three. It was also going to need an API field |
| The topology thumbnail | Four unlabelled boxes need notation the reader does not have. It performed *"this stack is complex"* without saying what is in it |
| The 14-day sparkline | Fourteen bars, no axis, no unit — nobody can tell eleven deploys from four |
| The `Services` count | The stack's shape written as text, unrecognisable at a glance |

The lesson worth keeping: **all three drew the *shape* of substance instead of
supplying it.** What replaced them was the same data as words — the components,
named — which anyone can read.

## The second line is a mechanic, not a field

A row grows to two lines **only when a human is needed**. Healthy rows stay one
line, so trouble is found by the *shape* of the list before a word is read or a
colour registers — which also means it survives for anyone who cannot see the red.

The first implementation printed any message the release carried, and an
in-flight release carries progress messages, so `Deploying` rendered a second
line and read exactly like a failure. The fix was a predicate that already
existed: `needsAttention()`. Now the header's *"N need attention"*, the default
sort and the two-line rows are **the same set**.

## Two claims that did not survive checking

Both were mine, both were stated confidently, and both were wrong in a way that
would have changed what someone built.

1. *"The resource-scoped reason costs a presenter change and nothing else."*
   Half right. The per-resource status **is** loaded in the Go process on the list
   path — `Status` is a jsonb column, so `Omit(clause.Associations)` does not drop
   it — but `PresentStackResource` never puts it in the API contract. It needs an
   OpenAPI change and a regenerate.
2. *"The card shows the reason in full."* True while the card could grow. Once the
   height was fixed it gets one line at 344px, where the row's status column has
   **504px** — so the row shows *more* of a failure than the card does.

## Figma renders some things and silently does not render others

**A drop shadow does not paint on a `COMPONENT` node.** Verified against an
identical `FRAME`, which paints it fine. Phase 1 had drawn every focus ring as a
spread-2 shadow, so **twelve focus variants across Button and icon button were
invisible on the board** and had been for a session. Focus is a 2px OUTSIDE
stroke now.

Three more, all in §16 of `DESIGN-PRODUCT.md`: an attribute selector cannot hold
a space and fails silently; `visible = false` inside auto-layout removes a node
from the flow, so a FILL sibling swallows its width; clone before you clear.

## Process

The **artifact → Figma → code** gate was broken once — card changes went into
code before the board settled, and a new idea (component icons on the chips) was
built in code "to show him" rather than drawn. Called out, and correctly. The
gate applies to **every** change, not just the first one, and a question is not
approval.

## Dark mode had two hue families, and nobody had measured them

Reported as *"I don't like the fill of the controls on dark mode."* Eyeballing
would have produced a nudged hex. Measuring found a structural fault.

The dark surface ladder runs at **chroma ~4** (OKLCH) — one warmth, level
carried by lightness. Four tokens had drifted off it:

| Token | Was | Chroma | Ladder |
|---|---|---|---|
| `--input` | `#1D1A15` | 10.5 | 4 |
| `--control` | `#1D1A15` | 10.5 | 4 |
| `--control-hover` | `#26221C` | 12.5 | 4 |
| `--popover` | `#201D18` | 10.4 | 4 |
| `--accent` | `#26221C` | 12.5 | 4 |

Two to three times the ladder's chroma. Every field, select, menu and hovered
menu row was **khaki on a neutral screen** — the only saturated thing in view,
which is exactly what "muddy" was naming.

**The second fault was worse and invisible until measured.** `--input` and
`--control` were the *same* hex, at L 21.9 — the card's own lightness (22.2).
So on a card a field had no fill at all, only a hairline; and the product's own
rule that *an input is a well and a select is a face* did not exist in dark.
Light had it (`--input` and `--control` both recess below the white sheet, and
the press mechanic separates them); dark had collapsed it into one colour.

Fixed by putting them back on the ladder **on opposite sides of the card**:
`--input` `#181715` (below), `--control` `#232220` (above), and the two washes
onto the ladder's existing rungs. `--surface-node` followed `--card`, the way
light already had it.

**The lesson is the measurement, not the values.** Light measures grounds by
lightness drop from white, and that number is useless in dark — the drops are
tiny and the eye reads colour first. Dark needs a chroma budget, so it now has
one, written into §3.

## The status glyph was switched off for a good reason, and the reason was fixable

Reported as *"can't really understand the status easily."* The icons already
existed in `StatusText` and were switched off at both call sites, each with a
written justification — so the first job was working out whether the old
decision was wrong or the old implementation was.

It was the implementation. The set was **per family**: three glyphs for
`ready` / `pending` / `error`, which meant `Degraded`, `Unavailable` and
`Failed` all drew the same triangle. The card's own comment named the defect
exactly — *"the family triangle cannot tell Degraded from Failed, which is the
distinction that changes what you do next"* — and then drew the wrong
conclusion from it: it removed the glyph rather than fixing the set.

Per state, the mark carries its own information and the objection evaporates:

| Healthy | Deploying | Degraded | Unavailable | Failed | NotDeployed | Deleting |
|---|---|---|---|---|---|---|
| `CircleCheck` | `Loader2` spinning | `TriangleAlert` | `CircleOff` | `CircleX` | `CircleDashed` | `Trash2` |

**Two things the change nearly broke, both caught by measuring.**

1. *Baseline.* The glyph shipped as `inline-flex items-center`, which takes its
   baseline from the first flex item — so the status word would have slid off
   the shared baseline the card is built on. Inline-block with `align-[-0.22em]`
   holds it: measured delta stayed at exactly **3px**, and the glyph sits
   **0.38px** off the text box's optical centre.
2. *Reduced motion.* The spinner is `motion-safe:`, so reduced-motion gets a
   still mark rather than no mark. The shape still reports "in flight".

**Four existing tests failed, and that was the system working.** Three asserted
`querySelector('svg')` was null; one asserted the baseline. They were not
obstacles — they were the previous decision defending itself, which is exactly
what a test for a design rule is for. Rewriting them meant stating the new rule
in the same place the old one lived.

The rule in §7 was also wrong as written. "A dot **or** a word" reads as "no
icon"; what it actually protects against is a second *colour channel*. Restated.

## The page title came down twice, and the second time it went below the content

Started at **16/24 weight 600**. Moved to **20/28 weight 500** because 16/600
put it on exactly the same rung as a stack card's own name — the page and the
cards inside it were tied. Now settled at **14/20 weight 500** on the board
(node `110:4023`).

The 20px version fixed the tie by making the header win. That was the wrong
winner. The title says *which section you are in* — the sidebar already said it
and the trail already said it, so a third statement in 20px is the loudest thing
on screen doing the least work. At 14/500 it sits one rung above the trail
(13/400), level with the one fact opposite it (`8 stacks`, 14/400), and the
whole title row reads as **one band of chrome**. A card's name at 16/600 now
clearly outranks it, which is correct: the cards are the page.

Worth noting the intermediate step was not wasted. It broke the tie, and the tie
had to break before it was obvious which direction was right.

## Dark mode's input fill was a well; the well was a theme inconsistency

Reported as *"the input dark-mode bg is different from the surface colour of
controls, but in light mode they're the same."*

The previous session had deliberately split them — `--input` one rung *below*
the card, `--control` one rung *above* — to make "a field is a well, a select is
a face" literal in dark. Light could not do that (nothing sits above white), so
light kept them equal at `#F7F6F3`.

The result was that **the theme changed the relationship, not just the values**:
a search field and the select beside it in the same toolbar row were one grey in
light and two greys in dark. A user flipping themes sees the layout re-group
itself.

Collapsed back to one fill in both themes (`--input: var(--secondary)`). The
well/face distinction is still there — it is carried by the **line** and the
**press mechanic**, the way light has always carried it. A field's hover moves
the border; a control's hover moves the fill. That was always the more reliable
signal anyway; a 3% lightness step between two adjacent 32px controls was not
doing the teaching it was credited with.

## The dark hairline was 40% louder than the light one, at the same alpha

Reported as *"in dark mode the border seems a bit more intense."* Correct, and
measurable.

The alphas had been copied across themes on the assumption that the same number
gives the same line. It does not — a white ink lifting a near-black ground is a
much bigger perceptual step than a dark ink dropping white:

| | Ink | Ground | ΔL (OKLCH) |
|---|---|---|---|
| Light `--border` 11% | `rgb(53 35 0)` | `#FFFFFF` | **0.072** |
| Dark `--border` 11% | `rgb(255 253 247)` | card `L 22.2` | **0.102** |

Solved each rung for the alpha whose ΔL off the dark card matches the light
rung's ΔL off the sheet. **WCAG contrast ratio agrees with OKLCH ΔL to within
0.005 at every rung** — two independent measures landing on the same numbers is
the check that the answer is not an artefact of the metric.

| Rung | Light | Dark | ΔL, both |
|---|---|---|---|
| `--border-subtle` | 6% | 4% | 0.039 |
| `--border` | 11% | **7.5%** | 0.071 |
| `--border-strong` | 18% | 13% | 0.120 |

**The general lesson, and it now applies to every alpha in the system:** an
alpha is not a theme-portable value. It is a *recipe* for a value, and the
recipe reads its ground. §4 already knew this for dots — a 1.5px disc needs
roughly double a line's alpha because it has less area to accumulate contrast,
and dark dots run firmer still. Lines needed the same treatment in the other
direction and had not been given it.

## The row rules came out, and the measurement made it a short argument

Asked as *"what if we remove the border completely from the list?"*

A separator earns its place by **grouping** — telling you the branch line belongs
to the name above it and not the name below. So that is the thing to measure,
rather than argue about taste:

| Gap | |
|---|---|
| Inside a row (name → branch) | **0px** |
| Between rows | **28px** |

Space was already doing 100% of the grouping. Eight hairlines down the page were
drawing a grid the data does not have, and the hover wash — which is what
actually tells you what you are about to click — had to compete with them.

Out. **Two lines stayed, for reasons that are not "it looks better":**

- The rule **under the column header** is not a row separator. It is the
  chrome/content boundary — labels above, data below — which is the same job
  §12a's header hairline does.
- The **skeleton** dropped its rules too. Its whole purpose is that nothing
  moves or appears when the data lands, so it has to match the loaded row.

**The condition for reversing it is written down**: if a compact row mode lands,
28px becomes ~8px, the grouping argument flips, and the rule earns its place
again. That is worth more than the decision — a rule with no stated failure
condition gets re-litigated every six months.

§11 was retitled from *"hairlines, not cards"* to *"space, not lines, and never
cards"*, because the old title now taught the wrong half of the idea.

## Dark mode landed on the board, and the flip found 162 hand-painted fills

The Shape + Hierarchy board had one variable mode — 39 colour variables, light
values only. Added a **Dark** mode and set all 39 from the product's dark tokens,
renaming the existing mode `Mode 1` → `Light` so the two are named, not implied.

The OKLCH grounds had to be resolved to sRGB for Figma, which is worth stating
because it is a one-way step: the board stores `#232220`, the code stores
`oklch(25.2% var(--ground-c) var(--ground-h))`. **The code is the source.** Turn
the `--ground-c` dial and the board does not follow — it has to be re-derived.

**The valuable part was not the mode, it was what the mode exposed.** Flipping to
dark rendered the board broken: card titles vanished, the brand lockup stayed
black on a near-black rail, every nav glyph held its light-mode grey. 67 paints
inside the stacks frame alone were **hand-painted hexes with no variable bound**,
and page-wide it was 162 nodes:

| Hex | Count | Should have been |
|---|---|---|
| `#191714` | 61 | `ink/primary` |
| `#5C574E` | 73 | `ink/fg-2` |
| `#FFFFFF` | 29 | `ink/on-primary` |

Every one of those hexes **is** the exact value of the token it should have been
bound to, so the mapping was mechanical rather than a judgement call. They had
been invisible for the whole redesign because in a single-mode file a hardcoded
hex and a bound variable render identically. **A second mode is the only thing
that can tell them apart** — which is an argument for adding dark early, before
the board grows, not after.

Fixed page-wide rather than on the one board, so the main components carry the
binding and future instances inherit it.

### Still open — effect styles are not mode-aware

`elevation/md` is an effect **style**, and a style holds one value. Dark's
shadows in code are a different set entirely (`rgba(0,0,0,0.45)` where light runs
`rgba(16,20,26,0.035)` — an order of magnitude apart, because a shadow on a
near-black ground has almost nothing to darken). The board will show light
shadows in dark mode until those are rebuilt as variables or as a second style.

## Shadows flip too — effect styles can't hold modes, but effects can hold variables

The gap left by the dark-mode pass. A Figma effect **style** holds one value, so
`elevation/md` would have shown light shadows in dark mode forever. The way out
is that an individual **effect** can bind variables — `color`, `radius`,
`spread`, `offsetX`, `offsetY` — and a *variable* is mode-aware. So the style
stays a style, and every field inside it points at a two-mode variable.

New `Elevation` collection, Light/Dark, 25 variables covering all 11 effect
styles: the four elevation rungs, the four press mechanics, the three focus
rings.

**Colour carries most of the difference, and the gap is enormous:**

| Rung | Light | Dark |
|---|---|---|
| `elevation/sm` | `#10141A` @ **3.5%** | black @ **45%** |
| `elevation/lg-1` | `#10141A` @ **11%** | black @ **70%** |

Roughly 13×. A shadow works by darkening what is behind it, and on a near-black
ground there is almost nothing left to darken — so dark also needs **more travel
and more blur**, not just more alpha (`lg` goes 20px/50 blur → 28px/64).

**Geometry variables were created only where the two themes actually differ** —
nine floats, all on `md` and `lg`. The press styles got colour bindings only,
because their geometry is deliberately identical across every variant and both
themes: one geometry, intensity is the only thing that moves.

### Two things this turned up that nobody was looking for

- **`line/ring` on the board still held `#191714`** — the value from before the
  focus ring became the palette blue. The board had drifted from the code
  silently, because a ring only paints on a focused node and nothing on the
  board was focused. Now `#3B6FE0` light / `#6E9BFF` dark.
- **`figma.createAutoLayout()` frames default to a white fill.** The first proof
  strip rendered as a white band swallowing every shadow. Layout containers need
  `fills = []` explicitly — worth remembering, it looks like a shadow bug and is
  not.

### The asymmetry is now written down (§3)

**OKLCH in the code, hex in Figma** — Jaseem's call, until Figma ships OKLCH.
Code stays the source; the board is a resolved snapshot that has to be
re-derived whenever a dial turns. The risk this creates is silent divergence,
which is exactly what `line/ring` had already done.

## The column header was the only thing on the page not square with itself

Jaseem fixed the spacing on the board first (node `121:885`) and asked for it in
code. Measuring the live header against the board found two numbers off, not one:

| | Board | Was in code |
|---|---|---|
| Above the label | **8px** | **16px** |
| Each side | 8px | 8px ✓ |
| Below the label | **8px** | **6px** |
| Between columns | 20px | 20px ✓ |
| Type | 11/16 weight 400 | ✓ |

So the header ran **16 / 8 / 6** — no two insets the same, on the one piece of
chrome the page has. Now 8 all round.

**The 16 above was not the header's own padding** — it was the sheet's content
inset (`px-4 py-4`) landing on it. That is why it read as a header problem and
was actually a *nesting* problem: content gets 16, and the column header is not
content. Fixed with `-mt-2` on the header, which gives back half the inset
locally rather than changing the page padding every other screen depends on.

Worth stating because it will recur: **when a spacing value looks wrong on a
component, check whether the component owns it.** Half the time it belongs to
the container, and "fixing" it on the component either does nothing or breaks
the sibling that was correct.

The card grid keeps the full 16 — the boards differ deliberately (`Frame 9` at
y=16 on the cards board, `column headers` at y=8 on the list board), because
cards *are* the content and a column label is not.

## Empty state and no-results, designed on the board

Two states, deliberately siblings rather than one component with a prop.

### The glyph is built from the product's own shapes

A stock magnifier says "search". **Ghosted list rows with a lens over them say
"your list came back empty"** — which is the actual message. Same for the empty
state: a deck of the product's own cards, the front one carrying a name line and
two service chips, is a glyph that could not belong to another app.

Both are assembled from existing colour variables (`surface/selected`,
`surface/pressed`, `line/hairline`, `surface/sheet`), so they flip with the
theme for free. Nothing is a flat hex and nothing is an imported asset.

### What separates the two

| | No results | Empty |
|---|---|---|
| Cause | Your filter excluded everything | You have not made one yet |
| Title | `title/600` — 16px | **`head/600` — 20px** |
| Copy | One line, teaches nothing | **Says what a stack IS** |
| Action | `flat/secondary` — "Clear filters" | `flat/primary` — "New stack" |

**The size difference is the signal.** A filter mistake is not the same moment
as first run, and the type rung says so before the words do. The empty state is
also the one place in the product where the core noun gets defined — a
no-results state has no business teaching, and this one has to.

### Two things that took three attempts

- **A white card on a white sheet has no silhouette.** The stack glyph fused
  into one mass twice. Separation had to be *drawn*: each card carries a 3px
  OUTSIDE stroke in `surface/sheet` — a gap, not a line — which is the standard
  stacked-card read and the only one that survives a theme flip, because the
  stroke is a variable and follows the surface.
- **Width steps of 24px read as shoulders**, turning the deck into a machine.
  At 8px the step is depth and the silhouette stays a rectangle.

### The box is gone

The current `EmptyState` primitive draws a **dashed bordered box**. Dropped it:
§11 already says the list is not boxed, and a bordered panel here
re-introduces exactly the frame that rule removes. The state sits on the sheet,
like the rows it replaces.

**This is a primitive change, not a page change** — `EmptyState` has seven call
sites (git integrations, domains, metrics, stacks ×2). Not implemented in code
yet; the board is the agreed reference first.

## The empty-state glyph, rebuilt from the website instead of invented

Rejected: *"I don't like the stacks visual, I don't like the transparency."*
Correct on both counts, and the second explains the first.

The ghost deck was three translucent rectangles. **Transparency was doing the
work that shape should have done** — the cards had no substance, so they read as
a smudge rather than as objects, which is why it took three attempts to make the
layering legible at all. No amount of tuning fixes a glyph whose whole idea is
"faint".

Rebuilt from `stackdome.com`, which had the answer already:

| Website | In the glyph |
|---|---|
| Solid white cards, hairline, soft elevation | Two opaque `surface/sheet` nodes with `line/hairline` and `elevation/sm` |
| Dot-grid canvas | 54 dots on the ladder, new `canvas/grid` + `canvas/grid-bold` variables |
| Orange dashed connector with an arrowhead | 22px dashed `brand/orange` wire, drawn arrowhead |
| Green status dot per node | `state/success` dot, said once |

**Nothing in it is transparent now**, and it is no longer a generic "empty box"
illustration — it is the product's own architecture canvas in miniature, which
is the one image Stackdome owns.

The grid tokens were missing from the board entirely; the code has had `--grid`
and `--grid-bold` all along. Added rather than hand-picked, so they follow the
theme like everything else.

### Figma mechanics that cost time

- **A `LINE`'s `strokeCap` applies to BOTH ends.** `ARROW_EQUILATERAL` gives a
  double-headed wire, which says "these talk to each other" rather than "this
  depends on that". One direction means flat caps plus a drawn head.
- **Rotating a `POLYGON` moves it about its own origin**, so the shape never
  lands where the coordinates say. An explicit `vectorPaths` triangle is
  deterministic and shorter.

### The two states now speak different visual languages, deliberately

No-results keeps the flat ghost bars — Jaseem picked that style from a reference
and likes it. Empty state is the solid architecture canvas. **They are no longer
siblings by construction, only by layout and type.** Worth revisiting if that
starts to read as inconsistency rather than as two different moments.

## Both states in code, and a second preview server to review the one you cannot reach

Decision on the two glyphs, and the reasoning is worth keeping: **the decorated
architecture glyph goes to the empty state because that is the first screen a
new user ever sees. A filter that matched nothing gets a 34px lens.** Decoration
is spent where it buys something.

### The primitive lost its box

`EmptyState` drew a dashed bordered panel. Removed — §11 already says a list is
not boxed, and the state sits on the sheet like the rows it replaces. The
`dashed` prop went with it (two call sites, both just passing `false`).

Type is deliberately quiet: `text-body` medium over `text-meta` muted. An empty
state is not a headline, and a page with nothing on it does not get to shout.

### The glyph settled at ONE card, not two

The two-card-plus-wire version drew a **closed system**. The final board has one
card with its wires sweeping off the canvas edges and fading out — which says
the stack connects to more than fits, and is the calmer image. Rejected mine
before it shipped; the geometry here is the board's (node `201:1177`).

Mostly divs, so every colour stays a real token and the elevation is the real
`shadow-md`. The two wires are **curves**, so they need real SVG paths — but the
gradient stops use `stopColor="var(--brand)"` rather than a hardcoded hex, and
they fade to **transparent brand** where the board fades to white. White is only
invisible in one of the two themes.

### The empty state is unreachable in the normal preview

`pnpm dev:mock` serves eight stacks. **No amount of clicking gets you to first
run**, so the state that matters most for a new user was the one nobody could
look at.

    pnpm dev:mock         → :5273  the review dataset, every status
    pnpm dev:mock:empty   → :5274  a brand-new org, nothing in it

Driven by `VITE_PREVIEW_SCENARIO`, not a URL param — the scenario has to be
chosen before the service worker boots. **Separate ports on purpose**, so the
two sit side by side in a browser instead of being toggled back and forth.

Only `/stacks` is blanked. A new org still has a project and a cluster; emptying
those would put a different screen on trial.

### One test defended the old copy, correctly

`stacks-page.stories.tsx` asserted `'No stacks deployed yet'`. Rewritten to
assert what the state now has to do: the definition of a stack is present, and
the action is offered **twice** — the header's and the empty state's own,
because on first run the centre of the page is where the eye is.

## `secondary` in Figma is `outline` in code, and the names actively mislead

*"What button did you use for no results, does not look secondary?"* — a real
mismatch, and the trap is worth naming because it will happen again.

| Board tone | Code variant | Renders |
|---|---|---|
| secondary | **`outline`** | `control` fill **+ hairline** |
| — | `secondary` | `control` fill, **no** hairline |

`secondary` drops the border deliberately — side by side in a story it and
`outline` read as one variant drawn twice. But `--control` is **2% off white**,
so on the sheet, without the hairline, there is no button there at all: it reads
as a soft blob rather than a control.

**Picking a variant by matching the board's layer name gives the wrong one.**
The rule is now in §9: when a Figma button shows a fill *and* a border, it is
`outline`.

## Closing the Stacks page — what the verification pass turned up

Signed off. Context and guidelines written to the files that own them:

| Went into | What |
|---|---|
| `DESIGN-PRODUCT.md` | §3 OKLCH-vs-hex, §4 the dark alpha ladder + the `subtle` exception, §9 the `secondary`/`outline` trap, §11 no row rules + header inset + empty-state spec, §12a the 14/20 page title |
| `frontend/CONTEXT.md` | `EmptyState`, `SearchGlyph`, `StackArchitectureGlyph`, **board units**, `SheetHeader`, preview scenario |
| `CLAUDE.md` | `dev:mock:empty` in the commands table, and why the scenario cannot be a URL param |
| `frontend/.gitignore` | Scratch harnesses by **pattern** — four had already escaped into `git status` |

### The sweep found a page that was already broken

Walking every sidebar destination for console errors — not just the ones this
work touched — `/object-stores` was dying in the router's error boundary on
`store.spec.configuration`.

**Pre-existing, and the cause is instructive.** Its preview fixture was a
hand-written `{ provider: 's3', bucket: … }` literal — fields the API does not
have. Every other fixture comes off a factory typed against the generated
schemas, which is precisely why none of them could drift. This one bypassed
that.

Fixed by **annotating the type**, not by guarding the component: a nil-check in
`providerLabel` would have hidden a wrong fixture rather than fixing it, and the
repo rules rule out defensive programming for exactly this reason. The
annotation immediately rejected my own first guess at `SecretReference`
(`{name, key}` — it is `{secret_id, key}`), which is the guarantee doing its job
within seconds of being restored.

**The lesson for the next fixture:** an untyped literal in a mock is not a
shortcut, it is a page that works until someone opens it.

### Verified, not assumed

`tsc -b` · `lint` (0 errors) · **1961 tests** · a real `vite build` · and a
browser sweep of all nine destinations plus both preview servers, listening for
`pageerror` and `console.error`. Backend untouched — `git status` over `pkg/`,
`cmd/`, `config/` is empty.

Next: the create-new-stack flow. Plan at
`docs/superpowers/plans/create-new-stack-redesign.md`.

## The alert banner, and the status ladder underneath it

Jaseem: *"can we make the alert component a bit more vibrant? it can go more
into amber/yellow hues, current one looks very muted."*

### The muteness was measurable, and it was one tone only

| Tone | Value | Chroma | Reads as |
|---|---|---|---|
| `--danger` | `#BE3B2D` | 0.170 | red |
| `--info` | `#3B6FE0` | 0.181 | blue |
| **`--warn`** | **`#A8680C`** | **0.123** | **brown** |

Amber was 30% less saturated than its siblings — but raising the chroma was not
available. At L\* 57, hue 67, `#A8680C` is already **at the sRGB ceiling**
(0.127). There is no more amber at that darkness. The real finding is a property
of the hue rather than of the token: **red stays red as it darkens and blue
stays blue, but amber becomes brown.** A rule that gave every tone one value was
always going to fail on this one first.

Two contrast bugs fell out of the same audit. The amber action label measured
**3.88:1** and the info action label **4.08:1** — both shipped below AA, both
invisible as bugs because the *fill* looked fine.

### The board went four ways; Jaseem drew the fifth

Options A–D (colour only, colour + button, + title, + rail) were drawn and
measured. He rejected the button — *"the button is failing contrast, so my take
is we can make the bg and border hues more vibrant or maybe even go without a
border so simplify more, but button text can have a hue of the same color with
passing contrast"* — and then built it himself: a light amber fill, a mid amber
border, a dark amber for glyph and action, and **the action moved below the
message**. Two passes later the border came off and the radius went to 12.

Decomposed, his amber is a lightness ladder, and that is what generalised:

| Rung | L\* | Alpha |
|---|---|---|
| fill | 82 | 12% |
| border | 63 | 55% |
| ink | ~55 | opaque |

Mapping those rungs onto the other three hues reproduced his amber to within a
hex step and cleared AA on all four: success 4.60 · warn 4.65 · danger 4.96 ·
info 4.71. Dark collapses the ladder to one rung at L\* 77 — over a near-black
ground the ink at 12% is already the fill.

**§4 was rewritten** from *"one hue at three alphas"* to the three-rung ladder,
and §7 gained the banner's own rules. The old wording was not merely imprecise;
it prescribed the thing that broke.

### The part worth remembering

Right-aligning the action was the actual "plain" problem, not the colour. It
competed with the sentence for one line and had nowhere to go when copy ran
long. Under the text it reads as the consequence of what was just said.

### Verified, not assumed

`tsc -b` · `lint` (0 errors) · **1976 tests, 270 files**. Two story assertions
checked `border-danger-border` and were updated to `bg-danger-bg` — the fill is
the tone now. The failing suite was first confirmed against a clean tree, which
also caught three signup-story timeouts as unrelated flake rather than
regression. Geometry measured in the browser, not eyeballed: radius 12px, border
0px, padding 16px, both gaps 8px, glyph and action both `rgb(159,98,4)`.

### The Figma component caught up, and it had been lying

Updating the 12 `state/*` variables propagated the ladder to every bound node in
the file at once — 99 paints, verified afterwards as matching. The `Inline
alert` set (`231:1158`) then took the new structure and grew a **danger** tone,
which it had never had: the set shipped with `blocking` and `info` only, so the
most common alert in the product had no component behind it.

Restructuring it surfaced three things the board had been hiding:

| Found | Was |
|---|---|
| The **message text was tinted** on `blocking` | `state/warn`, not ink — the banner said its severity twice, in the one place §7 says it must not |
| …and **dim** on `info` | `ink/fg-2`. Two tones, two different answers, neither of them right |
| The `info` variants had **no fill at all** | The tone was carried by a border alone |
| Type was `12/16` throughout | The banner is body copy — `body/400`, and the action `body/500` |

`Action=button` was renamed to `Action=link`, because that is what it is now.
Safe only because the set had **zero live instances** — checked before renaming,
since a variant rename drops instance overrides.

**A plugin-API trap worth recording.** `setBoundVariableForPaint` does *not*
resolve the paint's literal colour — it binds the variable and leaves whatever
you seeded. Seeding `{0,0,0}` produced six banners that were correctly bound and
rendered solid black. The binding audit said "bound" and looked fine; only the
screenshot showed it. **Seed the paint with the variable's actual value, and
verify bound colour by rendering, never by reading the binding.**

A new `icon/circle-alert` component was authored at 16px with stroke 1.33 — the
file had no circle-alert, so `danger` had been borrowing the triangle that
`blocking` uses, which is exactly the per-family glyph §7 rules out.

### Ten hand-rolled copies of the banner, found by following the tokens

The component was already in sync with the board — measured, not assumed: radius
12, padding 16, both gaps 8, `body/400` message, `body/500` action, 16px glyph
nudged 2px. Nothing to change there.

What was out of sync was **everything that had copied it**. Grepping the status
tokens turned up ten hand-built alert boxes across nine files — dialogs, wizards,
the deploy timeline — each with its own padding, its own radius, and a border the
real banner no longer has. They had been invisible while the banner looked like
them; the moment it changed, they were ten things pretending to be one.

| Converted to `AlertBanner` | |
|---|---|
| `create-project-dialog` · `rename-project-dialog` · `object-store-form-dialog` · `secret-form-dialog` (×2) · `postgres-create-page` | plain error boxes |
| `postgres-connection-panel` | had a `Retry` button → the `action` prop |
| `add-integration-wizard` (×2) | title + detail, one with `Retry` |
| `deploy-failed-banner` | dropped a hand-typed `⊘` for the real glyph |

**Left alone deliberately:** `live-release-body`'s "recovered" note. It uses
`warn-bg` but it is a list of recovery lines in muted meta type, not an alert —
converting it would have changed its density to make a grep tidy. `failure-card`,
`event-row` and `integration-row` are their own components, not copies.

This is the rule in CLAUDE.md doing its job late rather than early: *never
hand-roll a copy of a component.* Ten of them had accumulated anyway, and the
cost only came due when the original moved.

### Verified, not assumed

`tsc -b` · `lint` (0 errors, 36 pre-existing warnings) · **1976 tests, 270 files**
· converted screens rendered and checked in Storybook.

### Ten hand-rolled copies of the banner, found by the redesign

The component code already matched the board — radius 12, `p-4`, `gap-2`, no
border, `body/400` message and `body/500` action, all measured. What had not
caught up were the **ten places that never used the component at all**: a `div`
with `border-danger-border bg-danger-bg rounded-md` copy-pasted into dialogs,
wizards and forms.

They were invisible while the banner had a border, because a hand-rolled copy
and the real thing looked the same. **Dropping the border is what exposed them**
— every copy kept its edge and its 8px radius, so they stopped matching the
moment the primitive changed.

| Converted | |
|---|---|
| `create-project-dialog` · `rename-project-dialog` · `object-store-form-dialog` · `postgres-create-page` · `secret-form-dialog` (×2) | plain message |
| `postgres-connection-panel` · `add-integration-wizard` (×2) | title + detail, and the Retry button became the banner's own action |
| `deploy-failed-banner` | Also dropped a `⊘` typed as text, in favour of the component's `CircleAlert` |

**Left alone deliberately** — these use the same tokens but are not banners:
`failure-card` (its own component), `event-row` and `integration-row` (row
tints), `config-diff` and `stage-badge` (chips), `view-changes-modal` (diff row
tints), and `live-release-body`'s recovered-services note, which is a list in
`text-meta`, not an alert.

**The rule this proves.** "Never hand-roll a copy of a component" is not a style
preference — a copy does not track the original, and you find out how many you
have only when the original moves.

### Verified, not assumed

`tsc -b` · `lint` (0 errors, 36 pre-existing warnings) · **1976 tests, 270
files**, all passing.

---

## The list-page sweep, and the day "the same intention" stopped being enough

*2026-08-11*

**Eight list pages now render one component.** Stacks, Addons, Object stores,
Secrets, Image registries, Git integrations, Clusters and Domains.

### The sweep ran, then got rebuilt halfway through

The plan said: use the existing `Table` primitive, set the row height at the call
site, keep the shared component untouched. Object stores and Addons were built
that way and both passed their own tests.

Then the pages were put side by side with Stacks and the verdict was *"there is a
lot of previous design language still here"*. Measuring both against the shipped
Stacks page said why:

| | Table pages | Stacks |
|---|---|---|
| Column gap | 16px | **20px** |
| Name | 13px | **14/20 medium** |
| Every other cell | 13px | **12/16 muted** |
| Column header | a 32px box | −8 / 8 / 8, 0 to the first row |
| Status | a bordered pill | the coloured word + its glyph |
| Skeleton | pulsing grey bars | wash blocks, no shimmer |

Seven `Table` defaults, each individually overridable, and every one of them
wrong. **That is what a fork looks like before anyone calls it a fork.**

The fix was to stop overriding and start sharing: the Stacks row was extracted
into `components/branded/data-list.tsx`, and Stacks itself was ported onto the
extraction so there is exactly one implementation. Verified by measuring all
eight pages in the running app — 13 properties, every one identical.

**The rule this proves.** "Update the primitive, don't fork it" fails silently
when the primitive is *nearly* right. `Table` was close enough that every page
looked fine on its own and wrong beside its neighbour. The tell was never a
single number; it was that the same seven overrides kept getting written.

### Clusters and Domains got the row and no column header

Both are hard-capped at one entry (`limitReached={clusters.length >= 1}`). The
original plan parked them for that reason — a header over a single row labels
nothing. They were later given the **row language without the header**, which
removes the old spinners and Title Case without pretending a capped page is a
list. They join the rest when the cap lifts.

### What the browser found that Storybook could not

Every one of these was invisible in component tests and obvious in the app:

| Found | |
|---|---|
| The dev server would not boot at all | A stale Vite cache still pointed at `no-items-light.svg`, deleted long ago |
| Four of five first-run states were unreachable | `dev:mock:empty` blanked only stacks and git integrations |
| Image registries served an endpoint nothing calls | Fixture was on `image_registries`; the page calls `registry-credentials` |
| Secrets rendered two blank columns | The fixture carried no `type` and no `description` |
| Domains could only ever be reviewed empty | The org fixture had no domains |
| Domains had **no retry at all** | Its load was inline in an effect; the only way out of a failure was reloading the page |

**The preview fixtures are part of the design surface.** A state you cannot reach
is a state nobody reviews.

### Decisions taken

| | |
|---|---|
| **The row rule goes, everywhere** | At 64px the space already groups. The header's rule stays — chrome/content boundary, not a separator |
| **Row actions wait for the pointer** | Hidden by opacity, so they keep their tab stop and the row does not reflow |
| **The sideways settle stays** | Columns size to content so a long endpoint can claim room. Revisit if resizable columns land |
| **Addons' status filter became a dropdown** | Four buttons plus a search plus a sort is six controls in a band meant to read at a glance |
| **The addon type icon went with the Type column** | One addon type means the glyph draws no distinction |
| **Skeleton widths do not vary row to row** | Tried, then dropped — a second thing to keep in step across eight pages, and the two-line name cell already breaks the bar-chart read |

### Verified, not assumed

`tsc -b` · `lint` (0 errors, 37 pre-existing warnings) · **1997 tests, 272
files**, all passing. All eight pages measured in the running app at 1440px, and
all sixteen page loads (populated + first-run) walked for `pageerror` and
`console.error` — clean.

**A correction worth keeping.** "Backend untouched" was reported several times
during this work. `pkg/api/openapi/` *does* show as modified — those changes
predate the session (Aug 10), but the claim was made without checking.

# Session — 2026-08-15 · contrast measured against the wrong ground, and the disabled rule

## Placeholder failed AA, and finding out why found a bigger failure

Jaseem: *"placeholder text has to pass aa contrast, currently it does not"*, then
*"light mode I'm saying"*, then *"in both modes we have this issue"*.

Placeholder sat on `--fg-ghost`. Measured on the input fill: **1.81:1**. Not
marginal — under by more than half. WCAG exempts *disabled* controls and nothing
else, so this was a real failure in both themes.

The first instinct — give placeholder its own rung between ghost and muted — does
not survive arithmetic. The lightest grey that clears 4.5:1 on `#F7F6F3` has
luminance 0.166; `--fg-muted` is 0.152. **A 9% gap.** There is no room for a
fourth rung, so placeholder simply *is* muted, and the empty/filled distinction is
carried by what the words say.

### The real bug: a tier is only as good as its worst ground

Both themes' `--fg-muted` carried comments proving it passed. Both comments were
true and both measured the **wrong surface**:

| | claimed | on | actual worst | on |
|---|---|---|---|---|
| light | 5.2:1 | white | **4.48:1** | hover wash `#F0EEE9` |
| dark | 4.62:1 | card | **3.95:1** | `--control-hover` `#292826` |

The deciding ground is the **lightest surface the ink ever lands on**, which is
the hover wash — not the card, not the page. Every hovered row and every hovered
select was under AA, in both themes, and had been through two previous passes
that each called themselves a "contrast correction".

Light `#726C63` → `#6D675E`, warmth held (R−B = 15), lightness alone moved.
Dark `oklch 61.5%` → `65.5%`. Measured live across all nine surface tokens:
**worst ground now 4.83 light, 4.63 dark**. `--fg-2` already cleared and did not
move, so the ladder still reads as a ladder.

**A measurement trap worth recording.** `getComputedStyle` returns OKLCH verbatim
in dark mode. Parsing that as rgb reads the OKLCH components as channels and
reports a bogus **1.0** ratio — which looks like a catastrophic failure rather
than a broken harness. Resolve colours through a canvas 2D `fillStyle`
round-trip instead.

Figma (`2IcCJOgsROpgajjXlay1h9`) was re-derived to match: `ink/fg-muted` in both
modes, **56 placeholders** rebound off ghost, the two disabled `Field` variants
deliberately left on it.

## Nothing is disabled without saying why

Jaseem, on finding the previews wizard's primary live before the form was filled:
*"this is a rule, need to ensure that we follow this... this include any
interactive item that is disable, can be input, checkbox anything"*.

The existing rule covered primaries. It now covers **every interactive element**.
Written into `DESIGN-PRODUCT.md` §"Disabled".

### One mechanic does not fit — three shapes

| What is disabled | Shape | Why not the others |
|---|---|---|
| One control | `BlockedAction` | The default |
| Menu / list item | Reason **inline**, second line | A tooltip inside a menu fights the menu's own focus and dismissal; a focusable wrapper breaks Radix typeahead and arrow keys |
| A whole region | **One** banner at the top | Twelve tooltips saying "this is read-only" is twelve chances to learn one fact and a certainty nobody reads it |

Plus a clause that turned out to matter more than expected: **empty is not
disabled.** Nine of the audited sites grey out a control whose real state is *no
options yet*. Those want an empty state that says how to get options.

### The dim was the hard part

`DropdownMenuItem` and `SelectItem` gained a `reason`. The obstacle was opacity:
`data-[disabled]:opacity-50` sat on the item root, and **a child cannot be
brighter than its parent** — a reason inside a dimmed item renders at 50%, which
is exactly the one line the user needs to read. The dim moved onto the *label*,
leaving the reason at full strength. Measured **5.6:1 light, 5.3:1 dark**.

On `SelectItem` the reason sits **outside `ItemText`** — `ItemText` is what the
closed trigger echoes, so a reason inside it would print on the trigger.

A consequence worth knowing: the reason joins the item's **accessible name**
("Delete, Being deleted, dimmed"), which is right for a screen reader but means
a loose `/delete/i` query now matches two items.

### The audit

**67 disabled states across 39 files**; 7 files already complied.

| Shape | Count |
|---|---|
| One control | 37 |
| Menu / list item | 10 |
| Whole region | 11 |
| Empty, not disabled | 9 |

Jaseem's call: **section by section, not one sweep.** Previews and addons closed
this session. Addons was smaller than the count implied — 6 of its 11 already
complied through `FieldShell` hints; the real gaps were the backup schedule
fields (six controls, one region, no explanation) and the backups pagination.

## Verified, not assumed

`tsc -b` clean · `lint` 0 errors (39 pre-existing warnings) · **2007 tests
passing**. The 8 failures in `create-stack-page.stories.tsx` and
`starting-point-tabs.stories.tsx` are **pre-existing** — confirmed by stashing
every change and re-running: 8 before, 8 after.

Contrast was measured in the running app (`dev:mock`, both themes) and in
Storybook, never eyeballed.

---

# 2026-08-15 · the add pattern, and the addon journey

## What started it

An addon-flow design pass. The audit found 24 problems across three screens, but
the real finding was structural: **twelve add flows had shipped across three
surfaces with nothing deciding which.** Four fields got a drawer once and a
dialog once. Six fields got two different dialog widths. Size was not choosing
the surface — build order was.

## The test, and how it changed

The first attempt was *"does it produce an object?"* — everything that does is a
drawer. Jaseem broke it in one line: **services are extensible, the list is not
fixed.** A picker with three hand-written options cannot grow, and the test could
not tell adding a domain apart from building a stack.

The one that survived: **how many things do you choose before you can start?**

| Answer | Surface |
|---|---|
| None | Drawer, one phase |
| One, from a list that grows | Drawer, two phases |
| Many, assembled before you commit | Two phases plus a rail |

This put **new stack inside the system** rather than treating it as the exception
the first version had made it.

## The catalogue already existed — twice

`stacks/data/blocks/registry.ts` ships **12 services in 3 categories**, already
rendered with search, group labels and picker rows in the stack builder. The
addon picker dialog was a second, hand-written list of three that had already
drifted: the same database was `Postgres` in the registry and `PostgreSQL` in the
dialog, the dialog offered an Ollama the registry had never heard of, and the
other nine could not be offered without editing a screen.

Now one registry with `managed: true`, and the addon catalogue is a filter over
it. **Adding MySQL as a managed add-on is a registry line, not a screen.**

## Measured, not chosen

Jaseem's own narrow study came in at 600 wide. Measuring the type said why that
was right and also why it was the floor:

| | |
|---|---|
| Search placeholder | 253px → the field needs 277 |
| Longest template line | 243px |
| Template description | 3 lines at 240, **4 below it** |

`20 + 296 + 20 + 240 + 20 = 596`. Below that the rail stops being able to be a
column. **640 is the rung above it**, which is why a two-phase journey is `work`.

Two 480 studies were drawn to test the alternative — detail opening inside the
row, and the selection strip in the footer band. Both work; both are parked on
the board as the record of what 640 bought. **Concept A (640, rail as a column)
is Jaseem's final.**

The consequence, found by building it: at 640 with a 240 rail the left column is
340, and a segmented control (162) plus a search field (277) **cannot share a
row**. The switch takes its own row.

## Two rules that came from him, not from the audit

- **One width for the whole journey.** Step one is 640 because step two is. A
  width that changes mid-task reads as a different surface opening.
- **The description belongs to step one only.** You only need orienting once.
  Measured in the built drawer: the header goes **87 → 65** and the body gains it.

## The nine-sentence wall

The catalogue first shipped with the reason on every unavailable row. The render
settled it immediately: nine rows each repeating *"Postgres is the only service
Stackdome manages today"* is exactly the failure §9 already names — twelve
tooltips saying one fact is twelve chances to learn it and one certainty nobody
reads any. They are off **together, for one reason**, which is the definition of
a region. One line, above them, once.

**They are still listed.** Someone who came looking for Redis should learn where
they stand, not conclude the product has never heard of it.

## What shipped

Deleted: the type-picker dialog, the create page, the edit page, both routes, and
the orange sticky action bar with them.

Built: `addon-drawer.tsx` · `addon-catalog-step.tsx` · `postgres-form-fields.tsx`.
`Drawer` gained `DrawerPath`; `PickerRow` gained `reason`. The schema, payload
builder and validation were not touched.

The Postgres form lost two things the page had: the **grey `Panel` cards** (§3 —
grey means pushed back into the frame, and it left every field in a well 1% below
its own ground) and the **bespoke `<table>` of radio buttons** for the plan, a
control that existed nowhere else in the product. Sections are a rule and a
label; the plan is a `Select`.

## Verified, not assumed

Measured in `dev:mock`: **640 on both steps** · header 87 → 65 · footer 81 ·
controls 32/8px · **grey panels 0** · **brand orange 0** · path reads
`New addon › Postgres` with the back arrow on step two only.

`tsc -b` clean · `lint` 0 errors · **8 test failures before, 8 after**, the same
eight, confirmed across two full runs. They are pre-existing in
`create-stack-page.stories.tsx` and `starting-point-tabs.stories.tsx`, where the
stories still look for tab names the copy no longer uses. **Fix them when new
stack is built — they live in exactly the files that pass replaces.**

## Not built

**New stack.** Step one and all five step-2 states are drawn on the board
(`556:6373`) and none of it is in code. `/stacks/new` still renders the tab-strip
page.

---

# 2026-08-15 (later) · the addon flow critiqued, and new stack built

## What started it

A cross-discipline review of the addon journey before building anything else.
Six domains, judged in `dev:mock` and measured in the browser rather than read
off the code. Eleven findings, two of them High.

## The finding that mattered

**`opacity-50` is the rule for a disabled control and a bug on text you still
want read.** The nine unavailable services measured **3.40:1** on the name and
**2.29:1** on the meta against white. Both fail AA.

The trap is that it *looks* like the §9 disabled rule being followed. It is not:
WCAG exempts a disabled control, and these are `div`s with no role — so
`aria-disabled` was dropped from the accessibility tree entirely and they got
neither the exemption nor the contrast. And they exist precisely so somebody
looking for Redis can read where they stand.

The fix is a **tier drop, not an alpha drop**: ink → `fg-2`, `fg-2` →
`fg-muted`. Measured after: **7.17** and **5.60**. The gap to an available row
is wider than the alpha version ever gave (17.89 against 7.17), and it survives
the theme flip — dark's near-white ink at 50% is *lighter* than light's, so the
bug was invisible in the theme people check second.

It also showed the call site had hand-rolled half a primitive. `PickerRow`
owned a blocked state already; the catalogue could not use it without a
per-row reason, so it copied the styling instead. `blockedByRegion` is that
state, and `PickerList` gained `describedBy` so the region is one to the
machine as well as to the eye.

## What Jaseem settled

| | |
|---|---|
| **No search on the addon catalogue** | Ten rows fit one screen. A filter could only hide something already visible, and it cost a zero-result empty state that existed purely to recover from using it. It comes back with the scroll that justifies it |
| **Every step is named** | `New addon › Pick a service`, `New stack › Pick a starting point`. A first step is still a step, and the task name does not say what to do on it |
| **Keep all nine** | Not dead weight: someone who came looking for Redis should learn where they stand |
| **32 is the default, 40 is rare** | The rule said 40 for form fields and no 40 button exists to pair with one. §8 moved; the exemplar was right |
| **Select, then Continue** | Click-to-advance was one click faster and cost the step its primary — `Continue` could never go live on a first visit and the tick was only ever seen by someone who had pressed back. Both flows now behave the same |

## The alignment pass, which is what he actually asked for

The review flagged one ragged row. Measuring every control found the real
shape: **seven controls, five different trailing edges** — 196, 205, 312, 495,
619 — two of them 9px apart. Near-alignment reads as a mistake, not a choice.

Cause: `SelectTrigger` ships `w-fit`, which is right in a toolbar and wrong in
a form, where it puts the field's edge wherever the longest option lands.

`FieldGrid` is two columns 16 apart; `FieldShell` makes any select inside it
fill its cell, so no call site has to remember. After: **two edges**, 312 and
619. The rule is in §8 because it touches every form in the product (§2).

## New stack

Built from board `556:6373` — step one plus all five step-2 states and the
no-provider state. The page, the tab strip and `sticky-bar`'s old geometry are
gone; the five tab bodies, the selection model and the rail were kept.

Three things the board caught that the code had wrong:

| | |
|---|---|
| **The switch and the search shared a row** | §13 already states the consequence of the 640 rung: with a 240 rail the left column is 340, and 162 + 8 leaves 170 for a field that needs 277. Shared, the field collapsed to an icon-only square. The switch takes its own row |
| **The rail was 300** | §13 says 240, and the arithmetic is why: `20 + 296 + 20 + 240 + 20 = 596` is the floor. Measured after: **339 + 20 + 240**, total 639 |
| **The rail promised to configure nothing** | "You can rename, connect and configure all of this" over an empty panel. It now says what it is waiting for, in the verb of that starting point |

Compose is the one starting point with no rail until its file parses — a well
wants the full width while you paste into it, and the rail has nothing to say
until there is a parse result.

## Verified

`tsc` clean · `lint` 0 errors · **274 test files, 2012 tests, 0 failures.** The
eight that had been failing since the addon pass are gone with the files they
tested, which is what that entry predicted.

Measured in `dev:mock`: blocked-row contrast **7.17 / 5.60** both themes · form
trailing edges **2, not 5** · new stack columns **339 / 240** · search field
**339, not 40** · all controls **32**.

## Still open

The addon catalogue's region tells you Redis can go in a stack as a container
and gives no route there. A link would leave the drawer mid-journey. Not
designed, so not guessed.

---

# 2026-08-15 (later still) · the rail earns its keep, and step one loses its primary

Jaseem opened new stack in the running app for the first time and asked four
questions. Three of them were the same question.

## "Why are we showing In this stack in select repository?" And in compose?

Because the rule had been read as *a column that reports state*, and every step
has state. Read strictly — **the thing you picked in full, or the set you are
assembling** — it only survives twice:

| | |
|---|---|
| A ready-made app | The app in full: description, links, the services it brings. None of it fits a row |
| Building blocks | The running set, and the only place to take one back out |
| A repository | **The row you ticked already named the service.** No rail |
| A compose file | The file lists its own services, in the well. No rail |
| A blank canvas | Nothing to put in it. No rail |

A rail repeating what the body shows costs the work 260px to say nothing.

**The empty-rail state went with it.** The previous pass kept the rail on screen
saying "Nothing yet. Pick a repository…" so the list would not shift when the
first pick landed. That was solving the wrong problem: the two steps that keep a
rail have something in it the moment it appears.

## "Continue is not needed, select a method to move on"

This reverses the call made earlier the same session, and the reversal is right.
The argument for select-then-Continue was that click-to-advance left a primary
that could never go live. The better answer is that **step one should not have a
primary at all** — a row answers its only question, so `Continue` repeats the
click you just made. `Cancel` is the whole footer.

Applied to both flows: one behaviour per pattern was the reason for the original
choice, and it still is.

The tick survives. It is what you see when the back arrow brings you back.

## Search, again

Off the ready-made apps list for the same reason it came off the addon
catalogue: seven fit one screen. The rule from the earlier entry now has two
call sites and no exceptions.

## What was done in Figma first

Board `556:6373` updated before the code, per §2: Continue removed from step
one, the rail removed from both repository frames, the search removed from
ready-made apps, four captions rewritten, and two rows added to "Settled here".
The frame row was pushed down 220px because the taller table had begun
overlapping it.

**The compose frame needed no change** — it never had a rail. Only its caption
claimed one.

## Verified

`tsc` clean · `lint` 0 errors · **274 test files, 2011 tests, 0 failures.**

Measured in `dev:mock`: both footers read `["Cancel"]` on step one · step-two
columns are `[599]` for repository, compose and blank, `[339, 240]` for building
blocks, and `[599] → [339, 240]` for a ready-made app on the first pick.

---

# 2026-08-16 — Semibold comes off the scale, and step one stops apologising

Board `556:6379` — the final "Select a service to start from" frame — plus one
rule that reaches past this screen.

## Semibold is gone

Three weights became two. The argument that settled it was not taste:

- **Six sizes × three weights is eighteen combinations**, and nobody could say
  whether `name/600` outranked `title/500`. Two weights makes weight a binary —
  *this line is the thing, that line is about it* — and hands ranking back to
  size and colour, which §6 already said to reach for first.
- **Geist's 600 and 500 are one step apart** on a nine-step family. The
  distinction cost a whole axis to buy a difference people had to be told about.

**The rule lands ahead of the code, deliberately.** `DrawerTitle` moved to 500
and the drawer is conformant. Roughly sixty other call sites still ship 600 and
are logged as open. The ones that need a look rather than a find-and-replace are
where 600 sat beside 500 **at the same size** — that is the only place the drop
collapses two lines into one weight.

## The path lost its second signal, and reads better for it

Steps behind you were `fg-muted` at 400 against ink at 500. With 600 gone the
weight difference went too, and it turns out the version with **colour alone**
is the correct one: a 400 step next to a 500 one read as two type styles sitting
together rather than as one path.

## Step one has no footer

It ended on a lone `Cancel`, defended earlier in this log as "a footer with one
button is not an unfinished footer". That defended the wrong thing. The question
is not whether one button can be a footer — it is what the button was for.

> **`Cancel` offers to undo something.** On step one nothing has been typed,
> nothing has been made, and picking a row advances rather than commits. It was
> offering to undo a state that does not exist.

Both exits were already on screen — the arrow in the path and the drawer's ✕ —
so the third control was the one to remove. The band was 73px (20 padding, a
hairline, 32 of button) held for the whole step to repeat something in the
header.

**The arrow had to grow a job for this to work.** On step one it now closes the
drawer rather than being absent. Dropping the footer without that would have
left the step's only exit in the corner.

## The description went with it

§13 said "the description belongs to step one only". Read as *step one always
gets one*, it produced a line under `Select a service to start from` that
restated the list about to render. The rule is now conditional on what the step
is named: an **instruction** needs no gloss, a **noun** may earn one.

Which is also why the step was renamed. `Pick a starting point` labelled the
control; `Select a service to start from` names the act — and it matters more
now that it is the only sentence on the step.

## A bug the arrow surfaced

Radix focuses the first tabbable element when a dialog opens, and it does so
*programmatically* — which counts as `:focus-visible`, so the ring draws even
for a mouse click. Once step one had an arrow, that element was the arrow: every
journey opened with a focus ring on the control that leaves it.

`DrawerContent` focuses **itself** now. Not a control, so no ring; Esc, Tab and
the focus trap are unchanged, and the first Tab still lands on the arrow. It
needed `outline-none` too — a focused div draws the UA outline, which briefly
put a ring around the entire 640px panel.

## Verified

`tsc` clean · `lint` 0 errors · **274 test files, 2012 tests, 0 failures.**

Measured against the board, in the browser: drawer **640** · header **65**
(20 + 24 + 20 + hairline) · back box **20** at x 20 with the glyph at 22 · **8**
arrow→path, **6** inside the path · both steps `title/500`, `#6D675E` behind and
`#191714` current · rows **56** with **2** between · row names 14/500 · footer
**absent** · description **absent** · **zero** elements at weight 600 anywhere
in the drawer.

---

# 2026-08-16 (later) — The ready-made app step, and what Cancel was actually for

Board `557:6445`.

## Cancel comes off step two as well

Yesterday's entry kept it, reasoning that step two has a selection to abandon.
That reasoning survived one day. The question that killed it on step one kills
it here too: **the arrow and the ✕ are the journey's exits on every step**, so a
footer `Cancel` is a third control for an act two others already offer.

> A drawer footer is **the place the thing gets made.** One button, right
> aligned. If a second one is doing "get me out of here", the header already
> did it.

**It had to land on all five starting points, not just the one on the board.**
They share a single footer — removing Cancel for the template step alone would
have meant a `source === 'template'` special case, which is not a rule, it is a
bug with a condition on it.

Left open deliberately: the one-phase drawers (`New secret`, `Add domain`). They
have no back arrow, so dropping Cancel there leaves the ✕ as the only exit. The
journey argument does not transfer unexamined.

## Both steps are named for the act

`New stack › A ready-made app` became `› Start from a ready-made app`. A noun
sitting alone after the `›` reads as a label for the panel below it; the verb
makes it a position in a task — which is the entire job of a path.

Derived rather than a sixth field on `STARTING_POINTS`: the five names were
already written as noun phrases that take the stem, so lowercasing the first
letter is the whole transform. "a repository", "a compose file", "building
blocks", "a blank canvas" all read correctly after "Start from".

## The links say they leave

`Website` and `Docs` are the only two controls in this journey that open a new
tab, and nothing said so. They get the external-link mark, **trailing** — a
leading icon names the act, a trailing one modifies the destination.

## Which found a real bug in Button

The glyph went on and the padding did not move: 12/12, where a button with an
icon on one side only is owed **14 before the label and 9 after the glyph**.

The optical-padding selectors all reach through `> span >`, because text nodes
cannot be targeted by `:first-child` and cannot be translated on press — so
`Button` wraps its children to give the rule something to hold. **`asChild`
skipped the wrapper entirely**, handing children straight to the `<a>`. Every
link-shaped button in the product had silently lost both the optical correction
and the press travel on its label.

Fixed on the primitive: `Slot` merges props onto the child, so the wrapper
cannot be added from outside it — the child is cloned and its own children are
wrapped instead. Nine call sites, 2014 tests, no fallout.

**The bug was invisible until a button had an icon on one side only** — which is
the only case the rule exists for. Worth remembering as a shape: a correction
that only fires in one configuration is a correction nobody notices is missing.

## Figma

`Button` gains a **`Trailing icon`** boolean beside the existing `Leading icon`,
both off by default, across all 50 variants. The layer names are now `leading
icon` / `Button` / `trailing icon` in that order.

**Two things the check turned up:**

- **`Leading icon` was dead on 20 variants.** Every destructive and
  destructive-ghost variant had an icon layer with *no property binding at all*,
  so the toggle did nothing on them. Bound to the existing property; nothing
  else changed.
- **All 50 variants are `FIXED` at 80 wide**, so switching either boolean on
  overflows the label. Pre-existing — the leading icon has always done it, and a
  proof instance confirmed both behave identically. Not fixed: hugging would
  reflow every Button instance on the board, which is a decision rather than a
  repair. Logged open.

The optical padding cannot be expressed in Figma — a boolean cannot drive
padding — so the variants draw the symmetric 12 and the component description
now says the code corrects it, rather than leaving it to read as a discrepancy.

## Verified

`tsc` clean · `lint` 0 errors · **274 test files, 2014 tests, 0 failures.**

Measured against the board: drawer **640** · path `New stack › Start from a
ready-made app` at `title/500` · footer **one** button, `Create stack` · left
column **339**, rail **240**, **20** between them · rail name 16/500 ·
description at the token's own **16** line-height, not an 18px override · links
**32** tall, padding **14/9**, glyph last, `target="_blank"` · **zero** elements
at weight 600 in the drawer.

## The logo tile, later the same day

Board `557:6548`. `--control` → the sheet's own fill, plus `elevation/sm`.

The material was carrying the wrong meaning. `--control` is a **recessed** fill —
correct for a chip inside a picker row, where the tile is one element among
several sharing a ground. The rail's logo is the first thing in the panel and
the thing the panel is about, so raised beats pressed in.

Same fill as the drawer it sits on, which is the point: the hairline and the
shadow do all the separating.

**A token note worth keeping.** Figma's `surface/sheet` resolves to `#FFFFFF`
light and `#1C1B19` dark — which is `--card` in code, **not** `--popover`
(`#1E1D1B`). The drawer itself is `bg-popover`, so the board and the product
disagree by two values on the drawer's own ground in dark. The tile follows its
actual ground rather than the literal token, so the *relationship* the board
draws — tile and sheet are the same surface — survives in both themes. The
underlying drawer-surface discrepancy is untouched and unlogged as a defect,
because which of the two is wrong is a decision, not a repair.

**Flagged, not fixed:** on dark's near-black ground `elevation/sm` does almost
nothing, so the hairline carries the tile's edge alone. In light the shadow is
plainly doing work. The board is authored in light only.

## Verified

`tsc` clean · `lint` 0 errors · **274 test files, 2014 tests, 0 failures.**

Measured: tile **44×44**, radius **12**, fill equals the drawer's in both themes
(`#FFFFFF` / `#1E1D1B`), 1px hairline, shadow `0 1px 2px rgba(16,20,26,0.035)`
in light and the token's heavier `rgba(0,0,0,0.45)` in dark.

## The chip lifts, the radius grows, and the header becomes one component

Boards `234:1953` (Picker row) and `556:6380` (Drawer header).

### The chip lifts with the row

Hover and selected now change the chip's fill AND give it `elevation/sm`. The
reason it works: **the row and the chip move in opposite directions.** The wash
darkens the row and the chip brightens against it, which is what makes a 4%
wash legible at all — a chip that washed along with its row would hold the same
relative value and the state would fall to the row's edges alone.

**Dark needed the opposite token, not the same one.** Taken literally,
`surface/sheet` measured the chip going *darker* on hover (#232220 → #1E1D1B)
while its row went lighter — the chip sinking into a row that rose, which is the
state backwards. The ladder inverts between themes: light runs control #F7F6F3 <
sheet #FFFFFF, dark runs sheet #1E1D1B < control #232220 < control-hover #292826.

So the rule is **"go to the lightest surface"**, not "go to the sheet". Same
sentence in light, opposite token in dark.

A blocked row does not lift at all. The affordance would be the one thing left
on it still making a promise.

### Row radius 8 → 12, both densities

The row's radius reports what KIND of thing it is, and a 40 row and a 56 row are
the same kind — it does not scale with height. The chip keeps its own rung (8 at
56, 6 at 40), so the pair is deliberately **not** concentric: strict
concentricity would put the row at 20 and turn a list item into a pill.

### Back and close became icon buttons — and that forced a real cleanup

Both are now `ghost` `size="icon"` Buttons: 32 at radius 8, straight off the
existing Button. **No new component** — an icon button is a button whose label
is a glyph.

The interesting part is what it exposed. `DrawerHeader` was an empty box that
every drawer filled itself, and six call sites had drifted apart inside it:

| Shape | Drawers |
|---|---|
| A path | new stack, addon |
| A title over a description | secret, preview env |
| **A hand-rolled `<button>` back arrow** | the previews wizard |

That last one is the rule this repo already has — *never hand-roll a copy of a
component* — broken in the one place hardest to notice, and it dragged a
`pr-12` along with it to stop its title sliding under the absolutely-positioned
close.

`DrawerHeader` now takes `title` **or** `steps`, plus `description` and
`onBack`, and renders the close itself. Nothing is assembled at a call site; the
four files that imported `DrawerTitle` and `DrawerDescription` no longer import
either. **There is no third shape** — the wizard's arrow-beside-a-stacked-title
collapsed into the path form §12a says it should have used all along:
`Enable repository › Configure previews`.

Two consequences worth recording:

- **The close moved into the flow.** Absolutely positioned it reserved no room,
  so the header had to dodge it. As a sibling there is nothing to dodge and no
  magic number to keep in sync.
- **The row is 32, so a plain header went 64 → 72.** Worth it: the heading and
  both controls now share one centre line, which the absolute ✕ never managed.

The **box** sits on the 20 column, not the glyph — no negative margin pulling it
out to align the mark with the body below. A button's own padding is what gives
its glyph air, and cancelling that puts the hover wash outside the header's edge.

Guarded on the way through: a header given neither `title` nor `steps` no longer
emits an empty `DrawerTitle` beside whatever its children supply. Two titles in
one dialog, one blank, is a thing Radix warns about and a screen reader reads.

## Verified

`tsc` clean · `lint` 0 errors · **274 test files, 2018 tests, 0 failures.**

Measured with a real pointer, both themes. Picker row: radius **12** both
densities; chip **32/8** and **24/6**; rest `#F7F6F3` flat, hover and selected
`#FFFFFF` with `0 1px 2px rgba(16,20,26,0.035)` in light; dark rest `#232220`
flat → `#292826` lifted. Drawer header: **73** with a path and **95** with a
description (both including the hairline) · back box at **20**, close box at
width − 20 − 32 · both **32×32 at radius 8** · **6** between arrow and path ·
exactly **one** `drawer-title` in the dialog.

# 2026-08-16 (later still) — The repository step, and a path that stopped explaining itself

Boards `564:6733` (provider connected), `564:6845` (no provider), `234:1953`
(picker row).

## Both steps are named for the act — reversed, one entry later

The entry above argued that a noun after the `›` reads as a label for the panel
below it, so both steps took a verb: `Select a service to start from`, then
`Start from a ready-made app`. Judged in the running drawer rather than on
paper, that is wrong twice over.

| | |
|---|---|
| `New stack › Select a service to start from` | The crumb before the `›` **already** said the task. "to start from" is the sentence finishing itself a second time |
| `New stack › Start from a ready-made app` | Same. "New stack" and "Start from" are one idea said twice, six words apart |

A path is **a position, not a sentence.** The segment after the `›` only has to
answer *where am I*, because the segment before it already answered *what am I
doing*. Trimmed to `Select a service` and to the starting point's own name, the
two steps also finally read as siblings — an instruction followed by a
restatement of the instruction is not a pair.

The `stepName()` helper that lowercased the first letter and prefixed the stem
is gone entirely. It existed only to build the phrase that was the problem.

## The switch and the search come back onto one row

They shipped stacked, and the entry for that flow recorded why: on the 620px
page this used to be, a 240 rail left a 340 column, and a segmented control plus
a field cannot share it — shared, the search collapsed to an icon-only square.

That reasoning was right and its premises are now both gone.

| Premise then | Now |
|---|---|
| A 240 rail eats the column | **A repository has no rail.** The band gets the drawer's full 600 |
| The track is 162 | `Connected provider` → `Provider` takes it to ~104 |

Which leaves 480 for a field whose floor is 277. One row is the honest shape
because they are **one control**: both filter the same list, and stacking them
read as two decisions in sequence. The whole band still pins.

`Connected` was reporting a state rather than naming a source — and doing it on
the segment you are already standing on, where the list underneath is the proof.

## What the row says about a repository

`main · updated 2 days ago` became `public · main`.

A timestamp is the one fact on that row that **cannot change which row you
pick**. You are choosing what to build, not what is freshest, and a stale
repository is still the right one if it is the one you want. Whether it is
private is load-bearing by contrast: it is what tells you this pick depends on
the connected provider rather than on a URL anybody could paste — which is the
distinction the two segments above it exist to draw.

## The no-provider state keeps its band

The board draws the switch and the search still there, the search off, with the
empty state beneath. Pulling the field out instead — which is what shipped —
makes the control band change shape between two states of **one tab**, and the
segmented control beside it jumps.

§9 is satisfied without the field explaining itself: the reason sits directly
under it, in full, with the fix as a button. That is the rule's third shape —
the region carries the explanation — not an exception to it.

## The 56 rung drops to 13/500

`text-name` (14/20) → `text-body` (13/20) on the catalogue row's name.

14 is the **shell's** rung — a breadcrumb's current page, a stack's title on the
canvas. A row in a catalogue is not the sequel to those: it is one of forty
things being scanned, and at 14 over a 12 meta the pair opened a two-step gap
that read as a heading with a caption. 13 over 12 is one step, which is what a
name over its own detail should be.

It is the primitive that changed, so it landed on all seven call sites at once —
starting points, repositories, templates, blocks, add-ons, the git source picker
and the list in the addon journey. The dense 40 rung is untouched: its name is a
resource instance, and mono/12 is right for a machine-set value (§6).

`DataList`'s 64px row keeps **14** and is a different object — a list PAGE, where
the name is the thing you came to the page for.

## Stale on the board

- Picker row `234:1953`: six variants (56 × trailing `plus`/`remove`) still draw
  the name at 14. The other nine are at 13, which is the value code now takes.
- `564:6733` draws the repository name in **JetBrains Mono 12**, and its own
  component description says `name/500`. Code follows the primitive.
- `564:6845` labels the dead search `Filter stacks…`; code keeps
  `Search repositories…`, which is what the field actually filters.
- The gap between the track and the field is 16 on `564:6733` and 8 on
  `564:6845`. Code takes 16 on both.

## Verified

`tsc` clean · `lint` 0 errors · **274 test files, 2018 tests, 0 failures.**

Measured in the browser, not eyeballed. Band: track→field gap **16**, both
**32** high, band→list **16**. Rows **56** at **2** apart. Name **13/20 w500**
Geist; meta **12/16**.

The gap assertion caught its own harness first: measured to the *segment* it
reported 17, because the track carries a hairline and its last segment sits
flush inside it. Measured to the track it is 16. **Assert the gap, and assert it
against the right box.**

# 2026-08-16 (fourth pass) — The arrow comes off every drawer, and a deleted step comes back

Boards `564:6733`, `564:6845`, `234:1953`.

## The path is the back button

The arrow is gone from `DrawerHeader`, and the crumbs behind the current step
went live. A step is now `string | { label, onClick }` — the bare string is a
dead crumb, the object is one you can return to.

The rule it reverses is one entry old: *the path is a position, not links; the
arrow stays the only way back.* **Three steps is what broke it.**

| | |
|---|---|
| The path already draws the route | `New stack › A repository › Configure`. An arrow sits beside a complete map and can only walk it one step at a time — two clicks to reach what one click reaches directly |
| The crumb names its destination | "Back" names a direction. The previews wizard was already paying for this in a six-word `backLabel` — "Back to the repository list" — which is the crumb, spelled out |
| It bought back the 20 column | **Measured: the arrow's box pushed the phrase 38px right**, so a drawer's heading started at a different x than its own body. Both sit on 20 now |

Live crumbs stay `fg-muted` at rest and ink on approach. The tier IS the "behind
you" signal — lifting it would put two crumbs at the current step's ink with only
an underline saying which one you are on. And §7 gives the accent to selection,
not navigation: a blue crumb would be the only blue text in the drawer.

The hit area is the **word**, not a padded box. A crumb sits inline in a phrase;
a box would break the phrase into buttons and leave the `›` outside them.

**Step one has no back control at all** now — its crumbs point at the screen you
are on. The ✕ is the only exit, which is enough for a step that has committed
nothing. That also retires the older consequence that step one's arrow had to be
wired to *close* the drawer.

**A page-level journey keeps its arrow** (`sheet-header.tsx`). A page shows its
title alone and has no path to click, so there the arrow is the only exit there
is. What changed is *a path makes an arrow redundant*, not *arrows are wrong*.

## A step is not removed by moving its fields elsewhere

The repository journey used to end on a service form — name, branch, port,
Dockerfile path, build context, expose. The graphite pass deleted it
(`git-source-panel.tsx`, commit `15c6d6e`) because those fields describe a
RESOURCE, and a resource is edited in the node inspector on the canvas.

Right about where they live. Wrong about whether the step can go.

> **Deleting a step does not move its work. It stops asking, and something else
> starts guessing.**

The draft was built from five values nobody had seen, and one of them — the port
— decides whether the thing serves traffic at all. "You can change it on the
canvas" is true of every field in the product; it is not a reason to skip the one
moment the person who knows the answer is in front of you.

What came back, and how:

| | |
|---|---|
| **The step** | `New stack › A repository › Configure`, drawer step three. Only the repository journey grows one — the other four commit from step two, because what they produce is already described by what you picked |
| **The schema** | `service-form-schema.ts`, restored verbatim from the deleted `git-source-form-schema.ts`. Same rules, same messages |
| **The layout** | `FieldGrid` + `FieldShell`, nothing hand-rolled. The old panel drew its own `grid grid-cols-2 gap-4` and its own bordered switch row; both are `FieldShell` features now (`span`, `inline`) |
| **The branch control** | `BranchField`, unchanged — it lists branches when the integration can and falls back to free text when it cannot, which is always the case for a pasted URL |
| **The verb** | `Continue` on step two, `Create stack` on step three. A button that said `Create stack` and then showed another form was lying about the click |

Two details worth keeping:

- **The form opens on values.** Name and branch derive from the repository you
  just picked, seeded only when still empty — so going back for a different repo
  and returning does not overwrite a name you had edited.
- **Port is empty on purpose,** with `3000` as its placeholder. It is required,
  and pre-filling a required field with a guess is how a wrong port ships without
  anyone reading it.

The state lives on `Selection`, not in the step's own `useState`: a step that
owns its state unmounts and forgets, and going back to change the repository
would wipe a port you had typed.

## The URL field moves into the band

`Public URL` used to put its input on its own row under the switch. It now takes
the exact slot the search field takes — same top, same left, same width,
**measured**.

The segment decides what the box beside it *is*: a filter over your
repositories, or the box you paste one into. That is what a segmented control is
for. On a second row, switching read as the panel changing shape rather than the
field changing job — and §14's own rule is that the two sources get equal weight
and equal body. A field on row two is not equal to a field on row one.

## Verified

`tsc` clean · `lint` 0 errors · **274 test files, 2023 tests, 0 failures.**

Measured in the browser. Header: path left inset **20**, identical to the body's
own content inset; close right inset **20**; header **73**; no arrow in the band.
Crumbs `#6D675E` against the title's `#191714`. Service step: grid
**291.5 / 291.5** at **16**, service name spans both to the pixel, fields **32**.
URL band: track→field **16**, field **32** and mono.

One story failed on its own harness first and was right to: it measured the
search field and the URL field at two different moments while the drawer was
still sliding in, and reported a 158px difference that did not exist. Settling
the animation before measuring is the fix. **A rect taken mid-animation is not a
measurement** — same lesson as the hairline, one axis over.

# 2026-08-16 (fifth pass) — A stale route rule, a lopsided switch, and pairing by meaning

## The page behind the drawer lost its padding

Reported as "the cards and list in the bg are doing something weird". They were:
opening **New stack** moved every row **16 left and 16 up**, measured on the
ancestor chain rather than guessed.

Nothing about the drawer caused it. `/stacks/new` was in the shell's full-bleed
list:

> `isFullBleed = /^\/stacks\/[^/]+$/.test(location.pathname)`

with a comment explaining why — *"the New stack journey at /stacks/new — its
starting-point strip runs the full width of the sheet and it pins its own footer
to the bottom"*. All true of the **full page** that route used to render. That
page became a drawer, so the route now renders the ordinary stacks LIST with a
drawer over it, and the exception stripped the list's own 16px inset.

**A layout exception outlives the screen it was written for.** The comment was
accurate and the code was wrong, which is the combination that survives review.

Fixed by excluding `NEW_STACK_PATH`, and pinned by two stories — one asserting
`/stacks/new` keeps `16px`, one asserting `/stacks/draft` keeps `0px`. The
wrapper got `data-slot="page-content"` to make them addressable: the first
attempt matched `.px-4` and picked up the **sheet header**, which uses the same
utilities, so the test passed against the wrong element.

## The switch was lopsided, both ways

Track `h-5 w-9` with a border and no padding, thumb `size-4` translated by
`calc(100% - 2px)`. Inside the 34×18 content box:

| | Left | Right | Top / bottom |
|---|---|---|---|
| Off | **0** | 18 | 1 |
| On | 14 | **4** | 1 |

Off, the thumb sat flush against the track's own border with no well at all. On,
it stopped 4px short. The eye reads that as the control being crooked rather
than as the thumb having moved — which is the one thing a switch has to say.

`p-0.5` on the track and a 14px thumb: 20 − 2 border − 4 padding = 14, so the
thumb fills the height exactly and the well IS the padding rather than a number
that has to agree with one. Travel becomes 16 — `translate-x-4`, a rung, not a
`calc` tuned against the thumb's own width. **Measured after: 2px on all four
sides, in both states.**

## Fields go side by side only when they mean something together

The restored service form inherited `Branch | Port` on one row and
`Dockerfile path | Build context` on another. That is **pairing by count** —
four fields, two rows — and the question that killed it was just *what is their
relation?*

A branch is *which code*. A port is *how it is reached*. Nothing. Side by side
they claim otherwise.

The order is now the build pipeline, and the only two fields that share a
subject are the only two on a row:

| | |
|---|---|
| Service name | what it is called |
| Branch | which code |
| **Dockerfile path · Build context** | how it is built — **the pair.** Both are paths relative to the repository root, both feed the same image build, and each one's hint has to name that root *because of* the other |
| Port | where it listens |
| Expose publicly | whether that port is reachable — directly under the field it is about |

`Expose publicly` sits under `Port` because its own sentence is "route external
traffic to **this port**". Adjacency is the whole relation; a "Networking"
heading over two fields would be a third element carrying what the order already
carries.

## The rows get a stem, the crumbs get a verb

`A repository` was half of a pair. A `Start from` eyebrow sat above the old tab
strip, and the file's own comment warned that *the eyebrow and the nouns are ONE
decision — do not remove one without the other, or three of these titles become
sentence fragments.* The strip became a drawer step, the eyebrow went with it,
and the nouns were left doing exactly that.

| Step one row | Crumb, once inside |
|---|---|
| From a repository | Select repository |
| From a ready-made app | Select app |
| From a compose file | Add compose file |
| From building blocks | Add blocks |
| From a blank canvas | Start blank |

Step three is `Configure service`. So the full path reads
`New stack › Select repository › Configure service`.

**The verb is a field, not a transform.** You SELECT a repository, ADD a compose
file, START blank — deriving one from the other means picking a verb that is
wrong for four of the five.

## Verified

`tsc` clean · `lint` 0 errors · **274 test files, 2025 tests, 0 failures**, green
on two consecutive runs.

Measured: switch **2px** on all four sides in both states, thumb 14, travel 16.
Service grid — name / branch / port full width at 599, Dockerfile and Build
context 292 each with a 16 gap, expose beneath Port. Page behind the drawer:
every box in the ancestor chain identical open and closed.

Two more stories were failing on `toBeVisible` racing the drawer's fade-in — the
same trap the addon stories already documented in a comment and then broke
anyway. **Resolving on the accessible name IS the assertion**; `toBeVisible` on
a surface that animates in adds nothing and fails at opacity 0 on an element
that is perfectly correct.

# 2026-08-16 (sixth pass) — The URL gets its own field, and an audit of what the redesign dropped

## The URL box is not a search box, and does not sit where one sits

Explored on the board first — `597:6952`, four options — because the shared-slot
version was landing wrong and neither of us could say why from the code.

Naming it: **that position is a toolbar position, a tool OVER the content below
it.** A search field filters the list under it. The URL box has nothing under it
— it IS the content. Putting it there makes a promise about narrowing and then
does not keep it, and it leaves the whole body empty beneath.

The reasoning that put it there was *"a segmented control exists to change what
the box beside it means"*, which is true about segmented controls and irrelevant
to this slot.

| | | |
|---|---|---|
| A | Shared slot (shipped) | No. One control row and a hint floating in nothing |
| **B** | **Switch keeps its row; labelled field below** | **Chosen** |
| C | B + the row the URL resolved to | Stronger still, but a bigger change |
| D | No switch; one box, one list | Elegant, but a new org gets "search or paste" over an empty list |

B, implemented: `modes("self-start")` on its own row, then a `FieldShell` — label
`Repository URL`, mono input, hint. No `aria-label`: the label already names it,
and two names is one too many. No leading glyph — the magnifier belongs to the
thing that filters a list.

## The audit: what the redesign deleted and never replaced

Prompted by the right question — *did we delete anything that was there before?*
Diffed every file removed on this branch against its replacement. Two real
regressions, both from the wizard deletion in `15c6d6e`, both silent.

### 1. A compose file that parses is not a compose file we can build

`parseCompose` ran the **parser** only, which answers *is this compose?* The
question that decides whether `Create stack` produces anything is the
**converter's** — *and can we make a stack out of it?*

The old `useDockerComposeImport` checked `conversionResult.success` before
navigating. Nothing checked it after the hook was deleted.

> A `services:` block whose service has neither `image` nor `build` parses
> cleanly, reports one service to the gate, passes it — and converts to zero
> resources. **That seeded an empty stack, with no complaint.**

`parseCompose` now runs both. It also shows the **service-specific** errors
rather than the generic consequence: the converter reports "web: must have image
or build" AND "no valid services found", and comma-joined those read as machine
output with the actionable line buried.

### 2. Import warnings were being thrown on the floor

Both importers have always returned warnings. `useDockerComposeImport` and
`useTemplateImport` toasted them after navigating. Both hooks were deleted and
nothing picked the warnings up:

| | Was |
|---|---|
| Compose | `warnings: []` — **hardcoded** in `parseCompose` |
| Template | `const { data } = templateToFormData(...)` — the second half dropped |

`formatImportWarnings` had been sitting orphaned in the tree ever since, which
is the tell: a helper nothing imports means the thing it formatted stopped being
shown.

They are back, and **not as toasts.** A toast arrives after you have committed,
so acting on it means undoing work. They land inline, before the commit:

- **Compose** — an `info` banner above the preview. §4's ladder gives `info` to
  *"we did something to your input and you should know"*, which is what an
  import warning is.
- **Template** — the same banner at the foot of the rail, which is already the
  "what you are about to get" panel. It runs the same `templateToFormData` the
  commit runs, so the rail and the canvas cannot disagree.

### Everything else was genuinely replaced

`stack-create-wizard` → the drawer · `wizard-chooser` → step one ·
`git-source-panel` → steps two and three (restored last pass) ·
`git-source-form-schema` → `service-form-schema` (restored last pass) ·
`block-composer` / `templates-browser-panel` / `docker-compose-import-panel` →
the three tabs · `limited-action` → `BlockedAction` + `reasonList` ·
`addon-type-picker-dialog` + `postgres-create-page` → the addon drawer ·
`nav-*.tsx` → `nav-items.ts`.

**Left as-is and flagged:** `import-warnings-toast.tsx` is now unused. Its job
moved inline. Not deleted without asking — it may still be wanted by a
canvas-side import.

## Verified

`tsc` clean · `lint` 0 errors · **274 test files, 2027 tests, 0 failures**, green
on two consecutive runs.

Both regressions are pinned by stories, and the compose one is pinned with the
input that actually proves it — a service with no image and no build, which the
old gate passed and the new one stops. A test that passes for the wrong reason
is worse than no test: the first version used `services: {}`, which the old
"no services and no volumes" rule already blocked.

# 2026-08-16 (seventh pass) — The URL resolves to a row, and the template warnings come straight back out

## Option C, shipped

`https://github.com/acme/awwdits.git` now resolves, live, to the row it will
build — `acme/awwdits`, `public URL · main`, ticked, under a `This will build`
caption.

**It is not decoration filling an empty body.** Turning that URL into a name is
a *derivation*, and until now the first place its result appeared was the NEXT
step, in a service-name box you would then have to correct. Both paths now end
on the same object, seen the same way, before you continue.

Same 56 `PickerRow` the provider list is made of. No new component.

### Which forced a real cleanup

The row has to read the URL the same way the commit does, or it promises a name
the seed does not carry. The reading had grown **four copies** — the blocked
commit's reason, the repo the service step configures, the rail's item, and the
seed itself — each with its own regex and its own tail-slicing.

> Four copies of *"what counts as a repository URL"* is four chances for the
> button to be live while the seed comes out empty.

One `parsePublicRepoUrl` in `selection.ts` now, and `repoTailOf` is gone.

## The template rail's warnings lasted one pass

Added last entry, removed this one, on the right question: **why does a template
warn at all?** Measured across the registry:

| Template | Warnings |
|---|---|
| ToolJet | **7** — five of them the same sentence |
| Immich | 5 |
| n8n | 4 |
| Grafana · OpenClaw · Gitea | 2 each |
| Prometheus | 1 |

**Seven of seven.** A banner that appears on every item in a catalogue is not a
warning, it is chrome. And the content was not about the user's pick either —
"environment variables imported as plain text", "volume created with default
settings" — that is advice about what to do NEXT, on the canvas, where the env
vars and the volume actually are.

Worst of all it reports on **our own curated records**. A template that converts
badly is a bug in the registry, and the place to catch that is CI, not a banner
shown to every user of every app.

So: the banner is gone, and `template-converts.test.ts` asserts the invariant
that actually matters — every shipped template produces at least one resource,
and every resource has a source. Warnings are deliberately *not* asserted; they
fire for essentially every record, and pinning their count would turn a copy
edit in the converter into a failing test.

**The compose tab keeps its warnings**, because there the file is YOURS and what
it says varies with what you pasted. They are deduped now: the converter emits
per service, so a five-service file said "environment variables imported as
plain text" five times. The sentence is about the file, not about any one
service — worth saying once, worthless said five times.

## The lesson, stated

Two passes in a row added a surface for information that already existed, and
the second one was wrong. The test that separates them is not *is this
information true* — both were — it is:

> **Does it vary, and can the reader act on it here?**

Compose warnings vary with your file and change what you would fix. Template
warnings are constant across the catalogue and actionable only somewhere else.
The first is a message; the second is decoration with a `⚠` on it.

## Verified

`tsc` clean · `lint` 0 errors · **275 test files, 2035 tests, 0 failures.**

The resolved row is pinned by a story that types the URL in two halves — nothing
shows at `https://github.com`, the row appears at `/acme/awwdits.git` — so the
test proves the *threshold*, not just the happy end state.

# 2026-08-16 (eighth pass) — The previews picker joins the create-stack flow

`GitSourcePicker` — the previews `Enable repository` step one — still had the
shape create-stack moved off two passes ago. Not a new design: the same seven
decisions, applied to the second flow that needed them.

| Was | Now |
|---|---|
| URL input shared the search slot | Switch keeps its row; URL is a labelled `FieldShell` |
| Hand-rolled search (`left-2.5`/`pl-8`) | `SearchField` — the Field primitive's 12/8 |
| Hand-rolled URL box with a `Globe` | No leading glyph. The magnifier belongs to the thing that filters a list |
| `Connected provider` | `Provider` |
| meta = `private` **or nothing** | `visibility · branch` |
| No `StickyBar` | The whole band pins |
| Its own looser URL parse | `parsePublicRepoUrl` |
| `Connect a provider` | `Connect provider` |

## The fifth copy of "what counts as a repository URL"

Last pass collapsed four copies into `parsePublicRepoUrl`. This picker was a
fifth, and the loosest of them: **any non-empty string emitted a repository**, so
`Continue` went live on `abc` and phase two opened on a name derived from
nothing. It now shares the one reading, and the row and the button agree by
construction.

The row claims `public URL · main`, so the picker emits `main` as the default
branch — which is what create-stack does, and what phase two's `Base branch`
field then prefills. A row that says `main` over a form that says nothing is the
same disagreement, drawn twice.

## The warning goes under the repository, not over the field

Jaseem's call, made in the running app. The PR-automation banner had been sitting
above the URL field, on the reasoning that it is about choosing the source at
all.

> It is about the repository you just picked. Above the field it interrupts you
> before you have chosen anything, and it pushes the row it is about down the
> sheet.

Below the resolved row: you type, you see what it builds, then you see what that
costs. Generalised in `frontend/CONTEXT.md` — **a consequence sits under the
thing it is about.**

## What deliberately did NOT converge

| | |
|---|---|
| Token connections | Create-stack has none. Kept, and brought onto the same shape: a labelled field, with the band's search off above it and the reason as the field's own hint |
| The provider dropdown | Still in the band, still only when more than one integration exists |
| Step one's footer | Previews keeps `Cancel` + `Continue`, because picking here does **not** advance — the URL side has no row to click. Untouched; §13's "no footer on step one" was written about a flow where the row *is* the commit |

## Verified

`tsc` clean · `lint` 0 errors · **275 test files, 2039 tests, 0 failures.**

Measured in `dev:mock`, after letting the drawer settle: **24 checks, all
match** — and they are gaps, not positions. Segmented→search 16, band→first row
16, row→row 2, label→field 4, field→hint 4, caption→row 8, row→warning 16, the
search glyph on the Field primitive's 12 with text at 36. First run checked on
`dev:mock:empty`: band present, search off at 0.5, `Connect provider`.

**The board is stale.** Section `483:5283` ("enable repository") still draws the
shared slot, the 225 track, an 86 header and phase two's back arrow. Flagged,
not swept.

## Same pass, continued — `Cancel` off, and what the second step was hiding

**`Cancel` came off both steps of the journey**, closing the gap the create-stack
work left behind: the path's live crumbs go back a step, the ✕ leaves entirely,
and a footer `Cancel` was a third control for an act two others already offer.
Both footers now hold the primary alone — `Continue`, then `Enable previews` —
in an 81px band. `ConfigurePhase` lost its `onCancel` prop with it.

### The env-var rows were broken by the primitive that was meant to fix them

`FieldShell`'s whole job is *the control fills the field*, enforced as
`[&_[data-slot=select-trigger]]:w-full`. That is a **descendant** selector, so it
reached inside a composite control and overrode its internals:

> The preview config's env rows put `name`, `value`, a 110px `Value source`
> select and a remove button on one line. The rule made the select `w-full`, and
> `flex-none` stopped it shrinking back — so it ate the row and **the name box
> measured 26px.**

One character fixes it — `_` becomes `>`. Radix's `Select` root renders no DOM
node, so an ordinary field's `SelectTrigger` really is the direct child; a
composite's inner controls are not. Checked against the surfaces the rule was
written for: the addon drawer's three selects still measure 291.5 on the grid
column, the secret drawer's still measures 439.

**The rule is about the control the field wraps. What that control does inside
itself is its own business.**

### And two smaller ones on the same screen

| | |
|---|---|
| `Max active previews` was `w-28` | Its trailing edge sat at **933** while the four fields around it ended at **1420** — the "control sizes to its content" failure `FieldShell` exists to prevent. It fills now. A short value does not earn a short box: create-stack's `Port` is a number too and spans the row |
| `NAME` / `KEY` placeholders | Lower case now, in `KeyValueRows` and both its callers. Caps in a placeholder is not the field shouting a convention, it is a placeholder pretending to be a value — and it was telling half the callers the wrong thing anyway, since secret keys are not upper case |

**Flagged, not changed:** `Environment variables (optional)` is the only field on
the screen that marks optionality in words. Required fields carry the red `*` and
everything else is optional by default, so `(optional)` is a third convention for
a fact the form already states. **Jaseem's call.**

### The preview was lying about the second step

`dev:mock` had no handler for the single-repository fetch or its branches, so
`Base branch` — a **required** field — opened empty on a repository whose default
branch the list had already shown. Both handlers added: the branch now prefills
`develop` for `acme/notifications`, and the field renders as the Select it is
supposed to be. A preview that cannot reach a state cannot be judged in it.

# 2026-08-16 (ninth pass) — Addons: the footer rule catches up

## Step one had a footer holding one `Cancel`

The exact shape §13 was written against, still shipping on the addon drawer:

> Picking a service **advances**, and nothing has been typed. So the button was
> offering to undo a state that does not exist — and the band held **81px** of
> the sheet for the whole step to repeat a control the header already carries.

Gone. Step one's body now runs the full height of the drawer. `Cancel` is off
step two as well, matching create-stack and previews: the path's live crumbs go
back a step, the ✕ leaves, and the footer holds the primary alone.

## The near-miss: a "fix" that broke a field two screens away

The previews pass narrowed `FieldShell`'s fill rule from any descendant to a
direct child, to stop it reaching inside the env-var row. Auditing addons found
what that would have cost:

> The addon drawer's **Schedule** puts its select inside a `flex-col` wrapper,
> so it is not a direct child either — and it very much wants the fill. The
> direct-child rule would have collapsed it from 291.5 to hugging the word
> "Daily", on a screen no test measures.

**Nested controls in a column are the common case; the descendant rule is
right.** Reverted, and the one genuine conflict now says so at the call site:
the env row's 110px `Value source` chip carries `w-[110px]!`, which is a control
declaring a width louder than the field. Both measured after the change — env
row 215.6 / 217.4 / 110 / 32 to 1420, addon Schedule 291.5 on its grid column.

**The lesson**: a shared primitive's rule cannot be narrowed on the evidence of
one call site. Thirty-six call sites, and the suite is green either way because
**tests assert behaviour and this is geometry** — it took opening the other
screen and reading a rect.

## Two disclosures, one above the other, answering the pointer differently

`Backups` hovered edge to edge. `Advanced` hovered up to a seam partway across —
because its `Documentation` link sat beside the trigger, which made the trigger
`flex-1` and stopped it where the link began.

> Two rows that are identical at rest must not behave differently under the
> pointer. The tell was that the link's own hover *also* lit the section header,
> as though the link opened the section.

The link moved to the **drawer footer's left half**, which is where a way out to
the docs belongs: available the whole time you are filling the form, nowhere near
the button that commits, and not attached to whichever section last mentioned it.
`DrawerActions` grew a `leading` slot for it — **not** a home for `Cancel`.

Both triggers now measure x 801, w 639, h 52. Identical.

## Grouping: `Storage size` was paired with `Version`

Pairing by **count** — four fields, two rows — which is the mistake the service
step already learned with `Branch | Port`.

| | |
|---|---|
| Was | `Plan` alone · `Storage size ǀ Version` |
| Now | `Plan ǀ Storage size` · `Version` alone |

A disk size and a Postgres major version have nothing to do with each other, and
a shared row claims they do. **Plan and Storage size are one question in two
boxes** — CPU and memory come from the plan, disk from the field beside it.
`Version` is alone now, and not because nothing was left over.

## The gap between the two disclosures, and the arrows nobody drew

**The gap.** `Backups` and `Advanced` were siblings of the field groups above,
so the body's own 16 gap fell between them — and a gap between two hairlines
reads as a third, empty section. Wrapped in one element: they close up to a 1px
seam, each keeping its own top rule, and the 16 is spent once above the pair.

**The arrows.** A `type=number` field draws a pair of stacked native triangles
inside its own padding:

> It is the only control on the sheet the product did not draw. It ignores the
> height ladder, the radius, the ink tiers and both themes; it appears on hover
> and focus only; and it sits *inside* the field, so the value has to make room
> for a control that arrived from the operating system.

Two call sites had already killed it by hand with the same three arbitrary
variants — which is the tell that it belongs to the primitive. `Storage size`
had not, so exactly one number field in the product wore it. Off in `Input` now,
for every `type=number`, and the two hand-rolled copies are gone.

Nothing is lost: these are values you **type** — a disk size, a preview cap —
every one keeps its `min`/`max` and its own clamping, and arrow keys still step
the value, which is the affordance a keyboard user actually had.

## Inside the accordion: alignment, one sentence, and the switch

**Content lines up with the section's name, not its edge.** The trigger spends 20
of inset, a 16 chevron and an 8 gap before the word `Backups` — so the title
starts at **44**, and everything the section opened out of sat at **20**, a full
24 to its left. Every field inside read as belonging to the drawer rather than to
the section it came out of. `SECTION_CONTENT_INSET` is that 44, written down
next to the trigger it is derived from so the two cannot drift.

**`Daily` and `at 03:00` are one answer, so they are one line.** Stacked, they
made two rows out of the single question *when*, and left the reader to work out
that the second line belonged to the first. The field takes `span={2}` to do it —
at 292 the parts wrap straight back into the two rows this was fixing — and each
part carries its own width with `!`, because `FieldShell`'s fill is right for a
field whose control IS the field and wrong for one word of a sentence.

### The switch, globally

| | Was | Now |
|---|---|---|
| Alignment | `items-start` + a 2px nudge | **Centred on the whole statement** |
| Gap to the text | 16 | **24** |

`items-start` pinned the switch to the label's first line, so a one-line row
looked centred and a row with a two-line hint looked top-heavy — on the same
form. What a switch answers is the label **and** its hint, so it centres on both.

And 16 was the gap between *fields*: a distance that says "these are two things"
cannot also say "these are one statement".

**The 2px that was left.** With `items-center` the switch still measured 1.95
high, because the block wrapping it inherited its line box's descender and stood
~4 taller than the control inside. `flex` on the wrapper, and all four toggles
now report `switchMid === textMid` exactly, at a gap of 24. Every inline
`FieldShell` in the product was measured — the addon form, the backup fields and
create-stack's `Expose publicly`. There are only three.

## Half width was the default, not a decision

> *"Why are these fields smaller? Other drawers extend the fields."*

There was a reason on file, for exactly one of them — `Create`, with a note
saying a three-option select at 599 "says this is a big decision and it is not".
It was never applied to anything else, and two drawers away `Port`, `Base branch`
and `Max active previews` — the same short values — run the full width.

The real cause was the default. `FieldShell` defaulted to `span={1}`, so **half
width happened wherever nobody decided anything**: `Version`, `Object store`,
`Create` and `Source addon` each sat at 292 with an empty cell beside them, not
because a narrow box suited them but because that is what a two-column grid does
to a lone child.

**The default is now `span={2}` — a field fills the body unless it has a
partner** — and `span={1}` is a statement that this field is half of a pair. It
appears exactly where two fields share a subject:

| Pair | Shared subject |
|---|---|
| `Plan ǀ Storage size` | how big |
| `Dockerfile path ǀ Build context` | paths from the repo root feeding one build |
| `CPU request ǀ CPU limit`, `Memory request ǀ Memory limit` | one dimension, its floor and its ceiling |
| `Source addon ǀ Object store` | where the backup is restored from (the store is *set by* the addon) |
| `Recover to ǀ Target time` | the recovery point, and the time that refines it |

Everything else fills. `FieldGrid` still does the job it was built for — a form
gets two trailing edges instead of one per field — but the grid is now something
a **pair** opts into rather than something every field falls into.

## Backups: a switch two fields away from what it switches

Jaseem's reading, and it is the right one: **`Schedule` is a sub of `Enable
scheduled backups`, and they were separated.** The order was

> Enable scheduled backups · Object store · WAL archiving · *(the disabled
> reason)* · Schedule

so the switch appeared to control nothing, the schedule appeared to belong to
WAL archiving, and the one sentence explaining the disabled region sat against
the wrong switch.

Three faults, one order:

| | |
|---|---|
| **The destination was inside one capability** | `Object store` is where **both** scheduled backups and WAL archiving ship, and neither can do anything without it. Sitting between the two switches it read as the first one's setting. It leads the section now |
| **A switch was separated from what it turns on** | `Enable scheduled backups` → the disabled sentence → `Schedule`, adjacent. The explanation now sits exactly between the switch it names and the field it governs |
| **WAL archiving was in the middle of another capability** | It is a second, independent thing and nothing follows from it, so it goes last with nothing under it |

### The sentence promised a field that does not exist

*"Turn on Enable scheduled backups to set a schedule and **how long backups are
kept**."*

There is no retention field on this form. Grepped the whole area: the only
`retention` in the product is **`ObjectStoreSpec.retention_policy`** (default
`7d`) — how long backups are kept belongs to the **object store you pick**, not
to the addon.

> A disabled-region explanation is a promise about what turning the switch on
> gives you. This one sent people looking for a control that is not there and
> never will be.

It now says *"to set when they run"* — and then stopped being a separate
sentence at all, see below.

### A switch label names the thing; the switch says whether it is on

`Enable scheduled backups` → **`Scheduled backups`**, and
`Generate superuser credentials` → **`Superuser credentials`**. "Enable" and
"Generate" were the control's own job written into its label, which made each row
read as an instruction rather than a setting — and the label then fought the
switch beside it, which already says on or off.

### The schedule is hidden when the switch is off, not greyed out

§9's *nothing is disabled without saying why* is about a control that refuses and
does not explain. **A schedule for backups that do not run is not a refused
control — it is a question that has not been asked yet.** Greyed out, it held six
controls plus a sentence on screen to say "these do not apply": more room spent
denying the setting than the setting takes.

So the sentence that existed only to explain the grey is gone, and the promise it
carried moved onto the switch, where the promise is made:

| State | Hint |
|---|---|
| off | *When off, only manual backups can run. **Turn on to set when they run.*** |
| on | *Backups run on the schedule below. Turn off for manual backups only.* |

**Two strings, because one cannot be true in both states.** "Turn on to set when
they run" describes a field the reader is already looking at once it is on. Off
keeps the promise; on says what the switch would cost to undo.

`disabled` is gone from the component entirely — six dead props, since nothing
inside the guard can render while the switch is off.

## `Documentation` is a ghost Button

Bare link text next to a 32px primary read as a stray sentence that had wandered
into a control row. `ghost` is still the quietest material in §9 — transparent
until hover — so it never competes with the fill opposite it, but it now has the
band's height and a target you can hit.

`-ml-3.5` pulls back the button's own 14 of label padding so the **word** lands
on the footer's 24 column, measured at 825. A ghost has no edge to align; align
its box and the label sits inset from everything else in the band.

## Still open on the addon pages

Audited, not changed — see `docs/tasks.md`.

## Verified

`tsc` clean · `lint` 0 errors · **275 test files, 2040 tests, 0 failures.**
Measured in `dev:mock`: step one has no footer element at all and its body runs
to the full viewport; step two's footer holds `Create addon` alone.
