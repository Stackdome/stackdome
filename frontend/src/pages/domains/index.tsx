import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getCurrentOrganizationId } from "@/lib/common";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/branded/confirm";
import { PageHeader, EmptyState, BlockedAction } from "@/components/branded";
import { NoConnectionGlyph, NoSecretsGlyph } from "@/components/branded/empty-state";
import * as organizationApi from "@/api/organizations";
import type { Organization } from "@/api/organizations";
import { getErrorMessage } from "@/api/client";
import { type DomainName, createDomainFromForm } from "./schemas/api-schema";
import DomainListItem, { DomainListSkeleton } from "./components/domain-list-item";
import AddDomainDialog from "./components/add-domain-dialog";

export default function DomainsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const { setCustomLabel, setPathLoading } = useBreadcrumb();
  const { toast } = useToast();
  const confirm = useConfirm();

  // Named rather than inline in the effect, so the error state has something
  // to RETRY. Reloading the page was never a retry: it threw away the router,
  // the session and any dialog the user had open, to re-run one request.
  const loadOrganization = useCallback(async () => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) {
      setError("No organization selected.");
      setLoading(false);
      return;
    }

    const currentPath = `/domains`;
    setPathLoading(currentPath, true);
    setLoading(true);

    try {
      const data = await organizationApi.getOrganization(orgId);
      setOrganization(data);
      setError(null);
      setCustomLabel(currentPath, "Domains");
    } catch (err) {
      console.error("Failed to load organization:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setPathLoading(currentPath, false);
    }
  }, [setCustomLabel, setPathLoading]);

  useEffect(() => {
    void loadOrganization();
  }, [loadOrganization]);

  /**
   * Resolves to null on success, or the message to show. The caller decides
   * WHERE that message goes: the add path still has its dialog open, so it goes
   * inside it; the remove path has no form left, so it takes a toast.
   */
  const persistDomains = async (updatedDomains: Partial<DomainName>[]): Promise<string | null> => {
    if (!organization) return "The organization has not loaded yet. Try again in a moment.";

    const orgId = getCurrentOrganizationId();
    if (!orgId) return "No organization is selected. Pick one from the account menu and try again.";

    setSaving(true);

    try {
      const validatedDomains = updatedDomains
        .filter(domain => domain.fqdn && domain.fqdn.trim())
        .map(domain => createDomainFromForm({ fqdn: domain.fqdn }));

      // Send only fields the server actually consumes; timestamps + id are server-managed.
      const updatedOrg = await organizationApi.updateOrganization(orgId, {
        id: organization.id,
        name: organization.name,
        is_platform: organization.is_platform,
        domains: validatedDomains,
      });

      setOrganization(updatedOrg);
      return null;
    } catch (err) {
      console.error("Failed to update domains:", err);
      return getErrorMessage(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async (newDomain: DomainName) => {
    if (!organization) return;

    setAddError(null);
    const updatedDomains = [...(organization.domains || []), newDomain];
    const failure = await persistDomains(updatedDomains);
    if (failure) {
      setAddError(failure);
      return;
    }

    setShowAddDialog(false);
    toast({
      title: "Domain added",
      description: "Domain configuration added successfully.",
      variant: "success",
    });
  };

  const handleRemoveDomain = async (index: number) => {
    if (!organization) return;

    // It used to fire on the first click: no gate, no undo, and every stack
    // served on that domain loses its address. §6a level 2.
    const fqdn = organization.domains?.[index]?.fqdn ?? "this domain";
    const ok = await confirm({
      title: "Remove domain?",
      description: `Every stack served on ${fqdn} loses its address. Existing links stop resolving as soon as DNS catches up.`,
      confirmLabel: "Remove",
      variant: "destructive",
      gate: {
        kind: "acknowledge",
        label: `I understand that stacks served on ${fqdn} will become unreachable.`,
      },
    });
    if (!ok) return;

    const updatedDomains = [...(organization.domains || [])];
    updatedDomains.splice(index, 1);
    const failure = await persistDomains(updatedDomains);
    if (failure) {
      // No form is left on screen to correct, so a toast is the right home here.
      toast({ title: "Domain could not be removed", description: failure, variant: "destructive" });
      return;
    }

    toast({
      title: "Domain deleted",
      description: "The domain configuration removed from your configuration.",
      variant: "success",
    });
  };

  const domains = organization?.domains || [];

  const addDomain = (variant: "default" | "outline") => (
    <BlockedAction
      reason={domains.length >= 1 ? "Only one domain is supported today." : null}
    >
      <Button variant={variant} onClick={() => setShowAddDialog(true)}>
        <Plus />
        Add domain
      </Button>
    </BlockedAction>
  );

  return (
    <div className="flex flex-1 flex-col h-full">
      <PageHeader
        // §12a's one fact. No eyebrow, no subtitle: the explanation belongs to
        // the empty state, where it is actually needed. This page has no tools,
        // so it passes no toolbar and the band collapses to 56px.
        status={
          !loading && !error && domains.length > 0 ? (
            <span className="text-name tabular-nums text-fg-muted">
              {domains.length} {domains.length === 1 ? "domain" : "domains"}
            </span>
          ) : undefined
        }
        actions={addDomain("default")}
      />

      {error ? (
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoConnectionGlyph />}
          title="Domains could not be loaded"
          description={error}
          action={
            <Button variant="outline" onClick={() => void loadOrganization()}>
              Try again
            </Button>
          }
        />
      ) : loading ? (
        <DomainListSkeleton />
      ) : domains.length === 0 ? (
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoSecretsGlyph />}
          title="No domain yet"
          description="A domain is the address your stacks are served on. Add one and every stack you deploy gets its own subdomain underneath it."
          /* Outline, never filled (§9). The header already carries this exact
             action as the page's one fill. */
          action={addDomain("outline")}
        />
      ) : (
        <div>
          {domains.map((domain, index) => (
            <DomainListItem
              key={index}
              domain={domain}
              index={index}
              onRemove={handleRemoveDomain}
            />
          ))}
        </div>
      )}

      <AddDomainDialog
        submitError={addError}
        open={showAddDialog}
        onOpenChange={(next) => {
          if (!next) setAddError(null);
          setShowAddDialog(next);
        }}
        onAddDomain={handleAddDomain}
        existingDomains={domains}
        isLoading={saving}
      />
    </div>
  );
}
