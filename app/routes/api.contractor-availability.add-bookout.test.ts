import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { service } = vi.hoisted(() => ({
  service: { addBookout: vi.fn() },
}));

vi.mock("~/domains/contractor-availability/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/domains/contractor-availability/service")>()),
  contractorAvailabilityService: () => service,
}));
vi.mock("~/domains/contractor-availability/repository", () => ({
  contractorAvailabilityRepository: () => ({}),
}));

const { action } = await import("./api.contractor-availability.add-bookout");

const post = (body: unknown, method = "POST") =>
  action({
    request: new Request("http://localhost/api/contractor-availability/add-bookout", {
      method,
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    }),
    params: {},
    context: {} as never,
  });

const bookout = { type: "nontl", start: "2026-11-10", end: "2026-11-12", portion: "Full day", note: "" };

beforeEach(() => {
  service.addBookout.mockResolvedValue({ data: "sub-1", error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("contractor-availability add-bookout", () => {
  it("405s on a non-POST request", async () => {
    expect((await post(undefined, "GET")).status).toBe(405);
  });

  it("400s with the validation message and writes nothing", async () => {
    const response = await post({ email: "a@tl.org", bookout: { ...bookout, end: "2026-11-01" } });
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error?: string }).error).toMatch(/before the start/);
    expect(service.addBookout).not.toHaveBeenCalled();
  });

  it("saves a valid bookout for the contractor", async () => {
    const response = await post({ email: "a@tl.org", bookout });
    expect(response.status).toBe(200);
    expect(service.addBookout).toHaveBeenCalledWith("a@tl.org", bookout);
  });

  it("500s when Monday fails", async () => {
    service.addBookout.mockResolvedValue({ data: null, error: new Error("boom") });
    expect((await post({ email: "a@tl.org", bookout })).status).toBe(500);
  });
});
