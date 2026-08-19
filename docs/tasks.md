# Tasks

Work left on the design pass. Decisions live in `DESIGN-PRODUCT.md`, reasoning in
`docs/design/redesign-log.md`, vocabulary in `frontend/CONTEXT.md`. This file is
only *what is not done yet*.

## Now

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
- [ ] **Commit / PR the branch.** 43 files on `graphite-pass-2`, all green, nothing
      committed. Done = committed, or up for review. — added 2026-08-16

## Next

- [ ] **Update the stale Figma frames.** Flagged, not swept — Jaseem updates the
      board frame by frame. Picker row `234:1953`: six variants (56 × `plus`/`remove`)
      still draw the name at 14 where code is 13. `564:6733` draws the repo name in
      JetBrains Mono 12 where code follows the primitive. `564:6845` labels the dead
      search `Filter stacks…`. Track→field gap is 16 on one frame and 8 on the other.
      **Section `483:5283` ("enable repository") is now stale too** — it draws the
      shared slot, the 225 `Connected provider` track, an 86 header and phase two's
      back arrow, none of which the code has any more. — added 2026-08-16
- [ ] **Option D for the repository step**, parked deliberately: one box that both
      searches yours and accepts a pasted URL, no segmented control. Removes a mode.
      Blocked on the first-run state — a new org would see "search or paste" over an
      empty list. Revisit when no-provider is no longer a common landing.
      — added 2026-08-16
- [ ] **`Cancel` on the one-phase drawers.** It came off both steps of every journey
      — `Enable repository` included, 16 Aug 2026 — because the path and the ✕ are
      the exits. A one-phase drawer (`New secret`, `Add domain`) has no path, so the
      argument does not transfer unexamined. Done = a decision either way, recorded
      in §13. — added 2026-08-16
- [ ] **Decide `Environment variables (optional)`.** The only field on the previews
      configure step that marks optionality in words. Required fields carry the red
      `*` and everything else is optional by default, so `(optional)` is a third
      convention for a fact the form already states. Done = kept deliberately, or
      dropped. **Jaseem's call.** — added 2026-08-16

## Done

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
