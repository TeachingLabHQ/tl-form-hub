import { describe, expect, it } from "vitest";
import { coachLogSpec } from "./spec";
import { evaluateRule, parseRule, RuleSyntaxError, type Answer } from "./rules";

const run = (rule: string, answers: Record<string, Answer>, facts = {}) =>
  evaluateRule(parseRule(rule), (f) => answers[f], facts);

describe("parseRule", () => {
  it("parses every operator", () => {
    expect(parseRule("always")).toEqual({ type: "always" });
    expect(parseRule('a = "x"')).toEqual({ type: "test", field: "a", op: "=", value: "x" });
    expect(parseRule('a != "x"')).toEqual({ type: "test", field: "a", op: "!=", value: "x" });
    expect(parseRule('a in ["x", "y"]')).toEqual({ type: "test", field: "a", op: "in", values: ["x", "y"] });
    expect(parseRule('a not in ["x"]')).toEqual({ type: "test", field: "a", op: "not in", values: ["x"] });
    expect(parseRule('a includes "x"')).toEqual({ type: "test", field: "a", op: "includes", value: "x" });
    expect(parseRule('a includes any of ["x", "y"]')).toEqual({
      type: "test", field: "a", op: "includes any of", values: ["x", "y"],
    });
    expect(parseRule("a is answered")).toEqual({ type: "test", field: "a", op: "is answered" });
    expect(parseRule("a is blank")).toEqual({ type: "test", field: "a", op: "is blank" });
    expect(parseRule("@schoolHasSubSchools")).toEqual({ type: "fact", name: "schoolHasSubSchools" });
  });

  it("combines with AND / OR / NOT and parentheses", () => {
    expect(parseRule('NOT (a = "x" OR b = "y") and c is blank')).toEqual({
      type: "and",
      args: [
        {
          type: "not",
          arg: {
            type: "or",
            args: [
              { type: "test", field: "a", op: "=", value: "x" },
              { type: "test", field: "b", op: "=", value: "y" },
            ],
          },
        },
        { type: "test", field: "c", op: "is blank" },
      ],
    });
  });

  it("treats curly quotes (Sheets autocorrect) as straight quotes", () => {
    expect(parseRule("a = “x”")).toEqual(parseRule('a = "x"'));
  });

  it("keeps dotted IDs (second versions of a question) as one name", () => {
    expect(parseRule('sessionDate.pl is answered')).toMatchObject({ field: "sessionDate.pl" });
  });

  it.each([
    ['a = "x" AND b = "y" OR c = "z"', "Use parentheses when mixing AND and OR"],
    ['a = "x', "A quote is never closed"],
    ['a == "x"', "Expected quoted option text"],
    ["", "The rule is empty"],
    ['always AND a = "x"', '"always" must be the whole rule'],
    ['(a = "x"', 'Expected ")"'],
    ['a = "x" b', "Unexpected b after the end of the rule"],
    ["a in []", "Expected quoted option text"],
    ['a is "x"', 'Expected "answered" or "blank"'],
    ['a = "x" & b', 'Unexpected character "&"'],
  ])("rejects %s", (rule, message) => {
    expect(() => parseRule(rule)).toThrow(RuleSyntaxError);
    expect(() => parseRule(rule)).toThrow(message);
  });
});

describe("evaluateRule", () => {
  it("compares single answers", () => {
    expect(run('a = "x"', { a: "x" })).toBe(true);
    expect(run('a = "x"', { a: "y" })).toBe(false);
    expect(run('a in ["x", "y"]', { a: "y" })).toBe(true);
    expect(run('a not in ["x", "y"]', { a: "z" })).toBe(true);
  });

  it("treats a blank (or hidden) answer as matching != and not in", () => {
    expect(run('a != "Yes"', {})).toBe(true);
    expect(run('a not in ["x"]', { a: "" })).toBe(true);
    expect(run('a = "Yes"', {})).toBe(false);
  });

  it("checks multi-select answers with includes", () => {
    expect(run('a includes "x"', { a: ["x", "y"] })).toBe(true);
    expect(run('a includes "z"', { a: ["x", "y"] })).toBe(false);
    expect(run('a includes any of ["z", "y"]', { a: ["x", "y"] })).toBe(true);
    expect(run('a includes any of ["z"]', { a: [] })).toBe(false);
  });

  it("checks answered / blank and facts", () => {
    expect(run("a is answered", { a: ["x"] })).toBe(true);
    expect(run("a is blank", { a: [] })).toBe(true);
    expect(run("@f", {}, { f: true })).toBe(true);
    expect(run("@f", {}, {})).toBe(false);
  });
});

describe("spec rules", () => {
  // The export stores the tree built by the R parser; re-parsing each rule here
  // keeps the R and TypeScript parsers in lockstep.
  it.each(coachLogSpec.questions.map((q) => [q.id, q] as const))(
    "%s: the exported rule tree matches the TypeScript parser",
    (_id, q) => {
      expect(parseRule(q.showsWhen.text)).toEqual(q.showsWhen.ast);
    }
  );
});
