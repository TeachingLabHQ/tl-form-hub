import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeContractorAccess, service } = vi.hoisted(() => ({
  authorizeContractorAccess: vi.fn(),
  service: { saveStaffNotes: vi.fn() },
}));

vi.mock("~/domains/contractor-availability/access.server", () => ({ authorizeContractorAccess }));
vi.mock("~/domains/contractor-availability/service", () => ({
  contractorAvailabilityService: () => service,
}));
vi.mock("~/domains/contractor-availability/repository", () => ({
  contractorAvailabilityRepository: () => ({}),
}));

const { action } = await import("./api.contractor-availability.save-staff-notes");

const post = (body: unknown) =>
  action({
    request: new Request("http://localhost/api/contractor-availability/save-staff-notes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    params: {},
    context: {} as never,
  });

beforeEach(() => {
  authorizeContractorAccess.mockResolvedValue({
    response: null,
    user: { email: "staff@teachinglab.org", headers: new Headers() },
    email: "pat.lee@teachinglab.org",
  });
  service.saveStaffNotes.mockResolvedValue({ data: "item-1", error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("contractor-availability save-staff-notes", () => {
  it("is staff-only for the named contractor", async () => {
    await post({ email: "pat.lee@teachinglab.org", notes: "Strong on K-2" });
    expect(authorizeContractorAccess).toHaveBeenCalledWith(
      expect.any(Request),
      "pat.lee@teachinglab.org",
      { staffOnly: true }
    );
  });

  it("returns the access denial and writes nothing", async () => {
    authorizeContractorAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
      user: null,
      email: null,
    });
    expect((await post({ email: "pat.lee@teachinglab.org", notes: "x" })).status).toBe(403);
    expect(service.saveStaffNotes).not.toHaveBeenCalled();
  });

  it("400s without a contractor email", async () => {
    expect((await post({ notes: "x" })).status).toBe(400);
    expect(service.saveStaffNotes).not.toHaveBeenCalled();
  });

  it("saves the notes for staff", async () => {
    const response = await post({ email: "pat.lee@teachinglab.org", notes: "Strong on K-2" });
    expect(response.status).toBe(200);
    expect(service.saveStaffNotes).toHaveBeenCalledWith("pat.lee@teachinglab.org", "Strong on K-2");
  });
});
