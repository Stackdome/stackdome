import { useState } from "react";
import { Loader2 } from "lucide-react";
import { type DomainName, validateDomainName } from "../schemas/api-schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertBanner, FieldShell } from "@/components/branded";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDomain: (domain: DomainName) => void;
  existingDomains?: Partial<DomainName>[];
  isLoading?: boolean;
  /** A save that failed on the server. Shown above the footer, never as a toast. */
  submitError?: string | null;
}

export default function AddDomainDialog({
  open,
  onOpenChange,
  onAddDomain,
  existingDomains = [],
  isLoading = false,
  submitError = null,
}: AddDomainDialogProps) {
  const [domainFqdn, setDomainFqdn] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDomainInputChange = (value: string) => {
    setDomainFqdn(value);
    if (error) {
      setError(null);
    }
  };

  const handleAddDomain = () => {
    if (!domainFqdn.trim()) {
      setError("Domain name is required");
      return;
    }

    const validation = validateDomainName(domainFqdn.trim());
    if (!validation.isValid) {
      setError(validation.error || "Invalid domain name");
      return;
    }

    // Check for duplicates
    const normalizedDomain = domainFqdn.trim().toLowerCase();
    const existingDomain = existingDomains.find(
      domain => domain.fqdn?.toLowerCase() === normalizedDomain
    );

    if (existingDomain) {
      setError("This domain already exists");
      return;
    }

    // Add the domain
    onAddDomain({ fqdn: normalizedDomain });

    // Reset state
    setDomainFqdn("");
    setError(null);
  };

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDomainFqdn("");
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="ask">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Add domain</DialogTitle>
            <DialogDescription>
              Configure the domain for your organization.
            </DialogDescription>
          </DialogHeader>
          <DialogSection>
            <FieldShell
              label="Domain name"
              htmlFor="domain-fqdn"
              required
              hint="Examples: example.com, subdomain.example.org, app.company.co.uk"
              error={error}
            >
              <Input
                id="domain-fqdn"
                placeholder="example.com"
                value={domainFqdn}
                onChange={(e) => handleDomainInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && domainFqdn.trim() && !error) {
                    handleAddDomain();
                  }
                }}
                className={error ? "border-danger focus:border-danger" : ""}
              />
            </FieldShell>
            {submitError && <AlertBanner>{submitError}</AlertBanner>}
          </DialogSection>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button shape="flat" variant="outline" type="button">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleAddDomain}
            disabled={!domainFqdn.trim() || !!error || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Add domain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
