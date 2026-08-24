# Tasks

Work left on the design pass. Decisions live in `DESIGN-PRODUCT.md`, reasoning in
`docs/design/redesign-log.md`, vocabulary in `frontend/CONTEXT.md`. This file is
only *what is not done yet*.

## Now

- [ ] **Confirm two Storybook-browser tests, or fix them.** `previews-page`
      (`One Repository`) and `connect-provider-drawer` (`Waiting On The Git Hub
      Popup`) failed as **30-second timeouts**, not assertions, while Storybook
      and `dev:mock` were both running. `repo-combobox` failed identically in the
      same run and **passed 9/9 clean in isolation**, so these are very likely the
      same starvation — but that is inference. Done = one full `pnpm test:run`
      with no dev server running, and either green or a real fix. — added 2026-08-24

- [ ] **Decide the five findings the populated deployments tab exposed.** All are
      real, none is blocking, and each is a small change once called:

      | # | Finding |
      |---|---|
      | 1 | `Deploy failed · 1 of 4 resources failed to become ready` renders **twice within ~90px** — the release row's line two, then the banner. The last event of a failed release always restates its header |
      | 2 | The `Changes` heading renders over *"No configuration changes since #2."* — a heading introducing an absence |
      | 3 | The stack header carries **`Degraded` and `Failed` together** — two status words for one stack |
      | 4 | Header says `Draft 3 changes`, the section says `Changes 1` — different objects, adjacent, both numbers |
      | 5 | The stage tracker restates the row's own sentence once a release is terminal. It earns its row **in flight**, where there is no sentence yet |

      Done = each either landed or explicitly parked in `DESIGN-PRODUCT.md` §15. — added 2026-08-24

- [ ] **The diff's key column is one typeface for two kinds of string.**
      `LOG_LEVEL` is an env-var name and `sync before use` is English, and both
      render mono in the same column — the case §6 forbids ("mono follows the
      CONTENT, never the column"). The component cannot tell them apart:
      `labelForField` returns both from one call. Done = `policy.ts` marks which
      labels are identifiers, and `ConfigDiff` sets the typeface per row. — added 2026-08-24

- [ ] **`w-fit` diff cards will go ragged on a real multi-resource diff.** Each
      card sizes to its own widest row, so a long image ref sits beside a short
      env change with two different right edges. The preview has only matching
      rows, so it has never been seen. Done = judged on a diff with three or more
      resources of differing row lengths, and either kept or floored to a shared
      width. — added 2026-08-24

- [ ] **The live anchor has no chevron, and now that is visible.** Every rail row
      leads with a disclosure; the anchor's title starts where their chevrons are.
      It is a pinned summary rather than a tree node, so it does not branch — but
      it sits directly above the rail. Done = either it takes a chevron in the
      same slot, or its dot leaves the rail column. — added 2026-08-24


- [ ] **Retire `text-label` (11px) in favour of `text-column` (11.5).** Jaseem,
      23 Aug 2026: *"11.5 will be the smallest text size from now on, we will be
      abandoning 11, we will do it step by step."* The rung is on the scale and
      the stacks header uses it; **`text-label` is still defined and still has
      call sites.** Done = no `text-label` left, and the token removed from
      `index.css` and from `TEXT_SCALE` in `lib/utils.ts` — a size token is two
      edits in both directions. **Explicitly per surface, not a sweep**, the same
      way the two-weight rule was landed. — added 2026-08-23

- [ ] **23 nodes on the Figma board still draw a shadow by hand, and each one is
      a design call rather than a propagation.** The other 308 were bound to
      `elevation/sm` on 23 Aug; **793 nodes now follow a style**, up from 341.
      What is left carries a value that is on no rung, so binding it would change
      how the frame looks and that is not mine to decide:

      | Count | Shape | Frames | Probably wants |
      |---|---|---|---|
      | **11** | `y16/r40/s0/22%` | `Drawer — New stack`, `A ready-made app`, … | `elevation/2xl` |
      | **6** | `y12/r32/s0/18%` | `Drawer — New addon`, `Add domain` | `elevation/2xl` |
      | **5** | `y2/r8/s0/10%` | `sheet` | `elevation/md` |
      | **1** | `y0/r8/s-3/5% + y1/r1/s0/8%` | `Button` | `elevation/sm` — right layers, `y0` not `y3` |

      **The drawers are the real finding: they use three different shadows and
      not one of them is `elevation/2xl`.** That predates this pass. Done = each
      bound to a style, so the next token change propagates on its own.
      **Jaseem updates the board frame by frame.** — added 2026-08-23

- [ ] **Sweep the other places a width is stated twice.** §11's amendment
      (23 Aug) settles the rule — one exported constant spent on both the header
      cell and the control, never a number computed once and copied — and
      `ColumnsSitOnTheirControls` guards Ports. **Mounts was never measured**: it
      renders no `RecordColumns` header today, so it has nothing to drift from,
      but it will the moment it gains one. Environment measured clean (0/0/0)
      after the `DirtyField` fix and has **no guard test**. Done = Environment
      carries the same alignment assertion Ports does, and any list that gains a
      column header gains one with it. — added 2026-08-23

- [ ] **Decide the docked volume's fate on the Figma board.** The card shipped
      today with its volume rows **flush on the card's two columns** — glyph 16,
      name 40, row at the 28 rung, and the last row running to the card's bottom
      edge with no padding under it, so the hover wash rounds into the corners.
      The board's `Canvas node` symbol still predates the volume dock entirely
      (flagged 22 Aug, still open). Done = the symbol draws the settled card.
      **Jaseem updates the board frame by frame.** — added 2026-08-23


- [ ] **Propagate the settled section shape to every DETAIL surface — one sweep,
      not two designs.** Jaseem, 2026-08-23: *"for all details, we should not
      design separately, we already have the sections and layout finalised, just
      propagate that design everywhere."* The shape is `FormSection` (a full-bleed
      rule and a `body/500` label, never a card) + `FieldGrid` (16) + `FieldShell`
      (4 label→control), controls at 32, sections 16 above the label and 16 below
      the last field. **The swap is `Panel` → `FormSection`.** Surfaces:
      `pages/addons/postgres-detail-page.tsx` (0 stories, 1 file since the bulk
      pass), `pages/clusters/components/detail/index.tsx` (**0** files since),
      `pages/addons/components/postgres-connection-panel.tsx`,
      `pages/object-stores/index.tsx`. Done = every one measures the same rhythm
      as the resource drawer, verified in the browser, and `Panel` has no callers
      left outside the canvas files that use the word for something else.
      — added 2026-08-23

- [~] **The hairline on an elevated surface is an OUTLINE, not a border.**
      **Corrected twice on 2026-08-23 — read this before trusting the note below.**

      The first correction: "Left: `card` and `select`" was **wrong on both
      counts.** `select`'s *trigger* was already converted (I had checked it and
      not its *content*), and `card` carries no shadow, so it is not an elevated
      surface and keeps its border.

      The second, larger correction: **converting a class is not the same as
      drawing a line.** `popover`, `dropdown-menu`, `tooltip` and `dialog` were
      all recorded as converted and **none of them rendered a hairline** — Radix
      writes `outline: none` inline on every portalled `Content`, which beats any
      class. All six floating surfaces now compose `--edge-hairline` ahead of
      their elevation rung instead. See §4.

      **Left: the drawer's 32px glyph tile** (`drawer.tsx`, `shadow-md` with a
      `border`). It is the one case where converting changes the PAINTED size —
      32 → 34 on a stated 32 rung — so it is a design call, not a sweep.
      Done = that tile decided, either way. — corrected 2026-08-23

      Original note follows, kept because its reasoning is still the rule.
- [ ] **The hairline on an elevated surface is an OUTLINE, not a border.** It is
      drawn outside the box and costs the layout nothing, so the drawn size and
      the spec'd size stay one number. Code `outline: 1px solid`; Figma
      `strokeAlign = 'OUTSIDE'`. **Elevated surfaces only** — the main sheet,
      dropdown menus and popovers, canvas cards, drawers, dialogs, toasts. A
      field, an input, a select, a bordered row keep their border. **A one-sided
      rule is a divider and stays inside** (the sheet header's bottom hairline, a
      drawer's header/footer rule). Already shipping on `app-layout.tsx` (the
      sheet) and `ui/toast.tsx`; the Figma canvas section is fully converted (40
      strokes flipped 17 Aug). Still on `border`: `card`, `dropdown-menu`,
      `popover`, `drawer`, `dialog`, `select`, `tooltip` — of which only the
      first four are elevated. **Removing a border returns 1px per side to the
      content box, so every fixed height in the converted component needs
      re-measuring.** Done = **screen by screen, audited one at a time** — this
      is explicitly not a sweep. — added 2026-08-17
- [ ] **§5 needs one sentence: a canvas is a space, not a surface.** "Content is
      flat" has had exactly one exception, the selected segment. The canvas needs
      the second: **the objects in a canvas are the one content that floats**, and
      they carry `shadow-md`. It is the only mechanism that separates a white card
      from a white ground — measured, a hairline needs **49% ink** to clear 3:1,
      which is a drawn outline and not our line. Both reference editors do it.
      Done = the sentence is in `DESIGN-PRODUCT.md`, or the call goes the other
      way. **Jaseem's call.** — added 2026-08-17
- [ ] **`Avatar` is stroked INSIDE, inside the `Sidebar` component.** Found during
      the canvas audit. It has to be fixed on the component, not overridden per
      instance. — added 2026-08-17
- [ ] **Two calls open on the canvas node card.** **(a)** `new` and `edited` carry
      the same ink stripe — the card answers *is this saved*, not *which kind of
      unsaved*, and the diff already says which. **(b)** The drop target is the
      selection ring, dashed; the code today uses an orange ring there and orange
      is now off the canvas entirely. Both on the board in `node specimens`
      (`725:19851`). **Jaseem's call.** — added 2026-08-17
- [ ] **Seven glyphs on the canvas board are vectors, not components.** Named
      `⟨needs a component⟩`: `circle-check`, `circle-x`, `circle-dashed`,
      `loader`, `trash`, `hard-drive`, `external-link`. Six of the seven are §7's
      named state-glyph set, so they belong on the board regardless. Plus three
      hand-built pieces with no component behind them: **Tabs**, the **version
      chip**, the **status pill**. Done = approved and built. — added 2026-08-17
- [ ] **Two more glyphs on the canvas board are vectors:** `chevron-down` and
      `chevron-right`. Both are **single** chevrons, which §7 distinguishes from
      the pair — a pair PICKS a value, a single one OPENS what is under it — and
      the file only has `chevrons-up-down`. They carry the disclosure headers and
      the openable mount row. Done = added to `Icons — lucide` (`17:4`).
      — added 2026-08-17
- [ ] **The inspector's footer holds two ghosts and no primary.** `View logs` and
      `Remove resource`, and nothing that commits — the inspector saves into the
      draft as you type, and `Deploy` in the sheet header is what commits. §13's
      footer rule ("step two's footer holds the primary alone") was written for a
      form that ends in a confirm. Done = either the rule gains a sentence about
      a surface that autosaves, or the footer changes. **Jaseem's call.**
      — added 2026-08-17
- [ ] **Canvas frames 01 and 02 draw the pre-edit node card.** The per-state
      glyph, the text column at 58, `service` in lowercase. The settled card is
      on `node specimens` (`725:19851`) and frames 03/04/05 clone from there.
      Their Light/Dark variable modes were also **swapped** — fixed 17 Aug — so
      the frames now render as their names claim. Done = 01 and 02 take the
      settled cards. **Jaseem updates them frame by frame.** — added 2026-08-17
- [x] ~~**A port does not read as one thing, and nor does an env var.**~~
      **Settled 2026-08-17, by Jaseem drawing it himself** (`773:41580`). The
      record is **left-packed**: controls **4** apart, **nothing pinned** to the
      far edge, a two-way choice is a **segmented** (`Public ǀ Internal`) rather
      than a switch with a floating label, and the remove is a **32 icon button**
      packed straight after. **The record fills the column** (Jaseem stretched it
      after the first pass): members holding arbitrary values `FILL`, members
      holding a closed set stay their own size — segmented 130, remove 32. The
      hole was `ml-auto`, not the width, so §8 stands and only needs the sentence
      about a fixed member. The four drawn options came off the board.
      — added 2026-08-17, settled same day
- [ ] **Validation is enforced and never stated.** Backend requires
      `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` max 63 for a resource name
      (`pkg/validator/stackresource/input_rules.go:64`) and **puts the regex in
      the message the user reads**; the same leak is in `objectstore` and
      `postgresaddon`. The **frontend checks nothing but non-empty**
      (`pages/stacks/schemas/form-schema.ts`), so the round trip is what tells
      you. And the constraint used to be stated in `LedgerRow`'s right-margin
      `meta` — *"lowercase · unique in stack"* — which came off with the metas.
      Pattern drawn on the board (`791:32017`): the rule is a **hint** under the
      control at rest, and the **same rule in the imperative** replaces it on
      failure. **`Field` and `Select` have no error variant** — a shared
      primitive, so it needs approval before it is built. Full brief in
      `docs/design/canvas-implementation-plan.md` slice 8. — added 2026-08-17
- [ ] **`Field`, `Select` and `Segmented` disagree about what a value looks like.**
      Found 2026-08-17 — *Jaseem:* **"why are some of the values medium and some
      regular font weight?"** `Field` ships its text `body/400` **muted** (it has
      only a placeholder state, so every filled input reads as empty), `Select`
      ships `body/500` **medium** ink, `Segmented — label` ships `meta/500` at
      **12** inside a row of 13s. **The rule: a value is `body/400` at ink; a
      placeholder is the same size and weight and only the colour changes; the
      label above keeps `body/500`.** Corrected as instance overrides on the three
      canvas inspector panels only. Done = the components carry it — `Field`
      needs a filled-vs-placeholder distinction — and the code audit follows
      screen by screen. **Jaseem's call on the component edit**, since it reflows
      every board frame that uses them. — added 2026-08-17
- [ ] **Mono is now off the canvas, and on everywhere else.** *Jaseem
      2026-08-17:* **"remove mono from everywhere in the last design you did
      except from url — this includes nodes etc."** The canvas section went from
      **134 mono text nodes to 15**, all `ghcr.io/…`. Off it: kind labels
      (`Web`, `Service`, `Postgres`, `volume`), status words, column headers,
      `paste .env` / `clear all`, `public`, `3 changes`, volume names, and every
      image tag, version and path — **a tag is not a URL, a path is not a URL**.
      The rest of the product still ships §6's two mono rungs: create-stack's
      `Picker row` sub-line, list pages, drawers, the whole previews section, and
      in code `font-mono` across ~40 files. Done = either §6 narrows to "mono is
      a URL" and the product follows screen by screen, or the canvas is an
      exception and §6 says why. **Jaseem's call.** — added 2026-08-17
- [ ] **The canvas picker and the create-stack picker diverge, in code too.**
      `AddResourcePanel` shares `blockCatalog` and `BlockPicker` with the wizard,
      so it inherits the **added badge** — the `×1` count and the tick. On the
      canvas a click **is** the add and the graph is the record, so there is no
      set to report: the board now draws `Trailing=none` on every row and a
      **272** popover (was 560 in code, 380 on the board). Done = `BlockPicker`
      takes a prop for the trailing slot, or the canvas gets its own row shape.
      — added 2026-08-17
- [ ] **Deployment is four fields wearing a whole tab.** Init command, Init
      arguments, Command, Arguments — at the same rung as a Configuration
      carrying fourteen. Measured on `inspector — every field, unscrolled`
      (`761:31657`): the full form is **1952** tall and the panel shows **592**.
      Done = the sub-tabs become sections, which is what the board now draws, or
      a reason the tab earns its third of the strip. — added 2026-08-17
- [ ] **§15's "split detail layout" is answered and the file does not say so.**
      The row reads *"Add if a journey demands it"*; the canvas inspector is that
      journey and it landed as a **region of the sheet — 480, flush right, square,
      one hairline seam, no scrim, no shadow, bands 95 ǀ 592 ǀ 81**. Done = the
      row moves out of Open and into §13, or the call goes the other way.
      — added 2026-08-17

- [ ] **Six previews frames are now behind the code.** The build changed four
      board calls after judging them live, so the frames say something the
      product no longer does: the status **dot** is a per-STATE glyph on every
      frame; frames 02 and 03 keep the **toolbar**; frames 01/04/05 gain a
      **`Sort:`** control; `drawer/Repository settings` loses its **`Cancel`**,
      takes `Remove repository` to a solid **`destructive`** fill, and its
      env-var row is **120 ǀ 175 ǀ 88 ǀ 32** with the source select kept. The
      rail is unchanged. Done = the frames match, and Jaseem updates them frame
      by frame. **Jaseem's call.** — added 2026-08-16
- [ ] **The settings drawer carries two filled buttons.** `Remove repository`
      (destructive) and `Save changes` (ink) are both solid on one surface. §9's
      one-filled-button rule was written for a page and this is a drawer, but it
      is the first surface in the product with two. Done = either the rule gains
      a sentence about overlays, or `Save changes` steps down. **Jaseem's call.**
      — added 2026-08-16
- [ ] **The rail gear is not concentric.** Rail item radius 8, right padding 4,
      gear radius `sm` (6) — concentric wants 4, which is not on the `Radius`
      ladder. The clean fix is dropping the rail item's **right padding 4 → 2**,
      so the existing `sm` becomes correct. That padding is Jaseem's own value.
      Done = a call. **Jaseem's call.** — added 2026-08-16
- [ ] **Drawer titles are on two rungs.** Both previews drawers now use
      `title/500` (16). The `Drawer` component and every older built drawer on
      the board still ship `head/500` (20). Done = a decision, then the component
      moves or the two previews drawers move back. **Jaseem's call.**
      — added 2026-08-16
- [ ] **The board template's header band contradicts §12a.** `00 list page —
      populated` (`411:7765`) ships a **100px** band at a **12px** horizontal
      inset; §12a says 64 single / 108 double at **16**. Every previews frame
      clones the template, so they carry 12/100. Done = one of the two is
      corrected. — added 2026-08-16
- [ ] **Four rails, three widths, four paddings.** previews 240/8, new-stack
      drawer 240/20, `Section 1` 240/16, the two journey rails 300/24.
      Normalising reflows those frames, so it was offered and not done. Done = a
      call on one geometry. **Jaseem's call.** — added 2026-08-16
- [ ] **No external-link icon in `Icons — lucide` (`17:4`).** `Open ↗` and `Open
      the stack ↗` use the `↗` character in the label. Done = either an
      `arrow-up-right` icon is added (new component — needs approval) or the
      character stands. — added 2026-08-16
- [ ] **Frame `01b` (`686:8589`) is redundant.** It was the review's before/after
      frame; every finding is now on `01`. Its rows were relinked to the
      component so it cannot drift. Done = deleted, whenever. — added 2026-08-16


- [ ] **Two open calls on the object store drawer.** Both on the board, section
      `object stores — the surface, and what shares a subject`: **(a)** the
      credential control — `Access key ID ǀ Secret access key` is one credential
      in two boxes, the `Username ǀ Password` case, but each half is *two*
      selects, so the pair only fits if `SecretKeyPicker` collapses to one
      control (frames Cred 1/2/3); **(b)** the provider control — segmented
      against select (frames S/T). Shipped on stacked + select, which needs no
      further decision. **Jaseem's call.** — added 2026-08-16
- [ ] **`Retention` and `Region` open pre-filled.** `7d` is the product's
      documented default and defensible; `us-east-1` was a **guess** on a
      required field, which §13 bans — it is empty now with `eu-west-1` as its
      placeholder. Done = a call on whether `7d` stays seeded. **Jaseem's call.**
      — added 2026-08-16
- [ ] **The sidebar says `Object Stores`.** Title Case, where §6 says sentence
      case and every other nav label obeys. Out of scope for this pass, one word.
      — added 2026-08-16

- [ ] **The addon detail page.** Audited 2026-08-16, nothing changed yet:
      **(a)** it still carries `← All addons`, which §12a explicitly names as
      deleted — the breadcrumb `Addons / Postgres / orders-db` is directly above
      it saying the same thing; **(b)** `Delete` sits in the header beside `Edit`,
      where §12a says destructive actions go in the kebab, and the header has no
      kebab; **(c)** `Connection` and `Configuration` are bordered cards with
      tinted header strips on a sheet that already floats (§3/§5 — content gets
      no elevation); **(d)** the empty `No connection details yet` region holds
      ~330px for two lines. Done = a decision on each. — added 2026-08-16
- [ ] **Two grouping questions left on the addon form.** Neither is a rule break,
      both are judgement: **(a)** `Version` sits under `Configuration` with the
      size fields, but it is what the database *is* rather than how big — it may
      belong up top with `Name` and `Create`; **(b)** `Superuser credentials` is
      the one item in `Configuration` that is not a resource dimension — it is
      access, sitting among CPU, disk and replicas. Moving it means inventing a
      section for one switch. **Jaseem's call.** — added 2026-08-16

- [ ] **Decide `SOURCE_LEDE`'s fate.** Dead constant in `starting-points.ts` holding
      per-source copy written for the old tab strip's sub-line. Nothing renders it.
      §13 says journey steps get no description, so deleting is consistent — but it
      is real copy that no longer appears anywhere. Done = deleted, or given a home.
      **Jaseem's call.** — added 2026-08-16
- [ ] **Decide `import-warnings-toast.tsx`'s fate.** Orphaned since warnings moved
      inline. Done = deleted, or claimed by a canvas-side import. **Jaseem's call.**
      — added 2026-08-16
- [ ] **PR the branch.** `graphite-pass-2`, **81 commits ahead of `main`**,
      nothing pushed. All green (280 files, **2083 tests**, `tsc` clean, lint 0
      errors). Done = up for review. — added 2026-08-16, count refreshed
      2026-08-16 16:43
- [ ] **Check the secret Name placeholder against real naming.** It now reads
      `stripe-api-key`, matching every other name specimen in the product
      (`main-db`, `orders-db`). The `dev:mock` fixtures use env-var style —
      `STRIPE_API_KEY` — and the backend validates nothing beyond non-empty, so
      the placeholder is currently teaching a convention the product does not
      enforce. Done = the fixtures and the placeholder agree, either way.
      **Jaseem's call.** — added 2026-08-16

## Next

- [ ] **Keep "every revamped component has a story" true.** Cleared 23 Aug: the
      audit found 12 revamped components with no story and 5 hand-rolled copies
      of `SearchField` still being rendered in its place. Storybook now covers
      all of them (121 story files, 2286 tests). This decays silently — a
      component revamped without a story is invisible again, and a copy made at a
      call site goes on showing the old version. Done = a check that fails when a
      component under `src/components` has no story and no parent story that
      renders it. — added 2026-08-23


### The adds still on a dialog

**§13 says every add is a drawer at 480.** Eight were not. Audited from the
router 2026-08-16; each is its own entry so they can be picked up separately.
**Two are done** — `Add cluster` and `Add domain`, which were the two §13 named
by name as exceptions. Six left.

- [x] ~~**`Add image registry` — its own job.**~~ **Promoted to Now
      2026-08-16 14:57** with a full brief; see the entry above rather than this
      one. Left here so the audit's count of eight still reads.
      — added 2026-08-16
- [ ] **The four remaining adds.** `Create project`, `Add member`,
      `Invite user`, `Add volume` (canvas). Projects has **no route** — it is
      four dialogs and nothing else. Done = a call on whether projects gets a
      surface before its adds get converted. — added 2026-08-16
- [ ] **Three edit-dialogs, a judgement call.** `Repository settings`
      (previews), and `Update credentials` (×2, git integrations and image
      registries). They edit an existing object, which §13 points at a drawer,
      but none of them is an *add*. Done = a call. **Jaseem's call.**
      — added 2026-08-16

### Noticed while converting the last two adds

*All three deferred by Jaseem 2026-08-16: "none of the issues need fixing right
now."* Recorded so they are not re-raised as blockers.

- [ ] **The default preview contradicts the page's own rule.** `/clusters`
      shows **two** rows while its `Add cluster` reads *"Only one cluster is
      supported today."* Checked 2026-08-16: the reason is **true** — no
      stack-creation path in the frontend references a `cluster_id`, so a second
      cluster is unreachable from the product — which makes the **fixture** the
      wrong one. Dropping it to one row also stops `Add cluster` being dead in
      the default preview; the reachable-add case is already `dev:mock:empty`'s
      job. **Frontend only, no backend.** Done = one cluster in the default
      scenario. — added 2026-08-16
- [ ] **The CA certificate is masked.** `Add cluster` hides it behind an eye
      toggle, alongside the service account token. A CA cert is the certificate
      the cluster hands every client on connect — public trust material, not a
      secret — and masking it means pasting ~1,700 characters of base64 you
      cannot then check. The token's mask is correct and stays. **Frontend
      only.** Done = a call, then one `type` attribute. **Jaseem's call.**
      — added 2026-08-16
- [ ] **Does the product support more than one cluster?** The question behind
      the two above, and the only one with backend work in it. Nothing in `pkg/`
      caps an org at one; the **UI** has no way to route a stack to a chosen
      cluster, which is what "today" is doing in that sentence. Hub-and-spoke
      across many clusters is the product's stated premise, so this is a
      roadmap question, not a bug. Done = a decision. **Not this pass.**
      — added 2026-08-16

### Areas the pass never reached

- [ ] **Sign-in / sign-up.** Zero stories, never audited. — added 2026-08-16
- [ ] **The canvas editor** (`/stacks/:id`). The largest surface in the product;
      37 stories but no design pass. **Its own project, not a sweep.**
      — added 2026-08-16
- [ ] **Cluster detail and preview config detail.** Never audited. The addon
      detail page was, and produced four findings — expect similar.
      — added 2026-08-16
- [ ] **`font-semibold`: 60 occurrences across 39 files.** §6 took weight 600
      off the scale and said the rule lands ahead of the code. Done = swept, or
      a decision to sweep it per-screen as each is touched. — added 2026-08-16

- [ ] **Update the stale Figma frames.** Flagged, not swept — Jaseem updates the
      board frame by frame. Picker row `234:1953`: six variants (56 × `plus`/`remove`)
      still draw the name at 14 where code is 13. `564:6733` draws the repo name in
      JetBrains Mono 12 where code follows the primitive. `564:6845` labels the dead
      search `Filter stacks…`. Track→field gap is 16 on one frame and 8 on the other.
      **Section `483:5283` ("enable repository") is now stale too** — it draws the
      shared slot, the 225 `Connected provider` track, an 86 header and phase two's
      back arrow, none of which the code has any more.
      **And every add drawer drawn at 640 is now stale**, since the rung came down
      to 480 for everything except New stack: `533:5453` frames `543:5556` /
      `535:5453` (the addon catalogue and its form), all four of `597:6952`, and
      all four of `483:5283`. **`556:6373` (New stack) is still correct** — it is
      the one that kept 640, because it is the one with a rail.
      **And anything drawing `Add image registry` is stale as of 2026-08-16**
      — it is a drawer at 480 now, two steps, with `PickerRow`s where the five
      `min-h-[76px]` tiles were, a path where the `sr-only` title and hand-rolled
      band were, and no footer at all on step one. **Any frame showing a `Back`
      button is stale on its face**: `WizardFooter` is deleted and there is no
      `Back` anywhere in the product. Node IDs not listed because this flow was
      never on the board — if a frame for it exists, it predates the pass.
      — added 2026-08-16, widened 2026-08-16, widened again 2026-08-16
- [ ] **Option D for the repository step**, parked deliberately: one box that both
      searches yours and accepts a pasted URL, no segmented control. Removes a mode.
      Blocked on the first-run state — a new org would see "search or paste" over an
      empty list. Revisit when no-provider is no longer a common landing.
      — added 2026-08-16
- [ ] **Option D, now for two forms.** Parked with board frames drawn:
      the kind becomes **step one** of a two-phase drawer, the way the addon
      catalogue works — pick `Docker registry`, then fill only its form, with the
      path carrying the kind. It makes "three of six" unbuildable rather than
      merely fixed, and costs a click on the common case (Generic). Board section
      `secrets — what shares a subject`, frames D. **Object stores' `Provider` is
      the same question** — same shape, same position, same argument — so a yes
      moves both or neither. — added 2026-08-16, widened 2026-08-16


## Done

- [x] ~~**`Add image registry` comes off the dialog.**~~ **Done 2026-08-16.**
      A drawer at **480**, **two phases** — `Add registry › Pick a registry`,
      then `Add registry › GHCR`. The phase call went **against** §13's own
      test: taken alone that form answers *"can you start without it"* with a
      yes, and the payload proves it (`RegistryCredential` is
      `{host, username, password, purpose}` — the provider is not in the record
      at all, and the list row derives it back from the host). Jaseem overruled
      it on the running screen — *"for git integration we have to select the
      service first, I think it has to be same here as well"* — and §13 gained
      *"the phase test is answered per FLOW, not per form — siblings match"*.
      `wizard-footer.tsx` and its story are **deleted**; that was the product's
      last `Back`. Three brand-art maps became one (`brand-icon-registry.ts`
      grew the five host slugs; both `ProviderLogo`s are `BrandIcon` wrappers;
      the id→slug mapping moved onto `REGISTRY_PROVIDERS.brandSlug`).
      The empty state's list derives from the catalogue (`namedRegistries()`),
      the primary blocks and names every missing field, `Purpose` is marked
      required, and `registryProvider(id)` replaced the two `.find()` lookups.
      **Eight stories and seven unit tests**, where the add flow had none.
      Measured in both previews: 480 · header 95/73 · footer none/81 · one
      leading and one trailing edge · pair gutter 16.

- [x] **The toast's contact shadow — taken.** *Jaseem's call 2026-08-16, off the
      two rendered side by side.* `--shadow-toast` is `elevation/lg` plus the
      tight darkness where an object meets the surface it sits on: the edge goes
      **1.43 / 1.54 → 1.52 / 1.72** in light. **Not a fifth rung** — `lg` with one
      more layer, named for its one caller, so §5's ladder still has four.
      **Dark aliases `lg`**, measured: its ground is already near-black, so a
      contact layer moved nothing (1.44 / 1.32, unchanged). The exception is the
      *surface*, not the component — the toast is the only one that lands on its
      own fill with no scrim behind it. — added 2026-08-16, done 2026-08-16

- [x] **The toast, built to board `427:5102` for the first time.** §13 had
      described it for weeks and the code had never been it: border tinted per
      tone, no glyph, a `font-semibold` title over a dimmed caption, and no
      clock. Now 380 / radius 12 / padding 16 / gaps 8 / `elevation/lg`, **one
      paragraph** of `body/400`, tone in the glyph alone, and it **dismisses
      itself** on ~1s per three words over a 3s base (clamped 4–10s) — with a
      toast carrying an action never timing out. Went to top centre for a day
      and came back: the centre lands on the sheet header, and in light both are
      white. The edge is `line/strong` **outside**, because `surface vs ground`
      measures 1.00 and the hairline is the whole object. 7 stories where there
      were none. — added 2026-08-16, done 2026-08-16

- [x] **`Connect git provider` — the last add with a drawer in the rules and no
      drawer to show for it.** `add-integration-wizard.tsx` (455 lines,
      `Dialog size="form"`) → `connect-provider-drawer.tsx` at 480, both call
      sites moved (the page, and `git-source-picker.tsx`, which is not one).
      **Five phases became three:** catalogue, the GitHub question, the form —
      *Jaseem's call, taken before building: a third step on the GitHub arm, not
      a mode field, because the App branch has no form to start.* The polling
      wait is a **state** inside the GitHub step; `done` is a toast. Came off:
      the hand-rolled stepper and its `STEP_FOR_PHASE` patch, five
      `min-h-[76px]` tiles (→ `PickerRow`), the `sr-only` title under a `pr-12`
      band (→ `DrawerHeader`), `WizardFooter` with `Back`, the
      `h-[480px] max-h-[80vh]` scroll box, centred copy, `p-8`/`mb-7`/`gap-2.5`.
      `GIT_PROVIDERS` is the registry now and display names derive from it —
      the two lists had already drifted. `Username` required on Bitbucket only.
      **Judged live and changed twice:** the wait's three-line checklist deleted
      (two hook states drawing three stages — the screen was more confident than
      the code), and the error banner moved to the top of the body. 9 stories
      where there were none; 15 unit tests replacing a 281-line one.
      — added 2026-08-16, done 2026-08-16

- [x] **`Add cluster` + `Add domain` — the last two adds on a dialog.** Both on
      `DrawerContent size="form"` (480), one phase, footer holding the primary
      alone. Cluster: the `max-h-[80vh] overflow-y-auto` scrolling dialog that
      had been signalling "drawer" all along; the hand-rolled switch row onto
      `FieldShell inline` (and the `mt-0.5` nudge gone with it); the switch
      naming the **thing** (`Image registry`); the `pl-11` inset dropped so the
      revealed field sits on the body's column; Title Case swept, `New` dropped
      from the title because Stackdome connects to a cluster it did not make;
      `Cluster URL` → `API server URL`; the doubled `20Gi` hint/placeholder down
      to one job. Domain: one field, and a drawer anyway — the rung describes
      the question, the rule is about the answer. Both primaries now say what is
      missing. **Nothing pairs on either form; full width is the chosen
      answer.** 13 stories added (domain had none), 31 measured checks in
      `dev:mock:empty`. §13's exception paragraph deleted.
      — added 2026-08-16, done 2026-08-16

- [x] **Object stores, the same exercise.** The add flow moved off a `Dialog` at
      `work` onto a one-phase **drawer** at `form`; the provider tab strip became
      a derived `Select`; `SecretKeyPicker` rebuilt on `FieldShell` (four
      hand-rolled asterisks gone, and the form's three trailing edges down to
      two); `Region ǀ Endpoint URL` un-paired after it was found rendering
      stacked; copy onto sentence case and specimens; the delete-this-store
      banner replaced; the primary blocked with reasons; seven stories added and
      the preview fixtures made reachable. Rules in §10 and §13.
      — added 2026-08-16, done 2026-08-16
- [x] **The flaky story.** `new-stack-drawer > No Provider Connected` was a
      `toBeVisible` on drawer content read mid-animation. It is a `findByRole`
      now — resolving the name IS the assertion.
      — added 2026-08-16, done 2026-08-16

- [x] **Row actions: the count decides.** One or two actions sit on the row,
      three or more collapse into a kebab. Secrets and Stacks moved inline to
      match Object stores and Domains; Image registries and Git integrations keep
      their menus. Stacks' hand-rolled action slot moved onto `DataListActions`,
      and its `Delete` finally says why it is off while a stack is deleting.
      Rule in §11. — added 2026-08-16, done 2026-08-16
- [x] **Secrets, the same exercise.** `Username ǀ Password` paired and everything
      else left filling; the `Type` select derived from the schema after shipping
      three of six kinds; placeholders turned into specimens; `Cancel` off the
      footer; the `Created` column moved onto `relativeAge`. Six stories added.
      — added 2026-08-16, done 2026-08-16
- [x] **`Cancel` on the one-phase drawers.** Decided: **off**, on `New secret` and
      `New preview environment`. The journey's reason (path + ✕) does not carry to
      a drawer with no path, so it was remade — `Cancel` offers to undo a state
      that does not exist, and Esc and the scrim are exits too. Dialogs keep
      theirs. Recorded in §13. — added 2026-08-16, done 2026-08-16
- [x] **`(optional)` in words.** Decided: **dropped everywhere** — seven call
      sites across previews and secrets. The red `*` states required and its
      absence states optional. Rule in §6. — added 2026-08-16, done 2026-08-16
- [x] **The list's time column.** Secrets shipped `8/1/2026` and Addons its own
      `formatDistanceToNow`; both on `relativeAge` now, with `absoluteAge` as the
      title. Rule in §11. **The 8px name drift stays** — Jaseem's call, ragged is
      fine. — added 2026-08-16, done 2026-08-16

- [x] **The addon drawer.** Step one's lone-`Cancel` footer removed entirely and
      `Cancel` off step two; `Documentation` moved from the `Advanced` header to
      the footer as a ghost Button; both disclosures made one full-bleed target
      and stacked flush; section content aligned to the section title (44);
      `Plan ǀ Storage size` paired by meaning and `Version` freed; the backups
      section reordered so the shared destination leads and each switch is
      adjacent to what it turns on; `Scheduled backups` / `Superuser credentials`
      renamed off the verb; the schedule hidden rather than greyed; and the
      disabled sentence that promised a retention field that does not exist
      deleted. — added 2026-08-16, done 2026-08-16
- [x] **Primitives fixed along the way**, all global: the env-var row's 26px
      collapse (a control now out-declares the field's fill); `FieldShell`'s span
      default flipped to full width so half width is a decision and not an
      accident; the switch centred on its whole statement at a 24 gap; the native
      number spinner off in `Input`; `DrawerActions` given a `leading` slot;
      `KeyValueRows` placeholders lower-cased. — added 2026-08-16, done 2026-08-16
- [x] Bring the previews repo-picker up to the create-stack flow. `GitSourcePicker`
      now uses the same `StickyBar` band, `SearchField`, `Provider` label,
      `FieldShell` URL, `visibility · branch` meta and resolved row — and the same
      `parsePublicRepoUrl`. 24 gap assertions match in `dev:mock`.
      — added 2026-08-16, done 2026-08-16
- [x] Create-stack journey — five starting points, three steps on the repository
      path, verified end to end in `dev:mock` with the seed carrying the typed
      service values. — added 2026-08-16, done 2026-08-16
- [x] Restore the service step deleted by the graphite pass, plus its schema.
      — added 2026-08-16, done 2026-08-16
- [x] Back arrow off every drawer; path crumbs made clickable. — added 2026-08-16,
      done 2026-08-16
- [x] Fix the page-behind-drawer padding jump (stale full-bleed route rule).
      — added 2026-08-16, done 2026-08-16
- [x] Fix the Switch's uneven thumb gaps. — added 2026-08-16, done 2026-08-16
- [x] Audit every file the redesign deleted; restore the two silent regressions
      (compose convert-gate, import warnings). — added 2026-08-16, done 2026-08-16
