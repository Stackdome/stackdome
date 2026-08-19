import { useEffect, useState } from "react";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogSection, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertBanner, FieldShell } from "@/components/branded";
import { useToast } from "@/components/ui/use-toast";
import { updateRegistryCredential, type RegistryCredential } from "@/api/registry-credentials";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { rotateRegistrySchema } from "../lib/form-schemas";
import { providerIdForHost, registryProvider } from "../lib/providers";
import { ProviderLogo } from "./provider-logo";

interface UpdateCredentialsDialogProps {
  credential: RegistryCredential | null;
  onOpenChange: (open: boolean) => void;
  /** Fired after a successful rotation so the page can refresh the list. */
  onUpdated: () => void;
}

export function UpdateCredentialsDialog({ credential, onOpenChange, onUpdated }: UpdateCredentialsDialogProps) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);

  const credentialId = credential?.id;
  useEffect(() => {
    if (credentialId == null) return;
    // Username is readable and prefilled; password is write-only, never prefilled.
    setUsername(credential?.username ?? "");
    setPassword("");
    setFieldErrors({});
    setError(null);
    // Keyed on id, not the object: a refetched credential must not wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialId]);

  const submit = async () => {
    const parsed = rotateRegistrySchema.safeParse({ username, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({ username: flat.username?.[0], password: flat.password?.[0] });
      return;
    }
    setFieldErrors({});
    setError(null);
    const orgId = getCurrentOrganizationId();
    if (!orgId || !credential?.id) {
      setError(
        !orgId
          ? "No organization is selected. Pick one from the account menu and try again."
          : "This registry is no longer available. Close this and reload the list.",
      );
      return;
    }
    setSaving(true);
    try {
      await updateRegistryCredential(orgId, credential.id, {
        host: credential.host,
        purpose: credential.purpose,
        username: parsed.data.username,
        password: parsed.data.password,
      });
      toast({ title: "Credentials updated", variant: "success" });
      onOpenChange(false);
      onUpdated();
    } catch (e) {
      // Kept in the dialog: the rejected login is still on screen to correct.
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const providerId = providerIdForHost(credential?.host);
  const providerLabel = registryProvider(providerId).label;

  return (
    <Dialog open={credential != null} onOpenChange={onOpenChange}>
      <DialogContent size="ask">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Update credentials</DialogTitle>
            <DialogDescription>
              Replaces the stored login for this registry. Builds pick up the new credentials on their next run.
            </DialogDescription>
          </DialogHeader>
          <DialogSection>
            <div className="flex flex-col gap-4">
              {credential && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <ProviderLogo providerId={providerId} className="h-5 w-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-body font-medium text-foreground">{providerLabel}</p>
                    <p className="truncate font-mono text-label text-fg-muted">{credential.host}</p>
                  </div>
                </div>
              )}
              <FieldShell label="Username" htmlFor="rotate-username" required error={fieldErrors.username}>
                <Input
                  id="rotate-username"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.username}
                />
              </FieldShell>
              <FieldShell label="Password" htmlFor="rotate-password" required error={fieldErrors.password}>
                <Input
                  id="rotate-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    setError(null);
                  }}
                  aria-invalid={!!fieldErrors.password}
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
