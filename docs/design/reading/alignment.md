# Layout & Alignment

## Source

Shared by Jaseem, 2026-08-23, as two full-page screenshots of the same article —
one with the alignment-guide overlays **off**, one with them **on** ("before /
after refinement"). Sidebar structure: *Alignment Methods* (Edge, Axis, Baseline,
Mathematical, Optical) → *Principles* → *Common Scenarios* (Navigation, Buttons,
Containers, Content Lines, Forms).

> **Fidelity warning.** The screenshots render ~3024px wide down to ~313px. The
> headings, the diagrams and the principle bullets are legible; **the body
> paragraphs are not.** Everything below marked ⚠ is read off a diagram, not off
> the source's own words. **Get the URL and re-read before any of this becomes
> law.**

## What it says

### The five methods

The source's central move is naming alignment as **five distinct methods**, not
one. Each aligns a different invisible thing.

| Method | Aligns | The invisible thing | Shown against |
|---|---|---|---|
| **Edge** | Bounding-box edges — left, right, top, bottom | A **line** | A card of copy with a button; the most common method |
| **Axis** | Centres, on a shared centreline | An **axis** | A mirrored icon cluster — symmetric shapes only |
| **Baseline** | Text baselines | A **baseline** | A text label against another text element |
| **Mathematical** | Computed values — padding, ratio, equal numbers | A **calculation** | A button inside a card, sharing the card's inset |
| **Optical** | What *looks* balanced | Nothing — it is the correction | `Publish →`, where the arrow's mass pulls the label off centre |

**Optical is described as the corrective method**, reached for when a shape is
asymmetric (an arrow, a play triangle, a glyph with weight on one side) and the
mathematically-centred result reads wrong. ⚠

### The principles

Three, in the source's own order:

1. **Reduce the number of invisible alignment lines, edges, axes and baselines
   in an interface.**
2. **Optimise for things feeling balanced over being mathematically consistent.**
3. **Reduce the number of alignment *methods* used in any one screen.**

**Principle 1 is the one we do not have.** See below.

### The scenarios ⚠

Five worked examples, each shown twice — guides off, then guides on. Read off the
overlays only; the accompanying prose is illegible at this resolution.

| Scenario | What the overlay appears to show |
|---|---|
| **Navigation** | A sidebar's icon column and label column each generating their own line; the refinement collapses them |
| **Buttons** | `Publish →` — the arrow overhangs the mathematical box so the label reads centred |
| **Containers** | An amount-picker grid; alignment taken from the **container's** edge, not from the content inside it |
| **Content lines** | Icon / title / subtitle / trailing rows — title and subtitle sharing one left line, trailing on one right line |
| **Forms** | Label, field and helper on a single left edge |

## Against ours

| The source says | Ours | Verdict |
|---|---|---|
| Optical beats mathematical | §8 *"Optical alignment is the top rule and it beats the ladder"*; §9 *Optical padding*; §2 *measure, don't eyeball* | **Confirms.** We arrived here independently and went further — we have the numbers (`icon side = base − 3`, `label side = base + 2`) |
| Mathematical alignment is a named, legitimate method | §8's ladder, §11's *"a width stated twice"* | **Extends.** We have only ever treated a computed width as a **bug source**. The source treats it as a method with a correct use — a control taking its parent's inset. Worth the distinction |
| Reduce invisible alignment lines | — | **New.** §8 says *fields fill their cell*, and the addon-drawer measurement (five trailing edges → two) is exactly this principle applied. **But we never stated it, so we only ever fixed it where someone happened to measure** |
| Reduce alignment *methods* per screen | — | **New.** Nothing in `DESIGN-PRODUCT.md` counts methods |
| Baseline alignment as a method | §8 *"a row of field, field, value has one baseline"*; §6's 13px anchor | **Confirms**, narrowly. We use the word; we have never made it a method you choose |
| Axis alignment | — | **New vocabulary, no gap.** We do centre things; we have never needed the word |
| Container alignment comes from the container | §8 *"the grid enforces the fill, not the call site"* | **Confirms.** Same principle, stated as ownership rather than as geometry |

## Rules extracted

| # | Rule | Status |
|---|---|---|
| **A1** | **Count the alignment lines.** A screen's alignment quality is measured by *how few* invisible lines it generates, not by whether each element sits on one. Two edges beat five correct ones. Applies to the audit harness: `.measure.mjs` should be able to report the distinct x-edges on a surface | `proposed` |
| **A2** | **One screen, fewest methods.** Where edge alignment and axis alignment both work, pick one and use it throughout. Mixing methods creates lines the eye has to reconcile | `proposed` |
| **A3** | **Near-alignment is worse than no alignment.** Already half-stated in §8 — *"two of them 9px apart; near-alignment reads as a mistake, not a choice"*. Promote it from an observed measurement to a stated rule | `proposed` |
| **A4** | **Mathematical alignment has one correct use: inheriting a parent's inset.** Everywhere else — a header cell computed to match a control, a hand-typed width — it is the *"width stated twice"* bug §11 already names | `proposed` |
| **A5** | **Adopt the five-method vocabulary.** Edge / axis / baseline / mathematical / optical, so a critique can say *which* method a thing is failing at instead of "it looks off" | `proposed` |

## Open

- **Get the article URL.** Everything ⚠ above is inferred from diagrams.
- **The audit A1 implies has not been run.** Counting the distinct alignment
  lines on the sidebar, the drawer, a detail section and the canvas card is the
  measurable version of this source, and it is not done.
