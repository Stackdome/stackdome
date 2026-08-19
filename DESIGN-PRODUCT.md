# DESIGN-PRODUCT.md

**The rules for Bone — the Stackdome product design system.**

Read it before changing anything visual. If another document and this file
disagree, **this file wins** — and the other document gets corrected.

### What this file has authority over

**Complete authority over redesigned surfaces only.** On those, if a rule and
the code disagree, **the code is wrong**. Everywhere else it is the direction of
travel, not a verdict on what is already there.

| Surface | Status | This file |
|---|---|---|
| **The shell** — frame, sidebar, sheet header | Redesigned | **Binding** |
| **Stacks** — list, canvas, create-stack | Redesigned | **Binding** |
| Everything else — projects, clusters, addons, previews, users, domains, secrets, git integrations, image registries, auth, 404 | **Swept only** — carries the tokens and primitives, layout untouched | The target, not the standard |
| **The stack editor** | Not converted (§15) | The target, not the standard |

A rule violated on a swept page is **not a bug to file**. It is work not yet
done, and it gets done when that page's journey comes up (§2).

### Three sources, three jobs

The "only authority" claim was too broad, and it fought two rules further down.

| Owns | Source |
|---|---|
| **The rules** — what to build and why | **This file** |
| **Colour** — the ladders, the alphas | **The code.** OKLCH in `index.css` is authored; Figma stores a resolved snapshot (§3) |
| **Shell geometry** — the numbers | **The `app shell` board** (§12) |

### The name

**Bone.** It says three true things at once, which is why it beat the
alternatives:

| | |
|---|---|
| **The colour** | Bone is a warm off-white — `#F5F4F1`, the paper frame, almost exactly |
| **Barebones** | The restraint rule, named. Nothing decorative; if a colour doesn't report something, it's a bug (§7) |
| **Structure** | A bone is what holds a thing up. This is the layer everything else stands on |

It replaces **graphite**, which was never chosen — it leaked in from
`stackdome-website/src/directions/graphite.ts`, one of the *website's* colour
directions. Graphite is a **cool**, blue-leaning grey. This palette is
deliberately **warm**: every dark tier is pinned to `--ink-h: 85` (§3). The old
name described the opposite of what is on screen.

One caveat: *bone* already means a skeleton-loading placeholder in frontend
vocabulary. Never name the parts of a skeleton loader "bones".

| Document | Role |
|---|---|
| **`DESIGN-PRODUCT.md`** (this file) | **Authority.** The rules |
| `docs/design/openai-platform-study.md` | **Evidence.** Measured findings. Never an instruction |
| `docs/design/redesign-log.md` | **History.** How we got here. Never an instruction |
| `stackdome-website/DESIGN.md`, `DESIGN-PROMPT.md` | The **website's** rules. They govern the website, not the product |

Working surface: `pnpm --prefix frontend storybook`.

---

## 1. Who this is for

Three people, from the product's own positioning:

| Who | What they want |
|---|---|
| **Platform team** — 1–3 people running infra | Developers self-serving without giving up control |
| **Developer** — the primary user | *"Doesn't want to learn infra, write YAML, or file a ticket to get a URL."* Push, deploy, get a URL |
| **CTO** | Not to pay PaaS prices, and not to hire a platform team |

**The primary user is deliberately not an infrastructure expert.** That is the
most useful fact in this file, and it settles more arguments than any token:

- **Comfortable over dense.** This is not a trading terminal. Room to read wins.
  A section may go dense where the work genuinely demands it — density is a
  default, not a cage.
- **Screens explain themselves.** Someone who avoided infra on purpose should
  not need documentation open beside the product.
- **The canvas is the headline.** *"Topology you can see beats YAML you can't"*
  is the product's central promise. It gets designed like the hero, not like a
  utility.

## 2. How we work

| Rule | |
|---|---|
| **Artifact → Figma → code** | An artifact to understand the flow and settle the solution. Figma to lay the foundation — usually not exhaustive, just enough to fix the direction, then expanded in code using these rules. When the picture isn't clear, Figma scopes it **fully** before any code |
| **Storybook is the working surface** | Build and judge here, on mocked data. Never hand-roll a copy of a component inside a story |
| **Judge against a screen** | A component judged in isolation has no basis to be judged |
| **When to make a new component** | Only when **no Storybook component exists**, or the existing one's look and feel **cannot be altered** to fit. Otherwise **add a variant** — `pill` and `flat` are variants of Button, not two components |
| **Done** | When we are happy with what is on the screen and the components on it |
| **Order of work** | Structure, nav and page shell first, revamping components as needed. Then page by page, journey by journey. Component changes rippling into other pages is expected and fine — we reach every page |
| **Fix the rule before the pages** | A page-by-page sweep cannot fix a rule; it can only spread it. If a change touches more than two screens, the rule lands here first |
| **Measure, don't eyeball** | Read computed styles in the browser. Two rounds of button padding were wrong because the glyph's safe area was assumed |
| **Research the mechanic before building it** | Copying a look without its mechanism produces the wrong thing convincingly |

---

## 3. Surfaces — white floats, grey recedes

The surface a thing sits on **is** a statement about its scope.

| Plane | What it holds |
|---|---|
| **Paper frame** — sidebar, page background | Navigation, global helpers, the account block |
| **White sheet** — content plane + its top bar | Only what is scoped to the page you are on |

| Rule | |
|---|---|
| Higher elevation = **whiter** | Modals, popovers and the content plane are white |
| Grey never means "a card" | Grey means **pushed back into the frame** |
| Grey wells are for **input** and **reference** | Search fields, code blocks. Never a list of things you click |
| **Grounds sit 2–4% below white** | Measured as **lightness drop**, not channel alpha — see below. Governs **grounds only**; washes are marks (§4) |

The sheet's top bar is part of the sheet, so it may hold page-scoped things —
and only those. See §12.

### How to measure a ground — lightness, never channel alpha

**Measure the L\* drop from white.** Do not express a warm grey as "% of the text
ink": text ink is near-neutral, so a warm ground's blue channel — which is doing
*warmth* work, not *depth* work — inflates the number and makes a correct grey
look too heavy. This is the same trap as the line ink in §4, one level up.

| Ground | Value | L\* drop | |
|---|---|---|---|
| `--secondary` | `#FAF9F6` | ~2.0% | ✓ |
| `--control` | `#F7F6F3` | ~3.1% | ✓ |
| `--background` — the paper frame | `#F5F4F1` | ~3.8% | ✓ |

All three are in band. **`--muted` / `--accent` sits at 5.88% — below the band,
and still a ground.** It is the hover *fill*, solid in both themes
(`#F0EEE9`, and `oklch(27.7%)` in dark on the same ladder as every other dark
ground).

**It is not the hover wash.** That is a different thing with different tokens:
`--wash-hover` and friends are alpha ink tints (§4), for faces that are
transparent at rest. A surface that has its own fill hovers to `--muted`; a
surface that has none borrows a wash. Two mechanics, two token families — this
file used to conflate them.

| | |
|---|---|
| **Grounds** | `secondary` 2.07% · `control` 3.12% · `background` 3.81% · **`muted` 5.88%** |
| **In band (2–4%)** | The first three. These are *levels* you stand things on |
| **Out of band, deliberately** | `muted`. Hover has to be felt as a change, not read as a new level, so it clears the band it would otherwise be confused with |

### Grounds are solid, marks are alpha

This is the rule underneath the whole token layer.

> A **ground** is something you stand things on — the paper frame, the sheet, a
> control fill, the terminal. It is **opaque**, because it must be a known
> colour that everything else is measured against.
>
> A **mark** is laid over a ground it does not control — a hairline, a hover
> wash, a selection tint, a grid dot, a press recess, a scrim. It is **alpha**,
> because the same mark must work on three grounds and still read as one thing.

| | |
|---|---|
| **Solid** | `background` · `card` · `secondary` · `control` · **`muted` / `accent`** · `code-bg` · every ink tier · the state hues |
| **Alpha** | borders · the `--wash-*` ladder · grid dots · press shadows · state fills and borders · scrims · the focus ring |

**Consequence:** a `--wash-*` tint is a *mark*, so it is not bound by the 2–4%
ground band. `--muted` is a **ground** and is also not bound by it — for the
different reason given above. Nothing here is a hand-picked grey either way.

### Dark grounds — one hue, one chroma

Light measures its grounds by **lightness drop from white**. Dark cannot: the
drops are tiny and the eye reads *colour* long before it reads level. So dark
grounds are governed by a second number.

> **Every ground in dark sits at chroma ~4, hue ~85 (OKLCH).** One warmth for
> the whole screen. Level is carried by lightness alone.

| Ground | Value | L | C |
|---|---|---|---|
| `--background` — the frame | `#131210` | 18.3 | 4.3 |
| `--card` — the sheet | `#1C1B19` | 22.2 | 4.1 |
| `--popover` | `#1E1D1B` | 23.2 | 4.1 |
| `--control` / `--input` — the control fill | `#232220` | 25.2 | 4.0 |
| `--muted` / `--accent` — hover | `#292826` | 27.8 | 4.2 |

The controls had escaped this. `--input`, `--control`, `--popover` and
`--accent` all ran at **chroma 10–12.5** — two to three times the ladder — so on
a neutral warm-grey screen every field, select and menu read **khaki**. They are
back on the ladder.

### A field and a control share one fill

`--input` and `--control` are the **same value in both themes.** Light has
always had them equal (`#F7F6F3`); dark briefly split them — input one rung
below the card, control one rung above — which meant a search field and the
select beside it in the same toolbar row were two greys in dark and one grey in
light. **The theme was changing the relationship, not just the values.**

| | Light | Dark |
|---|---|---|
| `--input` — you type into it | `#F7F6F3` | `#232220` |
| `--control` — you press it | `#F7F6F3` | `#232220` |

**A field is still a well and a select is still a face** — that difference is
carried by the **line** and the **press mechanic** (§9), the way light has
always carried it, not by a second fill. A field's hover moves the border
(`border-strong`); a control's hover moves the fill (`--control-hover`).

**Measure any new dark ground in OKLCH before it lands.** A hand-picked hex that
looks right on its own will carry the wrong warmth next to the ladder.

### OKLCH in the code, hex in Figma

**The product authors colour in OKLCH. Figma has no OKLCH, so the board stores
the resolved sRGB hex.** That is a deliberate asymmetry, not drift.

| | |
|---|---|
| **Code is the source** | OKLCH is what makes the ladder *tunable* — one chroma dial for every ground, lightness carrying the tier. Hex can only express the output, not the relationship |
| **Figma is a resolved snapshot** | One direction, code → board. Turning `--ground-c` or `--ink-c` does **not** propagate; the Figma variables must be re-derived |
| **Never downgrade the code to match** | Storing hex in `index.css` so the two look alike would throw away the mechanic to save a conversion step |

When adding a Figma colour variable, **compute** the sRGB from the OKLCH value —
never eyeball a hex — and record the OKLCH it came from. Revisit the whole
arrangement when Figma ships OKLCH; the conversion is the only reason the two
can ever disagree.

## 4. Alpha — lines, washes, dots, states

One line has to sit on the **white sheet**, the **paper frame** and a **control
fill** and still read as the same line. An opaque hex cannot: it is right on one
surface and wrong on the other two.

**The ink is not `--foreground`.** That was the trap. Text ink `#191714` is very
nearly neutral, so it composited to `#E6E5E5` and `#D6D5D5` — grey lines on a
warm palette, going *colder* as they got stronger. Figma's board had been
compensating by hand-picking a warmer solid, which is why the two never matched.

The line ink is **derived**: solve for the colour that, at the smallest alpha
which keeps every channel in range, composites to the target line on the sheet.

```
a   = max((bg − target) / bg)        per channel
ink = (target − bg × (1 − a)) / a
```

For the board's `#E8E6E2` hairline on white that gives **`rgb(53 35 0)`** at
11.37%, and the round trip is exact.

| Token | Alpha | On the sheet | For |
|---|---|---|---|
| `--border-subtle` | 6% | `#F3F2F0` | A line **inside** a control — the divider between segments |
| **`--border`** | **11%** | **`#E9E7E3`** | **The hairline.** Rows, cards, inputs, the default |
| `--border-strong` | 18% | `#DBD7D1` | Hover and emphasis |

Never hand-write a line colour. If a new rung is genuinely needed, derive it
from `--line-ink` and add it here.

**A seam between two REGIONS takes the 11% hairline, never `subtle`.** Settled
August 2026, after four rails on the board — previews' repository rail and three
new-stack rails — drew the same boundary on two different rungs. `subtle` is the
line **inside a control**: the divider between segments, and nothing else. The
edge where a rail meets the body it filters is the same kind of line as the one
under a column header — chrome on one side, content on the other — and it is the
default rung. The only line allowed to go quieter than the default is one whose
separating is already being done by a shadow (§12's sheet edge).

### Alpha is a function of the shape, not the token's name

A 1px line and a 1.5px dot at the same alpha are **not** equally visible — a dot
has far less area to accumulate contrast, so at hairline alpha it disappears.
Grid dots therefore run at **16% / 24%**, roughly double the line. Any new mark
gets its alpha chosen for its own shape.

### Dark is not light inverted — and the alphas are not either

The ink flips to `rgb(255 253 247)`, already warm and needing no correction. But
**the alphas do not carry over.** The same 11% is a bigger step in dark: light's
hairline lifts white by **ΔL 0.072** in OKLCH, while 11% over the dark card
lifted it by **0.102** — about 40% louder. That is what read as "the borders are
more intense in dark".

Each rung is solved so its **ΔL off the dark card matches the light rung's ΔL
off the sheet.** WCAG contrast ratio agrees with OKLCH ΔL to within 0.005 at
every rung, so two independent measures pick the same numbers.

| Rung | Light | Dark | ΔL light | ΔL dark |
|---|---|---|---|---|
| `--border-subtle` | 6% | **6.5%** | 0.039 | 0.062 † |
| **`--border`** | **11%** | **7.5%** | **0.072** | **0.071** |
| `--border-strong` | 18% | **13%** | 0.119 | 0.120 |

Do not round the dark alphas back up to match light's numbers. **They differ
precisely so the line does not.** A new rung is solved the same way, not
guessed — the maths is a ~20-line script, not a judgement call.

† **`subtle` is the one deliberate exception.** Parity put it at 4%, and at that
value the divider inside a control — the only thing this rung draws — could not
be seen in dark. It is the shortest line in the system and it has a **control
fill on both sides** rather than open sheet, so it loses more to its
surroundings than a parity calculation on the card can predict. Raised to 6.5%
against the real control and held there.

**The exception is the rule doing its job, not a failure of it.** Parity gives
you the answer for a line in open field; a rung that draws somewhere else gets
checked in the place it actually lands. §4 already says this for dots — alpha is
a function of the *shape and its setting*, not of the token's name.

Dots follow the same logic in the other direction: white marks on a near-black
field separate *less* at a 1.5px disc, so they run firmer at **20% / 30%**.

**Dark mode is fixed as we go.** The commitment is that values live in tokens so
the theme stays flexible, not that every dark value is final today.

### Washes and selection are ink tints, never picked greys

A selected sidebar row is **6% of the ink**. This is what makes "selected" mean
one thing product-wide and survive a theme flip. A hand-picked grey needs a
second hand-picked grey for dark, and the two drift.

### The interaction ladder — one ink, three rungs

Every interactive surface — a nav row, a ghost button, a segment — uses the same
three rungs. Hover, selected and pressed once all shared the 6% tint, which made
a hovered row indistinguishable from the selected one and made pressing show
nothing at all.

| Rung | Light | Dark | Token |
|---|---|---|---|
| **hover** | 4% | 5% | `--wash-hover` |
| **selected** | 6% | 7% | `--wash-selected` |
| **pressed** | 12% | 13% | `--wash-pressed` |

**Hover sits below selected on purpose** — selection has to stay the stronger
signal. Dark runs a point firmer at every rung, for the reason above.

**A selected face takes no hover, and no press.** It holds `--wash-selected` at
rest, under the pointer and under the finger — the three rungs are three
*states*, not three layers to stack. Hover is an offer: *this is reachable.* A
row that is already the answer has nothing to offer, and lifting it on approach
made the sidebar twitch as the cursor crossed it on the way to somewhere else.
The old fourth rung (`--wash-selected-hover`, 9%/10%) is deleted; nothing should
reintroduce it.

**A NAV face has only two rungs: reachable, and here.** No selected+hover, and
**no pressed**. A button's press is feedback for an act that happens in place; a
nav row's click *navigates*, so the press tint landed on the same frame the route
swapped and the row re-rendered as selected — two fills fighting over one frame,
which read as a flicker on every click. Ghost **buttons** keep `--wash-pressed`;
rows that take you somewhere do not. `washes()` in `lib/utils.ts` is the one
implementation.

**And the selected nav row is a CARD, not a tint.** Three things at once:

| Part | Value | Light | Dark |
|---|---|---|---|
| Ground | `--card` — the sheet | `#FFFFFF` | `oklch(22.2%)` |
| Edge | `--border-subtle`, as `outline: 1px solid` | 6% ink | 6.5% |
| Lift | `shadow-sm` — the lowest rung, "raised" | `0 1px 2px` @ 3.5% | @ 45% |

The sidebar sits on the **frame** (`--sidebar`, `#F5F4F1`), so the selected row
takes the **sheet**. A wash would be a mark *on* the frame; this is a different
surface sitting *on top of* it — which is what "you are here" means in a rail of
destinations. Ground, edge, lift: the three things that make a card a card (§3).

**The treatment is a function of the GROUND, not of the component.** The rail in
`previews/` is the same kind of face but sits on `bg-card` already, and white
does not lift off white — so it keeps the wash ladder. Before copying the card
treatment to a new rail, check what is underneath it.

**An outline, never a border.** A border is inside the box and joins the
measurement, so giving one to the selected row alone would shift its label a
pixel sideways on every navigation. An outline is drawn outside the box and
occupies nothing — measured, a selected row and its neighbours are the same
216 × 32 at the same `x`. It is also a different property from the shadow, so the
two coexist rather than one string carrying both.

It survives focus on its own: `.focus-ring-edge:focus-visible` sets
`outline: none` from outside any cascade layer, so it beats the layered utility
and the blue ring **replaces** the hairline instead of doubling it (§5).

**A sub row stays flat** — the same two rungs, but no outline and no lift. The
card treatment is what separates the parent rung from the one below it.

A button with its own face does not use the ladder: `primary` darkens its own ink
(`primary-hover` → `primary-press`), `secondary` lifts to `control-hover`. Only
faces that are *transparent at rest* borrow the wash.

**Do not express these as stacked Tailwind variants.** `hover:` and
`data-[active=true]:hover:` both match a selected row being hovered, and which
one wins is not reliably predictable. Branch on the state in the component and
emit one set of classes — `washes(isActive)` in `sidebar.tsx` is the pattern.

### A state colour is one hue on a three-rung ladder

**This replaced "one hue at three alphas" in August 2026.** The old rule took a
single value and thinned it for every job. It cannot work, and amber is the
proof: at the lightness a word needs to be readable, amber *is brown*. Red stays
red when you darken it and blue stays blue, so the failure hid in one tone out
of four — `--warn` read as ochre next to a clean red and a clean blue, and the
fix was never available, because at L\* 57 amber is already at the sRGB chroma
ceiling. There is no more amber to add. There is only a different lightness.

So a tone is **three rungs of one hue**, each picked for its own job and *then*
thinned:

| Rung | L\* | Alpha | Job |
|---|---|---|---|
| **fill** | 82 | 12% | The tint. Light and clean, no grey in it |
| **border** | 63 | 55% | An edge you can see without it fencing the message |
| **ink** | ~55 | opaque | The glyph and the action label |

Light needs all three. **Dark collapses to one**: over a near-black ground the
tint is already dark, so the ink itself at 12% lands there — all four dark tones
sit at L\* 77 and take the same alphas.

**Lightness is what makes it legible; chroma is what makes it the right hue.**
Pick L\* first, then take the most chroma that lightness can hold.

| | |
|---|---|
| Every ink rung clears **4.5:1** on its own fill | success 4.60 · warn 4.65 · danger 4.96 · info 4.71 |
| The old one-value tokens did not | warn **3.88**, info **4.08** — both shipped failing, and neither was visible as a bug because the tone "looked fine" as a fill |

**Using all three rungs at once is still the bug.** That is what makes a status
pill say one fact four times. The alert banner takes fill + ink and no border
(§7) — three rungs available is not three rungs used.

## 5. Elevation — four shadows, and content gets none of them

Content is **flat**. Shadow is what tells you something is floating *over* the
page, so anything that isn't floating must not have one — including the inset
white "raised" highlight, which is a bevel and reads as one.

There are **four** shadows. Tailwind offers eight names and the stylesheet used
to spell all eight out, with three holding one identical value and two more
holding another. A name that promises a choice it cannot deliver is worse than
no name: it reads as a decision someone made. The four are defined; `2xs`, `xs`,
`shadow` and `xl` alias them.

| Rung | For |
|---|---|
| `shadow-sm` | The one step between flat and an overlay |
| `shadow-md` | Small overlays |
| `shadow-lg` | Popovers, dropdowns, select panels |
| `shadow-2xl` | Modals and dialogs — the only thing allowed to float this far |

### The sheet floats; what sits on it does not

**"Content is flat" governs what is ON the sheet, not the sheet itself.** The
sheet is a card laid on the paper frame and it carries **`shadow-md`** — that
shadow is what separates the two planes (§3), and it is the reason the sheet's
own edge can drop to `border-subtle` rather than the full hairline (§12).

So the rule reads: **the content plane floats over the frame; nothing floats
over the content plane** unless it is an overlay. Rows, cards, chips and nav
items get nothing.

### The one raised piece of content: a selected segment

**Within that, there is exactly one exception, and it is a well, not a float.**
The selected segment of a segmented control carries `shadow-sm`.

It does not break the rule, because the rule is about *floating over the page*.
A selected segment is a **raised face inside a recessed track** — the same idea
as a key sitting proud of a keyboard — and its track's `overflow-hidden` clips
the shadow on three sides. What survives is a lift along the **divider** and
nowhere else.

| Measured off the board | |
|---|---|
| Divider, before | `#E2DFD8` — the hairline over the control fill |
| Divider, with the lift | **`#DEDAD3`** |
| The two pixels beyond it | one level darker, then nothing |

That is the entire effect. If it is doing more than this, it is wrong.

**Anything else that is content still gets no shadow.** This exception does not
generalise to rows, cards, chips or nav items.

Press is separate and **inset**: `--btn-press-soft` · `--btn-press-mid` ·
`--btn-press-strong`, chosen by how light the face is, never by how important
the button is (§9). Figma carries all of these as effect styles named to match.

### Focus is a shadow, and it is not elevation

**The focus ring is drawn as a `box-shadow`, never an `outline`.** It is the one
shadow on the list that does not mean "this is floating" — it means *the
keyboard is here* — so it is exempt from "content is flat" and it is not a fifth
elevation rung.

An outline paints one colour at one offset and cannot stack. `box-shadow` can —
which is what lets the ring **compose with the element's own elevation** (a
focused popover is `var(--focus-ring), var(--shadow-lg)`) and with its press
recess, and what lets it carry a gap when a gap is needed.

**The ring is a SOLID accent blue.** Not a tint. It is the one mark in the
product that has to be unmissable, and at full strength it can never be misread
as a border — which is the only thing the gap was ever protecting against.

### The ring is blue, and it also carries selection

It was solid **ink** until August 2026, and ink had two problems. A black ring on
a near-black button was invisible, so the gap had to do the entire job. And when
the create-stack tabs needed a *selection* mark, ink could not give one — the
page is already ink, so "selected" had nothing left to say it with.

One value now carries **selection and focus** product-wide:

| | |
|---|---|
| Code | `--ring` → `#3B6FE0` light · `#6E9BFF` dark |
| Figma | `accent/primary`, same hexes. **`line/ring` and `focus/ink` are aliases of it**, so there is one dial for every blue mark on the board |

**This is not a brand colour and not an action colour.** §7 still holds: black is
the only action colour, and orange is **visual expression, never interface**.
Blue is a **state** mark — *this one, and the keyboard is here* —
which is a different job from *press me*. A filled primary button stays ink.

**Consequence, still open:** the gap on dark faces was justified by ink being
invisible there. A blue ring is not. The gap may now be redundant on
`default` / `destructive` / `inverse` — worth testing before the next journey.

| Token | Value | |
|---|---|---|
| `--ring` | **`#3B6FE0`** · `#6E9BFF` in dark | Solid accent. The one mark that is not alpha |
| `--ring-width` | **2px** | |
| `--ring-offset` | **2px** | The gap |
| `--ring-offset-color` | `var(--card)` | The gap's fill. A **ground**, so solid |
| `--focus-ring-edge` | one stop, no gap | **The default.** `shadow-focus-edge` |
| `--focus-ring` | two stops, with the gap | `shadow-focus` |
| `--focus-ring-inset` | two stops, inward | `shadow-focus-inset` |

### Flush is the default; the gap is for dark faces only

| The element | Ring | |
|---|---|---|
| **Anything** — card, field, select, nav row, ghost or secondary button | **`shadow-focus-edge`** | The ring lands on the element's own edge |
| **A dark face** — `default`, `destructive`, `inverse` buttons | **`shadow-focus`** | Held from when the ring was ink and vanished here. The blue reads on its own, so the gap is now a refinement rather than the signal — see the open note above |
| **Flush to its container** — a full-bleed row, a segment in a track | **`shadow-focus-inset`** | An outside ring is clipped by the container and loses a side |

The gap used to be the default, and it was wrong twice over: it is painted in the
*surface* colour, so on a grey field it showed up as a **bright white band prying
the ring off the control**, and on a white card it did nothing at all.

| Rule | |
|---|---|
| **The gap follows the face, not taste** | Dark face → gap. Everything else → flush |
| **A flush ring replaces the hairline** | The ring lands directly outside the element's own 1px line and the two stack into a doubled edge. On focus the border goes **transparent** — it keeps its 1px so nothing shifts, it just stops being visible. An `aria-invalid` border is the exception: that line is reporting something |
| **Press must not eat the ring** | Press and focus are both `box-shadow`, so `active:` overwrites `focus-visible:` and a pressed button loses its ring mid-click. Every variant spells the combined state out — `focus-visible:not-disabled:active:` beats `active:` on specificity, never on declaration order |
| **The gap follows the surface, the geometry never moves** | On the paper frame, re-point `--ring-offset-color` (the rail carries `--sidebar-ring-offset-color`). Never change the width or the offset to compensate |
| **`focus-visible`, not `focus`** | A mouse click must not ring |
| **Never the brand colour** | `--ring` is the accent blue and nothing else may be. Orange is expression, never interface — and a focus ring is interface (§7) |

**In Figma** the three rings are effect styles — `focus/ring-edge` (one drop
shadow, spread 2), `focus/ring` (spread 2 in the surface colour, then spread 4 in
the ring ink) and `focus/ring-inset`. A drop shadow does **not render on a
`COMPONENT` or an `INSTANCE`** node, only on a plain `FRAME`, so each focus
variant carries a child frame matching the host exactly — same size, same fill,
same hairline — whose only job is to cast. Give the host `clipsContent = false`
or the ring is trimmed off.

## 6. Type — named by job, anchored on 13px

Use the token, never `text-[13px]` or `text-sm`.

| Token | Size / line | Job |
|---|---|---|
| `text-label` | 11 / 16 | Group labels, avatar initials |
| `text-meta` | 12 / 16 | Row data — branch, counts, status, timestamps |
| **`text-body`** | **13 / 20** | **The base.** Nav, buttons, breadcrumbs, prose, inputs |
| `text-name` | 14 / 20 | The thing you scan a list for — a row's own name |
| `text-title` | 16 / 24 | Section titles, and a card's own name |
| `text-head` | 20 / 28 | Dialog and empty-state headlines |

Every line-height is a multiple of 4.

### Two weights only: 400 and 500

**Settled August 2026. Semibold is off the scale.** It was three — 400 / 500 /
600 — and 600 was doing a job the scale already had two better tools for.

| | |
|---|---|
| **A third weight competes with the size ladder** | Six sizes and three weights is eighteen combinations, and nobody could say which of `name/600` and `title/500` outranked the other. Two weights makes weight a **binary** — *this line is the thing, that line is about it* — and leaves ranking to size and colour, which is what §6 already said to reach for first |
| **Geist's 600 is close to its 500** | The two are one step apart on a nine-step family. The distinction cost a whole axis of the scale to buy a difference people had to be told about |
| **500 already reads as emphasis** | Against the 400 it sits beside, at any size on the ladder |

**Where 600 sat, use 500.** Not 700 — the answer to losing a weight is not a
heavier one, it is letting size and colour carry the rank.

> **Not yet swept.** The rule lands ahead of the code. The drawer is
> conformant; roughly sixty call sites across dialogs, cards, table headers,
> pills and empty states still ship 600. Anything written or touched from here
> uses 500. See the open items at the foot of this file.

**20px is the ceiling for now** — not forever. If a screen genuinely demands
larger type we add a rung here deliberately, rather than reaching for an
arbitrary value at the call site.

### The page title is 14/20 at weight 500 — it is a label, not a headline

It has been 16/24 at 600 and then 20/28 at 500. Both made the sheet header the
loudest thing on screen, above content it only introduces. Settled at `name/500`
on the Shape + Hierarchy board (node `110:4030`).

| | |
|---|---|
| **The title is chrome** | It says which section you are in. The sidebar already said it, the trail already said it — it does not need to be announced a third time in 20px |
| **One rung above the trail** | 14 against the trail's 13, and weight 500 against 400. That gap is enough to read as "you are here" |
| **The content is louder than the frame** | A stack card's own name at 16/600 now clearly outranks the header. Correct: the cards are the page |

**Tracking is the token's, not the board's.** `--text-name` carries the scale's
own tracking; the board sits at 0. Held the token rather than fragment the scale
for a sub-pixel difference across one word.

Before adding a size, ask whether **weight**, **colour** or **position** can do
the job. They were already carrying most of the hierarchy.

### Typeface

**Geist** for the interface. **JetBrains Mono** for code, strings, IDs and
machine values. Both settled.

`font-mono` means **a machine produced this and a machine will read it back** —
IDs, keys, hashes, branch names, env-var names, code, JSON, log lines.

**Never for a human label.** A role called `Developer`, a status word like
`Ready`, a plan name — those are words, and mono makes them look like values the
user is not allowed to change.

### Copy

Interface words are design material and are ruled like any other material.

| Rule | |
|---|---|
| **Sentence case** | Titles, buttons, headers, labels. "New secret", not "New Secret". "Organization secrets", not "Organization Secrets" |
| **No uppercase** | Not for eyebrows, not for table headers, not for emphasis. Size and colour already separate a header from its data |
| **No em dashes** | Never `—` in user-facing copy. Use a colon when the second half explains the first, a full stop when it is a second thought, and a comma or brackets for an aside |
| **Name the thing the user recognises** | Not the thing the system is built from |

The em-dash ban is a **product-copy** rule: strings a user reads. It does not
apply to this document, to code comments, or to the redesign log, which are
written for whoever is reading the reasoning.

### Never "(optional)" — the red `*` already said it, by not being there

**Settled August 2026.** Seven fields across previews and secrets marked
optionality in words, next to hundreds that did not.

> A form states required with the red `*`. **Its absence is the statement that
> the field is optional** — and a second convention saying the same thing makes
> the reader stop to work out which one is authoritative, on every unmarked
> field on the page.

It is worse in a placeholder, which has a different job (below): `Enter secret
description (optional)` spent a line restating the label and then annotated it
with a fact the label had already made.

### A placeholder shows a SPECIMEN, never the label again

| ✗ | ✓ |
|---|---|
| `Enter secret name` | `stripe-api-key` |
| `Enter username` | `acme-ci` |
| `Enter token (min 8 characters)` | *(nothing)* — and the length becomes a **hint** |

| Rule | |
|---|---|
| **A specimen, or nothing** | The placeholder's only job is *what does a good answer look like*. Repeating the label is a line of type that adds no fact |
| **A constraint is a hint, not a placeholder** | "min 8 characters" is a rule about the answer, and it has to survive the first keystroke. A placeholder does not |
| **A secret has no specimen** | Password, token, private key — there is no example that is not either a lie or a hint at someone's real one. Those fields get **no placeholder** |

Before / after, from the empty state that prompted the rule:

| | |
|---|---|
| ✗ | Secrets hold the values your stacks need at runtime — keys, tokens, passwords. |
| ✓ | Secrets hold the values your stacks need at runtime: keys, tokens and passwords. |

## 7. Colour — three text tiers, one job each

| Token | Job |
|---|---|
| `text-foreground` `#191714` | What you came to find — names, **and every nav label** |
| `text-fg-2` `#5C574E` | Data you read — project, branch, counts, status |
| `text-fg-muted` `#6D675E` | Furniture and time — group labels, ages, separators, **and every placeholder** |
| `text-fg-ghost` | **Disabled only.** Never placeholder, never any live text |

| Rule | |
|---|---|
| **If a colour doesn't report something, it's a bug** | No decorative colour |
| **Black is the only action colour** | Both the reference study and our own audit found no brand colour anywhere in a product of this kind. A filled primary is ink |
| **Blue is a STATE, not an action** | `--ring` marks *selection and focus* — the live tab, the focused field (§5). It never says *press me*, so it never fills a button. One value, one job |
| **Orange is visual expression, never interface** | It carries the **brand**: illustrations, empty-state artwork, the Stackdome mark, and thresholds (sign-in, 404). **Never a control and never a UI element** — not an action, not a chip, not a status, not a label tint, not a border on a working surface. See below |
| Nav labels are **ink at rest** | The grey is carried by the **icon**, never the word |
| Status says it **once** | One *colour channel*, not four — never a coloured word plus a dot plus a fill plus a border. A **per-state glyph** is not a repeat; see below |
| **A number said in words gets no second picture** | `3 of 5 active` beside a 44×4 meter is the same rule one level up: the sentence is exact, the bar is approximate, and the bar adds nothing the sentence did not already say. **Settled August 2026 — the previews cap meter was drawn, judged live, and removed.** A bar earns its place only where the *shape* is the fact and no sentence is being offered — a sparkline, a distribution, a progress bar with no percentage beside it |
| All tiers pass AA at 12px | `fg-muted` was darkened twice for exactly this reason |
| **Solve a tier against its WORST ground, not its usual one** | The ground that decides is the lightest surface the ink ever lands on, which is the **hover wash** — light `--muted` `#F0EEE9`, dark `--control-hover` `#292826` — not the card and not the page. Both themes had failures hiding behind a card-only measurement: light `fg-muted` read 5.2:1 on white but 4.48:1 under a hovered row; dark read 4.62:1 on the card but 3.95:1 on a hovered control. Measure every surface, take the minimum |
| **Placeholder is live text and gets no discount** | WCAG exempts *disabled* controls, nothing else. Placeholder needs the full 4.5:1, which is why it sits on `fg-muted`. There is no fourth rung available: the lightest grey that clears 4.5:1 is within 9% of `fg-muted`'s luminance, so a dedicated "placeholder grey" would be `fg-muted` with extra steps. The empty/filled distinction is carried by **what the words say**, not by a paler ink |

### Where orange is allowed, and where it currently isn't

The old rule read *"orange is not in the product"*, with the canvas wire as its
one exception. That was never what we did, and the code says so: orange appears
in **23 files**. The rule was too absolute; the line is not *whether* orange
appears but *what job it is doing*.

| | |
|---|---|
| **Expression** — allowed | An illustration, empty-state artwork, the mark, a threshold screen. Orange here is the brand speaking, and nothing depends on reading it |
| **Interface** — not allowed | A button, chip, badge, status, spinner, pulse, label tint, border or fill on a working surface. If a user has to *read* it to know what to do, it is not orange |

**On redesigned surfaces this already holds** — the only orange is in
`empty-state`'s artwork and the `stackdome-mark` logo, both illustration.

**Two places do not hold yet**, and both sit outside this file's authority:

| | |
|---|---|
| The **stack editor** | Uses orange as chrome — the save bar's spinner and pulse, drawer icons, diff chips, timeline nodes. Pre-redesign; corrected when the editor converts (§15) |
| `--wire` | Holds `#FF6007` — the same value as `--brand`, under a second name. The canvas connection is arguably expression rather than interface, but the duplicate token is unresolved either way |

### The alert banner is a fill and nothing else

Settled August 2026 on the board, then measured in the browser.

| | |
|---|---|
| **No border** | The fill carries the tone alone. Fill *and* border was the same fact twice, and the edge fenced the message off from the page it belongs to |
| **`rounded-lg` — 12px** | Not the 8px control default. Radius is a function of height (§8) and a banner is panel-sized, not control-sized |
| **Padding 16, gaps 8** | Glyph → copy 8, message → action 8 |
| **The action sits BELOW the message** | Right-aligned it competed with the sentence for one line and had nowhere to go when the copy ran long. Under the text it reads as the consequence of what was just said, and the banner grows down instead of squeezing |
| Two rungs, not three | `-bg` for the fill, the opaque ink for glyph and action. The message itself stays `--foreground` |

**The action is the one place a tone colours a control**, and §7's "black is the
only action colour" still holds everywhere else. It earns the exception by being
a text link inside an already-tinted box — an ink link there reads as body copy,
and a filled button reads as the page's primary. Its focus outline matches the
tone for the same reason.

### A glyph earns its place by making a distinction the word cannot

"Says it once" was read for a while as "no icon on a status," and both stack
views shipped with icons switched off. That was the right call for the set they
had and the wrong rule to draw from it.

The set was **per family** — three glyphs for `ready` / `pending` / `error` — so
`Degraded`, `Unavailable` and `Failed` all drew one triangle. That is a mark
that adds a symbol without adding a fact, and the distinction it flattened is
exactly the one that changes what you do next.

| | |
|---|---|
| **A glyph per STATE** | Earns its place. `CircleCheck` · `TriangleAlert` · `CircleX` · `CircleOff` · `CircleDashed` · `Trash2` · a spinning `Loader2` for in-flight |
| **A glyph per FAMILY** | Does not. It repeats the colour and flattens the word |
| The glyph is **derived**, never passed | Same rule as the colour — an icon that disagrees with its word has to be unbuildable, not merely discouraged |
| One tone | The glyph inherits the word's colour. It is not a second channel |
| **Inline, never inline-flex** | An inline-flex box takes its baseline from its first flex item, so the glyph drags the word off a shared baseline (§8). Inline-block plus an optical nudge holds it |
| In-flight is the only thing that **moves** | And it is `motion-safe:`, so reduced motion still gets the mark — just still |

What "says it once" still forbids is unchanged: a coloured word **plus** a dot
**plus** a fill **plus** a border. One channel, however many marks it takes to
be specific.

### A chevron pair PICKS a value; a single chevron OPENS what is under it

**Settled August 2026.** Two controls that behave differently were wearing the
same mark.

| Glyph | Says | Where |
|---|---|---|
| **`chevrons-up-down`** | *This cycles between values* | Every select, every filter and sort trigger, every combobox, the account switcher |
| **`chevron-down`** | *This reveals what is underneath it* | A disclosure, an accordion, a section that unfolds in place, a scroll arrow |

A select does not open the thing below it — it swaps one value for another, and
the pair is the only mark that says so. A disclosure genuinely does open what is
under it, and the single chevron rotating is the right reading there.

**It lives in the primitive, never at the call site.** `SelectTrigger` draws its
own; `DropdownMenuChevron` is exported for the triggers built out of a `Button`.
Six list pages had hand-written `<ChevronDown className="h-3.5 w-3.5 flex-none
text-fg-2" />` beside their Status and Sort controls — six chances to drift, and
the reason changing one glyph was a nine-file edit instead of a two-file one.

## 8. Geometry

### Radius scales with the size of the element

| Token | Value | For |
|---|---|---|
| `rounded-sm` | 6px | Chips, badges, icon hit-areas |
| `rounded-md` | **8px** | **Default** — list rows, menu items, nav items, inputs |
| `rounded-lg` | 12px | Cards, panels, the content sheet |
| `rounded-xl` | 16px | Modals, dialogs, sheets |

**Radius is a function of HEIGHT.** Anything the same height takes the same
radius — a 32px button, a 32px input and a 32px select sit in a row together,
and if their corners disagree the row reads as three unrelated things.

| Control height | Radius | Token |
|---|---|---|
| **20px** | 6px | `rounded-sm` — **chips only**, see below |
| 28px | 6px | `rounded-sm` |
| **32px** | **8px** | **`rounded-md`** — the default step |
| 40px | 12px | `rounded-lg` |

**20px is a rung for chips, and only chips.** A chip is not interactive — the
row or the card around it is the target — so it is not bound by a hit-target
minimum, and 28px chips would eat a fifth of a card. Nothing you can click gets
this rung.

**Inputs match their buttons.** A field and the button beside it are the same
height, whatever rung they are on. (The reference runs inputs taller than
buttons; we deliberately do not.)

### Fields sit on a two-column grid and fill their cell

**A control in a form never sizes to its content.** A `Select` ships `w-fit`,
which is right in a toolbar — `Status: All` should hug its word — and wrong in a
form, where it puts the field's trailing edge wherever its longest option
happens to land.

Measured on the addon drawer before this rule existed:

| | |
|---|---|
| Seven controls | **Five different trailing edges** — 196, 205, 312, 495, 619 |
| Two of them | **9px apart.** Near-alignment reads as a mistake, not a choice |
| The same seven, on the grid | **Two edges** — the gutter and the far edge |

| Rule | |
|---|---|
| **Two columns, 16 apart** | The gutter is the ladder's default. At the drawer's 640 that makes a column 292 |
| **A field takes one column, or spans both** | Span the field that **identifies** the object, and anything whose hint would otherwise wrap to leave one word alone |
| **The grid enforces the fill, not the call site** | `FieldShell` makes any select inside it full-width. A rule every call site has to remember is a rule that decays |
| **Rows are their own grids** | So one section can pair two fields on a line without the next section inheriting the pairing |
| **A derived value sits on the grid too** | Read-only matter lines up with the fields and takes the control rung, so a row of "field, field, value" has one baseline |

**A hint belongs to its cell.** If it cannot fit the column, shorten the words
before widening the field — the copy is the cheaper thing to change, and a hint
that needs 599px is usually a hint saying too much.

`rounded-full` is **not a rung on this ladder.** It is the Button's `pill`
variant declaring itself — and §9 is guidance about *which button to reach for*,
not a rule about radius.

### Control heights — 28 / 32 / 40

| Height | For |
|---|---|
| 28px | Chips, in-row actions, anything inside a dense row |
| **32px** | **The default, and that includes form fields** — toolbars, dialog and drawer footers, sidebar rows, every input, select and switch row |
| 40px | **Rare.** A single major control that has to be the one thing on its surface |

**Height follows density, never importance.** An important button gets
**filled**, not taller.

**32 is the form-field rung.** This entry used to read "40px — form fields and
their primary button", and it was wrong for a year of shipping: the drawer, the
addon journey and the secret form all ship 32, and no 40 button exists anywhere
in the product for a 40 field to pair with. Settled August 2026 — **the rule was
out of date, not the exemplar.** 40 stays on the ladder for the rare case where
one control owns a surface; reach for it deliberately, never as "this is a
form".

**Chrome bands are not on this ladder** — they are shell geometry and §12 owns
their numbers. This section used to claim "topnav and sidebar header are 52px",
a figure that appears in neither the code nor the board. Removed rather than
guessed; see §12 and the open note there.

### Spacing — box numbers lie, so measure the ink

Settled August 2026 on the Dialog, after the first build measured wrong.

**The gap between two boxes is not the gap the eye reads.** A line of text sits
inside a line box with leading above and below it, so the ink — the cap line —
starts well inside the box. Two text nodes set 6px apart can read as 19px of
air, while two filled controls set 16px apart read as exactly 16.

**Set spacing by the INK gap, and let the box number fall out of it.**

| | |
|---|---|
| **Text ↔ text** | The box number must be **smaller** than you think. `head/600` alone carries **13px** between its own cap lines |
| **Text ↔ control** | Roughly **half** a line box of leading is added — about 5px per text edge |
| **Control ↔ control** | Two hard edges, so **ink = box**. This is the only honest number on the page |

**The failure this rule catches.** The first Dialog had header→content at box
16 and field→field at box 20. Measured, those read as **25 and 26** — the same
gap. The header did not separate from the body at all, and no number in the file
said so. The fix was not a smaller field gap; it was a bigger header gap, and it
was only findable by measuring.

Related: §2's "measure, don't eyeball", and §9's optical padding, which is the
same problem one scale down.

### The ladder — 16 is the default, then eights, then fours

| | |
|---|---|
| **`16` — 1rem** | **The default.** Reach for it first and only leave it for a reason |
| **Multiples of 8** | `8 · 16 · 24 · 32 · 40` — the working scale |
| **Multiples of 4** | `4 · 12 · 20 · 28` — **when required**, not as a first choice |
| **Anything else** | Only under the override below |

### The ladder measures PERCEIVED space, not the number you type

> *"We are designing for the human eye. Humans perceive space, they do not
> calculate."* — Jaseem, August 2026

**This is the rule the ladder sits underneath.** A box carries invisible air —
a line box carries leading, an icon box carries margin around its glyph — and
the eye reads the **ink**, never the box. So the ladder governs what is
perceived, and the number in the inspector is whatever produces it.

| The box says | It carries | The eye reads | So |
|---|---|---|---|
| gap `6`, icon → label | a 16px icon box holds **12px** of ink — 2px each side | **8** | `6` **is** the ×8 rung |
| gap `0`, title → description | `head/600` holds 13px between cap lines | **13** | `0` **is** the pair rung |
| gap `4`, label → control | text sits ~4px above its box floor | **~10** | `4` **is** the pair rung |
| gap `16`, control → control | two hard edges, no air | **16** | the only place box = eye |

**So `6` is not an exception.** It was flagged as off-ladder, measured, and found
to be the correct box number for an ×8 perceived gap. **Typing `8` there would
read as 10 and push the icon off its word.** Held for the same reason `14` is
held elsewhere.

**Optical alignment is the top rule and it beats the ladder.** The ladder exists
to stop numbers being invented; it does not exist to make things look wrong.
Where a laddered number lands optically, use it — that is most cases. Where it
does not, the ladder gives way, and **that call is Jaseem's, not the
implementer's.**

| Earned optical values | |
|---|---|
| **`6`** icon → label, in `Button` and `Select` | The icon's own 2px margin completes it to 8 |
| **`0`** title → description | The type already carries the air |
| **`2px`** nudge on a 16px glyph | So it centres on the **first line** of 20px copy, not the paragraph. `Inline alert`, `Confirm`'s checkbox and `Toast` all do it |

**Before calling a number wrong, measure what it renders as.** Two of the three
above were flagged as ladder violations and were not.

### The body / footer rhythm

**A surface with a commit row is TWO levels, not three bands.** Header and
Content are wrapped into one **body**; the Footer is a peer of that whole body.
This was written up as "three bands at one number" and that was wrong — settled
on the board, August 2026.

| Gap | Separates | Rung |
|---|---|---|
| **Edge padding** | | **24** |
| **body ↔ Footer** | the work from the commit | **32** |
| **Header ↔ Content** | inside the body | **20** |
| **Title ↔ Description** | a bound pair of text | **0** |
| **Content ↔ a filled block** (the error slot) | | **32** |
| **item ↔ item** — field to field | | **16** |
| **label ↔ its control** | a bound pair | **4** |
| **buttons in a Footer**, a checkbox and its sentence | | **8** |

**Why the footer break is the biggest thing in the object.** It is the only
boundary that separates *doing* from *committing*. Header → content is a change
of role inside one task; body → footer is the end of the task. `20` against `32`
says exactly that, and it is the one place `better-layout`'s 2× guidance and the
eye agree.

**A filled block takes the footer's rung, not the list's.** The error slot sits
`32` from the fields, double the `16` between the fields themselves, because it
is a *filled* box with real mass. This is §8's perceived-space rule running the
other way: a heavy neighbour reads **closer**, so to read as separated it has to
be measurably further. The same logic that lets an eyebrow bind downward at 16/16
forces a banner apart at 32.

**One number per relationship, across every overlay.** `Confirm` briefly ran its
header → content at `24` on the argument that its header is a taller block. That
was corrected: it is `20`, the same as `Dialog`. A relationship gets one value,
and "the block is bigger" is not a reason to invent a second.

**Why the pair is `4` and not `8`.** Grouping is a ratio, not a distance. Against
a 22 list gap, a pair at 8 reads 14 — a ratio of 1.6, which is not enough to bind.
At 4 it reads 10, a ratio of 2.2, and the pair holds. `8` was on the ladder and
still wrong; measuring is what settled it.

**Zero is a real value.** Do not "correct" the title/description `0` back to 4 or
8 without measuring — that is how the pair got broken the first time.

**A cluster of content should feel grouped and somewhat tight, not spread apart.**
White space matters and is not the same thing as pushing related content away from
itself. That is why the *inside* of the body stays at 16 and 20 while only the
footer break opens to 32.

## 9. Buttons

| | |
|---|---|
| Variants | `default · destructive · outline · secondary · ghost · link · inverse` |
| Shape | `flat` (**the default**) · `pill` |
| Filled is **rare** | **One filled button per page** — see below. Everything else is a hairline or a ghost |
| At rest | **Flat.** No highlight, no bevel, no drop shadow |

### One filled button per page

**A page has one primary action, so it has one filled button.** Not one per
region, not one per row-band — one per page. A second fill does not add
emphasis, it removes it: two things competing to be the obvious next click means
neither is.

| | |
|---|---|
| **The rule** | One filled button on the page. Everything else is `outline`, `secondary` or `ghost` |
| **No exceptions** | Not a toolbar — filters, sorts and searches are working controls and take no fill at all (§11). **Not an empty state** — see below |

### An empty state's action is never the filled one

**An empty state offers the action; it does not claim it.** It renders
`outline`, always — whether it repeats the page's primary or offers something
else entirely.

| The case | Why `outline` |
|---|---|
| It **repeats** the page's primary — `New stack` in an empty Stacks list | The header already has that button, filled. Two identical fills on one screen is the duplication §7 bans, in button form |
| It offers **something else** — `Connect a provider` inside create-stack | It is not the page's primary. `Create stack` is. A detour must not outrank the thing you came to do |

**And it is `flat`, never a pill.** The pill list used to include "the action in
an empty state", and that was wrong on its own terms: a pill means *this
commits*, and an empty state's action almost never does — it starts work rather
than finishing it. `Connect a provider` leaves for another page and comes back.

An empty state is loud enough already. It owns the middle of an otherwise blank
sheet, it has an illustration, a headline and a paragraph — the button does not
also need the strongest material in the system to be found.

### The board's "secondary" is code's `outline` — read this before reaching for a variant

**`secondary` and `outline` are the same fill. Only `outline` has the hairline.**
`secondary` drops it deliberately, because side by side in a story the two read
as one variant drawn twice.

| Board tone | Code variant | Renders |
|---|---|---|
| primary | `default` | Ink fill, inverse label |
| **secondary** | **`outline`** | **`control` fill + `border` hairline** |
| — | `secondary` | `control` fill, **no** hairline |
| ghost | `ghost` | Transparent until hover |

**The name in Figma does not map to the name in code**, and picking `secondary`
off the board's label gives you an edgeless blob on the sheet — `control` is
only 2% off white, so without the hairline there is no button there at all.
When a Figma button shows a fill *and* a border, it is `outline`.

### Shape says what kind of action this is

This is **guidance on which button to reach for**, not a geometry rule.

| Shape | Means | Where |
|---|---|---|
| **`flat`** | *This is a working control* | Toolbars, dialog footers, row actions, filters, `Save`, `Cancel` — the bulk of every screen |
| **`pill`** | *This commits. It finishes a flow or ships something* | Auth `Continue`, `Deploy`, `Publish`, a wizard's final step |

**At most one pill per screen.** None is often correct — most screens are work,
not commitment. `flat` defers to the height ladder in §8; `pill` is the one
variant that overrides it.

**Enforcement.** The component default is `flat`, so new work is right without
thinking about it. Existing screens are corrected **as we work each journey** —
deliberate pills are restored screen by screen, never retrofitted in a sweep.

### Disabled

**Dimmed, plus the not-allowed cursor.** This is the rule for **every disabled
control in the product**, not just buttons. The dim and the cursor together are
the whole signal.

The control must still receive the pointer for the cursor to show, so
`pointer-events-none` is wrong — the native `disabled` attribute already blocks
the click.

`loading` is **not** `disabled`: contrast stays at 100%, the content swaps for a
spinner, and `loadingText` says **what is happening** — `"Deploying…"` — not that
something is.

#### Nothing is disabled without saying why

**A disabled control that does not explain itself is a dead end.** The user can
see that something is unavailable and has no way to learn what would make it
available. This binds **every interactive element** — button, input, textarea,
select, checkbox, radio, switch, menu item, row action, tab, link — not just
primaries, and not just forms.

| Rule | |
|---|---|
| **Say why, always** | If it is disabled, the reason is reachable. No exceptions for "obvious" cases — obvious to the person who built it is not obvious to the person using it |
| **List everything outstanding at once** | Never one blocker at a time. Reporting a four-field form one field per hover turns it into four rounds of guessing |
| **Use the verb of the act** | You **enter** and **paste** in a form, you **pick**, **choose** and **add** in a selection, you **connect** an integration. `reasonList()` decides sentence-vs-bullets and supplies no words of its own — every phrase comes from the call site |
| **Reachable by keyboard, not hover alone** | Disabled controls swallow pointer events, so the reason anchors to a focusable wrapper. A reason only a mouse can find does not exist for a keyboard user |
| **The one exemption is in-flight** | While the action is running, the spinner and its `loadingText` **are** the explanation. Suppress the reason then — "enter a name" is not what a spinner is telling you |

**Three shapes, by what is disabled.** They are not interchangeable; picking the
wrong one is how the rule gets followed in the letter and broken in practice.

| What is disabled | Shape | Why not the others |
|---|---|---|
| **One control** | `BlockedAction` — wraps it, disables it, shows the reason on hover **and** focus | The default. Covers a blocked primary and a field you cannot fill yet alike |
| **An item inside a menu or listbox** | The reason goes **inline in the item**, as its second line | A tooltip inside a menu fights the menu's own focus and dismissal, and a wrapper element breaks Radix's typeahead and arrow-key navigation. The item has room; use it |
| **A whole region** | **One** explanation at the top of the region — a banner or a header line — and no per-control reasons inside it | Twelve tooltips all saying "this stack is read-only" is twelve chances to learn the same fact and one certainty that the user reads none of them. `fieldset disabled` is the tell: if it's a fieldset, it's a region |

**Empty is not disabled.** A select with no options, a picker with nothing to
pick — these are *empty*, and the honest move is to say what is missing and how
to get it ("No object stores yet — add one first"), not to grey out a control and
leave the user to infer it. Reach for the empty state, not the disabled state.

**And a field that can never be filled is not a field.** A disabled input dims
to almost exactly the tone its own placeholder uses, so a *filled* one reads as
empty — the addon drawer showed `orders-db` on edit and the field looked
untouched, in the third place on screen already saying that name. If it cannot
be changed, it is a **value**, not a control. Render it as one, or drop it where
something else already carries it.

**A value you copy is a grey WELL, not bare text.** Settled August 2026 on the
previews drawers. §3 already gives grey wells two jobs — *input* and
**reference** — and a read-only machine string is the second one: a repository
URL, a preview URL, a commit, a generated key. Bare text on the sheet reads as
prose you scrolled past; the well says *this is a value, and you can take it*.

| | |
|---|---|
| **Fill `--control`, radius `md`, height 32** | The control rung (§8), so it lines up with the fields above and below it on the same grid |
| **The string stays `mono` and `fg-2`** | It is still a machine value (§6). The well is what changed, not the ink |
| **An action rides inside the well, not beside it** | `Copy`, `Open ↗`. The well grows to 40 to hold a 32 control, and the pair reads as one object rather than a value with buttons parked after it |
| **A value with no action is still a well** | Reference is a job on its own. Do not withhold the well because there is nothing to click |

**A value is not the same as a disabled field**, and this is the difference you
can see: a disabled field is a control that has been switched off, a well is not
a control at all.

### Dimming is a tier drop, not an alpha drop, wherever the words still matter

**`opacity-50` on a control is the rule (§9 above). `opacity-50` on text you
still want read is a bug.** The two look alike and are not.

Measured on the addon catalogue's nine unavailable services, against white:

| | `opacity-50` | On the ink ladder |
|---|---|---|
| The name | **3.40:1** | `fg-2` — **7.17:1** |
| The second line | **2.29:1** | `fg-muted` — **5.60:1** |

Both alpha figures fail AA, and §7 gives no tier a discount. WCAG exempts a
disabled *control*; it does not exempt a row that is on screen precisely so
somebody can read it and learn where they stand.

| Rule | |
|---|---|
| **Drop the tier, not the alpha** | Ink → `fg-2`, `fg-2` → `fg-muted`. Every rung is already solved against its worst ground (§7), so the result passes in both themes without a second calculation |
| **The gap still reads as "off"** | 17.89 against 7.17 is a wider separation than the alpha version ever gave, and it survives the theme flip — dark's near-white ink at 50% is *lighter* than light's, so the alpha bug was invisible in the theme people check second |
| **The glyph may go to alpha** | An icon reports nothing a reader has to decode. It is the one part of a blocked row that can |

### Press

Depth exists **only while you are touching it**, and what ships today is final:
the face recesses, label and icon travel **1px down**, the fill darkens. One
geometry for every variant — 1px side walls, 2px top shadow, 2px blur — with
intensity set by how light the face is, never by importance (§5).

### Optical padding

The eye aligns on **centre of mass**, not bounding boxes. A 14px glyph carries
~2.9px of invisible safe area each side; a letterform meets the edge with almost
none.

```
icon side = base − 3      label side = base + 2
```

| Size | Base | Icon side | Label side |
|---|---|---|---|
| sm | 10 | 7 | 12 |
| default | 12 | 9 | 14 |
| lg | 15 | 12 | 17 |

Symmetric where there is nothing to correct against: text-only, icon-only, and
icons on both sides.

**The correction rides on a wrapper span, and `asChild` used to skip it.** Every
selector reaches through `> span >` — text nodes cannot be targeted by
`:first-child` and cannot be translated on press, so `Button` wraps its children
to give the rule something to hold. An `asChild` button handed its children
straight to the `<a>`, so a link-shaped button silently lost both: `Website`
with a trailing glyph measured **12/12 instead of 14/9**, and its label could not
travel on press. Fixed August 2026 by cloning the child and wrapping *its*
children — `Slot` merges props onto the child, so the wrapper cannot be added
from outside it. The bug was invisible until a button had an icon on **one side
only**, which is the only case the rule exists for.

### A trailing icon modifies the destination; a leading icon names the act

| Side | Says | Example |
|---|---|---|
| **Leading** | *what this is* | `+ New stack`, `⭱ Upload` |
| **Trailing** | *where this goes* | `Website ↗`, `Docs ↗` — the external-link mark |

**A control that opens a new tab has to say so.** `Website` and `Docs` in the
ready-made-app rail are the only two things in that journey that leave the
product; without the mark they read as steps in the flow, which is the one thing
they are not.

**In Figma** the Button set carries `Leading icon` and `Trailing icon` as
independent booleans, both off by default. **The optical padding is not
expressible there** — a boolean cannot drive padding — so the Figma variants
draw the symmetric 12 and the code corrects it. Noted in the component's own
description so it is not read as a discrepancy.

## 10. Destructive actions escalate with the blast radius

One `destructive` variant applied to everything trains people to click through
it. **The friction has to be proportional to the damage, or it stops being read.**

| Level | Gate | Use for |
|---|---|---|
| **1 — Confirm** | Red button in a dialog, live immediately | Reversible or cheap: leave without saving, remove a row you can re-add |
| **2 — Acknowledge** | A **checkbox** must be ticked before the red button goes live | Destroys something rebuildable: an addon, a preview env, a secret |
| **3 — Retype** | The user must **type the resource name** | Destroys something with dependents or data: a stack, a cluster, a project |

| Rule | |
|---|---|
| Position | Red button **last**, after `Cancel` |
| Treatment | Red **fill**. Not a red outline, not red text |
| Before the gate is met | Rendered **disabled, not hidden** — the cost must be visible before it is payable |
| Shape | `flat`. Destroying is work, not a commitment |
| Never in the sheet header | The bar is on screen the entire time you scroll |

Say what will break, in plain words — *"All requests using this key will start
failing"* — not *"This action cannot be undone."*

### A banner never instructs a delete

**Found on the object store form, August 2026.** Opening a store the screen
could not read replaced the entire form with:

> ✗ *"Editing Azure and GCS stores isn't supported yet. **Delete this store and
> create it again.**"*

Three things wrong, and the last is this section's:

| | |
|---|---|
| **It named a cause that was not the cause** | The form reads Azure and GCS perfectly well. The branch fires when a store carries **none** of the three credential blocks — a sentence it never said |
| **It blanked a form that was mostly readable** | Name, destination path and retention all loaded fine. §9's *empty ≠ disabled* one level up: a region that refuses is not a reason to withhold the rest |
| **A destructive act does not arrive as prose** | Deleting a backup destination is the escalation ladder's business — a confirmation, a named blast radius, a gate. Written into a banner it is an instruction with **no** friction at all, issued to someone who only came to change a path |

**Say what is true and stop.** *"This object store's credentials were saved in a
form this screen cannot read, so saving would replace them. Its backups are
unaffected."* If deleting really is the way out, it is an action with a
`Confirm` behind it, not a sentence.

## 11. Lists — space, not lines, and no card per row

No box, no shadow, no card per item. **The list is not boxed either** — a border
around the whole table is the same mistake at a larger scale.

This bans a card **per row in a list**. It does not ban the card *view*, which is
a deliberate second view of the same data — see "Cards are a second view" below.
The heading used to read "never cards" and was read as forbidding both.

### The row is ONE component, and it is not `Table`

Every list page renders `components/branded/data-list.tsx` — `DataListRow`,
`DataListHeader`, `DataListName`, `DataListCell`, `DataListActions`,
`DataListSkeleton`. **Eight pages, one implementation.** Stacks, Addons, Object
stores, Secrets, Image registries, Git integrations, Clusters and Domains all
measure identically in the browser because they are literally the same code, not
the same intention.

`Table` stays for **dense tabular data** — `backups-list.tsx`, the users list —
where rows are ~40px, a rule between them earns its place, and `text-body` is the
size. A list PAGE is a different object, and building one on `Table` means
overriding seven defaults at the call site, which is a fork wearing a primitive's
name.

The measurements, taken off the shipped Stacks page:

| | |
|---|---|
| Row | **64px**, `px-2`, no rule, hover wash, inset focus ring |
| Column gap | **20px** |
| Header | `text-label` 11/16 `fg-muted`, 8 above / 8 sides / 8 below, one 1px rule, **0 gap to the first row** |
| Name | `text-name` **14/20 weight 500** |
| Second line | `text-meta` 12/16 `fg-muted`, `font-mono` when it is a machine string |
| Every other cell | `text-meta` 12/16 `fg-muted` |
| Tracks | The name is capped (`minmax(240px,420px)`), **one** column takes the slack, the rest are pinned |

**A page capped at one entry gets the row and NO column header.** Clusters and
Domains support exactly one today; a header row over a single row labels nothing
and asserts a comparison the page cannot make. They join the rest the day the cap
lifts.

**Status in a row is `StatusText`, never `StatusPill`.** The coloured word plus
the glyph for its state, both derived from domain + state so they cannot
disagree. The bordered chip is for where the word is fixed by the caller.

### There is no rule between rows

**A separator has to earn its place by GROUPING**, and in a 64px row it groups
nothing. Measured on the stacks list:

| Gap | |
|---|---|
| **Inside** a row — name → branch line | **0px** |
| **Between** rows | **28px** |

Space was already doing all of the work. The rule was decorating a boundary that
was never ambiguous, and eight of them stacked down the page read as a grid the
data does not have.

| What stays | |
|---|---|
| **The rule under the column header** | Not a separator — it is the chrome/content boundary. Labels above, data below |
| **The hover wash** | Row extent on approach was always its job, and it reads better with nothing competing |
| **The sheet edge** | The list's only outer boundary |

**Bring the rule back if a compact row mode lands.** At ~8px between rows instead
of 28 the grouping argument reverses, and then the line is doing real work. The
condition is the density, not the taste.

### Row actions — on the row up to two, behind a kebab past that

Row actions appear on **hover**; a control on every row at rest is chrome
competing with content. **What appears is decided by the count**, and it was not
decided at all until August 2026 — six pages with actions had split three
against three, with the two shapes landing on identical rows.

| | |
|---|---|
| Object stores | `Edit` `Delete` — **inline** |
| Secrets | `Edit` `Delete` — **a kebab**, for the same two actions |

| Actions | Shape | |
|---|---|---|
| **1 or 2** | **On the row**, as `ghost` `icon-sm` buttons | A menu that only ever opens two items spends a click and a whole surface to hide what already fits. At one action it is worse: a kebab that opens a menu of one |
| **3 or more** | **A kebab** | Three glyphs in a row is a row of guesses, and the actions that come in threes are the ones needing words — `Verify repository access` is not an icon |

| Rule | |
|---|---|
| **Count the actions, not the page** | The threshold is a property of the row. A page that grows a third action moves to the kebab, and one that loses down to two moves back |
| **`DataListActions` does the reveal** | Never hand-rolled. The primitive answers `focus-within` on the **row**; a hand-rolled copy on the Stacks list answered `focus-visible` on the button, so a keyboard user reached it one tab later than everywhere else |
| **The track is sized for the pair** | 32px for one action, **64px for two**. A pair in a 32px track overflows the row's last column |
| **Inline is still `ghost`** | Not `destructive`. A red trash on every hovered row makes deletion the loudest thing on the page; the escalation belongs to the confirm that follows (§10) |
| **A disabled row action still says why** | §9 binds here too. Stacks' `Delete` was a disabled menu item with **no reason at all** while a stack was deleting — the one moment the user most needs to be told the thing is already on its way out |

### Columns are labelled

| Rule | |
|---|---|
| Every column gets a header | An unlabelled column makes the reader infer what `2 services · 1 vol` is |
| Headers are **sentence case**, `text-label` (11/16, weight 400), `fg-muted` | Size and colour already separate the header from the data |
| One 1px rule under the header | Nothing else |

**The header sits in a uniform 8px inset — 8 above, 8 each side, 8 below.**

| | |
|---|---|
| Above | **8px**, not the sheet's 16px content inset. A column header is **chrome**; it sits tighter to the band than content does |
| Sides | **8px**, the same inset the rows carry, so label and data share one left edge |
| Below | **8px**, then the rule, then the first row with **no gap** |
| Between columns | **20px** |

It ran 16 above and 6 below — the one piece of chrome on the page was the only
thing not square with itself. Settled on the board (node `121:885`).

### A time column is an AGE, and there is one of them

**Settled August 2026.** Eight list pages carried three spellings of the same
column, and one of them was not a duration at all:

| Page | Shipped | |
|---|---|---|
| **Stacks** — `Last change` | `3d ago` | `relativeAge`, in a shared primitive |
| Addons — `Created` | `19 days ago` | Its own `formatDistanceToNow` call |
| Secrets — `Created` | **`8/1/2026`** | `toLocaleDateString` |

> **A column you scan cannot be a value you have to subtract from today.**
> `8/1/2026` is a fact about the calendar; `26d ago` is the fact the column was
> added to report.

| Rule | |
|---|---|
| **`relativeAge`, always** | The compact form — `just now`, `5m ago`, `3d ago`. It is in `entity-card.tsx` and it already handles clock skew, which a hand-rolled call does not |
| **The exact timestamp is the cell's `title`** | `absoluteAge`. For the one case where the date itself is the question, without spending the column on it |
| **Never a second copy** | A page reaching for `date-fns` directly is how the third spelling appeared |

### No uppercase

**Do not set type in all caps** — not for column headers, not for section
labels, not for eyebrows. Caps strip the word-shape the eye reads by and measure
wider for the same information.

**The only exceptions** are acronyms genuinely uppercase in the world — `API`,
`URL`, `CPU`, `TLS`, `JSON`, `ID` — and machine values that are literally
uppercase, like an env-var name. Never `text-transform`; if it is uppercase, it
is uppercase because the word is.

### Status is said once, and this is where it gets broken

A coloured dot at the left of the row **and** the status word in a column is
saying it twice. **Pick the column.** The dot survives only where there is no
room for a word.

### Cards are a second view, never a replacement

| View | Answers | Use when |
|---|---|---|
| **List** (default) | *Which one, and how do they compare?* | Scanning many, sorting, finding the odd one out |
| **Cards** | *What is going on with each one?* | Fewer items, more per item |

**Both views show the same rows, the same filters and the same sort.** The
toggle lives in the content toolbar, right side, last: a segmented control,
icon-only, two options. Persistence is per page, per user.

| Property | Value |
|---|---|
| Fill | **White** — same as the sheet |
| Border | 1px hairline |
| Radius | `rounded-lg` 12px |
| Shadow | **None.** Content is flat |
| Hover | The hairline strengthens. No lift, no scale |

### How the segmented control is built

Both the track and the selected segment carry a hairline, and **the track has no
padding.** That is the whole mechanic.

A bordered segment *inset* inside a bordered track puts two edges 2px apart, and
at that distance the eye reads a doubled line rather than a raised surface. The
fix is not to drop the segment's border — it is to drop the track's **padding**.
The segment runs flush, its outer edges land on the same pixel as the track's,
and the only line you see between them is the divider. `overflow-hidden` trims
the segment's square corners to the track's radius, so a selected segment's
corners *are* the track's corners.

The divider belongs to the **selected** segment, drawn as its own left/right
edge. A separate rule would eventually sit next to that edge and double it.

| Property | Value |
|---|---|
| Track | `--control` + hairline, radius by height (§8), **no padding** |
| Segment | The sheet's own white when selected |
| **Selected segment — lift** | **`shadow-sm`.** The one raised piece of content in the product — see §5. Clipped by the track on three sides, so it reads along the divider only |
| **Selected segment — radius** | **The track's rung, on the outer corners it owns.** The clip would round them anyway; the segment carries its own so the *shadow* follows the curve instead of cutting a square corner |
| Selection | **Ink vs `fg-muted`**, never opacity — a dimmed icon reads as disabled |

The track is **not** a grey well. With a hairline around it the control already
reads as a control, and a darker fill under the white segment makes the
unselected side look switched off.

### Toolbars — many ghosts, exactly one fill

| Rule | |
|---|---|
| Secondary actions | `ghost` — icon + label, **no border, no fill** |
| Primary | The page's **one** filled button, last — and only if the page's primary lives here (§9) |
| Filters, sorts, searches | `flat`. Working controls — never a pill, never `outline` |
| Disabled secondary | Label and icon grey together. **No box appears** |

Eight actions with eight boxes is a wall with no primary.

## 12. The shell — frame, sidebar and sheet

**Source of truth: the `app shell` board in Figma.** Every number below is taken
from it. If code and the board disagree, the board wins and the code is fixed.

| Property | Value |
|---|---|
| Sidebar — expanded | **240px** |
| Sidebar — collapsed | **56px** |
| Gap, rail → sheet | **2px** |
| Sheet inset | **12px** on the other three edges |
| **Brand band** — the sidebar's lockup block | **Unresolved — board says 64px, code ships 76px.** See below |
| **Sheet content inset** | **16px** — the same edge the header uses |
| **Brand lockup ↔ page title** | **Same centreline.** See below |
| Sheet radius | **12px** (`rounded-lg`) |
| Sheet fill | `surface/sheet` — white |
| Sheet edge | 1px `border-subtle`, **as an `outline`** — see below |
| Sheet elevation | **`shadow-md`** = the board's `elevation/md` |
| Frame fill | `surface/frame` |
| Divider between sidebar and sheet | **None.** The sheet is a card and carries its own edge |

### Open — the brand band is three different numbers

Three sources, three answers, and none of them agree:

| Source | Says |
|---|---|
| §8 (now removed) | 52px |
| §12, the board | 64px, "lockup 32px **centred**" |
| **The code** | **`h-[76px]`**, `pt-[28px] pb-4` — not centred |

**The code's version is the one that satisfies the centreline arithmetic below**
— `28 + 16 = 44` only works because the padding is asymmetric, and a *centred*
lockup in a 64px band lands at 32, not 44. So either the board is stale or the
arithmetic is, and the two cannot both be right.

Resolve against the board before the next shell change. Until then the code is
what ships, and the centreline is the thing that must not break.

### The sheet's edge is an outline, never a border

A `border` participates in layout. The sheet is specified at an exact size and
its header row has to share a centreline with the sidebar's lockup — a 1px
border pushes that row down by 1px and breaks both.

**Use `outline`** (Figma: *stroke align — outside*), or a `box-shadow` ring. It
paints outside the box, follows the radius, and costs the layout nothing.

Two consequences worth knowing:

- **The 2px gap to the rail is load-bearing, not decorative.** An outline paints
  *outside* the box, so with the two columns flush its left edge lands under the
  `fixed` sidebar and is clipped away — the card loses one of its four sides.
- **The edge is `border-subtle` (6%), not the 11% hairline.** Once the sheet
  carries a shadow, the shadow does the separating and the line only has to
  describe the shape.

### Collapsing the rail is choreographed, not switched

The rail animates its width over 200ms. Anything inside it that arrives or
leaves travels with that width — `display` cannot be transitioned, so anything
that has to vacate space animates `max-width` or `max-height` to zero and is
clipped by its own overflow. The utilities are `rail-x` / `rail-x-in` /
`rail-y` / `rail-y-in` in `index.css`.

**The two directions are deliberately not symmetric:**

| | |
|---|---|
| **Leaving** | Immediate, ~100ms. The column is already closing on the label; holding it there just means watching it get guillotined |
| **Arriving** | ~90–110ms delay, then ~140ms. Text faded in early lands in a column too narrow to hold it and reflows while you are reading it |

Two traps, both of which put the collapsed glyphs off the 28px centre column:
**a flex `gap` still reserves space around zero-width children**, and **`ml-auto`
absorbs the free space** the centring needed.

### The two planes line up across the seam

The brand lockup and the page title **share a centreline**. That is the entire
reason the sidebar head and the sheet header are related at all — get it wrong
and the two columns read as two unrelated screens.

Both columns carry the shell's 8px gutter and then **16px** of their own
padding, so both 32px rows centre on **40**. The sidebar is `fixed` and ignores the
wrapper's padding, so it pays its gutter internally instead.

```
title  row centre = 8 gutter + 16 padding + 16 = 40
lockup row centre = 24 lead-in            + 16 = 40
```

**The frame's gutter is 8, not 12.** The grey is a MOUNT, not a margin: at 12 it
read as a band of its own around the sheet, at 8 it reads as the edge the sheet
is seated in — and the content plane gets the 8px back on both axes.

**The seam carries no border.** That is not only §3 — it is also what makes this
arithmetic work. A 1px border on the sheet pushed its row down by exactly the
1px the two columns were out by.

Verified in the browser, not eyeballed. If the gutter or the header padding
changes, this number changes with it.

### The sidebar

| Group | Holds |
|---|---|
| *(no label)* | **Stacks · Previews** — these are the product; a label above the first item is furniture |
| **Platform** | **Addons · Secrets · Object Stores** — what you attach to a stack |
| **Infrastructure** | **Clusters · Domains · Git Integrations · Image Registries** — what an admin configures once. This is already the admin-gated set |

Grouped by **who touches it** (§1), not by what kind of object it is. Footer holds
**Appearance** and the account block (name over organisation, with a switcher) —
global helpers live in the frame, never on the sheet.

Nav labels are **ink at rest**; the grey is carried by the icon (§7). Selected is
`surface/selected` — a 6% ink tint (§4), never a picked grey.

**Collapsing the rail changes WIDTH and nothing else.** Every row, every group
block, the footer sit on identical y in both states — 240 → 56 is a horizontal
move, and the collapsed rail is the expanded one with the words taken out. The
group label keeps its 24px box and a 16px rule crossfades onto the label's own
centreline; the account block keeps its 40px height and its avatar never moves.

That is a motion rule as much as a layout one. A label that vacates by
collapsing its own height drags every group below it upward mid-animation, and
two axes moving at once is what reads as a jump rather than a collapse.

## 12a. The sheet header — two parts

**The top of the sheet is the header.** Not a bar sitting on it: no divider,
content passes under it and dissolves into it. There is exactly **one** per
screen, and it has **two parts**:

| Part | Job | Holds |
|---|---|---|
| **1 — the title row** | *Identifies the section* | The collapse toggle, the page title, the page's actions |
| **2 — the toolbar row** | *The tools for that section* | Search, filters, sort, view toggle — whatever the section needs |

**The band used to carry no divider at all**, on the reasoning that the sheet's
own edge is the boundary (§3). That was reversed on the board: at 108px the band
is tall enough that content sliding under it needed a stated edge. The fade went
with it — the two mechanisms answer the same question and cancel each other.

**Part 2 is conditional.** A page with nothing to filter renders the title row
alone. Both are the same component; the second row appears when the page gives it
something.

| Property | Single row | Double row |
|---|---|---|
| Band height | **64px** | **108px** |
| Row height | 32px | 32px each |
| Padding | 16px top and bottom | 16px top, **12px between rows**, 16px bottom |
| Horizontal inset | **16px** both ends | **16px** both ends |

**The outer padding is 16 and the row gap is 12, on purpose.** They are
different measurements doing different jobs: 16 is the sheet's own margin, 12 is
the distance between two rows of controls. Making them equal is what made the
band read as cluttered.

| Property | Value |
|---|---|
| Background | **Opaque** `surface/sheet` — content scrolls **under** the bar |
| Divider | **1px `--border` hairline along the bottom**, full sheet width — not inset to the padding |
| Fade under the bar | **None.** A dissolve under a crisp line is two answers to the same question. Content is **cut** by the hairline as it scrolls under |
| Position | `sticky top-0`, inside the scroll container |

### The dissolve — parked, not deleted

The header used to carry no divider and instead let content **dissolve** into it:
8px of the bar's own colour fading to transparent on its underside, so a row
sliding under was never sliced. It lost to the hairline here, and only here —
the two mechanisms answer the same question and cancel each other.

**It is a good technique and it keeps.** Reach for it wherever content scrolls
under something that should not announce an edge — a canvas, a log tail, a
metrics pane, the top of a long dialog body.

```html
<!-- directly under the bar; `-mb-2` cancels its own height so it costs no flow -->
<div aria-hidden class="pointer-events-none -mb-2 h-2 bg-gradient-to-b from-card to-transparent" />
```

| Use | |
|---|---|
| **Dissolve** | The boundary should be felt, not seen. Nothing below is a separate region |
| **Hairline** | The boundary is structural — chrome above, content below |

Never both.

**Title row — left**

| Element | Spec |
|---|---|
| Collapse toggle | 32×32 icon button, 16px glyph, `fg-2` — chrome, not content |
| Toggle → title | **6px** |
| **Page title** | **`title/500`** — 16px medium, ink. It has run at 16/**600** (a headline, too loud) and at 14/500 (the fix for that, which took the size down as well as the weight). 600 was what made it shout; the size comes back |
| Trail, when nested | 13px weight 400 `fg-2`, `/` separator at `fg-2`/50% |

**Title row — right**

| Element | Spec |
|---|---|
| Actions | 32px on the control ladder |
| Between actions | **8px** |
| Label type | **`text-body`, the Button's own** — the band sets no type |
| Kebab | 32×32 icon button, always last |

**No count.** The header used to carry the page's one fact opposite the title —
`8 stacks · 2 need attention`, `3 addons`, `1 domain`. It is gone from every
list page. The rows are the count; a number above them restates what is already
on screen, and it was the first thing the eye hit on entering every page in the
product.

**The band must not set type.** It carried `[&_button]:text-name`, which put
every button in it at 14 — and **there is no 14px button** (§6: a size changes
height, never type). A container rule also outranks the button's own class, so a
call site could not opt out; the stack editor was forcing `!text-body` back onto
its row just to get the documented size. A header button is 13, like every other
button.

**Toolbar row**

| Element | Spec |
|---|---|
| Search field | **300px**, 32px tall |
| Right cluster | Filters, sort, then the view toggle — **6px** between controls |
| Everything here | `flat` (§9). Working controls — never a pill, never `outline` |

Content is illustrative: a section brings whatever tools it needs. The **slots and
the spacing** are the rule, not the specific controls.

### Budget — the title row only

**One primary · one secondary · one kebab.** Everything past that goes
in the kebab. The toolbar row has no budget — it holds what the section needs —
but §9 still binds it: **the page gets one filled button in total.** If the
title row has it, the toolbar row has none. Toolbars are working controls
anyway, so a fill there is almost always wrong (§11).

### What the header never holds

| Not this | Why | Where it goes |
|---|---|---|
| Docs, theme, account, product-wide search | About the **product**, not the page | The paper frame |
| Explanatory sentences | You need the explanation when there is **nothing yet** | The empty state |
| Entity metadata — repo URL, created date | Reference, not orientation | The page body |
| Back links **on a nested page** (`← Previews`, `← All addons`) | The breadcrumb **is** the way up | Deleted — but see journeys below |
| Destructive actions | The bar is on screen the entire time you scroll | The kebab |

**Filters, sort and search are no longer on this list.** They are about the page,
and they survive the scroll — they pass both tests below. They belong in part 2.

### The title names the SECTION, and an in-page selection never renames it

**Settled August 2026 on the previews board.** A page with a selector inside it —
a rail of repositories, a list of environments, any master/detail split — is
tempting to title with whatever is selected, because that is the most specific
true thing on screen. **It is still wrong.**

| | |
|---|---|
| **The title is a landmark, not a readout** | It is the one piece of chrome that tells you which section you are in. A landmark that moves as you click around the page stops being one, and you lose the ability to glance up and know where you are |
| **The selector already says which one** | The rail's selected row names it, permanently, in the same viewport. A title repeating it is the duplication §7 bans, one band up |
| **So the selection is named in the BODY** | Lead the body's context line with the object's name at `name/500` ink, with its machine string beside it in `mono/meta` `fg-muted`. That is the row's own name-then-meta pattern laid horizontally, and it is where entity metadata already belongs (the table above) |

This does not touch **journeys** or **nested pages**, which have their own titles
because they are different places (see below). The rule is about a selection
*inside* one page.

### Two tests before anything goes in

| Test | |
|---|---|
| **Does it survive the scroll?** | Anything tied to a scroll position fails |
| **Is it about the page, or the product?** | About the product → it belongs in the grey frame |
| **Is it already on screen?** | A count of the rows below it is. The rows are the count |

### Scaling to a new page

| Page type | Actions |
|---|---|
| **List** — Stacks, Secrets, Domains, Users | `+ New <thing>` |
| **Detail** — a stack, an addon, a preview config | One primary verb, rest in the kebab. Its status goes **beside the title**, not here |
| **Form / wizard** | The wizard footer owns its buttons |
| **Empty or errored** | The recovery action lives in the empty state |

**An empty right side is correct**, not unfinished.

**There is no `Home` crumb.** Every top-level destination is one click away in
the sidebar. A top-level page shows its title alone; the trail appears only once
you are actually nested. Consequence: **any new page must be reachable at a named
path** — a bare `/` route has nothing to title itself with.

### A journey has an exit; a nested page has a trail

**The header once banned back links outright. That was the rule written flat** —
it assumed every header belongs to a nested *place*, where the crumb genuinely is
the way up. A **journey** is not a place. It is a task you launched from a main
screen and will either finish or abandon, and the thing it needs is an exit.

| Page type | Header left | The test |
|---|---|---|
| **Journey, one step** — `New secret` | **Back arrow, then the title alone. No trail** | You are *leaving a task* |
| **Journey, several steps** — `New addon › Postgres` | **Back arrow, then the PATH** — see below | You are *inside a task and need to know where* |
| **Nested page** — `Stacks / acme-web / Environment` | **Trail, no back arrow** | You are *climbing a hierarchy* |

### A journey with steps shows the path

**Added August 2026.** The rule above was written when every journey was one
screen, and it had no answer for a second step: `Postgres` alone does not say
which task you are in, and the sidebar cannot say it either — the journey is not
a nav destination.

> **`New addon › Postgres`.** The task, then the step you are on.

| | |
|---|---|
| **In a DRAWER, the path IS the way back** | Every crumb behind the current one is a target. See below — this reverses the original rule, and it applies to drawers only |
| **Steps behind you are `fg-muted`, the step you are on is ink** | **Colour alone separates them.** Every step is `title/500`. The board ran weight as a second signal until semibold came off the scale (§6), and one signal turned out to be the better version anyway: a 400 step beside a 500 one read as two type styles rather than as one path |
| **Separator is `›`**, not `/` | A slash is the trail's mark and means *contained by*. This is a sequence, not a hierarchy |
| **One step gets no path** | `New secret` has nothing to report. A path of one is a title with punctuation |

### The drawer's crumbs go back, and the arrow came off

**Reversed August 2026, boards `564:6733` / `564:6845`.** The rule above said the
path was *a position, not links*, and that the arrow stayed the only way back.
Three steps is what broke it.

> **An arrow beside a path is the same control twice.**

| | |
|---|---|
| **The path already draws the route** | `New stack › A repository › Configure`, and every stop on it is somewhere you have been. An arrow sits next to a complete map and can only walk it one step at a time — two clicks to reach what one click on `New stack` reaches directly |
| **It names its destination; the arrow named a direction** | "Back" tells you which way. `Enable repository` tells you *which list*. The previews wizard was already paying for this with a six-word `backLabel` — "Back to the repository list" — which is the crumb, spelled out |
| **It bought back the 20 column** | The arrow's 32px box pushed the phrase right, so a drawer's heading started at a different x than its own body. With the arrow gone both sit on 20 |
| **Live crumbs stay `fg-muted` at rest** | They ink to `foreground` and underline on approach. The tier IS the "behind you" signal, and lifting it would put two crumbs at the current step's ink. §7 gives the accent to selection, not navigation — a blue crumb would be the only blue text in the drawer |
| **The hit area is the word, not a padded box** | A crumb sits inline in a phrase. A box would break the phrase into buttons and put the `›` outside them. The row is 32 tall, so the word clears the target floor vertically |
| **The last crumb is never a target** | It is where you already are, and it is the `DrawerTitle` Radix requires |
| **Step one has no back control at all** | It has nowhere to point. The ✕ is the only exit, which is enough for a step that has committed nothing — and it is still what lets step one drop its footer (§13) |

**A PAGE-level journey keeps its arrow** (§12a's table, and `sheet-header.tsx`).
A page has no path to click: it shows the title alone, so the arrow is the only
exit there is. The rule that changed is *a path makes the arrow redundant*, not
*arrows are wrong*.

### Close is an icon button, and the header owns the band

**Settled August 2026, board `556:6380`.** The close was an absolutely-positioned
✕. It is now a `ghost` icon button at the **32 rung, radius 8** — which is
`size="icon"` on the ordinary Button, not a new component. An icon button is a
button whose label is a glyph.

| | |
|---|---|
| **The BOX sits on the 20 column, not the glyph** | No negative margin pulling the box out to line the mark up with the body below. A button's own padding is what gives its glyph air, and cancelling that puts its hover wash outside the header's edge. Close at width − 20 − 32 |
| **The PATH starts on 20 too** | Measured. It is the same x as the body's own content, which the arrow's box always pushed it off by 38 |
| **The row is 32, so a header is 72** | Not the heading's own 24. Heading and close now share one centre line, which the absolute ✕ never managed. A header with a description is 94 |
| **The close is IN THE FLOW** | Absolutely positioned, it reserved no room, so the header had to dodge it — one drawer carried a literal `pr-12`. A sibling needs no dodging and no magic number |

**One component owns the band.** `DrawerHeader` takes `title` **or** `steps`,
plus `description`, and renders the close itself. It was an empty box that each
drawer filled, and six call sites drifted apart inside it: two built a path, two
built a title and a description, and one hand-rolled its own back button out of a
raw `<button>` — a second copy of a component that already existed. There is no
third shape now; the wizard's arrow-beside-a-stacked-title collapsed into the
path form it should always have used, and then the arrow left entirely.

A step is `string | { label, onClick }`. The bare string is a dead crumb; the
object is one you can return to. **Nothing else selects which crumbs are live** —
no index arithmetic at a call site, which is what would drift.

**Opening a drawer must not ring the way out of it.** Radix focuses the first
tabbable element on open, *programmatically* — which counts as `:focus-visible`,
so the ring draws even for a mouse click. In a journey that element is the way
out — it was the arrow, and it would now be the first live crumb — so every
journey opened with a ring on the control that leaves it. `DrawerContent` focuses
**itself** instead: not a control, so no ring, and Esc, Tab and the focus trap
are unchanged.

**Why the trail goes on a journey.** It would be the third way back. The sidebar
is always on screen with `Stacks` highlighted, so `Stacks /` repeats a permanent
nav item and pushes the page title into third position. The two marks are not
doing the same job, and only one job was unmet:

| | Says | Already covered by |
|---|---|---|
| Crumb | *where you are* | The sidebar, permanently |
| Back arrow | **this is a task you can leave** | Nothing else |

A crumb is a location; an arrow is an exit. On a wizard people look for the exit,
and a crumb is not read as one.

| Rule | |
|---|---|
| **Order** | Collapse toggle · **hairline divider** · back · title. The divider separates chrome that belongs to the **shell** from chrome that belongs to **this journey** |
| Divider | 1px `border`, **20px tall**, centred in the 32px row |
| Back | 32×32 icon button, 16px `ArrowLeft`, `fg-2` — same rung as the collapse toggle |
| **Where it goes** | **Back through history**, so it returns you the way you came. Deep-linked with no history, it falls back to the journey's origin |
| Not a journey | A nested page keeps the trail and gets **no** arrow. Never both |

**The cost, stated:** on the 56px collapsed rail (§12b) the word `Stacks` is not
visible — only the highlighted icon. Accepted; the arrow carries the exit.

## 12b. Widths — desktop only

**We are not optimising for mobile.** The target is desktop screen sizes; phone
and tablet layouts are out of scope until we say otherwise. Do not spend effort
on sub-1024 behaviour, and do not let it constrain a desktop decision.

| Width | Sidebar | Sheet |
|---|---|---|
| **≥ 1280** | Expanded, **240px** | Fills the remainder, 12px inset |
| **1024 – 1280** | Collapses to the **56px** rail | Fills the remainder — the rail buys the content 184px |
| **< 1024** | Out of scope | Out of scope |

The collapse is also **manual** at any width — the toggle in the title row (§12a)
is the user's, not just the breakpoint's.

## 13. Overlays

Shadow belongs to things that float (§5); content is flat. A menu opening from a
32px row does not cast a dialog's shadow.

**Reach for a drawer first, a dialog second.** Drawers hold work you return
from; dialogs interrupt.

### Which container

**Ask what the user does between opening it and finishing it.**

| | |
|---|---|
| **Dialog** | They answer and it closes. They never leave |
| **Drawer** | They **leave and come back** — another window, another tab, a wait they cannot control. The page behind stays readable and the flow survives a close |
| **Page** | It has its own address, its own errors, and someone will link to it. Create-stack is the reference |

A "wizard" is not automatically a journey. **Pick a provider, then fill a form**
is a form with a first page — it is not two phases. Connecting a git provider
opens a GitHub popup and polls while the user authorises in another window; that
is a drawer. **Converted 16 Aug 2026** — see "The wait is a state, the receipt is
a toast" below.

> **Corrected August 2026.** This sentence used to end *"it stays a dialog"*,
> and it contradicted "Adding a thing" below, which says **a dialog is never an
> add**. Object stores was caught between the two — a `Dialog` at `work` for a
> flow the table names under *drawer, one phase* — so the sentence was making a
> claim about the *surface* when the only thing it can settle is the **number of
> phases**. Both halves now agree: adds are drawers, and a mode you pick inside
> one is a field, not a first phase.

### The dialog is one component, three widths

The width is chosen by the **job**, never by the content.

| | | |
|---|---|---|
| **ask** | **440** | One question, one or two fields, or a confirmation |
| **form** | **560** | A record being created or edited |
| **work** | **760** | Something you read or step through |

**Anything that will not fit 760 is not a dialog.** That is the escape valve
that keeps the ladder at three rungs — reach for a drawer.

This replaced **thirteen** widths, nine of which appeared exactly once. They
happened because every dialog wrote a raw max-width at the call site; the size
is now a property of the primitive.

### The material

| | |
|---|---|
| **Surface** | `surface/popover` — **white**. §3's "higher elevation is whiter" applies to the thing floating highest, and dialogs used to ship the *frame* colour |
| **Corner** | `radius-xl` — 16px (§8) |
| **Shadow** | `shadow-2xl` (§5). Not `lg` — that is the popover rung, and a dialog must not float the same distance as the dropdown that opened it |
| **Title** | `head/600`, **sentence case**. Never `title` with its leading crushed out |
| **Scrim** | **One scrim for every overlay.** A pale wash reads as the app fading out; a scrim reads as the dialog stepping forward |
| **Rhythm** | The body/footer rhythm (§8) — the dialog is where it was settled |

### The dialog's structure, exactly

Header and Content are **wrapped into a body**; the Footer is a peer of that
body. The wrapper is not decoration — it is what makes the footer break a
different level from everything inside it.

```
Dialog                     pad 24 · radius xl · surface/popover · shadow-2xl
├─ body                    gap 20   Header → Content
│  ├─ Header               gap 0    Title (head/600) + Description (body/400)
│  └─ Content              gap 32   fields → error slot
│     ├─ fields            gap 16   field → field
│     │   └─ field         gap 4    label → control
│     └─ Error slot        Inline alert, tone=danger
├─ Footer                  gap 8    Cancel, then ONE fill, right
└─ Close ✕                 absolute, on the 24 column, centred on the title line
```

`Confirm` is the same object, at the **ask** width, with two differences and only
two: there is **no close ✕** (Cancel is the way out and it holds focus), and the
footer's second button is destructive and **disabled until the gate is met**
(§6a). Every gap is the dialog's.

**A `Confirm` with no gate has no Content band at all** — the body is just the
Header, and the footer still breaks at **32**.

### The error goes in the dialog, never in a toast

**A reserved slot above the footer**, holding an `Inline alert` (§7). It is
present in the layout whether or not it is filled.

A toast fires *after* the dialog closes, taking with it the form the user needs
to correct. Ten dialogs did this. An error that reports a failure the user can
no longer act on is not a message, it is a notification of loss.

**Say what broke and what to do about it** — "a secret named `DEPLOY_KEY`
already exists; pick another name, or edit the existing one" — not "failed to
create secret".

### Delete and Remove are not synonyms

| | |
|---|---|
| **Delete** | The thing and its data cease to exist |
| **Remove** | It is detached from here and survives elsewhere |

The same act was called `Delete` on secrets and stacks and `Remove` on
registries, integrations and resources. Destructive friction still escalates
with blast radius (§6a) regardless of which word applies.

### Still open

| Open | |
|---|---|
| **Which container** | §13's test is *"do they leave and come back?"*; the drawer sweep runs on *"what is it attached to?"*. They disagree on every ordinary form. See `docs/design/drawer-surface.md` |
| The dialog's three widths | If the dialog is confirm-only, `form` and `work` have little left to hold and the ladder may collapse to one rung |
| The step rail | The drawer marks the current step by weight and an unticked pip. Whether a journey needs a stronger current-step marker is unanswered until a second journey exists |

### The drawer is three bands, and it is not a wide dialog

**Its header and footer are pinned and each carries a hairline**, because the
content scrolls under them. A dialog is one padded box whose levels are made of
air — that works because its body does not scroll. A drawer holds a long form
and does scroll, so its levels are made of **lines**.

The borders are **permanent**, not affordances that appear on overflow: a long
form needs a fixed edge to scroll under, and a border that comes and goes moves
the thing you are reading at the moment you start reading it.

Built and measured in the running app (`ui/drawer.tsx`, board `466:5322`):

| | |
|---|---|
| Width | **480 form** · **640 work**. Nothing wider — 640 is already 44% of 1440 |
| Corner | **Square.** The inner edge is held by the border and the scrim; a radius there read as a sheet laid ON the page rather than part of it |
| Title | **`title/500`**, not the dialog's `head` — a band this tall does not carry 28px of type |
| Header | **95** — 20 padding, 2 to a description of **one line**, hairline **below** |
| Body | 20 padding, 16 rhythm, **scrolls** |
| Footer | **81** — 24 padding, 16 above the buttons, hairline **above** |

**86 and 80 were the doc, 95 and 81 are the product.** Measured 16 Aug 2026 on
the shipped `New secret` and `New object store` drawers, and the Figma `Drawer`
(`466:5322`) draws its header at 95 too — so the board and the code agreed and
only this table did not. Corrected here rather than in `drawer.tsx`, which is a
shared primitive that six screens already sit on.

**A two-line description costs 20 more.** The object store drawer opened at 115
until its description was cut to one line — which is what the 95 assumes, and
what every other drawer ships.

**The error slot lives in the footer band.** Inside a body that scrolls, a
failure scrolls away from the button that produced it — the same failure as a
toast, only slower.

**Progress is ink, never orange.** A step pip and a waiting state are interface,
and §7 bans orange there. A completed step is a **ticked `Checkbox`**, not a
bespoke dot — the primitive already says "done".

> **This is about a journey's step pip, and it does not reach a background
> process.** Read as *any progress readout gets checkboxes*, it put three of them
> on `Connect git provider`'s wait — boxes that look operable, are not, and
> report stages nothing observes. See "A progress readout may not invent its own
> granularity" below.

### Adding a thing — one pattern, and it is always a drawer

**Settled August 2026.** Twelve add flows had shipped across three surfaces with
nothing deciding which: four fields got a drawer once and a dialog once; six
fields got two different dialog widths. **Size was not choosing the surface —
build order was.**

> **How many things do you choose before you can start?**

| Answer | Surface | |
|---|---|---|
| **None** | **Drawer, one phase** | You already know what you are making. Secret, domain, cluster, object store, project, invite, volume |
| **One**, from a list that grows | **Drawer, two phases** | Phase 1 is the catalogue, phase 2 is the form. Addon, enable repository, new stack, connect git provider, **add image registry** |
| **Many**, assembled before you commit | **Drawer, two phases + a rail** | The rail is the running set. New stack's building blocks |

**A dialog is never an add.** It is a decision — one question, two answers.
Delete, confirm, verify. If the answer is an *object*, it is a drawer.

| Rule | |
|---|---|
| **One width for the whole journey** | A drawer picks its rung once. Step one is whatever step two is, not what step one needs. A width that changes mid-task reads as a **different surface opening** |
| **And one width for every add — 480** | Five of the six are on it. `work` is earned by a **rail**, not by a second step; see "One width for every add" below |
| **The description belongs to step one only** | It is orientation and you only need orienting once. Step two carries the path (§12a) and nothing else; the header loses its second line and the body gains it |
| **The choice is the first phase, never a dialog in front of the form** | A picker dialog gating a single form is a speed bump. It becomes phase 1, and it is the same component every time: search, category groups, `PickerRow` |
| **The catalogue is a registry, not a screen** | Adding a service is a registry entry. A hand-written option list is a second copy that drifts — Postgres shipped as both `Postgres` and `PostgreSQL` because two lists existed |
| **Every step is named, including the first** | `New addon › Pick a service`, then `New addon › Postgres`. Step one used to show the task alone, which under-applies §12a: a first step is still a step, and the task name does not say what to do on it |
| **A catalogue that fits one screen gets no search** | The field can only ever hide rows already visible, and it costs a zero-result empty state that exists purely to recover from using it. **Search arrives with the scroll that justifies it**, not before |
| **The rail is 240, and only for what the body cannot show** | See below. It is not a second column of controls, and it is not a status readout |
| **Picking advances. Step one has no primary** | A row answers step one's only question, so a `Continue` beside it repeats the click you just made. The tick still earns its place: it is what you see when the path's first crumb brings you here |
| **And step one has no footer at all** | See below |
| **The row carries a stem; the crumb carries a verb** | Step one's rows read `From a repository`, not `A repository` — the bare nouns were half of a pair with a `Start from` eyebrow that left with the tab strip, so they were fragments with nothing to complete them. Once you are inside a point the kind is settled, so the crumb says what you are doing with it: `Select repository`, `Add compose file`, `Start blank`. **The five verbs differ**, so each point carries its own rather than one being derived from the other |
| **Every step name is SHORT, because a path is a position and not a sentence** | `New stack › Select repository › Configure service`. Two earlier passes went the other way — first `› Pick a starting point` (which labelled the list), then `› Select a service to start from` and `› Start from a ready-made app` (which named the act). Both were fixing the wrong thing: **the crumb before the `›` already carries the task**, so "New stack" and "Start from" are one idea said twice, six words apart. The segment after the `›` only has to answer *where am I*, and the steps then read as siblings rather than as an instruction followed by a restatement of it |
| **A step exists if it asks a question** | Not if it fits. The repository journey has three because the code and the service it becomes are two different answers — see below |

#### Step one has no footer, because there is nothing on it to cancel

**Settled August 2026, board `556:6379`.** It ended on a lone `Cancel`, on the
reasoning that a footer with one button is still a footer. That was wrong about
what the button was for.

> **`Cancel` offers to undo something.** On step one nothing has been typed and
> nothing has been made, and picking a row *advances* rather than commits — so
> the button was offering to undo a state that does not exist.

| | |
|---|---|
| **The two exits it leaves behind are already on screen** | The path's live crumbs, and the drawer's own ✕. A third control for the same act was the thing to remove, not the last one |
| **A band with nothing to hold is a band** | 20 of padding, a hairline and 32 of button — 73px of the sheet, held for the whole step, to repeat a control in the header |
| **Step two keeps a footer** | By then there is something to *commit*, and a primary to hold |

**Superseded consequence.** This used to require wiring step one's arrow to
*close* the drawer, since it had nothing to step back to. The arrow is gone
(§12a) and step one's crumbs are dead for the same reason, so the ✕ is now the
step's only exit — which is enough for a step that has committed nothing.

#### A step is not removed by moving its fields elsewhere

**Learned the hard way, August 2026.** The repository journey used to end on a
service form — name, branch, port, Dockerfile path, build context, expose. The
graphite pass deleted it, on the reasoning that those fields describe a
**resource**, and a resource is edited in the node inspector on the canvas.

The reasoning is right about where they *live* and wrong about whether the step
can go.

> **Deleting a step does not move its work. It stops asking, and something else
> starts guessing.**

The draft was then built from five values nobody had seen — and one of them,
the port, decides whether the thing serves traffic at all. "You can change it on
the canvas" is true of every field in the product; it is not a reason to skip
the one moment the person who knows the answer is standing in front of you.

| | |
|---|---|
| **The test is whether it asks a different question** | Step two answers *which code*. Step three answers *what it becomes*. Two questions, two steps |
| **Only the journey that needs it grows one** | A repository has three steps; the other four starting points commit from step two, because what they produce is already fully described by what you picked |
| **The button's verb changes with the step** | `Continue` on step two, `Create stack` on step three. A button that said `Create stack` and then showed you another form is lying about what the click does |
| **The form opens on values, not blanks** | Name and branch are derived from the repository you just picked, so the common case is read-and-confirm. They are seeded only when still empty, so going back and returning does not overwrite an edit |
| **A required field is NOT pre-filled with a guess** | Port stays empty with `3000` as its placeholder. Pre-filling required fields is how a wrong value ships without anyone reading it |

#### And step two's footer holds the primary alone

**Settled a day later, board `557:6445`.** The first pass kept `Cancel` on step
two on the grounds that there was now a selection to abandon. The same question
kills it there too: **the path and the ✕ are the journey's exits on every
step**, so `Cancel` is a third control for an act two others already offer.

> A drawer footer is **the place the thing gets made.** One button, right
> aligned. If a second one is doing "get me out of here", the header already
> did it.

| | |
|---|---|
| **This is not "no way to back out"** | It is *one* way out per direction: the arrow steps back, the ✕ leaves. Esc and the scrim still work |
| **It applies to the whole journey** | Not to the step that happens to be on the board. Five starting points share one footer — a rule that held on one of them would just be a special case |

#### And it holds on a one-phase drawer, where the argument had to be remade

**Settled August 2026 on `New secret`, the last `Cancel` left in a drawer
footer.** The journey rule leant on *"the path and the ✕ are the exits"*, and a
one-phase drawer has no path — so the reasoning does not carry across, it has to
be redone. It lands the same way.

> The question is not *how many exits are there*. It is **what is `Cancel`
> offering to undo?** On a form nothing has been committed until the primary is
> pressed, so the answer is *nothing* — which is exactly what closing does.

| | |
|---|---|
| **The ✕ is not the only exit** | Esc and the scrim are the other two, and both are how people actually leave an overlay. A one-phase drawer has three ways out before the footer offers a fourth |
| **A footer is where the thing gets made** | One button, right aligned. The moment a second one says *get me out of here*, the band is doing two jobs and the primary is sharing its row with its own opposite |
| **This is not the dialog's rule** | A `Dialog` and a `Confirm` **keep `Cancel`** — a decision has two answers and both are the point, and `Confirm` has no ✕ at all, so `Cancel` is genuinely its way out (§13) |

**Applies to every one-phase drawer**: `New secret`, `New preview environment`,
`New object store`, `Add cluster` and `Add domain`, and anything that joins
them.

**The last two converted 16 Aug 2026**, and this paragraph named them as the
exceptions *"governed by the dialog rule until they convert"*. There are none
left: every add in the product that has been through the pass is a drawer, and
the ones that have not are listed in `docs/tasks.md` rather than carved out
here.

> **A dialog that scrolls has already answered the question.** `Add cluster`
> shipped with `max-h-[80vh] overflow-y-auto` on its `DialogContent`. A dialog
> is one padded box whose levels are made of **air**, and that only works
> because its body does not scroll — the moment it does, the levels have to be
> **lines**, which is the drawer. It is the cheapest tell in the section: grep
> for `overflow-y-auto` on a `DialogContent` and you have found a drawer.
>
> **The grep is empty now.** `Add image registry` was the third and last, on
> `max-h-[80vh] min-h-[440px] overflow-hidden` — converted 16 Aug 2026. What is
> left in the tree are two comments describing the ones that went.

**And one field is not an argument for a dialog.** `Add domain` is a single
`FieldShell`, which is exactly what the `ask` rung describes — and it still
became a drawer, because the rung describes the *question* and the rule is about
the *answer*. A decision closes on either of two answers; this one leaves an
object behind in a list. The surface is chosen by what comes out of it, not by
how much goes in.

#### A mode is a field, not a first phase

**Settled August 2026 on object stores, board section `object stores — the
surface, and what shares a subject`.** The provider — S3, Azure, GCS — governed
every credential field under it, which looks like *"one thing you choose before
you can start"* and therefore like two phases. It is not.

> **The test is whether you can start without it.** On this form you can:
> `Name`, `Destination path` and `Retention` are all answerable above the
> provider and none of them changes when it does. A choice you make *among* the
> fields is a **mode**; a choice that gates the form is a **phase**.

| | |
|---|---|
| **It is the secret form's `Type`, exactly** | Same shape, same position — directly above the fields it rewrites, which is the `Scheduled backups → Schedule` adjacency. So the two are one question, and the parked Option D (the kind becomes step one) has to move **both** or neither |
| **A mode is a labelled field** | The provider shipped as a `Tabs` strip inside the body: no label, no required mark, no error slot, and the only place in the product where a form's mode is a tab strip. `Tabs` is navigation everywhere else it appears |
| **And its options are derived** | Three literal `TabsTrigger`s sat beside the zod enum. That is the second copy that let the secret `Type` select ship three of the product's six kinds |

#### The wait is a state, the receipt is a toast

**Settled 16 Aug 2026 on `Connect git provider`, the last add with a drawer
written into these rules and no drawer to show for it.** It ran a five-phase
dialog — `provider → github → credentials → connecting → done` — and §13's test
is *a step exists if it asks a question*. Two of the five ask none.

| Phase | What it became |
|---|---|
| `provider` | **Step one.** The catalogue |
| `github` | **A step, on the GitHub arm alone.** See below |
| `credentials` | **The form.** Step two for four providers, step three for GitHub-by-token |
| `connecting` | **A state.** It replaces the GitHub step's body while the popup is open. It asks nothing, so the path does not grow a segment for it — but it stays visible, because the wait is what makes this a drawer at all |
| `done` | **A toast.** It was a panel with its own `Done` button, which made this the one add in the product that did not close and report |

> **Neither was deleted.** "Not a step" is a statement about the **path**, not
> about whether the screen exists. The wait keeps its checklist and its `Check
> again`; the receipt keeps its words and moves them into the toast's
> description. Deleting a step stops asking; demoting one only stops *numbering*
> it.

#### A progress readout may not invent its own granularity

**Jaseem, on the shipped wait, 16 Aug 2026:** *"why do we have checkboxes there?
it's not like I can do anything with them right?"*

He is right about the checkboxes, and they were the smaller half of it. The wait
listed three stages — *opening authorization*, *authorizing the installation*,
*fetching accessible repositories* — with a mark against each. `useGithubConnect`
has **two** states, `waiting` and `connected`. Nothing observed those stages: the
middle line was lit by an `i === 1` literal, the third was permanently pending,
and all three flipped at once.

| | |
|---|---|
| **A readout reports what is known** | Three lines over two states is a picture of progress, not a report of it. The screen was more confident than the code |
| **And a control that cannot be operated is not a control** | Three `Checkbox`es that take no click, take no focus and change nothing. §9's *"empty ≠ disabled"* family: the shape promises an act it does not have |
| **What survives is the instruction** | *Finish the installation in the GitHub popup. We'll pick it up here* — plus `Check again`, which is the one thing on the screen the user can actually do |

#### The error slot is the footer for a FORM, not for every band

**Same screen, same day.** §13 puts the error in the footer band so a form's
failure cannot scroll away from the button that produced it. The wait has no
primary and commits nothing, and the banner sat under the copy it contradicted —
a footnote to a screen still saying *we'll pick it up here*.

> **The error goes where the thing it invalidates is.** On a form that is beside
> the button. On a screen whose whole body is now wrong, that is the **top**, and
> the copy it contradicts steps aside rather than arguing with it.

#### A branch that asks a different question grows a step; a branch that rewrites fields is a mode

**The same case, decided both ways twice — so here is the test that separates
them.** Picking GitHub asks a second question the other four providers never
see: install the App, or paste a token. Two live precedents pointed opposite
ways — the repository journey grows a third step on one branch only, and the
object store's provider is a mode *among* the fields.

> **Can you start without it?** On the object store you can: `Name`,
> `Destination path` and `Retention` all sit above the provider and none of them
> changes when it does. On the GitHub arm you cannot: the App branch has **no
> host, no username and no token** — no form to start.

| | |
|---|---|
| **A mode rewrites the fields under it** | It swaps which questions you answer. This one **removes every one of them**, which is not a mode, it is a different destination |
| **And they leave different objects behind** | `github_app` and `git_credentials` are two records, not two shapes of one. A mode is one record's variant |
| **Only the branch that needs it grows one** | `Connect provider › GitHub › Access token` is three; the other four commit from step two. The repository journey's precedent, applied |

#### And the phase test is answered per FLOW, not per form — siblings match

**Settled 16 Aug 2026 on `Add image registry`, the day after `Connect git
provider`, and it is the first time the phase test was overruled.**

Taken alone, that form answers *"can you start without it?"* with a clear
**yes**, and by a wider margin than the object store did:

| | |
|---|---|
| Every registry shows the **same four fields** | `Host`, `Username`, `Password`, `Purpose`. Nothing appears, disappears or changes shape |
| The choice does not even **rewrite** them | It prefills `Host` and swaps one hint. The object store's provider at least picks which credential block gets sent |
| And it is **not in the record** | `RegistryCredential` is `{host, username, password, purpose}`. The provider is not a field; the list row *derives* it back from the host |

By the letter of the two subsections above, that is a mode, and a mode is a
field — a `Registry` select above `Host`, one phase, no catalogue.

> **Jaseem, on the running screen:** *"for git integration we have to select the
> service first, I think it has to be same here as well."*

**The test asks what a form needs, and it cannot see the flow standing beside
it.** Image registries and git integrations are siblings — the same page shape,
the same job, converted a day apart, and reached within a minute of each other
by anyone setting up a build. A rule applied screen-by-screen that makes two
halves of one task behave differently has been mis-applied, however well it
reads on either half alone.

| | |
|---|---|
| **A sibling flow is part of the evidence** | Before answering *can you start without it*, ask **what does the flow next door do?** Where the two are peers, they match — the user's model is `pick the service, then fill its form`, and it is one model, not two |
| **This does not repeal the mode rule** | The object store's provider is still a field. It has **no sibling** — nothing else in the product picks S3-or-Azure — so nothing was standing beside it to match |
| **What it costs when the test loses** | One extra click on a five-row list. What matching costs when the test wins is a user learning the same task twice |

**Everything else about the conversion follows the sibling exactly**: catalogue
rows off the registry, picking advances, no footer on step one, the crumb is the
way back, the description belongs to step one, and the credentials clear when
the registry changes.

#### A description only when the step name cannot carry it

§13 said the description belongs to step one. Read as *step one always gets
one*, it produced a line under `Select a service to start from` that restated
the list about to render — and the board deleted it.

| The step name | The description |
|---|---|
| Names the **act** — `Select a service to start from` | **None.** The instruction is already there, and a second line under it is the same sentence at lower contrast |
| Names the **thing** — `Pick a service` | Earns one, if there is something to say that the rows cannot |

**Never on step two.** You were oriented once; the path is what step two owes
you.

#### One width for every add — 480. The rail is what buys 640

**Settled 16 Aug 2026, off Jaseem's reading of the shipped drawers:** *"adding a
new addon is much bigger than the other ones."*

He is right, and the split was not by size — it was **inherited**. `640` had been
written as *"the two-phase journey is `work`"*, and that sentence generalised
from a measurement taken on **one** journey:

> **The floor for two columns is 596** — 253 for the search placeholder, 243 for
> the longest list line, and 240 before a description breaks to four lines.

Those numbers are new stack's, **with its 240 rail**. `New addon` has no rail and
no search (§13's own "a catalogue that fits one screen gets no search"), and
`Enable repository` has no rail either. Neither was ever the screen that was
measured.

| | Was | Now |
|---|---|---|
| New secret · New object store · New preview environment | 480 | **480** |
| **New addon** | 640 | **480** |
| **Enable repository** | 640 | **480** |
| **Connect git provider** | dialog, 560 | **480** — three steps on one arm and still no rail |
| **Add image registry** | dialog, 560 | **480** — two steps, no rail |
| New stack | 640 | **640** — it has a rail, so it genuinely has two columns |

**What it looked like at 640, measured:** the addon catalogue's rows carry ~200px
of ink in a 599 column, and its form ends on the same two trailing edges at 480
that it had at 640 — the pairs go 292 → 212, which is what every other form
already ships. Nothing structural was using the width.

**And the control band survives.** The `Provider ǀ Public URL` switch plus its
search field measure **160 + 16 + 263 = 439** at the form rung, on one row.
§13 had claimed the field "needs 277"; that figure was taken *with the rail
eating 240*, and this is the second thing on this page the rail's arithmetic had
quietly decided for everyone.

| Rule | |
|---|---|
| **`work` is earned by a second column, not by a second step** | A journey does not get 640 for having phases. It gets 640 for having a **rail**, which is the only thing that makes a drawer two columns |
| **The rung still has two entries** | And exactly one screen on the upper one. That is honest: the rung describes *one column or two*, and one screen has two |
| **The cost was two sentences of copy** | Both hints that broke badly at 480 were shortened, which is what §8 says to do — `text-wrap: pretty` was tried first and **measured to change nothing**, so it was removed rather than shipped as a no-op |

### The rail is only what the body cannot show

**Settled August 2026, after it shipped on four starting points and earned its
240 on two.** The test is not *does this step produce something* — every step
does. It is **does the body already say it?**

**The rail's logo tile is the sheet, lifted — not a control fill.** It was
`--control`, the recessed grey a picker row's chip uses. That is right for a
chip *inside* a row, where the tile is one element among several on a shared
ground; it is wrong for the first thing in the rail and the thing the panel is
about. Same fill as the surface it sits on, held by the hairline and
`elevation/sm`, so the tile reads as raised rather than pressed in.

> **Open.** In light the shadow does visible work on a white ground. On dark's
> near-black it does almost none, so the hairline is carrying the edge alone.
> Authored on a light board; not yet judged in dark.

| Step | Rail | |
|---|---|---|
| **A ready-made app** | **Yes** | The app you picked, in full: a description, links, and the services it brings. None of that fits a row |
| **Building blocks** | **Yes** | The set you are assembling, and the only place you can take one back out |
| A repository | No | One repository makes exactly one service, and **the row you ticked already named it** |
| A compose file | No | The file lists its own services, in the well, in the user's own words. The well wants the width |
| A blank canvas | No | There is nothing to put in it |

**A rail that reports what the body already shows is a column saying nothing**,
and it costs the work 260px to say it. That is what "only for what you have got"
always meant; it was read as "a column that reports state" and produced four.

**Consequence: an empty rail is a bug, not a state.** The version that stayed on
screen saying *"Nothing yet. Pick a repository…"* was solving the wrong problem —
the jump when a rail appears is not worth a permanent column, and the two steps
that keep a rail have something in it the moment it appears.

**The consequence, stated:** at 640 with a 240 rail the left column is 340, and a
segmented control plus a search field **cannot share a row** — 162 + 8 leaves 170
for a field that needs 277. The switch takes its own row.

### The toast carries its tone in the glyph

**Built to board `427:5102` and measured in the running app, 16 Aug 2026.** The
paragraph below described a component that had never been built: the code still
tinted its border per tone, still had no glyph, and still sat in the corner.

| | |
|---|---|
| Position | **Bottom right**, 16 clear of both edges |
| Width | **380** — and the viewport is sized on the *content* box, or its own 16 of inset is taken out of the toast and the number quietly becomes 348 |
| Corner | `radius-lg` — 12 |
| Shadow | `elevation/lg` **plus a contact layer** — `--shadow-toast`. Not a modal, so still not `2xl`; see below |
| Surface | `surface/popover` — white |
| Edge | **`line/strong` (0.18), as an OUTLINE.** See below — the board's `line/subtle` was picked against the board's grey frame |
| Padding | **16**, gaps **8** |
| Type | **`body/400`, `ink/primary`. One paragraph** |
| Glyph | 16, tone-coloured, nudged 2 down so it centres on the first line of a 20 line box |
| Close | 16 of glyph in a 24 target — `-m-1 p-1` grows the hit area without moving the layout box |

#### The corner, after a day at top centre

It was moved to top centre on the argument that a toast should land where you
were looking — the sheet, a drawer's footer, a dialog's primary are all mid
screen, and the far corner is the one place your eye had no reason to be.

**The render killed it.** At 16 from the top it lands on the **sheet header**,
and in light the header and the toast are the same white — so the only thing
separating them was a hairline, and the toast read as a piece of the chrome. The
corner has no chrome to be mistaken for.

> **A position argument that ignores what is already at that position is half an
> argument.** "Where you were looking" was true; "what is drawn there" was never
> checked.

#### The surface cannot separate itself, so the edge has to

**Measured in the running app: `surface vs ground` is 1.00.** The toast's white
and the sheet's white are the same colour, and unlike a dialog there is no scrim
behind it. The hairline is not a detail on this component — it is the entire
reason the object has a shape.

The board draws `line/subtle` (0.06), and that was chosen against **the board's
grey frame**, which is not the ground it ships on. Solve contrast against the
worst ground.

| Off the rendered pixels, light / dark | left edge | bottom edge |
|---|---|---|
| `line/subtle` inside, as shipped | 1.24 / 1.26 | 1.24 / 1.26 |
| `line` outside | 1.24 / 1.21 | 1.33 / 1.11 |
| **`line/strong` outside** | **1.43 / 1.44** | **1.54 / 1.32** |

**Outside rather than inside**, so the line sits on the shadow instead of on the
surface — §12a's own language for an edge that must not move layout. Honestly
measured, that is worth **+0.09 on the bottom edge and nothing on the sides**:
`elevation/lg`'s spreads (-22, -12) pull the whole shadow under the box, so three
of the four sides have no shadow to darken against. It is kept because it is free
and it is the right mechanic — but **the rung is what actually moved it.**

#### And the shadow gained a contact layer — the ladder did not gain a rung

**Settled 16 Aug 2026, Jaseem's call, after seeing the two rendered side by
side.** All four rungs are soft pools with **negative spread**: they blur out
*below* a card and leave nothing at its own edge. That is right everywhere,
because every other floating surface has something behind it to borrow contrast
from — a popover has its trigger, a dialog has a scrim.

**The toast has neither.** So it gets the tight darkness where an object meets
the surface it sits on, and the edge goes from **1.43 / 1.54 to 1.52 / 1.72**.

| | |
|---|---|
| **It is `lg` with one more layer, not a fifth rung** | `--shadow-toast`, named for its one caller. §5's ladder still has four entries, and nothing else may reach for this |
| **Dark aliases `lg`, measured** | A contact shadow works by darkening the ground at the edge, and dark's ground is already near-black. Adding one moved the number by **nothing** — 1.44 / 1.32, unchanged. Dark carries its edge on the hairline, which is why the rung went to `line/strong` |
| **The exception is the surface, not the component** | If another surface ever lands on its own fill with no scrim behind it, it has the same problem and may use this. Nothing else does today |

#### White surface, neutral hairline, and the tone in the glyph alone

The old toast tinted its *border* per tone, which said the severity twice (§7's
alert banner settled the same argument) and produced four components that looked
like four different things. Status is said once (§11).

#### One paragraph, not a heading over a caption

The board draws every tone as a single run of `body/400`, including the
two-sentence ones. The code had a `font-semibold` title — a weight §6 took off
the scale — over a dimmed `text-meta` description: **a two-tier hierarchy inside
a 380px box that disappears in five seconds**, which is hierarchy nobody has time
to read.

Titles are written as fragments (`Addon created`) because they were written for a
heading, so the join supplies the stop they never carried. One place, rather than
ninety-seven rewrites of copy that is otherwise correct.

#### It dismisses itself, and the clock is a function of the words

**~1 second per three words over a 3 second base, clamped to 4–10s** — the
reading-time guideline behind WCAG 2.2.1's treatment of notifications.

A fixed number is wrong at both ends: *"Secret created"* holds the screen long
after it has been read, and a sentence naming three affected stacks is gone
before it has been. Radix pauses the clock on hover, focus and window blur, which
is the accommodation the criterion actually asks for.

| | |
|---|---|
| **A toast carrying an action never times out** | The clock exists to clear a message that has been read. A control has to be *found* and *pressed*, and a timer racing the pointer is the failure 2.2.1 is about |
| **Closing is not removing** | Marking a toast closed lets the exit animation run; the store must then drop it, or the limit starts evicting live toasts to make room for dead ones |

**A toast reports something that already happened and that the user can no longer
act on.** If they can still act — a form that failed to submit — the message
belongs in the dialog's error slot, not here.

### The destructive button fails contrast in dark — fix on the port

**Measured in the running app: white on `#FF9181` is 2.18:1.** AA wants 4.5.

`button.tsx` hardcodes `text-white` on the `destructive` variant. That is right in
light, where `--danger` is a dark red, and wrong in dark, where `--danger` is a
light salmon and the label needs dark ink. The token to do this already exists —
`--destructive-foreground` is `#FFFFFF` in light and `#0D0C0A` in dark — it is
simply not used.

The Figma `Button` gained the solid `Tone=destructive` it never had (only
`destructive-ghost` existed), and its label is bound to `ink/on-primary`, which
flips per mode. **The board is correct and the code is not**; the port closes it.

## 14. Motion

**Best practices for now; decided properly as we go.** Today only the button
press has a rule behind it (§9). Until motion is settled:

- Respect `prefers-reduced-motion` on everything.
- No ambient movement on a working surface.
- **Use the durations already in the code**, rather than a new number:

| Duration | For | In use |
|---|---|---|
| **200ms** | **The default.** Width, position, anything that moves a box | 21 places — the rail collapse (§12) and most transitions |
| **150ms** | The short step — colour, opacity, a hover settling | 4 places |
| ~90–140ms | The rail's asymmetric in/out (§12), tuned per direction | 5 places |

This corrected an error: the rule used to say *"consistent with the 150ms
transition already in use"*, and 150ms was never the one in use.

---

## 15. Open — decided as we go

Not omissions. Each is settled when a journey needs it, and lands in this file
when it is.

| Open | Notes |
|---|---|
| Loading and skeletons | Define per journey |
| Failure and error loudness | Per journey, by severity |
| Toasts | **Settled — see §13.** Duration and stacking behaviour are still open |
| Multi-step / wizard chrome | **Settled — see §13.** A wizard is not a container: pick the container by whether the user leaves and comes back. The step rail itself is still open, and lands when the drawer is built |
| The canvas, logs, metrics, the deployment timeline | Define as we design each |
| Split detail layout | Add if a journey demands it |
| Content column at very wide widths | Figma specifies 1440. Whether the sheet's content caps or spans at 2560 is unanswered |
| Hover, focus and pressed states for the shell | Figma carries rest states only — these get derived in code from §4 and §9 |
| The list/cards toggle | Whether a second view earns its keep |
| The stack editor conversion | To be scheduled |
| The auth screens | To be decided — they currently follow the website's rules |
| ~~Form field height~~ | **Settled — see §8.** 32 is the default and that includes form fields. 40 stays on the ladder for the rare control that owns its surface. The rule moved, not the exemplar |
| **The two-phase drawer's step rail** | The path (§12a) says which step you are on. Whether a journey with three or more steps also needs a visible rail is unanswered — both journeys have two and neither does |
| ~~New stack in code~~ | **Built.** Step one plus all five step-2 states and the no-provider state, off board `556:6373`. The page, the tab strip and their stories are deleted |
| **The unavailable region has no route out** | The addon catalogue tells you Redis can go in a stack as a container and gives no way to get there. A link would leave the drawer mid-journey, which is a navigation decision that has not been designed. Open |
| **The semibold sweep** | §6 is settled — two weights, 400 and 500 — and the drawer is conformant. **Roughly sixty call sites across ~40 files still ship 600**: dialog and card titles, table headers, status pills, stage badges, empty states, the editor's timeline. The ones to look at rather than replace are where 600 sat beside 500 **at the same size**, which is the only place the drop collapses two lines into one weight. Open |
| **The addon journey** | It still carries a `Cancel` and a description on step one, and a `Cancel` on step two. Every rule above was settled on `New stack` and applies to it equally — a rule that holds on one of two journeys is not a rule. Open |
| ~~`Cancel` on the one-phase drawers~~ | **Settled — see §13.** The argument was remade rather than inherited and landed the same way: the question is not how many exits there are, it is what `Cancel` offers to undo, and before the primary is pressed the answer is nothing. Off `New secret` and `New preview environment` first; `Add cluster` and `Add domain` lost theirs when they stopped being dialogs |
| **The board's other four step-2 frames** | `A repository`, `A compose file`, `Building blocks`, `A blank canvas` still show the old naming and a `Cancel`. The code went ahead of them because five starting points share one footer. Open |
| **A journey's header band changes height between steps** | Measured 16 Aug 2026 on `Add image registry`: **95** on step one, **73** on step two, because §13 gives step two no description. `Connect git provider` does the same, so it is a pattern and not one screen's bug — but §13 fixes the **width** for a whole journey on the grounds that a change reads as a different surface opening, and says nothing about the height. Open |
| **Figma's Button is fixed-width** | All 50 variants are `FIXED` at 80, so switching **either** icon boolean on overflows the label — pre-existing, not introduced by the trailing slot. Hugging would reflow every Button instance on the board, so it is a decision, not a fix. Open |
| **The sheet header band is two numbers** | §12a says **64 single / 108 double at a 16 inset**. The board's own list-page template (`411:7765`) ships **100 at a 12 inset**, and every frame cloned from it — the whole previews section — carries 12/100. One of the two is stale, and the arithmetic in §12a's centreline note is the tiebreak. Open |
| **The drawer title sits on two rungs** | The `Drawer` component and every older built drawer use `head/500` (20). Both previews drawers were taken to **`title/500`** (16) by Jaseem, on the same reasoning §6 used for the page title: a title is chrome, not a headline. Whether that becomes the component's rung is undecided. Open |
| ~~Previews on the board~~ | **Built.** Six frames and two drawers, section `655:7536`, reviewed and approved. Code plan in `docs/design/previews-implementation-plan.md`. Not yet written |

---

## Gotchas that cost real time

| Gotcha | |
|---|---|
| **Tailwind silently drops `shadow-[…]` behind a variant** | `focus-visible:shadow-[var(--x)]` is read as a shadow **colour**, not a shadow, so the geometry vanishes and it renders transparent. The `shadow-[shadow:var(--x)]` type hint fixes the ambiguity but is then not extracted at all in some builds — the class lands on the element, `:focus-visible` matches, the variable resolves, and **no rule is ever generated**. It worked in the dev server and failed in the Storybook build. The focus rings are therefore plain unlayered CSS classes, not utilities |
| **Unlayered CSS beats `@layer utilities`** | Which is what stops `active:shadow-*` overwriting the focus ring and eating it mid-press. Anything that must survive a utility goes outside the layers |
| **A `border-b` participates in layout** | It pushed the sheet header from 108 to 109 and moved every row below it. Figma's stroke is align=INSIDE; the CSS equivalent is `box-shadow: inset 0 -1px 0` (`.sheet-edge-b`), which costs the layout nothing — the same reason the sheet's own edge is an `outline` (§12a) |
| **tailwind-merge and named sizes** | It classifies any unfamiliar `text-*` as a **colour**, so `cn("text-body","text-fg-2")` silently drops the size and the element falls back to 16px. `cn` registers the scale as a `font-size` group in `frontend/src/lib/utils.ts`. **Any new named utility that shadows a Tailwind prefix must be registered there too** |
| **Tailwind misses new files** | A file created while the dev server is running is skipped by the scan — arbitrary classes produce no CSS at all. `touch src/index.css` to force a rescan |
| **`:active` fires while `:hover` is true** | A press that only sets a shadow will still inherit the hover fill and get *lighter*. Set the pressed fill explicitly |
| **Text nodes are not elements** | They cannot be transformed or matched by `:first-child`. The Button wraps its children for exactly this reason |
| **`max-height: 0` cannot shrink a box below its own padding** | A collapsed group label kept 12+4px in the flow and pushed every group below it out of rhythm. Collapse the padding with the height |
| **A flex `gap` still reserves space around zero-width children** | And `ml-auto` absorbs the free space centring needs. Both knocked collapsed glyphs off the icon column |
| **shadcn's sidebar hides a collapsed group label with `-mt-8`** | It stays in flow and is yanked upward. Stacking your own collapse on top of that double-counts. Removed — collapsing the label is the consumer's job |

## Gotchas — writing to Figma

| Gotcha | |
|---|---|
| **A bound variable does not drive the render; the raw paint colour does** | `setBoundVariableForPaint` on a paint built from some placeholder hex leaves that hex rendering, while the data reads correctly as `var:surface/control`. **Build the paint from the variable's own value, then bind.** This is why a screenshot can disagree with an inspection |
| **A `DROP_SHADOW` follows the node's alpha** | So a transparent `ghost` variant casts no focus ring at all. Use a 2px OUTSIDE stroke where the node has no other stroke, and the shadow-ring only where a hairline must survive (a node has one `strokes` array) |
| **Component sets are often auto-layout** | Explicit `x`/`y` on variants is silently ignored, and resizing the set **stretches any FILL-sized child** — it grew the Account block's variants from 216 to 320. Set `layoutMode = 'NONE'` before authoring a variant grid |
| **Figma has no stroke offset** | `outline-offset: 2px` cannot be drawn. Ring it at spread/weight 2 and note that the offset lives in code |
| **A drop shadow does not reliably render on a `COMPONENT` or `INSTANCE` node** | Two side-by-side probes had it paint on a plain `FRAME` and not at all on either; a later variant contradicted that, so treat it as unreliable rather than impossible — either way, do not depend on it. Phase 1 drew every focus ring as a spread-2 shadow, so **12 focus variants were invisible on the board and nobody could see why**. The fix is a **child frame** matching the host exactly — same size, radius, fill and hairline — whose only job is to cast. Give the host `clipsContent = false` or the ring is trimmed |
| **Figma paints the LAST effect on top — the reverse of CSS** | A two-stop ring authored in CSS order (`gap, ring`) draws the spread-4 ring **over its own gap**. On a light face you cannot see the difference; on a **dark** one it reads as no ring at all, which is exactly where the gap is the only signal. Author `[ring, gap]` in Figma and `gap, ring` in CSS |
| **`node.effects` returns a fresh array every read** | So `effects.map(e => e === effects[0] ? … : …)` never matches — the identity check compares against a new clone. Author the whole array; do not patch it by reference |
| **An attribute selector cannot hold a space** | `query('TEXT[name=last change]')` silently matches **nothing** — no error, no result. Rename the layer without spaces, or walk `children` |
| **`visible = false` inside auto-layout removes the node from the flow** | So a sibling set to FILL swallows its width and the row reflows. Where the slot must stay reserved — a hover-only action, for instance — use `opacity = 0` |
| **Clone before you clear** | `const t = kids[0]; kids.forEach(k => k.remove()); t.clone()` throws *"node does not exist"*. Take the clones first, then empty the container |
