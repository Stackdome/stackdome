import { useEffect, useState } from "react";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogSection, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertBanner, FieldShell } from "@/components/branded";
import { useToast } from "@/components/ui/use-toast";
import { verifyGitIntegration, type GitIntegration } from "@/api/git-integrations";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { verifyIntegrationFormSchema } from "@/components/git-source-picker/credentials-form-schema";

interface VerifyIntegrationDialogProps {
  integration: GitIntegration | null;
  onOpenChange: (open: boolean) => void;
}

export function VerifyIntegrationDialog({ integration, onOpenChange }: VerifyIntegrationDialogProps) {
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const integrationId = integration?.id;
  useEffect(() => {
    if (integrationId == null) return;
    setRepoUrl("");
    setFieldError(undefined);
    setError(null);
  }, [integrationId]);

  const submit = async () => {
    const parsed = verifyIntegrationFormSchema.safeParse({ repoUrl });
    if (!parsed.success) {
      setFieldError(parsed.error.flatten().fieldErrors.repoUrl?.[0]);
      return;
    }
    setFieldError(undefined);
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
    setVerifying(true);
    try {
      await verifyGitIntegration(orgId, integration.id, parsed.data.repoUrl);
      toast({ title: "Repository access verified", variant: "success" });
      onOpenChange(false);
    } catch (e) {
      // The failure stays here, next to the URL that caused it. A toast would
      // fire after the dialog closed, taking the field the user must fix.
      setError(getErrorMessage(e));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={integration != null} onOpenChange={onOpenChange}>
      <DialogContent size="ask">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Verify repository access</DialogTitle>
            <DialogDescription>
              Confirms the {integration?.host} integration can access a repository.
            </DialogDescription>
          </DialogHeader>
          <DialogSection>
            <FieldShell label="Repository URL" htmlFor="verify-repo-url" required error={fieldError}>
              <Input
                id="verify-repo-url"
                placeholder="https://github.com/acme/webapp"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
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
