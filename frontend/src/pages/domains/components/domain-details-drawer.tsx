import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  DangerZone,
  DangerZoneRow,
  DetailList,
  DetailRow,
} from "@/components/branded";
import { copyText } from "@/lib/clipboard";
import { useToast } from "@/components/ui/use-toast";
import { type DomainName } from "../schemas/api-schema";

/**
 * **One domain, in full.**
 *
 * The row used to carry a trash can and nothing else, so the only thing you
 * could do to a domain was destroy it — and the one question anyone actually
 * has about a domain, *"what will my stacks be reachable at"*, had no home at
 * all. The row opens this instead, and the destruction moves to the foot of it
 * where its cost is written down (§10).
 *
 * **The same three bands and the same body idiom as the cluster and addon
 * drawers** — a label and its value on the 32 rung, one pitch down, no footer.
 * A drawer that only READS an object has nothing to commit.
 *
 * ### The fqdn is the title, so it is not also a row
 *
 * What the body carries is what the fqdn does not say by itself: the shape of
 * the address a deployed stack gets, and the wildcard record that has to exist
 * for either of them to resolve. The second is the one machine string the
 * drawer hands you, so it is the one that carries `Copy`.
 */
export function DomainDetailsDrawer({
  domain,
  onOpenChange,
  onRemove,
}: {
  /** `null` closes it. The drawer is driven by which row was clicked, so there
   *  is no second `open` prop to keep in step with it. */
  domain: Partial<DomainName> | null;
  onOpenChange: (open: boolean) => void;
  onRemove: (domain: Partial<DomainName>) => void;
}) {
  const { toast } = useToast();
  if (!domain) return null;

  const fqdn = domain.fqdn ?? "";
  const wildcard = fqdn ? `*.${fqdn}` : "";

  const copy = async () => {
    await copyText(wildcard);
    toast({ title: "DNS record copied", variant: "success" });
  };

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        <DrawerHeader title={fqdn || "No domain specified"} />

        <DrawerBody>
          <DetailList>
            {/* `pkg/services/exposed_port_domain.go` builds every exposed port's
                address as `<prefix>.<org domain>`, so this is the real shape
                and not an illustration of one. */}
            <DetailRow label="Stack addresses">
              {fqdn ? (
                <span className="min-w-0 truncate font-mono text-meta">
                  {`<stack>.${fqdn}`}
                </span>
              ) : undefined}
            </DetailRow>
            <DetailRow label="DNS record">
              {wildcard ? (
                <>
                  <span
                    className="min-w-0 truncate font-mono text-meta"
                    title={wildcard}
                  >
                    {wildcard}
                  </span>
                  {/* `outline` — the board's `secondary`. It is the one control
                      in the body, and a ghost among a column of plain text
                      reads as absent until you hover it. */}
                  <Button
                    variant="outline"
                    shape="flat"
                    className="ml-auto flex-none"
                    onClick={() => void copy()}
                  >
                    Copy
                  </Button>
                </>
              ) : undefined}
            </DetailRow>
          </DetailList>

          {/* **Removing a domain lands on every stack served on it**, so the
              trigger is the danger zone rather than a glyph on a row (§10) — at
              the FOOT of the body, after everything you would read before
              deciding. */}
          <DangerZone className="mt-1">
            <DangerZoneRow
              title="Remove this domain"
              description="Every stack served here loses its address as soon as DNS catches up."
              action={
                <Button
                  variant="destructive-ghost"
                  shape="flat"
                  onClick={() => onRemove(domain)}
                >
                  Remove domain
                </Button>
              }
            />
          </DangerZone>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
