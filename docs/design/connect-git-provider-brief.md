# Brief — `Connect git provider` becomes a two-phase drawer

*Written 2026-08-16 14:00, at the close of the pass that converted `Add cluster`
and `Add domain`. Everything below was read in the tree that day, not recalled.*

> **CLOSED 2026-08-16.** Built as `connect-provider-drawer.tsx`. The phase call
> went to Jaseem before building and came back **a third step on the GitHub arm
> only**, with the wait in place and the receipt as a toast. What was decided and
> why is in `docs/design/redesign-log.md`, top entry; the rules it landed are in
> `DESIGN-PRODUCT.md` §13. Everything below is the brief as written, kept for the
> evidence table.

**Paste the block under "The prompt" into a fresh chat.** The rest of this file
is the evidence behind it, for whoever wants to check a claim before acting on
it.

---

## The prompt

> Convert `Connect git provider` to a two-phase drawer, shaped like the addon
> journey.
>
> **Read first — these are current and authoritative:**
>
> - `DESIGN-PRODUCT.md` §6, §8, §9, §12a, §13 — §13's "Adding a thing" is the
>   whole rule, and it names this flow explicitly under *"Which container"*.
> - `docs/design/redesign-log.md` — the last four entries (16 Aug 2026). The
>   final one is the add-conversion pass whose shape you are repeating.
> - `frontend/CONTEXT.md` — "Adding a thing", "Forms", "Blocked & disabled
>   controls".
> - `docs/tasks.md` — the entry under **Now**.
>
> **THE EXEMPLARS, in this order.** `frontend/src/pages/addons/components/addon-drawer.tsx`
> and its `addon-catalog-step.tsx` — this is the two-phase journey and Jaseem's
> stated model: *"it should be like addons."* Then
> `object-store-form-drawer.tsx` and `secret-form-drawer.tsx` for the form band,
> the blocked primary and the story shape. Build from these; do not re-derive.
>
> **THE TARGET.** `frontend/src/components/git-source-picker/add-integration-wizard.tsx`,
> 455 lines. Note the path: it is **not** under `pages/git-integrations/`, and
> it has **two** call sites — `pages/git-integrations/index.tsx` and
> `components/git-source-picker/git-source-picker.tsx`. Both must keep working.
>
> §13 names this one as a drawer in its own words: it opens a GitHub popup and
> **polls while you authorise in another window**, which is the definition of
> leave-and-come-back. It is the last add that has an argument for a drawer
> written into the rules and has not been given one.
>
> **WHAT I CARE ABOUT MOST — verify each in the code before changing it:**
>
> **Five phases, where §13 has two.** `provider → github → credentials →
> connecting → done`. Two of those are not steps: `connecting` is a **wait**
> and `done` is a **receipt**. §13's test is *a step exists if it asks a
> question*. Neither asks one. But **never delete a step** — the polling is the
> reason this is a drawer at all, and the GitHub-App-vs-token choice on the
> `github` phase is a real question. Work out which of the five are phases,
> which are states inside a phase, and which is a toast. **Bring me the call
> before you build it.**
>
> **A hand-rolled stepper.** `Stepper` at the top of the file — three `h-[3px]`
> bars with `font-mono text-label` captions, plus a `STEP_FOR_PHASE` map to fake
> highlighting for the two phases it does not draw. The drawer already has a
> step marker and it is the **path** (`DrawerHeader steps`, §12a). This is a
> hand-rolled copy of a primitive, and the map exists only because the stepper
> and the phases never agreed on how many steps there are.
>
> **`bg-warn` — an orange pulse dot in the connecting checklist.** §13, in
> plain words: *"Progress is ink, never orange. A step pip and a waiting state
> are interface, and §7 bans orange there. A completed step is a ticked
> `Checkbox`, not a bespoke dot."* This screen breaks that sentence three
> times — the orange dot, `CheckCircle2` as the done mark, and `Circle` as the
> pending one.
>
> **Hand-rolled picker tiles.** The provider grid is five `<button>`s at
> `min-h-[76px]`, `rounded-md border bg-card p-4`, with `hover:border-primary`.
> `PickerRow` exists, is what the addon catalogue and both repository pickers
> use, and has its states, its blocked shape and its focus behaviour already
> solved. §13: the catalogue is *"the same component every time"*.
>
> **The provider list is a second copy, and it has already drifted.**
> `PROVIDERS` in the wizard vs `PROVIDER_DISPLAY_NAMES` in
> `frontend/src/lib/git-integrations.ts` — `other` is `"Other"` in one and
> `"Git host"` in the other, and the lib file carries a comment admitting it
> (*"wizard tiles use their own copy"*). This is the `Postgres`/`PostgreSQL`
> failure and the secret `Type` select's three-of-six failure, for the third
> time. §13: **the catalogue is a registry, not a screen.**
>
> **A visible heading that is not the title.** `DialogTitle` is `sr-only`, and
> the heading you actually see is a hand-rolled band — `GitBranch` glyph plus
> `font-mono text-label` "Connect provider" — with `pr-12` to dodge the
> absolutely-positioned ✕. `DrawerHeader` owns that whole band now and needs no
> dodging; the `pr-12` is the exact magic number `frontend/CONTEXT.md` records
> as the reason the header was made to own its close.
>
> **`WizardFooter`, with a Back button.** §13: the path is the back control,
> step one has **no footer at all**, and a footer holds the primary alone.
> **Do not delete `wizard-footer.tsx`** — `add-registry-dialog.tsx` still uses
> it and is a separate task.
>
> **A fixed `h-[480px] max-h-[80vh]` scroll box inside a dialog.** The same tell
> that gave `Add cluster` away: a dialog's levels are made of air and that only
> works because its body does not scroll. See §13's new paragraph on it.
>
> **Centred body copy, and a second `text-head` heading per phase.** Forms in
> this product are left-aligned on a grid, and the phase name belongs in the
> path. Also off the ladder throughout: `p-8`, `mb-7`, `gap-2.5`,
> `min-h-[76px]`, `py-3.5`.
>
> **The disabled GitHub App option.** It greys with `disabled:opacity-60` and
> hides its reason inside its own body copy. §9: nothing is disabled without
> saying why, and *dim by tier, not by alpha* — `opacity-50` measured two
> catalogue rows under AA. `PickerRow` takes a `reason`, and passing it **is**
> what disables the row.
>
> **`Username` says optional and required at once.** No `*`, and a hint reading
> *"Required for providers using basic auth (e.g. Bitbucket app passwords)."*
> Also: the primary is not blocked with reasons anywhere on this flow (§9).
>
> **Ask what shares a subject.** The credentials phase is `Host`, `Username`,
> `Access token`. Do not pair by count. `Username ǀ Access token` looks like the
> secret form's one pair and may not be — a token *replaces* the username on
> four of the five providers. There may be no pair here, and full width is a
> fine answer; it just has to be the chosen one.
>
> **ALREADY DONE, DO NOT REDO.** Every add is 480; `work`/640 is earned by a
> **rail** and only New stack has one. `Cancel` is off every drawer footer — the
> primary sits alone. "(optional)" is gone product-wide. Drawer bands are 95/81,
> and a two-line description costs 20 more. Step one has no footer and no
> description if its name states the act. `Add cluster` and `Add domain`
> converted on 16 Aug 2026 and §13's exception paragraph is deleted — there are
> no dialog adds left with a carve-out.
>
> **CONSTRAINTS**
>
> - Update existing primitives; never hand-roll a copy. **Ask before adding a
>   component.**
> - **Do not remove any step.** If something looks removable, ask. The `done`
>   phase and the `connecting` phase are exactly where this will be tempting.
> - A shared primitive cannot be narrowed on the evidence of one call site —
>   open the other screens and read a rect. `PickerRow` has five callers.
> - **Two call sites, and one of them is not a page.** `git-source-picker.tsx`
>   opens this wizard from inside the previews `Enable repository` flow and from
>   create-stack's repository step. Check both.
> - Measure, don't eyeball. Assert the **gaps between** elements, not just
>   positions, and settle the animation before reading any rect. A check that
>   fails on a screen you did not touch is measuring itself.
> - Stories are tests. Never `toBeVisible` on drawer content — resolving the
>   name IS the assertion. This flow has **no stories at all**, and one
>   281-line test at `pages/git-integrations/tests/add-integration-wizard.test.tsx`
>   that is written against the wizard's phases and will need rewriting with it.
> - Verify in the running app: `pnpm --prefix frontend dev:mock` (5273) and
>   `dev:mock:empty` (5274). **The empty scenario is the one that matters here**
>   — it blanks the git integrations on purpose, which is what makes the
>   no-provider state reachable.
> - Flag any board frame the change makes stale; **do not sweep my board.**
> - Update §13 and `frontend/CONTEXT.md` when it converts.
> - **Stage by path, never `git add -A`.** I edit files in my IDE while you
>   work. As of 2026-08-16 14:00 there is uncommitted work of mine in
>   `frontend/src/components/git-source-picker/git-source-picker.tsx` and its
>   test, in `new-stack-drawer.tsx`/`.stories.tsx`, and a deleted
>   `tabs/repository-tab.tsx` — **the wizard is a sibling file in that same
>   directory**, so read `git status` before you touch anything and account for
>   every line.
> - Branch `graphite-pass-2`, head `8dea189`, **75 ahead of `main`**, not pushed.

---

## Evidence

Everything asserted above, with where to check it.

| Claim | Where |
|---|---|
| 455 lines, `Dialog size="form"` | `add-integration-wizard.tsx:177` |
| Five phases | `:17` — `type Phase = "provider" \| "github" \| "credentials" \| "connecting" \| "done"` |
| Hand-rolled stepper, and the map that patches it | `:35–82` (`STEPS`, `STEP_FOR_PHASE`, `Stepper`) |
| Orange waiting dot | `:334` — `bg-warn` |
| `CheckCircle2` / `Circle` as step marks | `:330`, `:336` |
| Hand-rolled picker tiles | `:206–226` |
| Second copy of the provider list | `:27–33` vs `frontend/src/lib/git-integrations.ts:29` |
| The drift | `other: "Other"` vs `other: "Git host"` |
| `sr-only` title over a hand-rolled band | `:178–189`, note the `pr-12` |
| `WizardFooter` with Back | `:283`, `:421`. Shared with `add-registry-dialog.tsx` |
| Fixed-height scroll box | `:193` |
| Disabled by alpha, reason in body copy | `:243–262` |
| `Username` optional-and-required | `:383–394` |
| The polling hook | `frontend/src/hooks/use-github-connect.ts` |
| Call site 1 | `frontend/src/pages/git-integrations/index.tsx:141` |
| Call site 2 | `frontend/src/components/git-source-picker/git-source-picker.tsx:490` |
| The existing test | `frontend/src/pages/git-integrations/tests/add-integration-wizard.test.tsx`, 281 lines |

## The one thing to decide before building

**How many phases.** The five-phase machine has to collapse onto §13's two, and
the honest mapping is not obvious:

| Today | Is it a step? |
|---|---|
| `provider` | **Yes** — the catalogue. Step one |
| `github` | **A question** — App install or access token. But it only exists for one of five providers |
| `credentials` | **Yes** — the form. Step two |
| `connecting` | **No** — a wait. But §13 says the wait is *why this is a drawer*, so it must be legible somewhere |
| `done` | **No** — a receipt. Every other add in the product closes and toasts |

The GitHub arm is the awkward one: picking GitHub asks a second question that
the other four providers never see, which is either a third step on one branch
only (the create-stack repository journey's precedent — *"only the journey that
needs it grows one"*) or a **mode field** on step two (the object store
`Provider` precedent — *"a mode is a field, not a first phase"*).

**Both precedents are live and they point different ways.** That is Jaseem's
call, not the implementer's.
