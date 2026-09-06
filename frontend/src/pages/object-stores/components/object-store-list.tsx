import {
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import type { ObjectStore } from "../types";

/**
 * The Stacks list's track shape: **the name is capped, one track takes the
 * slack, the rest are pinned.**
 *
 * `Destination path` is the flexible one here rather than `Status`, because this
 * page has no status and the path is the value that actually runs long — extra
 * width buys a bucket URL that finishes instead of one that truncates.
 */
/**
 * **Four tracks.** The fifth was a 64px slot for a hover-revealed `Edit` and
 * `Delete`.
 *
 * A store is a destination and a set of credentials — every field on it is a
 * setting, so **the row opens the form**, which is what `Edit` was for.
 * `Delete` moves into that form's danger zone: an addon's backups stop landing
 * and its restores stop resolving, which is a cost that lands on other objects
 * (§10) and does not belong under a pointer on a row you were scanning.
 */
const STORE_TRACKS = "grid-cols-[minmax(240px,420px)_110px_minmax(0,1fr)_120px]";

const LABELS = ["Name", "Provider", "Destination path", "Retention"];

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
        ]}
      />
    </div>
  );
}

export function ObjectStoreList({
  objectStores,
  onOpen,
}: {
  objectStores: ObjectStore[];
  /** The row opens the form. A store is entirely settings, so there is no
   *  read-first step to put in front of it — see the tracks above. */
  onOpen: (store: ObjectStore) => void;
}) {
  return (
    <div>
      <ObjectStoreListHeader />
      {objectStores.map((store) => {
        return (
          <DataListRow
            key={store.id}
            columns={STORE_TRACKS}
            label={`${store.name} object store`}
            onActivate={() => onOpen(store)}
          >
            <DataListName name={store.name ?? ""} secondary={endpointLabel(store)} />
            <DataListCell>{providerLabel(store)}</DataListCell>
            <DataListCell mono title={store.spec.destination_path}>
              {store.spec.destination_path}
            </DataListCell>
            <DataListCell numeric>{store.spec.retention_policy}</DataListCell>
          </DataListRow>
        );
      })}
    </div>
  );
}
