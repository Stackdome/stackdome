import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  type DrawerStep,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertBanner, BlockedAction, FieldGrid, FieldShell, reasonList } from "@/components/branded";
import { PickerList, PickerRow, PickerRowTick } from "@/components/branded/picker-row";
import { useToast } from "@/components/ui/use-toast";
import { createRegistryCredential, type RegistryCredentialPurpose } from "@/api/registry-credentials";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { createRegistrySchema } from "../lib/form-schemas";
import {
  PURPOSE_BOTH, PURPOSE_LABELS, PURPOSE_PULL, PURPOSE_PUSH,
  REGISTRY_PROVIDERS, type RegistryProvider,
} from "../lib/providers";
import { ProviderLogo } from "./provider-logo";

interface AddRegistryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

type Step = "provider" | "credentials";

interface FieldErrors {
  host?: string;
  username?: string;
  password?: string;
}

/**
 * **A drawer, two phases** (§13 "Adding a thing").
 *
 * ```
 *   step 1  Add registry › Pick a registry   the catalogue, off the registry
 *   step 2  Add registry › GHCR              the credentials form
 * ```
 *
 * It shipped as a `Dialog size="form"` running the same two phases out of five
 * hand-rolled tiles, a `sr-only` title over a hand-rolled band, and the
 * product's last `WizardFooter` — the last `Back` button anywhere in it. All of
 * that is `DrawerHeader`, `PickerRow` and the path now.
 *
 * ### The phase count was argued, and `Connect git provider` settled it
 *
 * §13's phase test — *can you start without it?* — reads **yes** on this form
 * taken alone: every registry shows the same four fields, `Username` and
 * `Password` are answerable before anything is chosen, and the provider only
 * prefills `Host` and swaps one hint. It is not even in the record —
 * `RegistryCredential` is `{host, username, password, purpose}` and carries no
 * provider at all. On that reading it would be the object store's mode: a
 * `Registry` select above `Host`, one phase, no catalogue.
 *
 * **Jaseem's call, 16 Aug 2026, on the running screen:** *"for git integration
 * we have to select the service first, I think it has to be same here as
 * well."*
 *
 * These two are siblings — same page shape, same job, converted a day apart —
 * and a user who connects a git provider and then adds a registry meets both
 * within a minute of each other. **A rule applied per-screen that makes two
 * halves of one task behave differently is a rule mis-applied**: the phase test
 * asks what a form needs, and it cannot see the flow standing beside it.
 *
 * So `Add registry › GHCR` mirrors `Connect provider › GitHub`, down to the
 * catalogue rows and the crumb that returns to them.
 *
 * ### What that inherits from the sibling, deliberately
 *
 * | | |
 * |---|---|
 * | **Picking advances** | Step one has no primary and no footer — a row answers its only question (§13) |
 * | **The crumb is the way back** | There is no arrow; `Add registry` is live from step two |
 * | **The credentials clear on a change of registry** | A secret typed for one host must not survive the crumb → a different row and get POSTed elsewhere |
 * | **The description belongs to step one** | `Pick a registry` names the *thing*, so it earns a line the rows cannot say (§13) |
 */
export function AddRegistryDrawer({ open, onOpenChange, onCreated }: AddRegistryDrawerProps) {
  const { toast } = useToast();
  /**
   * The step and the pick are separate state. Stepping back must NOT forget
   * what you chose — the tick on the row you came from is the whole reason step
   * one still draws a selection (§13), and it is the only thing on that screen
   * that says where you have been.
   */
  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<RegistryProvider | null>(null);
  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [purpose, setPurpose] = useState<RegistryCredentialPurpose>(PURPOSE_BOTH);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("provider");
    setProvider(null);
    setHost("");
    setUsername("");
    setPassword("");
    setPurpose(PURPOSE_BOTH);
    setFieldErrors({});
    setError(null);
  }, [open]);

  const pickRegistry = (p: RegistryProvider) => {
    setProvider(p);
    setHost(p.hostPrefill);
    // Credentials are registry-specific: a secret typed for one must not
    // survive the crumb back and a different row, and get submitted elsewhere.
    setUsername("");
    setPassword("");
    setFieldErrors({});
    setError(null);
    setStep("credentials");
  };

  /**
   * Every empty field at once, phrased as the thing to DO about it (§9). The
   * primary used to be live on an empty form and report three required fields
   * only once it had been pressed.
   */
  const blockers = [
    host.trim() ? null : "Enter a host.",
    username.trim() ? null : "Enter a username.",
    password.trim() ? null : "Enter a password.",
  ].filter((r): r is string => r !== null);

  const submit = async () => {
    const parsed = createRegistrySchema.safeParse({ host, username, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({ host: flat.host?.[0], username: flat.username?.[0], password: flat.password?.[0] });
      return;
    }
    setFieldErrors({});
    setError(null);
    const orgId = getCurrentOrganizationId();
    if (!orgId) {
      setError("No organization is selected. Pick one from the account menu and try again.");
      return;
    }
    setSaving(true);
    try {
      await createRegistryCredential(orgId, { ...parsed.data, purpose });
      toast({
        title: "Registry added",
        description: `Builds will use this login for ${parsed.data.host}.`,
        variant: "success",
      });
      onOpenChange(false);
      onCreated();
    } catch (e) {
      // Backend returns 409 for a host+purpose duplicate. It is about the host,
      // so it goes 4px under the host box — not in the footer banner, which is
      // for failures no single field can answer.
      if (isAxiosError(e) && e.response?.status === 409) {
        setFieldErrors({ host: "Credentials for this registry and purpose already exist." });
      } else {
        setError(getErrorMessage(e));
      }
    } finally {
      setSaving(false);
    }
  };

  /**
   * §12a. `Add registry` is the way back now that the arrow is gone, and a
   * crumb pointing at the screen you are on would be a lie — so it is live on
   * step two and dead on step one.
   */
  const path: DrawerStep[] =
    step === "credentials" && provider
      ? [{ label: "Add registry", onClick: () => setStep("provider") }, provider.label]
      : ["Add registry", "Pick a registry"];

  return (
    <Drawer open={open} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))}>
      {/* 480, like every other add. `work` is earned by a rail and this has
          none — a second step does not buy 640 (§13). */}
      <DrawerContent size="form">
        <DrawerHeader
          steps={path}
          /* Step one only, and only because "Pick a registry" names the thing
             rather than the act — so there is still something to say that the
             rows cannot. One line: two costs the band 20px (§13). */
          description={
            step === "credentials" ? undefined : "Stackdome uses these to pull and push private images."
          }
        />

        {step === "provider" && (
          <DrawerBody>
            {/* **Picking advances, so there is no primary and no footer.** The
                tick still earns its place: it is what you see when the path's
                first crumb brings you back here. */}
            <PickerList aria-label="Image registries">
              {REGISTRY_PROVIDERS.map((p) => (
                <PickerRow
                  key={p.id}
                  icon={<ProviderLogo providerId={p.id} className="size-4" />}
                  name={p.label}
                  meta={[
                    p.hostPrefill
                      ? { text: p.hostPrefill, mono: true }
                      : { text: "A registry you host" },
                  ]}
                  selected={provider?.id === p.id}
                  trailing={provider?.id === p.id ? <PickerRowTick /> : null}
                  onClick={() => pickRegistry(p)}
                />
              ))}
            </PickerList>
          </DrawerBody>
        )}

        {step === "credentials" && provider && (
          <>
            <DrawerBody>
              <FieldShell label="Host" htmlFor="registry-host" required error={fieldErrors.host}>
                <Input
                  id="registry-host"
                  className="font-mono"
                  /* A specimen, not the label again (§6). */
                  placeholder={provider.hostPlaceholder}
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, host: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.host}
                />
              </FieldShell>

              {/* **A pair.** One credential in two boxes — secrets' exact case,
                  and the opposite of `Connect git provider`, where a token
                  *replaces* the username on four of five hosts and pairing them
                  would have been pairing by count (§8). */}
              <FieldGrid>
                <FieldShell
                  label="Username"
                  htmlFor="registry-username"
                  span={1}
                  required
                  error={fieldErrors.username}
                >
                  <Input
                    id="registry-username"
                    autoComplete="off"
                    placeholder="acme-ci"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }}
                    aria-invalid={!!fieldErrors.username}
                  />
                </FieldShell>
                <FieldShell
                  label="Password"
                  htmlFor="registry-password"
                  span={1}
                  required
                  /* Which credential THIS registry wants. */
                  hint={provider.hint}
                  error={fieldErrors.password}
                >
                  {/* No placeholder — a secret has no specimen (§6). */}
                  <Input
                    id="registry-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    aria-invalid={!!fieldErrors.password}
                  />
                </FieldShell>
              </FieldGrid>

              {/* **Required, and it always was.** It carried no `*` while
                  offering no blank option — §6 says the absence of the mark
                  *states* optional, so it claimed to be skippable while being
                  impossible to skip. Object stores' `Retention` is the
                  precedent: seeded with a sane value AND marked. */}
              <FieldShell label="Purpose" htmlFor="registry-purpose" required>
                <Select value={purpose} onValueChange={(v) => setPurpose(v as RegistryCredentialPurpose)}>
                  <SelectTrigger id="registry-purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PURPOSE_BOTH}>{PURPOSE_LABELS[PURPOSE_BOTH]}</SelectItem>
                    <SelectItem value={PURPOSE_PULL}>{PURPOSE_LABELS[PURPOSE_PULL]}</SelectItem>
                    <SelectItem value={PURPOSE_PUSH}>{PURPOSE_LABELS[PURPOSE_PUSH]}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
            </DrawerBody>

            <DrawerFooter>
              {/* In the footer band: inside a body that scrolls, a failure
                  scrolls away from the button that produced it. */}
              {error && <AlertBanner>{error}</AlertBanner>}
              {/* The primary alone. The path and the ✕ are the journey's exits,
                  so a `Cancel` here would be a third control for one act. */}
              <DrawerActions>
                <BlockedAction reason={saving ? null : reasonList(blockers)}>
                  <Button onClick={() => void submit()} loading={saving} loadingText="Adding…">
                    Add registry
                  </Button>
                </BlockedAction>
              </DrawerActions>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
