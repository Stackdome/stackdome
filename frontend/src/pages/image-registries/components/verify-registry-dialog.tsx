import { useEffect, useState } from "react";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogSection, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertBanner, FieldShell } from "@/components/branded";
import { useToast } from "@/components/ui/use-toast";
import { verifyRegistryCredential, type RegistryCredential } from "@/api/registry-credentials";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { verifyRegistrySchema } from "../lib/form-schemas";

interface VerifyRegistryDialogProps {
  credential: RegistryCredential | null;
  onOpenChange: (open: boolean) => void;
}

/** The backend parses the registry host out of the repository reference and
 *  rejects mismatches; a path-only value ("acme/app") would parse as a Docker
 *  Hub reference. Prefix the credential's host unless the user already typed
 *  a fully-qualified reference (first segment containing "." or ":"). */
export function qualifyRepository(repository: string, host: string): string {
  const firstSegment = repository.split("/")[0];
  const hasHost = firstSegment.includes(".") || firstSegment.includes(":") || firstSegment === "localhost";
  return hasHost ? repository : `${host}/${repository}`;
}

export function VerifyRegistryDialog({ credential, onOpenChange }: VerifyRegistryDialogProps) {
  const { toast } = useToast();
  const [repository, setRepository] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const credentialId = credential?.id;
  useEffect(() => {
    if (credentialId == null) return;
    setRepository("");
    setFieldError(undefined);
    setError(null);
  }, [credentialId]);

  const submit = async () => {
    const parsed = verifyRegistrySchema.safeParse({ repository });
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.repository?.[0]);
      return;
    }
    setFieldError(undefined);
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
    setVerifying(true);
    try {
      await verifyRegistryCredential(orgId, credential.id, qualifyRepository(parsed.data.repository, credential.host));
      toast({ title: "Registry access verified", variant: "success" });
      onOpenChange(false);
    } catch (e) {
      // Kept in the dialog, beside the repository that was rejected.
      setError(getErrorMessage(e));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={credential != null} onOpenChange={onOpenChange}>
      <DialogContent size="ask">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Verify registry access</DialogTitle>
            <DialogDescription>
              Confirms the {credential?.host} credentials can access a repository.
            </DialogDescription>
          </DialogHeader>
          <DialogSection>
            <FieldShell
              label="Repository"
              htmlFor="verify-repository"
              required
              error={fieldError}
              hint="Repository path on this registry, e.g. acme/app."
            >
              <Input
                id="verify-repository"
                placeholder="acme/app"
                value={repository}
                onChange={(e) => {
                  setRepository(e.target.value);
                  setFieldError(undefined);
                  setError(null);
                }}
                aria-invalid={!!fieldError}
              />
            </FieldShell>
            {error && <AlertBanner>{error}</AlertBanner>}
          </DialogSection>
        </DialogBody>
        <DialogFooter>
          <Button shape="flat" variant="ghost" onClick={() => onOpenChange(false)} disabled={verifying}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={verifying}>
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
