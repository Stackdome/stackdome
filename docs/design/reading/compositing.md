# Compositing — Layered Shadows

## Source

**Interface Craft** by **Josh Puckett**, section *Compositing* → **Layered
Shadows**. Shared by Jaseem, 2026-08-23. Fully legible; quoted verbatim.

> *"In the real world, when objects have shadows they have **two parts**. The
> first is a **tight, dark edge** where the object contacts the surface it's
> resting on. The second is the **wider, ambient falloff** from whatever light
> source is present. A single shadow can only produce one blur, so while it
> might look fine in some cases, it never looks quite as good as stacking
> shadows. These feel more realistic and detailed. Some libraries, like
> Tailwind, do this automatically with their shadow classes. If you're not using
> one, it's a good idea to define a few sizes of shadows using this technique."*

The demo is two identical cards side by side, `Refined` off then on. The
right-hand card gains a visibly tighter, darker seat at its base while the
ambient pool widens.

## The model

| Layer | Offset & blur | Ink | Job |
|---|---|---|---|
| **Contact** | tight — small offset, small blur | **darker** | Seats the object on the surface |
| **Ambient** | wide — larger offset, large blur | **softer** | The light source's falloff |

**The load-bearing word is "dark".** The contact layer is not simply a smaller
copy of the ambient one — it is the *darker* of the two. That is what reads as
weight sitting on a surface rather than as a glow underneath it.

## The audit

Run 2026-08-23 on `frontend/src/index.css`.

### Light

| Token | Layers | Ink, outer → inner |
|---|---|---|
| `--shadow-sm` | **1** | 0.035 |
| `--shadow-md` | 2 | 0.06 → **0.035** |
| `--shadow-lg` | 2 | 0.11 → **0.06** |
| **`--shadow-2xl`** | **1** | 0.14 |
| `--shadow-toast` | **3** — `lg` + a layer | 0.11 → 0.06 → **0.10** |
| `--shadow-region` | 2 | 0.11 → 0.06 |

### Dark

| Token | Layers | Ink |
|---|---|---|
| `--shadow-sm` | **1** | 0.45 |
| `--shadow-md` | 2 | 0.55 → 0.4 |
| `--shadow-lg` | 2 | 0.7 → 0.55 |
| **`--shadow-2xl`** | **1** | 0.7 |
| `--shadow-toast` | 2 — aliases `lg` | — |
| `--shadow-region` | 2 | 0.7 → 0.55 |

### Three things this shows

**1. We stack already — the technique is not new to us.** Four of six values in
light carry two or more layers, and §5's ladder was built that way.

**2. Our tight layer gets LIGHTER, where the article wants it darker.** Every
stacked rung runs the same direction — `md` 0.06 → 0.035, `lg` 0.11 → 0.06, and
the same in dark. **We are stacking two ambient falloffs, not a contact plus an
ambient.**

The two layers do overlap at the edge, so our edge is genuinely darker than the
falloff. It is not wrong. But the *tight* layer contributes the smaller share of
that darkness, which is the inverse of the model above.

**3. The toast is the one place we did it his way, and it was Jaseem's call.**
`--shadow-toast` is `lg` plus `0 2px 6px -1px rgba(16, 20, 26, 0.10)` — a tight
layer at **0.10**, nearly double `lg`'s own inner layer at 0.06. The session log
for 16 Aug is titled *"the toast's contact shadow, taken."* **We found this
independently, on one component, and never generalised it.**

### And one place we already answered him

Dark's `--shadow-toast` aliases `lg` — no contact layer — with the reasoning in
the file:

> *"A contact shadow works by darkening the ground right at the edge, and dark's
> ground is already near-black — adding one moved the toast's edge by nothing at
> all (1.44 / 1.32, both unchanged). Dark carries its edge on the hairline
> instead."*

**Measured, not assumed.** The article's model is a light-ground model; on a
near-black ground the contact layer has no contrast left to spend. That is a
real limit on his advice and we already have the numbers for it.

### The actual gap

**`--shadow-2xl` is a single layer in both themes** — one blur, `0 28px 64px
-20px`, no contact at all.

It is the rung for the things that float furthest, and it has these callers:

| Caller | |
|---|---|
| `ui/dialog.tsx` | Every dialog |
| `ui/alert-dialog.tsx` | Every destructive confirm |
| `ui/drawer.tsx` | **Every drawer** — and §12a puts most of the product's object editing on the drawer |

`shadow-sm` is single-layer too, but that is defensible: it is `0 1px 2px`, which
*is* a contact shadow, at a scale where there is no ambient falloff to add.

**`2xl` has no such excuse.** The biggest, softest shadow in the product — the
one with the most ambient and therefore the most need for something to seat it —
is the only large rung with nothing tight underneath it.

## Against ours

| The source says | Ours | Verdict |
|---|---|---|
| Shadows have two parts, contact and ambient | §5 — four rungs, most of them two-layer | **Confirms the practice, and names the model we were missing.** §5 explains *which rung to use*; it never says what a shadow is made of |
| The contact layer is the darker one | Every stacked rung runs lighter as it tightens — except the toast | **Contradicts, quietly.** Worth a look at `md` and `lg`, not a sweep |
| A single shadow *"never looks quite as good"* | `--shadow-2xl` and `--shadow-sm` | **`2xl` is a real gap.** `sm` is fine — it is the contact layer, alone, by design |
| Tailwind does this for you | We overrode Tailwind's eight names down to four explicit values | **Confirms the direction** — §5 rejected the eight names because *"a name that promises a choice it cannot deliver is worse than no name"* |
| — | Dark's measured refusal of a contact layer | **We are ahead of the source here.** His model assumes a light ground; ours has the measurement for what happens when the ground is already near-black |

## Rules extracted

**E1 and E2 landed 23 Aug 2026** — see §5, *"Every rung is a contact layer plus an
ambient one"*.

| # | Rule | Status |
|---|---|---|
| **E1** | **A shadow is a contact layer plus an ambient layer, and the contact layer is the darker of the two.** The model §5 always implied and never stated | **`→ §5`** |
| **E2** | **`--shadow-2xl` needs a contact layer** — and so did `sm`, which was the worse of the two at 1px of reach | **`→ §5`.** Jaseem took **candidate C** for both, not B: `sm` edge 2.0 → 6.0, `2xl` 15.9 → 31.0 |
| **E3** | **Re-check the ink direction on `md` and `lg`.** Both run lighter as they tighten; the model wants the reverse | `proposed` — deliberately not swept with E1/E2. A judgement for the running app |
| **E4** | ~~A contact layer is a light-ground technique.~~ | **`rejected` — measured wrong.** See below |

### E4 was wrong, and the note it came from was right

E4 read the stylesheet's dark-toast comment — *"a contact shadow works by
darkening the ground right at the edge, and dark's ground is already
near-black"* — as a rule about the dark theme, and proposed writing it down so
nobody undid it.

**Measured at the other rungs, the same layer does buy contrast in dark:** `sm`
edge 2.9 → 5.1 (reach 2px → 9px), `2xl` edge 6.9 → 11.1.

The original toast measurement is not in doubt — it moved that edge by **zero**.
**It was measured on `lg` under a toast, and the sentence generalised further
than the measurement did.** Its scope is now narrowed in `index.css` rather than
deleted, because the measurement that produced it is still the measurement.

> **The lesson is about wording, not shadows.** A finding taken at one geometry
> was written as a fact about a theme, and it nearly stopped two rungs from being
> fixed. **Record what you measured, and where.**

## Open

- **`Interactions & State Design`** is still the unshared one from the series
  footer. This *Compositing* section suggests the library has more sections than
  that footer chain exposes.
