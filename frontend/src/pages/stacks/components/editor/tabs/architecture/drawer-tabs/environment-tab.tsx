import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertBanner, FieldShell, FormSection } from "@/components/branded";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, FileText, MoreHorizontal, Plug, Upload, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { envRowsDiff } from "@/pages/stacks/lib/stack-diff";

import type { FormEnvVarData } from "@/pages/stacks/schemas/form-schema";
import { EnvRow, type EnvFrom, type EnvRowErrors, type AddonBindingPatch } from "./env-row";
import { AddonTypeIcon } from "@/components/branded/addon-type-icon";
import type { PostgresAddon } from "@/api/addons";

interface StackResourceEnvironmentTabProps {
  index: number;
  envVars: FormEnvVarData[];
  baselineEnvVars: FormEnvVarData[] | undefined;
  errors: { [field: string]: string | undefined };
  /** Sibling resources (excluding this one), each with their declared outputs. */
  resourceOptions: { name: string; outputs: string[] }[];
  /** This resource's own declared outputs, for the Self source picker. */
  selfOutputs: string[];
  secrets: import("@/api/secrets").Secret[];
  secretsLoading: boolean;
  addons: PostgresAddon[];
  addonNameById: Map<string, string>;
  /** Replace the entire environment_variables array. Identity must be stable. */
  onChangeEnvVars: (next: FormEnvVarData[]) => void;
  /** Reset a single env row to its baseline value. */
  onDiscardEnvRow?: (envIdx: number) => void;
}

/** Full-width dashed "add row" affordance shared by the variable list and each addon group. */
/**
 * **`Add port` twenty lines away was already the answer.**
 *
 * This shipped as a hand-rolled `<button>`: a full-width dashed box at 12px in
 * `text-foreground/80`, with its own hover wash. Three things wrong with that —
 * it is a copy of a component the system already has (§2), it invented a fourth
 * type size for a control, and a full-bleed dashed rectangle reads as a drop
 * zone rather than as a button you press.
 *
 * `Button variant="outline"` with `self-start` is what the ports
 * section beside it uses for the identical job, so the two add-controls in one
 * panel now look like the same act.
 */
/** No glyph — `Add variable` says the whole act, and a ⊕ in front of it draws
 *  the same word twice. Same call as `Add port`, `Add mount` and `Add volume`. */
function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="self-start">
      {label}
    </Button>
  );
}

function StackResourceEnvironmentTabImpl({
  index,
  envVars,
  baselineEnvVars,
  errors,
  resourceOptions,
  selfOutputs,
  secrets,
  secretsLoading,
  addons,
  addonNameById,
  onChangeEnvVars,
  onDiscardEnvRow,
}: StackResourceEnvironmentTabProps) {
  // Per-row diff status for env vars, used to tint modified rows + render reset arrow.
  const envRowStatuses = useMemo(() => {
    if (!baselineEnvVars) return [] as ReturnType<typeof envRowsDiff>;
    return envRowsDiff(
      envVars as unknown as Array<Record<string, unknown>>,
      baselineEnvVars as unknown as Array<Record<string, unknown>>,
    );
  }, [envVars, baselineEnvVars]);

  const [dirtyEnvRows, setDirtyEnvRows] = useState<Set<number>>(new Set());
  /** The two bulk adds live behind a menu now, and a `DialogTrigger` cannot be
   *  a `DropdownMenuItem` — Radix races the menu's close against the dialog's
   *  mount and can leave `pointer-events: none` on `body`. Both dialogs are
   *  controlled, and the menu opens them one tick late. */
  const [pasteOpen, setPasteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const markEnvRowDirty = (envIdx: number) => {
    setDirtyEnvRows((prev) => {
      if (prev.has(envIdx)) return prev;
      const next = new Set(prev);
      next.add(envIdx);
      return next;
    });
  };

  // Helper: insert one literal env var.
  const addEnvVar = (next: FormEnvVarData = { from: "stack", name: "", value: "" }) => {
    onChangeEnvVars([...(envVars || []), next]);
  };

  // Helper: replace a single env-var row entirely.
  const replaceEnvVar = (envIdx: number, next: FormEnvVarData) => {
    onChangeEnvVars((envVars || []).map((env, i) => (i === envIdx ? next : env)));
  };

  const removeEnvVar = (envIdx: number) => {
    onChangeEnvVars((envVars || []).filter((_, i) => i !== envIdx));
  };

  /**
   * Returns how many variables were actually added, so the caller can report a
   * zero-result in its own dialog. A destructive toast used to fire here while
   * the paste box was still open — a complaint about a form it flew past.
   */
  const addMultipleEnvVars = (incoming: Array<{ name: string; value: string }>): number => {
    const filtered = incoming.filter((env) => env.name.trim() !== "");
    const existing = new Set((envVars || []).map((e) => e.name));
    const newVars: FormEnvVarData[] = filtered
      .filter((env) => !existing.has(env.name))
      .map((env) => ({ from: "stack" as const, name: env.name, value: env.value }));
    if (newVars.length === 0) return 0;
    onChangeEnvVars([...(envVars || []), ...newVars]);
    toast({
      title: "Environment variables added",
      description: `Added ${newVars.length} new environment variables.`,
      variant: "success",
    });
    return newVars.length;
  };

  // Produce a fresh env row for a chosen source, preserving the row's name.
  // Covers all five FormEnvVarData arms.
  const switchRowFrom = (envIdx: number, from: EnvFrom) => {
    const current = envVars?.[envIdx];
    if (!current) return;
    const name = current.name;
    if (from === "stack") {
      replaceEnvVar(envIdx, { from: "stack", name, value: "" });
    } else if (from === "secret") {
      replaceEnvVar(envIdx, { from: "secret", name, secretId: "", secretKey: "" });
    } else if (from === "addon") {
      replaceEnvVar(envIdx, {
        from: "addon",
        name,
        addonId: "",
        database: undefined,
        superuser: false,
        credField: undefined,
      });
    } else if (from === "resource") {
      replaceEnvVar(envIdx, { from: "resource", name, resourceName: "", output: "" });
    } else if (from === "self") {
      replaceEnvVar(envIdx, { from: "self", name, selfOutput: "" });
    }
  };

  // Per-row addon patch (credField / addonId / database / superuser).
  const onChangeAddonForRow = (envIdx: number, patch: AddonBindingPatch) => {
    const current = envVars?.[envIdx];
    if (!current) return;
    const base =
      current.from === "addon"
        ? current
        : { from: "addon" as const, name: current.name, addonId: "", superuser: false };
    const nextDatabase =
      patch.database === null
        ? undefined
        : patch.database === undefined
          ? base.database
          : patch.database;
    replaceEnvVar(envIdx, {
      ...base,
      addonId: patch.addonId ?? base.addonId,
      database: nextDatabase,
      superuser: patch.superuser ?? base.superuser,
      credField: patch.credField ?? base.credField,
    });
    markEnvRowDirty(envIdx);
  };

  const parseEnvContent = (content: string): Array<{ name: string; value: string }> =>
    content
      .split("\n")
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const [name, ...valueParts] = line.split("=");
        return { name: name.trim(), value: valueParts.join("=").trim() };
      });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      const content = e.target.result.toString();
      setImportError(
        addMultipleEnvVars(parseEnvContent(content)) === 0
          ? "Nothing new in that file — every variable in it is already set here."
          : null,
      );
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // What the closed section reports — a section that hides a list and does not
  // say how long it is forces you to open it to find out.

  /**
   * **One tool on the heading row, because only one of the three acts on the
   * group.**
   *
   * All three sat here and they did not fit: `Environment` + `none` + three
   * labelled buttons overran a 480px heading, and the label was printed under
   * `clear all`'s ✕. The fix is not to shrink them — it is `FormSection`'s own
   * rule, which was already written down:
   *
   * > Not for the control that ADDS a member. `Add port`, `Add variable` and
   * > `Add mount` stay at the end of the list they extend… a create button
   * > that jumps to the header stops pointing at its own result.
   *
   * `paste .env` and `import file` ADD MEMBERS — in bulk, but they add. They
   * belong at the foot beside `Add variable`, which is also where a reader
   * looking for "how do I get variables in here" is already looking. That
   * leaves the heading holding `clear all`, the one act that operates on the
   * group rather than extending it, and the collision goes with it.
   */
  const clearAll = (
    <>
      {/* **The primitive, not a chip.** These were three hand-rolled
          `<button>`s carrying their own border, their own 11px type and
          their own hover — a private copy of `Button` living in one tab,
          which is the thing §2 forbids. At `ghost`/`sm` they lose the
          border (three fewer lines in a panel that had too many), pick up
          the ladder's own 28px rung, and hover the way every other
          control in the drawer does. Only `clear all` keeps a colour, and
          only on approach: §10 scales the mark to the blast radius, and
          wiping every variable is the one destructive act in the group. */}
      <Button
        type="button"
        variant="ghost"
        className="text-fg-muted hover:bg-danger-bg hover:text-danger"
        onClick={() => {
          if (envVars?.length) {
            onChangeEnvVars([]);
            toast({
              title: "Environment variables cleared",
              description: "All environment variables have been removed.",
              variant: "success",
            });
          }
        }}
        disabled={!envVars?.length}
      >
        <X aria-hidden />
        clear all
      </Button>
    </>
  );

  /**
   * **The two bulk adds, behind one mark, beside `Add variable`.**
   *
   * They add to this group, so they belong at the foot of the list they extend
   * (`FormSection`'s own rule) — but three labelled controls on that row spend
   * most of a 480px panel on ways to do a thing you mostly do one row at a
   * time. `Add variable` keeps its words because it is the common act; the
   * other two fold behind a `⋯` that opens beside it.
   *
   * The dialogs render here unconditionally and are opened by state — see
   * `pasteOpen` / `importOpen` for why they cannot hang off the menu items.
   */
  const bulkAdds = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            /* **Not "more ways to add variables".** That is what it does, and
               it made two controls on one row answer to "add variable" — a
               screen reader user asking for the button by name got a choice of
               two, and the test suite hit the same ambiguity. Both items behind
               it read a file, so the menu is an import. */
            aria-label="Import variables"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[180px]">
          {/* One tick late, or the closing menu's `pointer-events` lock is the
              value the dialog saves and restores — see the state's note. */}
          <DropdownMenuItem onSelect={() => setTimeout(() => setPasteOpen(true), 0)}>
            <Copy aria-hidden />
            Paste .env
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTimeout(() => setImportOpen(true), 0)}>
            <Upload aria-hidden />
            Import file
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Paste .env button */}
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent size="work">
          <DialogBody>
            <DialogHeader>
              <DialogTitle>Paste environment variables</DialogTitle>
              <DialogDescription>
                One KEY=VALUE per line. Lines starting with # are ignored.
              </DialogDescription>
            </DialogHeader>
            <DialogSection>
              <FieldShell
                label="Variables"
                htmlFor={`env-paste-${index}`}
                help="Names already set on this service are skipped."
              >
                <Textarea
                  id={`env-paste-${index}`}
                  placeholder={
                    "DATABASE_URL=postgres://user:pass@localhost:5432/db\n" +
                    "API_KEY=your_api_key\n" +
                    "# NODE_ENV=development"
                  }
                  className="font-mono text-body min-h-[180px] w-full"
                  onChange={() => setPasteError(null)}
                />
              </FieldShell>
              {pasteError && <AlertBanner>{pasteError}</AlertBanner>}
            </DialogSection>
          </DialogBody>
          <DialogFooter>
            <Button
              onClick={() => {
                const textarea = document.getElementById(
                  `env-paste-${index}`,
                ) as HTMLTextAreaElement | null;
                const content = textarea?.value.trim();
                if (!content) {
                  setPasteError("Paste some KEY=VALUE lines first.");
                  return;
                }
                setPasteError(
                  addMultipleEnvVars(parseEnvContent(content)) === 0
                    ? "Nothing new to add — every name in that paste is already set here."
                    : null,
                );
              }}
            >
              Add variables
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Import from file button */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent size="ask">
          <DialogBody>
            <DialogHeader>
              <DialogTitle>Import environment variables</DialogTitle>
              <DialogDescription>
              Reads a .env file and adds any names not already set here.
              </DialogDescription>
            </DialogHeader>
            <DialogSection>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`env-file-upload-${index}`} className="text-body font-medium">
              Upload .env file
                </Label>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor={`env-file-upload-${index}`}
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-[var(--wash-hover)]"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileText className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-body text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="text-meta text-muted-foreground">Supports .env files</p>
                    </div>
                    <input
                      id={`env-file-upload-${index}`}
                      type="file"
                      accept=".env,text/plain"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
              {importError && <AlertBanner>{importError}</AlertBanner>}
            </DialogSection>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>  );

  return (
    <FormSection label="Environment">
      {/* 8, not 16: the header row, the list, its note and its add button are
          one subject, not four things in a column. */}
      <div className="flex flex-col gap-2">
        {/* Environment Variables Rows */}
        {(() => {
          // Live duplicate detection (always on, regardless of dirty state)
          const nameCounts = new Map<string, number>();
          envVars.forEach((r) => {
            const k = r.name?.trim();
            if (!k) return;
            nameCounts.set(k, (nameCounts.get(k) ?? 0) + 1);
          });
          const rowErrorsForIndex = (envIdx: number): EnvRowErrors | undefined => {
            const r = envVars[envIdx];
            if (!r) return undefined;
            const out: EnvRowErrors = {};
            if (r.name && (nameCounts.get(r.name.trim()) ?? 0) > 1) {
              out.duplicate = `Duplicate name "${r.name}"`;
            }
            const dirty = dirtyEnvRows.has(envIdx);
            const errPath = (field: string) =>
              errors[`execution_config.environment_variables.${envIdx}.${field}`];
            if (r.from === "addon") {
              if ((dirty || errPath("addonId")) && !r.addonId) out.addonId = "Pick an addon";
              if ((dirty || errPath("database")) && !r.superuser && !r.database)
                out.database = "Pick a database";
              if ((dirty || errPath("credField")) && !r.credField) out.credField = "Pick a field";
            }
            /**
             * **A row you just added is empty, not wrong.**
             *
             * `Add variable` appends `{ name: "", value: "" }`, which is dirty
             * against the baseline the instant it exists — so the row arrived
             * with `KEY` outlined in red and `Required` under it, before a
             * single character was typed. An error is a report on what you did;
             * there is nothing here yet to report on.
             *
             * The source did not matter, which is why the first attempt at this
             * failed: `errors` merges the SERVER's field errors with live zod
             * over the whole draft, and zod is quite right that a nameless
             * variable is invalid — it says so on the keystroke that creates
             * the row. So the guard sits in front of both.
             *
             * A row that has SOMETHING in it and no name is genuinely wrong and
             * says so. A blank one waits. **Nothing is hidden at the moment it
             * matters**: Deploy reads `deployFieldErrors`, a different path, and
             * the validation banner still lists the row by name.
             */
            const started = Object.entries(r).some(
              ([k, v]) => k !== "from" && typeof v === "string" && v.trim() !== "",
            );
            if (started && !r.name && (dirty || errPath("name"))) {
              out.name = errPath("name") ?? "Required";
            }
            // Server-reported value error (e.g. a backend validation reason pinned
            // to this env var by the autosave engine); always surfaced when present.
            const valueErr = errPath("value");
            if (valueErr) out.value = valueErr;
            return Object.keys(out).length === 0 ? undefined : out;
          };

          // "Add variable" appends a literal row; its own "From" selector then
          // switches the source. Shared by the empty state and the populated list.
          const addVariableButton = (
            <AddRowButton
              label="Add variable"
              onClick={() => addEnvVar({ from: "stack", name: "", value: "" })}
            />
          );

          /* The three ways in, on one row. `flex-wrap` because at 400 a ghost
             `paste .env` and `import file` beside a bordered `Add variable` is
             close to the full width — they drop rather than clip. */
          /**
           * **Adds on the left, the one destructive act on the right.**
           *
           * `clear all` came off the heading with the other two, but it is not
           * one of them: they extend the list and it empties it. Sharing a
           * cluster with `Add variable` would put "make one more" and "throw
           * them all away" a thumb apart. The row's own width is the gap.
           *
           * It renders only when there IS something to clear. A greyed-out
           * `clear all` under an empty list is an offer with a reason nobody
           * needs told — the empty state above it already says there is
           * nothing here.
           */
          const addRow = (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {addVariableButton}
                {bulkAdds}
              </div>
              {envVars.length > 0 && clearAll}
            </div>
          );

          if (envVars.length === 0) {
            /* The same empty state Ports and Mounts use: say what the group is
               for, then offer every way to fill it. */
            return (
              <div className="flex flex-col gap-4 pt-1">
                <div className="flex flex-col gap-0.5">
                  <p className="text-body font-medium text-fg-2">No variables</p>
                  <p className="text-meta text-fg-muted">
                    Configuration this service reads at start — connection strings, API keys, feature flags.
                  </p>
                </div>
                {addRow}
              </div>
            );
          }

          // Partition rows so all ungrouped (non-addon) rows render FIRST (in
          // their original order), then addon groups render LAST:
          //  - plain list => every non-addon row, keeping its true envIdx.
          //  - addon groups => addon rows sharing (addonId, database), in
          //    first-appearance order, each rendered inside a dashed-border
          //    wrapper with a group-level addon + database picker and an
          //    "Add binding" button.
          type AddonGroup = {
            addonId: string;
            database: string;
            items: { env: FormEnvVarData; envIdx: number }[];
          };
          const plainItems: { env: FormEnvVarData; envIdx: number }[] = [];
          const addonGroups: AddonGroup[] = [];
          const addonGroupByKey = new Map<string, AddonGroup>();
          envVars.forEach((env, envIdx) => {
            if (env.from === "addon") {
              const aid = env.addonId || "";
              const db = env.database || "";
              const key = `${aid}|${db}`;
              let g = addonGroupByKey.get(key);
              if (!g) {
                g = { addonId: aid, database: db, items: [] };
                addonGroupByKey.set(key, g);
                addonGroups.push(g);
              }
              g.items.push({ env, envIdx });
            } else {
              plainItems.push({ env, envIdx });
            }
          });

          const renderRow = ({ env, envIdx }: { env: FormEnvVarData; envIdx: number }) => (
            <EnvRow
              key={envIdx}
              row={env}
              index={envIdx}
              resourceIndex={index}
              secrets={secrets}
              secretsLoading={secretsLoading}
              addonNameById={addonNameById}
              resourceOptions={resourceOptions}
              selfOutputs={selfOutputs}
              rowErrors={rowErrorsForIndex(envIdx)}
              status={envRowStatuses[envIdx] ?? "unchanged"}
              onReset={onDiscardEnvRow ? () => onDiscardEnvRow(envIdx) : undefined}
              onChangeName={(name) => {
                replaceEnvVar(envIdx, { ...env, name });
              }}
              onChangeValue={(value) => {
                replaceEnvVar(envIdx, { from: "stack", name: env.name, value });
              }}
              onChangeFrom={(from) => {
                switchRowFrom(envIdx, from);
                markEnvRowDirty(envIdx);
              }}
              onChangeSecret={(secretId, secretKey) =>
                replaceEnvVar(envIdx, { from: "secret", name: env.name, secretId, secretKey })}
              onChangeAddon={(patch) => onChangeAddonForRow(envIdx, patch)}
              onChangeResource={(resourceName, output) =>
                replaceEnvVar(envIdx, { from: "resource", name: env.name, resourceName, output })}
              onChangeSelf={(selfOutput) =>
                replaceEnvVar(envIdx, { from: "self", name: env.name, selfOutput })}
              onBlur={() => markEnvRowDirty(envIdx)}
              onRemove={() => removeEnvVar(envIdx)}
            />
          );

          return (
            <>
              {plainItems.length > 0 && (
                <>
                  {/* **The headers ride the row's own grid**, or they are three
                      words floating over nothing. The board drew them on a
                      different one (116/140/140 at gap 4 against the row's
                      100/145/145 at gap 6) so `Name` sat 20px left of the field
                      it names — same numbers as the row here, and `-mx-1.5
                      px-1.5` puts them on the same edge the rows reach. */}
                  <div
                    aria-hidden
                    className="-mx-1.5 flex items-center gap-1.5 px-1.5 text-meta text-fg-muted"
                  >
                    <span className="w-[100px] flex-none">From</span>
                    <span className="min-w-0 flex-1 basis-0">Name</span>
                    <span className="min-w-0 flex-1 basis-0">Value</span>
                    <span className="w-8 flex-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">{plainItems.map(renderRow)}</div>
                </>
              )}
              {/* Sits directly below the plain rows so a new var appears at the
                  click point — and carries the bulk adds with it, because they
                  add to the same place. */}
              {addRow}
              {addonGroups.map((g, gIdx) => {
                const aid = g.addonId;
                const db = g.database;
                const selectedAddon = addons.find((a) => a.id === aid);
                const databases = ((selectedAddon?.spec as unknown as { databases?: { name?: string }[] })
                  ?.databases ?? []) as { name?: string }[];
                const name = aid ? (addonNameById?.get(aid) ?? aid) : null;

                const updateAllInGroup = (patch: { addonId?: string; database?: string | undefined }) => {
                  const next = (envVars || []).map((e, i) => {
                    if (g.items.some((it) => it.envIdx === i) && e.from === "addon") {
                      return { ...e, ...patch };
                    }
                    return e;
                  });
                  onChangeEnvVars(next);
                };

                // Disallow picking an (addon, db) combo that already has its own group.
                const usedDbsByAddon = new Map<string, Set<string>>();
                const usedAddonsByDb = new Map<string, Set<string>>();
                for (const og of addonGroups) {
                  if (og === g) continue;
                  if (og.addonId) {
                    if (!usedDbsByAddon.has(og.addonId)) usedDbsByAddon.set(og.addonId, new Set());
                    if (og.database) usedDbsByAddon.get(og.addonId)!.add(og.database);
                  }
                  if (og.database) {
                    if (!usedAddonsByDb.has(og.database)) usedAddonsByDb.set(og.database, new Set());
                    if (og.addonId) usedAddonsByDb.get(og.database)!.add(og.addonId);
                  }
                }
                const dbBlocked = (dbName: string) =>
                  aid !== "" && (usedDbsByAddon.get(aid)?.has(dbName) ?? false);
                const addonBlocked = (addonId: string) =>
                  db !== "" && (usedAddonsByDb.get(db)?.has(addonId) ?? false);

                const handleAddonChange = (newAid: string) => {
                  const a = addons.find((x) => x.id === newAid);
                  const dbs = ((a?.spec as unknown as { databases?: { name?: string }[] })?.databases ??
                []) as { name?: string }[];
                  const usedDbs = usedDbsByAddon.get(newAid) ?? new Set();
                  const firstFreeDb = dbs.find((d) => d.name && !usedDbs.has(d.name))?.name;
                  const newDb = dbs.length === 1 ? dbs[0].name : firstFreeDb;
                  updateAllInGroup({ addonId: newAid, database: newDb });
                };
                const handleDbChange = (newDb: string) => {
                  updateAllInGroup({ database: newDb });
                };
                const handleAddBinding = () => {
                  addEnvVar({
                    from: "addon",
                    name: "",
                    addonId: aid,
                    database: db || undefined,
                    superuser: false,
                    credField: undefined,
                  });
                };

                return (
                  <div
                    key={`a-${gIdx}-${aid}-${db}`}
                    className="relative mt-2 rounded-lg border border-border-strong bg-muted/20 px-2.5 pb-2.5 pt-6"
                    data-testid="env-addon-group"
                  >
                    <div className="absolute -top-3.5 left-3 inline-flex items-center gap-2 rounded-md bg-background px-1.5 py-0.5">
                      <span className="inline-flex items-center gap-1.5 text-[9.5px] font-semibold text-foreground/80">
                        <Plug className="size-3" />
                        Addon
                      </span>
                      <Select value={aid || undefined} onValueChange={handleAddonChange}>
                        <SelectTrigger
                          size="sm"
                          className="w-[180px] gap-2 text-meta"
                          data-testid="addon-picker-trigger"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {aid && <AddonTypeIcon type="postgres" size={14} />}
                            <SelectValue placeholder="Pick addon">
                              {aid ? name : undefined}
                            </SelectValue>
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {addons.length === 0 ? (
                            <div className="px-3 py-2 text-meta text-muted-foreground">
                              No add-ons on this stack. Add one from the canvas with Add resource.
                            </div>
                          ) : (
                            addons.map((a) => (
                              <SelectItem
                                key={a.id}
                                value={a.id!}
                                disabled={a.id !== aid && addonBlocked(a.id!)}
                              >
                                <span className="flex items-center gap-2">
                                  <AddonTypeIcon type="postgres" size={14} />
                                  <span>{a.name}</span>
                                  {a.id !== aid && addonBlocked(a.id!) && (
                                    <span className="ml-1 text-label text-muted-foreground">
                                  in use
                                    </span>
                                  )}
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {aid && (
                        <>
                          <span className="text-muted-foreground/60">·</span>
                          {databases.length > 1 ? (
                            <Select value={db || undefined} onValueChange={handleDbChange}>
                              <SelectTrigger
                                size="sm"
                                className="w-[140px] text-meta"
                                data-testid="database-picker-trigger"
                              >
                                <SelectValue placeholder="Pick database" />
                              </SelectTrigger>
                              <SelectContent>
                                {databases.map((d) =>
                                  d.name ? (
                                    <SelectItem
                                      key={d.name}
                                      value={d.name}
                                      disabled={d.name !== db && dbBlocked(d.name)}
                                    >
                                      {d.name}
                                      {d.name !== db && dbBlocked(d.name) && (
                                        <span className="ml-2 text-label text-muted-foreground">
                                      in use
                                        </span>
                                      )}
                                    </SelectItem>
                                  ) : null,
                                )}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-label text-muted-foreground">
                          db: {db || databases[0]?.name || "—"}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">{g.items.map(renderRow)}</div>
                    <div className="pt-1.5">
                      <AddRowButton label="Add binding" onClick={handleAddBinding} />
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>
    </FormSection>
  );
}

export const StackResourceEnvironmentTab = React.memo(StackResourceEnvironmentTabImpl);
