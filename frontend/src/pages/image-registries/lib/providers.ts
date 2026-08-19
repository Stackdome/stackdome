import type { RegistryCredentialPurpose } from "@/api/registry-credentials";

export const PURPOSE_PULL: RegistryCredentialPurpose = "pull";
export const PURPOSE_PUSH: RegistryCredentialPurpose = "push";
export const PURPOSE_BOTH: RegistryCredentialPurpose = "both";

export const PURPOSE_LABELS: Record<RegistryCredentialPurpose, string> = {
  [PURPOSE_PULL]: "Pull only",
  [PURPOSE_PUSH]: "Push only",
  [PURPOSE_BOTH]: "Pull & push",
};

export type RegistryProviderId = "dockerhub" | "ghcr" | "gitlab" | "quay" | "other";

export interface RegistryProvider {
  id: RegistryProviderId;
  label: string;
  /** Prefilled into `Host` when this registry is picked; `""` for `other`. */
  hostPrefill: string;
  hostPlaceholder: string;
  /** Which credential this registry wants, shown under `Password`. */
  hint: string;
  /**
   * The slug in `BRAND_ICONS`. **Here rather than in the logo component**,
   * because `ghcr` is drawn with GitHub's mark and `dockerhub` with Docker's —
   * a mapping, and a mapping kept beside a component is the second copy this
   * page already shipped three of. Absent where no mark exists (Quay, Other).
   */
  brandSlug?: string;
}

export const REGISTRY_PROVIDERS: RegistryProvider[] = [
  {
    id: "dockerhub",
    label: "Docker Hub",
    hostPrefill: "docker.io",
    hostPlaceholder: "docker.io",
    hint: "Use an access token, not your account password.",
    brandSlug: "docker",
  },
  {
    id: "ghcr",
    label: "GHCR",
    hostPrefill: "ghcr.io",
    hostPlaceholder: "ghcr.io",
    hint: "A GitHub token with read:packages, plus write:packages to push.",
    brandSlug: "github",
  },
  {
    id: "gitlab",
    label: "GitLab Registry",
    hostPrefill: "registry.gitlab.com",
    hostPlaceholder: "registry.gitlab.com",
    hint: "A deploy or access token scoped to the registry.",
    brandSlug: "gitlab",
  },
  {
    id: "quay",
    label: "Quay",
    hostPrefill: "quay.io",
    hostPlaceholder: "quay.io",
    hint: "A robot account token with repository access.",
  },
  {
    id: "other",
    label: "Other",
    hostPrefill: "",
    hostPlaceholder: "registry.example.com",
    hint: "Any registry reachable over HTTPS, by password or token.",
  },
];

/**
 * The named registries, comma-separated — `Docker Hub, GHCR, GitLab Registry,
 * Quay`. **Derived, because the hand-written version had already drifted**: the
 * empty state offered `ECR`, which this list has never held, and never named
 * GitLab or Quay, which it has. Whatever the drawer offers is what the sentence
 * says.
 *
 * `other` is excluded — it is not a name, it is the absence of one, and the
 * sentence that uses this ends on *"or any registry you host"*, which is the
 * same thing said in words. **No trailing `or` here**: supplying one made the
 * line read *"…GitLab Registry or Quay, or any registry you host"*, two
 * alternatives deep in one sentence.
 */
export function namedRegistries(): string {
  return REGISTRY_PROVIDERS.filter((p) => p.id !== "other")
    .map((p) => p.label)
    .join(", ");
}

/**
 * The registry entry for an id. **One lookup, not a `.find()` per call site** —
 * `registry-row.tsx` and `update-credentials-dialog.tsx` each carried their own
 * `REGISTRY_PROVIDERS.find(...)?.label ?? "Registry"`, which is two chances for
 * a fallback word to appear where a label should. `gitProvider(id)` is the
 * precedent.
 */
export function registryProvider(id: RegistryProviderId): RegistryProvider {
  // Non-null: `RegistryProviderId` is the registry's own key type, so a miss is
  // an entry that went missing — a wiring bug, not a case to handle.
  return REGISTRY_PROVIDERS.find((p) => p.id === id)!;
}

/**
 * Which registry a host belongs to — the list row and the rotation dialog both
 * name a credential this way, since the record stores only its host. An
 * unrecognised host is `other`, which is a real answer, not a miss.
 */
export function providerIdForHost(host?: string): RegistryProviderId {
  const h = (host ?? "").toLowerCase();
  if (h.includes("docker.io")) return "dockerhub";
  if (h.includes("ghcr.io")) return "ghcr";
  if (h.includes("gitlab")) return "gitlab";
  if (h.includes("quay")) return "quay";
  return "other";
}
