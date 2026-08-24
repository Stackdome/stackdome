import { Input } from "@/components/ui/input";
import { KeyValueRows } from "@/components/branded/key-value-rows";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSecrets } from "@/hooks/use-secrets";

export interface EnvVarFormRow {
  name: string;
  value: string;
}

interface EnvVarsEditorProps {
  value: EnvVarFormRow[];
  onChange: (rows: EnvVarFormRow[]) => void;
}

/** A value that is exactly one secret reference, e.g. "{{ secret.api-token }}".
 *  The name may be empty — that's a Secret-mode row whose secret isn't picked
 *  yet. Dots are allowed: the stackfile ref grammar accepts them in names. */
const EXACT_SECRET_REF = /^\{\{\s*secret\.([\w.-]*)\s*\}\}$/;

const secretRef = (name: string) => `{{ secret.${name} }}`;

/** Add/remove env-var list for preview configs. Each row's value is either a
 *  literal string or a reference to a saved org secret — the Secret source is
 *  sugar that writes the {{ secret.NAME }} form the backend already resolves
 *  into a secret connection at deploy; hand-typed refs still round-trip. */
export function EnvVarsEditor({ value, onChange }: EnvVarsEditorProps) {
  const { secrets } = useSecrets();
  const genericSecrets = secrets.filter((s) => s.type === "Generic");

  // The shared editor speaks {key, value}; this form has always called it
  // {name, value}. Adapted at the boundary rather than renaming the API the
  // preview-config payload is built from.
  const rows = value.map((r) => ({ key: r.name, value: r.value }));
  const emit = (next: { key: string; value: string }[]) =>
    onChange(next.map((r) => ({ name: r.key, value: r.value })));

  return (
    <KeyValueRows
      rows={rows}
      onChange={emit}
      makeRow={() => ({ key: "", value: "" })}
      addLabel="Add variable"
      keyPlaceholder="name"
      keyLabel="Variable name"
      removeLabel="Remove variable"
      valueLabel="Variable value"
      emptyTitle="No variables"
      /* **The `?` above already says "applied to every preview".** An empty
         state answers a different question — WHAT would go in here — so it
         names the kinds of value rather than repeating the behaviour two lines
         under the mark that states it. */
      emptyHint="Connection strings, API keys, feature flags — anything the stack reads from its environment."
      renderValue={(row, _i, update) => {
        const refMatch = EXACT_SECRET_REF.exec(row.value);
        if (!refMatch) {
          return (
            <Input
              value={row.value}
              onChange={(e) => update({ value: e.target.value })}
              placeholder="value"
              aria-label="Variable value"
              className="flex-1"
            />
          );
        }
        return (
          <Select
            value={refMatch[1] || ""}
            onValueChange={(name) => update({ value: secretRef(name) })}
          >
            <SelectTrigger aria-label="Secret" className="flex-1 text-meta">
              <SelectValue placeholder="Select secret…" />
            </SelectTrigger>
            <SelectContent>
              {genericSecrets.length === 0 && refMatch[1] === "" && (
                <div className="px-2 py-1.5 text-meta text-muted-foreground">
                  No secrets yet. Create one on the Secrets page.
                </div>
              )}
              {genericSecrets.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
              {/* A hand-typed ref to a secret that no longer exists stays selectable
                  so the row renders instead of blanking. */}
              {refMatch[1] !== "" && !genericSecrets.some((s) => s.name === refMatch[1]) && (
                <SelectItem value={refMatch[1]}>{refMatch[1]}</SelectItem>
              )}
            </SelectContent>
          </Select>
        );
      }}
      trailing={(row, _i, update) => (
        <Select
          value={EXACT_SECRET_REF.test(row.value) ? "secret" : "plain"}
          onValueChange={(source) =>
            update({ value: source === "secret" ? secretRef(genericSecrets[0]?.name ?? "") : "" })
          }
        >
          {/* **88, not 110.** The drawer came down from 640 to 480 and this
              chip is the only thing on the row with a fixed width, so it is the
              only thing that can give the value box its room back. `Plain` and
              `Secret` say what `Plain text` and `Secret` said; the column is
              headed by the field's own label either way.

              `!` because this row lives inside a `FieldShell`, whose fill rule
              reaches every descendant select — correctly, for the ordinary field
              whose control sits in a wrapper. Here it is wrong: `w-full` on a
              `flex-none` chip made it eat the row and squeezed the name box to
              26px. A control with a width of its own has to say so louder than
              the field. */}
          <SelectTrigger aria-label="Value source" className="w-[88px]! flex-none text-meta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plain">Plain</SelectItem>
            <SelectItem value="secret">Secret</SelectItem>
          </SelectContent>
        </Select>
      )}
    />
  );
}
