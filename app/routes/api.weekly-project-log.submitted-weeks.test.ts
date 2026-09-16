import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getTeachingLabUser, service } = vi.hoisted(() => ({
  getTeachingLabUser: vi.fn(),
  service: { canSubmitFor: vi.fn(), fetchSubmittedWeeks: vi.fn() },
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

const { action } = await import("./api.weekly-project-log.submitted-weeks");

const week = {
  itemId: "99",
  week: "2026-09-07",
  totalHours: 40,
  createdAt: "2026-09-08T00:00:00Z",
};

const call = (body: unknown, method = "POST") =>
  action({
    request: new Request("http://localhost/api/weekly-project-log/submitted-weeks", {
      method,
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    }),
    params: {},
    context: {} as never,
  });

beforeEach(() => {
  getTeachingLabUser.mockResolvedValue({
    email: "duncan.gates@teachinglab.org",
    headers: new Headers(),
  });
  service.canSubmitFor.mockResolvedValue({ data: true, error: null });
  service.fetchSubmittedWeeks.mockResolvedValue({ data: [week], error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("submitted-weeks", () => {
  it("405s on a non-POST request", async () => {
    const response = await call(undefined, "GET");

    expect(response.status).toBe(405);
  });

  it("401s when nobody is signed in", async () => {
    getTeachingLabUser.mockResolvedValue(null);

    const response = await call({ employeeId: "8" });

    expect(response.status).toBe(401);
    expect(service.fetchSubmittedWeeks).not.toHaveBeenCalled();
  });

  it("403s when asking for another employee's weeks", async () => {
    service.canSubmitFor.mockResolvedValue({ data: false, error: null });

    const response = await call({ employeeId: "30" });

    expect(response.status).toBe(403);
    expect(service.fetchSubmittedWeeks).not.toHaveBeenCalled();
  });

  it("502s when the permission lookup fails", async () => {
    service.canSubmitFor.mockResolvedValue({ data: null, error: new Error("down") });

    const response = await call({ employeeId: "8" });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ submittedWeeks: [], error: true });
  });

  it("502s when the weeks lookup fails", async () => {
    service.fetchSubmittedWeeks.mockResolvedValue({
      data: null,
      error: new Error("Monday error"),
    });

    const response = await call({ employeeId: "8" });

    expect(response.status).toBe(502);
  });

  it("returns the submitted weeks for the signed-in user", async () => {
    const response = await call({ employeeId: "8" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ submittedWeeks: [week], error: false });
    expect(service.fetchSubmittedWeeks).toHaveBeenCalledWith("8");
  });

  it("treats a missing employee id as an empty string, which fails the check", async () => {
    service.canSubmitFor.mockResolvedValue({ data: false, error: null });

    const response = await call({});

    expect(service.canSubmitFor).toHaveBeenCalledWith("duncan.gates@teachinglab.org", "");
    expect(response.status).toBe(403);
  });

  it("500s on a malformed body", async () => {
    const response = await action({
      request: new Request("http://localhost/api/weekly-project-log/submitted-weeks", {
        method: "POST",
        body: "not json",
      }),
      params: {},
      context: {} as never,
    });

    expect(response.status).toBe(500);
  });
});
