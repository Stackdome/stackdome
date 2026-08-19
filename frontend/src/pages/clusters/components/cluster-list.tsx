import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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
 */
const CLUSTER_TRACKS = "grid-cols-[minmax(0,1fr)_32px]";

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
        null,
      ]}
    />
  );
}

export function ClusterList({ clusters }: { clusters: Cluster[] }) {
  const navigate = useNavigate();

  return (
    <div>
      {clusters.map((cluster) => (
        <DataListRow
          key={cluster.id}
          columns={CLUSTER_TRACKS}
          label={`${cluster.name} cluster`}
          onActivate={() => navigate(`/clusters/${cluster.id}`)}
        >
          {/* The 40px bordered tile that used to sit here was a card inside a
              list, and its glyph drew no distinction: every row is a cluster. */}
          <DataListName name={cluster.name ?? ""} secondary={cluster.id} />
          {/* The chevron is the row's own affordance rather than an action, so
              it stays put instead of waiting for the pointer. */}
          <div className="flex justify-end">
            <ChevronRight className="size-4 text-fg-muted" aria-hidden />
          </div>
        </DataListRow>
      ))}
    </div>
  );
}
