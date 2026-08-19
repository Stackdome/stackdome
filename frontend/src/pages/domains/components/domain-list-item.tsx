import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataListActions,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import { type DomainName } from "../schemas/api-schema";

/**
 * **No column headers.** The product supports exactly one domain today, and a
 * header row over a single row labels nothing. This is a list page by filing,
 * not by behaviour, so it takes the shared row language and stops there.
 */
const DOMAIN_TRACKS = "grid-cols-[minmax(0,1fr)_32px]";

/** Two rows at the real 64px pitch, so nothing moves when the data lands. */
export function DomainListSkeleton() {
  return (
    <DataListSkeleton
      columns={DOMAIN_TRACKS}
      rows={2}
      shape={[{ w: 184, h: 4 }, null]}
    />
  );
}

export default function DomainListItem({
  domain,
  index,
  onRemove,
}: {
  domain: Partial<DomainName>;
  index: number;
  onRemove: (index: number) => void;
}) {
  const fqdn = domain.fqdn ?? "";
  return (
    <DataListRow columns={DOMAIN_TRACKS}>
      {/* The domain IS the name — mono, because it is a machine address rather
          than a label somebody typed for readability. The globe glyph that used
          to sit beside it drew no distinction: every row is a domain. */}
      <DataListName name={fqdn || "No domain specified"} />
      <DataListActions>
        <Button
          variant="ghost"
          size="icon-sm"
          shape="flat"
          aria-label={`Remove ${fqdn}`}
          onClick={() => onRemove(index)}
        >
          <Trash2 />
        </Button>
      </DataListActions>
    </DataListRow>
  );
}
