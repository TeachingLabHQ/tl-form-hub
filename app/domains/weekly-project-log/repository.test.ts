import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MondayApiStatusError } from "../utils";

const { fetchMondayData, insertMondayData } = vi.hoisted(() => ({
  fetchMondayData: vi.fn(),
  insertMondayData: vi.fn(),
}));

// MondayApiStatusError stays real: mutateWithRetry branches on `instanceof`
vi.mock("~/domains/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils")>();
  return { ...actual, fetchMondayData, insertMondayData };
});

const { weeklyProjectLogRepository } = await import("./repository");

const subitem = (name: string) => ({ itemName: name, columnValues: { numbers: 1 } });

// 0.5s/1s/2s of retry backoff would make these tests take seconds
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  fetchMondayData.mockReset();
  insertMondayData.mockReset();
});

// Lets the mutation's retry sleeps elapse while the promise is in flight
const runWithTimers = async <T>(promise: Promise<T>): Promise<T> => {
  const settled = promise.then(
    (value) => ({ value, error: undefined }),
    (error) => ({ value: undefined as T, error })
  );
  await vi.runAllTimersAsync();
  const { value, error } = await settled;
  if (error) {
    throw error;
  }
  return value;
};

describe("mutateWithRetry (through createSubitems)", () => {
  it("returns the created id on the first try", async () => {
    insertMondayData.mockResolvedValue({ data: { create_subitem: { id: 42 } } });

    const results = await runWithTimers(
      weeklyProjectLogRepository().createSubitems("1", [subitem("a")])
    );

    expect(results).toEqual([{ data: { id: "42" }, error: null }]);
    expect(insertMondayData).toHaveBeenCalledTimes(1);
  });

  it("retries a lock error returned inside an HTTP 200", async () => {
    insertMondayData
      .mockResolvedValueOnce({
        errors: [
          {
            message: "Item link max locks exceeded",
            extensions: { code: "ColumnValueException" },
          },
        ],
      })
      .mockResolvedValueOnce({ data: { create_subitem: { id: "7" } } });

    const results = await runWithTimers(
      weeklyProjectLogRepository().createSubitems("1", [subitem("a")])
    );

    expect(results[0]?.data).toEqual({ id: "7" });
    expect(insertMondayData).toHaveBeenCalledTimes(2);
  });

  it("gives up after 4 attempts and reports the last error", async () => {
    insertMondayData.mockResolvedValue({
      errors: [{ message: "still locked" }],
    });

    const results = await runWithTimers(
      weeklyProjectLogRepository().createSubitems("1", [subitem("a")])
    );

    expect(insertMondayData).toHaveBeenCalledTimes(4);
    expect(results[0]?.data).toBeNull();
    expect(results[0]?.error?.message).toContain("still locked");
  });

  it("retries a non-2xx status, which means Monday never processed the write", async () => {
    insertMondayData
      .mockRejectedValueOnce(new MondayApiStatusError(429))
      .mockResolvedValueOnce({ data: { create_subitem: { id: "9" } } });

    const results = await runWithTimers(
      weeklyProjectLogRepository().createSubitems("1", [subitem("a")])
    );

    expect(results[0]?.data).toEqual({ id: "9" });
    expect(insertMondayData).toHaveBeenCalledTimes(2);
  });

  it("does not retry a dropped connection, where the write may have landed", async () => {
    insertMondayData.mockRejectedValue(new TypeError("fetch failed"));

    const results = await runWithTimers(
      weeklyProjectLogRepository().createSubitems("1", [subitem("a")])
    );

    expect(insertMondayData).toHaveBeenCalledTimes(1);
    expect(results[0]?.error?.message).toBe("fetch failed");
  });

  it("creates the parent item with a single attempt", async () => {
    insertMondayData.mockResolvedValue({ errors: [{ message: "bad column" }] });

    const result = await runWithTimers(
      weeklyProjectLogRepository().createParentItem("Someone", { numbers8: 40 })
    );

    expect(insertMondayData).toHaveBeenCalledTimes(1);
    expect(result.data).toBeNull();
  });

  it("retries deleteItem up to 3 times", async () => {
    insertMondayData.mockResolvedValue({ errors: [{ message: "nope" }] });

    const result = await runWithTimers(weeklyProjectLogRepository().deleteItem("5"));

    expect(insertMondayData).toHaveBeenCalledTimes(3);
    expect(result.error?.message).toContain("nope");
  });
});

describe("mapWithConcurrency (through createSubitems)", () => {
  it("keeps at most 4 subitem creations in flight and preserves order", async () => {
    let inFlight = 0;
    let peak = 0;
    insertMondayData.mockImplementation(async (_query, variables) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight--;
      return { data: { create_subitem: { id: variables.myItemName } } };
    });

    const names = Array.from({ length: 12 }, (_, index) => `row-${index}`);
    const results = await runWithTimers(
      weeklyProjectLogRepository().createSubitems("1", names.map(subitem))
    );

    expect(peak).toBe(4);
    expect(results.map((result) => result.data?.id)).toEqual(names);
  });

  it("returns an empty array for no subitems without calling Monday", async () => {
    const results = await runWithTimers(
      weeklyProjectLogRepository().createSubitems("1", [])
    );

    expect(results).toEqual([]);
    expect(insertMondayData).not.toHaveBeenCalled();
  });
});

const logItem = (id: string, week: string, hours: string) => ({
  id,
  created_at: "2026-09-08T00:00:00Z",
  column_values: [
    { id: "date4", text: week },
    { id: "numbers8", text: hours },
  ],
});

const page = (items: unknown[], cursor: string | null, key = "items_page") =>
  key === "items_page"
    ? { data: { boards: [{ items_page: { cursor, items } }] } }
    : { data: { next_items_page: { cursor, items } } };

describe("fetchSubmittedWeeks", () => {
  it("rejects a non-numeric employee id before querying Monday", async () => {
    const result = await weeklyProjectLogRepository().fetchSubmittedWeeks('8"] } }');

    expect(fetchMondayData).not.toHaveBeenCalled();
    expect(result.error?.message).toContain("Invalid employee id");
  });

  it("maps the date and hours columns and drops entries with no date", async () => {
    fetchMondayData.mockResolvedValue(
      page([logItem("1", "2026-09-07", "40"), logItem("2", "", "12")], null)
    );

    const result = await weeklyProjectLogRepository().fetchSubmittedWeeks(" 8 ");

    expect(result.data).toEqual([
      {
        itemId: "1",
        week: "2026-09-07",
        totalHours: 40,
        createdAt: "2026-09-08T00:00:00Z",
      },
    ]);
  });

  it("follows the cursor across pages", async () => {
    fetchMondayData
      .mockResolvedValueOnce(page([logItem("1", "2026-09-07", "40")], "c1"))
      .mockResolvedValueOnce(
        page([logItem("2", "2026-08-31", "38")], "c2", "next_items_page")
      )
      .mockResolvedValueOnce(
        page([logItem("3", "2026-08-24", "40")], null, "next_items_page")
      );

    const result = await weeklyProjectLogRepository().fetchSubmittedWeeks("8");

    expect(fetchMondayData).toHaveBeenCalledTimes(3);
    expect(result.data?.map((week) => week.week)).toEqual([
      "2026-09-07",
      "2026-08-31",
      "2026-08-24",
    ]);
  });

  it("keeps earlier pages when a later page errors", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMondayData
      .mockResolvedValueOnce(page([logItem("1", "2026-09-07", "40")], "c1"))
      .mockResolvedValueOnce({ errors: [{ message: "complexity budget" }] });

    const result = await weeklyProjectLogRepository().fetchSubmittedWeeks("8");

    expect(result.error).toBeNull();
    expect(result.data?.map((week) => week.itemId)).toEqual(["1"]);
  });

  it("fails when the first page errors, so no week looks unsubmitted", async () => {
    fetchMondayData.mockResolvedValueOnce({ errors: [{ message: "denied" }] });

    const result = await weeklyProjectLogRepository().fetchSubmittedWeeks("8");

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain("denied");
  });

  it("returns an error when the request throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMondayData.mockRejectedValueOnce(new Error("network down"));

    const result = await weeklyProjectLogRepository().fetchSubmittedWeeks("8");

    expect(result.error?.message).toBe("fetchSubmittedWeeks() went wrong");
  });
});
