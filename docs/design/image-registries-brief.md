# Brief — `Add image registry` comes off the dialog

*Written 2026-08-16 14:57, at the close of the pass that converted
`Connect git provider`. Everything below was read in the tree that day, not
recalled.*

**Paste the block under "The prompt" into a fresh chat.** The rest of this file
is the evidence behind it, for whoever wants to check a claim before acting on
it.

---

## The prompt

> Convert `Add image registry` to a drawer. **How many phases is the open
> question — bring me the call before you build it.**
>
> **Read first — these are current and authoritative:**
>
> - `DESIGN-PRODUCT.md` §6, §8, §9, §12a, §13. §13's "Adding a thing" is the
>   whole rule; read its two newest subsections especially — *"A mode is a
>   field, not a first phase"* and *"A branch that asks a different question
>   grows a step; a branch that rewrites fields is a mode"*. **They point at
>   each other and this screen is where they meet.**
> - `docs/design/redesign-log.md` — the top entry (16 Aug 2026), the git
>   provider pass. This is the same shape of job.
> - `frontend/CONTEXT.md` — "Adding a thing", "Forms", "Blocked & disabled
>   controls".
> - `docs/tasks.md` — the entry under **Now**.
>
> **THE EXEMPLARS, in this order.**
> `frontend/src/components/git-source-picker/connect-provider-drawer.tsx` — the
> flow this one is a sibling of, converted the day before, and the closest thing
> to a template you will find. Then
> `frontend/src/pages/object-stores/components/object-store-form-drawer.tsx` for
> the **one-phase** shape with a mode field, which is the other candidate here.
> Build from these; do not re-derive.
>
> **THE TARGET.** `frontend/src/pages/image-registries/components/add-registry-dialog.tsx`,
> 239 lines, one call site (`pages/image-registries/index.tsx:146`).
>
> **THE ONE THING TO DECIDE FIRST — and it is not obvious.** The dialog is
> *already* two phases: five provider tiles, then a form. So "make it a drawer"
> looks like a straight port. It may not be.
>
> §13's test for a phase is **"can you start without it?"** Apply it honestly:
>
> - Every registry shows the **same four fields** — `Host`, `Username`,
>   `Password`, `Purpose`. Nothing appears, disappears or changes shape when the
>   provider changes.
> - All the provider does is **prefill `Host`** and **swap the `Password`
>   hint**.
> - `Username` and `Password` are answerable before you have chosen anything.
>
> That is the object store's `Provider` **exactly** — a choice made *among* the
> fields, not one that gates them — which §13 settled as **a mode, and a mode is
> a field**. Which would make this a **one-phase drawer with a `Registry`
> select above `Host`**, and would delete the tile step entirely.
>
> **And that is not the same case as git providers**, which grew a phase the day
> before: there, picking GitHub leads to a branch with **no form at all**. Here
> there is no such branch. Work out which precedent governs. **Bring me the
> call before you build it.**
>
> **WHAT I CARE ABOUT MOST — verify each in the code before changing it:**
>
> **`WizardFooter` dies here.** This is its **last** caller. §13 made the path
> the back control, and this is the only `Back` button left in the product.
> Deleting `frontend/src/components/wizard-footer.tsx` is part of done.
>
> **Everything the git wizard was, this still is.** They were built from the
> same copy-paste and the tells are identical, line for line:
> `sr-only` `DialogTitle` over a hand-rolled band (`Package` glyph plus
> `font-mono text-label`, with `pr-12` to dodge the absolute ✕); five
> hand-rolled `<button>` tiles at `min-h-[76px]`, `rounded-md border bg-card
> p-4`, `hover:border-primary`, in a `grid grid-cols-2 gap-2.5`; centred body
> copy under a second `text-head` heading per phase; and `p-8`, `mb-7`, `mb-1`,
> `gap-2.5`, `py-3.5` off the ladder. `PickerRow` and `DrawerHeader` own all of
> it now.
>
> **`max-h-[80vh] min-h-[440px] overflow-hidden` on a dialog.** §13's cheapest
> tell, for the third time. A dialog's levels are made of air and that only
> works because its body does not scroll.
>
> **THREE brand-art maps, and one of them says it is the only one.**
> `frontend/src/components/branded/brand-icon-registry.ts` opens with *"Central
> brand-icon registry… One place to grow the icon set"* and holds fifteen slugs.
> Neither `ProviderLogo` uses it: this page's copy
> (`pages/image-registries/components/provider-logo.tsx`) hand-rolls a three-entry
> `BRAND` map, and the git one (`components/branded/provider-logo.tsx`) hand-rolls
> a four-entry map — and **both import the same GitHub and GitLab SVGs**. Same
> light/dark `<img>` pair, written three times. §2: **update the existing
> primitive; ask before adding a component.** This one is an ask.
>
> **The empty state offers a registry the catalogue does not.** *"Add one for
> Docker Hub, GHCR, ECR or any registry you host"* — `REGISTRY_PROVIDERS` has no
> **ECR**, and does have **GitLab Registry** and **Quay**, which the sentence
> never mentions. A hand-written list beside a registry, drifted. Fourth time
> (`Postgres`/`PostgreSQL`, the secret `Type` select, the git provider tiles).
>
> **The primary is not blocked with reasons.** `Add registry` is live with an
> empty form and reports three required fields only after you press it. §9, and
> the same gap `Connect git provider` just closed.
>
> **`Purpose` has no `*` and can never be empty.** It defaults to `both` and the
> select offers no blank. §6 says the absence of the red `*` **states optional**
> — so this field is claiming to be optional while being unanswerable-in-the-
> negative. The precedent is object stores' `Retention`: seeded with `7d`, and
> marked required.
>
> **`Username ǀ Password` IS a pair here** — one credential in two boxes,
> secrets' exact case, and §8 names it. **This is the opposite of the git
> provider form**, where a token *replaces* the username and there was no pair.
> Do not carry that answer across; they are different questions.
>
> **The label is resolved by `.find()` at two call sites.** `REGISTRY_PROVIDERS
> .find((p) => p.id === providerId)?.label ?? "Registry"` in `registry-row.tsx`
> and again in `update-credentials-dialog.tsx`. The git registry grew a
> `gitProvider(id)` helper the day before for exactly this.
>
> **ALREADY DONE, DO NOT REDO.** Every add is a drawer at **480**; `work`/640 is
> earned by a **rail** and only New stack has one. `Cancel` is off every *drawer*
> footer — the primary sits alone. "(optional)" is gone product-wide. Drawer
> bands are 95/81 and a two-line description costs 20 more. Step one has no
> footer. Progress is ink, never orange — **and a progress readout may not
> invent granularity it does not have** (§13, learned on the git wait).
>
> **CONSTRAINTS**
>
> - Update existing primitives; never hand-roll a copy. **Ask before adding a
>   component** — the brand-art consolidation is an ask, not a decision.
> - **`Update credentials` and `Verify registry` KEEP their `Cancel`.** Both are
>   `Dialog size="ask"` and §13 is explicit: *"a `Dialog` and a `Confirm` keep
>   `Cancel`"*. The no-Cancel rule is a **drawer** rule. Do not sweep them.
> - **Do not remove a step or a field.** If something looks removable, ask.
> - A shared primitive cannot be narrowed on the evidence of one call site.
> - Measure, don't eyeball. Assert the **gaps between** elements, not just
>   positions, and settle the animation before reading any rect.
> - Stories are tests. Never `toBeVisible` on drawer content — resolving the
>   name IS the assertion. **The add flow has no stories**; only
>   `registry-row.stories.tsx` exists on this page. `update-credentials` and
>   `verify-registry` have none either, and four unit tests are written against
>   the dialogs as they stand.
> - Verify in the running app: `pnpm --prefix frontend dev:mock` (5273) and
>   `dev:mock:empty` (5274).
> - Flag any board frame the change makes stale; **do not sweep my board.**
> - Update §13 and `frontend/CONTEXT.md` when it converts.
> - **Stage by path, never `git add -A`.** As of 2026-08-16 14:57 there is
>   uncommitted work of Jaseem's in `git-source-picker.tsx` and its test
>   (lifting the picker's `mode`/`url` state to the caller), in
>   `new-stack-drawer.tsx`/`.stories.tsx`, and a deleted
>   `create/tabs/repository-tab.tsx`. Read `git status` before you touch
>   anything and account for every line.
> - Branch `graphite-pass-2`, head `f3c0071`, **77 ahead of `main`**, not pushed.

---

## Evidence

Everything asserted above, with where to check it.

| Claim | Where |
|---|---|
| 239 lines, `Dialog size="form"` | `add-registry-dialog.tsx:106` |
| Two phases already — tiles, then form | `:123` (`provider == null ? … : …`) |
| Hand-rolled tiles | `:134–156` — `min-h-[76px]`, `grid grid-cols-2 gap-2.5` |
| `sr-only` title over a hand-rolled band, with `pr-12` | `:107–118` |
| Scrolling dialog | `:122` — `max-h-[80vh] min-h-[440px]` |
| `WizardFooter` with `Back` — **the last caller** | `:227`; `git grep WizardFooter` returns this file and the component |
| Same four fields for every provider | `:170–224` |
| The provider only prefills host + swaps a hint | `:60–68`, `lib/providers.ts:23–59` |
| `Purpose`: no `required`, defaults to `both` | `:213`, `:43` |
| Primary not blocked; errors on submit | `:70–76`, `:227–232` |
| Three brand-art maps | `components/branded/brand-icon-registry.ts:30`, `components/branded/provider-logo.tsx:12`, `pages/image-registries/components/provider-logo.tsx:12` |
| ECR named, never offered | `components/page-states.tsx:32` vs `lib/providers.ts:23` |
| `.find()` label lookup, twice | `registry-row.tsx:67`, `update-credentials-dialog.tsx:82` |
| The dialogs that keep `Cancel` | `update-credentials-dialog.tsx:135`, `verify-registry-dialog.tsx:108` |
| Existing tests, written against the dialogs | `components/tests/` — `add-registry-dialog` (121), `update-credentials-dialog` (104), `verify-registry-dialog` (81); `tests/image-registries-page.test.tsx` (96) |
| The only story on the page | `components/registry-row.stories.tsx` |

## The one thing to decide before building

**One phase or two.** The code is two and that is the trap — it was built before
the rule existed, the same way `New addon`'s 640 was inherited rather than
chosen.

| | Precedent | Reads on |
|---|---|---|
| **One phase**, `Registry` as a field above `Host` | Object stores — *"a mode is a field, not a first phase"* | Every provider shows the same four fields; only the host prefill and one hint move. **You can start without it** |
| **Two phases**, the tiles become a `PickerRow` catalogue | Addons, git providers — *"the choice is the first phase"* | §13's table says *"one thing you choose before you can start → two phases"*, and picking a registry is arguably that |

**The discriminator §13 gives is "can you start without it?"** — and on this
form the honest answer is *yes*. If that is right, the conversion is smaller and
more destructive than it looks: the tile step, its heading, its centred copy and
`WizardFooter` all go, and what is left is one drawer body of five fields.

**Jaseem's call, not the implementer's.**

## What is NOT in question

- It is a **drawer**. §13: a dialog is never an add, and this one leaves an
  object behind in a list.
- **480.** No rail, so no 640, whichever phase count wins.
- `Update credentials` and `Verify registry` **stay dialogs and keep `Cancel`**.
