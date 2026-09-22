// ---------------------------------------------------------------------------
// Coach Log Question Spec — the generated coach-log.spec.json and helpers to
// read it. The JSON is exported from the "Coaching Log — Question Spec (FY27)"
// Google Sheet by scripts/spec/export_spec.R; never edit it by hand.
//
// For now the form does not render from this file — it mirrors the code, and
// the co-located tests fail when the two drift apart.
// ---------------------------------------------------------------------------

import specJson from "./coach-log.spec.json";
import {
  evaluateRule,
  ruleLiterals,
  ruleReferences,
  type Answer,
  type RuleNode,
} from "./rules";

export const QUESTION_TYPES = [
  "single select",
  "multi select",
  "yes-no",
  "short text",
  "long text",
  "date",
  "repeating group",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const OPTIONS_TAB = "Options tab";
export const YES_NO = ["Yes", "No"];

export type SpecOption = {
  text: string;
  order: number;
  exclusive: boolean;
  opensWriteIn: boolean;
  link: string;
};

export type SpecQuestion = {
  id: string;
  /** Form field the answer lives in. Equals `id`, except for a second version
   * of a question ("sessionDate.pl" -> "sessionDate"). */
  field: string;
  /** Set on the child questions of a repeating group ("coacheeRows"). */
  repeatingGroup: string | null;
  shortName: string;
  section: string;
  block: string;
  order: number;
  text: string;
  helper: string;
  type: QuestionType;
  optionsFrom: string;
  maxSelections: number | null;
  required: boolean;
  showsWhen: { text: string; ast: RuleNode };
  mondayColumn: string;
  notes: string;
  options: SpecOption[];
};

export type CoachLogSpec = {
  specVersion: string;
  source: {
    spreadsheetId: string;
    spreadsheetUrl: string;
    driveVersion: string;
    modifiedTime: string;
  };
  exportedAt: string;
  facts: { name: string; description: string }[];
  /** Labels of questions whose options come from outside the sheet (district,
   * school), so rules can be checked against them. */
  referenceLabels: Record<string, string[]>;
  questions: SpecQuestion[];
  changelog: { version: string; date: string; summary: string; prLink: string }[];
};

export const coachLogSpec = specJson as unknown as CoachLogSpec;

export type Answers = Record<string, Answer>;

/**
 * Which questions are shown for a set of answers. A hidden question counts as
 * blank for every later rule, so hiding a parent hides everything under it.
 */
const fieldIndexes = new WeakMap<CoachLogSpec, Map<string, SpecQuestion[]>>();
const fieldIndex = (spec: CoachLogSpec) => {
  let index = fieldIndexes.get(spec);
  if (!index) {
    index = new Map();
    for (const q of spec.questions) {
      index.set(q.field, [...(index.get(q.field) ?? []), q]);
    }
    fieldIndexes.set(spec, index);
  }
  return index;
};

export function createVisibility(
  spec: CoachLogSpec,
  answers: Answers,
  facts: Record<string, boolean> = {}
) {
  const byField = fieldIndex(spec);
  const memo = new Map<string, boolean>();

  const fieldShown = (field: string): boolean =>
    (byField.get(field) ?? []).some((q) => isShown(q));
  const get = (field: string): Answer =>
    fieldShown(field) ? answers[field] : undefined;
  const isShown = (q: SpecQuestion): boolean => {
    const cached = memo.get(q.id);
    if (cached !== undefined) return cached;
    const shown = evaluateRule(q.showsWhen.ast, get, facts);
    memo.set(q.id, shown);
    return shown;
  };

  return {
    isShown: (id: string) => {
      const q = spec.questions.find((x) => x.id === id);
      if (!q) throw new Error(`Unknown question ${id}`);
      return isShown(q);
    },
    fieldShown,
    /** The answer as later rules see it (blank when hidden). */
    get,
  };
}

/** Allowed option text for a field, or null when any text is allowed. */
export function allowedLiterals(
  spec: CoachLogSpec,
  field: string
): string[] | null {
  const questions = spec.questions.filter((q) => q.field === field);
  if (questions.length === 0) return [];
  if (questions.every((q) => q.type === "yes-no")) return YES_NO;
  if (spec.referenceLabels[field]) return spec.referenceLabels[field]!;
  if (questions.some((q) => q.optionsFrom === OPTIONS_TAB))
    return questions.flatMap((q) => q.options.map((o) => o.text));
  return null;
}

/**
 * Structural checks the export also runs: references point at earlier
 * questions, option text exists, operators suit the question type, and write-in
 * options have a follow-up question. Returns human-readable problems.
 */
export function validateSpec(spec: CoachLogSpec): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const factNames = new Set(spec.facts.map((f) => f.name));
  const selectTypes = new Set<QuestionType>(["single select", "multi select"]);

  spec.questions.forEach((q, index) => {
    const at = `${q.id}:`;
    if (ids.has(q.id)) errors.push(`${at} duplicate ID`);
    ids.add(q.id);
    if (!QUESTION_TYPES.includes(q.type)) errors.push(`${at} unknown type "${q.type}"`);
    if (index > 0 && q.order <= spec.questions[index - 1]!.order)
      errors.push(`${at} Order must be higher than the question before it`);

    const dot = q.id.indexOf(".");
    const prefix = dot === -1 ? null : q.id.slice(0, dot);
    const group = prefix
      ? spec.questions.find((x) => x.id === prefix && x.type === "repeating group")
      : undefined;
    const expectedField = group ? q.id : (prefix ?? q.id);
    if (q.field !== expectedField)
      errors.push(`${at} field should be "${expectedField}"`);
    if ((q.repeatingGroup ?? null) !== (group ? group.id : null))
      errors.push(`${at} repeatingGroup should be ${group ? `"${group.id}"` : "null"}`);

    if (q.optionsFrom === OPTIONS_TAB) {
      if (!selectTypes.has(q.type))
        errors.push(`${at} only select questions can have options on the Options tab`);
      if (q.options.length === 0) errors.push(`${at} has no options on the Options tab`);
    } else if (q.options.length > 0) {
      errors.push(`${at} has options but "Options from" is not "${OPTIONS_TAB}"`);
    }
    if (q.maxSelections !== null && q.type !== "multi select")
      errors.push(`${at} Max selections only applies to multi select questions`);
    const texts = q.options.map((o) => o.text);
    if (new Set(texts).size !== texts.length) errors.push(`${at} duplicate option text`);

    // Rule references: earlier questions only, and never a repeating-group child.
    const { fields, facts } = ruleReferences(q.showsWhen.ast);
    for (const field of fields) {
      const earlier = spec.questions
        .slice(0, index)
        .filter((x) => x.field === field);
      if (earlier.length === 0) {
        const exists = spec.questions.some((x) => x.field === field);
        errors.push(
          exists
            ? `${at} rule refers to ${field}, which comes later in the form`
            : `${at} rule refers to ${field}, which is not a question ID`
        );
      } else if (earlier.some((x) => x.repeatingGroup)) {
        errors.push(`${at} rules can't refer to a question inside a repeating group (${field})`);
      }
    }
    for (const name of facts) {
      if (!factNames.has(name)) errors.push(`${at} unknown fact @${name}`);
    }

    // Operator fits the referenced question's type; option text exists.
    const checkTypes = (node: RuleNode) => {
      if (node.type === "and" || node.type === "or") node.args.forEach(checkTypes);
      else if (node.type === "not") checkTypes(node.arg);
      else if (node.type === "test") {
        const target = spec.questions.find((x) => x.field === node.field);
        if (!target) return;
        const multi = target.type === "multi select";
        const listOp = node.op === "includes" || node.op === "includes any of";
        const valueOp = node.op !== "is answered" && node.op !== "is blank";
        if (valueOp && multi && !listOp)
          errors.push(`${at} ${node.field} allows several answers — use "includes" instead of "${node.op}"`);
        if (listOp && !multi)
          errors.push(`${at} ${node.field} has one answer — use "=" or "in" instead of "${node.op}"`);
      }
    };
    checkTypes(q.showsWhen.ast);
    for (const { field, text } of ruleLiterals(q.showsWhen.ast)) {
      const allowed = allowedLiterals(spec, field);
      if (allowed && !allowed.includes(text))
        errors.push(`${at} "${text}" is not an option of ${field}`);
    }
  });

  // Every write-in option has a follow-up question keyed on exactly it.
  for (const q of spec.questions) {
    for (const o of q.options.filter((x) => x.opensWriteIn)) {
      const followUp = spec.questions.some((x) => {
        const ast = x.showsWhen.ast;
        return (
          ast.type === "test" &&
          ast.field === q.field &&
          (ast.op === "includes" || ast.op === "=") &&
          ast.value === o.text
        );
      });
      if (!followUp)
        errors.push(`${q.id}: option "${o.text}" opens a write-in, but no question shows when it is picked`);
    }
  }
  return errors;
}
