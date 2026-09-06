import React from "react";
import { Input } from "@/components/ui/input";
import { DirtyField } from "@/pages/stacks/components/editor/tabs/architecture/drawer-tabs/dirty-field";
import { FieldGrid, FieldShell, FormSection } from "@/components/branded";

import type { FormStackResourceData } from "@/pages/stacks/schemas/form-schema";

type Resource = Partial<FormStackResourceData>;

interface StackResourceDeploymentTabProps {
  index: number;
  /** Projected slice of `resource` containing only the fields this tab reads. */
  draft: DeploymentDraft;
  baseline: DeploymentDraft | undefined;
  /** Patch the resource's `init_spec`. Identity must be stable across renders. */
  onPatchInitSpec: (patch: Partial<NonNullable<FormStackResourceData["init_spec"]>>) => void;
  /** Patch the command/args fields of `execution_config`, preserving other
   *  nested keys (notably `environment_variables`). Identity must be stable. */
  onPatchExecCommandArgs: (patch: { command?: string; args?: string }) => void;
  onDiscardField?: (path: string) => void;
}

/** Subset of FormStackResourceData read by the Deployment tab. Notably we
 *  strip out execution_config.environment_variables — those drive the
 *  Environment tab and would invalidate this tab's memo on every env-var
 *  keystroke if included here. */
export interface DeploymentDraft {
  init_spec?: Resource["init_spec"];
  /** execution_config WITHOUT environment_variables. Shape preserved so that
   *  <DirtyField path="execution_config.command"> resolves correctly. */
  execution_config?: Omit<NonNullable<Resource["execution_config"]>, "environment_variables">;
}

export function pickDeploymentDraft(resource: Resource): DeploymentDraft {
  const ec = resource.execution_config;

  const stripped = ec ? (() => { const { environment_variables, ...rest } = ec; return rest; })() : undefined;
  return {
    init_spec: resource.init_spec,
    execution_config: stripped,
  };
}

function StackResourceDeploymentTabImpl({
  index,
  draft,
  baseline,
  onPatchInitSpec,
  onPatchExecCommandArgs,
  onDiscardField,
}: StackResourceDeploymentTabProps) {

  return (
    <>
      {/* **The gloss moved behind the mark.** `runs before the main container`
          never changed and never will — it is the section's own title said a
          second way, and it was spending a permanent line of a 480px panel to
          do it. `state` is for a fact that moves (`4 variables`, `none`). */}
      <FormSection
        label="Pre-deployment step"
        help="Runs to completion before the main container starts — migrations, seeding, waiting on a dependency. The deploy stops if it fails."
      >
        <FieldGrid>
          <FieldShell
            label="Init command"
            htmlFor={`init-command-${index}`}
            help="Type as in a terminal; quotes group arguments. Not run in a shell, so variables like $PORT are not replaced."
          >
            <DirtyField
              draft={draft}
              baseline={baseline}
              path="init_spec.command"
              compact
              onReset={onDiscardField ? () => onDiscardField("init_spec.command") : undefined}
            >
              <Input
                id={`init-command-${index}`}
                value={draft.init_spec?.command ?? ""}
                onChange={(e) => onPatchInitSpec({ command: e.target.value })}
                placeholder="e.g., sh /scripts/init.sh"

              />
            </DirtyField>
          </FieldShell>
          <FieldShell label="Init arguments" htmlFor={`init-args-${index}`}>
            <DirtyField
              draft={draft}
              baseline={baseline}
              path="init_spec.args"
              compact
              onReset={onDiscardField ? () => onDiscardField("init_spec.args") : undefined}
            >
              <Input
                id={`init-args-${index}`}
                value={draft.init_spec?.args ?? ""}
                onChange={(e) => onPatchInitSpec({ args: e.target.value })}
                placeholder="e.g., arg1 arg2 arg3"

              />
            </DirtyField>
          </FieldShell>
        </FieldGrid>
      </FormSection>

      <FormSection label="Main container step">
        <FieldGrid>
          <FieldShell
            label="Command"
            htmlFor={`exec-command-${index}`}
            help="Overrides the container's default ENTRYPOINT. Type as in a terminal; quotes group arguments."
          >
            <DirtyField
              draft={draft}
              baseline={baseline}
              path="execution_config.command"
              compact
              onReset={onDiscardField ? () => onDiscardField("execution_config.command") : undefined}
            >
              <Input
                id={`exec-command-${index}`}
                value={draft.execution_config?.command ?? ""}
                onChange={(e) => onPatchExecCommandArgs({ command: e.target.value })}
                placeholder="e.g., node server.js"

              />
            </DirtyField>
          </FieldShell>
          <FieldShell label="Arguments" htmlFor={`exec-args-${index}`}>
            <DirtyField
              draft={draft}
              baseline={baseline}
              path="execution_config.args"
              compact
              onReset={onDiscardField ? () => onDiscardField("execution_config.args") : undefined}
            >
              <Input
                id={`exec-args-${index}`}
                value={draft.execution_config?.args ?? ""}
                onChange={(e) => onPatchExecCommandArgs({ args: e.target.value })}
                placeholder="e.g., --port=3000 --verbose"

              />
            </DirtyField>
          </FieldShell>
        </FieldGrid>
      </FormSection>
    </>
  );
}

export const StackResourceDeploymentTab = React.memo(StackResourceDeploymentTabImpl);
