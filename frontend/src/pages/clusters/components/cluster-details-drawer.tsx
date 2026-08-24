import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  BlockedAction,
  DangerZone,
  DangerZoneRow,
  DetailList,
  DetailRow,
} from "@/components/branded";
import { StatusText } from "@/components/branded/status-text";
import { copyText } from "@/lib/clipboard";
import { useToast } from "@/components/ui/use-toast";
import { registryStateToken } from "@/lib/cluster-registry";
import type { Cluster } from "../types";

/**
 * The host and port a `cluster_url` points at — `10.0.0.1:6443`.
 *
 * The scheme is the same on every cluster the product can talk to, so it is
 * chrome in the header's description slot; the full URL is still on its own row
 * where it can be copied. An unparseable value falls back to itself rather than
 * to nothing: a malformed URL is the answer to "which server", and hiding it
 * would report a configured cluster as though it had no address.
 */
function hostOf(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * **One cluster, in full.**
 *
 * The list used to throw you onto `/clusters/<id>` for every glance — "is the
 * in-cluster registry up", "which API server is this one" — and coming back cost
 * a navigation each time. That page held nothing this column cannot, so the
 * click lands here instead and the list stays on screen behind it (§13).
 *
 * **The same three bands and the same body idiom as the addon drawer** — a label
 * and its value on the 32 rung, one pitch all the way down, and no footer. A
 * drawer that only READS an object has nothing to commit.
 *
 * ### There is no `Edit`
 *
 * A cluster is created and destroyed, never updated: the API has `POST`, `GET`
 * and `DELETE` and no `PUT`. So the header carries the close alone, and the two
 * secrets on the object — the CA certificate and the service-account token —
 * are reported as one row saying they exist, rather than as two masked, disabled
 * inputs offering an edit that cannot happen.
 */
export function ClusterDetailsDrawer({
  cluster,
  onOpenChange,
  onDelete,
  canWrite = true,
}: {
  /** `null` closes it. The drawer is driven by which row was clicked, so there
   *  is no second `open` prop to keep in step with it. */
  cluster: Cluster | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (cluster: Cluster) => void;
  canWrite?: boolean;
}) {
  const { toast } = useToast();
  if (!cluster) return null;

  const registry = cluster.cluster_image_registry;
  const url = cluster.cluster_url;

  const copy = async (value: string) => {
    await copyText(value);
    toast({ title: "API server URL copied", variant: "success" });
  };

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        {/* The host is the description slot: a name says WHICH cluster and says
            nothing about where it is. */}
        <DrawerHeader title={cluster.name} description={hostOf(url)} />

        <DrawerBody>
          <DetailList>
            {/* **`Off` is an answer, not an absence.** A cluster without the
                in-cluster registry is a decision someone made at creation, and
                a row that vanished would read as "we could not tell you". */}
            <DetailRow label="Image registry">
              {registry ? (
                <StatusText
                  domain="registry"
                  state={registryStateToken(registry.status?.state)}
                  icon
                />
              ) : (
                "Off"
              )}
            </DetailRow>
            <DetailRow label="Registry size">
              {registry?.spec?.backend_storage_size}
            </DetailRow>
            <DetailRow label="API server">
              {url ? (
                <>
                  <span className="min-w-0 truncate font-mono text-meta" title={url}>
                    {url}
                  </span>
                  {/* `outline` — the board's `secondary`. A ghost among a column
                      of plain text reads as absent until you hover it. */}
                  <Button
                    variant="outline"
                    shape="flat"
                    className="ml-auto flex-none"
                    onClick={() => void copy(url)}
                  >
                    Copy
                  </Button>
                </>
              ) : undefined}
            </DetailRow>
            {/* **No second `Copy`.** Every details drawer in the product hands
                you exactly one machine string — the preview's URL, the addon's
                host — and here it is the API server. Two outline buttons in
                adjacent 32px rows touch at zero gap and read as one 64px slab,
                which is a control the drawer does not have. The id is still a
                fact worth reading, so it stays as text. */}
            <DetailRow label="Cluster ID">
              {cluster.id ? (
                <span
                  className="min-w-0 truncate font-mono text-meta"
                  title={cluster.id}
                >
                  {cluster.id}
                </span>
              ) : undefined}
            </DetailRow>
            {/* One row for the two secrets. They are the same fact — the screen
                holds them and will not show them — and there is no rotation to
                offer, so a second row would be the same sentence twice. */}
            <DetailRow label="Credentials">Encrypted at rest</DetailRow>
            <DetailRow label="Platform">
              {cluster.platform ? "Stackdome runs on this cluster" : undefined}
            </DetailRow>
          </DetailList>

          {/* **Deleting a cluster lands on everything running on it**, so the
              trigger is the danger zone rather than a glyph on the band (§10) —
              at the FOOT of the body, after everything you would read before
              deciding. */}
          {canWrite && (
            <DangerZone className="mt-1">
              <DangerZoneRow
                title="Delete this cluster"
                description="Every stack deployed here stops running and its addons go with it."
                action={
                  <BlockedAction
                    reason={
                      cluster.platform
                        ? "Stackdome itself runs on this cluster."
                        : null
                    }
                  >
                    <Button
                      variant="destructive-ghost"
                      shape="flat"
                      onClick={() => onDelete(cluster)}
                    >
                      Delete cluster
                    </Button>
                  </BlockedAction>
                }
              />
            </DangerZone>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
