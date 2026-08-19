import { Pencil, Trash2 } from "lucide-react";
import {
  DataListActions,
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import { Button } from "@/components/ui/button";
import type { ObjectStore } from "../types";

/**
 * The Stacks list's track shape: **the name is capped, one track takes the
 * slack, the rest are pinned.**
 *
 * `Destination path` is the flexible one here rather than `Status`, because this
 * page has no status and the path is the value that actually runs long — extra
 * width buys a bucket URL that finishes instead of one that truncates.
 */
const STORE_TRACKS =
  "grid-cols-[minmax(240px,420px)_110px_minmax(0,1fr)_120px_64px]";

const LABELS = ["Name", "Provider", "Destination path", "Retention", ""];

function providerLabel(store: ObjectStore): string {
  const cfg = store.spec.configuration;
  if (cfg.s3_credentials) {
    return cfg.s3_credentials.endpoint_url ? "S3-compatible" : "S3";
  }
  if (cfg.azure_credentials) return "Azure";
  if (cfg.gcs_credentials) return "GCS";
  return "—";
}

/** The endpoint or the region — whichever the store actually has. It is the
 *  name's machine string, so it goes on the second line rather than taking a
 *  track of its own. */
function endpointLabel(store: ObjectStore): string | null {
  const cfg = store.spec.configuration;
  return cfg.s3_credentials?.endpoint_url ?? cfg.s3_credentials?.region ?? null;
}

export function ObjectStoreListHeader() {
  return <DataListHeader columns={STORE_TRACKS} labels={LABELS} />;
}

/**
 * The real column headers, then six rows at the real 64px pitch — so the only
 * thing that changes when the data lands is the text.
 */
export function ObjectStoreListSkeleton() {
  return (
    <div>
      <ObjectStoreListHeader />
      <DataListSkeleton
        columns={STORE_TRACKS}
        shape={[
          [
            { w: 152, h: 4 },
            { w: 112, h: 3 },
          ],
          { w: 64, h: 3 },
          { w: 208, h: 3 },
          { w: 48, h: 3 },
          null,
        ]}
      />
    </div>
  );
}

export function ObjectStoreList({
  objectStores,
  onEdit,
  onDelete,
  canWrite,
}: {
  objectStores: ObjectStore[];
  onEdit: (store: ObjectStore) => void;
  onDelete: (store: ObjectStore) => void;
  canWrite?: (projectId?: string) => boolean;
}) {
  return (
    <div>
      <ObjectStoreListHeader />
      {objectStores.map((store) => {
        const rowCanWrite = canWrite ? canWrite(store.project_id) : true;
        return (
          <DataListRow key={store.id} columns={STORE_TRACKS}>
            <DataListName name={store.name ?? ""} secondary={endpointLabel(store)} />
            <DataListCell>{providerLabel(store)}</DataListCell>
            <DataListCell mono title={store.spec.destination_path}>
              {store.spec.destination_path}
            </DataListCell>
            <DataListCell numeric>{store.spec.retention_policy}</DataListCell>
            <DataListActions>
              {rowCanWrite && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    shape="flat"
                    aria-label={`Edit ${store.name}`}
                    onClick={() => onEdit(store)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    shape="flat"
                    aria-label={`Delete ${store.name}`}
                    onClick={() => onDelete(store)}
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            </DataListActions>
          </DataListRow>
        );
      })}
    </div>
  );
}
