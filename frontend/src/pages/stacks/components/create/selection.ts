import type { PickedRepo } from "@/components/git-source-picker/types"
import type { Template } from "@/pages/stacks/data/templates/types"

/**
 * One block put into the stack. The same block can go in repeatedly, so an
 * instance carries its own de-duplicated `name` — `postgres`, `postgres-2` —
 * alongside the catalogue id it came from.
 */
export interface BlockInstance {
  blockId: string
  /** The resource name. Machine-set, and unique within the stack. */
  name: string
  /** The catalogue name, for the "In this stack" subtitle. */
  label: string
}

/**
 * The service step's fields — step three of the repository journey.
 *
 * **They live on `Selection`, not in the step's own `useState`.** Going back to
 * the repository list and returning must not wipe a port you already typed, and
 * a step that owns its state unmounts and forgets. Same reason the four sources
 * keep their selections when you move between them.
 *
 * Everything is a string, including `port`: these are what is IN the boxes, and
 * a half-typed port is not a number yet. `serviceFormSchema` is what turns them
 * into values, once, on the way out.
 */
export interface ServiceForm {
  serviceName: string
  branch: string
  port: string
  dockerfilePath: string
  buildContext: string
  exposePublic: boolean
}

/** What the compose tab read out of the file it was given. */
export interface ComposePreview {
  services: string[]
  volumes: string[]
  warnings: string[]
  error: string | null
}

/**
 * Everything the five tabs have gathered. It is one object rather than five
 * because the footer, the "In this stack" panel and `Create stack` all have to
 * read whichever tab is live without knowing which one that is.
 *
 * **Switching tabs does not discard the others.** Picking a repository and then
 * looking at the templates must not silently throw the repository away — the
 * strip is a set of peers you move between, not a wizard step you commit to.
 */
export interface Selection {
  git: { mode: "provider" | "url"; repo: PickedRepo | null; url: string }
  service: ServiceForm
  template: Template | null
  compose: { yaml: string; preview: ComposePreview | null }
  blocks: { instances: BlockInstance[]; addonIds: string[] }
}

/**
 * The service form's starting values.
 *
 * `serviceName` and `branch` are filled in from the repository the moment you
 * leave step two — see `serviceDefaults`. The other four are the API's own
 * defaults, and `port` is deliberately EMPTY rather than "3000": it is required,
 * and pre-filling a required field with a guess is how a wrong port ships
 * without anyone reading it. The placeholder still says 3000.
 */
function emptyServiceForm(): ServiceForm {
  return {
    serviceName: "",
    branch: "",
    port: "",
    dockerfilePath: "Dockerfile",
    buildContext: ".",
    exposePublic: true,
  }
}

export function emptySelection(): Selection {
  return {
    git: { mode: "provider", repo: null, url: "" },
    service: emptyServiceForm(),
    template: null,
    compose: { yaml: "", preview: null },
    blocks: { instances: [], addonIds: [] },
  }
}

/**
 * `https://github.com/acme/api.git` → `acme/api`, or `null` if that is not a
 * repository URL.
 *
 * **One reading of the URL, used everywhere.** The same regex and the same
 * tail-slicing had grown four copies — the blocked-commit reason, the repo the
 * service step configures, the row the rail shows, and the seed the canvas
 * opens on. Four copies of "what counts as a repository URL" is four chances
 * for the button to be live while the seed comes out empty.
 *
 * It is deliberately loose: `scheme://host/owner/name`. Anything stricter
 * starts rejecting the self-hosted GitLab and Gitea URLs this path exists to
 * accept, and the clone is what finally decides whether the URL was real.
 */
export function parsePublicRepoUrl(url: string): { fullName: string; cloneUrl: string } | null {
  const cloneUrl = url.trim()
  if (!/^https?:\/\/\S+\/\S+/.test(cloneUrl)) return null
  const fullName = cloneUrl
    .replace(/\.git$/, "")
    .replace(/\/+$/, "")
    .split("/")
    .slice(-2)
    .join("/")
  return { fullName, cloneUrl }
}

/**
 * The next free name for a block. Mirrors `uniqueName()` inside
 * `addBlockToStack`, which is what actually renames on the way to the canvas —
 * this exists so the panel can show the name *before* you get there.
 */
export function uniqueBlockName(blockId: string, taken: BlockInstance[]): string {
  const names = new Set(taken.map((i) => i.name))
  if (!names.has(blockId)) return blockId
  let n = 2
  while (names.has(`${blockId}-${n}`)) n += 1
  return `${blockId}-${n}`
}
