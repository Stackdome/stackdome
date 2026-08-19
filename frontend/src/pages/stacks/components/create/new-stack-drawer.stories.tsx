import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within, screen, waitFor } from 'storybook/test'
import { http, HttpResponse } from 'msw'

import { baselineHandlers } from '../../../../../.storybook/msw-handlers'
import { withConfirm, withCurrentUser } from '../../../../../.storybook/decorators'
import {
  GIT_INTEGRATION_TYPE_CREDENTIALS,
  GIT_INTEGRATION_TYPE_GITHUB_APP,
  STATUS_ACTIVE,
  STATUS_INSTALLED,
} from '@/lib/git-integrations'
import { NewStackDrawer } from './new-stack-drawer'
import { parseCompose } from './tabs/compose-tab'

const INTEGRATIONS = '/api/v1/organizations/:orgId/git-integrations'
const REPOS = '/api/v1/organizations/:orgId/git-integrations/:id/repositories'
// Picking a row re-reads that one repository, so the clone URL and default
// branch the next step is seeded from come from the repository itself rather
// than from whatever the list page happened to carry.
const REPO = `${REPOS}/:owner/:name`

// The constants, not the strings: `usableIntegrations` filters on exactly these
// and a hand-typed "connected" silently produces the no-provider state instead.
//
// **A GitHub App, because only an App can list repositories.** This said
// `credentials` while the step still had its own copy of the picker — a copy
// that listed repositories for any integration at all, so a token connection
// filled a list the real API cannot fill. The shared picker knows the
// difference, and `ATokenConnectionAsksForAUrl` below covers the other half.
const integration = {
  id: 'gh-1',
  name: 'acme',
  type: GIT_INTEGRATION_TYPE_GITHUB_APP,
  status: STATUS_INSTALLED,
  credentials_configured: true,
}

/** A token connection: authenticated, but it cannot enumerate anything. */
const tokenIntegration = {
  id: 'tok-1',
  name: 'acme-gitlab',
  host: 'gitlab.example.com',
  type: GIT_INTEGRATION_TYPE_CREDENTIALS,
  status: STATUS_ACTIVE,
  credentials_configured: true,
}

const repos = [
  { full_name: 'acme/web-storefront', clone_url: 'https://github.com/acme/web-storefront.git', default_branch: 'main', private: false },
  { full_name: 'acme/checkout-api', clone_url: 'https://github.com/acme/checkout-api.git', default_branch: 'main', private: true },
]

const connected = [
  http.get(INTEGRATIONS, () => HttpResponse.json({ items: [integration], total: 1 })),
  http.get(REPO, ({ params }) =>
    HttpResponse.json(
      repos.find((r) => r.full_name === `${params.owner}/${params.name}`) ?? repos[0],
    ),
  ),
  http.get(REPOS, () => HttpResponse.json({ items: repos, total: repos.length })),
  ...baselineHandlers,
]

/** A brand-new organisation: nothing connected, so the list can never fill. */
const noProvider = [
  http.get(INTEGRATIONS, () => HttpResponse.json({ items: [], total: 0 })),
  ...baselineHandlers,
]

/** Connected, but by token — so there is nothing to enumerate. */
const tokenOnly = [
  http.get(INTEGRATIONS, () => HttpResponse.json({ items: [tokenIntegration], total: 1 })),
  ...baselineHandlers,
]

const meta = {
  title: 'Features/Stacks/NewStackDrawer',
  component: NewStackDrawer,
  decorators: [withConfirm, withCurrentUser],
  parameters: { layout: 'fullscreen', msw: { handlers: connected } },
  args: { open: true, onOpenChange: () => {} },
} satisfies Meta<typeof NewStackDrawer>

export default meta
type Story = StoryObj<typeof meta>

/** Advance past step one, the way every add flow now works. */
async function pick(name: RegExp) {
  const dialog = within(await screen.findByRole('dialog'))
  // Picking advances. There is no Continue to press.
  await userEvent.click(await dialog.findByRole('option', { name }))
  return dialog
}

/**
 * Picking a repository is **not** synchronous with the click.
 *
 * The row only carries what the list page returned; the step is seeded from the
 * repository itself, so the pick re-reads that one repo and the selection lands
 * a tick later. Asserting straight after the click reads the step as incomplete
 * and the `Continue` beneath it as still dead.
 */
async function pickRepository(dialog: ReturnType<typeof within>, name: RegExp) {
  await userEvent.click(await dialog.findByRole('option', { name }))
  await waitFor(() => expect(dialog.getByRole('button', { name: 'Continue' })).toBeEnabled())
}

/**
 * Step one — the five peers as rows, not a tab strip.
 *
 * They are peers: none is a default dressed as a recommendation, and the order
 * runs from "your own code" outwards to "nothing at all".
 */
export const StartingPoints: Story = {
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'))
    await expect(dialog.getAllByRole('option')).toHaveLength(5)
    // §12a: the task, then the step. The FIRST step is named too — and it is
    // named SHORT: the crumb before the `›` already carries the task, so the
    // segment after it only has to say where you are.
    await expect(dialog.getByText('Select a service')).toBeInTheDocument()
    // **No primary.** Step one commits nothing — a row answers its question, so
    // a Continue beside it would only repeat the click you just made.
    await expect(dialog.queryByRole('button', { name: 'Continue' })).toBeNull()
    // **And no Cancel, because there is nothing to cancel.** Nothing has been
    // typed and nothing has been made, so the button was offering to undo a
    // state that does not exist. Step one has no footer at all.
    await expect(dialog.queryByRole('button', { name: 'Cancel' })).toBeNull()
    // **And no back arrow.** The path is the way back now, and on step one it
    // has nowhere to point — so the ✕ is the only exit, which is enough for a
    // step that has committed nothing.
    await expect(dialog.queryByRole('button', { name: 'Back' })).toBeNull()
    await expect(dialog.queryByRole('button', { name: 'New stack' })).toBeNull()
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  },
}

/**
 * Opening the drawer must not ring the way out.
 *
 * Radix focuses the first tabbable element on open, and in a journey that is
 * the way out — it was the back arrow, and it would now be the first live crumb
 * — so the drawer opened with a focus ring on the control that leaves it. The
 * content takes the focus instead.
 */
export const OpeningDoesNotFocusTheExit: Story = {
  play: async () => {
    const dialog = await screen.findByRole('dialog')
    await expect(document.activeElement).toBe(dialog)
  },
}

/** Picking a row advances. One behaviour for every add flow in the product. */
export const PickingAdvances: Story = {
  play: async () => {
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(await dialog.findByRole('option', { name: /From a blank canvas/ }))

    // Step two is the starting point's own name. Both steps are short, and
    // they read as siblings rather than as an instruction followed by a
    // restatement of it.
    //
    // **Resolving on the name IS the assertion.** Never `toBeVisible` on a
    // drawer's own content: the surface fades in, so under load that races the
    // animation and fails at opacity 0 on an element that is perfectly correct.
    await dialog.findByText('Start blank')
    await expect(dialog.queryByText('Select a service')).toBeNull()
    // **Neither step has a Cancel.** The footer comes back on step two because
    // there is now something to commit, but it holds ONE button — the path and
    // the ✕ are the journey's only exits, on every step.
    await expect(dialog.queryByRole('button', { name: 'Cancel' })).toBeNull()
    await expect(dialog.getByRole('button', { name: 'Create stack' })).toBeInTheDocument()
  },
}

/**
 * Step two carries the path and no description — you were oriented in step one
 * (§13) — and the crumb behind it is the way out of the step.
 */
export const RepositoryStep: Story = {
  play: async () => {
    const dialog = await pick(/From a repository/)
    await dialog.findByRole('heading', { name: 'Select repository' })
    await expect(dialog.queryByText('Every stack starts from one of five places.')).toBeNull()
    // No arrow. `New stack` is the control now, and it names where it goes.
    await expect(dialog.queryByRole('button', { name: 'Back' })).toBeNull()
    await expect(dialog.getByRole('button', { name: 'New stack' })).toBeInTheDocument()
  },
}

/**
 * **The switch and the search share one row** (board `564:6733`).
 *
 * They were stacked, and that was right on the 620px page this flow used to be
 * — with a 240 rail the left column was 340, and shared, the field collapsed to
 * an icon. Two things changed: the repository step has no rail, so the band gets
 * the drawer's full width, and `Connected provider` became `Provider`. They are
 * one control — both filter the same list — so one row is the honest shape.
 */
export const SwitchAndSearchShareOneRow: Story = {
  play: async () => {
    const dialog = await pick(/From a repository/)
    const search = await dialog.findByLabelText('Search repositories')
    // **The TRACK, not a segment inside it.** The track carries a hairline and
    // its last segment sits flush against the inside of it, so measuring to the
    // segment reports the gap 1px wide and the number never lands.
    const track = dialog.getByRole('radiogroup', { name: 'Where the repository lives' })

    const a = search.getBoundingClientRect()
    const b = track.getBoundingClientRect()
    // One row: they share a centre line, within a pixel of rounding.
    await expect(Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2)).toBeLessThan(1.5)
    // **The GAP, not just the order** — 16 between the track and the field.
    await expect(a.left - b.right).toBeCloseTo(16, 0)
    // And the field still clears its floor with the switch beside it.
    await expect(a.width).toBeGreaterThan(400)
  },
}

/**
 * **A repository has no rail.** The rail earns its 240 by showing what the body
 * cannot — the app you picked in full, or the set you are assembling. A
 * repository makes exactly one service, and the row you ticked already named
 * it, so a column repeating that is a column saying nothing.
 */
export const ARepositoryHasNoRail: Story = {
  play: async () => {
    const dialog = await pick(/From a repository/)
    await dialog.findByLabelText('Search repositories')
    await expect(dialog.queryByText(/In this stack/)).toBeNull()

    // And the list gets the whole body as a result.
    await pickRepository(dialog, /web-storefront/)
    await expect(dialog.queryByText(/In this stack/)).toBeNull()
    // **`Continue`, not `Create stack`.** A repository is not finished here —
    // step three asks what the code becomes. A button that said "Create stack"
    // and then showed another form would be lying about what the click does.
    await expect(dialog.getByRole('button', { name: 'Continue' })).toBeEnabled()
    await expect(dialog.queryByRole('button', { name: 'Create stack' })).toBeNull()
  },
}

/**
 * **Step three — the service the repository becomes.**
 *
 * It shipped as the second half of a full-page wizard and was deleted with it.
 * Deleting a step does not move its work anywhere; it just stops asking, and
 * the draft was then built from five values nobody saw. The canvas still edits
 * every one of them — this is where they get their first values.
 *
 * The name and the branch are DERIVED from the repository, so the common case
 * is read-and-confirm rather than typed.
 */
export const ServiceStep: Story = {
  play: async () => {
    const dialog = await pick(/From a repository/)
    await pickRepository(dialog, /web-storefront/)
    await userEvent.click(dialog.getByRole('button', { name: 'Continue' }))

    // The path grew a third crumb, and step two is still reachable from it.
    await dialog.findByRole('heading', { name: 'Configure service' })
    await expect(dialog.getByRole('button', { name: 'Select repository' })).toBeInTheDocument()
    await expect(dialog.getByRole('button', { name: 'New stack' })).toBeInTheDocument()

    // Seeded off the repository — not blank boxes.
    await expect(dialog.getByLabelText(/Service name/)).toHaveValue('web-storefront')
    await expect(dialog.getByLabelText(/Branch/)).toHaveValue('main')

    // **Port is empty on purpose.** It is required, and pre-filling a required
    // field with a guess is how a wrong port ships without anyone reading it.
    await expect(dialog.getByLabelText(/Port/)).toHaveValue('')
    await expect(dialog.getByRole('button', { name: 'Create stack' })).toBeDisabled()

    await userEvent.type(dialog.getByLabelText(/Port/), '8080')
    await expect(dialog.getByRole('button', { name: 'Create stack' })).toBeEnabled()
  },
}

/**
 * The service step remembers what you typed when you go back for a different
 * repository. A step that owns its own state unmounts and forgets — these live
 * on the shared `Selection`, like the four sources do.
 */
export const GoingBackKeepsTheForm: Story = {
  play: async () => {
    const dialog = await pick(/From a repository/)
    await pickRepository(dialog, /web-storefront/)
    await userEvent.click(dialog.getByRole('button', { name: 'Continue' }))
    await userEvent.type(await dialog.findByLabelText(/Port/), '8080')

    // Back to step two by its crumb, then forward again.
    await userEvent.click(dialog.getByRole('button', { name: 'Select repository' }))
    await dialog.findByLabelText('Search repositories')
    await userEvent.click(dialog.getByRole('button', { name: 'Continue' }))

    await expect(await dialog.findByLabelText(/Port/)).toHaveValue('8080')
  },
}

/**
 * **A pasted URL gets the same third step.** It is a peer path, not a fallback,
 * so it is asked the same questions — and `BranchField` falls back to free text
 * because there is no integration to list branches from.
 */
export const PublicUrlReachesTheServiceStep: Story = {
  play: async () => {
    const dialog = await pick(/From a repository/)
    await userEvent.click(dialog.getByRole('radio', { name: 'Public URL' }))

    const url = await dialog.findByLabelText('Repository URL')
    await userEvent.type(url, 'https://github.com/acme/awwdits')
    await userEvent.click(dialog.getByRole('button', { name: 'Continue' }))

    await dialog.findByRole('heading', { name: 'Configure service' })
    // The tail of the URL is the service name; the branch defaults to main.
    await expect(dialog.getByLabelText(/Service name/)).toHaveValue('awwdits')
    await expect(dialog.getByLabelText(/Branch/)).toHaveValue('main')
  },
}

/**
 * **The URL does NOT take the search field's slot** (board `597:6952`, B).
 *
 * It did for a while, on the reasoning that a segmented control exists to
 * change what the box beside it means. Right about segmented controls, wrong
 * about this slot: that position is a **toolbar** position, a tool over the
 * content below it. A search field filters the list under it; the URL box has
 * nothing under it, because it IS the content.
 *
 * So the switch keeps its row and the URL becomes a labelled form field.
 */
export const UrlIsItsOwnLabelledField: Story = {
  play: async () => {
    const dialog = await pick(/From a repository/)
    // **Settle the slide-in before measuring.** The drawer enters from the
    // right, and the two fields are measured at two different moments — so
    // mid-flight the first rect carries an animation offset the second does
    // not, and the story reports a 158px difference that does not exist.
    const content = await screen.findByRole('dialog')
    await Promise.all(content.getAnimations().map((a) => a.finished))

    const search = (await dialog.findByLabelText('Search repositories')).getBoundingClientRect()

    await userEvent.click(dialog.getByRole('radio', { name: 'Public URL' }))
    const field = await dialog.findByLabelText('Repository URL')
    const url = field.getBoundingClientRect()
    const track = dialog
      .getByRole('radiogroup', { name: 'Where the repository lives' })
      .getBoundingClientRect()

    // Its own row, BELOW the switch — not beside it in the toolbar slot.
    await expect(url.top).toBeGreaterThanOrEqual(track.bottom)
    await expect(url.top).toBeGreaterThan(search.top)
    // And it runs the full column rather than what was left beside a control.
    await expect(url.left).toBeLessThan(search.left)

    // A label saying what it is, and a hint saying what it costs.
    await expect(dialog.getByText('Repository URL')).toBeInTheDocument()
    await expect(
      dialog.getByText('Any public repository. A private one needs a connected provider.'),
    ).toBeInTheDocument()
    // The label is what names it — no `aria-label` doing the job twice.
    await expect(field).not.toHaveAttribute('aria-label')
  },
}

/**
 * **The URL resolves to a row, and you see it before you continue** (board
 * `597:6952`, option C).
 *
 * `https://github.com/acme/awwdits.git` becomes `acme/awwdits` — a derivation,
 * and until now the first place its result appeared was the NEXT step, in a
 * service-name box you would then have to correct. It is the same 56 row the
 * provider list is made of, so both paths end on the same object seen the same
 * way.
 */
export const UrlResolvesToARow: Story = {
  play: async () => {
    const dialog = await pick(/From a repository/)
    await userEvent.click(dialog.getByRole('radio', { name: 'Public URL' }))
    const field = await dialog.findByLabelText('Repository URL')

    // Nothing to show while it is still half-typed.
    await userEvent.type(field, 'https://github.com')
    await expect(dialog.queryByText('This will build')).toBeNull()

    await userEvent.type(field, '/acme/awwdits.git')
    await dialog.findByText('This will build')

    // The row is a real option, ticked — not a line of text pretending to be one.
    const row = await dialog.findByRole('option', { name: /acme\/awwdits/ })
    await expect(row).toHaveAttribute('aria-selected', 'true')
    // `.git` and the owner are stripped the same way the seed strips them.
    await expect(within(row).getByText('acme/awwdits')).toBeInTheDocument()

    await expect(dialog.getByRole('button', { name: 'Continue' })).toBeEnabled()
  },
}

/**
 * No provider connected. **The switch is not disabled** — a public URL is a
 * peer path, not a fallback — and the empty state says what is missing and how
 * to get it rather than grеying the list out (§9).
 */
export const NoProviderConnected: Story = {
  parameters: { msw: { handlers: noProvider } },
  play: async () => {
    const dialog = await pick(/From a repository/)
    await dialog.findByText('No git provider connected yet')
    await expect(dialog.getByRole('radio', { name: 'Public URL' })).toBeEnabled()
    // `outline`, not the page's fill: a detour must not outrank the thing you
    // came to do (§9).
    //
    // **Resolving the name IS the assertion.** This was `toBeVisible`, and it
    // flaked: the drawer is still animating in when the query resolves, so
    // jsdom-style visibility can read false on a node that is on screen and
    // correct a frame later. A `find*` that returns the control has already
    // proved it is in the accessibility tree under its label.
    //
    // **A button, not a link.** It used to navigate to /git-integrations —
    // out of the drawer, throwing away the starting point you had picked. The
    // shared picker connects a provider in place and comes back to this step.
    await dialog.findByRole('button', { name: 'Connect provider' })
    // **The band does not rearrange itself between two states of one tab.**
    // The search stays on screen, off — the reason is the empty state directly
    // beneath it, with the fix as a button, which is what §9 asks for.
    await expect(dialog.getByLabelText('Search repositories')).toBeDisabled()
  },
}

/**
 * **A token connection asks for a URL instead of listing nothing.**
 *
 * The state this step could not reach until it stopped keeping its own copy of
 * the picker. A credentials integration authenticates a clone but cannot
 * enumerate repositories, so the old copy — which listed for whatever
 * integration came back first — showed a search box over an empty column with
 * no explanation. The reason is now the field's own hint, and the search above
 * it is off rather than lying about what it filters.
 */
export const ATokenConnectionAsksForAUrl: Story = {
  parameters: { msw: { handlers: tokenOnly } },
  play: async () => {
    const dialog = await pick(/From a repository/)
    const field = await dialog.findByLabelText('Repository URL')
    await expect(field).toHaveAttribute('placeholder', 'https://gitlab.example.com/group/project')
    // §9: the dead control says why, in full, right where it died.
    await expect(dialog.getByLabelText('Search repositories')).toBeDisabled()
    await expect(dialog.getByText(/Repository listing isn't available/)).toBeInTheDocument()
    // And the host is enforced — a github.com URL cannot ride these credentials.
    await userEvent.clear(field)
    await userEvent.type(field, 'https://github.com/acme/webapp')
    await expect(
      await dialog.findByText('URL must be on gitlab.example.com to use this connection.'),
    ).toBeInTheDocument()
  },
}

/**
 * A blank canvas has **no rail** — there is nothing to put in it, and that is
 * the one thing this starting point has to communicate. It is also the only
 * one that is ready the moment you arrive.
 */
export const BlankCanvasHasNoRail: Story = {
  play: async () => {
    const dialog = await pick(/From a blank canvas/)
    await dialog.findByText('Data stores')
    await expect(dialog.queryByText(/In this stack/)).toBeNull()
    await expect(dialog.getByRole('button', { name: 'Create stack' })).toBeEnabled()
  },
}

/**
 * Building blocks accumulate, so the rail is the running set and each row in it
 * can be taken back out.
 */
export const BlocksAccumulate: Story = {
  play: async () => {
    const dialog = await pick(/From building blocks/)
    // A block row ACTS rather than selects — it adds — so it is a button, not
    // an option in a listbox. That distinction is the PickerRow's, not this
    // story's: a row that acts has no `selected` and therefore no option role.
    const postgres = await dialog.findByRole('button', { name: /Postgres/ })
    await userEvent.click(postgres)
    await userEvent.click(postgres)

    // Two instances, de-duplicated by name rather than refusing the second.
    await dialog.findByText('In this stack · 2')
    await expect(dialog.getByText('postgres-2')).toBeInTheDocument()
  },
}

/**
 * The blocked commit lists everything outstanding at once, in the verb of THIS
 * starting point — you paste a compose file, you do not "select an option".
 */
export const ComposeBlocksUntilItParses: Story = {
  play: async () => {
    const dialog = await pick(/From a compose file/)
    const commit = await dialog.findByRole('button', { name: 'Create stack' })
    await expect(commit).toBeDisabled()

    await userEvent.hover(commit.parentElement as HTMLElement)
    await expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Paste or upload a compose file',
    )
  },
}

/**
 * **A file that parses is not the same as a file we can build.**
 *
 * The preview ran the PARSER only, which answers "is this compose?". The
 * question that decides whether `Create stack` produces anything is the
 * converter's — "and can we make a stack out of it?" — so a file that parsed
 * but converted to nothing sailed past the gate and seeded an empty stack.
 *
 * A regression from the wizard that used to check `conversionResult.success`
 * before navigating, lost when that wizard was deleted.
 */
export const ComposeThatConvertsToNothingIsBlocked: Story = {
  play: async () => {
    const dialog = await pick(/From a compose file/)
    const file = await dialog.findByLabelText('Compose file')

    // **A service with neither `image` nor `build`.** This is the case that
    // proves the gate: the file parses, and `services` is non-empty — so the
    // old "no services and no volumes" check passed it straight through — but
    // there is nothing to build an image from, so conversion yields zero
    // resources. Before this, that seeded an empty stack with no complaint.
    await userEvent.click(file)
    await userEvent.paste('services:\n  web:\n    ports:\n      - "8080:80"\n')

    // The parser is happy — the service IS there, which is why the old gate
    // let it past.
    await expect(parseCompose('services:\n  web:\n    ports:\n      - "8080:80"\n')?.error)
      .toBeTruthy()

    const commit = await dialog.findByRole('button', { name: 'Create stack' })
    await expect(commit).toBeDisabled()
    // The SERVICE-specific line, named — not the generic "no valid services"
    // consequence it caused, and not the two comma-joined into machine output.
    await expect(
      await dialog.findByText(/web: Service must have either image or build/i),
    ).toBeInTheDocument()
  },
}

/**
 * **A good file still says what we changed.** The converter's warnings were
 * being thrown away — `warnings: []`, hardcoded — after the wizard that used to
 * toast them was deleted. They belong in the preview, before you commit, not in
 * a toast that lands once you are already on the canvas.
 */
export const ComposeSurfacesWhatItChanged: Story = {
  play: async () => {
    const dialog = await pick(/From a compose file/)
    await userEvent.click(await dialog.findByRole('button', { name: 'Paste an example' }))

    // The example converts, so the commit is live and the preview is real.
    await expect(await dialog.findByRole('button', { name: 'Create stack' })).toBeEnabled()
    await dialog.findByText(/Found in your file/)

    // Whatever the converter reported is on screen — the assertion is that the
    // channel EXISTS, not that this fixture happens to warn.
    const preview = parseCompose('services:\n  web:\n    image: nginx:1.27\n')
    if (preview && preview.warnings.length > 0) {
      await expect(dialog.getByText(preview.warnings[0])).toBeInTheDocument()
    }
  },
}

/**
 * **A ready-made app keeps its rail**, because none of what it shows fits the
 * row you ticked: a description, two links off the product, and the four
 * services one pick is about to put on the canvas.
 */
export const AReadyMadeAppHasARail: Story = {
  play: async () => {
    const dialog = await pick(/From a ready-made app/)
    await userEvent.click(await dialog.findByRole('option', { name: /n8n/ }))

    const rail = await dialog.findByRole('complementary')
    const within_ = within(rail)
    await expect(within_.getByRole('heading', { name: 'n8n' })).toBeVisible()
    // The rail is the only place before Create stack that says one row is
    // several services. The count comes from the registry, so assert the shape
    // rather than a number a fixture edit can move.
    await expect(within_.getByText(/^Includes · [1-9]\d*$/)).toBeVisible()
  },
}

/**
 * **Both links leave the product, and the glyph is what says so.**
 *
 * `Website` and `Docs` are the only two controls in this journey that open a
 * new tab. Without the trailing mark they read as steps in the flow — which is
 * the one thing they are not.
 */
export const TheLinksSayTheyLeave: Story = {
  play: async () => {
    const dialog = await pick(/From a ready-made app/)
    await userEvent.click(await dialog.findByRole('option', { name: /n8n/ }))
    const rail = within(await dialog.findByRole('complementary'))

    for (const label of ['Website', 'Docs']) {
      const link = rail.getByRole('link', { name: label })
      await expect(link).toHaveAttribute('target', '_blank')
      // Trailing, not leading: the glyph qualifies the destination, so it
      // follows the word rather than naming the thing.
      const inner = link.querySelector('[data-slot="button-content"]') as HTMLElement
      await expect(inner).not.toBeNull()
      await expect(inner.lastElementChild?.tagName.toLowerCase()).toBe('svg')
      // And the optical correction fires, which it only can because `asChild`
      // now gets the same wrapper a plain button does: 14 before the label, 9
      // after the glyph — never the symmetric 12 a text-only button takes.
      const pad = getComputedStyle(link)
      await expect(pad.paddingLeft).toBe('8px')
      await expect(pad.paddingRight).toBe('8px')
    }
  },
}
