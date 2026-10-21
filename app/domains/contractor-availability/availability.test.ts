import { describe, expect, it } from "vitest";
import {
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
  longestTrip: "4+ nights",
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
