import type { components } from "@/api/types/openapi";

/**
 * The in-cluster image registry's state, in the two vocabularies it has.
 *
 * The API sends `ImageRegistryRunning`; `status-variant.ts` keys the `registry`
 * domain on `running`, and `humanise` turns that into the one word a value slot
 * wants — `Running`, not `Image registry running`.
 *
 * **One mapping, at the boundary.** The cluster detail page used to translate
 * the enum into its own display strings inline and hand the RESULT to
 * `statusVariant`, so the word and the colour were derived from two different
 * spellings of the same fact. Normalising here means `StatusText` takes the
 * state alone and derives both, which is the whole contract of that component.
 */
export type ClusterImageRegistryState =
  components["schemas"]["ClusterImageRegistryState"];

export const IMAGE_REGISTRY_STATE_PENDING: ClusterImageRegistryState =
  "ImageRegistryPending";
export const IMAGE_REGISTRY_STATE_RUNNING: ClusterImageRegistryState =
  "ImageRegistryRunning";
export const IMAGE_REGISTRY_STATE_ERROR: ClusterImageRegistryState =
  "ImageRegistryError";

/** The tokens the `registry` status domain is keyed on. */
export const REGISTRY_STATE_PENDING = "pending";
export const REGISTRY_STATE_RUNNING = "running";
export const REGISTRY_STATE_ERROR = "error";

/**
 * The API's enum as the status domain's own token.
 *
 * An unrecognised state passes through rather than collapsing to a stand-in:
 * `statusVariant` already answers `info` for anything it does not know, and a
 * state the screen cannot colour is still the state the cluster is in.
 */
export function registryStateToken(
  state?: string | null,
): string | undefined {
  switch (state) {
    case IMAGE_REGISTRY_STATE_RUNNING:
      return REGISTRY_STATE_RUNNING;
    case IMAGE_REGISTRY_STATE_PENDING:
      return REGISTRY_STATE_PENDING;
    case IMAGE_REGISTRY_STATE_ERROR:
      return REGISTRY_STATE_ERROR;
    default:
      return state ?? undefined;
  }
}
