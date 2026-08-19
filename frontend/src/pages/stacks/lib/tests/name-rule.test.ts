import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_NAME_LENGTH,
  NAME_PATTERN,
  NAME_RULE_BROKEN,
  NAME_RULE_HINT,
} from "../name-rule";

/**
 * **Two copies of one rule, and this is what stops them drifting.**
 *
 * The browser mirrors the server's name rule so a bad name fails at the
 * keystroke instead of at save. A mirror is only useful while it matches, and
 * nothing about editing a Go regex would otherwise tell you a TypeScript one
 * exists — so the pair is asserted against the Go source itself rather than
 * against a second hand-written copy of the expected value.
 *
 * If this fails, the two sides disagree. Fix whichever is wrong; do not relax
 * the assertion.
 */
const repoRoot = resolve(__dirname, "../../../../../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

describe("the name rule matches the server's", () => {
  it("uses the same charset as pkg/validator/stackresource", () => {
    const go = read("pkg/validator/stackresource/input_rules.go");
    const match = go.match(/resourceNamePattern\s*=\s*regexp\.MustCompile\(`([^`]+)`\)/);
    expect(match, "resourceNamePattern not found — did the Go source move?").toBeTruthy();
    expect(NAME_PATTERN.source).toBe(match![1]);
  });

  it("uses the same charset as pkg/validator/stack", () => {
    const go = read("pkg/validator/stack/stack_validator.go");
    const match = go.match(/stackNamePattern\s*=\s*regexp\.MustCompile\(`([^`]+)`\)/);
    expect(match, "stackNamePattern not found — did the Go source move?").toBeTruthy();
    expect(NAME_PATTERN.source).toBe(match![1]);
  });

  it("uses the same cap as pkg/validator/stackresource", () => {
    const go = read("pkg/validator/stackresource/input_rules.go");
    const match = go.match(/maxResourceNameLength\s*=\s*(\d+)/);
    expect(match, "maxResourceNameLength not found — did the Go source move?").toBeTruthy();
    expect(MAX_NAME_LENGTH).toBe(Number(match![1]));
  });

  it("says the same words as pkg/validator/messages.go", () => {
    const go = read("pkg/validator/messages.go");
    const hint = go.match(/NameRuleHint\s*=\s*"([^"]+)"/);
    const broken = go.match(/NameRuleBroken\s*=\s*"([^"]+)"/);
    expect(hint, "NameRuleHint not found").toBeTruthy();
    expect(broken, "NameRuleBroken not found").toBeTruthy();
    expect(NAME_RULE_HINT).toBe(hint![1]);
    expect(NAME_RULE_BROKEN).toBe(broken![1]);
  });
});

describe("what the rule actually accepts", () => {
  it.each(["web", "orders-api", "a", "a1", "x-9-y"])("accepts %s", (name) => {
    expect(NAME_PATTERN.test(name)).toBe(true);
  });

  // Each of these is a mistake the browser used to accept and the API rejected.
  it.each([
    ["Web API", "capitals and a space"],
    ["-web", "leading hyphen"],
    ["web-", "trailing hyphen"],
    ["", "empty"],
    ["web_api", "underscore"],
    ["wéb", "non-ascii"],
  ])("rejects %s (%s)", (name) => {
    expect(NAME_PATTERN.test(name)).toBe(false);
  });
});
