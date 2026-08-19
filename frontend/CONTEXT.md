# Frontend Glossary

The React SPA (`frontend/src/`) is the operator console for the backend hub. It
reuses backend resource nouns (Stack, Cluster, Secret, ObjectStore,
PostgresAddon, StackDomain, Project, Organisation — see `../CONTEXT.md`) and adds
the UI-only concepts below. Prefer these canonical terms in components, hooks,
and schemas.

## Resource API surface

| term | definition | source |
|---|---|---|
| API client | The shared Axios instance and typed wrappers (`api/*.ts`) that call the backend per resource. | `frontend/src/api/client.ts`, `frontend/src/api/*.ts` |
| openapi types | Backend-generated TypeScript types (`components["schemas"][...]`) that the SPA derives its resource types from. | `frontend/src/api/types/openapi.d.ts` |
| zod schema | A runtime validation/parsing schema for form input and API payloads. | `frontend/src/api/zod-schemas.ts`, `frontend/src/pages/**/schemas/` |
| AppError | The normalized client-side error union (Axios API error or generic Error) shown to the user. | `frontend/src/api/client.ts` |

## Stack edit session

| term | definition | source |
|---|---|---|
| EditSession | The in-progress, client-side editing state for a Stack before changes are persisted; tracks tabs, drafts, and dirtiness (the `EditSessionState` interface). | `frontend/src/pages/stacks/hooks/use-stack-edit-session.ts` |
| EditSessionTab | The active section of a stack edit: `configuration`, `deployment`, or `environment`. | `frontend/src/pages/stacks/hooks/use-stack-edit-session.ts` |
| EditSessionDraft | The pending, unsaved edits held in an EditSession. | `frontend/src/pages/stacks/hooks/use-stack-edit-session.ts` |
| PerResourceDirty / PerVolumeDirty | Field-level dirty-tracking for each StackResource / Volume in an EditSession, enabling per-field discard. | `frontend/src/pages/stacks/lib/stack-diff.ts` |
| discardResourceField | Field-level discard of a pending edit, reverting one resource field back to its persisted value; siblings: `discardResource`, `discardVolume`, `discardEnvRow`. | `frontend/src/pages/stacks/hooks/use-stack-edit-session.ts` |
| StickyActionBar | The persistent save/discard action bar (primary/secondary/segment parts) shown while editing a Stack. | `frontend/src/components/sticky-action-bar.tsx` |

## Environment & addon binding

| term | definition | source |
|---|---|---|
| EnvAddonBinding | A link in a stack's environment that injects a PostgresAddon's connection info into a resource's env vars. | `frontend/src/pages/stacks/components/editor/tabs/architecture/drawer-tabs/environment-tab.tsx` |
| EnvAddonGroupState | The UI state of an env-addon group: `idle`, `editing-binding`, or `detaching`. | `frontend/src/pages/stacks/components/editor/tabs/architecture/drawer-tabs/environment-tab.tsx` |
| AddonBindingPatch | A pending change to an EnvAddonBinding awaiting save. | `frontend/src/pages/stacks/components/editor/tabs/architecture/drawer-tabs/env-row.tsx` |
| CredField | A PostgreSQL connection credential field name; some are cluster-wide (`CLUSTER_WIDE_FIELDS`). | `frontend/src/pages/stacks/lib/addon-presets.ts` |

## Docker Compose import

| term | definition | source |
|---|---|---|
| DockerComposeFile | A parsed `docker-compose` specification the user imports to scaffold a Stack. | `frontend/src/types/docker-compose.ts` |
| ConversionResult | The outcome of converting a DockerComposeFile into stack resources, including parse/conversion errors. | `frontend/src/lib/docker-compose-converter.ts` |
| ServiceConversionResult | The per-service result of Docker Compose → StackResource conversion. | `frontend/src/lib/docker-compose-converter.ts` |
| ImportActions | The callbacks driving the compose-import flow. | `frontend/src/pages/stacks/hooks/use-docker-compose-import.ts` |

## Plans, credentials & backups

| term | definition | source |
|---|---|---|
| PlanId | A named PostgreSQL addon sizing tier: `basic`, `starter`, `launch`, `scale`, `performance`, or `custom`. | `frontend/src/pages/addons/lib/plan-presets.ts` |
| detectPlan | The function that infers a PlanId from a PostgresAddon's resource spec. | `frontend/src/pages/addons/lib/payload.ts` |
| DomainName | The validated custom-domain value entered when binding a StackDomain. | `frontend/src/pages/domains/schemas/api-schema.ts` |
| eligibleRestoreSources | The logic that determines which backups/object stores are valid sources for a Postgres restore. | `frontend/src/pages/addons/lib/restore-sources.ts` |
| TriggerBackupPayload | The request body for on-demand triggering of a PostgresBackup. | `frontend/src/api/postgres-backups.ts` |

## Navigation & layout

| term | definition | source |
|---|---|---|
| AppLayout | The authenticated shell (sidebar + content) wrapping all in-app routes. | `frontend/src/components/app-layout.tsx` |
| full-bleed route | A route whose page content gets **no 16px inset** — `data-slot="page-content"` with zero padding. **The canvas editor only** (`/stacks/draft`, `/stacks/<id>`). `/stacks/new` was in the list because New stack used to be a full page with a full-bleed tab strip; as a drawer that route renders the ordinary stacks **list**, so the exception was stripping the list's inset and the page behind the drawer jumped 16 left and 16 up. **A layout exception outlives the screen it was written for.** | `frontend/src/components/app-layout.tsx` |
| RequireAuth | The route guard that redirects unauthenticated users to sign-in. | `frontend/src/App.tsx` |
| Breadcrumb context | The provider that registers per-route labels and loading state for the breadcrumb trail. | `frontend/src/contexts/breadcrumb-context.tsx` |
| Page | A route-level screen under `pages/` mapping to a resource area (stacks, clusters, secrets, object-stores, addons, domains, auth). | `frontend/src/App.tsx` (router) |
| SheetHeader | The sheet's own two-row top band: the title row (toggle, page title, one fact, actions) and a conditional toolbar row that collapses itself when nothing portals in. | `frontend/src/components/sheet-header.tsx` |
| journey | A task launched from a main screen that you either finish or abandon — `New addon`, `New stack`. Not a *place*, so it gets an exit rather than a trail. | `DESIGN-PRODUCT.md` §12a |
| journey path | A journey's header when it has more than one step: `New stack › Select repository › Configure service`. **The crumbs behind you ARE the way back** — a step is `string \| { label, onClick }`, and the bare string is a dead crumb. Reversed 16 Aug 2026: it used to be "a position, not links", with the arrow as the only exit. `›` and not `/`, because a journey is a sequence and not a hierarchy. Every step is `title/500`; **colour alone** separates where you are from where you have been, and a live crumb stays `fg-muted` at rest so the tier keeps saying "behind you". | `frontend/src/components/ui/drawer.tsx` (`DrawerPathSteps`) |
| **no back arrow in a drawer** | Removed 16 Aug 2026. An arrow beside a path is the same control twice: the path draws the whole route and names each stop, the arrow walks it one step at a time and names only a direction. It also cost 38px of left inset, so a drawer's heading started off the x its own body sits on. **A PAGE journey keeps its arrow** (`sheet-header.tsx`) — a page shows its title alone and has no path to click. | `DESIGN-PRODUCT.md` §12a |
| `DrawerHeader` | **Owns the whole top band** — heading and close. Takes `title` **or** `steps`, plus `description`; there is nothing to assemble at a call site. `onBack` is gone with the arrow. It used to be an empty box six drawers filled differently, one of them hand-rolling its own back button and paying a `pr-12` to dodge the absolutely-positioned ✕. | `frontend/src/components/ui/drawer.tsx` |
| drawer close button | The close is a `ghost` `size="icon"` Button — 32 at radius 8. **Not a new component**: an icon button is a Button whose label is a glyph. Its **box** sits on the 20 column, not its glyph — and with the arrow gone the path starts on that same 20, measured. | `DESIGN-PRODUCT.md` §12a |

## Adding a thing

**One pattern, and it is always a drawer.** The test is *how many things do you
choose before you can start?* — none is a one-phase drawer, one is two phases,
many is two phases plus a rail. A dialog is never an add. See
`DESIGN-PRODUCT.md` §13 "Adding a thing".

| term | definition | source |
|---|---|---|
| step / phase | One screen of a journey inside the same drawer. **The width never changes between them.** Every step is **named** in the path, including the first, and named **SHORT**: `New stack › Select a service`. The crumb before the `›` already carries the task, so the segment after it only answers *where am I*. Two earlier passes went the other way (`Pick a starting point`, then `Select a service to start from`) — both were saying the task twice. | `frontend/src/pages/addons/components/addon-drawer.tsx` |
| catalogue step | Phase one: category groups and picker rows, driven by a **registry** and never a hand-written option list. **Picking a row advances**, so step one has no primary at all — a `Continue` beside a list that answers the question only repeats the click you just made. | `frontend/src/pages/addons/components/addon-catalog-step.tsx` |
| **no footer on step one** | And no `Cancel`, and no back control of any kind — step one's crumbs point at the screen you are on. Nothing has been typed and nothing has been made, so the button offered to undo a state that does not exist. The band cost 73px for the whole step; the ✕ is exit enough. | `DESIGN-PRODUCT.md` §13 |
| **the footer holds the primary alone** | `Cancel` is off step **two** as well. The path and the ✕ are the journey's exits on every step, so a footer Cancel is a third control for an act two others already offer. A drawer footer is the place the thing gets made. **The verb changes with the step**: `Continue` where the journey is not finished, `Create stack` where it is. | `DESIGN-PRODUCT.md` §13 |
| row stem vs crumb verb | Step one's rows carry their own stem — `From a repository`, not `A repository` — because the `Start from` eyebrow they used to complete left with the tab strip. Once you are inside a point the kind is settled, so the crumb says what you are **doing**: `Select repository`, `Add compose file`, `Start blank`. **The five verbs differ**, so each starting point carries its own `step` field rather than one being derived from the other. | `starting-points.ts` (`name`, `step`) |
| leading vs trailing icon | Leading names the **act** (`+ New stack`); trailing modifies the **destination** (`Website ↗`). A control that opens a new tab has to say so. `Button`'s optical padding rides on a wrapper span that `asChild` used to skip — link-shaped buttons were measuring 12/12 instead of 14/9. | `DESIGN-PRODUCT.md` §9 |
| **no description under an instruction** | A step named for the act (`Select a service`) needs no second line; one only ever restated the list about to render. A step named for the thing may earn one. Never on step two. | `DESIGN-PRODUCT.md` §13 |
| service registry | The single list of services the product knows about. `managed: true` marks the ones Stackdome runs as an add-on; the addon catalogue is a **filter over it**. Two lists had already drifted — the same database was `Postgres` in one and `PostgreSQL` in the other. | `frontend/src/pages/stacks/data/blocks/registry.ts` |
| rail | The 240px right column of a two-phase drawer. **Only for what the body cannot show** — the thing you picked in full, or the set you are assembling. A repository names its one service in the row you ticked and a compose file lists its own services in the well, so neither gets one. Never a second column of controls, and never a status readout. | `frontend/src/pages/stacks/components/create/in-this-stack.tsx` |
| starting point | One of the five places a stack can start from — repository, ready-made app, compose file, building blocks, blank canvas. **Peers**, ordered from "your own code" outwards to "nothing at all". They were a tab strip across a page; they are step one of a drawer. **Only the repository grows a third step** (see `service step`). | `frontend/src/pages/stacks/components/create/starting-points.ts` |
| service step | **Step three of the repository journey, and only that journey.** Service name, branch, port, Dockerfile path, build context, expose. It shipped as the second half of a full-page wizard, was deleted in the graphite pass on the reasoning that those fields belong to a *resource* (edited on the canvas), and was restored 16 Aug 2026: **deleting a step does not move its work — it stops asking, and the seed is then built from five values nobody saw.** | `frontend/src/pages/stacks/components/create/tabs/service-tab.tsx` |
| `DrawerActions leading` | The footer's free left half, for **reference — not a second action**. The addon drawer's `Documentation` link lives here: available the whole time you fill the form, nowhere near the button that commits. It came off the `Advanced` section header, where it split that disclosure's hover target so two identical-looking rows answered the pointer differently. Never a home for `Cancel`. | `frontend/src/components/ui/drawer.tsx` |
| **a disclosure's whole row is the target** | Both collapsed sections are the same full-bleed trigger. Putting anything beside one makes it `flex-1` and stops the wash at a seam — and hovering that neighbour lights the row as though it opened the section. | `postgres-form-fields.tsx` (`SectionDisclosure`) |
| pairing by meaning | Two fields share a row only when they share a **subject**. The addon form repeated the mistake: `Storage size \| Version` — a disk size and a Postgres major version, paired because four fields make two rows. It is `Plan \| Storage size` now (one question, two boxes: CPU/RAM from the plan, disk beside it) with `Version` alone. `Branch \| Port` was pairing by count — four fields, two rows — and a branch (*which code*) has nothing to do with a port (*how it is reached*). Only `Dockerfile path \| Build context` survives as a pair: both are paths from the repo root feeding the same build. `Expose publicly` sits directly under `Port` because its sentence says "this port". | `service-tab.tsx` |
| the control band | The segmented switch and the search field on **one row**, 16 apart, inside a `StickyBar`. Both filter the same list, so they are one control. **The URL side does not use this slot** — see below. **Two flows share this shape**: create-stack's repository step and the previews `Enable repository` picker, which was brought onto it 16 Aug 2026. | `create/tabs/repository-tab.tsx`, `frontend/src/components/git-source-picker/git-source-picker.tsx` |
| **a toolbar slot is not a form field** | The band's right-hand slot is a tool **over** the content below it. A search field filters the list under it; a URL box has nothing under it because it *is* the content. Putting the URL there promises "this narrows what you see" and does not keep it. So `Public URL` gets its own row and a labelled `FieldShell`. Explored on the board first — `597:6952`, options A–D. **A token connection is the same case**: it cannot list anything, so its paste box is a labelled field too, and the band's search above it is off with the field's own hint as the reason. | `repository-tab.tsx`, `git-source-picker.tsx` |
| the resolved row | What we read out of a pasted URL, shown as the **same 56 `PickerRow`** the provider list is made of, ticked, under `This will build`. Turning `…/acme/awwdits.git` into `acme/awwdits` is a *derivation*, and its result used to first appear on the next step in a box you would then correct. Both paths now end on the same object. | `repository-tab.tsx`, `git-source-picker.tsx` |
| **a consequence sits under the thing it is about** | The previews picker's `blocking` banner — *pull-request automation needs a connected provider* — sits **below** the resolved row, not above the field. Above, it interrupted you before you had chosen anything and pushed the row it is about down the sheet. The banner is about the repository you just picked, so it follows it. | `git-source-picker.tsx` |
| `parsePublicRepoUrl` | **One reading of a repository URL, used everywhere.** The regex and the tail-slicing had grown four copies — the blocked-commit reason, the repo the service step configures, the resolved row, and the seed — which is four chances for the button to be live while the seed comes out empty. The previews picker was a **fifth**, looser copy: any non-empty string counted, so `Continue` went live on `abc`. | `frontend/src/pages/stacks/components/create/selection.ts` |
| import warnings | Shown **inline, before the commit** — never as a toast, which lands after you would have to undo work to act on it. Compose gets an `info` `AlertBanner` above its preview, deduped (the converter emits per service). **Templates get none**: measured, all seven warn, so the banner appeared on every app in the catalogue and reported on our own curated records. `template-converts.test.ts` guards that invariant instead. | `tabs/compose-tab.tsx`, `data/templates/tests/template-converts.test.ts` |
| parse ≠ convert | A compose file that **parses** is not one we can **build**. The preview must run the converter too: a service with neither `image` nor `build` parses, reports one service to the gate, and converts to zero resources — which silently seeded an empty stack. | `tabs/compose-tab.tsx` (`parseCompose`) |
| **no search below the fold** | A catalogue that fits one screen gets no search field: it could only hide a row already visible, and it costs a zero-result empty state that exists purely to recover from using it. Applies to the addon catalogue and ready-made apps; repositories and building blocks keep theirs because they scroll. | `DESIGN-PRODUCT.md` §13 |

## Empty & no-result states

**Two different moments, not one component with a prop.** First run is where the
product defines its core noun and gets the decorated glyph; a filter that matched
nothing gets a 34px lens and a way back. See `DESIGN-PRODUCT.md` §11.

| term | definition | source |
|---|---|---|
| EmptyState | The centred title/description/action block shown when a list or page has nothing in it. **Draws no box** — it sits on the sheet like the rows it replaces. | `frontend/src/components/branded/empty-state.tsx` |
| SearchGlyph | The no-results mark: a lens in a 34px hairline circle. Used when a filter excluded everything, never for first run. | `frontend/src/components/branded/empty-state.tsx` |
| StackArchitectureGlyph | The first-run illustration — one stack card on the dot-grid canvas with its wires fading off the edges. Authored in the board's 148×88 units and drawn at `SCALE`. | `frontend/src/components/branded/empty-state.tsx` |
| board units | The convention for illustrations: every coordinate is the Figma node's own number, passed through a `u()` helper, so code and board can be diffed line by line and resizing is one constant. | `frontend/src/components/branded/empty-state.tsx` |

## Blocked & disabled controls

**Nothing is disabled without saying why** — every interactive element, not just
primaries. Three shapes by what is disabled: one control, a menu item, or a whole
region. See `DESIGN-PRODUCT.md` §"Disabled".

| term | definition | source |
|---|---|---|
| BlockedAction | Wraps ONE control, disables it, and shows the reason on hover **and** focus. Anchors to a focusable `span` because disabled controls swallow pointer events — a reason only a mouse can find does not exist for a keyboard user. | `frontend/src/components/branded/blocked-action.tsx` |
| reason | The words themselves. Always phrased in the **verb of the act** — you *enter* and *paste* in a form, *pick* and *choose* in a selection. Supplied by the call site, never by the component. | call sites |
| `reasonList()` | Decides sentence-vs-bullets and nothing else. **Supplies no words.** One reason renders as a sentence, several as a list. | `frontend/src/components/branded/blocked-action.tsx` |
| reason line | The menu-item shape: a second line inside a disabled `DropdownMenuItem` / `SelectItem`. Menus cannot carry a tooltip. The disabled dim sits on the **label**, not the item root, so the reason stays readable — a child cannot exceed its parent's opacity. | `frontend/src/components/ui/dropdown-menu.tsx`, `select.tsx` |
| region explanation | The third shape: ONE line at the top of a block of controls disabled together (`fieldset disabled`, a read-only mode, an off switch). Never a tooltip per control. | e.g. `frontend/src/pages/addons/components/backup-config-fields.tsx` |
| `PickerRow reason` | The listbox-item shape, on a picker row: passing `reason` **is** what disables it, and the words take the row's second line instead of its meta. A tooltip in a list fights the list's own focus and typeahead. | `frontend/src/components/branded/picker-row.tsx` |
| `PickerRow blockedByRegion` | The same row, off with **no** second line, because the reason belongs to the region above it. **A set of rows blocked for one cause is a region, not N items** — the addon catalogue learned this by rendering nine rows that each repeated the same sentence. Pair it with `PickerList describedBy`, or the region is one to the eye and nine loose rows to a reader. | `frontend/src/components/branded/picker-row.tsx` |
| **dim by tier, not by alpha** | `opacity-50` is the rule for a disabled *control* and a bug on text you still want read: it put the catalogue's blocked names at **3.40:1** and their meta at **2.29:1**, both under AA. Drop a rung on the ink ladder instead — ink → `fg-2`, `fg-2` → `fg-muted` — which measures 7.17 and 5.60 and is already solved for both themes. The glyph may still go to alpha; it decodes to nothing. | `DESIGN-PRODUCT.md` §9 |
| empty ≠ disabled | A control with nothing to choose is *empty*, not blocked. It gets an empty state saying how to get options, not a grey-out. **And a field that can never be filled is not a field** — a disabled input dims to its own placeholder's tone, so a filled one reads as empty. Render it as a value, or drop it where something else already carries it. | `DESIGN-PRODUCT.md` §"Disabled" |

## Forms

**Fields sit on a two-column grid and fill their cell.** A control that sizes to
its content puts the field's trailing edge wherever its longest option lands —
measured on the addon drawer before the rule existed: seven controls, **five
different trailing edges**, two of them 9px apart. See `DESIGN-PRODUCT.md` §8.

| term | definition | source |
|---|---|---|
| `FieldGrid` | Two columns, 16 apart. At the drawer's 640 that makes a column 292. Rows are their own grids, so one section can pair two fields without the next inheriting the pairing. | `frontend/src/components/branded/field-shell.tsx` |
| **a field fills unless it has a partner** | `span` defaults to **2**. It defaulted to 1, so half width was what happened when nobody decided anything — `Version`, `Object store`, `Create` and `Source addon` sat at 292 with an empty cell beside them while `Port` and `Base branch`, the same short values in another drawer, ran full width. `span={1}` is now a **statement that this field is half of a pair**, and there are six: `Plan ǀ Storage size`, `Dockerfile path ǀ Build context`, `CPU request ǀ CPU limit`, `Memory request ǀ Memory limit`, `Source addon ǀ Object store`, `Recover to ǀ Target time`. | `field-shell.tsx` |
| `FieldShell` | Label, control, hint, error — and the place that **enforces the fill**, so no call site has to remember that `SelectTrigger` ships `w-fit`. `span={2}` for the field that identifies the object; `inline` for a switch, whose sentence reads as one statement with it. | `frontend/src/components/branded/field-shell.tsx` |
| **the fill is a direct child, not any descendant** | `[&>[data-slot=select-trigger]]:w-full`. As a descendant rule it reached *inside* composite controls: the preview env rows' 110px `Value source` select became `w-full`, and being `flex-none` it ate the row — the name box measured **26px**. The field's promise is about the control it wraps; what that control does inside itself is its own business. Radix's `Select` root renders no DOM node, so an ordinary field's trigger really is the direct child. | `field-shell.tsx`, `key-value-rows.tsx` |
| **a short value does not earn a short box** | Every field fills its cell, including numbers. `Max active previews` shipped `w-28` and put its trailing edge at 933 while the fields around it ended at 1420 — the near-alignment §8 calls a mistake rather than a choice. Create-stack's `Port` is the precedent: a number field, full width. | `previews/.../configure-phase.tsx`, `create/tabs/service-tab.tsx` |
| placeholder casing | **Lower case.** `KEY` / `NAME` is not the field shouting a convention, it is a placeholder pretending to be a value — and it was wrong for half the callers anyway, since secret keys are not upper case. | `key-value-rows.tsx` |
| **no native number spinner** | `Input` turns it off for every `type=number`. It is the only control on the sheet the product did not draw — it ignores the height ladder, the radius, the ink tiers and both themes, and it sits *inside* the field's padding. Two call sites had already killed it by hand, which is how it was found; `Storage size` had not, so one number field wore it and the rest did not. Values here are typed, `min`/`max` still apply, and arrow keys still step. | `frontend/src/components/ui/input.tsx` |
| **disclosures stack flush** | A run of collapsed sections is one stack in one wrapper, not siblings of the field groups — otherwise the body's 16 gap falls between two hairlines and reads as a third, empty section. They meet on a 1px seam. | `postgres-form-fields.tsx` |
| **a section's content aligns to its title, not its edge** | The trigger spends 20 of inset, a 16 chevron and an 8 gap, so the title starts at **44** — and content padded to the section's own 20 sits 24 to the left of the thing that named it, reading as the drawer's rather than the section's. `SECTION_CONTENT_INSET` holds the 44 beside the trigger it is derived from. | `postgres-form-fields.tsx` |
| **a switch centres on the whole statement, 24 off it** | Not on the label's first line: `items-start` made a one-line row look centred and a two-line row look top-heavy on the same form. 24, not 16 — 16 is the gap between *fields*, and a distance that says "two things" cannot also say "one statement". The control's wrapper is `flex`, or it inherits its line box's descender and sits 2px high inside a correctly-centred row. | `frontend/src/components/branded/field-shell.tsx` |
| **a switch is adjacent to what it switches** | `Schedule` is a sub of `Enable scheduled backups` and sat two fields below it, with the object store and WAL archiving in between — so the switch appeared to control nothing and the schedule appeared to belong to WAL. A shared prerequisite (`Object store`, which both capabilities ship to) leads the section; then each switch, immediately followed by what it turns on; the disabled region's one sentence sits between the switch it names and the field it governs. | `backup-config-fields.tsx` |
| **a switch label names the thing, not the act** | `Scheduled backups`, not `Enable scheduled backups`; `Superuser credentials`, not `Generate superuser credentials`. The verb is the control's own job written into its label — the row reads as an instruction rather than a setting, and it fights the switch beside it, which already says on or off. | `backup-config-fields.tsx`, `postgres-form-fields.tsx` |
| **a setting a switch has not unlocked is hidden, not greyed** | §9's "nothing is disabled without saying why" is about a control that *refuses*. A schedule for backups that do not run is a question not yet asked. Greyed out it held six controls and a sentence saying "these do not apply" — more room denying the setting than the setting takes. The promise moves onto the switch's own hint, which is **state-aware**, because one string cannot be true both on and off. | `backup-config-fields.tsx` |
| **a disabled reason is a promise, so it must be true** | The backups region said "…and how long backups are kept". There is no retention field on that form — `retention_policy` belongs to the **object store** you pick (default `7d`), so the sentence sent people hunting a control that does not exist. | `backup-config-fields.tsx` |
| **one answer is one line** | `Daily` and `at 03:00` are the single question *when*; stacked they made two rows of it. The field takes `span={2}` (at 292 the parts wrap back into two rows) and each part carries its own width with `!`, because the fill rule is right for a field whose control IS the field and wrong for one word of a sentence. | `backup-config-fields.tsx` |
| control height | **32, and that includes form fields.** The rule said 40 for a year of shipping 32, and no 40 button exists to pair with one. 40 stays on the ladder for the rare control that owns its surface. | `DESIGN-PRODUCT.md` §8 |

## Browser preview (`dev:mock`)

| term | definition | source |
|---|---|---|
| preview | The real app — real router, real shell, real pages — against an MSW-mocked network. No Go server, Postgres or Kind cluster. | `frontend/src/preview/start.ts` |
| preview scenario | Which dataset the preview serves, chosen by `VITE_PREVIEW_SCENARIO` **before** the service worker boots. `default` is the busy review dataset; `empty` is a brand-new org. | `frontend/src/preview/handlers.ts` |
| `dev:mock` / `dev:mock:empty` | The two preview servers, on **:5273** and **:5274**. Separate ports on purpose, so a populated screen and its first-run state sit side by side rather than being toggled. | `frontend/package.json` |
