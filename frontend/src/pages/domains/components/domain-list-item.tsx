import {
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import { type DomainName } from "../schemas/api-schema";

/**
 * **No column headers.** The product supports exactly one domain today, and a
 * header row over a single row labels nothing. This is a list page by filing,
 * not by behaviour, so it takes the shared row language and stops there.
 *
 * **One track, because the row has no actions.** It had a trailing 32 holding a
 * trash can — so the only thing you could do to a domain was destroy it,
 * revealed on hover, with its cost written nowhere. The row opens the domain's
 * drawer and the destruction lives at the foot of it (§10). Removing an action
 * means removing its track: a 32px column with nothing in it still pushes the
 * name 20px off the edge.
 */
const DOMAIN_TRACKS = "grid-cols-[minmax(0,1fr)]";

/** Two rows at the real 64px pitch, so nothing moves when the data lands. */
export function DomainListSkeleton() {
  return (
    <DataListSkeleton
      columns={DOMAIN_TRACKS}
      rows={2}
      shape={[{ w: 184, h: 4 }]}
    />
  );
}

export default function DomainListItem({
  domain,
  onOpen,
}: {
  domain: Partial<DomainName>;
  /** The row's one act: open this domain's details drawer. */
  onOpen: (domain: Partial<DomainName>) => void;
}) {
  const fqdn = domain.fqdn ?? "";
  return (
    <DataListRow
      columns={DOMAIN_TRACKS}
      label={`${fqdn || "Unnamed"} domain`}
      onActivate={() => onOpen(domain)}
    >
      {/* The domain IS the name. The globe glyph that used to sit beside it drew
          no distinction: every row is a domain. */}
      <DataListName name={fqdn || "No domain specified"} />
    </DataListRow>
  );
}
