import { useEffect, useMemo, useState } from "react";
import { FieldShell } from "@/components/branded";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentOrganizationId } from "@/lib/common";
import { getSecrets, type Secret } from "@/api/secrets";
import { getErrorMessage } from "@/api/client";

type Props = {
  label: string;
  /** Renders the red `*`. Never hand-roll it into `label` — see below. */
  required?: boolean;
  hint?: string;
  value: { secret_id: string; key: string };
  onChange: (next: { secret_id: string; key: string }) => void;
  /**
   * Optional name of the key we typically expect inside the chosen secret.
   * If the selected secret doesn't contain a matching key, the picker surfaces
   * an advisory hint. It does NOT filter the dropdown options.
   */
  expectedKeyHint?: string;
  error?: string;
};

/**
 * One credential: the Generic secret, and the key inside it.
 *
 * **It is a `FieldShell`, not a copy of one.** It used to hand-roll the whole
 * shell — its own `<Label>`, its own help paragraph, three separate error
 * paragraphs, and its own required asterisk written into the label as
 * `<span className="text-name font-semibold text-danger">*</span>` at four call
 * sites. That asterisk is a feature the primitive already has (`required`), and
 * `font-semibold` is a weight §6 took off the scale. The hand-rolled version
 * also spelt the gap differently — `Access Key ID  *` sat wider than `Name*`
 * two fields above it.
 *
 * The bigger cost was the fill. `FieldShell` is the one place that makes a
 * `SelectTrigger` full width, and a picker built outside it never got the rule:
 * measured in `dev:mock`, the two selects came out **188 and 123** in a 710
 * column, so one form ended on **three** trailing edges — 553, 847 and 1075.
 * That is §8's seven-controls-five-edges failure, in one component.
 */
export function SecretKeyPicker({
  label,
  required,
  hint,
  value,
  onChange,
  expectedKeyHint,
  error,
}: Props) {
  const [secrets, setSecrets] = useState<Array<Secret & { id: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) return;
    let cancelled = false;
    setLoading(true);
    getSecrets(orgId)
      .then((res) => {
        if (cancelled) return;
        setSecrets(
          (res.items ?? []).filter(
            (s): s is Secret & { id: string } => !!s.id && s.type === "Generic",
          ),
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setFetchError(getErrorMessage(e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSecret = useMemo(
    () => secrets.find((s) => s.id === value.secret_id),
    [secrets, value.secret_id],
  );

  const availableKeys = useMemo(
    () => (selectedSecret?.data ?? []).map((d) => d.key),
    [selectedSecret],
  );
  const keyMissing =
    !!value.key && availableKeys.length > 0 && !availableKeys.includes(value.key);

  /**
   * **`empty ≠ disabled`.** With no Generic secrets there is nothing to choose,
   * so the row says how to get options rather than greying the control out and
   * leaving the user to guess what would fill it.
   */
  const noSecrets = !loading && !fetchError && secrets.length === 0;

  const hintNode = fetchError
    ? undefined
    : noSecrets
      ? "No Generic secrets yet. Create one on the Secrets page, then pick it here."
      : keyMissing
        ? undefined
        : expectedKeyHint && selectedSecret && !availableKeys.includes(expectedKeyHint)
          ? `Usually named ${expectedKeyHint}. The secret you picked does not have that key.`
          : hint;

  const errorNode =
    fetchError ??
    (keyMissing ? "That key is no longer in the secret you picked." : error);

  return (
    <FieldShell label={label} required={required} hint={hintNode} error={errorNode}>
      {/* 16, not 8 — this is the gap between two boxes, which is the ladder's
          default and what `FieldGrid` uses one level up. At 8 the two selects
          read as one segmented control rather than as a secret and a key. */}
      <div className="grid grid-cols-2 gap-4">
        <Select
          value={value.secret_id}
          onValueChange={(v) => onChange({ secret_id: v, key: "" })}
          disabled={loading}
        >
          <SelectTrigger aria-label={`${label}: secret`}>
            <SelectValue placeholder={loading ? "Loading secrets…" : "Secret"} />
          </SelectTrigger>
          <SelectContent>
            {secrets.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.key}
          onValueChange={(v) => onChange({ secret_id: value.secret_id, key: v })}
          disabled={!selectedSecret}
        >
          <SelectTrigger aria-label={`${label}: key`}>
            <SelectValue placeholder="Key" />
          </SelectTrigger>
          <SelectContent>
            {availableKeys.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
            {selectedSecret && availableKeys.length === 0 && (
              <div className="px-3 py-2 text-meta text-muted-foreground">
                That secret holds no keys.
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    </FieldShell>
  );
}
