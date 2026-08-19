# Dialog and Confirm — implementation plan

**Self-contained handoff.** Everything needed is here; no prior conversation required.

| | |
|---|---|
| **Authority** | `DESIGN-PRODUCT.md` §3 §5 §6 §6a §8 §9 §13 |
| **Board** | Figma `2IcCJOgsROpgajjXlay1h9` |
| **Components** | `Dialog` `403:4896` · `Confirm` `415:4974` · `Checkbox` `419:5027` · `Drawer` `426:5081` · `Toast` `427:5102` |
| **Branch** | `graphite-pass-2` |
| **Preview** | `pnpm --prefix frontend dev:mock` (5273) · `dev:mock:empty` (5274) |

---

## 0. The rule that governs how this is checked

**Measure the ink, not the box** (§8). A gap between two boxes is not the gap the
eye reads: a line of text sits inside a line box with leading above and below it,
so cap-line to cap-line is what matters. Only control ↔ control is honest
(box = eye).

The first build of this dialog had header → content at box `16` and field →
field at box `20`. Measured, those read as **25 and 26** — the same gap. The
header did not separate from the body at all and **nothing in the source said
so.**

**Verify by driving the running app and reading computed geometry.** Never by
screenshot, never by eye. Render the node, profile the dark-ink rows, diff the
band edges.

---

## 1. The target

### Material

| | |
|---|---|
| Surface | `bg-popover` — **white**. §3: higher elevation is whiter |
| Corner | `rounded-xl` — 16 (§8) |
| Shadow | `shadow-2xl` (§5) — **not `lg`**, that is the dropdown rung |
| Scrim | `bg-scrim` — one value, every overlay |
| Title | `text-head` 20/28. **Drop `leading-none`** |
| Description | `text-body` `text-fg-2` |
| Widths | `ask` 440 · `form` 560 · `work` 760 |

### Rhythm — §8's body/footer model

**Two levels, not three bands.** Header and Content are wrapped into a *body*;
the Footer is a peer of that whole body. The wrapper is the point of the design —
it is what makes the footer break a different level from everything inside it.

```
DialogContent          pad 24 · gap 32          body ↔ footer
├─ DialogBody          gap 20                   header ↔ content     (NEW)
│  ├─ DialogHeader     gap 0                    title ↔ description
│  └─ DialogSection    gap 32                   fields ↔ error slot
│     ├─ fields        gap 16                   field ↔ field
│     │   └─ field     gap 4                    label ↔ control
│     └─ Error slot    AlertBanner, tone=danger
├─ DialogFooter        gap 8 · right            Cancel, then ONE fill
└─ Close ✕             absolute · right 24 · top 29
```

**Why 32 to the footer.** It is the only boundary separating *doing* from
*committing*. 20 against 32 says exactly that.

**Why the error slot also gets 32.** It is a *filled* box with real mass. A heavy
neighbour reads **closer**, so to read as separated it must be measurably
further. Same rule as the eyebrow, running the other way.

**Why the pair is 4.** Grouping is a ratio. Against a 22 list gap, a pair at 8
reads 14 (1.6:1 — does not bind); at 4 it reads 10 (2.2:1 — holds).

**Close ✕ at top 29, not 16.** It centres on the title's cap line, measured
0.15px off, and sits on the 24 column like everything else.

### Confirm

The same object at the **ask** width, with **two** differences and only two:

1. **No close ✕** — Cancel is the way out, and it holds focus.
2. The second button is **destructive** and **disabled until the gate is met**
   (§6a) — rendered disabled, never hidden. The cost has to be visible before it
   is payable.

`Gate` = `none` · `acknowledge` (Checkbox + sentence, gap 8 horizontal) ·
`retype` (label + Field, gap 16). A Confirm with no gate has no Content band at
all; the footer still breaks at 32.

**Focus lands on Cancel**, never on the destructive action.

---

## 2. Step 1 — tokens — **DONE**

Both landed and verified in the running app.

| | |
|---|---|
| `--scrim` | **Added.** `rgb(16 20 26 / 0.50)` light, `rgb(0 0 0 / 0.65)` dark. Exposed as `--color-scrim`. Deeper in dark because the ground is already near-black. **No blur** — it costs a compositor pass per frame and says nothing the dim does not |
| `button.tsx` destructive | **Fixed.** Was `text-white`, now `text-destructive-foreground` |

**Measured contrast on the destructive button:**

| | Before | After |
|---|---|---|
| Light | 5.3 | **5.3** |
| Dark | **2.18** ✗ | **8.96** ✅ |

The token already existed and already flipped (`#FFFFFF` → `#0D0C0A`); it simply
was not used.

**Finding to act on in Step 3:** the confirm's current overlay measures
`rgba(0,0,0,0)` — **fully transparent, in both themes**. The confirm floats over
an undimmed page today.

---

## 3. Step 2 — `components/ui/dialog.tsx` — **DONE**

Landed and measured in the running app (both themes): surface `#FFFFFF` /
`oklch(23.2%)`, radius `16`, shadow `0 28px 64px -20px`, body↔footer `32`,
pad `24`, scrim `rgba(16,20,26,.5)` / `rgba(0,0,0,.65)`. `size` prop, `DialogBody`
and `DialogSection` added; `RhythmIsMeasured` story asserts the 32 and the 20.

`FieldShell` went with it: label ↔ control `6` → **`4`**, measured at 4 in the
running app. That is a product-wide change — every form field moved, not just
dialogs.

Replace on `DialogContent`:

| Now | To |
|---|---|
| `bg-background` | `bg-popover` |
| `rounded-md` | `rounded-xl` |
| `shadow-lg` | `shadow-2xl` |
| `gap-4` | `gap-8` (32) |
| `p-6` | keep — 24 is correct |
| `sm:max-w-lg` | remove; `size` prop owns width |

On `DialogOverlay`: `bg-black/50` → `bg-scrim`.
On `DialogTitle`: `text-title leading-none font-semibold` → `text-head font-semibold`.
On `DialogHeader`: `gap-2` → `gap-0`.
On `DialogFooter`: `gap-2` → `gap-2` (8) — already right; keep `sm:justify-end`.
Close ✕: `top-4 right-4` → `top-[29px] right-6`.

**Add a `size` prop** — `ask | form | work` → `sm:max-w-[440px] | [560px] | [760px]`.
**Then delete every `sm:max-w-*` at the call sites.** A raw max-width at the call
site is exactly how thirteen widths happened.

**Add `DialogBody`** (gap 20) and `DialogSection` (gap 32). Without the wrapper
the footer break is the same level as the header break and the model collapses.

---

## 4. Step 3 — the error slot — **DONE**

Measured in the running app with the create forced to 409: the banner sits **32
below the fields and 32 above the footer**, in both themes, and the dialog stays
open with the form intact.

**Corrections to this step's own list, found while doing it:**

| File | What was actually true |
|---|---|
| `postgres-create-page` | Already routed failures to an in-page `AlertBanner`. Its two toasts are *successes*. No change |
| `enable-repo-wizard` | `configure-phase` already renders an in-dialog banner. No change |
| `add-volume` · `mount-path` | **Never call the server.** Validation is field-level and complete, so an error slot would be dead code. Structure and size rungs applied instead |
| `addon-type-picker` | A picker: the click *is* the submit. No footer, nothing to report |
| Domain **remove** | Kept its toast deliberately — no form is left on screen to correct |

**Six tests asserted the old behaviour** (`toasts destructively…`) and were
rewritten to assert the banner *and* that no destructive toast fires.

## 4a. Step 3 — original brief

A reserved slot above the footer holding `AlertBanner` (`Inline alert`,
tone=danger). Present in the layout whether or not it is filled.

**Then remove the toast-on-failure path from these nine files:**

```
pages/git-integrations/components/verify-integration-dialog.tsx
pages/git-integrations/components/update-credentials-dialog.tsx
pages/image-registries/components/verify-registry-dialog.tsx
pages/image-registries/components/update-credentials-dialog.tsx
pages/image-registries/components/add-registry-dialog.tsx
pages/object-stores/components/object-store-form-dialog.tsx
pages/addons/components/postgres-create-page.tsx
pages/previews/components/config-settings-modal.tsx
pages/stacks/components/editor/tabs/architecture/drawer-tabs/environment-tab.tsx
```

A toast fires **after** the dialog closes, taking the form the user needs to
correct with it. An error reporting a failure the user can no longer act on is
not a message, it is a notification of loss.

**Copy rule:** say what broke and what to do — *"a secret named `DEPLOY_KEY`
already exists; pick another name, or edit the existing one"* — never *"failed to
create secret"*.

**Five dialogs have no error surface at all** and need one: add-domain,
add-volume, mount-path, addon-picker, enable-repo.

---

## 5. Step 4 — Secrets is the gate — **BUILT — AWAITING JUDGEMENT**

`secret-form-dialog` rebuilt on the model. Measured live, both themes:

| | |
|---|---|
| Width | 560 (`size="form"`, the raw 550 deleted) |
| label ↔ control | 4 |
| field ↔ field | 16 |
| header ↔ content | 20 |
| body ↔ footer | 32 |
| error slot | 32 above, 32 below |

Every hand-rolled `Label` + `<p class="text-danger">` in it became `FieldShell`.
Copy went to sentence case (`New secret`, `Create secret`, `Save changes`), and
the Git-credentials step's two numbered headings became one **or** divider.

Create, edit and delete on one page: `pages/secrets/`.

**Get it judged in the running app before touching anything else.** Do not
proceed to the sweep on your own.

---

## 6. Step 5 — `components/ui/alert-dialog.tsx` → Confirm — **DONE**

Measured on the real delete path, both themes: **440 wide**, white / `oklch(23.2%)`,
radius 16, `shadow-2xl`, scrim `rgba(16,20,26,.5)` / `rgba(0,0,0,.65)` — the
**transparent-overlay finding from Step 1 is fixed**. Header ↔ gate **20**, gate ↔
footer **32**, **no ✕**, **focus on Cancel**, destructive button **rendered and
disabled** until the box is ticked.

`AlertDialogBody`/`AlertDialogSection` **are** `DialogBody`/`DialogSection` — the
same components, aliased, so the two objects cannot drift apart.

`Checkbox` already existed and already matched the board (16px, radius 4,
`bg-input` + `border-strong`, `bg-primary` with a `primary-foreground` tick).

**Secrets delete was ungated** — §6a's own table names a secret at level 2. Wired
to `acknowledge`. **The other 13 confirm call sites still have no rung assigned.**

### One deviation from this plan, stated

The `retype` gate's label ↔ field runs **4**, not the 16 written below. 16 would
be a second number for a relationship that is 4 everywhere else in the product —
and "one number per relationship" is this document's own rule.

## 6a. Step 5 — original brief

Re-point at the same material. `bg-background/80 backdrop-blur-sm` → `bg-scrim`.

**`Checkbox` must exist first** — §6a's `acknowledge` rung cannot render without
it. It is on the board (`419:5027`): 16px, radius 4, `surface/input` +
`line/strong` unchecked, `ink/primary` fill with an `ink/on-primary` tick when
checked.

`branded/confirm.tsx` already implements the gate logic, the promise-based API
and the Radix body-lock sequencing correctly — **do not rewrite it.** Only its
material and rhythm change.

---

## 7. Step 6 — the sweep — **DONE**

**Zero `max-w-*` left on any `DialogContent` in the codebase.** Verified in the
running app: add-cluster **560**, object-store **760**.

Two rungs moved from the table below, both because the dialog holds more than the
table assumed: **add-cluster** 2xl → `form` (not `work`), and **object-store**
640 → `work` (not `form`) — a three-provider tabbed form does not fit 560.

## 7a. Step 6 — the mapping

23 call sites carry an explicit width. Map each to a rung:

| → `ask` 440 | → `form` 560 | → `work` 760 |
|---|---|---|
| verify-integration · update-credentials (git) | secret-form (550) | view-changes (760) |
| verify-registry · update-credentials (registry) | object-store-form (640) | build-logs (4xl) |
| add-domain (md) | addon-type-picker (560) | enable-repo-wizard (760) |
| sync-env (440) | welcome-dialog (560) | environment-tab paste (4xl) |
| rename/create/delete-project (md) | add-registry (540) | |
| postgres save-advanced (460) | add-integration-wizard (540) | |
| new-preview-env (480) | add-cluster (2xl) | |
| invite (lg) · add-member (md) | | |
| add-volume (md) · mount-path (sm) | | |

**Anything that will not fit 760 is not a dialog** — reach for a drawer (§13).

---

## 8. Step 7 — correctness fixes riding along

| | Status |
|---|---|
| **Domain remove has no confirm** | **Fixed.** Wired to `acknowledge`, with two tests — the path had **no coverage at all** |
| **Git verify / update credentials unreachable** | **Fixed, but the diagnosis was wrong.** The row menu wires both correctly; they are hidden on `github_app` **by design** (the backend rejects both there) and the preview shipped **only** a `github_app` row. A `credentials`-type integration was added to the fixtures — both dialogs are now reachable |
| **Empty preview ships a cluster** | **Fixed** — and it was worse than written. The page allows exactly one cluster and the *default* scenario ships **two**, so `Add cluster` was disabled in **both** scenarios |
| **Delete vs Remove** | **Open.** A copy audit across the whole product, not a dialog change |

---

## 9. Out of scope

| | |
|---|---|
| **Drawer and Toast** | Designed on the board, separate pass. Drawer is the bigger one — the only drawer in the product is a hand-rolled `div` in the stack editor with no scrim and no shadow |
| **5 project/user dialogs** | No route; `/settings/*` redirects to `/`. Build the doors or delete the rooms — a product call, not this sweep's |

---

## 10. Already settled — do not re-litigate

| | |
|---|---|
| Band model | **Two levels** (body/footer), not three bands. §8 was wrong and is fixed |
| `Confirm` header → content | **20**, same as Dialog. It briefly ran 24; corrected. One number per relationship |
| `6` in `Button`/`Select` | **Not off-ladder.** A 16px icon box holds 12px of ink, so `6` renders as `8` |
| Title ↔ description `0` | Correct. `head/600` already carries 13px between cap lines. Do not "fix" it |
| Create-stack primary | **Page header, not a footer.** Code is right; the board still shows a `foot` band on all five screens and is the stale side |
| `PickerList` 2px | **Not flush.** Rows carry hover and selected fills; flush, those fills merge into one block when two neighbours light up |
| Create-stack column gap | **24** — applied |
