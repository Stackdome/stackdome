import type { GitIntegration, GitInstallation } from "@/api/git-integrations";

export const GIT_INTEGRATION_TYPE_GITHUB_APP = "github_app" as const;
export const GIT_INTEGRATION_TYPE_CREDENTIALS = "git_credentials" as const;
export const STATUS_PENDING_INSTALL = "pending_install" as const;
export const STATUS_INSTALLED = "installed" as const;
export const STATUS_ACTIVE = "active" as const;
export const REPOSITORY_SELECTION_ALL = "all" as const;

export type ProviderId = "github" | "gitlab" | "bitbucket" | "gitea" | "other";

/** Detects the git host provider from a hostname (or URL host substring), for logo selection. */
export function providerIdForHost(host?: string): ProviderId {
  const h = (host ?? "").toLowerCase();
  if (h.includes("github")) return "github";
  if (h.includes("gitlab")) return "gitlab";
  if (h.includes("bitbucket")) return "bitbucket";
  if (h.includes("gitea")) return "gitea";
  return "other";
}

/** Detects the git host provider from the integration type/host, for logo selection. */
export function providerIdFor(integration: GitIntegration): ProviderId {
  if (integration.type === GIT_INTEGRATION_TYPE_GITHUB_APP) return "github";
  return providerIdForHost(integration.host);
}

/**
 * Everything the product knows about a git host, in one place.
 *
 * **The catalogue is a registry, not a screen** (§13). This list used to exist
 * twice — once here as display names, once inside the connect wizard as tiles
 * with their own copy, and the comment on this constant admitted it. The two had
 * already drifted: `other` was `Git host` in the list and `Other` on the tile.
 * That is the `Postgres`/`PostgreSQL` failure and the secret `Type` select's
 * three-of-six failure for a third time, so there is one list now and the
 * display names are derived from it.
 */
export interface GitProvider {
  id: ProviderId;
  /** The one name. It titles a row in the list AND a row in the catalogue. */
  name: string;
  /** Prefilled into `Host` where the provider has a single well-known one. */
  hostPrefill: string;
  hostPlaceholder: string;
  /** The catalogue row's second line — how you connect to this one. */
  summary: string;
  /** The `Access token` field's hint: which token, with which scope. */
  tokenHint: string;
  /**
   * This host authenticates with **username + app password**, not a bare
   * token — so `Username` is genuinely required on it and optional everywhere
   * else. It shipped marked optional while its hint said "Required for
   * providers using basic auth", which is both answers at once (§6).
   */
  basicAuth?: boolean;
  /** GitHub alone offers an App install as well as a token — see §13. */
  hasApp?: boolean;
}

export const GIT_PROVIDERS: GitProvider[] = [
  {
    id: "github",
    name: "GitHub",
    hostPrefill: "github.com",
    hostPlaceholder: "github.com",
    summary: "App install or access token",
    tokenHint: "Use a fine-grained personal access token with repository read access.",
    hasApp: true,
  },
  {
    id: "gitlab",
    name: "GitLab",
    hostPrefill: "gitlab.com",
    hostPlaceholder: "gitlab.com or gitlab.example.com",
    summary: "Access token",
    tokenHint: "Use a project or personal access token with read_repository scope.",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    hostPrefill: "bitbucket.org",
    hostPlaceholder: "bitbucket.org",
    summary: "Username and app password",
    tokenHint: "Use an app password with repository read permission.",
    basicAuth: true,
  },
  {
    id: "gitea",
    name: "Gitea",
    hostPrefill: "",
    hostPlaceholder: "gitea.example.com",
    summary: "Access token",
    tokenHint: "Use an access token with read:repository scope.",
  },
  {
    id: "other",
    name: "Git host",
    hostPrefill: "",
    hostPlaceholder: "git.example.com",
    summary: "Any host reachable over HTTPS",
    tokenHint: "Any git host reachable over HTTPS with token or basic auth.",
  },
];

export function gitProvider(id: ProviderId): GitProvider {
  // Non-null: `ProviderId` is the registry's own key type, so a miss is a
  // registry that lost an entry — a wiring bug, not a case to handle.
  return GIT_PROVIDERS.find((p) => p.id === id)!;
}

/** Row-title display name per provider. Derived, so it cannot drift. */
export const PROVIDER_DISPLAY_NAMES = Object.fromEntries(
  GIT_PROVIDERS.map((p) => [p.id, p.name]),
) as Record<ProviderId, string>;

export type RowTone = "ok" | "attention";

/** One-line summary of what the integration can reach, shown in the row. */
export interface RowAccess {
  label: string;
  /** Optional mono hint rendered right-aligned (e.g. repository scope). */
  hint?: string;
}

export interface RowViewModel {
  host: string;
  authLabel: string;
  statusKey: "connected" | "needs_setup" | "action_needed";
  statusLabel: string;
  tone: RowTone;
  banner?: { message: string; ctaLabel: string; ctaHref?: string };
  access: RowAccess;
}

// Invariant: status must stay derivable from the integration alone — installations are optional row context.
function statusFor(integration: GitIntegration): { key: RowViewModel["statusKey"]; label: string; tone: RowTone } {
  if (integration.credentials_configured === false) {
    return { key: "action_needed", label: "Needs attention", tone: "attention" };
  }
  if (integration.status === STATUS_PENDING_INSTALL) {
    return { key: "needs_setup", label: "Needs setup", tone: "attention" };
  }
  return { key: "connected", label: "Connected", tone: "ok" };
}

function bannerFor(integration: GitIntegration, statusKey: RowViewModel["statusKey"]): RowViewModel["banner"] {
  if (statusKey === "needs_setup") {
    return {
      message: "The app is created but not installed on any account yet, so Stackdome can't see your repositories.",
      ctaLabel: "Finish install →",
      ctaHref: integration.install_url,
    };
  }
  if (statusKey === "action_needed") {
    return {
      message: "No credentials are stored for this integration, so clones will fail.",
      ctaLabel: "Update credentials →",
    };
  }
  return undefined;
}

function accessFor(
  integration: GitIntegration,
  statusKey: RowViewModel["statusKey"],
  installations?: GitInstallation[],
): RowAccess {
  if (statusKey === "action_needed") {
    return { label: "Access blocked" };
  }

  if (integration.type === GIT_INTEGRATION_TYPE_GITHUB_APP) {
    if (statusKey === "needs_setup") {
      return { label: "No repositories yet", hint: "finish install" };
    }
    const count = installations?.length ?? 0;
    const installationWord = count === 1 ? "installation" : "installations";
    const hasAll = installations?.some((installation) => installation.repository_selection === REPOSITORY_SELECTION_ALL) ?? false;
    const scope = hasAll ? "all repositories" : "selected repositories";
    return { label: `${count} ${installationWord}`, hint: scope };
  }

  return { label: `Token-scoped access to ${integration.host}` };
}

export function deriveRow(integration: GitIntegration, installations?: GitInstallation[]): RowViewModel {
  const { key: statusKey, label: statusLabel, tone } = statusFor(integration);

  return {
    host: integration.host,
    authLabel: integration.type === GIT_INTEGRATION_TYPE_GITHUB_APP ? "GitHub App" : "Access token",
    statusKey,
    statusLabel,
    tone,
    banner: bannerFor(integration, statusKey),
    access: accessFor(integration, statusKey, installations),
  };
}
