import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldGrid, FieldShell } from "@/components/branded";
import type { PostgresAddonFormValues } from "../schemas/form-schema";
import type { PostgresAddon } from "@/api/addons";
import type { ObjectStore } from "@/api/object-stores";
import { useSourceBackups } from "../hooks/use-source-backups";

type Initialization = PostgresAddonFormValues["initialization"];
type RestoreStore = Extract<
  Initialization,
  { type: "restore_from_object_store" }
>;
type RestoreBackup = Extract<
  Initialization,
  { type: "restore_from_backup" }
>;

type Props = {
  init: Initialization;
  restoreSources: PostgresAddon[];
  objectStores: ObjectStore[];
  errors: Partial<Record<string, string>>;
  onChange: (next: Initialization) => void;
};

const isRestore = (i: Initialization) =>
  i.type === "restore_from_object_store" || i.type === "restore_from_backup";

export function RestoreInitFields({
  init,
  restoreSources,
  objectStores,
  errors,
  onChange,
}: Props) {
  const sel = isRestore(init)
    ? (init as RestoreStore | RestoreBackup)
    : null;
  const sourceAddonId = sel?.sourceAddonId ?? "";
  const objectStoreId = sel?.objectStoreId ?? "";
  const resolvedStoreName =
    sel &&
    (objectStores.find((s) => s.id === objectStoreId)?.name ??
      objectStoreId);

  const selectedSource = restoreSources.find((a) => a.id === sourceAddonId);
  const sourceWalOn =
    selectedSource?.spec?.backup?.wal_archiving === true;

  const {
    backups: sourceBackups,
    loading: backupsLoading,
    error: backupsError,
  } = useSourceBackups(
    sel && !sourceWalOn && sourceAddonId ? sourceAddonId : undefined,
  );

  const storeArm = init.type === "restore_from_object_store" ? init : null;
  const backupArm = init.type === "restore_from_backup" ? init : null;

  const updateStore = (patch: Partial<Omit<RestoreStore, "type">>) =>
    onChange({
      type: "restore_from_object_store",
      sourceAddonId,
      objectStoreId,
      recoveryTargetTime: storeArm?.recoveryTargetTime,
      ...patch,
    });

  const updateBackup = (patch: Partial<Omit<RestoreBackup, "type">>) =>
    onChange({
      type: "restore_from_backup",
      sourceAddonId,
      objectStoreId,
      backupId: backupArm?.backupId ?? "",
      ...patch,
    });

  const onPickSource = (addonId: string) => {
    const src = restoreSources.find((a) => a.id === addonId);
    const osId = src?.spec?.backup?.object_store_id ?? "";
    if (src?.spec?.backup?.wal_archiving === true) {
      onChange({
        type: "restore_from_object_store",
        sourceAddonId: addonId,
        objectStoreId: osId,
      });
    } else {
      onChange({
        type: "restore_from_backup",
        sourceAddonId: addonId,
        objectStoreId: osId,
        backupId: "",
      });
    }
  };

  return (
    <>
      {/* One column, like every other plain choice. A bare FieldShell fills
          its flex parent, which put a three-option select at the drawer's full
          599 — the width says "this is a big decision" and it is not. */}
      <FieldGrid>
        <FieldShell
          label="Create"
          htmlFor="init-mode"
          // Shortened to fit one line in a 292 column. A hint that wraps to
          // leave one word alone on line two reads as a mistake, and the field
          // is not the place to spend a second line.
          hint="Start empty, or restore from a backup."
        >
          <Select
            value={isRestore(init) ? "restore" : "new"}
            onValueChange={(v) =>
              onChange(
                v === "restore"
                  ? {
                    type: "restore_from_object_store",
                    sourceAddonId: "",
                    objectStoreId: "",
                  }
                  : { type: "new" },
              )
            }
          >
            <SelectTrigger id="init-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New empty database</SelectItem>
              <SelectItem value="restore">Restore from backup</SelectItem>
            </SelectContent>
          </Select>
        </FieldShell>
      </FieldGrid>

      {/* Nothing to restore from. One sentence saying what is missing and how
          to get it — not two half-width fields, one holding a message and the
          other holding an em dash under a label that promises a value (§9:
          empty is not disabled, and it is not a blank field either). The hint
          went with it: "Addons that have an object store for backups" is the
          same fact the message already states. */}
      {sel && restoreSources.length === 0 && (
        <p className="text-meta text-fg-2 leading-relaxed">
          No addon has backups in an object store yet. Turn on backups for an
          existing addon first, then restore from it here.
        </p>
      )}

      {sel && restoreSources.length > 0 && (
        <FieldGrid>
          <FieldShell
            label="Source addon"
            span={1}
            htmlFor="restore-source"
            hint="Addons that have an object store for backups."
            error={errors["initialization.sourceAddonId"]}
          >
            <Select value={sourceAddonId || undefined} onValueChange={onPickSource}>
              <SelectTrigger id="restore-source">
                <SelectValue placeholder="Select an addon" />
              </SelectTrigger>
              <SelectContent>
                {restoreSources.map((a) => (
                  <SelectItem key={a.id ?? ""} value={a.id ?? ""}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>

          {/* A derived value, not a field you fill — but it sits on the field
              grid so it lines up, and at 32 so it sits on the control ladder.
              It was h-10, the one 40 left in the drawer. */}
          <FieldShell label="Object store" span={1}>
            <div className="text-body text-fg-2 flex h-8 items-center">
              {resolvedStoreName || "Set by the source addon"}
            </div>
          </FieldShell>

          {sourceAddonId && sourceWalOn && storeArm && (
            <>
              <FieldShell
                label="Recover to"
                span={1}
                hint="Latest restores to the most recent archived WAL."
              >
                <Select
                  value={
                    storeArm.recoveryTargetTime != null
                      ? "specific"
                      : "latest"
                  }
                  onValueChange={(v) =>
                    updateStore({
                      recoveryTargetTime:
                        v === "specific"
                          ? new Date().toISOString().slice(0, 19) + "Z"
                          : undefined,
                    })
                  }
                >
                  <SelectTrigger id="restore-pit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest</SelectItem>
                    <SelectItem value="specific">
                      Specific time (UTC)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>

              {storeArm.recoveryTargetTime != null && (
                <FieldShell
                  label="Target time (UTC)"
                  span={1}
                  htmlFor="restore-time"
                  error={errors["initialization.recoveryTargetTime"]}
                >
                  <Input
                    id="restore-time"
                    type="datetime-local"
                    className="font-mono"
                    value={storeArm.recoveryTargetTime?.replace(
                      /:\d{2}Z$/,
                      "",
                    )}
                    onChange={(e) =>
                      updateStore({
                        recoveryTargetTime: e.target.value
                          ? `${e.target.value}:00Z`
                          : undefined,
                      })
                    }
                  />
                </FieldShell>
              )}
            </>
          )}

          {sourceAddonId && !sourceWalOn && backupArm && (
            <FieldShell
              label="Backup"
              htmlFor="restore-backup"
              hint="WAL archiving was off, so point-in-time isn't available. Pick a completed backup."
              error={errors["initialization.backupId"]}
            >
              {backupsLoading ? (
                <p className="text-meta text-muted-foreground">Loading…</p>
              ) : backupsError ? (
                <p className="text-meta text-danger">{backupsError}</p>
              ) : sourceBackups.length === 0 ? (
                <p className="text-meta text-muted-foreground">
                  This addon has no completed backups to restore from.
                </p>
              ) : (
                <Select
                  value={backupArm?.backupId || undefined}
                  onValueChange={(backupId) => updateBackup({ backupId })}
                >
                  <SelectTrigger id="restore-backup">
                    <SelectValue placeholder="Select a backup" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceBackups.map((bk) => (
                      <SelectItem key={bk.id ?? ""} value={bk.id ?? ""}>
                        {bk.name ?? bk.id}
                        {bk.completed_at
                          ? ` · ${new Date(bk.completed_at).toLocaleString()}`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FieldShell>
          )}
        </FieldGrid>
      )}
    </>
  );
}
