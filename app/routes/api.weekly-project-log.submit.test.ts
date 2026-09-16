import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getTeachingLabUser, service } = vi.hoisted(() => ({
  getTeachingLabUser: vi.fn(),
  service: {
    canSubmitFor: vi.fn(),
    fetchSubmittedWeeks: vi.fn(),
    fetchEmployeePeopleTags: vi.fn(),
    createParentItem: vi.fn(),
    createSubitems: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

vi.mock("~/utils/auth.server", () => ({ getTeachingLabUser, getSignedInUser: vi.fn() }));
vi.mock("~/domains/weekly-project-log/service", () => ({
  weeklyProjectLogService: () => service,
}));
vi.mock("~/domains/weekly-project-log/repository", () => ({
  WEEKLY_PROJECT_LOG_BOARD_ID: "4284585496",
  weeklyProjectLogRepository: () => ({}),
}));
vi.mock("~/domains/employee/repository", () => ({ employeeRepository: () => ({}) }));

const { action } = await import("./api.weekly-project-log.submit");

const validBody = {
  name: "Duncan Gates",
  date: "2026-09-07T12:00:00.000Z",
  employeeId: "8",
  comment: "",
  projectLogEntries: [
    { projectName: "TL_Internal", projectRole: "Analyst", workHours: "6.5", activity: "" },
    { projectName: "TL_Internal", projectRole: "Tech Engineer/Developer", workHours: "33.5", activity: "" },
  ],
};

const submit = (body: unknown, url = "http://localhost/api/weekly-project-log/submit") =>
  action({
    request: new Request(url, { method: "POST", body: JSON.stringify(body) }),
    params: {},
    context: {} as never,
  });

beforeEach(() => {
  getTeachingLabUser.mockResolvedValue({
    email: "duncan.gates@teachinglab.org",
    headers: new Headers(),
  });
  service.canSubmitFor.mockResolvedValue({ data: true, error: null });
  service.fetchSubmittedWeeks.mockResolvedValue({ data: [], error: null });
  service.fetchEmployeePeopleTags.mockResolvedValue({
    data: { employeeProfileIds: ["22039575"], homeManagerIds: ["22044513"] },
    error: null,
  });
  service.createParentItem.mockResolvedValue({ data: { id: "100" }, error: null });
  service.createSubitems.mockResolvedValue([
    { data: { id: "101" }, error: null },
    { data: { id: "102" }, error: null },
  ]);
  service.deleteItem.mockResolvedValue({ data: { id: "100" }, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("auth", () => {
  it("401s when nobody is signed in", async () => {
    getTeachingLabUser.mockResolvedValue(null);

    const response = await submit(validBody);

    expect(response.status).toBe(401);
    expect(service.createParentItem).not.toHaveBeenCalled();
  });

  it("403s when submitting for another employee id", async () => {
    service.canSubmitFor.mockResolvedValue({ data: false, error: null });

    const response = await submit({ ...validBody, employeeId: "30" });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "You can only submit a project log for yourself.",
    });
    expect(service.createParentItem).not.toHaveBeenCalled();
  });

  it("502s rather than writing when the permission lookup fails", async () => {
    service.canSubmitFor.mockResolvedValue({
      data: null,
      error: new Error("fetchEmployee() went wrong"),
    });

    const response = await submit(validBody);

    expect(response.status).toBe(502);
    expect(service.createParentItem).not.toHaveBeenCalled();
  });
});

describe("input validation", () => {
  it.each([
    ["a missing name", { ...validBody, name: "" }],
    ["a missing employee id", { ...validBody, employeeId: "" }],
    ["no project rows", { ...validBody, projectLogEntries: [] }],
    ["project rows that aren't an array", { ...validBody, projectLogEntries: {} }],
    ["a missing date", { ...validBody, date: "" }],
    // formatDate slices the string; anything else used to throw a 500
    ["a non-string date", { ...validBody, date: 20260907 }],
    ["a Date serialized as an object", { ...validBody, date: {} }],
  ])("400s on %s", async (_label, body) => {
    const response = await submit(body);

    expect(response.status).toBe(400);
    expect(service.createParentItem).not.toHaveBeenCalled();
  });
});

describe("duplicate weeks", () => {
  it("409s when the week is already logged", async () => {
    const existing = {
      itemId: "99",
      week: "2026-09-07",
      totalHours: 40,
      createdAt: "2026-09-08T00:00:00Z",
    };
    service.fetchSubmittedWeeks.mockResolvedValue({ data: [existing], error: null });

    const response = await submit(validBody);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ existing });
    expect(service.createParentItem).not.toHaveBeenCalled();
  });

  it("lets the submission through when the duplicate check itself fails", async () => {
    service.fetchSubmittedWeeks.mockResolvedValue({
      data: null,
      error: new Error("Monday error"),
    });

    const response = await submit(validBody);

    expect(response.status).toBe(200);
    expect(service.createParentItem).toHaveBeenCalled();
  });
});

describe("a successful submission", () => {
  it("writes the parent with summed hours and People tags, then the subitems", async () => {
    const response = await submit(validBody);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      submitted: { itemId: "100", week: "2026-09-07", totalHours: 40 },
    });

    const [name, columnValues] = service.createParentItem.mock.calls[0]!;
    expect(name).toBe("Duncan Gates");
    expect(columnValues).toMatchObject({
      date4: { date: "2026-09-07" },
      numbers8: 40,
      numeric_mkq25pjh: "8",
      person: { personsAndTeams: [{ id: 22039575, kind: "person" }] },
      people: { personsAndTeams: [{ id: 22044513, kind: "person" }] },
    });

    const [parentId, subitems] = service.createSubitems.mock.calls[0]!;
    expect(parentId).toBe("100");
    expect(subitems).toHaveLength(2);
    expect(subitems[0].columnValues).toMatchObject({
      date: { date: "2026-09-07" },
      name6: "TL_Internal",
      project_role: "Analyst",
      numbers: 6.5,
      numeric_mkq2d9jn: "8",
    });
  });

  it("submits untagged when the People lookup fails", async () => {
    service.fetchEmployeePeopleTags.mockResolvedValue({
      data: null,
      error: new Error("found 0"),
    });

    const response = await submit(validBody);

    expect(response.status).toBe(200);
    const [, columnValues] = service.createParentItem.mock.calls[0]!;
    expect(columnValues).not.toHaveProperty("person");
    expect(columnValues).not.toHaveProperty("people");
  });

  it("returns the column values without writing on a dry run", async () => {
    const response = await submit(
      validBody,
      "http://localhost/api/weekly-project-log/submit?dryRun=1"
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      parentColumnValues: { numbers8: 40 },
    });
    expect(service.createParentItem).not.toHaveBeenCalled();
    expect(service.createSubitems).not.toHaveBeenCalled();
  });
});

describe("write failures", () => {
  it("retries the parent untagged when create_item fails with People tags", async () => {
    service.createParentItem
      .mockResolvedValueOnce({ data: null, error: new Error("deactivated user") })
      .mockResolvedValueOnce({ data: { id: "100" }, error: null });

    const response = await submit(validBody);

    expect(response.status).toBe(200);
    expect(service.createParentItem).toHaveBeenCalledTimes(2);
    const [, retried] = service.createParentItem.mock.calls[1]!;
    expect(retried).not.toHaveProperty("person");
    expect(retried).not.toHaveProperty("people");
  });

  it("502s and doesn't create subitems when the parent can't be created", async () => {
    service.createParentItem.mockResolvedValue({
      data: null,
      error: new Error("board locked"),
    });

    const response = await submit(validBody);

    expect(response.status).toBe(502);
    expect(service.createSubitems).not.toHaveBeenCalled();
  });

  it("deletes the parent and 502s when a subitem fails, so no partial log is left", async () => {
    service.createSubitems.mockResolvedValue([
      { data: { id: "101" }, error: null },
      { data: null, error: new Error("Item link max locks exceeded") },
    ]);

    const response = await submit(validBody);

    expect(response.status).toBe(502);
    expect(service.deleteItem).toHaveBeenCalledWith("100");
    expect(((await response.json()) as { error: string }).error).toContain("1 of 2 project rows");
  });

  it("points at the stranded entry when the cleanup delete also fails", async () => {
    service.createSubitems.mockResolvedValue([
      { data: null, error: new Error("locked") },
      { data: { id: "102" }, error: null },
    ]);
    service.deleteItem.mockResolvedValue({ data: null, error: new Error("nope") });

    const response = await submit(validBody);

    expect(response.status).toBe(502);
    expect(((await response.json()) as { error: string }).error).toContain(
      "https://teachinglab.monday.com/boards/4284585496/pulses/100"
    );
  });

  it("500s when something throws mid-submission", async () => {
    service.fetchSubmittedWeeks.mockRejectedValue(new Error("boom"));

    const response = await submit(validBody);

    expect(response.status).toBe(500);
  });
});
