import { afterEach, describe, expect, it, vi } from "vitest";

const { fetchMondayData } = vi.hoisted(() => ({ fetchMondayData: vi.fn() }));

vi.mock("~/domains/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils")>();
  return { ...actual, fetchMondayData };
});

const { employeeRepository } = await import("./repository");

afterEach(() => {
  vi.restoreAllMocks();
  fetchMondayData.mockReset();
});

const item = (
  employeeId: string,
  people: string[],
  managers: string[]
) => ({
  name: "Duncan Gates",
  column_values: [
    { id: "text_mkpt2c0x", text: employeeId },
    {
      id: "people",
      text: "Duncan Gates",
      persons_and_teams: people.map((id) => ({ id, kind: "person" })),
    },
    {
      id: "people6",
      text: "A Manager",
      persons_and_teams: managers.map((id) => ({ id, kind: "person" })),
    },
  ],
});

const board = (items: unknown[]) => ({
  data: { boards: [{ items_page: { items } }] },
});

describe("fetchEmployeePeopleTags", () => {
  it("returns the linked employee and home manager user ids", async () => {
    fetchMondayData.mockResolvedValue(board([item("8", ["22039575"], ["22044513"])]));

    const result = await employeeRepository().fetchEmployeePeopleTags("8");

    expect(result).toEqual({
      data: { employeeProfileIds: ["22039575"], homeManagerIds: ["22044513"] },
      error: null,
    });
  });

  it("drops teams from a People column, keeping only persons", async () => {
    fetchMondayData.mockResolvedValue({
      data: {
        boards: [
          {
            items_page: {
              items: [
                {
                  name: "Duncan Gates",
                  column_values: [
                    { id: "text_mkpt2c0x", text: "8" },
                    {
                      id: "people",
                      text: "",
                      persons_and_teams: [
                        { id: "22039575", kind: "person" },
                        { id: "999", kind: "team" },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    });

    const result = await employeeRepository().fetchEmployeePeopleTags("8");

    expect(result.data).toEqual({
      employeeProfileIds: ["22039575"],
      homeManagerIds: [],
    });
  });

  it("rejects a non-numeric employee id before querying Monday", async () => {
    const result = await employeeRepository().fetchEmployeePeopleTags("8a");

    expect(fetchMondayData).not.toHaveBeenCalled();
    expect(result.error?.message).toContain("Invalid employee id");
  });

  it("errors when Monday's fuzzy match returns an id that isn't an exact match", async () => {
    // any_of on a text column matches "81" for "8"; the repository re-checks
    fetchMondayData.mockResolvedValue(board([item("81", ["1"], ["2"])]));

    const result = await employeeRepository().fetchEmployeePeopleTags("8");

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain("found 0");
  });

  it("errors when two employees share an id, rather than tagging the wrong one", async () => {
    fetchMondayData.mockResolvedValue(
      board([item("8", ["1"], ["2"]), item("8", ["3"], ["4"])])
    );

    const result = await employeeRepository().fetchEmployeePeopleTags("8");

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain("found 2");
  });

  it("returns an error when the request throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMondayData.mockRejectedValue(new Error("network down"));

    const result = await employeeRepository().fetchEmployeePeopleTags("8");

    expect(result.error?.message).toBe("fetchEmployeePeopleTags() went wrong");
  });
});
