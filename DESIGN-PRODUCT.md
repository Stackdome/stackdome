# DESIGN-PRODUCT.md

**Rules for the Stackdome product UI.** Read this before changing anything
visual. Written as rules, not descriptions — if a rule and the code disagree,
the code is wrong.

The reference is **OpenAI's ChatGPT web UI**, not the Stackdome website. Same
family, different system: the website copied OpenAI's *marketing* scale; the
product needs OpenAI's *product* scale. Other products may be researched, but
their findings get reported — never folded in silently.

Working surface: `pnpm --prefix frontend storybook`.
Full reasoning and history: `docs/design/redesign-log.md`.

---

## 1. Surfaces — white floats, grey recedes

The surface a thing sits on **is** a statement about its scope.

| Plane | What it holds |
|---|---|
| **Paper frame** — sidebar, page background | Navigation, global helpers, the account block |
| **White sheet** — content plane + its top bar | Only what is scoped to the page you are on |

| Rule | |
|---|---|
| Higher elevation = **whiter** | Modals, popovers and the content plane are white |
| Grey never means "a card" | Grey means **pushed back into the frame** |
| Grey wells are for **input** and **reference** | Search fields, code blocks. Never for a list of things you click |
| Greys are 2–4% ink | Never a mid-grey |

The sheet's top bar is part of the sheet, so it may hold page-scoped things —
and only those. See §8.

## 2. Radius scales with the size of the element

| Token | Value | For |
|---|---|---|
| `rounded-sm` | 6px | Chips, badges, icon hit-areas |
| `rounded-md` | **8px** | **Default** — list rows, menu items, nav items, inputs |
| `rounded-lg` | 12px | Cards, panels, the content sheet |
| `rounded-xl` | 16px | Modals, dialogs, sheets |
| `rounded-full` | pill | **Small controls only** — buttons, chips, toggles |

**Pill is not a style, it is what small things get.** A text field is not a
small control: it holds content, so it takes 8px.

## 3. Type — named by job, anchored on 13px

Use the token, never `text-[13px]` or `text-sm`.

| Token | Size / line | Job |
|---|---|---|
| `text-label` | 11 / 16 | Group labels, avatar initials |
| `text-meta` | 12 / 16 | Row data — branch, counts, status, timestamps |
| **`text-body`** | **13 / 20** | **The base.** Nav, buttons, breadcrumbs, prose, inputs |
| `text-name` | 14 / 20 | The thing you scan a list for |
| `text-title` | 16 / 24 | Page and section titles |
| `text-head` | 20 / 28 | Dialog and empty-state headlines only |

**Nothing above 20px exists in the product.** Display type is the website's.
Every line-height is a multiple of 4. **Three weights only: 400 / 500 / 600.**

### Spend it sparingly

13px carries the screen; a size step must be **earned**. Exactly one
`text-title` per page (the title). Before adding a size, ask whether **weight**,
**colour** or **position** can do the job — they were already carrying most of
the hierarchy. Exceptions are fine; make them knowingly.

## 4. Colour — three text tiers, one job each

| Token | Job |
|---|---|
| `text-foreground` `#191714` | What you came to find — names, **and every nav label** |
| `text-fg-2` `#5C574E` | Data you read — project, branch, counts, status |
| `text-fg-muted` `#726C63` | Furniture and time — group labels, ages, separators |
| `text-fg-ghost` | Placeholder and disabled only |

| Rule | |
|---|---|
| **If a colour doesn't report something, it's a bug** | No decorative brand colour. Orange is a voice, never an action |
| Nav labels are **ink at rest** | The grey is carried by the **icon**, never the word |
| Status says it **once** | A dot **or** a word — not a coloured word plus a dot plus a card edge |
| All tiers pass AA at 12px | `fg-muted` was darkened for exactly this reason |

## 5. Control heights — 28 / 32 / 40

| Height | For |
|---|---|
| 28px | Chips, in-row actions, anything inside a dense row |
| **32px** | **Default** — page toolbars, dialog footers, sidebar rows |
| 40px | Form fields and their primary button |

**Height follows density, never importance.** An important button gets
**filled**, not taller. Chrome: topnav and sidebar header are 52px.

## 6. Buttons

| | |
|---|---|
| Variants | `default · destructive · outline · secondary · ghost · link · inverse` |
| Filled is **rare** | One `default` per screen. Everything else is a hairline |
| At rest | **Flat.** No highlight, no bevel, no drop shadow |
| Radius | `rounded-full` — a button is a small element |

### Press

Depth exists **only while you are touching it**. Four things fire together:

1. Inner-shadow recess appears
2. Label and icon travel **1px down** — the *content* moves, the button does not
3. Fill darkens
4. Nothing else

One geometry for every variant (1px side walls · 2px top shadow · 2px blur).
**Intensity is set by how light or dark the face is — never by importance:**
`--btn-press-soft` (light faces) · `--btn-press-mid` (mid-tone) ·
`--btn-press-strong` (near-black).

### Optical padding

The eye aligns on **centre of mass**, not bounding boxes. An icon carries
invisible safe area inside its box (~2.9px each side for a 14px glyph); a
letterform meets the edge with almost none.

```
icon side  = base − 3      label side = base + 2
```

| Size | Base | Icon side | Label side |
|---|---|---|---|
| sm | 10 | 7 | 12 |
| default | 12 | 9 | 14 |
| lg | 15 | 12 | 17 |

Symmetric where there is nothing to correct against: text-only, icon-only, and
icons on both sides.

### Loading

`loading` swaps the content for a spinner and makes the button inert.
`loadingText` says **what is happening** — `"Creating…"`, `"Deploying…"` — not
that something is. Contrast stays at 100%: **a request in flight is not a
disabled control.**

## 7. Lists — hairlines, not cards

Separation is a **1px rule**. No box, no shadow, no card per item. Row actions
appear on hover; a kebab on every row at rest is chrome competing with content.

Cards remain as a **second view**, not a replacement — a list/cards toggle is
planned.

## 8. The sheet header

**The top of the sheet is the header.** Not a bar sitting on it: no divider,
content passes under it and dissolves into it. 52px, aligned with the sidebar
head across the seam. There is exactly **one** header per screen — a page that
renders its own title is repeating the bar.

### It answers three questions, left to right, and nothing else

| Slot | Question | Holds | Owned by |
|---|---|---|---|
| Left | *Where am I?* | The breadcrumb. Its **last segment is the page title** | The shell |
| Right — inner | *How much / what state?* | **One** fact about the whole page: a count, or a state word | The page |
| Right — outer | *What can I do here?* | Actions scoped to this page | The page |

Pages write to the right side by portalling into `#topnav-actions`. They never
write to the left — the shell owns the path.

### Visual specification

Derived from ChatGPT's header, **measured in the browser at 1440px** — not
copied. Their control step is 36px on a 16px type base; ours is 32px on a 13px
base (§3, §5). The *proportions* transfer, the *numbers* are translated.

| Property | Value | Reasoning |
|---|---|---|
| Band height | **52px** | Same as ChatGPT. Also the sidebar head height, so the two planes line up across the seam |
| Inner control height | **32px** — the default step | ChatGPT runs a 36px row inside 8px padding. 32px is the same step on our scale |
| Vertical padding | **10px** | Falls out of 52 − 32. Never set it directly — centre the row |
| Horizontal inset | **16px** both ends | |
| Background | **Opaque `bg-card`** | ChatGPT's is transparent over a flat page. Ours is opaque because the sheet is inset and content scrolls **under** it — same result, different mechanic |
| Divider | **None.** Ever | §1 — the sheet's own edge is the boundary |
| Fade under the bar | 8px of `bg-card` → transparent | Rows dissolve into the bar instead of being sliced by it |
| Position | `sticky top-0`, inside the scroll container | It is the top of the sheet, not a sibling of it |

**Left group**

| Element | Spec |
|---|---|
| Sidebar toggle | 32×32, 16px glyph, `fg-2` — never ink. It is chrome, not content |
| Trail | 13px, weight 400, `fg-2` |
| Separator | `/` at `fg-2`/50%, 8px either side |
| **Page title** (last segment) | **`text-title` 16px, semibold, ink** — the loudest thing in the bar |
| Chevron, if the title switches something | 16px, `fg-2`, 4px after the label |

**Right group**

| Element | Spec |
|---|---|
| The one fact | **`text-name` 14px**, weight 400, `fg-muted`, **tabular numbers** |
| Fact → first action | 12px gap |
| Actions | 32px, pill, **`text-name` 14px** weight 500. The size is enforced on `#topnav-actions`, not per call site |
| Between actions | **8px gap** — same as ChatGPT |
| Kebab | 32×32 icon button, always last |

### Budget

**One fact · one primary · one secondary · one kebab.** Everything past that
goes in the kebab. If the kebab overflows, the page needs its own toolbar — the
header is not where you solve a crowded page.

### What the bar never holds

| Not this | Why | Where it goes |
|---|---|---|
| Docs, theme, account, product-wide search | About the **product**, not the page | The paper frame |
| Explanatory sentences (the old `subtitle`) | You need the explanation when there is **nothing yet**, not when the list is full | The empty state |
| Entity metadata — repo URL, created date | Reference, not orientation | The page body |
| Back links (`← Previews`, `← All addons`) | The breadcrumb **is** the way back | Deleted |
| Tabs, filters, sort | Scoped to the content below, not to the page | The content toolbar |
| Destructive actions | The bar is on screen the entire time you scroll. A permanently exposed `Delete` is a hazard, not a convenience | The kebab |

### Two tests before anything goes in

| Test | |
|---|---|
| **Does it survive the scroll?** | The bar never leaves. A count that updates with the filter passes. Anything tied to a scroll position fails |
| **Is it about the page, or the product?** | About the product → it belongs in the grey frame. This is the §1 plane rule, and it decides every argument about the bar |

### Scaling to a new page

| Page type | The one fact | Actions |
|---|---|---|
| **List** — Stacks, Secrets, Domains, Users | Item count (`20 stacks`) | `+ New <thing>` |
| **Detail** — a stack, an addon, a preview config | Status pill | One primary verb, rest in the kebab |
| **Form / wizard** | — | — · the wizard footer owns its buttons |
| **Empty or errored** | — | The recovery action lives in the empty state, not the bar |

**An empty right side is correct**, not unfinished. A page with nothing to count
and nothing to do shows a breadcrumb alone.

### The one thing not copied

ChatGPT's header carries **no trail** — just `ChatGPT ⌄`, the current context and
nothing before it. The path is the sidebar's job there.

We keep a trail because our resources nest (a stack → an addon → a backup) and
the sidebar cannot show that depth. **But the trail is not the title.** The
segments before the last one are 13px `fg-2` wayfinding; the last one is the
16px semibold title. One line, two jobs, two weights.

**There is no `Home` crumb.** Every top-level destination is one click away in
the sidebar, so a Home hop says nothing the frame isn't already saying — and it
pushed the real title out of first position. A top-level page shows its title
alone; the trail only appears once you are actually nested.

Consequence: a route with no path segment has nothing to name itself with.
`/` used to render the Stacks page directly and now redirects to `/stacks`.
**Any new page must be reachable at a named path** — a bare `/` route cannot
title itself.

---

## Gotchas that cost real time

| Gotcha | |
|---|---|
| **tailwind-merge and named sizes** | It classifies any unfamiliar `text-*` as a **colour**, so `cn("text-body","text-fg-2")` silently drops the size and the element falls back to 16px. `cn` registers the scale as a `font-size` group in `frontend/src/lib/utils.ts`. **Any new named utility that shadows a Tailwind prefix must be registered there too.** |
| **Tailwind misses new files** | A file created while the dev server is running is skipped by the scan — arbitrary classes produce no CSS at all. `touch src/index.css` to force a rescan. |
| **`:active` fires while `:hover` is true** | A press that only sets a shadow will still inherit the hover fill and get *lighter*. Set the pressed fill explicitly. |
| **Text nodes are not elements** | They cannot be transformed or matched by `:first-child`. The Button wraps its children for exactly this reason. |

## How to work

| | |
|---|---|
| **Storybook is the source of truth** | Update the primitive and use it. **Never** hand-roll a copy in a story — a standalone picture proves nothing and gets built twice |
| **Never create a new component if one exists** | Ask first |
| **Decide against a whole screen** | A component judged in isolation has no basis to be judged |
| **Measure, don't eyeball** | Read computed styles and ink extents in the browser. Two rounds of button padding were wrong because the glyph's safe area was assumed rather than measured |
| **Research the mechanic before building it** | Copying a look without its mechanism produces the wrong thing convincingly |
