import type { RegistryCredential } from "@/api/registry-credentials";
import {
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import { providerIdForHost, PURPOSE_LABELS, PURPOSE_BOTH, registryProvider } from "../lib/providers";

/**
 * The Stacks list's track shape: the name is capped, one track takes the slack,
 * the rest are pinned. `Username` is the flexible one — it is the value that
 * runs long, and a service-account name that truncates is a value you cannot
 * check.
 *
 * The 220px name column and the 40px bordered provider tile are both gone. The
 * tile was a card inside a list, and the logo drew no distinction the provider
 * name did not already make one line above the host.
 */
/**
 * **Three tracks.** The fourth was a 32px slot for a kebab holding `Verify
 * registry access`, `Update credentials` and `Remove` — three acts on one
 * object behind a menu you had to open before you could see any of them.
 *
 * The row opens the registry's own drawer, which holds all three: verify on the
 * band, the login in the body, remove in the danger zone.
 */
const REGISTRY_TRACKS = "grid-cols-[minmax(240px,420px)_minmax(0,1fr)_130px]";

const LABELS = ["Registry", "Username", "Purpose"];

export function RegistryListHeader() {
  return <DataListHeader columns={REGISTRY_TRACKS} labels={LABELS} />;
}

/**
 * The real column headers, then six rows at the real 64px pitch — so the only
 * thing that changes when the data lands is the text.
 */
export function RegistryListSkeleton() {
  return (
    <div>
      <RegistryListHeader />
      <DataListSkeleton
        columns={REGISTRY_TRACKS}
        shape={[
          [
            { w: 120, h: 4 },
            { w: 176, h: 3 },
          ],
          { w: 136, h: 3 },
          { w: 72, h: 3 },
        ]}
      />
    </div>
  );
}

export function RegistryRow({
  credential,
  onOpen,
}: {
  credential: RegistryCredential;
  /** The row opens the registry's drawer. A credential is a host, a login and
   *  a purpose — all settings — so there is no read-first step in front of it. */
  onOpen: (credential: RegistryCredential) => void;
}) {
  const providerLabel = registryProvider(providerIdForHost(credential.host)).label;

  return (
    <DataListRow
      columns={REGISTRY_TRACKS}
      label={`${providerLabel} registry`}
      onActivate={() => onOpen(credential)}
    >
      {/* The provider you recognise, over the host it actually points at. */}
      <DataListName name={providerLabel} secondary={credential.host} />
      <DataListCell mono>{credential.username}</DataListCell>
      <DataListCell>{PURPOSE_LABELS[credential.purpose ?? PURPOSE_BOTH]}</DataListCell>
    </DataListRow>
  );
}
