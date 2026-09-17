import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachLogSubmission } from "~/domains/coach-log/model";
import {
  OTHER_OPTION,
  READS_TOUCHPOINT_LEADER,
  READS_TOUCHPOINT_TEACHER,
  SOLVES_TOUCHPOINT_HQIM,
} from "~/components/coach-log/questions/nyc/constants";

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

const base = {
  coachName: "A Coach",
  coachMondayId: "116495309",
  district: "NYC D75",
  school: "P123",
  subSchool: "",
  nycCoachType: "NYC Solves",
  sessionDate: "2026-09-10",
  ecTouchpoint: "",
  ecTeacherStrategies: [],
  ecLeaderCapacityFocus: [],
  readsIsPLSession: "",
  readsScheduleProvided: "",
  readsHighImpactActivities: "",
  readsTouchpointTypes: [],
  readsVisitDuration: "",
  readsGradeBands: [],
  readsTeacherStrategies: [],
  readsTeacherSchoolLeaderPresence: "",
  readsTeacherDistrictLeaderPresence: "",
  readsMajorityUsingHQIM: "",
  readsHQIMContext: "",
  readsInterventionsScheduled: "",
  readsInterventionsContext: "",
  readsLeaderVisitDuration: "",
  readsLeaderCapacityFocus: [],
  readsLeaderFocusSchoolVisitsSubcomponent: "",
  readsLeaderFocusModelingSubcomponent: "",
  readsLeaderFocusPLSubcomponent: "",
  readsLeaderSustainability: [],
  readsLeaderDistrictPresence: "",
  readsDistrictCapacityFocus: [],
  readsDistrictFocusStrategicPlanningSubcomponent: "",
  readsDistrictFocusPLSubcomponent: "",
  readsDistrictFocusDataStrategySubcomponent: "",
  readsDistrictFocusSchoolVisitsSubcomponent: "",
  readsDistrictSustainability: [],
  readsGuidanceToolsUsed: [],
  readsGuidanceToolsOther: "",
  readsNotes: "",
  solvesTouchpointTypes: [],
  solvesHqimVisitDuration: "",
  solvesHqimGradeContentAreas: [],
  solvesHqimLeaderPresent: "",
  solvesHqimProtocols: [],
  solvesHsdVisitDuration: "",
  solvesHsdGradeContentAreas: [],
  solvesHsdPrimaryResources: [],
  solvesHsdPrimaryResourcesOther: "",
  solvesHsdProtocols: [],
  solvesHsdLeaderPresent: "",
  solvesEsVisitDuration: "",
  solvesEsGradeLevels: [],
  solvesCsdVisitDuration: "",
  solvesCsdTrack: "",
  solvesDistrictWideVisitDuration: "",
  solvesDistrictWideSupportType: "",
  solvesDistrictWideDBNs: "",
  solvesPostVisitSnapshot: "",
  solvesPostVisitFollowUp: "",
  solvesGuidanceToolsUsed: [],
  solvesGuidanceToolsOther: "",
  solvesNotes: "",
  canceled: "No",
  cancelReason: "",
  cancelReasonOther: "",
  rescheduled: "",
  did1on1: "No",
  coacheeRows: [],
  didGroupCoaching: "No",
  groupParticipants: [],
  groupParticipantRole: [],
  groupTopic: "",
  groupDurationMins: "",
} as unknown as CoachLogSubmission;

const submit = (body: unknown, method = "POST") =>
  action({
    request: new Request("http://localhost/api/coach-log/submit", {
      method,
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    }),
    params: {},
    context: {} as never,
  });

// The parent's column_values, parsed back out of the mutation variables
const parentColumns = () =>
  JSON.parse(insertMondayData.mock.calls[0]![1].columnVals);

beforeEach(() => {
  hasExistingLog.mockResolvedValue({ data: false, error: null });
  insertMondayData.mockImplementation(async (query: string) =>
    query.includes("create_subitem")
      ? { data: { create_subitem: { id: "200" } } }
      : { data: { create_item: { id: "100" } } }
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("guards", () => {
  it("405s on a non-POST request", async () => {
    expect((await submit(undefined, "GET")).status).toBe(405);
  });

  it.each(["coachName", "district", "school"])("400s without %s", async (field) => {
    const response = await submit({ ...base, [field]: "" });

    expect(response.status).toBe(400);
    expect(insertMondayData).not.toHaveBeenCalled();
  });

  it("409s when a log already exists for the same coach/school/date", async () => {
    hasExistingLog.mockResolvedValue({ data: true, error: null });

    const response = await submit(base);

    expect(response.status).toBe(409);
    expect(insertMondayData).not.toHaveBeenCalled();
  });

  it("keys the duplicate check on sub-school as well", async () => {
    await submit({ ...base, subSchool: "Middle" });

    expect(hasExistingLog).toHaveBeenCalledWith(
      expect.objectContaining({ school: "P123", subSchool: "Middle" })
    );
  });

  it("500s when the parent item can't be created", async () => {
    insertMondayData.mockResolvedValue({ errors: [{ message: "denied" }] });

    const response = await submit(base);

    expect(response.status).toBe(500);
  });

  it("500s when something throws", async () => {
    hasExistingLog.mockRejectedValue(new Error("boom"));

    expect((await submit(base)).status).toBe(500);
  });
});

describe("parent column values", () => {
  it("writes the identity columns and tags the coach", async () => {
    await submit(base);

    expect(parentColumns()).toMatchObject({
      text88__1: "NYC D75",
      text5__1: "P123",
      date__1: { date: "2026-09-10" },
      text13__1: "NYC Solves",
      people__1: { personsAndTeams: [{ id: 116495309, kind: "person" }] },
    });
  });

  it("omits the date column rather than writing a blank date", async () => {
    await submit({ ...base, sessionDate: "" });

    expect(parentColumns()).not.toHaveProperty("date__1");
  });

  it("writes cancellation columns only when the session was canceled", async () => {
    await submit({
      ...base,
      canceled: "Yes",
      cancelReason: "Other",
      cancelReasonOther: "Snow day",
      rescheduled: "Yes",
    });

    expect(parentColumns()).toMatchObject({
      text51__1: "Other",
      text99__1: "Snow day",
      text_mkssvd55: "Yes",
    });
  });

  it("skips the Reads blocks whose touchpoint wasn't selected, so stale hidden values aren't written", async () => {
    await submit({
      ...base,
      nycCoachType: "NYC Reads",
      readsTouchpointTypes: [READS_TOUCHPOINT_TEACHER],
      readsVisitDuration: "3",
      // Left over from a leader touchpoint the coach deselected
      readsLeaderVisitDuration: "6",
      readsLeaderDistrictPresence: "Yes",
    });

    const columns = parentColumns();
    expect(columns.text_mktgt2ah).toBe("3");
    expect(columns).not.toHaveProperty("text_mktggbxt");
    expect(columns).not.toHaveProperty("text_mm6nc9gw");
  });

  it("writes a selected Reads leader block", async () => {
    await submit({
      ...base,
      nycCoachType: "NYC Reads",
      readsTouchpointTypes: [READS_TOUCHPOINT_LEADER],
      readsLeaderVisitDuration: "6",
      readsLeaderSustainability: ["Coaching cycles", "Data review"],
    });

    expect(parentColumns()).toMatchObject({
      text_mktggbxt: "6",
      text_mm6nbxvj: "Coaching cycles, Data review",
    });
  });

  it("folds an Other write-in into the shared multi-select column", async () => {
    await submit({
      ...base,
      nycCoachType: "NYC Reads",
      readsTouchpointTypes: [READS_TOUCHPOINT_TEACHER],
      readsGuidanceToolsUsed: ["Snapshot tool", OTHER_OPTION],
      readsGuidanceToolsOther: "A custom tracker",
    });

    expect(parentColumns().text_mm6ngq1v).toBe(
      "Snapshot tool, Other: A custom tracker"
    );
  });

  it("leaves a bare Other alone when there is no write-in", async () => {
    await submit({
      ...base,
      nycCoachType: "NYC Reads",
      readsTouchpointTypes: [READS_TOUCHPOINT_TEACHER],
      readsGuidanceToolsUsed: [OTHER_OPTION],
      readsGuidanceToolsOther: "",
    });

    expect(parentColumns().text_mm6ngq1v).toBe("Other");
  });

  it("writes the Solves HQIM block and skips the other Solves blocks", async () => {
    await submit({
      ...base,
      solvesTouchpointTypes: [SOLVES_TOUCHPOINT_HQIM],
      solvesHqimVisitDuration: "60",
      solvesHqimProtocols: ["Protocol A"],
      // Left over from a district-wide touchpoint that isn't selected
      solvesDistrictWideVisitDuration: "90",
    });

    const columns = parentColumns();
    expect(columns.text_mkthtzhb).toBe("60");
    expect(columns.text_mkthqrth).toBe("Protocol A");
    expect(columns).not.toHaveProperty("text_mm6nx5fv");
  });

  it("writes group coaching columns with the duration as a number", async () => {
    await submit({
      ...base,
      didGroupCoaching: "Yes",
      groupParticipants: ["Ann", "Ben"],
      groupParticipantRole: ["Teacher"],
      groupTopic: "Small group instruction",
      groupDurationMins: "45",
    });

    expect(parentColumns()).toMatchObject({
      text7__1: "Ann, Ben",
      text29__1: "Teacher",
      text76__1: "Small group instruction",
      numbers1__1: 45,
    });
  });
});

describe("1:1 coachee subitems", () => {
  const coacheeRows = [
    { coacheeName: "Ann", role: "Teacher", durationMins: "30" },
    { coacheeName: "Ben", role: "Teacher", durationMins: "" },
  ];

  it("creates one subitem per coachee and 200s", async () => {
    const response = await submit({ ...base, did1on1: "Yes", coacheeRows });

    expect(response.status).toBe(200);
    const subCalls = insertMondayData.mock.calls.filter(([query]) =>
      query.includes("create_subitem")
    );
    expect(subCalls).toHaveLength(2);
    expect(JSON.parse(subCalls[0]![1].columnVals)).toMatchObject({
      text__1: "Ann",
      text0__1: "Teacher",
      date0: { date: "2026-09-10" },
      numbers__1: 30,
    });
    // No duration row: omit the column rather than writing NaN
    expect(JSON.parse(subCalls[1]![1].columnVals)).not.toHaveProperty("numbers__1");
  });

  it("skips subitems when there was no 1:1 coaching", async () => {
    await submit({ ...base, did1on1: "No", coacheeRows });

    expect(
      insertMondayData.mock.calls.filter(([query]) => query.includes("create_subitem"))
    ).toHaveLength(0);
  });

  // A GraphQL error comes back as a resolved 200 with no id, so the route has
  // to inspect every result rather than trust Promise resolution
  it("207s and names the coachees whose rows didn't save", async () => {
    insertMondayData.mockImplementation(async (query: string, variables) => {
      if (!query.includes("create_subitem")) {
        return { data: { create_item: { id: "100" } } };
      }
      return variables.myItemName === "Ben"
        ? { errors: [{ message: "Item link max locks exceeded" }] }
        : { data: { create_subitem: { id: "200" } } };
    });

    const response = await submit({ ...base, did1on1: "Yes", coacheeRows });

    expect(response.status).toBe(207);
    expect(await response.json()).toEqual({
      parentItemId: "100",
      failedCoachees: ["Ben"],
    });
  });

  it("207s rather than 500s when a subitem request rejects, so the parent isn't duplicated", async () => {
    insertMondayData.mockImplementation(async (query: string) => {
      if (!query.includes("create_subitem")) {
        return { data: { create_item: { id: "100" } } };
      }
      throw new Error("fetch failed");
    });

    const response = await submit({ ...base, did1on1: "Yes", coacheeRows });

    expect(response.status).toBe(207);
    expect((await response.json()).failedCoachees).toEqual(["Ann", "Ben"]);
  });
});
