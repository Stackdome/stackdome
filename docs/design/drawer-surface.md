# The drawer — settled model, and what it contradicts

**Self-contained.** What the drawer is, what shipped, and every place the rest of
the repo now disagrees with it.

| | |
|---|---|
| **Prototype** | `claude.ai/code/artifact/60d4171b-cce6-4bee-8e06-79b5852a46b3` |
| **Board** | Figma `2IcCJOgsROpgajjXlay1h9` · Drawer set `466:5322` |
| **Code** | `frontend/src/components/ui/drawer.tsx` |
| **Live** | `pnpm --prefix frontend dev:mock` → `/secrets` → New secret |

---

## 1. The rule

Three surfaces, one job each. The axis is **what the surface is attached to**.

| Surface | Attached to | For |
|---|---|---|
| **Page** | nothing | Browsing — a catalogue, a search, a comparison. The choice IS the work |
| **Drawer** | one object | Making or changing it, or reading it at length |
| **Dialog** | a decision | One question, two answers, and you cannot pass without giving one |

**Reach for the drawer when** there are many fields, when the list behind it is
worth keeping on screen, or when the screen is wide. **Reach for the dialog when**
it is a title and one or two boxes that must be finished before anything else.

### Why "one object" and not "a form"

Build logs and View changes are neither forms nor decisions — they are long
readings *of one object*. Phrased as "every create and edit form" they become
exceptions; phrased as **attached to one object** they are inside the rule.

---

## 2. What it is made of

Measured in the running app, both themes.

| | |
|---|---|
| Widths | **480 form** · **640 work**. Nothing wider — 640 is already 44% of 1440 |
| Corners | **Square.** The inner edge is held by the border and the scrim |
| Elevation | `shadow-2xl` — the modal rung |
| Scrim | `--scrim`. The page stays **visible, not live** |
| Header | **86** — 20 pad, `title/600`, 2 to the description, hairline below |
| Body | fills — 20 pad, 16 between fields, **scrolls** |
| Footer | **80** — 24 pad, 16 above the buttons, hairline above |
| Close ✕ | 20 from the right, 23 from the top — centred on the title's cap line |

### The borders are permanent

Not an affordance that appears once content overflows. A long form needs a
**fixed edge to scroll under**; a border that comes and goes moves the thing you
are reading at the moment you start reading it.

### The error slot lives in the footer band

Inside a body that scrolls, a failure scrolls away from the button that produced
it — the same failure as a toast, only slower.

---

## 3. Contradictions this creates

### Settled — the doc is stale, the code is right

| Where | Says | Actually |
|---|---|---|
| `DESIGN-PRODUCT.md` §13 | Drawer width **560** | **480 / 640** |
| §13 | Header **24** pad | **20** |
| §13 | Title is the dialog's `head/600` | **`title/600`** |
| §13 | Radius is the dialog's **16** | **Square** |
| §13 | Footer "24 sides / **16 ends**" | **24 all round** |
| §13 *Still open* | "The drawer, in code" — not built | **Built**, `ui/drawer.tsx` |
| §13 *Still open* | "There is no `--scrim`" | **Added**, and every overlay uses it |
| `dialog-confirm-code-plan.md` §9 | Drawer is "out of scope, separate pass" | **Done** |

### Needs a call — two rules disagree and both are defensible

| | |
|---|---|
| **The container test** | §13: *"what does the user do between opening and finishing — do they leave and come back?"* The new rule: *"what is it attached to?"* They agree on the stack editor and disagree on **every ordinary form**: by §13 a secret form never leaves, so it is a dialog; by the new rule it is attached to one secret, so it is a drawer. **The new rule is what shipped.** §13 has to be rewritten or the sweep reverses |
| **"A wizard is not a journey"** | §13: *"Pick a provider, then fill a form is a form with a first page — it stays a dialog."* The migration puts both provider wizards in a drawer as two phases. Directly opposed |
| **The dialog's three widths** | If the dialog is confirm-only, `form 560` and `work 760` have almost nothing left to hold. The ladder may collapse to one rung |

### Stale artefacts

| | |
|---|---|
| **The prototype** | Updated for the three bands, **not** for the later edits — still shows radius 16, header 96 and a 24 pad |
| **Figma `Size=work`** | Still 24 pad, `head/600`, radius 16. Only `Size=form` was edited, and the code has one implementation, so `work` renders with the new numbers regardless |
| **Board node `426:5081`** | Also called "Drawer" — it is the GitHub-App progress screen, not a primitive |

---

## 4. Still unanswered

| | |
|---|---|
| **`--control` and `--input` are the same value** | So a secondary button and a text field are the same fill, same hairline, same radius. In a column of fields the Add button cannot distinguish itself. `ghost` is the cheap fix; splitting the token is the real one |
| **Header/body 20 vs footer 24** | Deliberate, or should the footer come down? |
| **Key mono 12 vs value sans 13** | Two halves of one row differ in family *and* size |
| **18 forms** | Only Secrets has moved |
