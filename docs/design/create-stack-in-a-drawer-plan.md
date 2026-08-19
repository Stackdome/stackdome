# Create stack in a drawer — tried, and killed

> **Verdict: the page stays.** Built behind `?new=1`, judged in the running app,
> reverted the same day. The words were **"not a smooth flow"** — which is
> kill criterion 1 firing, and close to the prediction recorded in §9 before a
> line was written.
>
> **Nothing survives in the code.** The revert was two deletions and two
> reverts, exactly as §1 promised — no branded primitive was ever touched, so
> there was nothing left behind to clean up. The record below is the point: the
> rule now has a stated exception instead of an unstated one.
>
> **What is worth keeping is in §11.**

---


**This deliberately attacks our own rule.** Both §13 and the new surface model
call create-stack the reference **page**: it browses. Putting it in a drawer is
the hardest case we have, which is exactly why it is worth building once rather
than arguing about.

| | |
|---|---|
| Today | A page at `/stacks/new` — 5-tab strip, a 620 column, a side panel, primary in the page header |
| Proposal | A `work` drawer (640) opened from the Stacks list |
| Estimate | **~2.5 hours** to something judgeable, behind a flag |
| Cost of being wrong | **One `git revert`.** See §1 |

---

## 1. Revertable by construction

The whole point is to *look* at it and then decide. That only holds if throwing
it away is free — so the build is shaped around the revert, not around the code.

| Rule | Why |
|---|---|
| **One commit, one folder** — everything new lives in `create/drawer/` | Revert is `git revert <sha>`, not an archaeology session |
| **The page is not touched.** `/stacks/new` and `create/index.tsx` are read-only for this experiment | If the drawer loses, there is nothing to restore |
| **The five tab panels are imported, not moved** — `RepositoryTab`, `TemplateTab`, `BlocksTab`, `ComposeTab`, `BlankTab` stay exactly where they are | A file move touches both surfaces and makes the revert dirty. Both surfaces render the *same* panels, which is also the only fair comparison |
| **Zero edits to branded primitives.** No new prop on `PickerRow`, `Drawer`, `EmptyState` | A widened primitive survives the revert and quietly becomes debt |
| **If a primitive genuinely cannot do it, stop and ask** | That is a finding about the drawer, not a licence to edit the system |
| **One additive block elsewhere:** the Stacks list reads `?new=1` | Deleting one block is a revert anyone can do by hand |

**Non-negotiable:** the moment this experiment needs a change to a shared
component to work, it has failed a criterion, and that gets recorded rather than
worked around.

### The revert, exactly — as built

| Delete | |
|---|---|
| `frontend/src/pages/stacks/components/create/drawer/` | the whole iteration, two files |
| The `<CreateStackDrawer>` block at the end of `components/list/index.tsx`, its import, and the `setSearchParams` on line 76 | the only reach outside the folder |

| Revert | |
|---|---|
| `create/index.tsx` | three additive changes, no behaviour change: `stackItems`, `buildSeed` and `missingForSource` are now `export`, and the last was lifted out of the component body so **both surfaces block `Create stack` on the same words** |
| `tabs/template-tab.tsx` | one optional prop (`inlineDetail`, default `false`) and one new export. The page's own path through this file is byte-identical |

**No branded primitive was touched**, and no new one was created. `PickerRow`,
`PickerList`, `Drawer`, `EmptyState`, `BlockedAction` are all used as they
already are.

---

## 2. What breaks immediately

Measured against the current layout, not guessed.

| Today | At 640 |
|---|---|
| **5 starting points as a horizontal strip** | 640 − 40 pad = **600**. Five tiles with icon, title and subtitle do not fit. They become a vertical list, and a vertical list of five reads as a **wizard step**, not five peers — which was the entire point of the page |
| **620 main column** | Shrinks to 600. Survivable |
| **Side panel** (`TemplateDetail` / `InThisStack`) | **Nowhere to go.** It is the second column, and a drawer has one |
| **Route `/stacks/new`** | Gone. No link, no refresh, no back |
| **Template gallery** | Browsing a catalogue in a 600 column, with its detail panel homeless |

Three of those five are real losses. §4 and §5 are the two answers; §6 is the
test of whether they paid.

---

## 3. The shape to build

### Two phases in one drawer

The same shape the provider wizards are getting. It is the only arrangement that
keeps the five starting points as **peers** rather than a list.

```
Phase 1 — Start from            Phase 2 — configure
┌──────────────────────┐        ┌──────────────────────┐
│ New stack         ✕  │        │ ← From a repository ✕│   back arrow, per
├──────────────────────┤        ├──────────────────────┤   the journey rule
│  ▸ A repository      │        │  [search…]           │
│  ▸ A ready-made app  │        │  ▸ acme/checkout-api │
│  ▸ A compose file    │        │  ▸ acme/web-storefront│
│  ▸ Building blocks   │        │  ▸ …                 │
│  ▸ A blank canvas    │        │                      │
│                      │        ├──────────────────────┤
│                      │        │ In this stack · 1  ⌃ │   the cart — §4
├──────────────────────┤        ├──────────────────────┤
│              Cancel  │        │  Back   Create stack │
└──────────────────────┘        └──────────────────────┘
```

- **Phase 1 uses `PickerList` / `PickerRow`** — the primitives already exist and
  already carry the 2px row gap and the selected fill. No new component.
- **Phase 2 is the current tab panel, unchanged**, minus the tab strip.
- **`InThisStack` becomes a pinned band**, not a column — §4.
- **`TemplateDetail` opens in place** — §5.

### Keep the URL

Do **not** drop `/stacks/new`. Open the drawer from `/stacks?new=1` (and keep
`/stacks/new` as the untouched page). Refresh, link and back all survive, the
drawer stops being a dead end you cannot share, and the two URLs sit one click
apart for the judgement in §7.

---

## 4. The cart — how content is organised

**Assembling a stack out of blocks is a checkout.** You browse a catalogue, you
add things, the same thing can go in more than once, you want to see what you
have without losing your place, and one button at the end commits the lot. That
is not an analogy borrowed for flavour — it is the exact interaction, and it
already exists in the code: `PickerRowAdd`, `PickerRowCount`, `uniqueBlockName`.

So the drawer's phase 2 is not one scrolling column. It is **catalogue → cart →
checkout**, stacked.

| Band | | Behaviour |
|---|---|---|
| **Catalogue** | scrolls | The tab panel as it is now — search, categories, rows that add |
| **Cart** | pinned above the footer | `In this stack · 3`, collapsed to one line. Click to expand to the item list with per-row remove. Collapsed by default; **auto-expands for one beat** when an item is added, so the add is seen |
| **Checkout** | the drawer footer | `Back` and `Create stack`. `Create stack` is blocked with the same `reasonList` the page uses — no new language |

**This is the direct answer to kill criterion 3.** The second column was
load-bearing because you must see what you picked *while* you pick more. A
pinned, expandable cart does that in one column; a panel below the catalogue,
which the earlier draft proposed, does not — it scrolls away exactly when it
matters.

**The cart is not blocks-only.** Every starting point puts items on the canvas,
so every one of them gets the same band, with the count reading in that path's
own language:

| Starting point | Cart line |
|---|---|
| A repository | `In this stack · 1 service` |
| A ready-made app | `In this stack · 4 services` |
| A compose file | `In this stack · 3 services, 1 volume` |
| Building blocks | `In this stack · 5` — the only one with remove |
| A blank canvas | no band — there is nothing in it yet, and that is the point |

---

## 5. Template detail — where it goes

Today it is a 300px `aside` to the right of the picked template: logo, name,
category, version, the long blurb, Website, Docs, and `Includes · n`. It is the
only place before `Create stack` that says a one-line pick is really four
services. **Dropping it is not on the table.**

Three homes were considered. The third is the one to build.

| Option | Verdict |
|---|---|
| A third phase — pick app → detail → back | **No.** Two phases is a form with a first page; three is a page wearing a drawer. Fires kill criterion 2 |
| Push it into the cart band | **No.** The cart says what you *have*; the detail is how you decide what to take. Different jobs, and the blurb, Website and Docs have nothing to do with a manifest |
| **The picked row expands in place** | **Build this.** The list stays, and the detail unfolds directly under the row you ticked |

**Expanded-in-place, in detail:**

- Picking a template expands its row; picking another collapses the first. One
  open at a time — this is a radio, not an accordion set.
- The expanded body is `TemplateDetail`'s content **re-laid for 600, not
  re-invented**: logo and name on one line, category · version under it, blurb,
  then `Website` / `Docs` as the existing `outline sm` buttons.
- `Includes · n` **leaves the detail and becomes the cart line**. It is a
  manifest of what you are about to get, which is the cart's job, and it stops
  the same list being printed in two places.
- The expanded row scrolls the list to keep the row's top edge in view — the
  detail must not push the tick you just placed off screen.

If this needs a new prop on `PickerRow`, §1 applies: stop and ask.

---

## 7. Kill criteria — decided before building, not after

Abandon and keep the page if **any** of these is true when it is on screen:

1. **The five starting points stop reading as peers.** If phase 1 reads as "step
   one of a wizard", the drawer has cost the page's central idea.
2. **The template gallery cannot be browsed at 600**, or the detail needs a
   third phase.
3. **The cart does not replace the column.** If you still cannot tell what you
   have while adding more, the second column was load-bearing and the drawer
   cannot hold this flow.
4. **It grows past 640.** Anything wider was never attached to one object.
5. **It needs a primitive changed.** §1 — that is a system cost paid by every
   other screen for one experiment.

---

## 8. Order of work

| Step | | Rough | |
|---|---|---|---|
| 1 | `create/drawer/` + `CreateStackDrawer` behind `?new=1`; page untouched | 30m | **done** |
| 2 | Phase 1 — five peers, no tab strip | 20m | **done** |
| 3 | Phase 2 = the existing tab panels imported as-is, back arrow in the header | 30m | **done** |
| 4 | The cart band — collapsed line, expand, remove, per-path counts | 30m | **done** |
| 5 | Template detail unfolded in place; `Includes` moved to the cart | 25m | **done** |
| 6 | Measure both against the board, light and dark | 20m | **done** — 32 assertions, both themes |
| 7 | **Judge side by side** — `/stacks/new` vs `/stacks?new=1` | — | open |

Both live at once on purpose. **The page is not deleted until the drawer wins**,
and until then the drawer is one commit that can be dropped whole. `+ New stack`
still goes to the page: the two are meant to be compared, not swapped over.

### Where the build departed from the plan

| Planned | Built | Why |
|---|---|---|
| Footer carries `Back` + `Create stack` | Footer carries `Cancel` + `Create stack` | The header already has the journey's back arrow. Two backs on one surface is one too many, and `Cancel, then one fill` is the footer the rest of the system uses |
| Phase 1 on `PickerList` | Phase 1 on a plain list of `PickerRow`s | A row that takes you somewhere **acts**; it is not an option, and an option outside a `listbox` is not a valid one. The cart is what remembers your pick, so no row needs a tick |
| The detail hangs off a hairline | The detail hangs off nothing | Measured: the rule plus its own inset pushed the blurb 15px off the name column it was supposed to be aligned with. Removing it put the text on the column exactly, and §11 wants rows separated by space, not rules |
| — | `A blank canvas` lost its dashed chip | `PickerRow`'s chip has one fixed border, and §1 forbids adding a prop for this. **Recorded, not worked around** |

---

## 9. Prediction, recorded before building

> My expectation: **kill criterion 1 fires.** Five peers on a page is a
> genuinely better idea than five rows in a column, and the drawer cannot hold
> the strip. The likely outcome is that create-stack **stays a page** and the
> rule gains its first stated exception.

---

## 10. What actually happened

Everything measured — 640 wide, no overflow, the cart flush on the footer, the
detail landing on the row's name column, both themes. **The geometry was never
the problem.**

### The reason, in the words of the person using it

> "It didn't show me enough info… felt very claustrophobic after being used to
> the full page."

**None of the five criteria caught that**, and the one I predicted was not the
one that fired. The criteria were all written about *arrangement* — are the five
still peers, does the gallery still browse, does the cart replace the column.
Every one of them passed. What failed is a thing none of them asked about:
**how much is true on screen at the same time.**

| Criterion | Fired? | |
|---|---|---|
| 1 · The five stop reading as peers | no | The phase split was survivable — my prediction was wrong |
| 2 · Gallery unbrowsable at 600 | no | The catalogue browsed fine |
| 3 · The cart does not replace the column | **it "passed", and that was the mistake** — see below |
| 4 · Grows past 640 | no | |
| 5 · Needs a primitive changed | no | Two wanted one; both were left undone rather than paid for |
| **6 · Not enough is visible at once** | **yes** | The criterion that should have been written and was not |

### What actually went wrong

The page shows the list **and** the detail **and** the stack-so-far, all three at
once, across two columns and ~1100px. The drawer has one column and 600px, so
each of those had to be bought back by hiding something:

| Page, always visible | Drawer, as built |
|---|---|
| `TemplateDetail` — beside the list | hidden until you pick, then unfolded |
| `InThisStack` — a standing column | collapsed to a one-line tally |
| The other four starting points | behind a back arrow |

**Each hide was defensible on its own. Together they emptied the screen.** Every
answer in §4 and §5 is a variation on "show it later", and a surface where three
things are one interaction away is not the same surface as one where three
things are simply *there* — no matter how well each disclosure is built.

And that is before the scrim: a drawer takes 44% of the width and dims the rest,
so the loss of information is felt at the same moment the room shrinks.

---

## 11. What survives

| | |
|---|---|
| **The rule now has its exception, stated** | Create-stack is a **page**. Not because five peers need a strip — that turned out to be survivable — but because the flow is a **comparison**, and comparing means holding several things true at once. A drawer can only make one thing true at a time |
| **A test to apply before the next surface argument** | Count what is simultaneously visible, on each surface, at the moment of the decision. If the drawer's answer is lower and the difference is bought back with disclosure, it will feel worse to use however well the disclosure is built |
| **A stated non-goal** | Do not re-run this for the other create flows. They pick ONE thing and one thing is all a drawer has to hold. This one holds a list, a detail and a running tally |

### Retracted

**The cart is not worth porting to the page.** I recommended it in the first
version of this section, a few minutes before hearing why the drawer failed. It
is the wrong direction for the same reason the drawer was: it takes a standing
column and collapses it to a tally, which is exactly the "not enough info" move.

`InThisStack` sitting empty for the first few seconds is a much smaller problem
than `InThisStack` needing a click. **Leave the page's second column alone.**

The one idea that might still be worth something is the **template detail
unfolding under the picked row** — but on the page it has a column already, and
nothing about it is broken, so there is no reason to touch it either.
