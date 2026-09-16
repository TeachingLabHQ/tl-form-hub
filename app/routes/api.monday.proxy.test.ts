import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSignedInUser } = vi.hoisted(() => ({ getSignedInUser: vi.fn() }));

vi.mock("~/utils/auth.server", () => ({ getSignedInUser, getTeachingLabUser: vi.fn() }));

const { action } = await import("./api.monday.proxy");

const call = (body: unknown, method = "POST") =>
  action({
    request: new Request("http://localhost/api/monday/proxy", {
      method,
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    }),
    params: {},
    context: {} as never,
  });

beforeEach(() => {
  getSignedInUser.mockResolvedValue({
    // Contractors sign in with non-Teaching Lab addresses
    email: "someone@gmail.com",
    headers: new Headers(),
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ data: { me: { id: "1" } } }), { status: 200 }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("monday proxy", () => {
  it("405s on a non-POST request", async () => {
    const response = await call(undefined, "GET");

    expect(response.status).toBe(405);
  });

  it("401s when nobody is signed in", async () => {
    getSignedInUser.mockResolvedValue(null);

    const response = await call({ query: "{ me { id } }" });

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards a read query and returns Monday's response", async () => {
    const response = await call({ query: "{ me { id } }", variables: { a: 1 } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { me: { id: "1" } } });
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("https://api.monday.com/v2");
    expect(JSON.parse(init.body)).toEqual({
      query: "{ me { id } }",
      variables: { a: 1 },
    });
  });

  it.each([
    ["a plain mutation", "mutation { create_item (board_id: 1) { id } }"],
    // \bmutation\b, not ^mutation: a mutation can hide behind a leading query
    ["a mutation after a query", "query { me { id } } mutation { delete_item (item_id: 1) { id } }"],
    ["a differently cased mutation", "  MUTATION { delete_item (item_id: 1) { id } }"],
  ])("403s on %s", async (_label, query) => {
    const response = await call({ query });

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("403s when the query isn't a string", async () => {
    const response = await call({ query: { me: true } });

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("500s when Monday answers with a non-2xx status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));

    const response = await call({ query: "{ me { id } }" });

    expect(response.status).toBe(500);
  });
});
