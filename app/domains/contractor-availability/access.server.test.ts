import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSignedInUser, fetchEmployee } = vi.hoisted(() => ({
  getSignedInUser: vi.fn(),
  fetchEmployee: vi.fn(),
}));

vi.mock("~/utils/auth.server", () => ({ getSignedInUser, getTeachingLabUser: vi.fn() }));
vi.mock("~/domains/employee/repository", () => ({
  employeeRepository: () => ({ fetchEmployee, fetchEmployeePeopleTags: vi.fn() }),
}));

const { authorizeContractorAccess } = await import("./access.server");

const request = () => new Request("http://localhost/api/contractor-availability/contractor");
const signIn = (email: string) => getSignedInUser.mockResolvedValue({ email, headers: new Headers() });
const asStaff = () =>
  fetchEmployee.mockResolvedValue({ data: { name: "Staff", email: "staff@teachinglab.org" }, error: null });

beforeEach(() => {
  fetchEmployee.mockResolvedValue({ data: null, error: new Error("Employee does not exist on Monday") });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("authorizeContractorAccess", () => {
  it("401s when nobody is signed in", async () => {
    getSignedInUser.mockResolvedValue(null);
    const access = await authorizeContractorAccess(request(), "a@teachinglab.org");
    expect(access.response?.status).toBe(401);
  });

  it("lets a contractor act on their own email, ignoring case, without a staff lookup", async () => {
    signIn("Pat.Lee@teachinglab.org");
    const access = await authorizeContractorAccess(request(), " pat.lee@teachinglab.org ");
    expect(access.response).toBeNull();
    expect(access.email).toBe("pat.lee@teachinglab.org");
    expect(fetchEmployee).not.toHaveBeenCalled();
  });

  it("defaults to the signed-in email when the body has none", async () => {
    signIn("pat.lee@teachinglab.org");
    const access = await authorizeContractorAccess(request(), undefined);
    expect(access.email).toBe("pat.lee@teachinglab.org");
  });

  it("403s when a contractor acts on someone else's email", async () => {
    signIn("pat.lee@teachinglab.org");
    const access = await authorizeContractorAccess(request(), "someone.else@teachinglab.org");
    expect(access.response?.status).toBe(403);
    expect(fetchEmployee).toHaveBeenCalledWith("pat.lee@teachinglab.org");
  });

  it("lets staff act on a contractor's behalf", async () => {
    signIn("staff@teachinglab.org");
    asStaff();
    const access = await authorizeContractorAccess(request(), "pat.lee@teachinglab.org");
    expect(access.response).toBeNull();
    expect(access.email).toBe("pat.lee@teachinglab.org");
  });

  it("403s a contractor on a staff-only route, even for themselves", async () => {
    signIn("pat.lee@teachinglab.org");
    const access = await authorizeContractorAccess(request(), undefined, { staffOnly: true });
    expect(access.response?.status).toBe(403);
  });

  it("fails closed when the staff lookup errors", async () => {
    signIn("staff@teachinglab.org");
    fetchEmployee.mockResolvedValue({ data: null, error: new Error("fetchEmployee() went wrong") });
    const access = await authorizeContractorAccess(request(), undefined, { staffOnly: true });
    expect(access.response?.status).toBe(403);
  });

  it("allows staff on a staff-only route", async () => {
    signIn("staff@teachinglab.org");
    asStaff();
    const access = await authorizeContractorAccess(request(), undefined, { staffOnly: true });
    expect(access.response).toBeNull();
  });
});
