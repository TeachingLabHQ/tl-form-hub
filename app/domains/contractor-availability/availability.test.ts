import { describe, expect, it } from "vitest";
import {
  applyTravelReach,
  bookoutDaysByType,
  doubleBookedDays,
  gapStatus,
  loadStatus,
  matchesFilter,
  staffingSnapshot,
  weeklyLoad,
  seasonOf,
  monthsFor,
  nextWorkWeek,
  notesSource,
  todayIsoEastern,
  travelReach,
  dayStatus,
  formatsFromIntake,
  profileFromIntake,
  searchAvailability,
  tlDaysInMonth,
  travelCheck,
  weekdaysFromIntake,
} from "./availability";
import type { AvailabilityProfile, Bookout, Contractor } from "./model";

const profile = (overrides: Partial<AvailabilityProfile> = {}): AvailabilityProfile => ({
  formats: ["virtual", "local", "short", "any"],
  regions: ["Anywhere"],
  longestTrip: "Multi-day OK",
  outsideWork: "None",
  outsideHours: 0,
  conflicts: "",
  support: ["Coaching", "Facilitation"],
  weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  daysPerWeek: 3,
  maxDaysPerMonth: 12,
  months: [],
  notes: "",
  confirmedOn: "2026-10-01",
  ...overrides,
});

const bookout = (overrides: Partial<Bookout>): Bookout => ({
  id: "1",
  type: "nontl",
  start: "2026-11-10",
  end: "2026-11-10",
  portion: "Full day",
  note: "",
  ...overrides,
});

const contractor = (overrides: Partial<Contractor> = {}): Contractor => ({
  detailsItemId: "1",
  name: "Test Person",
  email: "test@teachinglab.org",
  city: "Brooklyn",
  state: "NY",
  timeZone: "EST",
  contentAreas: ["Math"],
  profileItemId: null,
  profile: profile(),
  profileSource: "saved",
  bookouts: [],
  staffNotes: "",
  staffViewedOn: null,
  intakeNotes: "",
  ...overrides,
});

describe("dayStatus", () => {
  // 2026-11-10 is a Tuesday
  it("is off on weekends, non-working weekdays and unavailable months", () => {
    expect(dayStatus(profile(), [], "2026-11-14", true).state).toBe("off");
    expect(dayStatus(profile({ weekdays: ["Mon"] }), [], "2026-11-10", true).state).toBe("off");
    expect(dayStatus(profile({ months: [0, 1] }), [], "2026-11-10", true).state).toBe("off");
  });

  it("treats empty weekdays/months as no restriction", () => {
    expect(dayStatus(profile({ weekdays: [], months: [] }), [], "2026-11-10", true).state).toBe("free");
  });

  it("counts a half-day bookout as partial, or booked when a full day is needed", () => {
    const b = [bookout({ portion: "AM" })];
    expect(dayStatus(profile(), b, "2026-11-10", false).state).toBe("partial");
    expect(dayStatus(profile(), b, "2026-11-10", true).state).toBe("booked");
  });

  it("covers every day of a multi-day bookout, inclusive", () => {
    const b = [bookout({ start: "2026-11-09", end: "2026-11-11" })];
    expect(dayStatus(profile(), b, "2026-11-11", true).state).toBe("booked");
    expect(dayStatus(profile(), b, "2026-11-12", true).state).toBe("free");
  });
});

describe("travelCheck", () => {
  it("accepts in-state work for a local-only contractor", () => {
    const c = contractor({ profile: profile({ formats: ["local"], regions: [] }) });
    expect(travelCheck(c, "NY", "inperson").ok).toBe(true);
    expect(travelCheck(c, "NJ", "inperson").ok).toBe(false);
  });

  it("limits regional travelers to their regions", () => {
    const c = contractor({ state: "TN", profile: profile({ formats: ["short"], regions: ["Southeast"] }) });
    expect(travelCheck(c, "NC", "inperson").ok).toBe(true);
    expect(travelCheck(c, "NY", "inperson")).toEqual({ ok: false, reason: "Travels to Southeast only" });
  });

  it("rejects virtual work for someone who only works in person", () => {
    const c = contractor({ profile: profile({ formats: ["any"] }) });
    expect(travelCheck(c, "NY", "virtual").ok).toBe(false);
  });
});

describe("searchAvailability", () => {
  it("ranks by open days and explains exclusions", () => {
    const days = ["2026-11-10", "2026-11-11"];
    const open = contractor({ name: "Open", email: "a@x" });
    const half = contractor({ name: "Half", email: "b@x", bookouts: [bookout({})] });
    const coachOnly = contractor({ name: "Coach", email: "c@x", profile: profile({ support: ["Coaching"] }) });
    const results = searchAvailability([half, coachOnly, open], {
      days,
      role: "Facilitation",
      format: "inperson",
      state: "NY",
      fullDay: true,
      contentArea: "",
    });
    expect(results.map((r) => [r.contractor.name, r.openDays, r.eligible])).toEqual([
      ["Coach", 2, false],
      ["Open", 2, true],
      ["Half", 1, true],
    ]);
    expect(results[0]!.reasons).toEqual(["Doesn't do facilitation"]);
  });
});

describe("tlDaysInMonth", () => {
  it("counts weekday TL commitments only, half days as 0.5", () => {
    const b = [
      bookout({ type: "fac", start: "2026-11-13", end: "2026-11-16" }), // Fri-Mon -> 2 weekdays
      bookout({ id: "2", type: "other", start: "2026-11-18", end: "2026-11-18", portion: "PM" }),
      bookout({ id: "3", type: "nontl", start: "2026-11-19", end: "2026-11-20" }),
    ];
    expect(tlDaysInMonth(b, 2026, 10)).toBe(2.5);
  });
});

describe("intake parsing", () => {
  // Board labels contain commas, so substring matching is required
  it("reads travel formats from the board's comma-laden dropdown text", () => {
    expect(
      formatsFromIntake(
        "Virtual, In person - local only (local commute only, no overnights), In person - 2 to 3 days (including travel)"
      )
    ).toEqual(["virtual", "local", "short"]);
  });

  it("reads weekday names and ignores the free-text options", () => {
    expect(
      weekdaysFromIntake("Monday, Wednesday, Schedule varies around another part- or full-time job")
    ).toEqual(["Mon", "Wed"]);
  });

  it("derives travel regions from the home state for 2-3 day travelers", () => {
    const p = profileFromIntake({
      travel: "In person - 2 to 3 days (including travel)",
      weekdays: "",
      support: "Coaching or Facilitation",
      scheduleNotes: "",
      state: "TX",
    });
    expect(p).toMatchObject({
      regions: ["Southwest"],
      support: ["Coaching", "Facilitation"],
      confirmedOn: null,
    });
  });
});

describe("loadStatus", () => {
  // A Monday: the next four weeks run Nov 2-27. Target is min(3 d/wk × 4.3 ≈ 13,
  // max 12) = 12 a month, so 12 × 4 / 4.3 ≈ 11.2 days; 80% of that is ≈ 8.9
  const today = "2026-11-02";
  const fac = (end: string) => [bookout({ type: "fac", start: "2026-11-02", end })];

  it("compares the next four weeks' TL days with the prorated target", () => {
    expect(loadStatus(profile(), fac("2026-11-11"), today)).toBe("room"); // 8 days
    expect(loadStatus(profile(), fac("2026-11-13"), today)).toBe("booked"); // 10 days
    expect(loadStatus(profile(), fac("2026-11-17"), today)).toBe("over"); // 12 days
  });

  it("ignores non-TL bookouts and work past the window", () => {
    const nontl = [bookout({ type: "nontl", start: "2026-11-02", end: "2026-11-30" })];
    expect(loadStatus(profile(), nontl, today)).toBe("room");
    expect(loadStatus(profile(), [bookout({ type: "fac", start: "2026-11-30", end: "2026-12-31" })], today)).toBe("room");
  });

  it("has no load status without a target, whatever is booked", () => {
    expect(loadStatus(profile({ daysPerWeek: 0, maxDaysPerMonth: 0 }), fac("2026-11-30"), today)).toBe("unset");
  });

  it("doesn't let a stale GAP hide the load", () => {
    const stale = profile({ confirmedOn: "2026-01-01" });
    expect(gapStatus(stale, today)).toBe("stale");
    expect(loadStatus(stale, fac("2026-11-17"), today)).toBe("over");
  });
});

describe("gapStatus", () => {
  it("is current within 90 days, then stale; never when unconfirmed", () => {
    expect(gapStatus(profile({ confirmedOn: "2026-08-04" }), "2026-11-02")).toBe("current"); // 90 days
    expect(gapStatus(profile({ confirmedOn: "2026-08-03" }), "2026-11-02")).toBe("stale");
    expect(gapStatus(profile({ confirmedOn: null }), "2026-11-02")).toBe("never");
  });
});

describe("doubleBookedDays", () => {
  const days = ["2026-11-10", "2026-11-11"];

  it("flags TL work on a non-TL bookout day", () => {
    const b = [
      bookout({ type: "nontl", start: "2026-11-10", end: "2026-11-11" }),
      bookout({ id: "2", type: "fac", start: "2026-11-11", end: "2026-11-11", source: "logistics" }),
    ];
    expect(doubleBookedDays(b, days)).toEqual(["2026-11-11"]);
  });

  it("lets an AM and a PM share a day, but flags an untimed half day", () => {
    const nontlAm = bookout({ type: "nontl", portion: "AM" });
    expect(doubleBookedDays([nontlAm, bookout({ id: "2", type: "fac", portion: "PM" })], days)).toEqual([]);
    expect(doubleBookedDays([nontlAm, bookout({ id: "2", type: "fac", portion: "Half day" })], days)).toEqual([
      "2026-11-10",
    ]);
  });
});

describe("travel preference", () => {
  it("round-trips each single answer through formats and regions", () => {
    for (const reach of ["any", "regional", "local", "virtual"] as const) {
      const p = profile({ ...applyTravelReach(profile({ regions: ["West"] }), reach) });
      expect(travelReach(p)).toBe(reach === "regional" ? "regional" : reach);
    }
  });

  it("keeps picked regions when switching to regional", () => {
    expect(applyTravelReach(profile({ regions: ["Anywhere", "West"] }), "regional").regions).toEqual(["West"]);
  });
});

describe("times of year", () => {
  it("recognizes the presets and falls back to specific months", () => {
    expect(seasonOf([])).toBe("year");
    expect(seasonOf(monthsFor("school", []))).toBe("school");
    expect(seasonOf([7, 5, 6])).toBe("summer");
    expect(seasonOf([2, 3])).toBe("custom");
    expect(monthsFor("custom", [2, 3])).toEqual([2, 3]);
  });

  it("counts June and August as school year, leaving only July off", () => {
    const school = profile({ months: monthsFor("school", []) });
    expect(dayStatus(school, [], "2027-06-15", true).state).toBe("free");
    expect(dayStatus(school, [], "2027-08-16", true).state).toBe("free");
    expect(dayStatus(school, [], "2027-07-14", true).state).toBe("off");
  });
});

describe("nextWorkWeek", () => {
  it("is next week's Mon-Fri, moving on once Monday starts", () => {
    expect(nextWorkWeek("2026-10-21")).toEqual(["2026-10-26", "2026-10-30"]); // Wed
    expect(nextWorkWeek("2026-10-25")).toEqual(["2026-10-26", "2026-10-30"]); // Sun
    expect(nextWorkWeek("2026-10-26")).toEqual(["2026-11-02", "2026-11-06"]); // Mon
  });

  it("uses Eastern time for today", () => {
    // 12:30am Monday in New York is still Sunday evening on the West Coast
    expect(todayIsoEastern(new Date("2026-10-26T04:30:00Z"))).toBe("2026-10-26");
    expect(todayIsoEastern(new Date("2026-10-26T03:59:00Z"))).toBe("2026-10-25");
  });
});

describe("admin roll-ups", () => {
  it("counts weekday bookout days by type within the month only", () => {
    const totals = bookoutDaysByType(
      [
        contractor({
          bookouts: [
            bookout({ type: "fac", start: "2026-10-29", end: "2026-11-03" }), // Nov 2-3
            bookout({ type: "nontl", start: "2026-11-09", end: "2026-11-09", portion: "AM" }),
          ],
        }),
      ],
      2026,
      10
    );
    expect(totals).toEqual({ fac: 2, nontl: 0.5, other: 0 });
  });

  it("matches the roster filters", () => {
    const f = { load: "room" as const, gap: "stale" as const, doubleBooked: ["2026-11-10"] };
    expect(matchesFilter(f, "gap:stale")).toBe(true);
    expect(matchesFilter(f, "load:over")).toBe(false);
    expect(matchesFilter(f, "attention")).toBe(true); // double-booked
    expect(matchesFilter(f, "room")).toBe(false); // room, but the GAP is stale
    expect(matchesFilter(f, "refresh")).toBe(true);
  });

  it("sums the next four weeks for the headline numbers", () => {
    const today = "2026-11-02";
    const snapshot = staffingSnapshot(
      [
        // Over target and double-booked
        contractor({
          email: "a@x.org",
          bookouts: [
            bookout({ type: "fac", start: "2026-11-02", end: "2026-11-17" }),
            bookout({ id: "2", type: "nontl", start: "2026-11-03", end: "2026-11-03" }),
          ],
        }),
        // Has room: 20 weekdays, 2 of them taken
        contractor({ email: "b@x.org", bookouts: [bookout({ type: "other", start: "2026-11-05", end: "2026-11-06" })] }),
        // Room on paper, but the GAP is stale, so not counted as room
        contractor({ email: "c@x.org", profile: profile({ confirmedOn: null }) }),
        // No target: left out of utilization
        contractor({
          email: "d@x.org",
          profile: profile({ daysPerWeek: 0, maxDaysPerMonth: 0 }),
          bookouts: [bookout({ type: "fac", start: "2026-11-02", end: "2026-11-27" })],
        }),
      ],
      today
    );
    expect(snapshot).toMatchObject({
      start: "2026-11-02",
      end: "2026-11-27",
      tlBooked: 14,
      withTarget: 3,
      withRoom: 1,
      openDaysWithRoom: 18,
      load: { over: 1, booked: 0, room: 2, unset: 1 },
      gap: { current: 3, stale: 0, never: 1 },
      overTarget: 1,
      doubleBooked: 1,
      doubleBookedDays: 1,
      attention: 1,
    });
    expect(snapshot.capacity).toBeCloseTo((3 * 12 * 4) / 4.3);
  });

  it("splits the next weeks by type, Monday to Friday, against the weekly target", () => {
    const weeks = weeklyLoad(
      [
        contractor({
          bookouts: [
            bookout({ type: "fac", start: "2026-11-06", end: "2026-11-09" }), // Fri + Mon
            bookout({ id: "2", type: "fac", start: "2026-11-09", end: "2026-11-09", portion: "AM" }),
            bookout({ id: "3", type: "nontl", start: "2026-11-10", end: "2026-11-10", portion: "PM" }),
          ],
        }),
      ],
      "2026-11-07", // a Saturday starts with the coming week
      2
    );
    expect(weeks.map((w) => w.start)).toEqual(["2026-11-09", "2026-11-16"]);
    expect(weeks[0]!.days).toEqual({ fac: 1, nontl: 0.5, other: 0 });
    expect(weeks[0]!.target).toBeCloseTo(12 / 4.3);
  });

  it("keeps TL days of contractors with no target out of the measured share", () => {
    const [week] = weeklyLoad(
      [
        contractor({
          profile: profile({ daysPerWeek: 0, maxDaysPerMonth: 0 }),
          bookouts: [bookout({ type: "fac", start: "2026-11-09", end: "2026-11-10" })],
        }),
      ],
      "2026-11-09",
      1
    );
    expect(week).toMatchObject({ days: { fac: 0, nontl: 0, other: 0 }, untargeted: 2, target: 0 });
  });
});

describe("notesSource", () => {
  it("says whether the notes are the onboarding answer, edited, or removed", () => {
    expect(notesSource("Out Fridays", "")).toBeNull();
    expect(notesSource(" Out Fridays ", "Out Fridays")).toBe("From your onboarding form, not changed since");
    expect(notesSource("Out Fridays and Mondays", "Out Fridays")).toBe("Edited from your onboarding form answer");
    expect(notesSource("", "Out Fridays")).toBe("Onboarding form answer removed");
  });
});
