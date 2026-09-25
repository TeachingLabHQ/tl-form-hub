// Checks the submit route against the Question Spec's Monday columns: for every
// question, submit one realistic log where it is shown (its answer must land in
// its spec column) and one where it is just hidden (its stale answer must not
// be written). Every column the route writes must be one the spec names.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCoachLogSubmission } from "~/components/coach-log/build-submission";
import { isPLSession, ROLE_OPTIONS } from "~/components/coach-log/constants";
import type { CoachLogValues } from "~/components/coach-log/hooks/use-coach-log-form";
import { isBlankAnswer, ruleReferences, type Answer } from "~/components/coach-log/spec/rules";
import {
  coachLogSpec as spec,
  createVisibility,
  OPTIONS_TAB,
  type Answers,
  type SpecQuestion,
} from "~/components/coach-log/spec/spec";
import {
  combinationsForQuestions,
  toFormValues,
  type Assignment,
} from "~/components/coach-log/spec/spec-test-helpers";

const { insertMondayData, hasExistingLog } = vi.hoisted(() => ({
  insertMondayData: vi.fn(),
  hasExistingLog: vi.fn(),
}));

vi.mock("~/domains/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/domains/utils")>();
  return { ...actual, insertMondayData };
});
vi.mock("~/domains/coach-log/service", () => ({
  coachLogService: () => ({ hasExistingLog }),
}));
vi.mock("~/domains/coach-log/repository", () => ({
  COACH_LOG_BOARD_ID: "18416482214",
  coachLogRepository: () => ({}),
}));

const { action } = await import("./api.coach-log.submit");

const COACH = { name: "A Coach", mondayProfileId: "116495309" };
const COACHEE_ROW = { coacheeName: "Coachee A", role: ROLE_OPTIONS[0]!, durationMins: "30" };
const PARENT_COLUMN = /^(text|numbers|date)/;
const isGroupRow = (q: SpecQuestion) => !!q.repeatingGroup || q.type === "repeating group";

/** Spec says shown, but the route only saves it alongside a touchpoint — so
 * never on a canceled log (see Discrepancies: "PL answer on canceled logs"). */
const NOT_SAVED_WHEN: Record<string, (answers: Answers) => boolean> = {
  readsIsPLSession: (a) => a.canceled === "Yes",
  solvesIsPLSession: (a) => a.canceled === "Yes",
};

const defaultAnswer = (q: SpecQuestion): Answer => {
  const fromTab = q.optionsFrom === OPTIONS_TAB;
  switch (q.type) {
    case "yes-no":
      return "Yes";
    case "date":
      return "2026-09-10";
    case "multi select":
      return fromTab ? [q.options[0]!.text] : [`${q.field} value`];
    case "single select":
      return fromTab ? q.options[0]!.text : `${q.field} value`;
    default:
      return `${q.field} text`;
  }
};

/** Fields the form itself clears as soon as they're hidden (onChange handlers
 * in early-childhood-question.tsx, reads-leader-support.tsx and
 * reads-district-support.tsx), so they can't carry a stale answer. */
const CLEARED_BY_FORM_WHEN_HIDDEN = [
  "ecTeacherStrategies",
  "ecLeaderCapacityFocus",
  "readsLeaderFocusSchoolVisitsSubcomponent",
  "readsLeaderFocusModelingSubcomponent",
  "readsLeaderFocusPLSubcomponent",
  "readsDistrictFocusStrategicPlanningSubcomponent",
  "readsDistrictFocusPLSubcomponent",
  "readsDistrictFocusDataStrategySubcomponent",
  "readsDistrictFocusSchoolVisitsSubcomponent",
];

/** Answers every question (stale answers included, as a coach who changed
 * their mind would leave behind), keeping the assignment's answers. */
function fullAnswers(a: Assignment): Answers {
  const answers: Answers = {};
  for (const q of spec.questions) {
    if (isGroupRow(q) || q.field in answers) continue;
    answers[q.field] = q.field in a.answers ? a.answers[q.field] : defaultAnswer(q);
  }
  // The sub-school dropdown can only hold a value while one of its versions
  // shows (the form clears it, and it has no options otherwise).
  const vis = createVisibility(spec, answers, a.facts);
  for (const field of CLEARED_BY_FORM_WHEN_HIDDEN) {
    if (!vis.fieldShown(field)) answers[field] = Array.isArray(answers[field]) ? [] : "";
  }
  answers.subSchool = vis.isShown("subSchool.schoolLevel")
    ? "Elementary"
    : vis.isShown("subSchool")
      ? "Sub-school A"
      : "";
  return answers;
}

/** A coach could actually submit this: every shown required question answered. */
const submittable = (answers: Answers, vis: ReturnType<typeof createVisibility>) =>
  spec.questions.every(
    (q) => isGroupRow(q) || !q.required || !vis.isShown(q.id) || !isBlankAnswer(answers[q.field])
  );

type Scenario = { answers: Answers; facts: Record<string, boolean> };

/** A submittable log where the question is shown and answered, or (for
 * "hidden") hidden while the questions its rule mentions are still on screen. */
function findScenario(q: SpecQuestion, want: "shown" | "hidden"): Scenario | null {
  let fallback: Scenario | null = null;
  for (const a of combinationsForQuestions(spec, [q.id]).iter()) {
    const answers = fullAnswers(a);
    const vis = createVisibility(spec, answers, a.facts);
    if (vis.isShown(q.id) !== (want === "shown")) continue;
    if (!submittable(answers, vis)) continue;
    if (want === "shown") {
      if (isGroupRow(q) || !isBlankAnswer(answers[q.field])) return { answers, facts: a.facts };
      continue;
    }
    if ([...ruleReferences(q.showsWhen.ast).fields].every((f) => vis.fieldShown(f))) {
      return { answers, facts: a.facts };
    }
    fallback ??= { answers, facts: a.facts };
  }
  return fallback;
}

function expectedColumns(answers: Answers, facts: Record<string, boolean>) {
  const vis = createVisibility(spec, answers, facts);
  const expected = new Map<string, unknown>();
  for (const q of spec.questions) {
    const value = answers[q.field];
    if (!PARENT_COLUMN.test(q.mondayColumn) || !vis.isShown(q.id) || isBlankAnswer(value)) continue;
    if (NOT_SAVED_WHEN[q.id]?.(answers)) continue;
    let out: unknown = value;
    if (Array.isArray(value)) {
      // "Other" write-ins are folded into their parent's column.
      out = value
        .map((v) => {
          const writeIn = spec.questions.find((w) => {
            const ast = w.showsWhen.ast;
            return ast.type === "test" && ast.field === q.field && ast.op === "includes" && ast.value === v;
          });
          return writeIn && w_shown(vis, writeIn) ? `${v}: ${answers[writeIn.field]}` : v;
        })
        .join(", ");
    }
    if (q.mondayColumn.startsWith("numbers")) out = parseFloat(String(value));
    if (q.mondayColumn.startsWith("date")) out = { date: value };
    expected.set(q.mondayColumn, out);
  }
  return { expected, vis };
}
const w_shown = (vis: ReturnType<typeof createVisibility>, q: SpecQuestion) =>
  vis.isShown(q.id) && q.mondayColumn === "folded into parent";

async function submit({ answers }: Scenario) {
  const values: CoachLogValues = toFormValues(answers);
  values.coacheeRows = [{ ...COACHEE_ROW }];
  // The form answers 1:1 and group coaching "No" for a PL session.
  if (isPLSession(values.district, values.nycCoachType, values.readsIsPLSession, values.solvesIsPLSession)) {
    values.did1on1 = "No";
    values.didGroupCoaching = "No";
  }
  const body = buildCoachLogSubmission(values, COACH);
  const res = await action({
    request: new Request("http://localhost/api/coach-log/submit", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    params: {},
    context: {} as never,
  });
  expect(res.status).toBe(200);
  const calls = insertMondayData.mock.calls;
  return {
    parent: JSON.parse(calls[0]![1].columnVals) as Record<string, unknown>,
    subitems: calls.slice(1).map((c) => JSON.parse(c[1].columnVals) as Record<string, unknown>),
  };
}

const specColumns = new Set(
  spec.questions.map((q) => q.mondayColumn).filter((c) => PARENT_COLUMN.test(c))
);

beforeEach(() => {
  insertMondayData.mockReset();
  hasExistingLog.mockReset();
  hasExistingLog.mockResolvedValue({ data: false, error: null });
  insertMondayData.mockImplementation(async (query: string) =>
    query.includes("create_subitem")
      ? { data: { create_subitem: { id: "2" } } }
      : { data: { create_item: { id: "1" } } }
  );
});

describe("submit route writes the spec's Monday columns", () => {
  const cases = spec.questions.flatMap((q) =>
    q.mondayColumn === "not saved" ? [] : (["shown", "hidden"] as const).map((w) => [q.id, w, q] as const)
  );

  it.each(cases)("%s (%s)", async (_id, want, q) => {
    const scenario = findScenario(q, want);
    if (!scenario) {
      // Only questions that are always shown have no hidden scenario.
      expect(want === "hidden" && q.showsWhen.ast.type === "always").toBe(true);
      return;
    }
    const { parent, subitems } = await submit(scenario);
    const { expected, vis } = expectedColumns(scenario.answers, scenario.facts);

    for (const col of specColumns) {
      if (expected.has(col)) expect(parent[col], col).toEqual(expected.get(col));
      else expect(parent[col] ?? "", `${col} should not be written`).toEqual("");
    }
    const unknown = Object.keys(parent).filter((c) => !specColumns.has(c) && c !== "people__1");
    expect(unknown, "columns the spec doesn't name").toEqual([]);

    if (vis.isShown("coacheeRows")) {
      expect(subitems).toEqual([
        {
          text__1: COACHEE_ROW.coacheeName,
          text0__1: COACHEE_ROW.role,
          numbers__1: 30,
          date0: { date: scenario.answers.sessionDate },
        },
      ]);
    } else {
      expect(subitems).toEqual([]);
    }
  });
});
