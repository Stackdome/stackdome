# Typography Details

## Source

**Interface Craft** by **Josh Puckett** — [interfacecraft.dev](https://www.interfacecraft.dev/).
Shared by Jaseem as a PDF export, 2026-08-23. Fourth in the series; footer links
`← Color Details` and `Interactions & State Design →`, **so at least one more is
coming.**

**The site is gated** — a fetch of the article URL returns 404 without a session,
so the quotes below are transcribed from Jaseem's export and should be treated as
close paraphrase, not verbatim. **The three earlier notes in this folder are from
the same source**; that answers the "get the URL" item each of them carried.

The author's own framing: this is *the longest article in Interface Craft*, and
*"should be treated as a reference rather than quick tips or specific rules."*

Nineteen sections in five groups:

| Group | Sections |
|---|---|
| **Foundations** | Measure · Leading · Type Scale · Vertical Rhythm |
| **Rendering** | Smoothing · Dark Mode |
| **Numbers** | Tabular Figures · Old-Style Figures · Tables |
| **Setting Type** | Tracking · Wrapping · Hanging Punctuation · Proper Punctuation |
| **Fitting Type** | Fluid Type · Truncation · Text-Box Trim |
| **OpenType** | What They Are · Slashed Zero · Fractions · Super/Subscript · Small Caps · Case-Sensitive Forms · Character Variants · Disambiguation · Stylistic Sets |

**Jaseem, 2026-08-23: *"this is one area we are struggling as well."*** Recorded
as a direction. The audit below was run; nothing is queued.

## What it says

### Foundations

**Measure** — line length in characters. *"If the measure is too long, it's
tiring on the eye, because it has to travel a longer distance back to the start
of the next line. And if it's too short, you're constantly scanning to new
lines."* Rule of thumb **45–75 characters**; `max-width: 65ch`. He then qualifies
it: *"optimal measure varies greatly depending on the overall length of text
you're trying to set. For small fragments or sentences... measure can be very
short, because there's not much text to read."*

**Leading** — *"the gap above and below the actual characters in a line."* Body
copy wants **1.4–1.6**. Two relationships, both demoed:

| | |
|---|---|
| **Leading pairs with measure** | *"The wider a line of text is, the more vertical space it wants between lines so the eye can find its way back to the start of the next one."* |
| **Leading moves inversely with size** | *"The larger the type, the less leading it needs. For titles, line height can be close to 1, since it's read as a unit rather than as many lines of text."* |

**Type Scale** — *"a proportional set of sizes that feel harmonious together.
Similar to scales in music, they are derived from a base value and a ratio."* He
uses **no more than 5** by default; a larger ratio for editorial, a tighter one
for utilitarian. On frameworks: *"Tailwind [has] built-in type scales. These
expose a wide range of sizes, but just because you have them doesn't mean you
have to use them."*

**Vertical Rhythm** — *"pick a base spacing unit tied to your line-height, and
then make all vertical spacing — margin, padding, line-height, gaps — a multiple
of that unit. That way you always stay on the grid. This is why you see things
like the 8pt grid everywhere."*

### Rendering

**Smoothing** — `-webkit-font-smoothing: antialiased` +
`-moz-osx-font-smoothing: grayscale`. *"For UI text, this often looks cleaner and
a touch lighter."*

**Dark Mode** — *"Lighter text on dark backgrounds tends to optically **bloom**,
which makes it feel ever so slightly bolder than it actually is. The difference
is subtle, but **if you are using a variable weight font**, it can be a nice
detail to reduce the weights a touch in dark mode."*

### Numbers

**Tabular Figures** — *"whenever a number might change or animate, you want
tabular figures to avoid layout shift."* Proportional stays right for body copy.

**Old-Style Figures** — `onum` / `font-variant-numeric: oldstyle-nums`.
Editorial contexts.

**Tables** — *"Whenever numbers live in a column, you almost always want to
compare them. To facilitate this, **right-align them and set them in tabular
figures**, so that every significant digit is in the same place on a vertical
rule."*

### Setting Type

**Tracking** — *"tracking scales **inversely** with size. Smaller type wants to
be opened up... Larger type wants to be brought in so it doesn't read as overly
spacious."*

**Wrapping** — `text-wrap: balance` for headlines, `text-wrap: pretty` for body
(*"reflows the last line as needed to avoid an orphan"*).

**Hanging Punctuation** — an opening quote inside a text block *"makes the left
edge look ragged."* Move it into the margin so the letters line up.

**Proper Punctuation** — *"Curly quotes and proper apostrophes instead of
straight typewriter ticks, en dashes for ranges and em dashes for breaks instead
of hyphens, and a single unicode ellipsis instead of three periods... These are
small, but they're the difference between text that looks **hand-set** and text
that looks **typed**."*

### Fitting Type

**Fluid Type** — `clamp()` interpolating between a floor and ceiling rather than
snapping at a breakpoint.

**Truncation** — three distinct mechanics, and the third is the one people miss:

| Case | Mechanic |
|---|---|
| Single line | `text-overflow: ellipsis` |
| A description | `-webkit-line-clamp` to a fixed number of lines |
| **A filename or path** | **Truncate in the MIDDLE** — *"so you can still read part of the name **and** the file extension"* |

**Text-Box Trim** — *"Every font ships its own line metrics, and some reserve far
more room above and below the letters than a short label ever needs."* His demo
is a `Continue` button whose word floats off-centre inside a nominally centred
box. `text-box-trim: trim-both` + `text-box-edge: cap alphabetic` strips the
reserved leading so the box hugs the letters. **Chromium-gated.**

### OpenType

*"Most well-built fonts carry far more than the glyphs you see by default...
all of them opt-in."* Use `font-variant-*` where it exists, `font-feature-settings`
otherwise.

| Feature | Tag | For |
|---|---|---|
| Slashed zero | `zero` | *"anywhere 0 and O could be confused — codes, IDs, serial numbers, monospaced data"* |
| Fractions | `frac` | A real composed fraction, *"far better than shrinking the text by hand"* |
| Super/subscript | `sups` `subs` | Purpose-drawn figures, *"rather than the optically-wrong result you get from shrinking and shifting a normal digit"* |
| Small caps | `smcp` | Acronyms in prose, *"where full capitals would shout."* **Real glyphs, not scaled capitals** |
| Case-sensitive forms | `case` | Lifts dashes, colons, brackets to centre on capitals |
| Character variants | `cv01`–`cv99` | Individual letterforms — the tailed `l` that separates it from `I` and `1` |
| **Disambiguation** | **`ss02`** (Inter) | *"the single switch to reach for whenever text has to carry codes, IDs, or anything where a misread character is costly"* |
| Stylistic sets | `ss01`–`ss20` | *"worth opening your font's specimen and trying each set; they're free, already in the file, and easy to miss"* |

## The audit

Run 2026-08-23 across `frontend/src`. **Our typeface is `Geist Variable`**, with
JetBrains Mono for machine values.

| Technique | Us |
|---|---|
| Grayscale smoothing | **✓ shipping** — `index.css:781` has both properties |
| OpenType stylistic sets | **✓ shipping** — `font-feature-settings: 'ss01', 'ss02'` set globally |
| Tabular figures | **✓** — 26 call sites, plus a `.mono-num` utility |
| Line-height on a 4-multiple, spacing on the same grid | **✓** — §6 states it; every rung obeys |
| Single-line truncation | **✓** — 114 `truncate` call sites |
| Tracking tightens as size grows | **✓ partially** — `title` −0.005em, `head` −0.01em. Nothing opens up at the small end |
| Measure cap | **~** — `32ch` on the page title (a truncation cap, not a measure). **No prose measure anywhere** |
| `line-clamp` | **~ 2 call sites** — `alert`, `select` |
| `text-wrap: balance` / `pretty` | **✗ zero.** `pretty` was tried in `field-shell.tsx` and **measured as a no-op** — Chromium declines to reflow a two-line paragraph. Removed rather than shipped as a lie |
| **Middle truncation** | **✗ zero** |
| `text-box-trim` | **✗ zero** |
| Fluid type `clamp()` | **✗ zero** — and we don't want it |
| Dark-mode weight reduction | **✗** — but **Geist is variable**, so it is available to us |
| **Proper punctuation** | **✗ — 44 copy strings on a straight `'`, 5 on a curly `’`** |
| Old-style figures · small caps · hanging punctuation | **✗ — no call site, and §6 rules two of them out** |

### The one that matters: 44 to 5

`Couldn't refresh stack` · `You don't have a project to create secrets in.` ·
`Changes couldn't be saved.` · `The stack's project could not be resolved.` ·
`Paste the repository's URL`

**Forty-four user-facing strings use a typewriter apostrophe; five use the real
one.** §6 already legislates punctuation in product copy — it bans the em dash
outright — but says nothing about apostrophes, so the two conventions have been
running side by side with no rule to settle them.

This is the article's *"hand-set versus typed"* distinction, and it is the
cheapest thing on this page to fix and the easiest to regress.

### A stale comment found on the way

`index.css:714` still reads *"Weights: 400 default · 500 interactive/emphasis ·
600 titles. **Only three.**"* §6 settled on **two** weights in August 2026 and
put 600 off the scale. The token file never got the note.

## Against ours

| The source says | Ours | Verdict |
|---|---|---|
| A type scale is a base and a **ratio** | §6 — six rungs **named by job**: `label` `meta` `body` `name` `title` `head`, anchored on 13, hand-set at 11/12/13/14/16/20 | **We deliberately diverge, and should keep diverging.** A ratio from 13 would give 13 · 19.5 · 29 — and we ship 14 and 16 precisely *because* a list name and a card title sit one hair apart. His own advice covers us: *"just because you have them doesn't mean you have to use them"* |
| No more than ~5 sizes | Six | **Confirms**, near enough |
| Leading 1.4–1.6 for body | `body` 13/20 = **1.54** | **Confirms.** Landed on independently |
| Larger type takes tighter leading | `head` 20/28 = **1.4**, `body` 1.54, `label` 11/16 = 1.45 | **Confirms at the top, breaks at the bottom** — `label` and `meta` (12/16 = 1.33) are *tighter* than body, where his rule wants them looser. Ours is driven by the 4-multiple, and small UI labels are single lines, not paragraphs — so the rule he states for prose may not reach them. **Worth a check, not a change** |
| Vertical rhythm — one unit, everything a multiple | §6 *"every line-height is a multiple of 4"* + §8's 4/8 ladder | **Confirms exactly.** Same mechanism, and ours also has §8's *"the ladder measures PERCEIVED space"* on top, which he does not have |
| Grayscale smoothing | Shipping | **Confirms** |
| Reduce weight in dark mode on a variable font | §6 — two weights, and Geist Variable | **New, and available.** Nothing in `DESIGN-PRODUCT.md` distinguishes a weight by theme |
| Tabular figures for anything that changes | 26 call sites, ad hoc + `.mono-num` | **Confirms in practice, unstated in the rules.** §6 says nothing about figures |
| Tables: right-align numbers, tabular | §11 owns lists, and *"the row is ONE component, and it is not `Table`"* | **Extends.** We have no numeric-column rule at all |
| Tracking scales inversely with size | Negative tracking on `title`/`head` only | **Half.** We tighten the top; we never open the bottom. §6 also records that tracking was *removed* from the eyebrow when uppercase went — a deliberate call, and his rule is about small type generally, not caps |
| `balance` / `pretty` | Zero, one measured rejection | **Tested and declined**, at least for `pretty`. `balance` on headlines has never been tried |
| Middle-truncate a filename | Zero | **New, and we have the exact case he names.** Branch names, image refs, repo paths and volume mounts are all values whose **tail** carries the meaning — `…/api:v2.1.4` — and `truncate` throws the tail away |
| `text-box-trim` | Zero | **New, and it is the structural answer to a problem §8 solves by hand.** §8's optical-padding work (*"icon side = base − 3"*, the 2px glyph nudge) exists because font metrics reserve leading a label doesn't use. **Do not act on this** — it is Chromium-gated and would cut across measured, settled numbers |
| Proper punctuation | §6 bans the em dash in product copy; silent on apostrophes and quotes | **Extends, and we fail it 44 to 5** |
| Slashed zero / disambiguation for IDs and codes | §6 — JetBrains Mono *"means a machine produced this and a machine will read it back"* | **Confirms the intent, and there is a gap.** We already isolated exactly the text this feature exists for. Whether JetBrains Mono needs `zero` is unchecked — many monos slash by default |
| Small caps for acronyms | §6 *"No uppercase. Not for eyebrows, not for table headers, not for emphasis"* | **Contradicts, and ours wins.** Our ban is about **shouting**; his `smcp` is the fix for acronyms *in running prose*, which a dense console has almost none of |
| Fluid type | Zero | **Contradicts, and ours wins.** A console is fixed-density; §6 caps at 20px on purpose |
| Hanging punctuation, old-style figures | Zero | **No call site** |

## Rules extracted

Nothing queued.

| # | Rule | Status |
|---|---|---|
| **T1** | **Product copy uses typographic punctuation** — curly apostrophes and quotes, en dash for ranges, a single ellipsis character. §6 already bans the em dash; this completes the same rule. **44 strings are on the wrong side of it today** | `proposed` |
| **T2** | **A value whose tail carries meaning truncates in the MIDDLE, never at the end.** Image refs, branch names, paths, volume mounts. `truncate` is right for a sentence and wrong for an identifier | `proposed` |
| **T3** | **A number that changes in place is tabular.** True in 26 places, written down in none — so it is a habit, not a rule, and habits regress | `proposed` |
| **T4** | **Numbers in a column are right-aligned and tabular.** §11 has no numeric-column rule | `proposed` |
| **T5** | **Dark mode may drop the weight a touch** — Geist is variable, so this costs nothing but the decision | `proposed` — Jaseem's call, it is a feel judgement |
| **T6** | **Small type wants opening up.** We tighten `title` and `head` and leave `label`/`meta` at zero. Whether 11px UI labels want positive tracking is **unmeasured** | `proposed` — measure before deciding |
| **T7** | **Our scale is job-named, not ratio-derived, and that is deliberate.** Worth stating in §6 so nobody "fixes" it into a ratio later | `proposed` |
| **T8** | `text-wrap: balance` on headlines — dialog and empty-state `head` lines are the only candidates | `proposed` — `pretty` already tested and rejected as a no-op |
| **T9** | `text-box-trim` as the structural replacement for hand-measured optical centring | `proposed` — **do not act.** Chromium-gated, and it cuts across §8's settled numbers |

## Open

- **`index.css:714` contradicts §6** — says three weights, the rule says two.
- **Does JetBrains Mono slash its zero by default?** Unchecked. If not, `zero`
  is a one-line change on exactly the text §6 already isolated for machines.
- **`Interactions & State Design` is next** per the footer.
