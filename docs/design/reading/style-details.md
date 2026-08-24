# Style Details

## Source

Shared by Jaseem, 2026-08-23, as three full-page screenshots of the same article
with its demo toggles in different positions. Same series as
[Layout & Alignment](alignment.md) — the footer links `← Layout & Alignment` and
`Color Details →`, so **at least one more is coming.**

Sections: *Borders · Iconography · Controls · Corner Radius · Materiality · Fills
· Strokes*.

Legible at this size, including body copy. Quotes below are the author's.

**Status: learning only.** Jaseem, 2026-08-23: *"no actionable item now, but
learn the stuff I shared."* Nothing here is queued.

## The big idea

> *"Beyond these specific details, the big idea is simply to use **consistent
> styling** throughout your app's interfaces. This is the biggest tell between
> something that's considered, or something that's quickly thrown together."*

And the framing for the whole piece:

> *"They're not hard and fast rules, but more often than not you'll want to
> follow them."*

**The seven sections are not seven topics. They are seven *axes of consistency*,
and the article makes the same move on each one:** pick one value for the axis
and hold it across the cluster.

| Axis | The one value |
|---|---|
| **Border** | How a line is drawn — solid, or transparent |
| **Iconography** | Fill vs stroke, stroke width, corner radius of the glyph |
| **Controls** | Whether a control carries a bounding shape |
| **Corner radius** | The overall *roundedness register* of a screen |
| **Materiality** | Flat, or material — never both in one toolbar |
| **Fills** | Filled, or unfilled |
| **Strokes** | Whether components carry a hairline at all |

### The diagnostic — inconsistency reads as a BUG

This is the sharpest thing in the piece, and it is repeated in four sections:

| Section | The author's words |
|---|---|
| Controls | *"it reads inconsistently and a bug that the back control doesn't have a shape"* |
| Corner radius | *"the interface reads sloppy as a result"* |
| Materiality | *"This again reads as inconsistent on a visual bug"* |
| Strokes | *"reads as inconsistent, like a bug"* |

**The user does not read a mixed axis as ugly. They read it as broken.** That is
a different and much higher-stakes claim than "be consistent", and it is why the
author treats these as defects rather than as taste.

## What it says, section by section

### Borders — draw them transparent, never solid

> *"When you implement a border as a solid color, it looks great in some
> situations, but when you then add things like shadows or backgrounds, it more
> often than not looks muddy or blurry."*
>
> *"The fix for this is to implement borders as either transparent outlines or
> box-shadows so that the border picks up whatever is behind it. This way, you
> ensure it always looks crisp and has appropriate contrast in all situations."*

The demo is a task card with three independent toggles — **Refined**,
**Background**, **Shadow** — so you can watch a solid border fail specifically
when a background or a shadow is introduced behind it. On a plain grey ground the
solid border looks fine; over the gradient it goes muddy.

**Second claim, about images:**

> *"If you're not using pure white backgrounds, and you want a little more
> contrast between an image and the background, use an **inset border** with a
> subtle opacity to help define it in a nice, subtle way."*

### Iconography — one style, no mixing

> *"Something that immediately jumps out to me as careless is when an app or
> interface shows icons that mix things like **fill style, corner radius, or
> stroke width**. Easy fix: just pick a single style and stick to it."*

Demo: a three-row list where one glyph is filled and the others are stroked.

**Note the three sub-axes.** Fill style is the obvious one; **stroke width** and
**the glyph's own corner radius** are the two that get missed, because they
survive a "we only use one icon set" check.

### Controls — the bounding shape is all-or-nothing

> *"the controls on the right of the navigation bar use a visual bounding shape.
> That is a styling choice; it would work just as well without, but in this
> theme, it reads inconsistently and a bug that the back control doesn't have a
> shape."*
>
> *"It would look just as good if the visual language was that only primary
> actions receive a shape, but since the ··· button is bounded, we should bound
> the back icon as well."*

Demo: an iOS nav bar — `‹` bare, `···` and `Share` bounded. Refined gives `‹` a
shape too.

**The escape hatch he names and then closes:** *"only primary actions receive a
shape"* would have been a legitimate rule — but `···` is not a primary action and
it is bounded, so that rule is not the one this interface is following. **The
rule has to be one you can state; if the exceptions don't fit it, it isn't the
rule.**

### Corner radius — the register, not just the concentric maths

> *"You are probably familiar with the memed-to-death 'concentric border radius'
> tip, but another area where this jumps out is in the **overall roundedness** of
> interface elements."*
>
> *"The button is fully rounded, and the add variable control has generous
> rounding as well. Because of this, the rounding of the select states and the
> checkbox control feel inconsistent and out of place."*
>
> *"we use the same radius for the active state of rows as the add variable
> control, and fully rounded the checkbox elements."*

Demo: an `Add variable` panel of API-key checkboxes over a fully-rounded
`Add to prompt` button. The fix rounds the row's active state to match the panel,
and takes the **checkbox to fully round**.

**This is explicitly a second rule sitting beside concentric radius**, not a
restatement of it. Concentric asks *what radius does this child take inside that
parent*. This asks *how round is this screen*, and answers it once for everything
on it.

### Materiality — one material per surface

> *"the dominant effects are using materiality and light on the controls (a quick
> liquid glass-type effect). But the share icon uses a flat style with no
> materiality, and very increased elevation. This again reads as inconsistent on
> a visual bug. It's **merging two entirely different aesthetics into a single
> toolbar**. The flat button is nice, but doesn't feel at home."*

Demo: a photo toolbar in glass, with one flat white elevated button at the right
end.

**"The flat button is nice, but doesn't feel at home"** — the rejected element is
not bad in itself. Quality is not the test; **belonging** is.

### Fills — secondary can be filled and still read secondary

> *"the secondary button treatment jumps out to me. Everything else is using a
> consistent filled styling. Similar to iconography, I think this interface would
> look better if it was consistent and used a **filled style, even while
> remaining clearly secondary**."*

Demo: a form of filled selects and inputs, footed by an **outlined** `Back` and a
filled `Continue`. Refined fills `Back` in grey.

**The load-bearing clause is "even while remaining clearly secondary".** The
hierarchy is carried by the *value* of the fill, not by the presence of one.
Reaching for an outline to say "secondary" spends an axis that the rest of the
screen has already set.

### Strokes — a stroke on one component is a bug

> *"Sometimes an interface feels very detailed because all of the controls have
> strokes or hairlines, but in this example, the toolbar shown is a very
> restrained flat style. The presence of a white stroke on the user's avatar
> reads as inconsistent, like a bug. Removing it would make it feel harmonious
> with everything else."*

Demo: a flat search bar and `Invite` button, beside an avatar carrying a white
ring.

**Both directions are valid** — all-stroked reads as *detailed*, none-stroked
reads as *restrained*. Only the mix is wrong.

## Against ours

| The source says | Ours | Verdict |
|---|---|---|
| Borders transparent, never solid | §4 *"Grounds are solid, marks are alpha"*. `--border: rgb(var(--line-ink) / 0.11)` — every rung is already alpha over a derived warm ink | **Confirms, and we went further.** We not only made them transparent, we *solved* for the ink so the composite matches the board exactly |
| Or draw them as box-shadow | §4's outline rule — `outline: 1px solid`, `strokeAlign = OUTSIDE` | **Confirms.** Same goal (costs the layout nothing, sits outside the box); we picked `outline` over `box-shadow` |
| Inset border on images, subtle opacity | — | **New.** No image-outline rule exists in `DESIGN-PRODUCT.md` |
| Icons: one fill style, one stroke width, one glyph radius | §7 *"a glyph earns its place by making a distinction the word cannot"* | **Extends.** §7 governs *whether* to use a glyph. Nothing governs whether the set is stylistically uniform — we lean on "we use lucide" to cover it, which the article says is not the same check |
| Controls: bounding shape is all-or-nothing per cluster | §9 *Shape says what kind of action this is* (`flat` / `pill`), §9 *one filled button per page* | **Extends.** Ours are rules about *which* shape; this is a rule about *mixing* within one row |
| Roundedness is a per-screen register | §8 *"Radius is a function of HEIGHT"* | **Tension worth naming.** Ours is purely size-derived and deliberately so — *"anything the same height takes the same radius"*. The article's claim is orthogonal and could pull against it: a 22px chip at `xs` beside a `full` pill is correct by our rule and might read wrong by his. **Jaseem's call, not raised** |
| One material per surface | §5 *"content is flat"* + the one exception (a selected segment); §5's four shadows | **Confirms.** The exception is already narrowly drawn |
| Secondary should be filled, not outlined | §9 — board `secondary` = code `outline` = **`control` fill + hairline**; §3 *a field and a control share one fill* | **Already right, for a reason we discovered the hard way.** Our `outline` is *filled and* stroked, and §9 records that the unstroked `secondary` renders *"an edgeless blob"* because `control` is only 2% off white. The article's refined state is what we already ship |
| A stroke on one component reads as a bug | §4's rungs; the open task *"`Avatar` is stroked INSIDE, inside the `Sidebar`"* | **Confirms, and lands on an open item.** That task is currently filed as *the stroke is drawn on the wrong side*. The article raises a prior question: **should that avatar carry a stroke at all** |

## Rules extracted

Nothing queued — see the status note at the top.

| # | Rule | Status |
|---|---|---|
| **S1** | **A mixed axis reads as a bug, not as a style.** The seven axes above each take one value per cluster. This is the frame the other rules hang off | `proposed` |
| **S2** | **The rule has to be one you can state.** If a proposed rule ("only primary actions get a shape") doesn't explain the exceptions on screen, that isn't the rule the screen is following — it is a defect wearing a justification | `proposed` |
| **S3** | **Belonging beats quality.** A well-made element in the wrong material is still wrong. *"The flat button is nice, but doesn't feel at home"* | `proposed` |
| **S4** | **Icon uniformity is three checks, not one:** fill style, stroke width, glyph corner radius. "We use one icon set" does not cover it | `proposed` |
| **S5** | **Hierarchy rides on the value of a fill, never on its presence.** Do not spend the fill axis to say "secondary" when the screen has already set it | `proposed` — we ship this already; worth stating so it isn't undone |
| **S6** | **An image on a non-white ground takes an inset hairline at low opacity.** The only genuinely absent rule in this piece | `proposed` |
| **S7** | **Roundedness may be a per-screen register, not only a per-height function.** Sits in tension with §8. Do not act on this without Jaseem | `proposed` |

## On borders — Jaseem's note

> *"we are struggling in the style details I think especially with the borders"*

Recorded, not solved. What the reading actually shows, for when this is picked up:

**The article's technique is not our gap.** Its whole fix — *make the border
transparent so it picks up what's behind* — is already in `index.css` at every
rung, derived rather than picked. On the axis the article measures, we pass.

**What we have that the article doesn't is conditional logic.** A line's rung is
decided by three questions stacked on each other:

| | |
|---|---|
| **Which rung** | `subtle` 6% / `border` 11% / `strong` 18% |
| **Which mechanic** | `border` (inside, costs layout) or `outline` (outside, costs nothing) |
| **Which exemption** | §4's 23 Aug amendment — *anything already separated by a shadow drops to 6%* |

Three independent decisions, and the amendment cuts across the other two. The
open task *"the hairline is an outline"* is `[~]` with `card` and `select` left,
which means **the product is mid-conversion and rendering both mechanics right
now.** That is the likeliest source of the struggle: not the wrong technique, but
a half-applied one plus a decision tree that has to be walked per element.

**Not investigated.** No measuring was done for this note.

## Open

- **The article URL**, same as for [alignment.md](alignment.md) — the quotes here
  are transcribed from screenshots and should be checked against the source.
- **`Color Details` is the next in the series** per the footer.
