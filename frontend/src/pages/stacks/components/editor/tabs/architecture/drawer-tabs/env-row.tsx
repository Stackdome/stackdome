import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormEnvVarData } from "@/pages/stacks/schemas/form-schema";
import type { Secret } from "@/api/secrets";
import {
  ADDON_OUTPUT_FIELDS,
  CLUSTER_WIDE_FIELDS,
  type AddonOutputField,
} from "@/pages/stacks/lib/addon-presets";
import { groupOutputs, type ParsedOutput } from "@/pages/stacks/lib/parse-output-key";

export type EnvFrom = FormEnvVarData["from"];

export type AddonBindingPatch = {
  addonId?: string;
  database?: string | null; // null = explicitly cleared (All databases)
  superuser?: boolean;
  credField?: AddonOutputField;
};

export type EnvRowErrors = {
  name?: string;
  value?: string;
  addonId?: string;
  database?: string;
  credField?: string;
  duplicate?: string;
};

interface EnvRowProps {
  row: FormEnvVarData;
  index: number;
  resourceIndex: number;
  secrets: Secret[];
  secretsLoading: boolean;
  addonNameById?: Map<string, string>;
  /** Sibling resources (excluding this one) for the Resource source picker. */
  resourceOptions?: { name: string; outputs: string[] }[];
  /** This resource's own declared outputs for the Self source picker. */
  selfOutputs?: string[];
  rowErrors?: EnvRowErrors;
  /** Diff status vs baseline. "modified" tints + shows reset; "added" stays neutral; "unchanged" stays neutral. */
  status?: "unchanged" | "modified" | "added";
  onChangeName: (name: string) => void;
  onChangeValue: (value: string) => void;
  onChangeFrom: (from: EnvFrom) => void;
  onChangeSecret: (secretId: string, secretKey: string) => void;
  onChangeAddon: (patch: AddonBindingPatch) => void;
  onChangeResource?: (resourceName: string, output: string) => void;
  onChangeSelf?: (selfOutput: string) => void;
  onBlur?: () => void;
  onRemove: () => void;
  /** When provided and row is "modified", clicking the reset arrow restores the row to baseline. */
  onReset?: () => void;
}

export function EnvRow({
  row,
  index,
  resourceIndex,
  secrets,
  secretsLoading,
  addonNameById,
  resourceOptions,
  selfOutputs,
  rowErrors,
  status = "unchanged",
  onChangeName,
  onChangeValue,
  onChangeFrom,
  onChangeSecret,
  onChangeAddon,
  onChangeResource,
  onChangeSelf,
  onBlur,
  onRemove,
  onReset,
}: EnvRowProps) {
  const isOrphanAddon =
    row.from === "addon" &&
    addonNameById !== undefined &&
    !!row.addonId &&
    !addonNameById.has(row.addonId);

  const isModified = status === "modified";
  const isAdded = status === "added";
  const isDirty = isModified || isAdded;
  return (
    <div
      /* **At rest the row is ON the sheet, not in a card.**
         It carried `border-border bg-background` — a grey panel per variable,
         on a white sheet, while Ports and Mounts render their members flush.
         Eleven of them turned the section into a stack of boxes and the border
         did the work the row's own alignment already does.

         The border STAYS, transparent: a row that gains a 1px edge on the
         keystroke that makes it dirty shifts every column 1px sideways. Only
         the ink changes. */
      /* **Full width, and the paint is what bleeds.** It carried
         `pl-[13px] pr-2.5`, so every control sat inset from the section's own
         content edge while Ports and Mounts reach it — a 400px panel cannot
         spare 24px to frame a row. The negative margin pushes the BOX out past
         the edge and the padding puts the controls back on it, so the tint and
         the bar have room to sit outside the grid without moving it.

         **The state edge is an OUTLINE, not a border** (§4). A border is part
         of the box, so `-mx-1.5 px-1.5` put the controls back 1px inside the
         section's edge instead of on it — measured, the row spanned 1053→1411
         against a content edge of 1052→1412. An outline paints outside the box
         and costs the grid nothing, and it also means a row cannot shift when
         it goes dirty, which is what the transparent border was there for. */
      className={`relative -mx-1.5 rounded-md px-1.5 py-1.5 transition-colors ${
        isOrphanAddon
          ? "bg-warn-bg outline-1 outline-warn-border"
          : isDirty
            ? "bg-change-bg outline-1 outline-change-border"
            : ""
      }`}
      data-testid={`env-row-${resourceIndex}-${index}`}
      onBlur={onBlur}
    >
      {/* 2px accent bar signalling row state. **`--change`, not brand**: this is
          the same "differs from what is deployed" the dirty rails, the count
          chip and the tab dots say, and it was the last mark in the editor
          still saying it in orange. */}
      <span
        aria-hidden
        className={`absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full ${
          isOrphanAddon ? "bg-warn" : isDirty ? "bg-change" : "bg-transparent"
        }`}
      />
      {/* items-start keeps every control top-aligned so a per-cell error (which
          grows that cell downward) never knocks the other columns out of line. */}
      {/* **6, the record gap — and the board's own grid** (`935:50009`):
          `100 · 6 · fill · 6 · fill · 6 · 32`. Name and Value both FLEX because
          neither has a bounded length; `From` is a closed set so it is fixed,
          and the remove button is the icon rung. `basis-0` is what makes the
          two fills EQUAL — from their own content they would split by how long
          `production` happens to be against `NODE_ENV`. */}
      <div className="flex items-start gap-1.5">
        {/* **From leads the row**, because it decides what the other two cells
            ARE — a plain value, a secret key, an addon field. It read third,
            after the two cells it governs. A closed set, so it is fixed at 100
            (the board's width for it) rather than sharing the flex. */}
        <div className="w-[100px] flex-none">
          <Select
            value={row.from}
            onValueChange={(v) => onChangeFrom(v as EnvFrom)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stack">Plain text</SelectItem>
              <SelectItem value="secret">Secret</SelectItem>
              <SelectItem value="addon">Addon</SelectItem>
              <SelectItem value="resource">Resource</SelectItem>
              {/* Template rows come from imports (composite values); not hand-authorable yet. */}
              {row.from === "resourceTemplate" && (
                <SelectItem value="resourceTemplate" disabled>
                  Template
                </SelectItem>
              )}
              <SelectItem value="self">Self</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key */}
        <div className="min-w-0 flex-1 basis-0">
          <Input
            id={`env-name-${resourceIndex}-${index}`}
            value={row.name || ""}
            onChange={(e) => onChangeName(e.target.value)}
            className={isOrphanAddon ? "opacity-60" : undefined}
            aria-invalid={!!(rowErrors?.duplicate || rowErrors?.name)}
            placeholder="KEY"
            readOnly={isOrphanAddon}
          />
          {(rowErrors?.duplicate || rowErrors?.name) && (
            <p className="text-meta text-danger mt-1">
              {rowErrors.duplicate || rowErrors.name}
            </p>
          )}
        </div>

        {/* Value */}
        <div className="min-w-0 flex-1 basis-0">
          {row.from === "stack" && (
            <Input
              value={row.value || ""}
              onChange={(e) => onChangeValue(e.target.value)}
              
              aria-invalid={!!rowErrors?.value}
              placeholder="value"
            />
          )}
          {row.from === "secret" && (
            <SecretValueCell
              secrets={secrets}
              loading={secretsLoading}
              secretId={row.secretId}
              secretKey={row.secretKey}
              onChange={onChangeSecret}
            />
          )}
          {row.from === "addon" &&
          (isOrphanAddon ? (
            <AddonOrphanReadOnly
              database={row.database}
              credField={row.credField}
              superuser={row.superuser}
            />
          ) : (
            <AddonCredFieldPicker
              credField={row.credField}
              onChange={(v) => onChangeAddon({ credField: v })}
              error={rowErrors?.credField}
              disabled={!row.addonId}
            />
          ))}
          {row.from === "resource" && (
            <ResourceOutputCell
              resourceOptions={resourceOptions ?? []}
              resourceName={row.resourceName}
              output={row.output}
              onChange={(rn, out) => onChangeResource?.(rn, out)}
            />
          )}
          {row.from === "resourceTemplate" && (
            <div className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5">
              {/* Not mono, and not `<code>` either: a reference expression is
                  neither a URL nor a source listing. §6 leaves mono for one
                  thing and this is not it. */}
              <span className="truncate text-meta">{row.template}</span>
              <span className="ml-auto flex-none text-label italic text-muted-foreground">
                {row.resourceName} · resolved at deploy
              </span>
            </div>
          )}
          {row.from === "self" && (
            <SelfOutputCell
              outputs={selfOutputs ?? []}
              selfOutput={row.selfOutput}
              onChange={(out) => onChangeSelf?.(out)}
            />
          )}
          {rowErrors?.value && (
            <p className="text-meta text-danger mt-1">{rowErrors.value}</p>
          )}
        </div>

        {/* Reset (modified existing row — restore baseline) or Remove (added/clean rows) */}
        {/* Packed straight after the last member at the icon-button rung, not
            pushed to the far edge — the hole in the middle is what stopped a
            row reading as one variable. */}
        {/* **Every control in this row is 32** — the board's own rung
            (`Select 100×32`, `Field 145×32`, `remove 32×32`). It ran three
            heights: `size="sm"` selects at 28, `Input` at 32, and a `size-7`
            override on the icon button putting it at 28. Three rungs in one
            32px strip, and the eye reads the row as ragged without being able
            to say why. `size="icon"` is already 32; the override was the bug. */}
        <div className="flex flex-none items-start">
          {isModified && onReset ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onReset}
              aria-label="Reset env var to original value"
              title="Reset to original value"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-danger-bg hover:text-danger"
              onClick={onRemove}
              aria-label={row.name ? `Remove ${row.name}` : "Remove env var"}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      {isOrphanAddon && (
        <p className="text-meta text-warn mt-1.5">
          Addon was deleted. This variable won't resolve. Remove to clean up.
        </p>
      )}
    </div>
  );
}

function SecretValueCell({
  secrets,
  loading,
  secretId,
  secretKey,
  onChange,
}: {
  secrets: Secret[];
  loading: boolean;
  secretId: string;
  secretKey: string;
  onChange: (secretId: string, secretKey: string) => void;
}) {
  const genericSecrets = secrets.filter((s) => s.type === "Generic");
  const selected = genericSecrets.find((s) => s.id === secretId);
  const availableKeys = selected?.data?.map((d) => d.key) || [];

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={secretId || ""}
        onValueChange={(value) => onChange(value, "")}
        disabled={loading || genericSecrets.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              genericSecrets.length === 0
                ? "No generic secrets available"
                : "select secret..."
            }
          />
        </SelectTrigger>
        <SelectContent>
          {genericSecrets.map((secret) => (
            <SelectItem key={secret.id} value={secret.id!}>
              {secret.name}
              {secret.description && (
                <span className="text-muted-foreground ml-2">
                  - {secret.description}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {secretId && (
        <Select
          value={secretKey || ""}
          onValueChange={(value) => onChange(secretId, value)}
          disabled={availableKeys.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                availableKeys.length === 0
                  ? "No keys available in secret"
                  : "select key..."
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableKeys.map((key) => (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function OutputOptions({ outputs }: { outputs: string[] }) {
  const { internal, public: pub } = groupOutputs(outputs);
  const renderItem = (o: ParsedOutput) => (
    <SelectItem key={o.key} value={o.key}>
      <span className="flex w-full items-center justify-between gap-2">
        <span>
          {o.label}
          {o.port ? <span className="text-muted-foreground"> · {o.port}</span> : null}
        </span>
        <span className="ml-2 flex items-center gap-2">
          <span className="text-label italic text-muted-foreground">resolved at deploy</span>
          <span className="rounded bg-muted px-1 text-label text-muted-foreground">{o.key}</span>
        </span>
      </span>
    </SelectItem>
  );
  return (
    <>
      <SelectGroup>
        <SelectLabel>🔒 Internal</SelectLabel>
        {internal.map(renderItem)}
      </SelectGroup>
      {pub.length > 0 && (
        <SelectGroup>
          <SelectLabel>🌐 Public</SelectLabel>
          {pub.map(renderItem)}
        </SelectGroup>
      )}
    </>
  );
}

function ResourceOutputCell({
  resourceOptions,
  resourceName,
  output,
  onChange,
}: {
  resourceOptions: { name: string; outputs: string[] }[];
  resourceName: string;
  output: string;
  onChange: (resourceName: string, output: string) => void;
}) {
  const selected = resourceOptions.find((r) => r.name === resourceName);
  const outputs = selected?.outputs ?? [];
  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={resourceName || ""}
        onValueChange={(v) => onChange(v, "")}
        disabled={resourceOptions.length === 0}
      >
        <SelectTrigger className="w-full" data-testid="resource-picker-trigger">
          <SelectValue placeholder={resourceOptions.length === 0 ? "No other resources" : "select resource..."} />
        </SelectTrigger>
        <SelectContent>
          {resourceOptions.map((r) => (
            <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {resourceName && (
        <Select value={output || ""} onValueChange={(v) => onChange(resourceName, v)} disabled={outputs.length === 0}>
          <SelectTrigger className="w-full" data-testid="resource-output-trigger">
            <SelectValue placeholder={outputs.length === 0 ? "No outputs" : "select output..."} />
          </SelectTrigger>
          <SelectContent>
            <OutputOptions outputs={outputs} />
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function SelfOutputCell({
  outputs,
  selfOutput,
  onChange,
}: {
  outputs: string[];
  selfOutput: string;
  onChange: (selfOutput: string) => void;
}) {
  return (
    <Select value={selfOutput || ""} onValueChange={onChange} disabled={outputs.length === 0}>
      <SelectTrigger className="w-full" data-testid="self-output-trigger">
        <SelectValue placeholder={outputs.length === 0 ? "No outputs declared" : "select output..."} />
      </SelectTrigger>
      <SelectContent>
        <OutputOptions outputs={outputs} />
      </SelectContent>
    </Select>
  );
}

function AddonOrphanReadOnly({
  database,
  credField,
  superuser,
}: {
  database?: string;
  credField?: string;
  superuser: boolean;
}) {
  const dbLabel = superuser ? "(superuser)" : database ?? "—";
  return (
    <div className="text-meta italic py-1.5 text-warn">
      ⚙ &lt;missing addon&gt; · {dbLabel} · {credField ?? "—"}
    </div>
  );
}

function AddonCredFieldPicker({
  credField,
  onChange,
  error,
  disabled,
}: {
  credField?: AddonOutputField;
  onChange: (v: AddonOutputField) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <Select
        value={credField || undefined}
        onValueChange={(v) => onChange(v as AddonOutputField)}
        disabled={disabled}
      >
        <SelectTrigger
          size="sm"
          className="w-full"
          aria-invalid={!!error}
          data-testid="field-picker-trigger"
        >
          <SelectValue placeholder={disabled ? "Pick an addon first" : "Select field"} />
        </SelectTrigger>
        <SelectContent>
          {ADDON_OUTPUT_FIELDS.map((f) => (
            <SelectItem key={f} value={f}>
              <span className="flex items-center gap-2">
                <span>{f}</span>
                {CLUSTER_WIDE_FIELDS.has(f) && (
                  <span className="text-label text-muted-foreground">
                    cluster
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-meta text-danger mt-1">{error}</p>}
    </div>
  );
}

