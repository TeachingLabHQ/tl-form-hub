// NYC admin view: where NYC contractors live and where TL works, by community
// school district. The district boundaries live in nyc-geo.ts so this module
// stays light enough for any component to import.
import { addDays, dateRange, isWeekday, nextWorkWeek, openDaysIn } from "./availability";
import type { Borough, Contractor, SessionKind } from "./model";
import { SESSION_DAY_PORTION, type SessionRow } from "./sessions";

export const BOROUGHS: Borough[] = ["Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island"];

/** The borough a community school district (1-32) sits in. */
export function boroughOf(district: number): Borough {
  if (district <= 6) return "Manhattan";
  if (district <= 12) return "Bronx";
  if (district <= 23 || district === 32) return "Brooklyn";
  if (district <= 30) return "Queens";
  return "Staten Island";
}

export const isGeographicDistrict = (n: number) => Number.isInteger(n) && n >= 1 && n <= 32;

/**
 * Where a calendar site is: a geographic district (1-32), "citywide" for NYC
 * work with no single district (D75, D79, CUNY, transfer schools, CBOs), or
 * null when it isn't in NYC. Sites are the calendar's lr_name, e.g. "NY_D11"
 * or "SL_NYC D4".
 */
export function nycSiteDistrict(site: string): number | "citywide" | null {
  const s = site.trim();
  if (!/^(NY_|SL_NYC\b)/i.test(s)) return null;
  const n = Number(s.match(/\bD(\d{1,2})\b|_D(\d{1,2})\b/i)?.slice(1).find(Boolean));
  return isGeographicDistrict(n) ? n : "citywide";
}

// TL session work in NYC, one row per day, district and kind, so the page can
// total any window without refetching
export interface NycWorkDay {
  date: string; // YYYY-MM-DD
  district: number | "citywide";
  kind: SessionKind;
  // People booked: a session with two coaches counts twice
  people: number;
}

/**
 * NYC calendar rows between `from` and `to` (inclusive), totalled by weekday,
 * district and kind. Multi-day sessions count on each weekday they span, with
 * the same two-week cap on data-entry slips as synced bookouts.
 */
export function nycWork(rows: SessionRow[], from: string, to: string): NycWorkDay[] {
  const totals = new Map<string, NycWorkDay>();
  for (const row of rows) {
    const district = nycSiteDistrict(row.site);
    if (district === null || row.endDate < from || row.date > to) continue;
    const end = row.endDate > addDays(row.date, 13) ? row.date : row.endDate;
    for (const date of dateRange(row.date < from ? from : row.date, end > to ? to : end)) {
      if (!isWeekday(date)) continue;
      const key = `${date}|${district}|${row.kind}`;
      const hit = totals.get(key) ?? { date, district, kind: row.kind, people: 0 };
      hit.people += 1;
      totals.set(key, hit);
    }
  }
  return [...totals.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// A coaching day counts as half a day, as everywhere else in CBS
export const sessionDayWeight = (kind: SessionKind) => (SESSION_DAY_PORTION[kind] === "Full day" ? 1 : 0.5);

// Districts whose boundary comes within 1 km of each district's: next door,
// or across a narrow river (Lower Manhattan and Brooklyn, Astoria and East
// Harlem). Staten Island has none. nyc-geo.test.ts checks this against the
// boundaries, which are too heavy to measure in the browser.
export const DISTRICT_NEIGHBORS: Record<number, number[]> = {
  1: [2, 13, 14],
  2: [1, 3, 4, 13, 14, 15, 30],
  3: [2, 4, 5],
  4: [2, 3, 5, 7, 30],
  5: [3, 4, 6, 7, 9],
  6: [5, 7, 9, 10],
  7: [4, 5, 6, 8, 9, 12, 30],
  8: [7, 9, 11, 12, 25],
  9: [5, 6, 7, 8, 10, 12],
  10: [6, 9, 11, 12],
  11: [8, 10, 12],
  12: [7, 8, 9, 10, 11],
  13: [1, 2, 14, 15, 16, 17],
  14: [1, 2, 13, 16, 24, 30, 32],
  15: [2, 13, 17, 20, 22],
  16: [13, 14, 17, 19, 23, 32],
  17: [13, 15, 16, 18, 20, 22, 23],
  18: [17, 19, 22, 23, 27],
  19: [16, 18, 23, 24, 27, 32],
  20: [15, 17, 21, 22],
  21: [20, 22],
  22: [15, 17, 18, 20, 21, 27],
  23: [16, 17, 18, 19, 24, 32],
  24: [14, 19, 23, 25, 27, 28, 30, 32],
  25: [8, 24, 26, 28, 29, 30],
  26: [25, 28, 29],
  27: [18, 19, 22, 24, 28, 29],
  28: [24, 25, 26, 27, 29],
  29: [25, 26, 27, 28],
  30: [2, 4, 7, 14, 24, 25],
  31: [],
  32: [14, 16, 19, 23, 24],
};

export interface WorkWeek {
  monday: string;
  // Its weekdays from today on
  days: string[];
}

/** This work week (what's left of it) and the `count - 1` after it; on a weekend, starting next week. */
export function workWeeks(today: string, count: number): WorkWeek[] {
  const next = nextWorkWeek(today)[0];
  const first = isWeekday(today) ? addDays(next, -7) : next;
  return Array.from({ length: count }, (_, i) => {
    const monday = addDays(first, i * 7);
    return { monday, days: dateRange(monday, addDays(monday, 4)).filter((d) => d >= today) };
  });
}

export interface DistrictStats {
  district: number;
  // TL session days in the district over the window
  sessionDays: number;
  // Full days free among contractors who live in the district
  freeDays: number;
  // Free days among contractors in the district or a neighboring one
  nearbyFreeDays: number;
  contractors: Contractor[];
}

/** Per-district session days, free contractor days and residents over `days`. */
export function districtStats(
  contractors: Contractor[],
  work: NycWorkDay[],
  days: string[]
): { districts: Map<number, DistrictStats>; citywideSessionDays: number } {
  const districts = new Map<number, DistrictStats>();
  const stat = (district: number) => {
    let s = districts.get(district);
    if (!s) {
      s = { district, sessionDays: 0, freeDays: 0, nearbyFreeDays: 0, contractors: [] };
      districts.set(district, s);
    }
    return s;
  };
  for (let d = 1; d <= 32; d++) stat(d);

  const inWindow = new Set(days);
  let citywideSessionDays = 0;
  for (const w of work) {
    if (!inWindow.has(w.date)) continue;
    const amount = w.people * sessionDayWeight(w.kind);
    if (w.district === "citywide") citywideSessionDays += amount;
    else stat(w.district).sessionDays += amount;
  }
  for (const c of contractors) {
    if (!c.nyc?.district) continue;
    const s = stat(c.nyc.district);
    s.contractors.push(c);
    s.freeDays += openDaysIn(c, days);
  }
  for (const s of districts.values()) {
    s.nearbyFreeDays = (DISTRICT_NEIGHBORS[s.district] ?? []).reduce(
      (sum, n) => sum + stat(n).freeDays,
      s.freeDays
    );
  }
  return { districts, citywideSessionDays };
}

// Low, middle or high third
export type Tier = 0 | 1 | 2;

export interface StaffingNeed {
  // Where each third starts: [middle, high]
  workBreaks: [number, number];
  freeBreaks: [number, number];
  // Districts with TL work, most in need of staff first
  ranked: { stats: DistrictStats; work: Tier; free: Tier }[];
}

// Where the middle and top thirds of the values start
const thirds = (values: number[]): [number, number] => {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (k: number) => sorted[Math.floor((sorted.length * k) / 3)] ?? 0;
  return [at(1), at(2)];
};

const tier = (v: number, [mid, high]: [number, number]): Tier => (v <= 0 ? 0 : v >= high ? 2 : v >= mid ? 1 : 0);

/**
 * Splits the districts with TL work into thirds by session days and by free
 * days nearby, relative to each other, and ranks them: most work with the
 * fewest free people nearby first.
 */
export function staffingNeed(districts: Iterable<DistrictStats>): StaffingNeed {
  const busy = [...districts].filter((s) => s.sessionDays > 0);
  const workBreaks = thirds(busy.map((s) => s.sessionDays));
  const freeBreaks = thirds(busy.map((s) => s.nearbyFreeDays));
  const ranked = busy
    .map((stats) => ({ stats, work: tier(stats.sessionDays, workBreaks), free: tier(stats.nearbyFreeDays, freeBreaks) }))
    .sort(
      (a, b) =>
        b.work - b.free - (a.work - a.free) ||
        b.stats.sessionDays - b.stats.nearbyFreeDays - (a.stats.sessionDays - a.stats.nearbyFreeDays) ||
        a.stats.district - b.stats.district
    );
  return { workBreaks, freeBreaks, ranked };
}
