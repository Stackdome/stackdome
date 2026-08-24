# Color Details

## Source

Shared by Jaseem, 2026-08-23, as before/after full-page screenshots. Third in the
series — footer links `← Style Details` and `Typography Details →`, **so one more
is coming.**

Sections: *Tonality · Perceived brightness · Shades · Gradients · Easing
gradients · Blending modes*.

> *"Color has a huge impact on the feeling of your product. Beyond the brand
> connotations, there are a bunch of small details that help something just feel
> really great compared to whatever a default framework or coding agent spits
> out."*

**Jaseem, 2026-08-23: *"this also we need to improve."*** Recorded as a direction,
not a queued task. One measurement was taken — see *Perceived brightness* below.

## What it says

### Tonality — pick a temperature and use it everywhere

> *"Tone refers to the temperature of a color... Imagine a bucket of white paint.
> If you add a drop of red, it'll become a warm white. Or if you add blue, it
> becomes a cool white. This works the same in interfaces, and is **particularly
> important when it comes to your neutrals** (whites, greys, blacks)."*
>
> *"A mistake I often see (largely due to LLM's sloppiness) is to **mismatch
> tones**... the dominant tones are warm, but a few elements (the body copy and
> the CTA background) are cool. This is a bit unsettling and feels slightly off."*
>
> *"The rule of thumb here is to **pick a temperature and use it everywhere**."*

Demo 1: an `Invite your team` card on warm beige, whose CTA and body copy are
cool. The refined state warms them.

**Then the technique that matters most in the whole piece:**

> *"this segmented control sits on a slightly cool background, but the fill is
> perfectly neutral... One tactic I often use — rather than declare another
> color, I just **use my primary neutral color at a lower opacity, say 10%**.
> That way, it picks up the tone of the color behind it in a subtle way that
> almost always looks good by default."*

Closing note: Tailwind's colour objects are consistently tinted, so *"if I want a
warm app, I might use the `stone` family, and select just 3 neutral colors from
that."*

### Perceived brightness — same lightness, or one colour shouts

> *"When you put colors next to each other, one of the things you immediately
> notice is how bright one appears compared to the other. This is called
> perceived brightness. Sometimes this might be intentional... But most often,
> **you want all your colors to appear the same**."*
>
> *"OKLCH is a color model designed to make it easier to work with this idea...
> by default, the blue colors feel brighter, even though they have the same
> Lightness values **in HSL** as all the other ones. To fix this, we can use
> OKLCH to keep the same hue but normalize them to the same Lightness."*
>
> *"if they appear in close proximity, we don't want to **unintentionally
> communicate importance** by having one color brighter than the other."*

Demo: a swatch row normalising, then a stats sentence — *"You've walked 15,423
steps, burned 2,432 calories..."* — where each figure is a differently-coloured
token. Before, one token pulls the eye. After, they read as peers.

### Shades — chroma goes UP as a colour darkens

> *"Often, just turning down the lightness will get you something that works. But
> this also sometimes feels like it loses some color as well, resulting in a more
> muted result."*
>
> *"A trick I like to use here is to **subtly tweak the hue and increase the
> chroma as the color darkens**. This means that my darker colors feel more rich.
> ...whenever you see a color palette that just feels very rich and saturated,
> that's what is happening under the hood."*

### Gradients — `in oklch`, one word

> *"you can think of each stop on that gradient as a path on the colorspace
> between the start and end points. By default in CSS and most drawing tools,
> this path is **linear**. But that often results in muddy gradients, especially
> when your two colors sit far apart in terms of hue."*
>
> *"On the web, you can add in a simple fix, **`in oklch`**. This tells the
> gradient to travel through perceptual curves between the two end points. The
> result is a much richer and more dynamic gradient."*

```css
/* muddy through the middle */
linear-gradient(90deg,        #4A5BF0 0%, #E85FA8 100%)
/* rich */
linear-gradient(90deg in oklch, #4A5BF0 0%, #E85FA8 100%)
```

### Easing gradients — the horizon line in an overlay

> *"By default, gradients sample stops at an **equal rate**. In many cases though
> (especially with dark overlays), you can see a visible **horizon line** where
> the gradient stops. Even though the gradient is mathematically 'correct'... it
> doesn't feel right."*
>
> *"The trick is to use an easing curve when sampling the color points.
> Unfortunately, there's no built-in CSS property for this (yet), but it's not
> too bad to roll your own."*
>
> *"The place I always see this is **overlays**... You can see where the black
> 'stops' just under the icon. By easing the gradient, that line dissolves."*

Output is a plain `linear-gradient` with ~15 hand-computed `rgba` stops. He also
points at **Andreas Larsen's `easing-gradients`** to generate them.

### Blending modes — when opacity isn't enough

> *"using opacity is a great way to match the tone of a color. But many times,
> especially when wanting a more rich or vibrant result, **blending modes offer a
> better approach**."*

| Mode | For | Caveat |
|---|---|---|
| **`plus-lighter`** | A brighter, more saturated **foreground on a colour ground**. White at 50% reads *flat*; the same white with `plus-lighter` reads vibrant | — |
| **`plus-darker`** | The inverse of black-at-low-opacity, without the desaturation | **WebKit only** — not Chromium. His workaround is to read the implied values off Figma and hardcode them |

Demo: a `Working Knowledge` book cover on orange; and six pastel tiles whose
black-at-50% circles read muted next to their blended peers.

## Against ours

| The source says | Ours | Verdict |
|---|---|---|
| Pick one temperature, especially for neutrals | §3 *Dark grounds — one hue, one chroma*: *"every ground in dark sits at chroma ~4, hue ~85. **One warmth for the whole screen**"* | **Confirms, almost word for word.** And we have the war story: `--input`, `--control`, `--popover` and `--accent` had escaped to chroma 10–12.5 and *"every field, select and menu read khaki"* |
| Use the primary neutral at ~10% instead of declaring a new colour, so it picks up what's behind | §4 *Washes and selection are ink tints, never picked greys*; the whole `--line-ink` derivation; §4's 6/11/18 ladder | **Confirms, and we went further.** He says *say 10%*; we solved for the ink so the composite is exact, and we have three rungs with a stated job each |
| Pick 3 neutrals from one tinted family | §3's five-rung ground ladder | **Confirms**, we just use five |
| Normalise colours to one OKLCH lightness so none shouts | §3 *OKLCH in the code*; the state tokens carry the measurement in a comment | **Confirms — and we pass on states, fail on charts.** Measured below |
| Raise chroma as a colour darkens, for richness | §3 *one hue, one chroma* | **Not a contradiction, but worth knowing the difference.** Ours governs **neutral grounds**, where holding chroma flat is the point. His governs **chromatic ramps**, which we have in `--chart-*` and the state pairs. The two rules do not meet today because we have never built a ramp |
| `in oklch` on gradients | — | **New, and nearly free.** We have **3 gradients in the whole product** (`index.css`, `not-found.tsx`) |
| Ease a gradient to kill the horizon line | — | **New, and we have no use for it.** No dark image overlays anywhere |
| `plus-lighter` / `plus-darker` | — | **New, and out of range.** Both want a saturated colour ground; §7 keeps orange nearly off the product |

### The measurement

The one check worth running from this piece — **are our colours normalised in
OKLCH lightness?** Run 2026-08-23:

| Set | L spread | |
|---|---|---|
| **State ink, light** — success / warn / danger / info | **2.1** | Fine |
| **State ink, dark** | **0.2** | The file already says *"all four sit at L\* 77"* |
| **Chart, light** — `--chart-1…5` | **6.8** | ✗ |
| **Chart, dark** | **7.0** | ✗ |

**The states were done deliberately and it shows. The chart palette never was.**

| | Light | Dark |
|---|---|---|
| `--chart-4` (amber) | **L 61.8** vs a 55–58 field | **L 77.2** vs a 70–75 field |
| `--chart-1` (blue), dark | — | **L 70.2**, the dim end |

**Amber is the loudest series in both themes, and blue the quietest in dark** —
a ~7-point spread, which is the exact failure the article names: *"unintentionally
communicate importance by having one color brighter than the other."* In a chart,
series order is arbitrary, so this reads as emphasis nobody assigned.

**Not fixed.** Normalising means moving five hex values per theme, and every one
is also carrying a contrast obligation — the same trade the state tokens were
solved for. It is a real job, not a find-and-replace.

## Rules extracted

Nothing queued.

| # | Rule | Status |
|---|---|---|
| **C1** | **A set of colours that appear together is normalised to one OKLCH lightness.** Applies to any peer set — chart series, state inks, token highlights. Deliberate difference is allowed; **undeliberate difference is emphasis nobody assigned** | `proposed` — states pass, `--chart-*` fails at ~7 points |
| **C2** | **Reach for the neutral ink at low alpha before declaring a colour.** We do this for lines and washes; the article's point is that it is the answer for *fills* too, because an alpha fill inherits the tone of whatever is behind it in every theme, for free | `proposed` — mostly already ours |
| **C3** | **Every gradient interpolates `in oklch`.** Three call sites | `proposed` |
| **C4** | **A chromatic ramp raises chroma as it darkens; a neutral ground does not.** Two different rules for two different things — §3 currently only states the second, so the first would read as contradicting it | `proposed` |
| **C5** | Ease any large dark overlay gradient to dissolve its horizon line | `proposed` — **no call site exists today** |
| **C6** | `plus-lighter` for a foreground on a saturated ground | `proposed` — **no call site; `plus-darker` is WebKit-only** |

## Open

- **The article URL**, for the third time. Quotes here are transcribed from
  screenshots.
- **`Typography Details` is next** per the footer.
- **`--chart-*` lightness normalisation** is a genuine finding with a genuine
  cost. Not raised as a task.
