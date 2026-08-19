package validator

// Shared, user-facing wording for the DNS-label name rule.
//
// Four resource types enforce the same charset — a stack, a stack resource, an
// object store and a Postgres addon all become part of a Kubernetes object
// name, so all four are RFC 1123 DNS labels. They were explaining it four
// different ways, and one of them was not explaining it at all:
//
//	stack resource   "resource name 'Web API' must match
//	                  ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ and be at most 63 characters"
//	object store     "must be a valid DNS subdomain (lowercase letters, ...)"
//	postgres addon   "must be a valid DNS subdomain (lowercase letters, ...)"
//	stack            "can only contain lowercase letters, numbers, and hyphens,
//	                  and must start and end with a letter or number"
//
// The first printed a regular expression to somebody who typed a space in a
// name. The next two named an RFC concept the person filling in the form has no
// reason to know — "DNS subdomain" is not a thing you can act on. Only the last
// one said what to do, and it was the longest way of saying it.
//
// **Two forms of one sentence, and the difference is the mood.** The rule is
// stated as a hint under the field before anything is wrong, and repeated as an
// instruction when it has been broken — same words, imperative. A rule that only
// appears once you have got it wrong is a rule the product kept to itself.
const (
	// NameRuleHint states the rule at rest, under the control it constrains.
	NameRuleHint = "Lowercase letters, numbers and hyphens. Cannot start or end with a hyphen."
	// NameRuleBroken is the same rule in the imperative, replacing the hint.
	//
	// It names the hyphen positions as well as the alphabet: without it, `-web`
	// fails against a sentence that appears to permit it. Stated from this side
	// the two clauses are the same constraint, and "cannot start or end with a
	// hyphen" is the shorter half — see the same call in `FieldShell`'s hint.
	NameRuleBroken = "Use lowercase letters, numbers and hyphens. It cannot start or end with a hyphen."
)
