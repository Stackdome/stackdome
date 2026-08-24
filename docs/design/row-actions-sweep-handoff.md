# Handoff — the row-actions sweep

**Branch** `graphite-pass-2`. Working tree is green: `pnpm --prefix frontend test:run`
→ **303 files, 2329 tests**, `pnpm --prefix frontend lint` → 10 errors, all
pre-existing and all in files nobody in this sweep touched (`configuration-tab.tsx`
indentation, `env-row.tsx` and `canvas-editor-shell.test.tsx` trailing spaces).

**The sweep is finished.** Every surface in the list below has been done.

Nothing is committed. Stage by path — Jaseem edits in his IDE in parallel.

---

## The rules settled this session

All three are written into `DESIGN-PRODUCT.md` and into memory.

| Rule | Where |
|---|---|
| **Danger zone** — tint frame, raised white card inside, red **text** action | §10 "Where the trigger lives"; `branded/danger-zone.tsx` |
| **Blast radius decides** where a destructive trigger lives | §10, table of every act |
| **`text-wrap: balance`** on every `p` | §6, `index.css` base layer |

### Danger zone, exactly

Frame `bg-danger-bg` radius **12**, padding `0/4/4/4`, no border. Heading `body/500`
in `danger`, 12/16. Card `bg-card` radius **10** (off-ladder, deliberate — Jaseem's
number), `shadow-sm`. Row 12/16, gap 16, hairline between rows only. Copy is
`body/500` ink over `meta` `fg-muted` at 2. Action is `destructive-ghost` + `flat`.

### Which drawer a row opens

Test: **does the object have live state worth reading that is not a setting?**

| Row opens | Surfaces |
|---|---|
| Details drawer → `Edit` | addons ✅ |
| Details only, no edit | previews ✅ (`Sync` is the act), clusters ✅, domains ✅, git providers on the **app** arm ✅ |
| The form, directly | secrets ✅, object stores ✅, image registries ✅, git providers on the **credentials** arm ✅, projects ✅, users ✅ |
| A page | stacks ✅ (it is an editor) |

**Two surfaces turned out to have no `Edit` to reach.** A cluster and a domain have
no `PUT` at all, so their drawers are readings with a danger zone and no footer —
the `Details drawer → Edit` row in the table above is now the addon alone.

**A git provider is two objects wearing one row.** `git_credentials` takes a `PUT`
and is pure config, so it opens straight into its form. `github_app` has no `PUT` —
access flows through per-installation tokens granted on GitHub — so it opens as a
reading with `Manage on GitHub` on the band and no footer. One drawer, two arms.

---

## Done

| Surface | What changed |
|---|---|
| **Preview drawer** | Header `↻ 🗑 ✕`, no footer, flat label/value list, URL is the link |
| **Repository settings** | Hints → `?`, danger zone |
| **Addons** | New `addon-details-drawer.tsx`; row opens it; chevron removed; delete → danger zone on **both** the drawer and `postgres-detail-page` |
| **Stacks table** | `Delete` + its track + the dead delete flow removed |
| **Secrets** | Row → form; `Edit`/`Delete` + 64px track gone; delete → danger zone |
| **Object stores** | Same |
| **Image registries** | Kebab + track gone; **`registry-drawer.tsx` built** from the old dialog; `row-menu.tsx` and `update-credentials-dialog.tsx` deleted; `Verify` on the band, `Remove` in the danger zone |
| **Clusters** | New `cluster-details-drawer.tsx`; chevron + its track gone; delete → danger zone, retype gate; the orphaned `/clusters/:id` page and its route **deleted** |
| **Domains** | New `domain-details-drawer.tsx`; trash + its track gone; remove → danger zone; removal now matches on fqdn, not a stale list index |
| **Git providers** | New `git-integration-drawer.tsx` (two arms); `row-menu.tsx` and `update-credentials-dialog.tsx` deleted; header down to 4 labels; `Verify` on the band, `Remove` in the danger zone with an acknowledge gate |
| **Projects** | New `project-drawer.tsx`; `project-row-menu`, `rename-project-dialog`, `delete-project-dialog` deleted; 4th column, its header cell and its skeleton cell gone; delete → danger zone + the **shared** retype confirm; the default project refuses both acts out loud; the detail page's `Rename` became one `Project settings` door |
| **Users** | New `member-drawer.tsx` (member form / pending reading); `user-row-menu` and `pending-row-menu` deleted; 5th column, its header cell and its skeleton cell gone. **Demoting was a form built inside a dropdown** — two selects and a Confirm/Cancel pair, 200px wide — and is a form now |
| **Subtext → tooltip** | Product-wide `hint` → `help` pass, 25 fields moved, 3 split |

### Primitive fixes
- **`DrawerContent`'s grid column was `1fr`.** A grid item's automatic minimum size
  is its min-content on both axes, so a band holding an unbreakable string — a
  56-character cluster name — set the track **522px** wide inside a 480px panel and
  dragged the body 42px past its own edge, inset and all. Now
  `grid-cols-[minmax(0,1fr)]`, with a regression story on the drawer itself.
- **`src/lib/cluster-registry.ts`** normalises the API's `ImageRegistryRunning`
  enum to the `registry` status domain's own token, so `StatusText` derives the
  word AND the colour from one spelling. The cluster detail page used to translate
  the enum inline and hand the *result* to `statusVariant`.
- **`src/pages/users/lib/roles.ts`** — org and project role constants, so the
  member drawer holds no raw role strings.

### New primitives
- `branded/danger-zone.tsx` — `DangerZone` + `DangerZoneRow`
- `branded/detail-rows.tsx` — `DetailList` + `DetailRow`, **one flat pitch, no groups**
- `branded/disclosure.tsx` — the ghost-button chevron; used by stack `Source`, `New preview`, addon form
- `KeyValueRows` gained `emptyTitle` / `emptyHint`
- `AlertBanner` gained `title` (headline + detail)

### Material
`--well` now paints the switch track (no border, `--primary` thumb), multi-select
chips, and **the selected tab face only** — the tab strip and trigger are otherwise
untouched.

---

## What "a hint survives" turned out to mean

A `hint` stays on the page only when the line tells you **what to type**. Four
kinds passed that test; everything else went to the `?`.

| Stays | Because |
|---|---|
| A format or a unit — *"Use a value like 20Gi or 100Gi."*, *"Base64-encoded."*, *"At least 8 characters."* | It is the shape of the answer |
| Which credential — *"Use a fine-grained personal access token with repository read access."* | Nothing on the field says which token |
| How to get options — *"No object stores yet. Create one to enable backups."* | §9's *empty ≠ disabled*: the row says how to fill it |
| Live state — *"3 of 10 previews active."* | It decides whether the form can be submitted at all; behind a mark nobody would look for it |

| Goes to the `?` | Because |
|---|---|
| A gloss on what a switch turns on | The label already names it |
| A consequence — *"Cannot be changed later."*, *"Older environments stop being created once this many are live."* | Worth having, not worth a permanent line under a 32px control |
| Why a field is read-only — *"Fixed once provisioned."* | `BlockedAction` already puts every other "why is this refused" in a tooltip |

**Still on the page, as settled:** a danger-zone row's blast radius, an
`AlertBanner`'s consequence, and a list's own empty-state line.

**Three hints were doing two jobs and got split** — a gloss on the `?`, the format
kept as the hint: `Build context`, `Registry size`, `Retention`.

**One duplication fell out of it.** With the section's `?` saying *"Applied to
every preview"*, `EnvVarsEditor`'s `emptyHint` was saying the same thing 40px
lower. The empty state answers a different question — *what* would go in here —
so it names the kinds of value now and stops repeating the behaviour.

## Left to do

Nothing on the row-actions list. What is still open elsewhere:

- **`projects` and `users` are pre-graphite pages.** They keep `Table` inside a
  `rounded-md border`, an `eyebrow`, and `p-8 space-y-8` — the row actions came
  off them but the pages have not had their own pass. The seven list pages that
  use `DataList` have.
- **`configuration-tab.tsx` has 7 indentation lint errors** and `env-row.tsx` /
  `canvas-editor-shell.test.tsx` have 3 trailing-space ones. All pre-existing,
  none from this sweep.
5. **Every subtext → tooltip** — done. See the rules it settled below.

## Traps that cost time here

- **Deleting from inside a drawer must close the drawer.**
- **Radix leaks `pointer-events: none` on `body`** between tests — `cleanup()`
  tears down before the unmount restores it. Clear it in `afterEach`.
- **A page test that stubs the drawer** to `() => null` loses the delete seam;
  the stub must render the control the page owns.
- **Removing a row action means removing its grid track**, its header label and
  its skeleton shape — three places, all silent if missed.
