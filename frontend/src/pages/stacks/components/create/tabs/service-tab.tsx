import { FieldGrid, FieldShell } from "@/components/branded"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { BranchField } from "@/components/git-source-picker/branch-field"

import type { ServiceForm } from "../selection"

/**
 * **Step three of the repository journey — what the picked code becomes.**
 *
 * ### Why it is back
 *
 * It shipped as the second half of a full-page wizard (`git-source-panel.tsx`)
 * and was deleted in the graphite pass, on the reasoning that branch, port and
 * Dockerfile path belong to a RESOURCE and a resource is edited in the node
 * inspector on the canvas.
 *
 * That reasoning is sound about where those fields LIVE and wrong about whether
 * the step can be dropped. Removing a step does not move its work somewhere
 * else; it just stops asking, and the draft is then built from five guesses the
 * user never saw. The canvas can still edit every one of these — this is where
 * they get their first values, from the person who knows them.
 *
 * ### One pair, and it is the only real one
 *
 * The old panel put `Branch | Port` on a row and `Dockerfile path | Build
 * context` on another, which is **pairing by count rather than by meaning**:
 * two fields left over, so they share a row. A branch is *which code* and a
 * port is *how it is reached*; they have nothing to do with each other, and
 * side by side they claim otherwise.
 *
 * The order is the build pipeline, and the only two fields that share a subject
 * are the only two on a row:
 *
 * | | |
 * |---|---|
 * | **Service name** | what it is called |
 * | **Branch** | which code |
 * | **Dockerfile path · Build context** | how it is built — **the pair.** Both are paths relative to the repository root, both feed the same image build, and each one's hint has to say "relative to the repository root" because of the other |
 * | **Port** | where it listens |
 * | **Expose publicly** | whether that port is reachable — directly under the field it is about, so the relation needs no heading to say it |
 *
 * Nothing here is hand-rolled: the old panel drew its own `grid grid-cols-2
 * gap-4` and its own bordered switch row, and both are `FieldShell` features
 * now — `span` and `inline`.
 *
 * ### The branch control decides what it is
 *
 * `BranchField` lists branches when the integration can list them and falls
 * back to free text when it cannot — which is always the case for a pasted
 * public URL, where there is no integration to ask. One control, both paths, no
 * branch on the call site.
 */
export function ServiceTab({
  repoFullName,
  integrationId,
  values,
  onChange,
  errors,
}: {
  /** "acme/web-api" — names the thing being configured, and lists its branches. */
  repoFullName: string
  /** null for a pasted URL: nothing to list, so the branch is free text. */
  integrationId: string | null
  values: ServiceForm
  onChange: (patch: Partial<ServiceForm>) => void
  errors: Partial<Record<keyof ServiceForm, string>>
}) {
  return (
    <FieldGrid>
      <FieldShell
        label="Service name"
        htmlFor="service-name"
        required
        span={2}
        error={errors.serviceName}
      >
        <Input
          id="service-name"
          value={values.serviceName}
          onChange={(e) => onChange({ serviceName: e.target.value })}
          aria-invalid={Boolean(errors.serviceName)}
        />
      </FieldShell>

      {/* Full width, and alone on its row. It used to sit beside Port, which
          said the two were related — a branch is which code, a port is how the
          thing is reached. */}
      <FieldShell label="Branch" htmlFor="service-branch" required span={2} error={errors.branch}>
        <BranchField
          id="service-branch"
          value={values.branch}
          onChange={(branch) => onChange({ branch })}
          integrationId={integrationId}
          repoFullName={repoFullName}
        />
      </FieldShell>

      {/* **The one pair.** Both are paths relative to the repository root and
          both feed the same image build — which is why each hint has to name
          that root because of the other. */}
      <FieldShell
        label="Dockerfile path"
        span={1}
        htmlFor="service-dockerfile"
        hint="Relative to the repository root."
      >
        <Input
          id="service-dockerfile"
          value={values.dockerfilePath}
          onChange={(e) => onChange({ dockerfilePath: e.target.value })}
        />
      </FieldShell>

      <FieldShell
        label="Build context"
        span={1}
        htmlFor="service-context"
        hint="Directory passed to the image build, relative to the repository root."
      >
        <Input
          id="service-context"
          value={values.buildContext}
          onChange={(e) => onChange({ buildContext: e.target.value })}
        />
      </FieldShell>

      <FieldShell label="Port" htmlFor="service-port" required span={2} error={errors.port}>
        <Input
          id="service-port"
          inputMode="numeric"
          placeholder="3000"
          value={values.port}
          onChange={(e) => onChange({ port: e.target.value })}
          aria-invalid={Boolean(errors.port)}
        />
      </FieldShell>

      {/* Directly under Port, because it is about Port — "route external
          traffic to THIS port". Adjacency is the whole relation; a heading
          saying "Networking" over two fields would be a third element carrying
          what the order already carries.

          `inline`, not a hand-rolled bordered row. The old panel drew its own
          `flex items-center justify-between rounded-md border` here, which is
          the shape `FieldShell` already ships — a switch and its sentence are
          one statement, so the label sits beside the control rather than above
          it. */}
      <FieldShell
        label="Expose publicly"
        hint="Route external traffic to this port."
        span={2}
        inline
      >
        <Switch
          checked={values.exposePublic}
          onCheckedChange={(exposePublic) => onChange({ exposePublic })}
          aria-label="Expose publicly"
        />
      </FieldShell>
    </FieldGrid>
  )
}
