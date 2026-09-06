import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import {
  AlertBanner,
  BlockedAction,
  DangerZone,
  DangerZoneRow,
  FieldShell,
  reasonList,
} from "@/components/branded";
import type { Project } from "@/api/projects";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Why the default project refuses both acts. One sentence, used by both, so
 *  the two cannot come to disagree about the reason. */
const DEFAULT_PROJECT_REASON =
  "This is the organisation's default project. Resources land here when nothing else is named, so it cannot be renamed or deleted.";

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * **One project, and everything you can do to it.**
 *
 * It replaces `RenameProjectDialog`, which was reached from a kebab on the row
 * alongside `Manage members` and `Delete` — three acts on one object behind a
 * menu that had to be opened before you could see any of them, and a table
 * column carried on every row to hold the trigger.
 *
 * ### Straight to edit, not details-then-edit
 *
 * A project is a name and a slug derived from it. Both are settings, so a
 * read-first drawer would be a copy of this form with the input turned off — a
 * step that exists to be clicked past. §13's test: *a pure config opens straight
 * into its form.*
 *
 * ### Why a drawer and not the dialog it replaces
 *
 * The same reason the registry and the git provider are drawers: the surface
 * now holds a form AND the act that ends the object, and the danger zone is
 * §10's *block at the foot of the surface* — a dialog is a decision you cannot
 * get past without answering, which is the wrong shape for a screen you may
 * open, read and close.
 *
 * ### The default project refuses, and says why
 *
 * It cannot be renamed and it cannot be deleted, so both controls are blocked
 * rather than hidden — §11: nothing is disabled without saying why. Hiding them
 * would leave a drawer that appears to offer nothing and explains nothing.
 */
export function ProjectDrawer({
  project,
  onOpenChange,
  onRename,
  onDelete,
}: {
  /** `null` closes it. Driven by which row was clicked, so there is no second
   *  `open` prop to keep in step with it. */
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onRename: (project: Project, newName: string) => Promise<ActionResult>;
  onDelete: (project: Project) => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectId = project?.id;
  const currentName = project?.name ?? "";
  // Re-seeded whenever a DIFFERENT project is opened. Keyed on the id rather
  // than the object: a refetched project must not wipe an in-progress edit.
  useEffect(() => {
    if (projectId == null) return;
    setName(currentName);
    setError(null);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!project) return null;

  const isDefault = !!project.default_project;
  const trimmed = name.trim();
  const slug = toSlug(name);

  /** The primary refuses before the click rather than after it, and says what
   *  is still needed in the verb of the act (§9). */
  const missing = () => {
    if (isDefault) return DEFAULT_PROJECT_REASON;
    const out: string[] = [];
    if (!trimmed) out.push("Enter a name");
    else if (trimmed === currentName) out.push("Change the name to rename it");
    return reasonList(out);
  };

  async function handleSubmit() {
    if (!project || isDefault || !trimmed || trimmed === currentName) return;
    setSubmitting(true);
    setError(null);
    const result = await onRename(project, trimmed);
    if (result.ok) {
      onOpenChange(false);
    } else {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        <DrawerHeader title={currentName} description="Project" />

        <DrawerBody>
          <FieldShell label="Name" htmlFor="project-name" required>
            <Input
              id="project-name"
              placeholder="e.g. Platform"
              value={name}
              disabled={isDefault}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmit();
              }}
            />
          </FieldShell>

          {/* **A value, not a field** (§9). The slug is derived from the name,
              so it reports what the rename will produce rather than pretending
              to be a second thing you can set. */}
          <FieldShell label="Slug" help="What the API and the CLI call this project.">
            <div className="flex h-8 items-center rounded-md bg-control px-3 font-mono text-body text-fg-2">
              {slug || "—"}
            </div>
          </FieldShell>

          <DangerZone className="mt-1">
            <DangerZoneRow
              title="Delete this project"
              description="Every stack, addon and secret filed under it goes with it."
              action={
                <BlockedAction reason={isDefault ? DEFAULT_PROJECT_REASON : null}>
                  <Button
                    variant="destructive-ghost"
                    shape="flat"
                    onClick={() => onDelete(project)}
                  >
                    Delete project
                  </Button>
                </BlockedAction>
              }
            />
          </DangerZone>
        </DrawerBody>

        <DrawerFooter>
          {/* In the footer band, not the body. Inside a band that scrolls, a
              failure scrolls away from the button that produced it. */}
          {error && <AlertBanner>{error}</AlertBanner>}
          <DrawerActions>
            <BlockedAction reason={submitting ? null : missing()}>
              <Button onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                Rename project
              </Button>
            </BlockedAction>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
