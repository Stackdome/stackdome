import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldGrid, FieldShell } from "@/components/branded";
import { Link } from "react-router-dom";
import cronstrue from "cronstrue";
import {
  buildCron,
  parseCron,
  normalizeCron,
  isValidCronArity,
  type Frequency,
  type ScheduleParts,
} from "../lib/cron-builder";
import type { BackupConfigFormValues } from "../schemas/backup-config-schema";
import type { ObjectStore } from "@/api/object-stores";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom (cron)" },
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const pad = (n: number) => String(n).padStart(2, "0");

function describeCron(expr: string): string | null {
  try {
    return cronstrue.toString(expr, { use24HourTimeFormat: true });
  } catch {
    return null;
  }
}

type Props = {
  values: BackupConfigFormValues;
  errors: Partial<Record<"objectStoreId" | "schedule", string>>;
  objectStores: ObjectStore[];
  storesLoading: boolean;
  onChange: (next: BackupConfigFormValues) => void;
};

export function BackupConfigFields({
  values,
  errors,
  objectStores,
  storesLoading,
  onChange,
}: Props) {
  const set = <K extends keyof BackupConfigFormValues>(
    k: K,
    val: BackupConfigFormValues[K],
  ) => onChange({ ...values, [k]: val });

  const noStores = !storesLoading && objectStores.length === 0;
  const parsed = parseCron(values.schedule);
  const scheduleArityOk = isValidCronArity(values.schedule);
  const description = scheduleArityOk ? describeCron(values.schedule) : null;
  const scheduleError =
    errors.schedule ||
    (values.schedule.trim() && !scheduleArityOk
      ? "Use 6 space-separated fields: sec min hour day-of-month month day-of-week (or @daily)."
      : undefined);

  // `frequency` is a UI mode that must survive even when the resulting cron
  // happens to match a builder shape (otherwise "Custom" snaps back). It only
  // re-syncs from the schedule on *external* changes (e.g. edit hydration),
  // tracked via the last value this component emitted.
  const lastEmitted = useRef<string | null>(null);
  const [mode, setMode] = useState<Frequency>(() => parsed.frequency);

  useEffect(() => {
    if (values.schedule !== lastEmitted.current) {
      setMode(parseCron(values.schedule).frequency);
      lastEmitted.current = values.schedule;
    }
  }, [values.schedule]);

  const parts: ScheduleParts = { ...parsed, frequency: mode };

  const clamp = (raw: string, min: number, max: number) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.trunc(n)));
  };

  const emit = (schedule: string) => {
    lastEmitted.current = schedule;
    onChange({ ...values, schedule });
  };

  const applyParts = (next: ScheduleParts) => {
    setMode(next.frequency);
    if (next.frequency === "custom") {
      // Switching into Custom keeps the current expression for editing.
      emit(parsed.custom);
    } else {
      emit(buildCron(next));
    }
  };

  return (
    <FieldGrid>
      {/* **The destination leads, because both capabilities ship to it.** It
          used to sit between the two switches, which read as though it belonged
          to `Enable scheduled backups` alone — but WAL archiving ships to the
          same store, and neither can do anything without one. A prerequisite
          shared by everything below it goes first. */}
      <FieldShell
        label="Object store"
        htmlFor="bk-objstore"
        error={errors.objectStoreId}
        hint={
          noStores ? (
            <>
              No object stores yet.{" "}
              <Link
                to="/object-stores"
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                Create one
              </Link>{" "}
              to enable backups.
            </>
          ) : undefined
        }
      >
        <Select
          value={values.objectStoreId}
          onValueChange={(v) => set("objectStoreId", v)}
          disabled={storesLoading || noStores}
        >
          <SelectTrigger id="bk-objstore">
            <SelectValue
              placeholder={storesLoading ? "Loading…" : "Select a destination"}
            />
          </SelectTrigger>
          <SelectContent>
            {objectStores
              .filter((s): s is typeof s & { id: string } => !!s.id)
              .map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </FieldShell>

      {/* **A switch, then what it turns on.** `Schedule` is a sub of this
          switch and it used to be two fields away, with the object store and
          WAL archiving between them — so the switch appeared to control nothing
          and the schedule appeared to belong to WAL.

          **`Scheduled backups`, not `Enable scheduled backups`.** A switch label
          names the thing; the switch itself says whether it is on. "Enable" was
          the control's job written into its own label, and it made the row read
          as an instruction rather than a setting.

          **The hint carries what the disabled region used to say.** There was a
          separate sentence below — *turn this on to set when they run* — that
          existed only to explain a greyed-out `Schedule`. With the schedule
          hidden until the switch is on, the sentence has nothing left to explain
          and belongs where the promise is made: on the switch. */}
      <FieldShell
        inline
        span={2}
        label="Scheduled backups"
        htmlFor="bk-enabled"
        // Two strings, because one cannot be true in both states. The promise —
        // *turn this on and you get to say when* — is only worth making while
        // the schedule is not on screen; once it is, the sentence describes a
        // field the reader is already looking at. Off keeps the promise, on
        // says what the switch would cost to undo.
        help={
          values.enabled
            ? "Backups run on the schedule below. Turn off for manual backups only."
            : "When off, only manual backups can run. Turn on to set when they run."
        }
      >
        <Switch
          id="bk-enabled"
          checked={values.enabled}
          onCheckedChange={(c) => set("enabled", c)}
        />
      </FieldShell>

      {/* **Hidden when the switch is off, not greyed out.** §9's "nothing is
          disabled without saying why" is about a control that refuses and does
          not explain — but a schedule for backups that do not run is not a
          refused control, it is a question that has not been asked yet. Greyed
          out it held six controls and a sentence on screen to say "these do not
          apply", which is more room spent denying the setting than the setting
          takes. The switch above now carries the promise in its own hint.

          **The schedule is one sentence, so it spans the grid.** `Daily` and the
          time it runs at answer one question — *when* — and they were stacked,
          which made two rows out of one answer and left the reader to work out
          that the second line belonged to the first. On one line it reads the
          way it is spoken: `Daily at 03:00`. Weekly adds its day in the same
          line, in the place the sentence puts it.

          It needs both columns to do that: at 292 the parts collapse and wrap
          back into the two rows this was fixing. */}
      {values.enabled && (
        <FieldShell
          label="Schedule"
          htmlFor="bk-frequency"
          span={2}
          error={scheduleError}
          hint={
            mode === "custom" && description ? (
              <span>
                {description} <span className="text-muted-foreground/70">(UTC)</span>
              </span>
            ) : undefined
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={parts.frequency}
              onValueChange={(v) => applyParts({ ...parts, frequency: v as Frequency })}
            >
              {/* `!` beats `FieldShell`'s fill, which is right for a field whose
                control IS the field and wrong for one part of a sentence. */}
              <SelectTrigger id="bk-frequency" className="w-40!">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {parts.frequency === "hourly" && (
              <label className="flex items-center gap-2 text-body text-muted-foreground">
              at minute
                <Input
                  type="number"
                  min={0}
                  max={59}
                  className="w-20 font-mono"
                  value={parts.minute}
                  onChange={(e) =>
                    applyParts({ ...parts, minute: clamp(e.target.value, 0, 59) })
                  }
                />
              </label>
            )}

            {(parts.frequency === "daily" ||
            parts.frequency === "weekly" ||
            parts.frequency === "monthly") && (
              <>
                {parts.frequency === "weekly" && (
                  <Select
                    value={String(parts.dayOfWeek)}
                    onValueChange={(v) =>
                      applyParts({ ...parts, dayOfWeek: Number(v) })
                    }
                  >
                    <SelectTrigger className="w-36!">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d, i) => (
                        <SelectItem key={d} value={String(i)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {parts.frequency === "monthly" && (
                  <label className="flex items-center gap-2 text-body text-muted-foreground">
                  day
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      className="w-20 font-mono"
                      value={parts.dayOfMonth}
                      onChange={(e) =>
                        applyParts({
                          ...parts,
                          dayOfMonth: clamp(e.target.value, 1, 31),
                        })
                      }
                    />
                  </label>
                )}
                <label className="flex items-center gap-2 text-body text-muted-foreground">
                at
                  <Input
                    type="time"
                    className="w-32 font-mono"
                    value={`${pad(parts.hour)}:${pad(parts.minute)}`}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":");
                      applyParts({
                        ...parts,
                        hour: clamp(h, 0, 23),
                        minute: clamp(m, 0, 59),
                      });
                    }}
                  />
                </label>
              </>
            )}

            {parts.frequency === "custom" && (
              <Input
                id="bk-schedule"
                className="font-mono"
                value={values.schedule}
                onChange={(e) => emit(e.target.value)}
                onBlur={(e) => emit(normalizeCron(e.target.value))}
                placeholder="0 0 3 * * *  (sec min hour dom mon dow)"
              />
            )}
          </div>
        </FieldShell>
      )}

      {/* Last, and on its own. It is a second, independent capability — not a
          setting of the scheduled backups above it — and nothing follows from
          it, so nothing should sit under it. */}
      <FieldShell
        inline
        span={2}
        label="WAL archiving"
        htmlFor="bk-wal"
        help="Continuously ships WAL segments. Required for point-in-time recovery."
      >
        <Switch
          id="bk-wal"
          checked={values.walArchiving}
          onCheckedChange={(c) => set("walArchiving", c)}
        />
      </FieldShell>

    </FieldGrid>
  );
}
