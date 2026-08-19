import { useEffect, useState } from "react";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogSection, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertBanner, FieldShell } from "@/components/branded";
import { useToast } from "@/components/ui/use-toast";
import { updateGitIntegration, type GitIntegration } from "@/api/git-integrations";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { updateCredentialsFormSchema } from "@/components/git-source-picker/credentials-form-schema";
import { providerIdFor, PROVIDER_DISPLAY_NAMES } from "@/lib/git-integrations";
import { ProviderLogo } from "@/components/branded/provider-logo";

interface UpdateCredentialsDialogProps {
  integration: GitIntegration | null;
  onOpenChange: (open: boolean) => void;
  /** Fired after a successful update so the page can refresh the list. */
  onUpdated: () => void;
}

export function UpdateCredentialsDialog({ integration, onOpenChange, onUpdated }: UpdateCredentialsDialogProps) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [tokenError, setTokenError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const integrationId = integration?.id;
  useEffect(() => {
    if (integrationId == null) return;
    // Credentials are write-only in the API, so there is nothing to prefill.
    setUsername("");
    setToken("");
    setTokenError(undefined);
    setError(null);
  }, [integrationId]);

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
      // Stays in the dialog: the token that was rejected is still on screen and
      // still editable. A toast would fire after the form had already gone.
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={integration != null} onOpenChange={onOpenChange}>
      <DialogContent size="ask">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Update credentials</DialogTitle>
            <DialogDescription>
              Replaces the stored credentials for this integration. Existing clones keep working once the new
              credentials are saved.
            </DialogDescription>
          </DialogHeader>
          <DialogSection>
            <div className="flex flex-col gap-4">
              {integration && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <ProviderLogo providerId={providerIdFor(integration)} className="h-5 w-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-body font-medium text-foreground">
                      {PROVIDER_DISPLAY_NAMES[providerIdFor(integration)]}
                    </p>
                    <p className="truncate font-mono text-label text-fg-muted">{integration.host}</p>
                  </div>
                </div>
              )}
              <FieldShell
                label="Username"
                htmlFor="update-credentials-username"
                hint="Required for providers using basic auth (e.g. Bitbucket app passwords)."
              >
                <Input
                  id="update-credentials-username"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </FieldShell>
              <FieldShell
                label="Access token"
                htmlFor="update-credentials-token"
                required
                error={tokenError}
              >
                <Input
                  id="update-credentials-token"
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
            </div>
            {error && <AlertBanner>{error}</AlertBanner>}
          </DialogSection>
        </DialogBody>
        <DialogFooter>
          <Button shape="flat" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            Update credentials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
