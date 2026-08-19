import type { RegistryCredential } from "@/api/registry-credentials";
import {
  DataListActions,
  DataListCell,
  DataListHeader,
  DataListName,
  DataListRow,
  DataListSkeleton,
} from "@/components/branded/data-list";
import { providerIdForHost, PURPOSE_LABELS, PURPOSE_BOTH, registryProvider } from "../lib/providers";
import { RowMenu } from "./row-menu";

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
const REGISTRY_TRACKS = "grid-cols-[minmax(240px,420px)_minmax(0,1fr)_130px_32px]";

const LABELS = ["Registry", "Username", "Purpose", ""];

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
          null,
        ]}
      />
    </div>
  );
}

export function RegistryRow({
  credential,
  onVerify,
  onUpdateCredentials,
  onRemove,
}: {
  credential: RegistryCredential;
  onVerify: (credential: RegistryCredential) => void;
  onUpdateCredentials: (credential: RegistryCredential) => void;
  onRemove: (credential: RegistryCredential) => void;
}) {
  const providerLabel = registryProvider(providerIdForHost(credential.host)).label;

  return (
    <DataListRow columns={REGISTRY_TRACKS}>
      {/* The provider you recognise, over the host it actually points at. */}
      <DataListName name={providerLabel} secondary={credential.host} />
      <DataListCell mono>{credential.username}</DataListCell>
      <DataListCell>{PURPOSE_LABELS[credential.purpose ?? PURPOSE_BOTH]}</DataListCell>
      <DataListActions>
        <RowMenu
          label={providerLabel}
          onVerify={() => onVerify(credential)}
          onUpdateCredentials={() => onUpdateCredentials(credential)}
          onRemove={() => onRemove(credential)}
        />
      </DataListActions>
    </DataListRow>
  );
}
