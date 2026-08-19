import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Database, FileCode, GitBranch, Globe, HardDrive, Package } from "lucide-react"

import { BlockedAction, PickerList, PickerRow, PickerRowTick, reasonList } from "@/components/branded"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  type DrawerStep,
} from "@/components/ui/drawer"
import { usePostgresAddons } from "@/hooks/use-postgres-addons"
import { getBlockById, blockCatalog } from "@/pages/stacks/data/blocks/registry"
import { DATA_BLOCK_CATEGORIES } from "@/pages/stacks/data/blocks/types"
import { addBlockToStack, emptyStack } from "@/pages/stacks/lib/block-to-form"
import { emptyDraftSeed } from "@/pages/stacks/lib/canvas/draft-seed"
import { buildGitSeed, defaultServiceName } from "@/pages/stacks/lib/git-source-seed"
import { templateToFormData } from "@/pages/stacks/data/templates/template-to-form"
import { convertDockerComposeToStackData } from "@/pages/stacks/lib/docker-compose-converter"
import { parseAndValidateDockerCompose } from "@/pages/stacks/lib/docker-compose-parser"
import {
  DEFAULT_BUILD_CONTEXT,
  DEFAULT_DOCKERFILE_PATH,
} from "@/pages/stacks/lib/stack-model/policy"
import { STACK_DRAFT_PATH } from "@/pages/stacks/lib/routes"
import type {
  FormStackResourceData,
  FormVolumeExtendedData,
} from "@/pages/stacks/schemas/form-schema"
import type { DockerComposeFile } from "@/types/docker-compose"
import type { PickedRepo } from "@/components/git-source-picker/types"
import { BlockGlyph } from "@/pages/stacks/components/blocks/block-glyph"

import { InThisStack, type StackItem } from "./in-this-stack"
import {
  emptySelection,
  parsePublicRepoUrl,
  uniqueBlockName,
  type Selection,
  type ServiceForm,
} from "./selection"
import { serviceFormSchema } from "./service-form-schema"
import { STARTING_POINTS, type Source } from "./starting-points"
import { templateServices } from "./template-services"
import { BlankTab } from "./tabs/blank-tab"
import { BlocksTab } from "./tabs/blocks-tab"
import { ComposeTab, parseCompose } from "./tabs/compose-tab"
import { RepositoryTab } from "./tabs/repository-tab"
import { ServiceTab } from "./tabs/service-tab"
import { TemplateDetail, TemplateTab } from "./tabs/template-tab"

/**
 * Where a service's port comes from when nobody was asked for one.
 *
 * The design moves branch, port, Dockerfile path and build context **off this
 * screen and onto the canvas** — they belong to a resource, not to a form step.
 * So the seed carries a default and the node inspector is where it is changed.
 */
const DEFAULT_SERVICE_PORT = 3000

/**
 * What the rail is waiting for, **in the verb of the starting point you are
 * on** — the same rule the blocked-commit reasons follow (§9). You pick a
 * repository, choose an app, paste a file, add a block. A shared "nothing
 * selected" would be true of all four and useful for none.
 *
 * A blank canvas has no rail at all, so it is not in here.
 */
const WAITING_FOR = {
  blocks: "Nothing yet. Add a block and it shows here.",
}

/**
 * **New stack** — one drawer, two steps (§13 "Adding a thing", board
 * `556:6373`).
 *
 * ### Why it stopped being a page
 *
 * It was a full page with a full-bleed strip of five tabs across the top. §13's
 * test is *how many things do you choose before you can start* — one, from a
 * list that grows — and that answer is a two-phase drawer, the same shape the
 * addon journey uses. The page had two costs the drawer does not:
 *
 * - **The strip was permanent chrome.** Five tabs held 100px of the sheet for
 *   the whole task, to answer a question asked once. As step one they are five
 *   rows, and after that the work has the whole body.
 * - **The primary lived in the sheet header**, a full diagonal away from the
 *   work on a wide screen. A drawer's footer is 640 from its own body.
 *
 * ### Start from is a step, not a strip
 *
 * The five are still peers and the order still runs from "your own code"
 * outwards to "nothing at all". What changed is that choosing is a step you
 * leave, so nothing about it stays on screen afterwards except the path.
 *
 * ### The flow still ends on the canvas
 *
 * `Create stack` makes a **draft** and opens it. Deploying happens on the
 * canvas, because a blocking error has to be seen before it is acted on and
 * this drawer has nowhere to show one.
 */
export function NewStackDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { addons } = usePostgresAddons()

  const [source, setSource] = useState<Source | null>(null)
  /**
   * `service` is the repository journey's third step, and ONLY the repository
   * journey's. The other four starting points commit from step two, because
   * what they produce is already fully described by what you picked — a
   * template brings its own services, a compose file lists its own, a block has
   * no options at this point and a blank canvas has nothing at all.
   */
  const [step, setStep] = useState<"start" | "configure" | "service">("start")
  const [selection, setSelection] = useState<Selection>(emptySelection)
  const [serviceErrors, setServiceErrors] = useState<
    Partial<Record<keyof ServiceForm, string>>
  >({})

  // Reopening must not show the last visit's half-made stack.
  useEffect(() => {
    if (!open) return
    setSource(null)
    setStep("start")
    setSelection(emptySelection())
    setServiceErrors({})
  }, [open])

  function update(patch: (previous: Selection) => Selection) {
    setSelection(patch)
  }

  /** Field-level edits clear that field's error as you fix it, never on blur. */
  const updateService = (patch: Partial<ServiceForm>) => {
    update((s) => ({ ...s, service: { ...s.service, ...patch } }))
    setServiceErrors((e) => {
      const next = { ...e }
      for (const key of Object.keys(patch) as (keyof ServiceForm)[]) delete next[key]
      return next
    })
  }

  const removeBlock = (index: number) =>
    update((s) => ({
      ...s,
      blocks: { ...s.blocks, instances: s.blocks.instances.filter((_, i) => i !== index) },
    }))

  const toggleAddon = (addonId: string) =>
    update((s) => ({
      ...s,
      blocks: {
        ...s.blocks,
        addonIds: s.blocks.addonIds.includes(addonId)
          ? s.blocks.addonIds.filter((id) => id !== addonId)
          : [...s.blocks.addonIds, addonId],
      },
    }))

  const onStart = step === "start"
  const onService = step === "service"
  const items = source ? stackItems(source, selection, addons, removeBlock, toggleAddon) : []
  const ready = source === "blank" || items.length > 0

  /**
   * **The repository journey has three steps; the other four have two.**
   *
   * Step two of a repository answers *which code*, and step three answers *what
   * it becomes* — a service with a name, a branch, a port and a build. Those
   * belong to a RESOURCE and the canvas is where they are edited afterwards,
   * but this is where they get their first values, from the person who knows
   * them. A step that stops asking does not move the work; it just guesses.
   */
  const hasServiceStep = source === "git"

  /** The repository being configured, whichever path produced it. */
  const pickedRepo = (): PickedRepo | null => {
    const { mode, repo, url } = selection.git
    if (mode !== "url") return repo
    const parsed = parsePublicRepoUrl(url)
    if (!parsed) return null
    return { ...parsed, defaultBranch: "", integrationId: null }
  }

  /**
   * Step three opens on values, not on blanks.
   *
   * The service name and the branch are DERIVED from the repository you just
   * picked — `acme/web-storefront` on `main` — so the common case is read and
   * confirmed rather than typed. They are seeded on the way in and only when
   * the field is still empty, so coming back from step three to change the
   * repository and returning does not overwrite a name you had edited.
   */
  const toServiceStep = () => {
    const repo = pickedRepo()
    if (!repo) return
    update((s) => ({
      ...s,
      service: {
        ...s.service,
        serviceName: s.service.serviceName || defaultServiceName(repo),
        branch: s.service.branch || repo.defaultBranch || "main",
      },
    }))
    setServiceErrors({})
    setStep("service")
  }

  /**
   * Everything the live starting point is still missing, phrased in ITS OWN
   * language.
   *
   * The five points ask for five different kinds of thing, so they use five
   * different verbs: you PICK a repository, CHOOSE a template, ADD a block,
   * PASTE a file. A shared "select an option" would be true of all of them and
   * useful for none (§9).
   */
  const missingForSource = (): string[] => {
    const missing: string[] = []
    if (source === "git") {
      const { mode, repo, url } = selection.git
      if (mode === "url") {
        if (!url.trim()) missing.push("Paste the repository's URL")
        else if (!parsePublicRepoUrl(url)) {
          missing.push("Paste a full repository URL, like https://github.com/acme/webapp")
        }
      } else if (!repo) {
        missing.push("Pick a repository from the list")
      }
    }
    if (source === "template" && !selection.template) {
      missing.push("Choose a ready-made app")
    }
    if (source === "compose") {
      const { yaml, preview } = selection.compose
      if (!yaml.trim()) missing.push("Paste or upload a compose file")
      else if (preview?.error) missing.push("Fix the compose file. It did not parse")
      else if (preview && preview.services.length === 0 && preview.volumes.length === 0) {
        missing.push("Add a service or a volume to the compose file")
      }
    }
    if (source === "blocks" && items.length === 0) {
      missing.push("Add a building block to the stack")
    }
    return missing
  }

  /**
   * What step three is still missing — in the verb of a FORM, because that is
   * what this step is: you ENTER a name, you SET a port (§9).
   *
   * It reads the same schema the commit does, so the button's reason and the
   * field's error can never disagree. The blockers are the empty-required ones
   * only; a port of "abc" is a value, so it fails on submit and lands its
   * message under the field, where the offending text is.
   */
  const missingForService = (): string[] => {
    const { serviceName, branch, port } = selection.service
    return [
      serviceName.trim() ? null : "Enter a service name",
      branch.trim() ? null : "Enter the branch to build",
      port.trim() ? null : "Set the port your service listens on",
    ].filter((r): r is string => r !== null)
  }

  function createStack() {
    if (!source) return
    // Step three is the one step with a schema, so it is the one step that can
    // refuse. Everything else has already been validated by being pickable.
    if (onService) {
      const parsed = serviceFormSchema.safeParse(selection.service)
      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors
        setServiceErrors({
          serviceName: flat.serviceName?.[0],
          branch: flat.branch?.[0],
          port: flat.port?.[0],
        })
        return
      }
      setServiceErrors({})
    }
    onOpenChange(false)
    navigate(STACK_DRAFT_PATH, { state: { seed: buildSeed(source, selection) } })
  }

  const point = STARTING_POINTS.find((p) => p.value === source)
  /**
   * §12a: the task, then the step you are on. The first step is named too —
   * "New stack" alone does not say what to do on it.
   *
   * **Both steps are short, because the path is a position and not a
   * sentence.** "Select a service to start from" and "Start from a repository"
   * both said the same thing twice: the crumb before the `›` already carries
   * the task, so the segment after it only has to say WHERE you are. Trimmed to
   * "Select a service" and to the starting point's own step name, the two steps
   * also finally read as siblings rather than as an instruction followed by a
   * restatement of it. Boards `564:6733` / `564:6845`.
   *
   * **The crumb is the point's VERB, not the row's noun.** Step one's rows say
   * `From a repository` — a stem plus the kind. Once you are inside it, the
   * kind is settled and the step has to say what you are doing with it, so the
   * crumb is `Select repository`. The five verbs differ (you SELECT a
   * repository, ADD a compose file, START blank), which is why each point
   * carries its own rather than one being derived from the other.
   *
   * **The path is also the way back, now that the arrow is gone.** Every crumb
   * behind the current one is live, so step three reaches step one in a single
   * click — which is the whole argument against the arrow, which could only
   * walk back one step at a time while sitting beside a complete map.
   *
   * `New stack` is a dead crumb on step one only. There it points at the screen
   * you are already on.
   */
  const path: DrawerStep[] = onStart
    ? ["New stack", "Select a service"]
    : onService
      ? [
        { label: "New stack", onClick: () => setStep("start") },
        { label: point?.step ?? "", onClick: () => setStep("configure") },
        "Configure service",
      ]
      : [{ label: "New stack", onClick: () => setStep("start") }, point?.step ?? ""]

  /**
   * The rail — 240, and **only for what you have got** (§13).
   *
   * Two things can fill it and they are the same slot: the thing you picked in
   * full (a template's detail) or the set you are assembling (everything else).
   * A blank canvas has neither, so it gets no rail and the body runs full width
   * — which is the one thing that starting point has to communicate.
   */
  /**
   * **The rail is only what the body cannot show.**
   *
   * It shipped on four of the five starting points and earned its 240 on two.
   * The test is not "does this produce something" — everything does — it is
   * *does the body already say it?*
   *
   * | | |
   * |---|---|
   * | **A ready-made app** | Yes. The rail is the app you picked, in full: a description, links and the services it brings, none of which fits a row |
   * | **Building blocks** | Yes. It is the set you are assembling, and it is the only place you can take one back out |
   * | A repository | No. One repository makes exactly one service, and the row you ticked already named it |
   * | A compose file | No. The file lists its own services, in the well, in your own words |
   * | A blank canvas | No. There is nothing to put in it |
   *
   * That is §13's rule read strictly — *the thing you picked in full, or the
   * set you are assembling* — rather than as "a column that reports state".
   */
  const rail =
    source === "template" && selection.template ? (
      <TemplateDetail template={selection.template} />
    ) : source === "blocks" ? (
      <InThisStack items={items} waitingFor={WAITING_FOR.blocks} />
    ) : null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* `work`, not `form`. The floor for two columns is 596 — measured, not
          guessed — and 640 is the rung above it. The width does not change
          between steps: step one is 640 because step two is. */}
      <DrawerContent size="work">
        {/* **The way back is the path itself**, so step one carries no back
            control at all — it had one only because the arrow needed something
            to do there, and what it did was leave the journey, which the ✕
            already does.

            No description on any step. "Select a service" is already the
            instruction, and a second line under it only restated the list that
            was about to render. */}
        <DrawerHeader steps={path} />

        <DrawerBody className={onStart || onService ? undefined : "flex-row gap-5"}>
          {onStart ? (
            <PickerList aria-label="Starting points">
              {STARTING_POINTS.map((option) => (
                <PickerRow
                  key={option.value}
                  icon={option.icon}
                  name={option.name}
                  meta={[{ text: option.description }]}
                  selected={source === option.value}
                  trailing={source === option.value ? <PickerRowTick /> : null}
                  // **Picking advances.** Step one asks one question and the
                  // row answers it, so a `Continue` beside it only ever repeats
                  // the click you just made. The tick still earns its place —
                  // it is what you see when the `New stack` crumb brings you
                  // back here.
                  onClick={() => {
                    setSource(option.value)
                    setStep("configure")
                  }}
                />
              ))}
            </PickerList>
          ) : onService ? (
            /* No rail on step three. There is nothing to put in one: the body
               IS the thing you picked, in full, which is exactly the test the
               rail has to pass (§13). */
            <ServiceTab
              repoFullName={pickedRepo()?.fullName ?? ""}
              integrationId={pickedRepo()?.integrationId ?? null}
              values={selection.service}
              onChange={updateService}
              errors={serviceErrors}
            />
          ) : (
            <>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                {source === "git" && (
                  <RepositoryTab
                    mode={selection.git.mode}
                    onModeChange={(mode) => update((s) => ({ ...s, git: { ...s.git, mode } }))}
                    repo={selection.git.repo}
                    onRepoChange={(repo) => update((s) => ({ ...s, git: { ...s.git, repo } }))}
                    url={selection.git.url}
                    onUrlChange={(url) => update((s) => ({ ...s, git: { ...s.git, url } }))}
                  />
                )}

                {source === "template" && (
                  <TemplateTab
                    picked={selection.template}
                    onPick={(template) => update((s) => ({ ...s, template }))}
                  />
                )}

                {source === "compose" && (
                  <ComposeTab
                    yaml={selection.compose.yaml}
                    onChange={(yaml) =>
                      update((s) => ({ ...s, compose: { yaml, preview: parseCompose(yaml) } }))
                    }
                  />
                )}

                {source === "blocks" && (
                  <BlocksTab
                    instances={selection.blocks.instances}
                    onAddBlock={(blockId) =>
                      update((s) => {
                        const block = getBlockById(blockId)
                        if (!block) return s
                        return {
                          ...s,
                          blocks: {
                            ...s.blocks,
                            instances: [
                              ...s.blocks.instances,
                              {
                                blockId,
                                name: uniqueBlockName(blockId, s.blocks.instances),
                                label: block.name,
                              },
                            ],
                          },
                        }
                      })
                    }
                    addonIds={selection.blocks.addonIds}
                    onToggleAddon={toggleAddon}
                  />
                )}

                {source === "blank" && <BlankTab />}
              </div>

              {rail}
            </>
          )}
        </DrawerBody>

        {/* **Step one has no footer at all.**
            It used to end on a lone `Cancel`, on the reasoning that a footer
            with one button is still a footer. It is not: there is nothing on
            this step to cancel. Nothing has been typed, nothing has been made,
            and picking a row moves you on rather than committing anything — so
            the button was offering to undo a state that does not exist.

            The two exits it leaves behind are enough and both are already
            there: the path's live crumbs, and the drawer's own ✕.

            Every later step keeps a footer, because by then there IS something
            to commit — but it holds ONE button. `Cancel` came off it too: the
            path and the ✕ are the journey's exits on every step, and a third
            control for the same act is the one to drop, not the last one.

            **The verb changes with the step, and the reason changes with it.**
            A repository is not finished at step two, so its button carries the
            journey forward and says so; every other source commits from there.
            A button that said `Create stack` and then showed you another form
            would be lying about what the click does. */}
        {!onStart && (
          <DrawerFooter>
            <DrawerActions>
              {/* `flat`, not a pill: this does not ship anything — it opens the
                  canvas, where Deploy is the commitment (§9). */}
              {hasServiceStep && !onService ? (
                <BlockedAction reason={ready ? null : reasonList(missingForSource())}>
                  <Button onClick={toServiceStep}>Continue</Button>
                </BlockedAction>
              ) : (
                <BlockedAction
                  reason={
                    onService
                      ? missingForService().length
                        ? reasonList(missingForService())
                        : null
                      : ready
                        ? null
                        : reasonList(missingForSource())
                  }
                >
                  <Button onClick={createStack}>Create stack</Button>
                </BlockedAction>
              )}
            </DrawerActions>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}

type Addon = ReturnType<typeof usePostgresAddons>["addons"][number]

/** Whether a block is a data store, so the rail shows the right glyph. */
function isDataBlock(blockId: string) {
  const block = blockCatalog.find((b) => b.id === blockId)
  return block ? DATA_BLOCK_CATEGORIES.has(block.category) : false
}

/**
 * What the live starting point would put on the canvas, as rows.
 *
 * Only the blocks step can remove one: everywhere else the items are derived
 * from a single pick, and taking one out would leave a selection that no longer
 * matches what is ticked in the list.
 */
function stackItems(
  source: Source,
  selection: Selection,
  addons: Addon[],
  removeBlock: (index: number) => void,
  toggleAddon: (addonId: string) => void,
): StackItem[] {
  if (source === "git") {
    const { mode, repo, url } = selection.git
    if (mode === "url") {
      const parsed = parsePublicRepoUrl(url)
      if (!parsed) return []
      return [
        {
          key: "url",
          name: parsed.fullName.split("/").pop()!,
          sub: "from a public URL",
          icon: <GitBranch />,
        },
      ]
    }
    if (!repo) return []
    return [
      {
        key: repo.fullName,
        name: defaultServiceName(repo),
        sub: `${repo.fullName} · ${repo.defaultBranch || "main"}`,
        icon: <GitBranch />,
      },
    ]
  }

  if (source === "template") {
    if (!selection.template) return []
    return templateServices(selection.template).map((name) => ({
      key: name,
      name,
      sub: "service",
      icon: <Package />,
    }))
  }

  if (source === "compose") {
    const preview = selection.compose.preview
    if (!preview || preview.error) return []
    return [
      ...preview.services.map((name) => ({
        key: `s:${name}`,
        name,
        sub: "service",
        icon: <FileCode />,
      })),
      ...preview.volumes.map((name) => ({
        key: `v:${name}`,
        name,
        sub: "volume",
        icon: <HardDrive />,
      })),
    ]
  }

  if (source === "blocks") {
    return [
      ...selection.blocks.instances.map((instance, index) => ({
        key: `b:${instance.name}`,
        name: instance.name,
        sub: instance.label,
        icon: isDataBlock(instance.blockId) ? (
          <BlockGlyph icon={blockCatalog.find((b) => b.id === instance.blockId)!.icon} size={14} />
        ) : (
          <Globe />
        ),
        // By position, not by block — removing "postgres-2" must not take
        // "postgres" with it.
        onRemove: () => removeBlock(index),
      })),
      ...selection.blocks.addonIds.map((id) => ({
        key: `a:${id}`,
        name: addons.find((a) => a.id === id)?.name ?? id,
        sub: "linked add-on",
        icon: <Database />,
        onRemove: () => toggleAddon(id),
      })),
    ]
  }

  return []
}

/** The navigation-state seed the canvas opens on. */
function buildSeed(source: Source, selection: Selection) {
  if (source === "git") {
    const { mode, repo, url } = selection.git
    const parsedUrl = parsePublicRepoUrl(url)
    const picked =
      mode === "url"
        ? parsedUrl && { ...parsedUrl, defaultBranch: "", integrationId: null }
        : repo
    if (!picked) return emptyDraftSeed()
    /**
     * **The seed is the FORM now, not five guesses.**
     *
     * It used to derive every one of these — name from the repo, branch from
     * the default, and three constants — because the step that asked for them
     * had been deleted. The step is back, so what the user typed is what gets
     * built. The fallbacks stay for the two optional fields, which is exactly
     * where the API's own defaults apply.
     */
    const { serviceName, branch, port, dockerfilePath, buildContext, exposePublic } =
      selection.service
    return buildGitSeed(picked, {
      serviceName: serviceName.trim() || defaultServiceName(picked),
      branch: branch.trim() || picked.defaultBranch || "main",
      dockerfilePath: dockerfilePath.trim() || DEFAULT_DOCKERFILE_PATH,
      buildContext: buildContext.trim() || DEFAULT_BUILD_CONTEXT,
      port: Number.parseInt(port, 10) || DEFAULT_SERVICE_PORT,
      exposePublic,
    })
  }

  if (source === "template" && selection.template) {
    const { data } = templateToFormData(selection.template)
    return {
      ...emptyDraftSeed(),
      name: data.name ?? "",
      labels: data.labels ?? [],
      resources: data.spec?.stack_resources ?? [],
      volumes: data.spec?.volumes ?? [],
    }
  }

  if (source === "compose" && selection.compose.yaml.trim()) {
    const parsed = parseAndValidateDockerCompose(selection.compose.yaml)
    const converted = convertDockerComposeToStackData(parsed as DockerComposeFile)
    return {
      ...emptyDraftSeed(),
      name: converted.data?.name ?? "",
      labels: converted.data?.labels ?? [],
      resources: converted.data?.spec?.stack_resources ?? [],
      volumes: converted.data?.spec?.volumes ?? [],
    }
  }

  if (source === "blocks") {
    // `addBlockToStack` owns the de-duplication, so the instances are replayed
    // through it in order rather than the rail's names being trusted.
    let stack = emptyStack()
    for (const instance of selection.blocks.instances) {
      const block = getBlockById(instance.blockId)
      if (block) stack = addBlockToStack(stack, block)
    }
    return {
      ...emptyDraftSeed(),
      resources: stack.spec.stack_resources as unknown as FormStackResourceData[],
      volumes: (stack.spec.volumes ?? []) as unknown as FormVolumeExtendedData[],
      labels: stack.labels ?? [],
      linkedAddonIds: selection.blocks.addonIds,
    }
  }

  return emptyDraftSeed()
}

