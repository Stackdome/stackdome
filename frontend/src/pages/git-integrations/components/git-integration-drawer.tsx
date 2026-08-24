import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertBanner,
  BlockedAction,
  DangerZone,
  DangerZoneRow,
  DetailList,
  DetailRow,
  FieldShell,
  reasonList,
} from "@/components/branded";
import { ProviderLogo } from "@/components/branded/provider-logo";
import { StatusText } from "@/components/branded/status-text";
import { useToast } from "@/components/ui/use-toast";
import {
  listInstallations,
  updateGitIntegration,
  type GitIntegration,
  type GitInstallation,
} from "@/api/git-integrations";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { updateCredentialsFormSchema } from "@/components/git-source-picker/credentials-form-schema";
import {
  deriveRow,
  gitProvider,
  providerIdFor,
  GIT_INTEGRATION_TYPE_GITHUB_APP,
  PROVIDER_DISPLAY_NAMES,
} from "@/lib/git-integrations";

/**
 * **One connected provider, and everything you can do to it.**
 *
 * It replaces the row kebab, which held `Verify repository access`, `Update
 * credentials`, `Manage on GitHub` and `Remove integration` — four acts on one
 * object behind a menu that had to be opened before you could see any of them,
 * and a 32px track carried on every row to hold the trigger.
 *
 * ### The two arms are two different surfaces, and that is not a fork
 *
 * A `git_credentials` integration is a login: the API takes a `PUT`, there is
 * nothing on it that is not a setting, and §13's *details-then-edit* test says
 * a pure config opens straight into its form.
 *
 * A `github_app` integration has no `PUT` at all — access flows through
 * per-installation tokens granted on GitHub, not through anything stored here —
 * so there is no form to open. What it does have is live state worth reading:
 * how many accounts it is installed on and what they let it see. That is a
 * details drawer, and the way to change it is GitHub's own page.
 *
 * Same header, same danger zone, same 480 column. Only the body differs,
 * because only the object differs.
 *
 * ### `Verify` is on the band; `Remove` is in the danger zone
 *
 * Verifying costs nothing and is the thing you do right after typing a token,
 * so it rides the header the way `Sync` does on a preview. Removing takes every
 * stack and preview built from that provider with it — a cost that lands on
 * OTHER objects, which is §10's test for the danger zone.
 */
export function GitIntegrationDrawer({
  integration,
  onOpenChange,
  onUpdated,
  onVerify,
  onRemove,
}: {
  /** `null` closes it. Driven by which row was clicked, so there is no second
   *  `open` prop to keep in step with it. */
  integration: GitIntegration | null;
  onOpenChange: (open: boolean) => void;
  /** Fired after a successful rotation so the page can refresh the list. */
  onUpdated: () => void;
  onVerify: (integration: GitIntegration) => void;
  onRemove: (integration: GitIntegration) => void;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [tokenError, setTokenError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [installations, setInstallations] = useState<GitInstallation[]>([]);
  const requestSeq = useRef(0);

  const integrationId = integration?.id;
  const isGithubApp = integration?.type === GIT_INTEGRATION_TYPE_GITHUB_APP;

  useEffect(() => {
    if (integrationId == null) return;
    // Credentials are write-only in the API, so there is nothing to prefill.
    setUsername("");
    setToken("");
    setTokenError(undefined);
    setError(null);
  }, [integrationId]);

  const loadInstallations = useCallback(async () => {
    // Only GitHub App integrations have installations; a credentials drawer
    // would burn a GitHub refresh call for an always-empty list.
    if (!isGithubApp || !integrationId) return;
    const orgId = getCurrentOrganizationId();
    if (!orgId) return;
    const seq = ++requestSeq.current;
    try {
      // refresh=true re-lists from GitHub, so state lost to a missed webhook
      // self-heals on open — no manual sync action needed.
      const list = await listInstallations(orgId, integrationId, true);
      if (seq === requestSeq.current) setInstallations(list.items ?? []);
    } catch {
      // The drawer keeps whatever it has; closing and reopening retries.
    }
  }, [integrationId, isGithubApp]);

  useEffect(() => {
    void loadInstallations();
  }, [loadInstallations]);

  const submit = async () => {
    const parsed = updateCredentialsFormSchema.safeParse({ username, token });
    if (!parsed.success) {
      setTokenError(parsed.error.flatten().fieldErrors.token?.[0]);
      return;
    }
    setTokenError(undefined);
    setError(null);
    const orgId = getCurrentOrganizationId();
    if (!orgId || !integration?.id) {
      setError(
        !orgId
          ? "No organization is selected. Pick one from the account menu and try again."
          : "This integration is no longer available. Close this and reload the list.",
      );
      return;
    }
    setSaving(true);
    try {
      const trimmedUsername = parsed.data.username?.trim();
      await updateGitIntegration(orgId, integration.id, {
        host: integration.host,
        auth: trimmedUsername
          ? { basic: { username: trimmedUsername, password: parsed.data.token } }
          : { token: parsed.data.token },
      });
      toast({ title: "Credentials updated", variant: "success" });
      onOpenChange(false);
      onUpdated();
    } catch (e) {
      // Kept on the surface: the token that was rejected is still on screen and
      // still editable. A toast would fire after the form had already gone.
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!integration) return null;

  const providerId = providerIdFor(integration);
  const provider = gitProvider(providerId);
  const row = deriveRow(integration, installations);

  /** The primary says the ACT, in the verb of the act (§9) — and it refuses
   *  before the click rather than after it. */
  const missing = () => {
    const out: string[] = [];
    if (provider.basicAuth && !username.trim()) out.push("Enter the username");
    if (!token) out.push("Paste the access token");
    return out;
  };

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        {/* The provider is the name you recognise; the host is the machine
            string that says which one (§6). Same name-then-meta pair the row
            carries. */}
        <DrawerHeader
          leading={<ProviderLogo providerId={providerId} className="size-4" />}
          title={PROVIDER_DISPLAY_NAMES[providerId]}
          description={<span className="font-mono">{integration.host}</span>}
          trailing={
            isGithubApp ? (
              integration.install_url && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild variant="ghost" size="icon">
                      <a
                        href={integration.install_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink aria-hidden />
                        <span className="sr-only">Manage on GitHub</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Manage on GitHub</TooltipContent>
                </Tooltip>
              )
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onVerify(integration)}
                  >
                    <ShieldCheck aria-hidden />
                    <span className="sr-only">Verify repository access</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Verify repository access</TooltipContent>
              </Tooltip>
            )
          }
        />

        <DrawerBody>
          {isGithubApp ? (
            /* Nothing here is editable, so nothing here is a field. The same
               label-and-value idiom as the cluster and addon drawers. */
            <DetailList>
              <DetailRow label="Status">
                <StatusText domain="git_integration" state={row.statusKey} icon />
              </DetailRow>
              <DetailRow label="Auth">{row.authLabel}</DetailRow>
              <DetailRow label="Access">{row.access.label}</DetailRow>
              <DetailRow label="Repositories">{row.access.hint}</DetailRow>
            </DetailList>
          ) : (
            <>
              {/* **A value, not a field** (§9). The API keys on the host, so it
                  is fixed once the integration exists — it reports rather than
                  pretending to be editable. */}
              <FieldShell label="Host">
                <div className="flex h-8 items-center rounded-md bg-control px-3 font-mono text-body text-fg-2">
                  {integration.host}
                </div>
              </FieldShell>

              <FieldShell
                label="Username"
                htmlFor="git-integration-username"
                required={provider.basicAuth}
                help="Only hosts that authenticate with basic auth need one — Bitbucket app passwords, mainly. Leave it blank for a bare token."
              >
                <Input
                  id="git-integration-username"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </FieldShell>

              {/* Write-only, so it is never prefilled — there is nothing to
                  show, and a masked placeholder would claim there was. The hint
                  survives the tooltip sweep because it tells you WHICH token to
                  paste, which is the one thing you cannot work out from here. */}
              <FieldShell
                label="Access token"
                htmlFor="git-integration-token"
                required
                hint={provider.tokenHint}
                help="Clones started after the save use the new token; the ones already running keep the old one."
                error={tokenError}
              >
                <Input
                  id="git-integration-token"
                  type="password"
                  autoComplete="new-password"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setTokenError(undefined);
                    setError(null);
                  }}
                  aria-invalid={!!tokenError}
                />
              </FieldShell>
            </>
          )}

          <DangerZone className="mt-1">
            <DangerZoneRow
              title="Remove this provider"
              description="Every stack and preview built from it stops cloning."
              action={
                <Button
                  variant="destructive-ghost"
                  shape="flat"
                  onClick={() => onRemove(integration)}
                >
                  Remove provider
                </Button>
              }
            />
          </DangerZone>
        </DrawerBody>

        {/* **A GitHub App drawer has no footer.** There is nothing to commit —
            the app's access is changed on GitHub, not here — and a band holding
            one disabled button is 81px of the column spent saying so. */}
        {!isGithubApp && (
          <DrawerFooter>
            {/* In the footer band, not the body. Inside a band that scrolls, a
                failure scrolls away from the button that produced it. */}
            {error && <AlertBanner>{error}</AlertBanner>}
            <DrawerActions>
              <BlockedAction reason={saving ? null : reasonList(missing())}>
                <Button onClick={() => void submit()} disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />}
                  Update credentials
                </Button>
              </BlockedAction>
            </DrawerActions>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
