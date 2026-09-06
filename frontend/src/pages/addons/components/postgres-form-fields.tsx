import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { Disclosure, FieldGrid, FieldShell } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ObjectStore } from "@/api/object-stores";
import type { PostgresAddon } from "@/api/addons";

import type { PostgresAddonFormValues } from "../schemas/form-schema";
import { PLAN_PRESETS, type PlanId } from "../lib/plan-presets";
import { BackupConfigFields } from "./backup-config-fields";
import { RestoreInitFields } from "./restore-init-fields";

// Mirrors backend: pkg/worker/postgresaddon/image_catalog_reconciler.go
// (CloudNativePG images) and config/openapi/stackdome_api.yaml.
const POSTGRES_VERSIONS = [17, 16, 15, 14, 13];
const ADVANCED_DOCS_URL = "https://docs.stackdome.io/addons/postgres/advanced";

type FormErrors = Partial<Record<string, string>>;

interface Props {
  values: PostgresAddonFormValues;
  errors: FormErrors;
  isEdit: boolean;
  objectStores: ObjectStore[];
  storesLoading: boolean;
  restoreSources: PostgresAddon[];
  onChange: <K extends keyof PostgresAddonFormValues>(
    key: K,
    value: PostgresAddonFormValues[K],
  ) => void;
}

/** A section label and its hairline. Not a grey card — grey means pushed back
 *  into the frame (§3), and these are the page's own content.
 *
 *  `h3`, not a styled div: the drawer is a long form and its sections are the
 *  only structure in it. The visual treatment is unchanged. */
function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border-subtle -mx-5 border-t px-5 pt-4">
      <h3 className="text-body text-foreground font-medium">{children}</h3>
    </div>
  );
}

/**
 * The way out to the docs for what this form is asking about. Rendered in the
 * drawer footer's `leading` slot — see `DrawerActions`.
 *
 * **A `ghost` Button, not bare link text.** It shares a band with the primary,
 * and a naked underline-on-hover beside a 32px button reads as a stray sentence
 * that wandered into a control row. `ghost` gives it the row's height and a
 * target you can hit, and it is still the quietest material in §9 — transparent
 * until hover — so it never competes with the fill it sits opposite.
 *
 * The trailing mark is not decoration: this is the only control in the journey
 * that leaves the product, and §9 says a control that opens a new tab has to
 * say so.
 */
export function PostgresDocsLink() {
  return (
    // 32, the working rung (§8) — the same height as the primary it shares the
    // band with. `sm` put a 28 beside a 32 and the two read as different kinds
    // of thing.
    //
    // `-ml-3.5` pulls back the button's own 14 of label padding so the WORD
    // lands on the footer's 24 column. A ghost has no edge to align, so
    // aligning its box instead would leave the label inset from everything else
    // in the band (§9's optical padding).
    <Button variant="ghost" className="text-fg-muted -ml-3.5" asChild>
      <a
        href={ADVANCED_DOCS_URL}
        target="_blank"
        rel="noreferrer noopener"
        // "Documentation" alone does not say where it goes the moment a second
        // one exists anywhere in the product.
        aria-label="Postgres advanced settings documentation"
      >
        Documentation
        <ExternalLink />
      </a>
    </Button>
  );
}

/**
 * The Postgres form, as the body of a drawer.
 *
 * **What changed from the page, and why.** The page put two grey `Panel` cards
 * on the white sheet, which reads as "pushed back into the frame" (§3) and left
 * every field sitting in a well 1% below its own ground. It also grew a bespoke
 * `<table>` of radio buttons for the plan — a control that existed nowhere else
 * in the product (§2). Both are gone: sections are a rule and a label, and the
 * plan is a `Select`, because picking one of six named sizes is exactly what a
 * select is for.
 *
 * The schema, the payload builder and the validation are untouched.
 */
export function PostgresFormFields({
  values,
  errors,
  isEdit,
  objectStores,
  storesLoading,
  restoreSources,
  onChange,
}: Props) {
  const showCustomCompute = values.plan === "custom";
  /** Controlled so a parse error can force the group open — see the disclosure
   *  at the foot of this form. */
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <>
      {/* On edit the name is fixed, so it is not a field. A disabled input dims
          to the same tone its own placeholder uses, which made a filled name
          read as an empty one — and it was the third place on screen saying
          `orders-db`, after the drawer title and the description. §9: empty is
          not disabled, and a control that can never be operated is not a
          control. */}
      {!isEdit && (
        <FieldGrid>
          <FieldShell
            label="Name"
            htmlFor="addon-name"
            required
            span={2}
            /* Shortened when the drawer came down to 480. §8: if a hint cannot
               fit its column, change the copy before widening the field — and
               `…must start and end with a letter or number.` broke to leave
               `number.` alone on a second line, which is the case that rule
               names. Same constraint stated from the other side: if the
               alphabet is letters, numbers and hyphens, "starts and ends with a
               letter or number" and "cannot start or end with a hyphen" are the
               same sentence, and the second one fits. */
            hint="Lowercase letters, numbers and hyphens. Cannot start or end with a hyphen."
            error={errors.name}
          >
            <Input
              id="addon-name"
              value={values.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="main-db"
              className={cn("font-mono", errors.name ? "border-danger" : "")}
              aria-invalid={!!errors.name}
            />
          </FieldShell>
        </FieldGrid>
      )}

      {!isEdit && (
        <RestoreInitFields
          init={values.initialization}
          restoreSources={restoreSources}
          objectStores={objectStores}
          errors={errors}
          onChange={(next) => onChange("initialization", next)}
        />
      )}

      {/* Not on edit. With the name field gone, this rule would be the first
          thing in the body — a second hairline 20px under the header's, both
          drawn for the same boundary. On edit the whole form IS configuration,
          and the header already says so. */}
      {!isEdit && <SectionRule>Configuration</SectionRule>}

      {/* **`Plan` and `Storage size` share a row because they share a subject:
          how big it is.** CPU and memory come from the plan, disk comes from
          the field beside it — one question, answered in two boxes.

          They did not used to. `Plan` sat alone and `Storage size` was paired
          with `Version`, which is pairing by **count** — four fields, two rows —
          and it is the mistake the service step already learned: a disk size
          (*how big*) and a Postgres major version (*which engine*) have nothing
          to do with each other, so putting them on one line claims a relation
          that is not there. */}
      <FieldGrid>
        <FieldShell label="Plan" htmlFor="addon-plan" span={1}>
          <Select
            value={values.plan}
            onValueChange={(v) => onChange("plan", v as PlanId)}
          >
            <SelectTrigger id="addon-plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {/* Colon, not an em dash: the second half explains the first
                      (§6). This string renders six times, so it was the most
                      repeated piece of copy in the form. */}
                  {preset.id === "custom"
                    ? preset.label
                    : `${preset.label}: ${preset.cpu}, ${preset.memory}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>

        <FieldShell
          label="Storage size"
          htmlFor="storage-size"
          span={1}
          hint="Allocated disk in GB."
          error={errors.storageGB}
        >
          <Input
            id="storage-size"
            type="number"
            min={1}
            value={values.storageGB}
            onChange={(e) => onChange("storageGB", Number(e.target.value) || 0)}
            className={cn("font-mono", errors.storageGB ? "border-danger" : "")}
            aria-invalid={!!errors.storageGB}
          />
        </FieldShell>
      </FieldGrid>

      {showCustomCompute && (
        <FieldGrid>
          <FieldShell label="CPU request" htmlFor="cpu-req" span={1}>
            <Input
              id="cpu-req"
              placeholder="250m"
              value={values.customCpuRequest ?? ""}
              onChange={(e) => onChange("customCpuRequest", e.target.value)}
              className="font-mono"
            />
          </FieldShell>
          <FieldShell label="CPU limit" htmlFor="cpu-lim" span={1}>
            <Input
              id="cpu-lim"
              placeholder="500m"
              value={values.customCpuLimit ?? ""}
              onChange={(e) => onChange("customCpuLimit", e.target.value)}
              className="font-mono"
            />
          </FieldShell>
          <FieldShell label="Memory request" htmlFor="mem-req" span={1}>
            <Input
              id="mem-req"
              placeholder="512Mi"
              value={values.customMemoryRequest ?? ""}
              onChange={(e) => onChange("customMemoryRequest", e.target.value)}
              className="font-mono"
            />
          </FieldShell>
          <FieldShell
            label="Memory limit"
            span={1}
            htmlFor="mem-lim"
            error={errors.customCpuRequest}
          >
            <Input
              id="mem-lim"
              placeholder="1Gi"
              value={values.customMemoryLimit ?? ""}
              onChange={(e) => onChange("customMemoryLimit", e.target.value)}
              className="font-mono"
            />
          </FieldShell>
        </FieldGrid>
      )}

      {/* Alone, and not because nothing was left over — because nothing on this
          form shares its subject. */}
      <FieldGrid>
        <FieldShell label="Version" htmlFor="pg-version">
          <Select
            value={String(values.versionMajor)}
            onValueChange={(v) => onChange("versionMajor", Number(v))}
          >
            <SelectTrigger id="pg-version">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSTGRES_VERSIONS.map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {/* Mono on the version, Geist on the word. `PG 17` is a
                      machine value; `(default)` is a word, and mono makes a
                      word look like a value the user may not change — the
                      opposite of what a default is (§6). */}
                  <span className="font-mono">PG {v}</span>
                  {v === POSTGRES_VERSIONS[0] && (
                    <span className="text-fg-muted">(default)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
      </FieldGrid>

      {/* A switch and its sentence read as one statement, so the label sits
          beside the control rather than above it. That is `FieldShell inline`
          now, not a row hand-built here: these two used to carry their own
          label, hint and a `gap-0.5` that is 2px and sits on no rung of §8. */}
      <FieldGrid>
        {(
          [
            {
              id: "ha-toggle",
              label: "High availability",
              hint: "Replicated across 2 instances.",
              checked: values.highAvailability,
              set: (c: boolean) => onChange("highAvailability", c),
            },
            {
              id: "superuser-toggle",
              // The noun, not the act. "Generate" is what the switch does, and
              // a label that says it is the control's job written into its own
              // name — the row then reads as an instruction rather than a
              // setting. Same call as `Scheduled backups`.
              label: "Superuser credentials",
              hint: "By default the database only exposes a limited app user. Enable to also generate a privileged secret for migrations and admin tasks.",
              checked: values.superuserAccess,
              set: (c: boolean) => onChange("superuserAccess", c),
            },
          ] as const
        ).map((row) => (
          <FieldShell
            key={row.id}
            inline
            span={2}
            label={row.label}
            htmlFor={row.id}
            help={row.hint}
          >
            <Switch
              id={row.id}
              checked={row.checked}
              onCheckedChange={row.set}
            />
          </FieldShell>
        ))}
      </FieldGrid>

      {/* **A disclosure inside a form is a control, not a section.**
          This was a hand-rolled `SectionDisclosure` — a full-bleed band with
          its own rule and hover wash — and then briefly a `FormSection
          collapsible`, which is that same band from the primitive. Both give a
          few more fields of ONE subject the chrome of a whole section, and draw
          a rule across the drawer to do it.

          It is the `Disclosure` the stack editor's `Source` group and `New
          preview` use: a ghost button at its own width, `fg-2`, with a chevron
          that TURNS. Jaseem, August 2026 — "implement the same thing on addon
          and everywhere else we use chevrons to reveal more options". */}
      <Disclosure
        label={`Backups — ${values.backup.enabled ? "on" : "off"}`}
        defaultOpen={values.backup.enabled}
      >
        <BackupConfigFields
          values={values.backup}
          errors={{
            objectStoreId: errors["backup.objectStoreId"],
            schedule: errors["backup.schedule"],
          }}
          objectStores={objectStores}
          storesLoading={storesLoading}
          onChange={(next) => onChange("backup", next)}
        />
      </Disclosure>

      {/* **Opened by its own error.** The JSON is unmounted while closed, so a
          parse failure inside a shut group is a message nobody can reach. */}
      <Disclosure
        label="Advanced — cluster configuration JSON"
        open={advancedOpen || Boolean(errors.advancedJson)}
        onOpenChange={setAdvancedOpen}
      >
        {/* The error binds to the box it is about at 8 — 16 is the distance
            between two FIELDS, and these are one. */}
        <div className="flex flex-col gap-2">
          <Textarea
            id="advanced-json"
            rows={10}
            value={values.advancedJson}
            onChange={(e) => onChange("advancedJson", e.target.value)}
            placeholder={
              '{\n  "configuration": {\n    "parameters": { "max_connections": "200" }\n  }\n}'
            }
            className={cn(
              "text-meta [field-sizing:fixed] font-mono",
              errors.advancedJson ? "border-danger" : "",
            )}
            spellCheck={false}
          />
          {errors.advancedJson && (
            <p className="text-meta text-danger whitespace-pre-wrap">
              {errors.advancedJson}
            </p>
          )}
        </div>
      </Disclosure>
    </>
  );
}
