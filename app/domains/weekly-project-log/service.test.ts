import { describe, expect, it, vi } from "vitest";
import type { EmployeeRepository } from "../employee/repository";
import type { WeeklyProjectLogRepository } from "./repository";
import { weeklyProjectLogService } from "./service";

const employeeRepository = (
  overrides: Partial<EmployeeRepository> = {}
): EmployeeRepository => ({
  fetchEmployee: vi.fn(async (email: string) => ({
    data: {
      name: "Duncan Gates",
      email,
      businessFunction: "Shared Operations",
      mondayProfileId: "22039575",
      employeeId: "8",
    },
    error: null,
  })),
  fetchEmployeePeopleTags: vi.fn(async () => ({
    data: { employeeProfileIds: [], homeManagerIds: [] },
    error: null,
  })),
  ...overrides,
});

const logRepository = {} as WeeklyProjectLogRepository;

const service = (employees: EmployeeRepository = employeeRepository()) =>
  weeklyProjectLogService(logRepository, employees);

describe("canSubmitFor", () => {
  it("allows the signed-in user's own employee id", async () => {
    const result = await service().canSubmitFor("duncan.gates@teachinglab.org", "8");

    expect(result).toEqual({ data: true, error: null });
  });

  it("ignores surrounding whitespace on the id", async () => {
    const result = await service().canSubmitFor("duncan.gates@teachinglab.org", " 8 ");

    expect(result.data).toBe(true);
  });

  it("refuses someone else's employee id", async () => {
    const result = await service().canSubmitFor("duncan.gates@teachinglab.org", "30");

    expect(result).toEqual({ data: false, error: null });
  });

  // Executives submit their own logs now; there is no delegated path left
  it("refuses a former executive assistant submitting for their executive", async () => {
    const employees = employeeRepository({
      fetchEmployee: vi.fn(async (email: string) => ({
        data: {
          name: "Savanna Worthington",
          email,
          businessFunction: "Shared Operations",
          mondayProfileId: "31366527",
          employeeId: "17",
        },
        error: null,
      })),
    });

    const result = await service(employees).canSubmitFor(
      "savanna.worthington@teachinglab.org",
      "2"
    );

    expect(result.data).toBe(false);
  });

  it("surfaces a lookup failure instead of denying, so the route can 502", async () => {
    const employees = employeeRepository({
      fetchEmployee: vi.fn(async () => ({
        data: null,
        error: new Error("fetchEmployee() went wrong"),
      })),
    });

    const result = await service(employees).canSubmitFor("someone@teachinglab.org", "8");

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("fetchEmployee() went wrong");
  });

  it("errors when the employee is missing with no error set", async () => {
    const employees = employeeRepository({
      fetchEmployee: vi.fn(async () => ({ data: null, error: null })) as never,
    });

    const result = await service(employees).canSubmitFor("ghost@teachinglab.org", "8");

    expect(result.error?.message).toBe("Employee not found");
  });
});
