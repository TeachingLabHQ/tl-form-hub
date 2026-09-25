// Shared by the spec tests: builds the combinations of answers a question's
// visibility depends on, so the spec's rule and the code's predicates can be
// compared exhaustively over them. Not used by the app.

import {
  EMPTY_COACHEE_ROW,
  INITIAL_VALUES,
  type CoachLogValues,
} from "../hooks/use-coach-log-form";
import { ruleLiterals, ruleReferences, type Answer } from "./rules";
import {
  OPTIONS_TAB,
  type Answers,
  type CoachLogSpec,
  type SpecQuestion,
} from "./spec";

/** Fields the code gates whole sections on; always varied, so a code
 * predicate that checks one of them where the spec doesn't still shows up. */
export const BASE_FIELDS = ["district", "nycCoachType", "canceled"];

export type Assignment = { answers: Answers; facts: Record<string, boolean> };

export function questionsFor(spec: CoachLogSpec, field: string): SpecQuestion[] {
  return spec.questions.filter((q) => q.field === field);
}

/** Every field and fact the given questions' visibility depends on, following
 * the chain up through each referenced question's own rule. */
export function dependencyClosure(
  spec: CoachLogSpec,
  ids: string[]
): { fields: string[]; facts: string[] } {
  const fields = new Set<string>();
  const facts = new Set<string>();
  const queue = ids.map((id) => spec.questions.find((q) => q.id === id)!);
  while (queue.length) {
    const q = queue.pop()!;
    const refs = ruleReferences(q.showsWhen.ast);
    refs.facts.forEach((f) => facts.add(f));
    for (const f of refs.fields) {
      if (fields.has(f)) continue;
      fields.add(f);
      queue.push(...questionsFor(spec, f));
    }
  }
  return { fields: [...fields], facts: [...facts] };
}

const subsets = <T>(items: T[]): T[][] =>
  items.reduce<T[][]>((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]);

/** Option text any rule compares this field against. */
function referencedLiterals(spec: CoachLogSpec, field: string): string[] {
  const out = new Set<string>();
  for (const q of spec.questions) {
    for (const l of ruleLiterals(q.showsWhen.ast)) if (l.field === field) out.add(l.text);
  }
  return [...out];
}

/**
 * The answers to try for a field: blank, every option of a single select, and
 * for a multi select every combination of the options rules mention (plus one
 * they don't) and each option alone. Districts/schools are the labels rules
 * mention plus one they don't, or every label with `allLabels`.
 */
export function answerDomain(
  spec: CoachLogSpec,
  field: string,
  { allLabels = false } = {}
): Answer[] {
  const qs = questionsFor(spec, field);
  const type = qs[0]!.type;
  const labels = spec.referenceLabels[field];
  if (labels) {
    const used = referencedLiterals(spec, field);
    const other = labels.find((l) => !used.includes(l));
    return ["", ...(allLabels ? labels : [...used, ...(other ? [other] : [])])];
  }
  if (type === "yes-no") return ["", "Yes", "No"];
  const options = qs.flatMap((q) =>
    q.optionsFrom === OPTIONS_TAB ? q.options.map((o) => o.text) : []
  );
  if (type === "multi select") {
    if (options.length === 0) return [[], ["value"]];
    const used = referencedLiterals(spec, field);
    const extra = options.find((o) => !used.includes(o));
    const combos = subsets([...used, ...(extra ? [extra] : [])]);
    const singles = options.map((o) => [o]);
    const seen = new Set<string>();
    return [...combos, ...singles].filter((c) => {
      const key = [...c].sort().join("\u0000");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (options.length > 0) return ["", ...options];
  return ["", "value"];
}

/** Every combination of answers over `fields` (and true/false for `facts`). */
export function* assignments(
  spec: CoachLogSpec,
  fields: string[],
  facts: string[],
  opts: { allLabels?: boolean } = {}
): Generator<Assignment> {
  const domains = fields.map((f) => answerDomain(spec, f, opts));
  const factCombos = subsets(facts);
  const idx = new Array(fields.length).fill(0);
  while (true) {
    const answers: Answers = {};
    fields.forEach((f, i) => (answers[f] = domains[i]![idx[i]]));
    for (const on of factCombos) {
      yield {
        answers,
        facts: Object.fromEntries(facts.map((f) => [f, on.includes(f)])),
      };
    }
    let k = 0;
    while (k < fields.length && ++idx[k] === domains[k]!.length) idx[k++] = 0;
    if (k === fields.length) return;
  }
}

export function assignmentCount(
  spec: CoachLogSpec,
  fields: string[],
  facts: string[],
  opts: { allLabels?: boolean } = {}
): number {
  return fields.reduce((n, f) => n * answerDomain(spec, f, opts).length, 2 ** facts.length);
}

const MAX_COMBINATIONS = 60_000;

/** Every combination of the answers the given questions' visibility depends
 * on (plus the section-level BASE_FIELDS). Uses every district label when
 * that's affordable, otherwise the labels rules mention plus one they don't. */
export function combinationsForQuestions(spec: CoachLogSpec, ids: string[]) {
  const { fields, facts } = dependencyClosure(spec, ids);
  const all = [...new Set([...BASE_FIELDS, ...fields])];
  const allLabels = assignmentCount(spec, all, facts, { allLabels: true }) <= MAX_COMBINATIONS;
  return { iter: () => assignments(spec, all, facts, { allLabels }), fields: all, facts };
}

/** Form values with the given answers filled in over the empty form. */
export function toFormValues(answers: Answers): CoachLogValues {
  const values = structuredClone(INITIAL_VALUES) as Record<string, unknown>;
  for (const [field, value] of Object.entries(answers)) {
    if (field in values) values[field] = value ?? (Array.isArray(values[field]) ? [] : "");
  }
  values.coacheeRows = [{ ...EMPTY_COACHEE_ROW }];
  return values as CoachLogValues;
}
