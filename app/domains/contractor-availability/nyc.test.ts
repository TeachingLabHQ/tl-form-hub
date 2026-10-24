import { describe, expect, it } from "vitest";
import { profileFromIntake } from "./availability";
import type { Contractor } from "./model";
import { type DistrictStats, boroughOf, districtStats, nycSiteDistrict, nycWork, staffingNeed, workWeeks } from "./nyc";
import type { SessionRow } from "./sessions";

const row = (overrides: Partial<SessionRow>): SessionRow => ({
  date: "2026-11-10",
  endDate: "2026-11-10",
  person: "Ann Lee",
  kind: "coaching",
  project: "D11 Solves Coaching Logistics FY27",
  site: "NY_D11",
  ...overrides,
});

const contractor = (email: string, district: number | null, overrides: Partial<Contractor> = {}): Contractor => ({
  detailsItemId: email,
  name: email,
  email,
  city: "Bronx",
  state: "NY",
  timeZone: "",
  contentAreas: [],
  nyc: { district, borough: district ? boroughOf(district) : null },
  profileItemId: null,
  profile: {
    ...profileFromIntake({ travel: "", weekdays: "", support: "", scheduleNotes: "", state: "NY" }),
    weekdays: [],
    months: [],
  },
  profileSource: "saved",
  bookouts: [],
  staffNotes: "",
  staffViewedOn: null,
  intakeNotes: "",
  ...overrides,
});

describe("boroughOf", () => {
  it("maps each district range to its borough", () => {
    expect([1, 6, 7, 12, 13, 23, 24, 30, 31, 32].map(boroughOf)).toEqual([
      "Manhattan",
      "Manhattan",
      "Bronx",
      "Bronx",
      "Brooklyn",
      "Brooklyn",
      "Queens",
      "Queens",
      "Staten Island",
      "Brooklyn",
    ]);
  });
});

describe("nycSiteDistrict", () => {
  it("reads the district from NYC sites", () => {
    expect(nycSiteDistrict("NY_D11")).toBe(11);
    expect(nycSiteDistrict("NY_D6")).toBe(6);
    expect(nycSiteDistrict("SL_NYC D4")).toBe(4);
  });

  it("calls NYC work with no single district citywide", () => {
    expect(nycSiteDistrict("NY_D75")).toBe("citywide");
    expect(nycSiteDistrict("NY_D79")).toBe("citywide");
    expect(nycSiteDistrict("NY_CUNY/UA")).toBe("citywide");
    expect(nycSiteDistrict("NY_Transfer High Schools")).toBe("citywide");
  });

  it("ignores sites outside NYC", () => {
    expect(nycSiteDistrict("IL_CPS")).toBeNull();
    expect(nycSiteDistrict("SL_District C")).toBeNull();
    expect(nycSiteDistrict("")).toBeNull();
  });
});

describe("nycWork", () => {
  it("totals people by weekday, district and kind inside the window", () => {
    const work = nycWork(
      [
        row({}),
        row({ person: "Bo Kim" }),
        row({ kind: "facilitation" }),
        row({ site: "NY_D75" }),
        row({ site: "IL_CPS" }),
        row({ date: "2026-12-01", endDate: "2026-12-01" }),
      ],
      "2026-11-09",
      "2026-11-20"
    );
    expect(work).toEqual([
      { date: "2026-11-10", district: 11, kind: "coaching", people: 2 },
      { date: "2026-11-10", district: 11, kind: "facilitation", people: 1 },
      { date: "2026-11-10", district: "citywide", kind: "coaching", people: 1 },
    ]);
  });

  it("spreads multi-day sessions over weekdays and clips them to the window", () => {
    // Fri Nov 13 to Tue Nov 17, window ends Mon Nov 16
    const work = nycWork([row({ date: "2026-11-13", endDate: "2026-11-17" })], "2026-11-09", "2026-11-16");
    expect(work.map((w) => w.date)).toEqual(["2026-11-13", "2026-11-16"]);
  });
});

describe("districtStats", () => {
  const days = ["2026-11-10", "2026-11-11"];

  it("weighs coaching as half a day and counts free days at home and next door", () => {
    const { districts, citywideSessionDays } = districtStats(
      [contractor("a@tl.org", 11), contractor("b@tl.org", 9), contractor("c@tl.org", null)],
      [
        { date: "2026-11-10", district: 11, kind: "coaching", people: 4 },
        { date: "2026-11-11", district: 11, kind: "facilitation", people: 3 },
        { date: "2026-11-10", district: "citywide", kind: "facilitation", people: 2 },
        // Outside the window
        { date: "2026-11-12", district: 11, kind: "facilitation", people: 9 },
      ],
      days
    );
    expect(districts.get(11)).toMatchObject({ sessionDays: 5, freeDays: 2, nearbyFreeDays: 2 });
    expect(districts.get(11)!.contractors.map((c) => c.email)).toEqual(["a@tl.org"]);
    expect(districts.get(9)).toMatchObject({ sessionDays: 0, freeDays: 2, nearbyFreeDays: 2 });
    // D12 borders both
    expect(districts.get(12)).toMatchObject({ freeDays: 0, nearbyFreeDays: 4 });
    expect(citywideSessionDays).toBe(2);
    expect(districts.size).toBe(32);
  });

  it("only counts fully free days", () => {
    const booked = contractor("a@tl.org", 11, {
      bookouts: [{ id: "1", type: "nontl", start: "2026-11-10", end: "2026-11-10", portion: "AM", note: "" }],
    });
    expect(districtStats([booked], [], days).districts.get(11)!.freeDays).toBe(1);
  });
});

describe("workWeeks", () => {
  it("starts with what's left of this week", () => {
    // Wed Nov 11
    expect(workWeeks("2026-11-11", 2)).toEqual([
      { monday: "2026-11-09", days: ["2026-11-11", "2026-11-12", "2026-11-13"] },
      { monday: "2026-11-16", days: ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"] },
    ]);
  });

  it("starts with next week on a weekend", () => {
    expect(workWeeks("2026-11-14", 1)[0]!.monday).toBe("2026-11-16");
  });
});

describe("staffingNeed", () => {
  const stats = (district: number, sessionDays: number, nearbyFreeDays: number): DistrictStats => ({
    district,
    sessionDays,
    freeDays: 0,
    nearbyFreeDays,
    contractors: [],
  });

  it("splits districts with work into thirds and ranks the most short-handed first", () => {
    const { ranked, workBreaks, freeBreaks } = staffingNeed([
      stats(1, 10, 0),
      stats(2, 10, 30),
      stats(3, 1, 30),
      stats(4, 5, 10),
      stats(5, 0, 50),
    ]);
    expect(workBreaks).toEqual([5, 10]);
    expect(freeBreaks).toEqual([10, 30]);
    expect(ranked.map((r) => [r.stats.district, r.work, r.free])).toEqual([
      [1, 2, 0],
      [4, 1, 1],
      [2, 2, 2],
      [3, 0, 2],
    ]);
  });

  it("calls a lone busy district high on work and no one nearby low", () => {
    expect(staffingNeed([stats(11, 3, 0)]).ranked[0]).toMatchObject({ work: 2, free: 0 });
  });
});
