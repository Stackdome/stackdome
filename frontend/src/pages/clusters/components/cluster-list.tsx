import {
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import type { Cluster } from "../types";

/**
 * **No column headers.** The product supports exactly one cluster today, and a
 * header row over a single row labels nothing — it is chrome asserting a
 * comparison the page cannot make. This is a list page by filing, not by
 * behaviour, so it takes the row language and stops there.
 *
 * Everything else is the shared row: 64px, no rule, hover wash, inset focus
 * ring. The moment multi-cluster ships, this page gets headers and joins the
 * other six properly.
 *
 * **One track, because the row has no actions.** It had a trailing 32 holding a
 * chevron, which said the row NAVIGATES; it opens the cluster's drawer over the
 * list instead, and a right-pointing arrow on a row that goes nowhere is a
 * promise the page does not keep. Removing an action means removing its track —
 * a 32px column with nothing in it still pushes the name 20px off the edge.
 */
const CLUSTER_TRACKS = "grid-cols-[minmax(0,1fr)]";

/** Two rows at the real 64px pitch, so nothing moves when the data lands. */
export function ClusterListSkeleton() {
  return (
    <DataListSkeleton
      columns={CLUSTER_TRACKS}
      rows={2}
      shape={[
        [
          { w: 168, h: 4 },
          { w: 232, h: 3 },
        ],
      ]}
    />
  );
}

export function ClusterList({
  clusters,
  onOpen,
}: {
  clusters: Cluster[];
  /** The row's one act: open this cluster's details drawer. */
  onOpen: (cluster: Cluster) => void;
}) {
  return (
    <div>
      {clusters.map((cluster) => (
        <DataListRow
          key={cluster.id}
          columns={CLUSTER_TRACKS}
          label={`${cluster.name} cluster`}
          onActivate={() => onOpen(cluster)}
        >
          {/* The 40px bordered tile that used to sit here was a card inside a
              list, and its glyph drew no distinction: every row is a cluster. */}
          <DataListName name={cluster.name ?? ""} secondary={cluster.id} />
        </DataListRow>
      ))}
    </div>
  );
}
