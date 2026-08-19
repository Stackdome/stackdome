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
 * Keep in step with `pkg/validator/messages.go` and the patterns in
 * `pkg/validator/{stack,stackresource}`.
 */
export const NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const MAX_NAME_LENGTH = 63;

/** The rule at rest, under the control it constrains. */
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
