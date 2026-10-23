import { describe, expect, it } from "vitest";
import { tlDaysInMonth } from "./availability";
import { type SessionRow, SESSION_DAY_PORTION, sessionBookouts } from "./sessions";

const row = (overrides: Partial<SessionRow>): SessionRow => ({
  date: "2026-11-10",
  endDate: "2026-11-10",
  person: "Ann Lee",
  kind: "coaching",
  project: "District A Coaching",
  ...overrides,
});

const users = [{ name: "Ann Lee", email: "Ann@TL.org" }];

describe("sessionBookouts", () => {
  it("matches calendar names to emails through Monday users, ignoring case and accents", () => {
    const result = sessionBookouts([row({ person: "ann  lée" }), row({ person: "Nobody" })], users, "2026-11-01");
    expect([...result.keys()]).toEqual(["ann@tl.org"]);
    expect(result.get("ann@tl.org")).toEqual([
      {
        id: "logistics-ann@tl.org-2026-11-10",
        type: "fac",
        start: "2026-11-10",
        end: "2026-11-10",
        portion: "Half day",
        note: "Coaching · District A Coaching",
        source: "logistics",
      },
    ]);
  });

  // The assumption the page states: facilitation is a full day, coaching half
  it("counts facilitation as a full day and coaching as a half day", () => {
    expect(SESSION_DAY_PORTION).toEqual({ facilitation: "Full day", coaching: "Half day" });
    const result = sessionBookouts(
      [
        row({ date: "2026-11-10", endDate: "2026-11-10" }),
        row({ date: "2026-11-11", endDate: "2026-11-12", kind: "facilitation", project: "PL Site" }),
      ],
      users,
      "2026-11-01"
    ).get("ann@tl.org")!;
    expect(tlDaysInMonth(result, 2026, 10)).toBe(2.5);
  });

  it("makes a day with any facilitation a facilitation day and lists its projects once", () => {
    const [day] = sessionBookouts(
      [row({}), row({ kind: "facilitation", project: "PL Site" }), row({ project: "District B" }), row({})],
      users,
      "2026-11-01"
    ).get("ann@tl.org")!;
    expect(day).toMatchObject({ portion: "Full day", note: "Facilitation · District A Coaching +2 more" });
  });

  it("drops days before the cutoff and treats a multi-week range as one day", () => {
    const result = sessionBookouts(
      [
        row({ date: "2026-10-28", endDate: "2026-10-30" }),
        row({ date: "2026-10-30", endDate: "2026-11-02", kind: "facilitation" }),
        row({ date: "2026-11-20", endDate: "2027-03-01", kind: "facilitation" }),
      ],
      users,
      "2026-11-01"
    ).get("ann@tl.org")!;
    expect(result.map((b) => b.start)).toEqual(["2026-11-01", "2026-11-02", "2026-11-20"]);
  });
});
