import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { service } = vi.hoisted(() => ({
  service: { participantExists: vi.fn(), submitParticipant: vi.fn() },
}));

vi.mock("~/domains/participant-roster/service", () => ({
  participantRosterService: () => service,
}));
vi.mock("~/domains/participant-roster/repository", () => ({
  participantRosterRepository: () => ({}),
}));

const { action } = await import("./api.participant-roster.submit");

const base = {
  firstName: "Ann",
  lastName: "Lee",
  email: "ann.lee@schools.nyc.gov",
  role: "Teacher",
  district: "NYC D75",
  school: "P123",
};

const submit = (body: unknown, method = "POST") =>
  action({
    request: new Request("http://localhost/api/participant-roster/submit", {
      method,
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    }),
    params: {},
    context: {} as never,
  });

beforeEach(() => {
  service.participantExists.mockResolvedValue({ data: false, error: null });
  service.submitParticipant.mockResolvedValue({ data: "123", error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("participant roster submit", () => {
  it("405s on a non-POST request", async () => {
    expect((await submit(undefined, "GET")).status).toBe(405);
  });

  it.each(["firstName", "lastName", "email", "role", "district", "school"])(
    "400s without %s",
    async (field) => {
      const response = await submit({ ...base, [field]: "" });

      expect(response.status).toBe(400);
      expect(service.submitParticipant).not.toHaveBeenCalled();
    }
  );

  it("400s on a whitespace-only required field", async () => {
    const response = await submit({ ...base, firstName: "   " });

    expect(response.status).toBe(400);
  });

  it("409s when the email is already on the roster for that school", async () => {
    service.participantExists.mockResolvedValue({ data: true, error: null });

    const response = await submit(base);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, duplicate: true });
    expect(service.submitParticipant).not.toHaveBeenCalled();
  });

  it("500s rather than risking a duplicate when the existence check fails", async () => {
    service.participantExists.mockResolvedValue({
      data: null,
      error: new Error("Monday error"),
    });

    const response = await submit(base);

    expect(response.status).toBe(500);
    expect(service.submitParticipant).not.toHaveBeenCalled();
  });

  it("scopes the duplicate check to email + district + school", async () => {
    await submit(base);

    expect(service.participantExists).toHaveBeenCalledWith(
      "ann.lee@schools.nyc.gov",
      "NYC D75",
      "P123"
    );
  });

  it("returns the new item id on success", async () => {
    const response = await submit(base);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, id: "123" });
  });

  it("500s when the write fails", async () => {
    service.submitParticipant.mockResolvedValue({
      data: null,
      error: new Error("board locked"),
    });

    expect((await submit(base)).status).toBe(500);
  });

  it("500s on a malformed body", async () => {
    const response = await action({
      request: new Request("http://localhost/api/participant-roster/submit", {
        method: "POST",
        body: "not json",
      }),
      params: {},
      context: {} as never,
    });

    expect(response.status).toBe(500);
  });
});
