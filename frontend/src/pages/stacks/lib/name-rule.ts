import type React from "react";

/**
 * The DNS-label name rule — **the browser's copy of a rule the server owns.**
 *
 * A stack, a stack resource, an object store and a Postgres addon all become
 * part of a Kubernetes object name, so all four are RFC 1123 DNS labels:
 * lowercase alphanumerics and hyphens, starting and ending with an
 * alphanumeric, at most 63 characters.
 *
 * The browser did not check any of it. `name: z.string().min(1, "Required")`
 * was the whole of the client-side rule, so typing `Web API` was accepted here
 * and rejected by the API — **the round trip was what told you**, and what it
 * told you was a regular expression.
 *
 * ### This is a mirror, and mirrors drift
 *
 * The server stays the authority: it is the only place that can be trusted, and
 * it still rejects a bad name whatever the browser thinks. This copy exists so
 * a mistake is caught at the keystroke rather than at save. The pair is held
 * together by `name-rule.test.ts`, which asserts these values against the Go
 * source — if someone widens the charset on one side, that test fails rather
 * than a user discovering it.
 *
 * Keep in step with the server's own rule in `pkg/validator/{stack,
 * stackresource}`. A parity test used to hold the two together by reading the
 * Go source; it went with the rename work this branch pulled out, so the pairing
 * is a convention again rather than something enforced.
 */
export const NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const MAX_NAME_LENGTH = 63;

/**
 * The rule at rest — **the server's wording, mirrored.**
 *
 * Kept complete because it mirrors what the server says, and the
 * server answers clients that have none of the browser's typing rules. A CLI
 * can still POST `My Service`, and the sentence it gets back has to name the
 * whole rule.
 */
export const NAME_RULE_HINT = "Lowercase letters, numbers and hyphens. Cannot start or end with a hyphen.";

/**
 * The same rule in the imperative, replacing the hint once it is broken.
 *
 * Same words, different mood. A rule that only appears after you have got it
 * wrong is a rule the product kept to itself — so this is not new information
 * at the moment of failure, it is the thing you were already told, now phrased
 * as what to do about it.
 */
export const NAME_RULE_BROKEN = "Use lowercase letters, numbers and hyphens. It cannot start or end with a hyphen.";

export const NAME_TOO_LONG = `Use at most ${MAX_NAME_LENGTH} characters.`;

/**
 * **The rule, applied at the keystroke instead of reported after it.**
 *
 * The field told you "lowercase letters, numbers and hyphens" and then let you
 * type `My Service`, so the sentence was a warning about a mistake the control
 * was happy to help you make. Everything the rule permits has an obvious
 * intention behind it, so the field performs the intention rather than refusing
 * it:
 *
 * | You type | You get | Why |
 * |---|---|---|
 * | `A` | `a` | A capital is a name typed the way a person writes it, not a different name |
 * | a space | `-` | A space between words means the same thing a hyphen does here — it is the separator you reached for, in the charset we have |
 * | `_` | `-` | The other separator people reach for |
 * | `-` at the start | nothing | It cannot start with one, and there is no intention to perform: the character has nowhere valid to go |
 * | `@`, `.`, `/` | nothing | No sensible substitute exists, so it is dropped rather than guessed at |
 *
 * **A trailing hyphen is allowed while you type**, though the finished name may
 * not end in one. `orders-` is not a mistake — it is the state every hyphenated
 * name passes through on the way to being typed. Blocking it would make the
 * hyphen key dead in the only position anyone presses it. The rule is enforced
 * on the finished value by `NAME_PATTERN`, which is where it belongs.
 */
export function sanitizeName(raw: string): string {
  return raw
    .toLowerCase()
    // **A separator that follows a hyphen adds nothing.** Characters arrive one
    // at a time, so by the time the second space of `a  b` is typed the first
    // has already become a hyphen — and a plain "separators become a hyphen"
    // rule then produced `a--b`. This runs first so the run collapses whether
    // it is typed or pasted. A hyphen you typed YOURSELF is left alone, which
    // is why the pattern needs a separator on the right-hand side.
    .replace(/-[\s_]+/g, "-")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+/, "")
    .slice(0, MAX_NAME_LENGTH);
}

/**
 * The same transform, plus **where the caret ends up**.
 *
 * Rewriting a controlled input's value on every keystroke sends the caret to
 * the end, so correcting a typo in the middle of a name threw you to the end of
 * it — which is a worse failure than the one the sanitiser was added to fix.
 *
 * The text BEFORE the caret is sanitised on its own, and its length is where
 * the caret goes: whatever the transform did to those characters — dropped
 * them, replaced them, collapsed them — the count is the answer.
 */
export function sanitizeNameAt(raw: string, caret: number): { value: string; caret: number } {
  const value = sanitizeName(raw);
  const before = sanitizeName(raw.slice(0, caret));
  return { value, caret: Math.min(before.length, value.length) };
}

/**
 * Wire a name `<input>` to the rule.
 *
 * **The DOM is written before React re-renders, on purpose.** Setting
 * `el.value` and the selection synchronously means the element already holds
 * what the next render will produce, so React's commit is a no-op for this node
 * and the caret survives it. Restoring the caret in an effect afterwards puts it
 * back one frame late, which is visible as a jump.
 */
export function onNameInput(
  e: React.ChangeEvent<HTMLInputElement>,
  commit: (value: string) => void,
): void {
  const el = e.currentTarget;
  const { value, caret } = sanitizeNameAt(el.value, el.selectionStart ?? el.value.length);
  el.value = value;
  el.setSelectionRange(caret, caret);
  commit(value);
}
