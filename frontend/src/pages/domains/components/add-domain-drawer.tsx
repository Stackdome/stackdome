import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { type DomainName, validateDomainName } from "../schemas/api-schema";
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
import { AlertBanner, BlockedAction, FieldShell, reasonList } from "@/components/branded";

interface AddDomainDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDomain: (domain: DomainName) => void;
  existingDomains?: Partial<DomainName>[];
  isLoading?: boolean;
  /** A save that failed on the server. Shown in the footer band, never as a toast. */
  submitError?: string | null;
}

/**
 * **A drawer, one phase** — §13's table names `domain` under *"None → drawer,
 * one phase"*, and this shipped as a `Dialog` at `ask`. The other of the two
 * §13 still listed as exceptions *"until they convert"*.
 *
 * **One field is not an argument for a dialog.** A dialog is a *decision* — one
 * question, two answers, and it closes on either. This produces an **object**
 * that then appears in a list, and §13's rule does not have a field-count
 * escape: *"if the answer is an object, it is a drawer."* The surface is chosen
 * by what comes out of it, not by how much goes in.
 *
 * Nothing here pairs, because there is nothing to pair it with.
 */
export default function AddDomainDrawer({
  open,
  onOpenChange,
  onAddDomain,
  existingDomains = [],
  isLoading = false,
  submitError = null,
}: AddDomainDrawerProps) {
  const [domainFqdn, setDomainFqdn] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDomainFqdn("");
      setError(null);
    }
  }, [open]);

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

    const normalizedDomain = domainFqdn.trim().toLowerCase();
    const existingDomain = existingDomains.find(
      domain => domain.fqdn?.toLowerCase() === normalizedDomain
    );

    if (existingDomain) {
      setError("This domain already exists");
      return;
    }

    onAddDomain({ fqdn: normalizedDomain });
  };

  /**
   * The one thing that can be missing, phrased as the thing to DO about it.
   *
   * **Only emptiness blocks.** A value that is malformed or already taken is
   * answered by the field's own error, four pixels under the box it is about —
   * putting the same sentence in a tooltip on a control 200px away would be the
   * message twice, and the further copy is the one that needs hovering to read.
   */
  const missingFields = (): string[] =>
    domainFqdn.trim() ? [] : ["Enter a domain name"];

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (isLoading) return;
        onOpenChange(next);
      }}
    >
      <DrawerContent size="form">
        <DrawerHeader
          title="Add domain"
          /* Orientation, and one line. `Configure the domain for your
             organization` restated the title in longer words and told nobody
             what a domain is FOR — which is the one thing a first-time reader of
             this drawer does not have. */
          description="The address your stacks are served on."
        />

        <DrawerBody>
          <FieldShell
            label="Domain name"
            htmlFor="domain-fqdn"
            required
            /* A constraint, not a third specimen. It shipped
               `hint="Examples: example.com, subdomain.example.org,
               app.company.co.uk"` over `placeholder="example.com"` — four
               specimens across the two slots §6 gives one job each, and the
               hint's three were what the validator actually enforces said in
               the least direct way available. */
            hint="A fully qualified domain, and one whose DNS you can point here."
            error={error}
          >
            <Input
              id="domain-fqdn"
              placeholder="acme.dev"
              value={domainFqdn}
              onChange={(e) => handleDomainInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && domainFqdn.trim()) {
                  handleAddDomain();
                }
              }}
              className={error ? "border-danger focus:border-danger" : ""}
            />
          </FieldShell>
        </DrawerBody>

        <DrawerFooter>
          {/* In the footer band, not the body — a failure must not be able to
              scroll away from the button that produced it. */}
          {submitError && <AlertBanner>{submitError}</AlertBanner>}
          {/* **The primary alone, and it says why it is off** (§9). It disabled
              on a bare `!domainFqdn.trim()` with no reason attached. `Cancel` is
              gone with the dialog: nothing is committed until this is pressed,
              so the ✕, Esc and the scrim are the exits (§13). */}
          <DrawerActions>
            <BlockedAction reason={isLoading ? null : reasonList(missingFields())}>
              <Button onClick={handleAddDomain} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Add domain
              </Button>
            </BlockedAction>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
