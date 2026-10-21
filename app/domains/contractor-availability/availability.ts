import {
  type AvailabilityProfile,
  type Bookout,
  type Contractor,
  type TravelFormat,
  type Weekday,
  bookoutTypeLabel,
  STATES,
  WEEKDAYS,
} from "./model";

// Pure availability logic shared by the contractor calendar, the staffing
// search/capacity grid, and the API routes. Dates are "YYYY-MM-DD" strings
// throughout (compared lexically), parsed as local dates to avoid TZ shifts.

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const isIsoDate = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export const parseDate = (s: string) => {
  const [y = 0, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const pad = (n: number) => String(n).padStart(2, "0");
export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayIso = () => toIsoDate(new Date());

export const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
};

export const dateRange = (start: string, end: string) => {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
};

export const isWeekday = (s: string) => {
  const dow = parseDate(s).getDay();
  return dow > 0 && dow < 6;
};

export const daysBetween = (a: string, b: string) =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);

export const formatDate = (s: string) => {
  const d = parseDate(s);
  return `${MON[d.getMonth()]} ${d.getDate()}`;
};

export const formatDateWithDay = (s: string) =>
  `${DOW[parseDate(s).getDay()]} ${formatDate(s)}`;

export const formatRange = (start: string, end: string) => {
  if (start === end) return formatDate(start);
  const a = parseDate(start);
  const b = parseDate(end);
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
    ? `${formatDate(start)}–${b.getDate()}`
    : `${formatDate(start)} – ${formatDate(end)}`;
};

export type DayState = "free" | "partial" | "booked" | "off";
export interface DayStatus {
  state: DayState;
  reason: string;
  bookout?: Bookout;
}

export const bookoutsOn = (bookouts: Bookout[], day: string) =>
  bookouts.filter((b) => b.start <= day && b.end >= day);

/**
 * Whether a contractor can take work on a given day. `fullDay` asks for the
 * whole day, so a half-day bookout counts as booked rather than partial.
 */
export function dayStatus(
  profile: AvailabilityProfile,
  bookouts: Bookout[],
  day: string,
  fullDay: boolean
): DayStatus {
  const date = parseDate(day);
  const dow = DOW[date.getDay()];
  if (date.getDay() === 0 || date.getDay() === 6) return { state: "off", reason: "Weekend" };
  if (profile.months.length && !profile.months.includes(date.getMonth())) {
    return { state: "off", reason: `Not available in ${MON[date.getMonth()]}` };
  }
  if (profile.weekdays.length && !profile.weekdays.includes(dow as Weekday)) {
    return { state: "off", reason: `Doesn't usually work ${dow}s` };
  }
  const hits = bookoutsOn(bookouts, day);
  if (!hits.length) return { state: "free", reason: "Open" };
  const full = hits.find((b) => b.portion === "Full day");
  const hit = full ?? hits[0]!;
  const label = bookoutTypeLabel(hit.type) + (hit.portion !== "Full day" ? ` (${hit.portion})` : "");
  if (full || fullDay) return { state: "booked", reason: label, bookout: hit };
  return { state: "partial", reason: `${hit.portion} taken`, bookout: hit };
}

export type TravelReach = "any" | "regional" | "local" | "virtual";
export const TRAVEL_REACH_LABELS: Record<TravelReach, string> = {
  any: "Anywhere",
  regional: "Regional",
  local: "Local only",
  virtual: "Virtual only",
};

export function travelReach(profile: AvailabilityProfile): TravelReach {
  const f = profile.formats;
  if (f.includes("any") && profile.regions.includes("Anywhere")) return "any";
  if (f.includes("short") || f.includes("any")) return "regional";
  if (f.includes("local")) return "local";
  return "virtual";
}

/** Whether the contractor would take work in this state/format, and why not. */
export function travelCheck(
  contractor: Pick<Contractor, "state" | "city" | "profile">,
  state: string,
  format: "inperson" | "virtual"
): { ok: boolean; reason: string } {
  const { formats, regions } = contractor.profile;
  if (format === "virtual") {
    return formats.includes("virtual")
      ? { ok: true, reason: "" }
      : { ok: false, reason: "Doesn't do virtual work" };
  }
  if (!formats.some((f) => f !== "virtual")) return { ok: false, reason: "Virtual only" };
  if (contractor.state && contractor.state === state) {
    return { ok: true, reason: `Lives in ${STATES[state]?.name ?? state}` };
  }
  if (!formats.includes("short") && !formats.includes("any")) {
    return { ok: false, reason: `Local only${contractor.state ? ` (${contractor.state})` : ""}` };
  }
  const region = STATES[state]?.region;
  if (regions.includes("Anywhere") || (region && regions.includes(region))) {
    return { ok: true, reason: contractor.state ? `Travels from ${contractor.state}` : "" };
  }
  return {
    ok: false,
    reason: regions.length ? `Travels to ${regions.join(", ")} only` : "No travel regions set",
  };
}

export interface AvailabilityQuery {
  days: string[];
  role: string;
  format: "inperson" | "virtual";
  state: string;
  fullDay: boolean;
  contentArea: string; // "" = any
}

export interface AvailabilityMatch {
  contractor: Contractor;
  eligible: boolean;
  reasons: string[];
  travelNote: string;
  perDay: { day: string; status: DayStatus }[];
  openDays: number;
}

/** Who can take a set of dates. Sorted most-open first. */
export function searchAvailability(
  contractors: Contractor[],
  query: AvailabilityQuery
): AvailabilityMatch[] {
  return contractors
    .map((c) => {
      const reasons: string[] = [];
      if (query.role && !c.profile.support.includes(query.role)) {
        reasons.push(`Doesn't do ${query.role.toLowerCase()}`);
      }
      if (query.contentArea && !c.contentAreas.includes(query.contentArea)) {
        reasons.push(`No ${query.contentArea}`);
      }
      const travel = travelCheck(c, query.state, query.format);
      if (!travel.ok) reasons.push(travel.reason);
      const perDay = query.days.map((day) => ({
        day,
        status: dayStatus(c.profile, c.bookouts, day, query.fullDay),
      }));
      const openDays = perDay.filter(
        (d) => d.status.state === "free" || (!query.fullDay && d.status.state === "partial")
      ).length;
      return {
        contractor: c,
        eligible: reasons.length === 0,
        reasons,
        travelNote: travel.ok ? travel.reason : "",
        perDay,
        openDays,
      };
    })
    .sort((a, b) => b.openDays - a.openDays || a.contractor.name.localeCompare(b.contractor.name));
}

/** Weekday TL-committed days (facilitation + other TL) in a calendar month. */
export function tlDaysInMonth(bookouts: Bookout[], year: number, month: number) {
  const start = `${year}-${pad(month + 1)}-01`;
  const end = toIsoDate(new Date(year, month + 1, 0));
  let total = 0;
  for (const day of dateRange(start, end)) {
    if (!isWeekday(day)) continue;
    const hit = bookoutsOn(bookouts, day).find((b) => b.type !== "nontl");
    if (hit) total += hit.portion === "Full day" ? 1 : 0.5;
  }
  return total;
}

/** Target TL days in a month, from the profile (0 when not set). */
export const monthlyTarget = (profile: AvailabilityProfile) => {
  const fromWeekly = Math.round(profile.daysPerWeek * 4.3);
  if (!profile.maxDaysPerMonth) return fromWeekly;
  if (!fromWeekly) return profile.maxDaysPerMonth;
  return Math.min(fromWeekly, profile.maxDaysPerMonth);
};

export const STALE_PROFILE_DAYS = 90;
export const profileAgeDays = (profile: AvailabilityProfile, today = todayIso()) =>
  profile.confirmedOn ? daysBetween(profile.confirmedOn, today) : null;

export type ContractorStatus = "available" | "booked" | "stale";
export const CONTRACTOR_STATUS_LABELS: Record<ContractorStatus, string> = {
  available: "Available",
  booked: "Mostly booked",
  stale: "Stale GAP",
};
export const MOSTLY_BOOKED_SHARE = 0.8;

/**
 * Staffing status: a stale (over 90 days) or never-confirmed profile first,
 * then mostly booked once this month's TL days reach 80% of the target.
 */
export function contractorStatus(
  profile: AvailabilityProfile,
  bookouts: Bookout[],
  today = todayIso()
): ContractorStatus {
  const age = profileAgeDays(profile, today);
  if (age === null || age > STALE_PROFILE_DAYS) return "stale";
  const now = parseDate(today);
  const target = monthlyTarget(profile);
  const load = tlDaysInMonth(bookouts, now.getFullYear(), now.getMonth());
  return target > 0 && load >= target * MOSTLY_BOOKED_SHARE ? "booked" : "available";
}

// ---------------------------------------------------------------------------
// Intake answers (Coach/Facilitator Details board) -> starting profile.
// The board's dropdown labels contain commas, so match on substrings rather
// than splitting the column text.

export function formatsFromIntake(text: string): TravelFormat[] {
  const t = text.toLowerCase();
  const out: TravelFormat[] = [];
  if (t.includes("virtual")) out.push("virtual");
  if (t.includes("local only")) out.push("local");
  if (t.includes("2 to 3 days")) out.push("short");
  if (t.includes("no limits")) out.push("any");
  return out;
}

const WEEKDAY_NAMES: Record<Weekday, string> = {
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
};

export function weekdaysFromIntake(text: string): Weekday[] {
  const t = text.toLowerCase();
  return WEEKDAYS.filter((d) => t.includes(WEEKDAY_NAMES[d]));
}

export function supportFromIntake(text: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  if (t.includes("coaching")) out.push("Coaching");
  if (t.includes("facilitation")) out.push("Facilitation");
  return out;
}

export function profileFromIntake(answers: {
  travel: string;
  weekdays: string;
  support: string;
  scheduleNotes: string;
  state: string;
}): AvailabilityProfile {
  const formats = formatsFromIntake(answers.travel);
  const region = STATES[answers.state]?.region;
  return {
    formats,
    regions: formats.includes("any")
      ? ["Anywhere"]
      : formats.includes("short") && region
        ? [region]
        : [],
    longestTrip: formats.includes("any")
      ? "4+ nights"
      : formats.includes("short")
        ? "2-3 nights"
        : "Day trips only",
    outsideWork: "",
    outsideHours: 0,
    conflicts: "",
    support: supportFromIntake(answers.support),
    weekdays: weekdaysFromIntake(answers.weekdays),
    daysPerWeek: 0,
    maxDaysPerMonth: 0,
    months: [],
    notes: answers.scheduleNotes.trim(),
    confirmedOn: null,
  };
}
