import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_NAME_LENGTH,
  NAME_PATTERN,
  NAME_RULE_BROKEN,
  NAME_RULE_HINT,
  sanitizeName,
  sanitizeNameAt,
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

describe("the field performs the rule as you type", () => {
  it.each([
    ["Orders API", "orders-api", "a capital is the same name typed the way a person writes it"],
    ["my_service", "my-service", "an underscore is the other separator people reach for"],
    ["a  b", "a-b", "a run of separators is one separator"],
    ["a--b", "a--b", "but a hyphen you typed yourself is left alone"],
    ["-lead", "lead", "it cannot start with a hyphen, and there is nothing to perform"],
    ["---lead", "lead", "nor with several"],
    ["api@v2.1/beta", "apiv21beta", "no sensible substitute exists, so it is dropped"],
    ["Web  API_v2!", "web-api-v2", "all of it at once"],
  ])("%s -> %s", (raw, want) => {
    expect(sanitizeName(raw)).toBe(want);
  });

  it("lets a trailing hyphen stand WHILE typing", () => {
    // `orders-` is the state every hyphenated name passes through. Blocking it
    // makes the hyphen key dead in the only position anyone presses it; the
    // finished value is caught by NAME_PATTERN instead.
    expect(sanitizeName("orders-")).toBe("orders-");
    expect(NAME_PATTERN.test("orders-")).toBe(false);
  });

  it("caps at the server's length", () => {
    expect(sanitizeName("a".repeat(200))).toHaveLength(MAX_NAME_LENGTH);
  });

  it("everything it emits is either empty or a legal name", () => {
    for (const raw of ["Orders API", "my_service", "a  b", "-x", "@@@", "Ω-name", "UP-per_2"]) {
      const out = sanitizeName(raw);
      if (out === "" || out.endsWith("-")) continue; // both are legal mid-typing
      expect(NAME_PATTERN.test(out), `${raw} -> ${out}`).toBe(true);
    }
  });

  describe("and puts the caret where the typist left it", () => {
    it("keeps position when a separator is transformed", () => {
      // "orders|api", a space typed at the caret
      expect(sanitizeNameAt("orders api", 7)).toEqual({ value: "orders-api", caret: 7 });
    });

    it("does not jump to the end when a character is dropped", () => {
      expect(sanitizeNameAt("orders@api", 7)).toEqual({ value: "ordersapi", caret: 6 });
    });

    it("pulls back to the start when the leading hyphen is refused", () => {
      expect(sanitizeNameAt("-ab", 1)).toEqual({ value: "ab", caret: 0 });
    });
  });
});
