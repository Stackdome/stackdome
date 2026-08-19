import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState, NoProviderGlyph } from "@/components/branded";
import { listAllPreviewConfigs, type StackPreviewConfig } from "@/api/preview-configs";
import { ConfigList, ConfigListSkeleton } from "./components/config-list";
import { usePreviewEnvs } from "@/hooks/use-preview-envs";
import { EnableRepoWizard } from "@/pages/previews/components/enable-repo-wizard/enable-repo-wizard";
import { getCurrentOrganizationId } from "@/lib/common";
import { getErrorMessage } from "@/api/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useResourceProjects } from "@/hooks/use-resource-projects";

export default function PreviewsPage() {
  const navigate = useNavigate();
  const { canWriteAnyProject } = useCurrentUser();
  const { defaultProjectName } = useResourceProjects();
  const [configs, setConfigs] = useState<StackPreviewConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { envs, refresh: refreshEnvs } = usePreviewEnvs();

  const refresh = useCallback(async () => {
    const orgId = getCurrentOrganizationId();
    if (!orgId || !defaultProjectName) return;
    try {
      setConfigs(await listAllPreviewConfigs(orgId, defaultProjectName));
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [defaultProjectName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const envCount = (configId?: string) =>
    envs.filter((e) => e.config_id && e.config_id === configId).length;

  const enableRepo = (variant: "default" | "outline") =>
    canWriteAnyProject ? (
      <Button variant={variant} onClick={() => setWizardOpen(true)}>
        <Plus />
        Enable repository
      </Button>
    ) : undefined;

  return (
    <div className="flex flex-1 flex-col h-full">
      <PageHeader
        // §12a's one fact. No eyebrow, no subtitle — the explanation belongs to
        // the empty state, and once there are rows they explain themselves.
        status={
          !loading && !error && configs.length > 0 ? (
            <span className="text-name tabular-nums text-fg-muted">
              {configs.length} {configs.length === 1 ? "repository" : "repositories"}
            </span>
          ) : undefined
        }
        // Present in every state, not just the populated one. The header IS the
        // page's one fill; hiding it when the list is empty left the header bare
        // on the exact screen where the action matters most.
        actions={enableRepo("default")}
      />

      {loading ? (
        /* §15 loading — the rows at their real pitch, not a centred spinner.
           A spinner tells you to wait; this tells you what is arriving, and
           nothing moves when it does. */
        <ConfigListSkeleton />
      ) : error && configs.length === 0 ? (
        /* No art. `NoProviderGlyph` is this page's first-run drawing (below), so
           reusing it here would show one picture for two different situations.
           The retry REFETCHES rather than reloading the page. */
        <EmptyState
          className="flex-1"
          title="Previews could not be loaded"
          description={error}
          action={
            <Button variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          }
        />
      ) : configs.length === 0 ? (
        /* The same drawing the New stack page's repository tab uses: previews
           begin at a repository, and until one is wired up the line between here
           and the code has not arrived. */
        <EmptyState
          className="flex-1 gap-6"
          icon={<NoProviderGlyph />}
          title="Preview every pull request"
          description="Enable a repository and each pull request gets its own temporary environment with a shareable URL."
          /* Outline, never filled (§9). The header already carries this exact
             action as the page's one fill. */
          action={enableRepo("outline")}
        />
      ) : (
        /* No padding wrapper: the sheet already supplies the 16px content
           inset that `DataListHeader`'s -mt-2 is measured against, and a p-4
           here pushed every row 16px off the column the other list pages
           share. */
        <ConfigList
          configs={configs}
          envCount={envCount}
          onOpen={(id) => navigate(`/previews/${id}`)}
        />
      )}

      <EnableRepoWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => {
          void refresh();
          void refreshEnvs();
        }}
      />
    </div>
  );
}
