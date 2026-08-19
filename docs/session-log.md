# Session log

Newest first. A trail, not a transcript — decisions live in `DESIGN-PRODUCT.md`,
reasoning in `docs/design/redesign-log.md`.

## 2026-08-16 (later)

**Did:** Brought the previews repo-picker onto create-stack's flow, then ran the
same exercise over the addon drawer. Six shared primitives changed as a result.

**Previews** — `GitSourcePicker` now uses the `StickyBar` band, `SearchField`,
`Provider`, a labelled `FieldShell` URL, `visibility · branch` meta and the
resolved `This will build` row. It had a **fifth, looser copy** of the repo-URL
parse, so `Continue` went live on `abc`; it shares `parsePublicRepoUrl` now.
`Cancel` came off both steps. 24 gap assertions in `dev:mock`.

**Addons** — step one's lone-`Cancel` footer deleted outright (§13); `Cancel` off
step two; `Documentation` moved from the `Advanced` header (where it split that
disclosure's hover target) to the footer as a **ghost Button**; both disclosures
made one full-bleed target and stacked flush; section content aligned to the
section **title** (44, not the section's 20); `Plan ǀ Storage size` paired by
meaning and `Version` freed; the backups section reordered so the shared
destination leads and each switch is adjacent to what it turns on.

**Decided:**
- *Jaseem:* the PR-automation warning goes **under** the resolved repository, not
  above the field. A consequence sits under the thing it is about.
- *Jaseem:* **"why are these fields smaller?"** — half width was `FieldShell`'s
  default, so it happened wherever nobody decided. Default flipped to full width;
  `span={1}` now states "this is half of a pair", and there are six pairs.
- *Jaseem:* **"schedule is a sub of scheduled backup and now its separated"** —
  right, and the fix was an order, not a style: shared prerequisite first, then
  each switch immediately followed by what it turns on.
- *Jaseem:* a switch label names the **thing** (`Scheduled backups`), not the act.
- *Jaseem:* a setting the switch has not unlocked is **hidden**, not greyed.
- *Jaseem:* the toggle gap goes to **24** and the switch centres on the whole
  statement — globally.

**Found, not asked for:**
- The env-var row collapsed to a **26px** name box, because `FieldShell`'s fill
  rule reached inside a composite. Narrowing it to a direct-child rule would have
  broken the addon `Schedule` field — **the suite is green either way, because it
  is geometry, not behaviour.** Reverted; the one real conflict declares its own
  width with `!`.
- The backups disabled-reason promised *"how long backups are kept"*. There is no
  retention field on that form; `retention_policy` belongs to the **object store**.
- `dev:mock` had no single-repository handler, so previews' required `Base branch`
  opened empty on a repo whose branch the list had just shown.

**Left for Jaseem:** the addon detail page (`← All addons`, `Delete` outside a
kebab, bordered panels, a 330px empty region); where `Version` and `Superuser
credentials` belong; `(optional)` on the previews env label.

**Next:** Secrets, same exercise — in a new chat.

## 2026-08-16 03:34

**Did:** Closed the create-stack journey. Repository step rebuilt from boards
`564:6733` / `564:6845` (switch + search on one row, `Provider` not `Connected
provider`, `visibility · branch` meta, search stays but disabled in the
no-provider state). Restored the service step deleted by the graphite pass, plus
its schema. Back arrow removed from every drawer and the path crumbs made
clickable. `PickerRow`'s 56 rung dropped to 13/500. Fixed the `Switch`'s uneven
thumb gaps and the page-behind-drawer padding jump. Explored the public-URL
input in Figma (`597:6952`, four options) and shipped B + C. Audited every file
the redesign deleted and fixed two silent regressions. Updated `DESIGN-PRODUCT.md`
§12a/§13, `frontend/CONTEXT.md` (8 stale entries corrected, 9 terms added), and
`docs/design/redesign-log.md`.

**Decided:**
- *Jaseem:* 56 picker row name is **13/500**, not `name/500` — his Figma had both.
- *Jaseem:* remove the back arrow, make the breadcrumb clickable, **all drawers**.
- *Jaseem:* **"we can't remove any steps"** — the configure step comes back. It had
  been deleted on sound reasoning about where fields *live*, which was the wrong
  question.
- *Jaseem:* pair fields **only where it means something**; `Branch | Port` did not.
- *Jaseem:* option **B** for the URL input, then **C** on top.
- *Jaseem:* **no warnings in the template rail.** Measured after he asked: all seven
  templates warn, ToolJet with the same sentence five times. Overruled my own
  addition from an hour earlier.
- Step names go **short** (`Select a service`, `Select repository`), reversing two
  earlier passes that had made them longer.

**Open:** `SOURCE_LEDE` and `import-warnings-toast.tsx` are both orphaned — his
call. Nothing committed (26 files on `graphite-pass-2`). Previews' `GitSourcePicker`
has not had any of this applied. Stale Figma frames flagged, not swept. `Cancel` on
the one-phase drawers still undecided.

**Verified, not assumed:** all six paths driven in `dev:mock` to `/stacks/draft`
with no console errors; the seed carries the typed service name, port 8080,
`exposed_to_public: false`, Dockerfile path and build context. 275 test files,
2035 tests, 0 failures; `tsc` clean; lint 0 errors.
