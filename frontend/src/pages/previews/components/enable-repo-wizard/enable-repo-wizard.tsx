import { useState } from "react";
import {
  Drawer,
  DrawerActions,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { BlockedAction } from "@/components/branded";
import { GitSourcePicker } from "@/components/git-source-picker/git-source-picker";
import type { PickedRepo } from "@/components/git-source-picker/types";
import { ConfigurePhase } from "./configure-phase";

// Canonical home of PickedRepo moved to the shared picker; re-exported here so
// existing importers (configure-phase, page tests) keep working.
export type { PickedRepo } from "@/components/git-source-picker/types";

type Phase = "pick" | "configure";

// One sentence, not two clipped ones. Says what is lost and what still works,
// in that order, because the second half is what stops it reading as a refusal.
const PR_AUTOMATION_HINT =
  "Pull-request automation needs a connected provider — a public URL supports environments you create by hand.";

interface EnableRepoWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created config's id after a successful create. */
  onCreated: (configId: string) => void;
}

/**
 * **Enable repository** — a `work` drawer (640), moved off the dialog.
 *
 * ### Why this one survives two phases when create-stack did not
 *
 * The create-stack drawer was killed for exactly this shape, so the difference
 * matters. There, phase 1 was five peers being **compared** — and comparing
 * means holding several things true at once, which one column cannot do. Here
 * phase 1 is a **search for one repository**: you are looking for a single
 * thing, and once you have it there is nothing left to compare it against.
 * A sequence is not a comparison, and only the comparison needed the width.
 *
 * ### What the dialog was doing wrong
 *
 * It was a `work` dialog (760) with `p-0`, its own hand-rolled header bar and a
 * hard-coded `h-[520px]` body — three overrides that between them rebuilt the
 * drawer badly. The header bar set "Enable repository" in **mono, at label
 * size, next to a brand-orange glyph**: a heading in the machine face (§6), and
 * the brand colour spent on decoration rather than on the one thing that acts
 * (§7). The fixed height is gone too — a drawer is full-height by construction,
 * so the picker gets the whole screen instead of 520px of it.
 *
 * ### Back is the path, and leaving is the ✕
 *
 * The journey rule: the crumbs behind you ARE the way back, and the ✕ leaves
 * entirely. Neither step's footer carries a `Cancel` — it would be a third
 * control for an act two others already offer.
 */
export function EnableRepoWizard({ open, onOpenChange, onCreated }: EnableRepoWizardProps) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [repo, setRepo] = useState<PickedRepo | null>(null);
  // The picker's source and typed URL live here, with the repository they
  // produce — step one unmounts while you are on step two, so anything the
  // picker owned itself would be gone when the crumb brings you back.
  const [source, setSource] = useState<"provider" | "url">("provider");
  const [publicUrl, setPublicUrl] = useState("");

  const close = () => {
    onOpenChange(false);
    setPhase("pick");
    setRepo(null);
    setSource("provider");
    setPublicUrl("");
  };

  const picking = phase === "pick" || !repo;

  return (
    <Drawer open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DrawerContent size="form">
        {/* This is a journey with two steps, so it gets the PATH (§12a). It
            used to hand-roll its own back `<button>` here and pay a `pr-12` on
            the header to stop the title sliding under the absolutely-positioned
            close. Both are gone, and so is the arrow that replaced them: the
            crumb IS the way back now, and `Enable repository` names the list it
            returns you to — which "Back" never did.

            The description survives step two because it is not orientation —
            it names the repository you are configuring, which is the object
            itself. */}
        <DrawerHeader
          steps={
            picking
              ? ["Enable repository"]
              : [
                { label: "Enable repository", onClick: () => setPhase("pick") },
                "Configure previews",
              ]
          }
          description={
            picking ? (
              "Pick a repository, then say what its pull requests should deploy."
            ) : (
              // The repository is a machine value, so it is the only mono thing
              // in the sentence (§6). It used to be repeated as an `h3` at the
              // top of the body; one statement of what you are configuring is
              // enough.
              <>
                Every pull request on <span className="font-mono">{repo.fullName}</span> can get its
                own environment.
              </>
            )
          }
        />

        {picking ? (
          <>
            <DrawerBody>
              <GitSourcePicker
                value={repo}
                onChange={setRepo}
                mode={source}
                onModeChange={setSource}
                url={publicUrl}
                onUrlChange={setPublicUrl}
                publicUrlHint={PR_AUTOMATION_HINT}
              />
            </DrawerBody>
            <DrawerFooter>
              {/* **The primary alone.** `Cancel` came off both steps: the path's
                  live crumbs and the drawer's ✕ are the journey's exits on every
                  step, so a footer `Cancel` was a third control for an act two
                  others already offer. A drawer footer is where the thing gets
                  made. */}
              <DrawerActions>
                {/* The hint that used to sit beside the button as muted text is
                    now the block's own reason — one place that says why, and it
                    is attached to the control it is about. */}
                <BlockedAction reason={repo ? null : "Pick a repository to continue"}>
                  <Button onClick={() => setPhase("configure")}>Continue</Button>
                </BlockedAction>
              </DrawerActions>
            </DrawerFooter>
          </>
        ) : (
          <ConfigurePhase
            repo={repo}
            onCreated={(configId) => {
              onCreated(configId);
              close();
            }}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
