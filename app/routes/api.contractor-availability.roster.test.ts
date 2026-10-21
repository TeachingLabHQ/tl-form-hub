import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeContractorAccess, service } = vi.hoisted(() => ({
  authorizeContractorAccess: vi.fn(),
  service: { fetchRoster: vi.fn() },
}));

vi.mock("~/domains/contractor-availability/access.server", () => ({ authorizeContractorAccess }));
vi.mock("~/domains/contractor-availability/service", () => ({
  contractorAvailabilityService: () => service,
}));
vi.mock("~/domains/contractor-availability/repository", () => ({
  contractorAvailabilityRepository: () => ({}),
}));

const { action } = await import("./api.contractor-availability.roster");

const post = () =>
  action({
    request: new Request("http://localhost/api/contractor-availability/roster", { method: "POST" }),
    params: {},
    context: {} as never,
  });

beforeEach(() => {
  authorizeContractorAccess.mockResolvedValue({
    response: null,
    user: { email: "staff@teachinglab.org", headers: new Headers() },
    email: "staff@teachinglab.org",
  });
  service.fetchRoster.mockResolvedValue({ data: [], error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("contractor-availability roster", () => {
  it("is staff-only", async () => {
    await post();
    expect(authorizeContractorAccess).toHaveBeenCalledWith(expect.any(Request), undefined, {
      staffOnly: true,
    });
  });

  it("returns the access denial without reading the roster", async () => {
    authorizeContractorAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
      user: null,
      email: null,
    });
    expect((await post()).status).toBe(403);
    expect(service.fetchRoster).not.toHaveBeenCalled();
  });

  it("returns the roster for staff", async () => {
    const response = await post();
    expect(response.status).toBe(200);
    expect(service.fetchRoster).toHaveBeenCalled();
  });
});
