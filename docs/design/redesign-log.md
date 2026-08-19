# Product redesign — running log

**Read this first in any new session.** It is the handoff: where we are, what is
decided, what is not, and what to do next.

Last updated: 2026-08-04 (promoted to real components; Button settled)

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

Copying Polaris's full material wholesale fought the graphite language: the
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
