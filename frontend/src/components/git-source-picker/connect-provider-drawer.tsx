import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";

import { AlertBanner, BlockedAction, FieldShell, reasonList } from "@/components/branded";
import { ProviderLogo } from "@/components/branded/provider-logo";
import { PickerList, PickerRow, PickerRowTick } from "@/components/branded/picker-row";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  type DrawerStep,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { createGitIntegration } from "@/api/git-integrations";
import { getErrorMessage } from "@/api/client";
import { getCurrentOrganizationId } from "@/lib/common";
import { useGithubConnect } from "@/hooks/use-github-connect";
import {
  GIT_INTEGRATION_TYPE_CREDENTIALS,
  GIT_PROVIDERS,
  type GitProvider,
} from "@/lib/git-integrations";
import { credentialsFormSchema, type CredentialsFormValues } from "./credentials-form-schema";

/**
 * **A drawer, two phases — three on the GitHub arm** (§13 "Adding a thing").
 *
 * §13 names this flow in its own words under *"Which container"*: it opens a
 * GitHub popup and **polls while you authorise in another window**, which is the
 * definition of leave-and-come-back. It was the last add in the product with an
 * argument for a drawer written into the rules and no drawer to show for it.
 *
 * ```
 *   step 1  Connect provider › Pick a provider   the catalogue, off the registry
 *   step 2  Connect provider › GitHub            App install or token — GitHub only
 *   step 2  Connect provider › GitLab            the form, for the other four
 *   step 3  Connect provider › GitHub › Access token
 * ```
 *
 * ### Five phases became three, and nothing was deleted
 *
 * The dialog ran `provider → github → credentials → connecting → done`. §13's
 * test is **a step exists if it asks a question**, and two of those five ask
 * none:
 *
 * | Was | Now |
 * |---|---|
 * | `provider` | Step one. The catalogue |
 * | `github` | Step two, **on the GitHub arm only** — App install or token is a real question, and only one of the five providers is ever asked it |
 * | `credentials` | The form. Step two for four providers, step three for GitHub-by-token |
 * | `connecting` | **A state, not a step.** It replaces the GitHub step's body in place while the popup is open — it is the wait that makes this a drawer, so it stays visible, but it asks nothing and the path does not grow a segment for it |
 *
 * ### The wait reports what we know, which is one thing
 *
 * It shipped as a three-line checklist — *opening authorization*, *authorizing*,
 * *fetching repositories* — with a mark per line. `useGithubConnect` has two
 * states, `waiting` and `connected`, so none of those stages was observed: the
 * middle line was lit by an `i === 1` literal and all three flipped at once.
 * **A progress readout that invents its own granularity is a decoration**, and
 * this one cost three `Checkbox`es that looked operable and were not.
 *
 * What is left is the only instruction there is — finish it in the popup — and
 * the manual probe. §13's *"a completed step is a ticked `Checkbox`"* is about a
 * journey's **step pip**; it does not reach a background process.
 * | `done` | **A toast.** Every other add in the product closes and reports; a receipt screen with its own `Done` button made this the only one that did not |
 *
 * **The GitHub arm is a third step rather than a mode field.** Both precedents
 * were live: the repository journey grows a step on one branch only, and the
 * object store's provider is a mode *among* the fields. The object-store test —
 * *"can you start without it?"* — settles it. On the App branch there is no form
 * to start: no host, no username, no token. A mode rewrites the fields under it;
 * this one removes all of them, and the two arms POST different objects
 * (`github_app` vs `git_credentials`).
 */
interface ConnectProviderDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Blocks the GitHub App row with an "already connected" reason. */
  hasGithubApp: boolean;
  /** Fired after a successful create — credentials POST or GitHub App connect. */
  onCreated: () => void;
}

type Step = "provider" | "github" | "credentials";
type Method = "app" | "token";

export function ConnectProviderDrawer({
  open,
  onOpenChange,
  hasGithubApp,
  onCreated,
}: ConnectProviderDrawerProps) {
  const github = useGithubConnect();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<GitProvider | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  // The wait is a state of the GitHub step, so it is a flag rather than a step.
  // It is set on the click rather than read off `github.state`, which only
  // turns `waiting` once the manifest POST resolves — the body must change on
  // the press, not a network round-trip later.
  const [installing, setInstalling] = useState(false);

  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CredentialsFormValues, string>>>({});

  const reset = () => {
    setStep("provider");
    setProvider(null);
    setMethod(null);
    setInstalling(false);
    setHost("");
    setUsername("");
    setToken("");
    setSubmitError(null);
    setSubmitting(false);
    setFieldErrors({});
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  const pickProvider = (p: GitProvider) => {
    setProvider(p);
    setMethod(null);
    setInstalling(false);
    // A typed token must never survive a change of host.
    setHost(p.hostPrefill);
    setUsername("");
    setToken("");
    setSubmitError(null);
    setFieldErrors({});
    setStep(p.hasApp ? "github" : "credentials");
  };

  const useToken = () => {
    setMethod("token");
    setInstalling(false);
    setHost(provider?.hostPrefill ?? "");
    setSubmitError(null);
    setStep("credentials");
  };

  const installApp = () => {
    setMethod("app");
    setInstalling(true);
    void github.connect();
  };

  const submitCredentials = async () => {
    const parsed = credentialsFormSchema.safeParse({ host, username, token });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({ host: flat.host?.[0], token: flat.token?.[0] });
      return;
    }
    setFieldErrors({});
    const orgId = getCurrentOrganizationId();
    if (!orgId) {
      setSubmitError("No organization is selected. Pick one from the account menu and try again.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const trimmedUsername = parsed.data.username?.trim();
      await createGitIntegration(orgId, {
        host: parsed.data.host,
        type: GIT_INTEGRATION_TYPE_CREDENTIALS,
        auth: trimmedUsername
          ? { basic: { username: trimmedUsername, password: parsed.data.token } }
          : { token: parsed.data.token },
      });
      onCreated();
      toast({
        title: `${provider?.name ?? "Provider"} connected`,
        description: `Stackdome can clone repositories on ${parsed.data.host} using your access token.`,
        variant: "success",
      });
      close();
    } catch (e) {
      setSubmitError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  // The connect can land after the drawer was closed — the popup keeps going in
  // its own window — so the parent's refresh must fire either way. Only the
  // toast and the close are gated on still being open.
  useEffect(() => {
    if (github.state !== "connected") return;
    onCreated();
    if (!open) return;
    toast({
      title: "GitHub App installed",
      description: "Webhooks will keep preview environments in sync.",
      variant: "success",
    });
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [github.state]);

  const onGithubStep = step === "github";
  const waiting = onGithubStep && installing;

  /**
   * §12a. `Connect provider` is the way back now that the arrow is gone, and a
   * crumb pointing at the screen you are on would be a lie — so it is live from
   * step two onward and dead on step one.
   */
  const path: DrawerStep[] = (() => {
    const task = { label: "Connect provider", onClick: () => setStep("provider") };
    if (step === "provider") return ["Connect provider", "Pick a provider"];
    if (onGithubStep) return [task, "GitHub"];
    if (provider?.hasApp) {
      return [task, { label: "GitHub", onClick: () => setStep("github") }, "Access token"];
    }
    return [task, provider?.name ?? "Connect"];
  })();

  /**
   * Every reason phrased here, in the verb of THIS act (§9). `reasonList`
   * supplies no words of its own.
   */
  const blockers = [
    host.trim() ? null : "Enter a host.",
    provider?.basicAuth && !username.trim() ? "Enter your username." : null,
    token.trim() ? null : "Enter an access token.",
  ].filter((r): r is string => r !== null);

  return (
    <Drawer open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      {/* 480, like every other add. `work` is earned by a rail and this has
          none — a second step does not buy 640 (§13). */}
      <DrawerContent size="form">
        <DrawerHeader
          steps={path}
          /* Step one only, and only because "Pick a provider" names the thing
             rather than the act — so there is still something to say that the
             rows cannot. One line: two costs the band 20px (§13). */
          description={
            step === "provider" ? "Stackdome clones your repositories and builds from them." : undefined
          }
        />

        {step === "provider" && (
          <DrawerBody>
            {/* **Picking advances, so there is no primary and no footer.** The
                tick still earns its place: it is what you see when the path's
                first crumb brings you back here. */}
            <PickerList aria-label="Git providers">
              {GIT_PROVIDERS.map((p) => (
                <PickerRow
                  key={p.id}
                  icon={<ProviderLogo providerId={p.id} className="size-4" />}
                  name={p.name}
                  meta={[{ text: p.summary }]}
                  selected={provider?.id === p.id}
                  trailing={provider?.id === p.id ? <PickerRowTick /> : null}
                  onClick={() => pickProvider(p)}
                />
              ))}
            </PickerList>
          </DrawerBody>
        )}

        {onGithubStep && (
          <DrawerBody>
            {waiting ? (
              <>
                {/* **At the top of the body, not in the footer band.** §13 puts
                    the error slot in the footer because a form's failure must
                    not scroll away from the button that produced it — and that
                    reasoning is about a *form*, where the button is the footer.
                    Nothing is being committed here: the failure is about the
                    whole screen, and below the progress it contradicts it read
                    as a footnote to a list that was still claiming to work. */}
                {github.error && (
                  <AlertBanner action={{ label: "Try again", onClick: () => void github.connect() }}>
                    <p>Couldn&apos;t connect to GitHub</p>
                    <p className="text-fg-2 font-normal">{github.error}</p>
                  </AlertBanner>
                )}

                {!github.error && (
                  <div className="flex flex-col gap-1">
                    <p className="text-body text-foreground">Installing the GitHub App</p>
                    <p className="text-meta text-fg-2">
                      Finish the installation in the GitHub popup. We&apos;ll pick it up here.
                    </p>
                  </div>
                )}

                {/* The manual probe. It steps aside when the failure banner
                    offers the same act — one control per act. */}
                {!github.error && (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void github.checkAgain()}
                    >
                      Check again
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <PickerList aria-label="How to connect GitHub">
                <PickerRow
                  /* The brand mark, not lucide's `Github` glyph — the step
                     before this one draws GitHub with `ProviderLogo`, and two
                     different GitHub marks one click apart read as two things
                     (§7). The distinction these rows carry is App vs token, and
                     the key glyph is what makes it. */
                  icon={<ProviderLogo providerId="github" className="size-4" />}
                  name="Install GitHub App"
                  meta={[{ text: "Fine-grained access you manage on GitHub" }]}
                  endText="Recommended"
                  selected={method === "app"}
                  trailing={method === "app" ? <PickerRowTick /> : null}
                  /* **Passing the reason IS what disables the row** (§9). It
                     used to grey with `disabled:opacity-60` and bury the
                     explanation in its own body copy. */
                  reason={
                    hasGithubApp
                      ? "Already connected. Manage installations from the integration card."
                      : undefined
                  }
                  onClick={installApp}
                />
                <PickerRow
                  icon={<KeyRound aria-hidden />}
                  name="Use an access token"
                  meta={[{ text: "A token you paste here and rotate yourself" }]}
                  selected={method === "token"}
                  trailing={method === "token" ? <PickerRowTick /> : null}
                  onClick={useToken}
                />
              </PickerList>
            )}
          </DrawerBody>
        )}

        {step === "credentials" && provider && (
          <>
            <DrawerBody>
              {/* **No pairs on this form.** `Username ǀ Access token` looks like
                  the secret drawer's one pair and is not: a token *replaces* the
                  username on four of the five hosts rather than completing it.
                  Pairing them would be pairing by count (§8). */}
              <FieldShell label="Host" htmlFor="integration-host" required error={fieldErrors.host}>
                <Input
                  id="integration-host"
                  className="font-mono"
                  placeholder={provider.hostPlaceholder}
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, host: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.host}
                />
              </FieldShell>

              {/* It said optional and required at once — no `*`, over a hint
                  reading *"Required for providers using basic auth"*. It is
                  required exactly where basic auth is the mechanism, and the
                  registry is what knows that (§6). */}
              <FieldShell
                label="Username"
                htmlFor="integration-username"
                required={provider.basicAuth}
                hint={
                  provider.basicAuth
                    ? "App passwords authenticate as a user, so this one needs your username."
                    : "Only for hosts that authenticate with a username and password."
                }
              >
                <Input
                  id="integration-username"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </FieldShell>

              <FieldShell
                label="Access token"
                htmlFor="integration-token"
                required
                hint={provider.tokenHint}
                error={fieldErrors.token}
              >
                <Input
                  id="integration-token"
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, token: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.token}
                />
              </FieldShell>
            </DrawerBody>

            <DrawerFooter>
              {submitError && (
                <AlertBanner>
                  <p>Couldn&apos;t connect {provider.name}</p>
                  <p className="text-fg-2 font-normal">{submitError}</p>
                </AlertBanner>
              )}
              {/* The primary alone. The path and the ✕ are the journey's exits,
                  so a `Cancel` here would be a third control for one act. */}
              <DrawerActions>
                <BlockedAction reason={submitting ? null : reasonList(blockers)}>
                  <Button
                    onClick={() => void submitCredentials()}
                    loading={submitting}
                    loadingText="Connecting…"
                  >
                    Connect
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
