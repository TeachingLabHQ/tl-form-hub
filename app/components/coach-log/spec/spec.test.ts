// The coach log form mirrors the Question Spec sheet (exported to
// coach-log.spec.json). These tests fail when the two drift apart: a question,
// option, limit or show/hide rule changed on one side but not the other.

import { describe, expect, it } from "vitest";
import {
  CANCELED_OTHER_REASON,
  CANCELLATION_REASON_OPTIONS,
  DURATION_OPTIONS,
  EC_TOUCHPOINT_OPTIONS,
  isPLSession,
  LEADER_CAPACITY_FOCUS_OPTIONS,
  MAX_TEACHER_STRATEGIES,
  NYC_COACH_TYPE_OPTIONS,
  ROLE_OPTIONS,
  SCHOOL_LEVEL_OPTIONS,
  shouldShowReads,
  shouldShowSchoolLevel,
  shouldShowSolves,
  shouldShowSubSchool,
  TEACHER_STRATEGY_OPTIONS,
  YES_NO_OPTIONS,
} from "../constants";
import {
  coachLogValidate,
  EMPTY_COACHEE_ROW,
  INITIAL_VALUES,
  type CoachLogValues,
} from "../hooks/use-coach-log-form";
import * as nyc from "../questions/nyc/constants";
import { isBlankAnswer } from "./rules";
import {
  coachLogSpec as spec,
  createVisibility,
  OPTIONS_TAB,
  validateSpec,
  YES_NO,
  type SpecQuestion,
} from "./spec";
import {
  combinationsForQuestions,
  toFormValues,
  type Assignment,
} from "./spec-test-helpers";

type CodeOptions = {
  options: readonly string[];
  max?: number;
  exclusive?: string[];
  writeIn?: string[];
  links?: Record<string, string>;
};

// Where each Options-tab question's answers live in the code.
const CODE_OPTIONS: Record<string, CodeOptions> = {
  nycCoachType: { options: NYC_COACH_TYPE_OPTIONS },
  "subSchool.schoolLevel": { options: SCHOOL_LEVEL_OPTIONS },
  cancelReason: { options: CANCELLATION_REASON_OPTIONS, writeIn: [CANCELED_OTHER_REASON] },
  "coacheeRows.role": { options: ROLE_OPTIONS },
  "coacheeRows.durationMins": { options: DURATION_OPTIONS },
  groupParticipantRole: { options: ROLE_OPTIONS },
  groupDurationMins: { options: DURATION_OPTIONS },
  ecTouchpoint: { options: EC_TOUCHPOINT_OPTIONS },
  ecTeacherStrategies: { options: TEACHER_STRATEGY_OPTIONS, max: MAX_TEACHER_STRATEGIES },
  ecLeaderCapacityFocus: { options: LEADER_CAPACITY_FOCUS_OPTIONS },
  readsTouchpointTypes: { options: nyc.READS_TOUCHPOINT_TYPE_OPTIONS },
  readsVisitDuration: { options: nyc.READS_VISIT_DURATION_OPTIONS },
  readsGradeBands: { options: nyc.READS_GRADE_BAND_OPTIONS },
  readsTeacherStrategies: {
    options: nyc.READS_TEACHER_STRATEGY_OPTIONS,
    max: nyc.MAX_READS_TEACHER_STRATEGIES,
  },
  readsTeacherSchoolLeaderPresence: { options: nyc.FREQUENCY_OPTIONS },
  readsTeacherDistrictLeaderPresence: { options: nyc.FREQUENCY_OPTIONS },
  readsLeaderVisitDuration: { options: nyc.READS_LEADER_VISIT_DURATION_OPTIONS },
  readsLeaderCapacityFocus: {
    options: nyc.READS_LEADER_CAPACITY_FOCUS_OPTIONS,
    max: nyc.MAX_READS_LEADER_CAPACITY_FOCUS,
  },
  readsLeaderFocusSchoolVisitsSubcomponent: {
    options: nyc.READS_LEADER_SCHOOL_VISITS_SUBCOMPONENT_OPTIONS,
  },
  readsLeaderFocusModelingSubcomponent: {
    options: nyc.READS_LEADER_MODELING_SUBCOMPONENT_OPTIONS,
  },
  readsLeaderFocusPLSubcomponent: { options: nyc.READS_LEADER_PL_SUBCOMPONENT_OPTIONS },
  readsLeaderSustainability: {
    options: nyc.SUSTAINABILITY_OPTIONS,
    max: nyc.MAX_SUSTAINABILITY,
    exclusive: [nyc.SUSTAINABILITY_NONE_OPTION],
  },
  readsLeaderDistrictPresence: { options: nyc.FREQUENCY_OPTIONS },
  readsDistrictCapacityFocus: {
    options: nyc.READS_DISTRICT_CAPACITY_FOCUS_OPTIONS,
    max: nyc.MAX_READS_DISTRICT_CAPACITY_FOCUS,
  },
  readsDistrictFocusStrategicPlanningSubcomponent: {
    options: nyc.READS_DISTRICT_STRATEGIC_PLANNING_SUBCOMPONENT_OPTIONS,
  },
  readsDistrictFocusPLSubcomponent: { options: nyc.READS_DISTRICT_PL_SUBCOMPONENT_OPTIONS },
  readsDistrictFocusDataStrategySubcomponent: {
    options: nyc.READS_DISTRICT_DATA_STRATEGY_SUBCOMPONENT_OPTIONS,
  },
  readsDistrictFocusSchoolVisitsSubcomponent: {
    options: nyc.READS_DISTRICT_SCHOOL_VISITS_SUBCOMPONENT_OPTIONS,
  },
  readsDistrictSustainability: {
    options: nyc.SUSTAINABILITY_OPTIONS,
    max: nyc.MAX_SUSTAINABILITY,
    exclusive: [nyc.SUSTAINABILITY_NONE_OPTION],
  },
  readsGuidanceToolsUsed: {
    options: nyc.READS_GUIDANCE_TOOLS_OPTIONS,
    exclusive: [nyc.READS_GUIDANCE_NA_OPTION],
    writeIn: [nyc.OTHER_OPTION],
  },
  solvesTouchpointTypes: { options: nyc.SOLVES_TOUCHPOINT_TYPE_OPTIONS },
  solvesHqimVisitDuration: { options: nyc.SOLVES_HOURS_DURATION_OPTIONS },
  solvesHqimGradeContentAreas: { options: nyc.SOLVES_HQIM_GRADE_CONTENT_OPTIONS },
  solvesHqimProtocols: { options: nyc.SOLVES_PROTOCOL_OPTIONS, max: nyc.MAX_SOLVES_PROTOCOLS },
  solvesHsdVisitDuration: { options: nyc.SOLVES_HOURS_DURATION_OPTIONS },
  solvesHsdGradeContentAreas: { options: nyc.SOLVES_HSD_GRADE_CONTENT_OPTIONS },
  solvesHsdPrimaryResources: {
    options: nyc.SOLVES_HSD_PRIMARY_RESOURCE_OPTIONS,
    writeIn: [nyc.OTHER_OPTION],
  },
  solvesHsdProtocols: { options: nyc.SOLVES_PROTOCOL_OPTIONS, max: nyc.MAX_SOLVES_PROTOCOLS },
  solvesEsVisitDuration: { options: nyc.SOLVES_HOURS_DURATION_OPTIONS },
  solvesEsGradeLevels: { options: nyc.SOLVES_ES_GRADE_LEVEL_OPTIONS },
  solvesCsdVisitDuration: { options: nyc.SOLVES_HOURS_DURATION_OPTIONS },
  solvesCsdTrack: { options: nyc.SOLVES_CSD_TRACK_OPTIONS },
  solvesDistrictWideVisitDuration: { options: nyc.SOLVES_HOURS_DURATION_OPTIONS },
  solvesDistrictWideSupportType: { options: nyc.SOLVES_DISTRICT_WIDE_SUPPORT_OPTIONS },
  solvesPostVisitSnapshot: { options: nyc.SOLVES_POST_VISIT_SNAPSHOT_OPTIONS },
  solvesSustainability: {
    options: nyc.SUSTAINABILITY_OPTIONS,
    max: nyc.MAX_SUSTAINABILITY,
    exclusive: [nyc.SUSTAINABILITY_NONE_OPTION],
  },
  solvesGuidanceToolsUsed: {
    options: nyc.SOLVES_GUIDANCE_TOOLS_OPTIONS,
    exclusive: [nyc.SOLVES_GUIDANCE_NA_OPTION],
    writeIn: [nyc.OTHER_OPTION],
    links: nyc.SOLVES_GUIDANCE_TOOL_URLS,
  },
};

describe("coach log spec file", () => {
  it("passes the spec's own structural checks", () => {
    expect(validateSpec(spec)).toEqual([]);
  });

  it("is stamped with the latest Changelog version", () => {
    expect(spec.specVersion).toBe(spec.changelog.at(-1)?.version);
  });
});

describe("questions map to form fields", () => {
  const specFields = new Set(spec.questions.map((q) => q.field));
  const codeFields = new Set([
    ...Object.keys(INITIAL_VALUES),
    ...Object.keys(EMPTY_COACHEE_ROW).map((k) => `coacheeRows.${k}`),
  ]);

  it("every spec question is a real CoachLogValues field", () => {
    expect([...specFields].filter((f) => !codeFields.has(f))).toEqual([]);
  });

  it("every CoachLogValues field has a spec question", () => {
    expect([...codeFields].filter((f) => !specFields.has(f))).toEqual([]);
  });

  it("multi select questions are exactly the list-valued fields", () => {
    const listFields = Object.entries(INITIAL_VALUES)
      .filter(([k, v]) => Array.isArray(v) && k !== "coacheeRows")
      .map(([k]) => k)
      .sort();
    const multi = spec.questions
      .filter((q) => q.type === "multi select")
      .map((q) => q.field)
      .sort();
    expect(multi).toEqual(listFields);
  });
});

describe("options match the code's constants", () => {
  const optionQuestions = spec.questions.filter((q) => q.optionsFrom === OPTIONS_TAB);

  it("every Options-tab question has a code option list (and vice versa)", () => {
    expect(optionQuestions.map((q) => q.id).sort()).toEqual(Object.keys(CODE_OPTIONS).sort());
  });

  it("yes-no questions use Yes/No", () => {
    expect(YES_NO_OPTIONS).toEqual(YES_NO);
  });

  it.each(optionQuestions.map((q) => [q.id, q] as const))("%s", (id, q) => {
    const code = CODE_OPTIONS[id]!;
    expect(q.options.map((o) => o.text)).toEqual([...code.options]);
    expect(q.maxSelections).toBe(code.max ?? null);
    expect(q.options.filter((o) => o.exclusive).map((o) => o.text)).toEqual(code.exclusive ?? []);
    expect(q.options.filter((o) => o.opensWriteIn).map((o) => o.text)).toEqual(code.writeIn ?? []);
    expect(
      Object.fromEntries(q.options.filter((o) => o.link).map((o) => [o.text, o.link]))
    ).toEqual(code.links ?? {});
  });
});

// --- Show-if parity -----------------------------------------------------------

const blankOf = (field: string): unknown => {
  const initial = (INITIAL_VALUES as Record<string, unknown>)[field];
  return Array.isArray(initial) ? [] : "";
};

type Validator = (value: unknown, values: CoachLogValues) => string | null;
const validatorFor = (q: SpecQuestion): Validator | undefined => {
  const table = coachLogValidate as Record<string, unknown>;
  if (q.repeatingGroup) {
    return (table[q.repeatingGroup] as Record<string, Validator>)[q.field.split(".")[1]!];
  }
  if (q.type === "repeating group") {
    return (table[q.id] as Record<string, Validator>).coacheeName;
  }
  return table[q.field] as Validator | undefined;
};

/** The validator errors on a blank answer (i.e. the code treats the question as
 * shown and required). */
const codeRequires = (q: SpecQuestion, values: CoachLogValues) => {
  const validate = validatorFor(q);
  if (!validate) return false;
  // A repeating group is checked through its first row's coachee question.
  if (q.repeatingGroup || q.type === "repeating group") return validate("", values) !== null;
  const blank = blankOf(q.field);
  return validate(blank, { ...values, [q.field]: blank } as CoachLogValues) !== null;
};

const plSession = (v: CoachLogValues) =>
  isPLSession(v.district, v.nycCoachType, v.readsIsPLSession, v.solvesIsPLSession);

/**
 * When the code shows a question. For most questions the form's validator is
 * the reference: a required question errors on a blank answer exactly when it
 * is on screen. The exceptions below are questions whose visibility isn't
 * encoded in a validator, so they use the same predicates as coach-log-form.tsx.
 */
const CODE_SHOWS: Record<string, (v: CoachLogValues, facts: Record<string, boolean>) => boolean> = {
  // Shown on canceled logs too, but only required when not canceled.
  readsIsPLSession: (v) => shouldShowReads(v.district, v.nycCoachType),
  solvesIsPLSession: (v) => shouldShowSolves(v.district, v.nycCoachType),
  // Not required, so no validator; also hidden when the sheet has no sub-schools.
  subSchool: (v, f) =>
    !shouldShowSchoolLevel(v.district, v.school, v.nycCoachType) &&
    shouldShowSubSchool(v.district, v.nycCoachType) &&
    f.schoolHasSubSchools === true,
  "subSchool.schoolLevel": (v) => shouldShowSchoolLevel(v.district, v.school, v.nycCoachType),
  // One field, two inputs: scheduled-date dropdown vs PL calendar.
  sessionDate: (v) => !plSession(v),
  "sessionDate.pl": (v) => plSession(v),
  // Hidden for PL sessions but still "required" (the form answers them No).
  did1on1: (v) => v.canceled !== "Yes" && !plSession(v),
  didGroupCoaching: (v) => v.canceled !== "Yes" && !plSession(v),
};

const codeShows = (q: SpecQuestion, values: CoachLogValues, facts: Record<string, boolean>) =>
  CODE_SHOWS[q.id] ? CODE_SHOWS[q.id]!(values, facts) : codeRequires(q, values);

/** The form's own side effect (handlePLSessionChange in coach-log-form.tsx):
 * answering Yes to the PL question answers 1:1 and group coaching "No", so a
 * PL log can't still carry a "Yes" there. */
const withFormSideEffects = (values: CoachLogValues): CoachLogValues =>
  plSession(values) ? { ...values, did1on1: "No", didGroupCoaching: "No" } : values;

/** Required-ness the validators don't line up with visibility for, on purpose. */
const REQUIRED_EXCEPTIONS: Record<string, (v: CoachLogValues, shown: boolean) => boolean> = {
  // Not required on canceled logs (see Discrepancies: PL answer on canceled logs).
  readsIsPLSession: (v, shown) => shown && v.canceled !== "Yes",
  solvesIsPLSession: (v, shown) => shown && v.canceled !== "Yes",
  // Required even when hidden for a PL session — the form fills in "No".
  did1on1: (v) => v.canceled !== "Yes",
  didGroupCoaching: (v) => v.canceled !== "Yes",
};

const combinationsFor = (ids: string[]) => combinationsForQuestions(spec, ids);

const describeCase = ({ answers, facts }: Assignment) =>
  JSON.stringify({ ...answers, ...(Object.keys(facts).length ? { facts } : {}) });

describe("show-if rules match the code", () => {
  it.each(spec.questions.map((q) => [q.id, q] as const))("%s", (_id, q) => {
    const { iter } = combinationsFor([q.id]);
    const mismatches: string[] = [];
    for (const a of iter()) {
      const values = withFormSideEffects(toFormValues(a.answers));
      const vis = createVisibility(spec, a.answers, a.facts);
      const specShown = vis.isShown(q.id);
      const shown = codeShows(q, values, a.facts);
      if (specShown !== shown) {
        mismatches.push(`spec ${specShown ? "shows" : "hides"}, code ${shown ? "shows" : "hides"}: ${describeCase(a)}`);
      }
      // Versions of a question share one validator, so required-ness is per
      // field: required when any shown version is required.
      const required = REQUIRED_EXCEPTIONS[q.id]
        ? REQUIRED_EXCEPTIONS[q.id]!(values, shown)
        : spec.questions.some((x) => x.field === q.field && x.required && vis.isShown(x.id));
      if (codeRequires(q, values) !== required) {
        mismatches.push(`required should be ${required}: ${describeCase(a)}`);
      }
      if (mismatches.length >= 5) break;
    }
    expect(mismatches).toEqual([]);
  });

  // Versions of a question share one answer, and some questions share a Monday
  // column; either only works if they can never be on screen together.
  const groups = new Map<string, string[]>();
  for (const q of spec.questions) {
    const keys = [`field:${q.field}`];
    if (/^(text|numbers|date)/.test(q.mondayColumn)) keys.push(`column:${q.mondayColumn}`);
    for (const k of keys) groups.set(k, [...(groups.get(k) ?? []), q.id]);
  }
  const shared = [...groups].filter(([, ids]) => ids.length > 1);

  it.each(shared)("%s is never shown twice at once (%s)", (_key, ids) => {
    const { iter } = combinationsFor(ids);
    for (const a of iter()) {
      const vis = createVisibility(spec, a.answers, a.facts);
      const shownIds = ids.filter((id) => vis.isShown(id));
      if (shownIds.length > 1) {
        expect.fail(`${shownIds.join(" and ")} both shown for ${describeCase(a)}`);
      }
    }
  });

  it("a hidden question counts as blank for later rules", () => {
    // Stale Reads PL answer after switching to an ELA coach must not hide 1:1.
    const answers = { district: "NY_D9", nycCoachType: "ELA Coach (non-Reads)", readsIsPLSession: "Yes" };
    expect(createVisibility(spec, answers).isShown("did1on1")).toBe(true);
    expect(isBlankAnswer(createVisibility(spec, answers).get("readsIsPLSession"))).toBe(true);
  });
});
