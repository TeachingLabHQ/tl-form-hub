import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeContractorAccess, rosterService, assistant } = vi.hoisted(() => ({
  authorizeContractorAccess: vi.fn(),
  rosterService: { fetchRoster: vi.fn() },
  assistant: { ask: vi.fn() },
}));

vi.mock("~/domains/contractor-availability/access.server", () => ({ authorizeContractorAccess }));
vi.mock("~/domains/contractor-availability/service", () => ({
  contractorAvailabilityService: () => rosterService,
}));
vi.mock("~/domains/contractor-availability/repository", () => ({
  contractorAvailabilityRepository: () => ({}),
}));
vi.mock("~/domains/staffing-assistant/repository", () => ({
  staffingAssistantRepository: () => ({}),
}));
vi.mock("~/domains/staffing-assistant/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/domains/staffing-assistant/service")>()),
  staffingAssistantService: () => assistant,
}));
vi.mock("../../supabase/supabase.server", () => ({
  createSupabaseServerClient: () => ({ supabaseClient: {}, headers: new Headers() }),
}));

const { action } = await import("./api.contractor-availability.ask");

const question = (text: string) => ({
  messages: [{ id: "1", role: "user", parts: [{ type: "text", text }] }],
});

const post = (body: unknown) =>
  action({
    request: new Request("http://localhost/api/contractor-availability/ask", {
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
    email: "staff@teachinglab.org",
  });
  rosterService.fetchRoster.mockResolvedValue({ data: [], error: null });
  assistant.ask.mockResolvedValue({ data: new Response("stream"), error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("contractor-availability ask", () => {
  it("is staff-only and returns the denial without calling Claude", async () => {
    authorizeContractorAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
      user: null,
      email: null,
    });
    expect((await post(question("Who is free?"))).status).toBe(403);
    expect(authorizeContractorAccess).toHaveBeenCalledWith(expect.any(Request), undefined, { staffOnly: true });
    expect(assistant.ask).not.toHaveBeenCalled();
  });

  it("rejects malformed messages and over-long questions", async () => {
    expect((await post({ messages: "nope" })).status).toBe(400);
    expect((await post(question("x".repeat(1001)))).status).toBe(400);
    expect(assistant.ask).not.toHaveBeenCalled();
  });

  it("asks as the signed-in staff member over the roster and returns the stream", async () => {
    const roster = [{ email: "c@x.org" }];
    rosterService.fetchRoster.mockResolvedValue({ data: roster, error: null });
    const response = await post(question("Who is free?"));
    expect(await response.text()).toBe("stream");
    expect(assistant.ask).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: "staff@teachinglab.org", contractors: roster })
    );
  });

  it("returns a plain 500 when the roster or Claude fails", async () => {
    rosterService.fetchRoster.mockResolvedValueOnce({ data: null, error: new Error("Monday down") });
    expect((await post(question("Q"))).status).toBe(500);
    assistant.ask.mockResolvedValueOnce({ data: null, error: new Error("ANTHROPIC_API_KEY is not set") });
    const response = await post(question("Q"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "The assistant isn't available right now" });
  });
});
