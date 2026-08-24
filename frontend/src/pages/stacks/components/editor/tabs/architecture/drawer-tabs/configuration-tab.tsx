import React from "react";
import { Input, InputGroup } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, HardDrive } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { DirtyField } from "@/pages/stacks/components/editor/tabs/architecture/drawer-tabs/dirty-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  FieldGrid,
  FieldShell,
  FormSection,
  RecordColumns,
  RecordList,
  RecordRow,
  Disclosure,
} from "@/components/branded";
import { RepoCombobox } from "@/components/git-source-picker/repo-combobox";
import { ImageRegistrySelect } from "./image-registry-select";
import { splitImageRef, joinImageRef } from "@/pages/stacks/lib/image-ref";
import { onNameInput } from "@/pages/stacks/lib/name-rule";
import { cn } from "@/lib/utils";
import { isFieldDirty } from "@/pages/stacks/lib/stack-model/field-dirt";

import type {
  FormStackResourceData,
  FormVolumeExtendedData as VolumeFormData,
} from "@/pages/stacks/schemas/form-schema";
import {
  DEFAULT_BUILD_CONTEXT,
  DEFAULT_DOCKERFILE_PATH,
} from "@/pages/stacks/lib/stack-model/policy";

type Resource = Partial<FormStackResourceData>;
type VolumeMount = NonNullable<FormStackResourceData["volume_mounts"]>[number];
type Port = NonNullable<FormStackResourceData["ports"]>[number];

interface StackResourceConfigurationTabProps {
  index: number;
  /** A projected slice of `resource` containing only the fields this tab reads.
   *  Passed as `draft` to <DirtyField> calls; same shape as `baseline`. */
  draft: ConfigurationDraft;
  baseline: ConfigurationDraft | undefined;
  errors: { [field: string]: string | undefined };
  volumes: Partial<VolumeFormData>[];
  allResources?: { name: string; index: number }[];
  /** Per-field reset by dot-path. */
  onDiscardField?: (path: string) => void;
  /** Patch any subset of resource fields. Identity must be stable across renders. */
  onPatchResource: (patch: Partial<FormStackResourceData>) => void;
  /** When provided, mount rows show a navigate button that pushes the volume's drawer. */
  onOpenVolume?: (name: string) => void;
  /** Open the add-volume dialog with this resource preselected. **Absent means
   *  the empty state states the fact and stops** — it never names an act it
   *  cannot perform. */
  onAddVolume?: () => void;
}

/** Subset of FormStackResourceData read by the Configuration tab. We pass this
 * projection (instead of the whole resource) so React.memo can skip the tab
 * when only Deployment- or Environment-tab fields change. */
export interface ConfigurationDraft {
  name?: Resource["name"];
  depends_on?: Resource["depends_on"];
  sourceType?: Resource["sourceType"];
  source?: Resource["source"];
  gitRevisionType?: Resource["gitRevisionType"];
  gitRevisionValue?: Resource["gitRevisionValue"];
  gitCommitPin?: Resource["gitCommitPin"];
  // Abandoned-branch stash for the "Build from" toggle — see the handler below.
  stashedGitSource?: Resource["stashedGitSource"];
  stashedImageSource?: Resource["stashedImageSource"];
  volume_mounts?: Resource["volume_mounts"];
  ports?: Resource["ports"];
}

/** Project a FormStackResourceData down to the keys the Configuration tab needs. */
export function pickConfigurationDraft(resource: Resource): ConfigurationDraft {
  return {
    name: resource.name,
    depends_on: resource.depends_on,
    sourceType: resource.sourceType,
    source: resource.source,
    gitRevisionType: resource.gitRevisionType,
    gitRevisionValue: resource.gitRevisionValue,
    gitCommitPin: resource.gitCommitPin,
    stashedGitSource: resource.stashedGitSource,
    stashedImageSource: resource.stashedImageSource,
    volume_mounts: resource.volume_mounts,
    ports: resource.ports,
  };
}

/**
 * **The two port columns, written once for the header and the control.**
 *
 * A header word that is not over its own control is worse than no header at
 * all, so these cannot be two numbers in two places — the row and the strip
 * above it read from the same pair.
 *
 * `PORT_COL` — the number and the protocol take **even halves** of whatever the
 * row has left. `basis-0` is what makes them even: with the default `basis-auto`
 * a `flex-1` box starts from its own content, so a `<select>` reading `HTTP`
 * and an input reading `8080` split the slack by how long their text happens to
 * be. Zero basis, and the two are one pair at any panel width.
 *
 * `VISIBILITY_COL` — **the header cell AND the control, from one constant.**
 *
 * It used to be the header's width only, with the control left to hug: a closed
 * set of two fixed words should be exactly as wide as they are. The trouble is
 * that a header cannot hug something it is not inside, so the strip needed a
 * number — and the number was computed by hand from the board's rounded metrics,
 * `2 + (8+38+8) + (8+47+8) + 2`. Measured, the words set 37.56 and 46.48, so the
 * hug comes out at 120.04 and the header sat 1px wider than the thing it names,
 * from the day it was written.
 *
 * One number, spent on both, is the only version of this that cannot drift. The
 * ~1px of slack inside the track is invisible; two numbers kept in step by hand
 * are not — `ColumnsSitOnTheirControls` in the story file fails the build if
 * these two ever disagree again.
 */
const PORT_COL = "min-w-0 flex-1 basis-0";
const VISIBILITY_COL = "w-[121px]";

const getError = (
  errors: { [field: string]: string | undefined },
  path: string,
) => {
  if (errors[path]) return errors[path];
  for (const key in errors) {
    if (key === path || key.startsWith(`${path}.`)) return errors[key];
    if (path.startsWith(`${key}.`)) return errors[key];
  }
  return undefined;
};

function StackResourceConfigurationTabImpl({
  index,
  draft,
  baseline,
  errors,
  allResources,
  onDiscardField,
  onPatchResource,
  onOpenVolume,
  onAddVolume,
}: StackResourceConfigurationTabProps) {
  const update = onPatchResource;

  type GitSource = NonNullable<
    NonNullable<FormStackResourceData["source"]>["git"]
  >;
  type ImageSource = NonNullable<
    NonNullable<FormStackResourceData["source"]>["image"]
  >;

  // Merge a patch into source.git. dockerfile_path/build_context carry the
  // API defaults (they are required on the resolved GitSource type).
  const updateGitSource = (patch: Partial<GitSource>) => {
    const current = draft.source?.git;
    update({
      source: {
        git: {
          repo_url: current?.repo_url ?? "",
          dockerfile_path: current?.dockerfile_path ?? DEFAULT_DOCKERFILE_PATH,
          build_context: current?.build_context ?? DEFAULT_BUILD_CONTEXT,
          branch: current?.branch,
          tag: current?.tag,
          commit: current?.commit,
          push: current?.push,
          integration_id: current?.integration_id,
          ...patch,
        },
      },
    });
  };

  const updateImageSource = (patch: Partial<ImageSource>) => {
    const current = draft.source?.image;
    update({
      source: {
        image: {
          ref: current?.ref ?? "",
          registry_credentials_id: current?.registry_credentials_id,
          ...patch,
        },
      },
    });
  };

  const updateDependsOn = (dependsOn: string[]) => {
    update({ depends_on: dependsOn });
  };

  /* The three mount mutators went with the editable branch they served. A
     mount is created and detached on the CANVAS — this section reads it. */

  const addPort = () => {
    const existing = draft.ports || [];
    const number = 80;
    update({
      ports: [
        ...existing,
        // Name derived from the number (port-<number>) so outputs read e.g.
        // url.port-8080 instead of a meaningless positional url.port-2. k8s port
        // names must contain a letter, so a bare number can't be the name.
        {
          name: `port-${number}`,
          number,
          protocol: "tcp",
          exposed_to_public: false,
        },
      ],
    });
  };

  const updatePort = (
    pidx: number,
    patch: Partial<{
      number: number;
      protocol: "http" | "tcp";
      exposed_to_public: boolean;
      subdomain_prefix: string;
    }>,
  ) => {
    update({
      ports: (draft.ports || []).map((port: Port, i: number) => {
        if (i !== pidx) return port;
        const next = { ...port, ...patch };
        // Re-derive the auto name (url.port-8080) only while it still matches the
        // auto PATTERN — not the current number, which a cleared field desyncs —
        // so a hand-set name is never overwritten.
        if (
          patch.number !== undefined &&
          (!port.name || /^port-(\d+|undefined)$/.test(port.name))
        ) {
          next.name = `port-${patch.number}`;
        }
        return next;
      }),
    });
  };

  const removePort = (pidx: number) => {
    update({
      ports: (draft.ports || []).filter((_: Port, i: number) => i !== pidx),
    });
  };

  const ports = draft.ports || [];
  // Whether a row can carry a reset arrow at all — `DirtyField` reserves the
  // slot on exactly this condition, so the header's spacer has to read it too
  // or the three words drift 24px off their columns.
  const portsHaveReset = baseline !== undefined && !!onDiscardField;
  /**
   * **Is anything in THIS list changed** — asked once, for the whole section.
   *
   * Each row can answer for itself, and that is exactly why the reset slot used
   * to be held open permanently: a per-row answer means a per-row width, and
   * one row widening on a keystroke slides its own `Protocol` and `Visibility`
   * out from under the headers naming them.
   *
   * Asked for the list, the answer is the same for every row in it, so they
   * gain and lose the slot together and the columns never break rank — and a
   * list nobody has touched does not carry 26px of empty column between its
   * last control and its remove button.
   */
  /** The same question Ports asks, for this list — see `reserveInlineReset`. */
  const mountsAnyDirty =
    baseline !== undefined &&
    !!onDiscardField &&
    (draft.volume_mounts || []).some((_: VolumeMount, i: number) =>
      isFieldDirty(draft as never, baseline as never, `volume_mounts.${i}`),
    );

  const portsAnyDirty =
    portsHaveReset &&
    ports.some((_: Port, pidx: number) =>
      isFieldDirty(draft as never, baseline as never, `ports.${pidx}`),
    );
  /**
   * **The heading is the word `Ports` and nothing else.**
   *
   * It carried a tally — `none`, `3 internal`, `1 exposed` — and every one of
   * those facts is already on screen underneath it, spelled out per row: the
   * count is the number of rows, and which are public is the segmented control
   * sitting in each one. A summary directly above the thing it summarises is a
   * second reading of a list you can see all of, and it was the only heading in
   * the panel with anything after the word.
   */

  const mounts = draft.volume_mounts || [];

  // The fold is open when it is open — there is nothing in the draft that
  // says so, and a field inside it that differs from baseline is already marked
  // by `DirtyField` once you open it.
  const [advanced, setAdvanced] = React.useState(false);

  return (
    <>
      <FormSection label="General">
        <FieldGrid>
          <FieldShell
            label="Name"
            htmlFor={`resource-name-${index}`}
            required
            /* **No hint at all — the field IS the rule.**
             It was a two-line paragraph under a 32px control, describing
             characters the field now refuses to accept: a warning about a door
             that is locked. What it cannot perform for you — a trailing hyphen,
             a name already taken — arrives as an error, at the moment it is
             true and not before. */
            error={getError(errors, "name")}
          >
            <DirtyField
              draft={draft}
              baseline={baseline}
              path="name"
              compact
              onReset={
                onDiscardField ? () => onDiscardField("name") : undefined
              }
            >
              <Input
                id={`resource-name-${index}`}
                placeholder="e.g., api, database, frontend"
                value={draft.name || ""}
                // Corrects as you type — a capital lowercases, a space or an
                // underscore becomes a hyphen, a leading hyphen never lands.
                // See `onNameInput`.
                onChange={(e) => onNameInput(e, (name) => update({ name }))}
                required
                aria-invalid={!!getError(errors, "name")}
              />
            </DirtyField>
          </FieldShell>

          <FieldShell
            label="Depends on"
            // The control says what it does; this says what follows from it.
            help="These start first."
            error={errors["depends_on"]}
          >
            <DirtyField
              draft={draft}
              baseline={baseline}
              path="depends_on"
              compact
              onReset={
                onDiscardField ? () => onDiscardField("depends_on") : undefined
              }
            >
              {allResources ? (
                <MultiSelect
                  options={allResources
                    .filter(
                      (r) =>
                        r.index !== index && r.name && r.name.trim() !== "",
                    )
                    .map((r) => ({ label: r.name, value: r.name }))}
                  onValueChange={updateDependsOn}
                  defaultValue={draft.depends_on || []}
                  placeholder={
                    allResources.length <= 1
                      ? "No other resources available"
                      : "Select dependencies"
                  }
                  disabled={allResources.length <= 1}
                  className="w-full"
                />
              ) : (
                <div className="text-body text-muted-foreground">
                  No dependency information available
                </div>
              )}
            </DirtyField>
          </FieldShell>
        </FieldGrid>
      </FormSection>

      {/* **No state word.** It read `Source · git repository` with a segmented
          control two lines below whose selected half says `Git repository`. A
          heading that reports what the first control in it is set to is the
          same fact twice, and the control is the one that can be acted on. */}
      <FormSection label="Source">
        <FieldGrid>
          <FieldShell label="Build from">
            <DirtyField
              draft={draft}
              baseline={baseline}
              path="sourceType"
              compact
              onReset={
                onDiscardField ? () => onDiscardField("sourceType") : undefined
              }
            >
              {/* **It hugs.** `fill` splits the track into even halves so every
                  trailing edge lands on the grid — right for a control whose
                  width is a value, wrong for a two-way choice: stretched to 440
                  the two words sat in acres of track and the control read as a
                  pair of tabs. At its natural width it reads as one switch. */}
              <SegmentedControl
                aria-label="Build from"
                value={draft.sourceType || "image"}
                onValueChange={(val) => {
                  const sourceType = val as "image" | "git";
                  // The API rejects a source with both `git` and `image` set
                  // (source_conflict), so the abandoned branch can't stay live
                  // in `source`. Stash it in a form-only field instead of
                  // discarding it, and restore the other branch from its own
                  // stash (falling back to fresh defaults the first time).
                  if (sourceType === "git") {
                    update({
                      sourceType,
                      source: {
                        git: draft.stashedGitSource ?? {
                          repo_url: "",
                          dockerfile_path: DEFAULT_DOCKERFILE_PATH,
                          build_context: DEFAULT_BUILD_CONTEXT,
                        },
                      },
                      stashedImageSource:
                        draft.source?.image ?? draft.stashedImageSource,
                    });
                  } else {
                    update({
                      sourceType,
                      source: {
                        image: draft.stashedImageSource ?? { ref: "" },
                      },
                      stashedGitSource:
                        draft.source?.git ?? draft.stashedGitSource,
                    });
                  }
                }}
                // **No glyphs.** `Container image` and `Git repository` are
                // already the two words that tell them apart, and a segmented
                // control is the one place a mark cannot help: both segments
                // wear one, so the icon distinguishes nothing and the pair just
                // reads as busier. It also cost the label 22 of the segment's
                // width, which pushed the selected face wider than the words in it.
                options={[
                  { value: "image", label: "Container image" },
                  { value: "git", label: "Git repository" },
                ]}
              />
            </DirtyField>
          </FieldShell>
        </FieldGrid>

        {draft.sourceType === "image" ? (
          <>
            <FieldGrid>
              <FieldShell label="Registry" htmlFor={`image-registry-${index}`}>
                <DirtyField
                  draft={draft}
                  baseline={baseline}
                  path="source.image"
                  compact
                  onReset={
                    onDiscardField
                      ? () => onDiscardField("source.image")
                      : undefined
                  }
                >
                  <ImageRegistrySelect
                    id={`image-registry-${index}`}
                    imageRef={draft.source?.image?.ref || ""}
                    registryCredentialsId={
                      draft.source?.image?.registry_credentials_id
                    }
                    onChange={(patch) =>
                      updateImageSource({
                        ref: patch.ref,
                        registry_credentials_id: patch.registry_credentials_id,
                      })
                    }
                  />
                </DirtyField>
              </FieldShell>

              <FieldShell
                label="Image reference"
                htmlFor={`container-image-${index}`}
                required
                error={getError(errors, "source.image.ref")}
              >
                <DirtyField
                  draft={draft}
                  baseline={baseline}
                  path="source.image"
                  compact
                  onReset={
                    onDiscardField
                      ? () => onDiscardField("source.image")
                      : undefined
                  }
                >
                  {(() => {
                    const { host, remainder } = splitImageRef(
                      draft.source?.image?.ref || "",
                    );
                    return (
                      // **One well, not a chip beside a box.** `ghcr.io/acme/api:1.4.2`
                      // is a single value whose head is set by the registry picker
                      // above and whose tail is typed. It was a `bg-muted` chip and a
                      // separate field with 4px between them, so the danger edge drew
                      // around half the control and the head floated in the row.
                      // A registry host IS a URL, so the head keeps mono (§6).
                      <InputGroup
                        id={`container-image-${index}`}
                        prefix={
                          host ? (
                            <span className="font-mono">{host}/</span>
                          ) : undefined
                        }
                        placeholder={
                          host
                            ? "e.g., acme/api:1.4.2"
                            : "e.g., nginx:latest, redis:7"
                        }
                        value={remainder}
                        onChange={(e) => {
                          const typed = e.target.value;
                          // A pasted full ref (with its own host) replaces the
                          // whole ref outright; otherwise compose against the
                          // active head as before.
                          const { host: typedHost } = splitImageRef(typed);
                          updateImageSource({
                            ref: typedHost ? typed : joinImageRef(host, typed),
                          });
                        }}
                        required={draft.sourceType === "image"}
                        aria-invalid={!!getError(errors, "source.image.ref")}
                      />
                    );
                  })()}
                </DirtyField>
              </FieldShell>
            </FieldGrid>
          </>
        ) : (
          <>
            <FieldGrid>
              <FieldShell
                label="Repository"
                htmlFor={`git-repo-${index}`}
                required
                error={getError(errors, "source.git.repo_url")}
              >
                <DirtyField
                  draft={draft}
                  baseline={baseline}
                  path="source.git.repo_url"
                  compact
                  onReset={
                    onDiscardField
                      ? () => {
                          onDiscardField("source.git.repo_url");
                          onDiscardField("source.git.integration_id");
                        }
                      : undefined
                  }
                >
                  <RepoCombobox
                    id={`git-repo-${index}`}
                    value={draft.source?.git?.repo_url || ""}
                    integrationId={draft.source?.git?.integration_id}
                    onChange={(pick) =>
                      updateGitSource({
                        repo_url: pick.repo_url,
                        integration_id: pick.integration_id,
                      })
                    }
                    hasError={!!getError(errors, "source.git.repo_url")}
                  />
                </DirtyField>
              </FieldShell>

              <FieldShell
                label="Revision"
                htmlFor={`git-revision-type-${index}`}
                /* One subject in two boxes — a revision is a kind AND a name — so
                 these two share a row and the form keeps two trailing edges. */
                span={1}
                error={getError(errors, "gitRevisionType")}
              >
                <DirtyField
                  draft={draft}
                  baseline={baseline}
                  path="gitRevisionType"
                  compact
                  onReset={
                    onDiscardField
                      ? () => onDiscardField("gitRevisionType")
                      : undefined
                  }
                >
                  <Select
                    value={draft.gitRevisionType ?? "default"}
                    onValueChange={(val) =>
                      val === "default"
                        ? update({
                            gitRevisionType: undefined,
                            gitRevisionValue: undefined,
                            gitCommitPin: undefined,
                          })
                        : update({ gitRevisionType: val as "branch" | "tag" })
                    }
                  >
                    <SelectTrigger
                      id={`git-revision-type-${index}`}
                      className="w-full"
                      aria-invalid={!!getError(errors, "gitRevisionType")}
                    >
                      <SelectValue placeholder="Default branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default branch</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                      <SelectItem value="tag">Tag</SelectItem>
                    </SelectContent>
                  </Select>
                </DirtyField>
              </FieldShell>

              {draft.gitRevisionType && (
                <FieldShell
                  label={
                    draft.gitRevisionType === "branch"
                      ? "Branch name"
                      : "Tag name"
                  }
                  htmlFor={`git-revision-value-${index}`}
                  required
                  span={1}
                  error={getError(errors, "gitRevisionValue")}
                >
                  <DirtyField
                    draft={draft}
                    baseline={baseline}
                    path="gitRevisionValue"
                    compact
                    onReset={
                      onDiscardField
                        ? () => onDiscardField("gitRevisionValue")
                        : undefined
                    }
                  >
                    <Input
                      id={`git-revision-value-${index}`}
                      value={draft.gitRevisionValue || ""}
                      onChange={(e) =>
                        update({ gitRevisionValue: e.target.value })
                      }
                      placeholder={
                        draft.gitRevisionType === "branch"
                          ? "e.g., main, develop"
                          : "e.g., v1.0.0"
                      }
                      required={!!draft.gitRevisionType}
                      aria-invalid={!!getError(errors, "gitRevisionValue")}
                      onBlur={() => {
                        if (!draft.gitRevisionValue) {
                          update({ gitRevisionValue: "" });
                        }
                      }}
                    />
                  </DirtyField>
                </FieldShell>
              )}

              <FieldShell
                label="Pin to commit"
                htmlFor={`git-commit-pin-${index}`}
                help="Optional commit SHA. Builds stay on this commit until unpinned."
                error={getError(errors, "gitCommitPin")}
              >
                <DirtyField
                  draft={draft}
                  baseline={baseline}
                  path="gitCommitPin"
                  compact
                  onReset={
                    onDiscardField
                      ? () => onDiscardField("gitCommitPin")
                      : undefined
                  }
                >
                  <Input
                    id={`git-commit-pin-${index}`}
                    value={draft.gitCommitPin || ""}
                    onChange={(e) =>
                      update({ gitCommitPin: e.target.value || undefined })
                    }
                    placeholder="e.g., a1b2c3d4e5..."
                    disabled={!draft.gitRevisionType && !draft.gitCommitPin}
                    aria-invalid={!!getError(errors, "gitCommitPin")}
                  />
                </DirtyField>
              </FieldShell>
            </FieldGrid>

            {/* **A disclosure inside a section is a control, not a section.**
                It was a `FormSection collapsible` — a full-bleed band with its
                own rule and its own hover wash, nested inside `Source`, which
                gave one group a second group's chrome and drew a line across
                the panel to hide four fields.

                It is the same disclosure `New preview` uses: a ghost button at
                its natural width, and a chevron that TURNS rather than swapping
                glyph — one shape moving is read faster than two alternating. */}
            <Disclosure
              label="Advanced — build & push"
              open={advanced}
              onOpenChange={setAdvanced}
            >
              <FieldShell
                label="Dockerfile path"
                htmlFor={`dockerfile-path-${index}`}
                help="Relative to the build context."
                error={getError(errors, "source.git.dockerfile_path")}
              >
                <DirtyField
                  draft={draft}
                  baseline={baseline}
                  path="source.git.dockerfile_path"
                  compact
                  onReset={
                    onDiscardField
                      ? () => onDiscardField("source.git.dockerfile_path")
                      : undefined
                  }
                >
                  <Input
                    id={`dockerfile-path-${index}`}
                    value={draft.source?.git?.dockerfile_path ?? ""}
                    onChange={(e) =>
                      updateGitSource({ dockerfile_path: e.target.value })
                    }
                    onBlur={(e) => {
                      if (!e.target.value.trim())
                        updateGitSource({
                          dockerfile_path: DEFAULT_DOCKERFILE_PATH,
                        });
                    }}
                    placeholder="Dockerfile"
                  />
                </DirtyField>
              </FieldShell>

              <FieldShell
                label="Build context"
                htmlFor={`build-context-${index}`}
                help="Directory passed to the image build."
                error={getError(errors, "source.git.build_context")}
              >
                <DirtyField
                  draft={draft}
                  baseline={baseline}
                  path="source.git.build_context"
                  compact
                  onReset={
                    onDiscardField
                      ? () => onDiscardField("source.git.build_context")
                      : undefined
                  }
                >
                  <Input
                    id={`build-context-${index}`}
                    value={draft.source?.git?.build_context ?? ""}
                    onChange={(e) =>
                      updateGitSource({ build_context: e.target.value })
                    }
                    onBlur={(e) => {
                      if (!e.target.value.trim())
                        updateGitSource({
                          build_context: DEFAULT_BUILD_CONTEXT,
                        });
                    }}
                    placeholder="."
                  />
                </DirtyField>
              </FieldShell>

              <FieldShell
                label="Push registry"
                htmlFor={`push-repo-${index}`}
                help="Blank uses the internal cluster registry."
                error={getError(errors, "source.git.push.repository")}
              >
                <DirtyField
                  draft={draft}
                  baseline={baseline}
                  path="source.git.push.repository"
                  compact
                  onReset={
                    onDiscardField
                      ? () => onDiscardField("source.git.push.repository")
                      : undefined
                  }
                >
                  <Input
                    id={`push-repo-${index}`}
                    value={draft.source?.git?.push?.repository || ""}
                    onChange={(e) =>
                      updateGitSource({
                        push: e.target.value
                          ? { repository: e.target.value }
                          : undefined,
                      })
                    }
                    placeholder="e.g., ghcr.io/your-org/your-image"
                  />
                </DirtyField>
              </FieldShell>
            </Disclosure>
          </>
        )}
      </FormSection>

      {/* **The visibility column, once — the header word and the control read
          the same number.**

          121 is not a chosen width, it is the closed set's OWN: the track pays
          2 all round and each segment pays 8 either side of its word, so
          `2 + (8+38+8) + (8+47+8) + 2 = 121` for `Public` and `Internal` at
          body/500. It ran at 141, which is 20px of air inside a row whose FIRST
          column had been squeezed to 59 — the number field, the one thing in
          the row you actually type into, was the narrowest control in it. */}
      <FormSection label="Ports">
        {ports.length === 0 ? (
          /* **The same empty state Mounts uses**, and for the same reason: a
             section with nothing in it should say what it is for and offer the
             one act that fills it. Two sections answering "nothing here yet"
             two different ways is two answers to one question. */
          <div className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-0.5">
              <p className="text-body font-medium text-fg-2">No ports</p>
              <p className="text-meta text-fg-muted">
                A port is how traffic reaches this service — from the stack, or
                from the internet.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={addPort}
            >
              Add port
            </Button>
          </div>
        ) : (
          /* 8, not 16: the header, the rows and the button that adds one more
            are one subject, not a column of separate things. */
          <RecordList>
            {/* **The three names live here, once — not as `Port 1` down the
              left.** The ordinal was the only word in the section and it was
              the one word that carried nothing: it counts the row rather than
              naming it, it does not move when 8080 becomes 3000, and it cost a
              20px label row per record. Meanwhile the three controls beside it
              were unlabelled, so what `TCP` and `Public ǀ Internal` governed
              was left to inference. See `RecordRow`. */}
            {ports.length > 0 && (
              <RecordColumns>
                <span className={PORT_COL}>Port</span>
                <span className={PORT_COL}>Protocol</span>
                <span className={cn(VISIBILITY_COL, "flex-none")}>
                  Visibility
                </span>
                {/* Spacers, so the three words stay over their own columns: the
                  reset slot `DirtyField` reserves, then `RecordRow`'s remove. */}
                {portsAnyDirty && <span className="w-5 flex-none" />}
                <span className="w-8 flex-none" />
              </RecordColumns>
            )}
            {ports.map((port: Port, pidx: number) => (
              <RecordRow
                key={pidx}
                error={
                  getError(errors, `ports.${pidx}.number`) ||
                  getError(errors, `ports.${pidx}.protocol`)
                }
                onRemove={() => removePort(pidx)}
                removeLabel={
                  port.number
                    ? `Remove port ${port.number}`
                    : `Remove port ${pidx + 1}`
                }
              >
                <DirtyField
                  draft={draft}
                  baseline={baseline}
                  path={`ports.${pidx}`}
                  compact
                  onReset={
                    onDiscardField
                      ? () => onDiscardField(`ports.${pidx}`)
                      : undefined
                  }
                  reserveInlineReset={portsAnyDirty}
                  // Inline, because a label-less row has no label line above it
                  // for the arrow to sit on — the same answer the mount rows take.
                  resetPlacement="inline"
                  className="min-w-0 flex-1"
                >
                  {/* **The number and the protocol split the slack evenly**, the
                    visibility sits at its own width, and the remove button is
                    packed straight after by `RecordRow` — never pushed to the
                    far edge.

                    The number used to take ALL the slack while the protocol was
                    pinned at 92, which sounds generous and is the opposite: two
                    fixed columns plus a 92 ate 233 of the row's 324, leaving the
                    port field 59px — four digits and no room to see them. Even
                    halves is the board's answer and it gives both 97.5 here. */}
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Input
                      id={`port-number-${index}-${pidx}`}
                      // The ordinal was worth announcing and never worth drawing:
                      // it is how a screen reader tells this row from the next.
                      aria-label={`Port ${pidx + 1}`}
                      inputMode="numeric"
                      value={port.number?.toString() ?? ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        updatePort(pidx, {
                          number:
                            digits === "" ? undefined : parseInt(digits, 10),
                        });
                      }}
                      className={PORT_COL}
                      aria-invalid={!!getError(errors, `ports.${pidx}.number`)}
                      required
                    />
                    <Select
                      value={port.protocol || "tcp"}
                      onValueChange={(value) =>
                        updatePort(pidx, { protocol: value as "tcp" | "http" })
                      }
                    >
                      {/* `!` because a record member is the exception FieldShell
                        names: its fill rule reaches every select inside a field.
                        Here it takes the same half of the slack the number does,
                        so the two open controls are one pair. */}
                      <SelectTrigger
                        aria-label="Protocol"
                        className={cn("!w-auto", PORT_COL)}
                      >
                        <SelectValue placeholder="Protocol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* A segmented, not a switch: a switch needs a word beside it to
                    say what it toggles, and that word was `public`/`internal` in
                    mono at the far end of an `ml-auto`. A segmented IS its own
                    label.

                    It does NOT fill: `fill` splits a track into even halves, and
                    the board draws these two segments hugging their own words —
                    54 for `Public`, 63 for `Internal`.

                    **It takes `VISIBILITY_COL` rather than hugging, though.** The
                    hug is the truer width, but the header cell cannot hug what
                    it is not inside, so a hugging control meant the same number
                    written twice — and the hand-computed copy was 1px out from
                    the first day. One constant on both boxes is the only shape
                    that cannot drift; the segments still hug their words inside
                    it. See `VISIBILITY_COL`. */}
                    <SegmentedControl
                      aria-label="Visibility"
                      className={cn(VISIBILITY_COL, "flex-none")}
                      value={port.exposed_to_public ? "public" : "internal"}
                      onValueChange={(v) =>
                        updatePort(pidx, { exposed_to_public: v === "public" })
                      }
                      options={[
                        { value: "public", label: "Public" },
                        { value: "internal", label: "Internal" },
                      ]}
                    />
                  </div>
                </DirtyField>
              </RecordRow>
            ))}
            {/* No glyph. `Add port` is two words that already say the whole act,
              and a ⊕ in front of them is the same word drawn twice — on the one
              control in the section whose label leaves nothing to infer. */}
            <Button
              variant="outline"
              size="sm"
              onClick={addPort}
              className="self-start"
            >
              Add port
            </Button>
          </RecordList>
        )}
      </FormSection>

      {/* **The heading is the word, as Ports is.** It carried
          `1 volume · managed on canvas` — a tally the rows already are, and an
          instruction in the slot meant for state. The instruction moved into
          the empty state, which is the one place it is needed and the one place
          it can offer the act instead of naming it. */}
      <FormSection label="Mounts">
        {mounts.length === 0 ? (
          /* **It offers the act.** It used to read "Add one from the canvas
             using + Add resource → Volume" — a sentence naming a thing it would
             not do, on the one screen where nothing else refuses to act. */
          <div className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-0.5">
              <p className="text-body font-medium text-fg-2">
                No volumes mounted
              </p>
              <p className="text-meta text-fg-muted">
                A volume gives this service storage that survives a restart.
              </p>
            </div>
            {onAddVolume && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={onAddVolume}
              >
                Add volume
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {mounts.map((vm: VolumeMount, vmIdx: number) => {
              const volumeName = vm.source_volume_name;
              return (
                <DirtyField
                  key={vmIdx}
                  draft={draft}
                  baseline={baseline}
                  path={`volume_mounts.${vmIdx}`}
                  compact
                  /* **The revert is back.** It shipped with `hideReset`, which
                     left a mount the only dirty mark in the panel that showed a
                     change and offered no way out of it. Resetting the field
                     restores the mount's own values — it does not detach the
                     volume, which is still the canvas's act. */
                  onReset={
                    onDiscardField
                      ? () => onDiscardField(`volume_mounts.${vmIdx}`)
                      : undefined
                  }
                  resetPlacement="inline"
                  reserveInlineReset={mountsAnyDirty}
                >
                  {/* **The whole row is the target.** The arrow is a mark
                      saying where the row goes, not the only part you may
                      click — a 32px button inside a 360px row makes the other
                      328 read as inert. Same `--wash-hover` every list row in
                      the product uses, bled 6 past the section's content edge
                      so it lands on the SAME box the change tint does. */}
                  <button
                    type="button"
                    disabled={!onOpenVolume || !volumeName}
                    onClick={() => volumeName && onOpenVolume?.(volumeName)}
                    aria-label={
                      volumeName ? `Open volume ${volumeName}` : undefined
                    }
                    className={cn(
                      "focus-ring-edge -mx-1.5 flex h-8 w-full items-center gap-1.5 rounded-md px-1.5",
                      "transition-colors enabled:hover:bg-[var(--wash-hover)]",
                      "disabled:cursor-default",
                    )}
                  >
                    <span className="flex min-w-0 flex-1 basis-0 items-center gap-2">
                      <HardDrive
                        className="size-4 flex-none text-fg-muted"
                        aria-hidden
                      />
                      <span className="truncate text-body text-foreground">
                        {volumeName}
                      </span>
                    </span>
                    {/* The path is a machine value, so it is mono (§6). */}
                    <span className="min-w-0 flex-1 basis-0 truncate text-left font-mono text-meta text-fg-2">
                      {vm.target_path}
                    </span>
                    {onOpenVolume && volumeName && (
                      <ArrowRight
                        className="size-4 flex-none text-fg-muted"
                        aria-hidden
                      />
                    )}
                  </button>
                </DirtyField>
              );
            })}
          </div>
        )}
      </FormSection>
    </>
  );
}

/** Memoized so a keystroke in (say) the Environment tab does not re-render
 * Configuration. Parent must pass projected `draft` + stable `onPatchResource`. */
export const StackResourceConfigurationTab = React.memo(
  StackResourceConfigurationTabImpl,
);
