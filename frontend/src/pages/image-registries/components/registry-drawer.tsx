import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertBanner,
  BlockedAction,
  DangerZone,
  DangerZoneRow,
  FieldShell,
  reasonList,
} from "@/components/branded";
import { useToast } from "@/components/ui/use-toast";
import { updateRegistryCredential, type RegistryCredential } from "@/api/registry-credentials";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { rotateRegistrySchema } from "../lib/form-schemas";
import { providerIdForHost, registryProvider, PURPOSE_LABELS, PURPOSE_BOTH } from "../lib/providers";
import { ProviderLogo } from "./provider-logo";

/**
 * **One registry, and everything you can do to it.**
 *
 * It replaces `UpdateCredentialsDialog`, which was reached from a kebab on the
 * row alongside `Verify registry access` and `Remove` — three acts on one object
 * behind a menu that had to be opened before you could see any of them.
 *
 * §13's test settles the container: a dialog is a decision with one or two
 * boxes and no way past without answering; this is **one object you return
 * from** — you check the host, rotate the login, verify it took, and only then
 * decide whether the registry stays. That is a drawer.
 *
 * ### Straight to edit, not details-then-edit
 *
 * A registry credential is a host, a login and a purpose. All three are
 * settings, so a read-first drawer would be a copy of this form with the
 * inputs turned off — a step that exists to be clicked past.
 *
 * ### `Verify` is on the band; `Remove` is in the danger zone
 *
 * Verifying costs nothing and is the thing you do right after typing a
 * password, so it rides the header the way `Sync` does on a preview. Removing
 * takes every stack that pulls from this host with it — a cost that lands on
 * OTHER objects, which is §10's test for the danger zone.
 */
export function RegistryDrawer({
  credential,
  onOpenChange,
  onUpdated,
  onVerify,
  onRemove,
  removing = false,
}: {
  /** `null` closes it. Driven by which row was clicked, so there is no second
   *  `open` prop to keep in step with it. */
  credential: RegistryCredential | null;
  onOpenChange: (open: boolean) => void;
  /** Fired after a successful rotation so the page can refresh the list. */
  onUpdated: () => void;
  onVerify: (credential: RegistryCredential) => void;
  onRemove: (credential: RegistryCredential) => void;
  removing?: boolean;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);

  const credentialId = credential?.id;
  useEffect(() => {
    if (credentialId == null) return;
    // Username is readable and prefilled; password is write-only, never prefilled.
    setUsername(credential?.username ?? "");
    setPassword("");
    setFieldErrors({});
    setError(null);
    // Keyed on id, not the object: a refetched credential must not wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialId]);

  const submit = async () => {
    const parsed = rotateRegistrySchema.safeParse({ username, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({ username: flat.username?.[0], password: flat.password?.[0] });
      return;
    }
    setFieldErrors({});
    setError(null);
    const orgId = getCurrentOrganizationId();
    if (!orgId || !credential?.id) {
      setError(
        !orgId
          ? "No organization is selected. Pick one from the account menu and try again."
          : "This registry is no longer available. Close this and reload the list.",
      );
      return;
    }
    setSaving(true);
    try {
      await updateRegistryCredential(orgId, credential.id, {
        host: credential.host,
        purpose: credential.purpose,
        username: parsed.data.username,
        password: parsed.data.password,
      });
      toast({ title: "Credentials updated", variant: "success" });
      onOpenChange(false);
      onUpdated();
    } catch (e) {
      // Kept on the surface: the rejected login is still on screen to correct.
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!credential) return null;

  const providerId = providerIdForHost(credential.host);
  const providerLabel = registryProvider(providerId).label;

  /** The primary says the ACT, in the verb of the act (§9) — and it refuses
   *  before the click rather than after it. */
  const missing = () => {
    const out: string[] = [];
    if (!username.trim()) out.push("Enter the username");
    if (!password) out.push("Enter the password");
    return out;
  };

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        {/* The provider is the name you recognise; the host is the machine
            string that says which one (§6). Same name-then-meta pair the row
            carries. */}
        <DrawerHeader
          leading={<ProviderLogo providerId={providerId} className="size-4" />}
          title={providerLabel}
          description={<span className="font-mono">{credential.host}</span>}
          trailing={
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onVerify(credential)}
                >
                  <ShieldCheck aria-hidden />
                  <span className="sr-only">Verify registry access</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Verify registry access</TooltipContent>
            </Tooltip>
          }
        />

        <DrawerBody>
          {/* **A value, not a field** (§9). Purpose and host are fixed once the
              registry exists — the API keys on the host — so they report rather
              than pretending to be editable. */}
          <FieldShell label="Purpose">
            <div className="flex h-8 items-center rounded-md bg-control px-3 text-body text-fg-2">
              {PURPOSE_LABELS[credential.purpose ?? PURPOSE_BOTH]}
            </div>
          </FieldShell>

          <FieldShell label="Username" htmlFor="registry-username" required error={fieldErrors.username}>
            <Input
              id="registry-username"
              autoComplete="off"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setFieldErrors((prev) => ({ ...prev, username: undefined }));
              }}
              aria-invalid={!!fieldErrors.username}
            />
          </FieldShell>

          {/* Write-only, so it is never prefilled — there is nothing to show,
              and a masked placeholder would claim there was. */}
          <FieldShell
            label="Password"
            htmlFor="registry-password"
            required
            help="Builds pick up a new login on their next run; the ones already going keep the old one."
            error={fieldErrors.password}
          >
            <Input
              id="registry-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                setError(null);
              }}
              aria-invalid={!!fieldErrors.password}
            />
          </FieldShell>

          <DangerZone className="mt-1">
            <DangerZoneRow
              title="Remove this registry"
              description="Stacks pulling from this host stop building."
              action={
                <Button
                  variant="destructive-ghost"
                  shape="flat"
                  disabled={removing}
                  onClick={() => onRemove(credential)}
                >
                  {removing && <Loader2 className="animate-spin" />}
                  Remove registry
                </Button>
              }
            />
          </DangerZone>
        </DrawerBody>

        <DrawerFooter>
          {/* In the footer band, not the body. Inside a band that scrolls, a
              failure scrolls away from the button that produced it. */}
          {error && <AlertBanner>{error}</AlertBanner>}
          <DrawerActions>
            <BlockedAction reason={saving ? null : reasonList(missing())}>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Update credentials
              </Button>
            </BlockedAction>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
