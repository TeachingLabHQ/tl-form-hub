import { tool } from "ai";
import { z } from "zod";
import {
  type GapStatus,
  type LoadStatus,
  type TravelReach,
  addDays,
  bookoutDaysByType,
  dateRange,
  dayStatus,
  GAP_STATUS_LABELS,
  gapStatus,
  isWeekday,
  LOAD_STATUS_LABELS,
  loadStatus,
  openDaysLeftInMonth,
  parseDate,
  searchAvailability,
  staffingFlags,
  staffingSnapshot,
  tlDaysInMonth,
  toIsoDate,
  TRAVEL_REACH_LABELS,
  travelReach,
} from "~/domains/contractor-availability/availability";
import {
  type Contractor,
  BOOKOUT_TYPES,
  bookoutTypeLabel,
  MONTH_LABELS,
  STATES,
  SUPPORT_OPTIONS,
} from "~/domains/contractor-availability/model";
import { MAX_SEARCH_DAYS } from "./model";

// Read-only tools over the roster for the staffing assistant. The counting
// and date logic is the same tested code the admin page uses, so Claude
// reports results rather than working them out. Staff notes are left out.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

// Load over the next four weeks, GAP freshness, and any double-booked days
function statusSummary(c: Contractor, today: string) {
  const f = staffingFlags(c, today);
  return {
    loadNext4Weeks: LOAD_STATUS_LABELS[f.load],
    gap: GAP_STATUS_LABELS[f.gap],
    ...(f.doubleBooked.length > 0 && { doubleBookedDays: f.doubleBooked }),
  };
}

// Profile fields Claude needs to judge fit. Contractors typed the free text
// themselves, so it's grouped under contractorWrote for the prompt to flag.
export function contractorSummary(c: Contractor, today: string) {
  const p = c.profile;
  return {
    name: c.name,
    email: c.email,
    location: [c.city, c.state].filter(Boolean).join(", "),
    contentAreas: c.contentAreas,
    ...statusSummary(c, today),
    profileSource: c.profileSource === "saved" ? "Saved by contractor" : "From intake form (never confirmed)",
    confirmedOn: p.confirmedOn,
    travel: TRAVEL_REACH_LABELS[travelReach(p)],
    travelRegions: p.regions,
    longestTrip: p.longestTrip,
    workTypes: p.support,
    usualWeekdays: p.weekdays.length ? p.weekdays : "Any weekday",
    daysPerWeek: p.daysPerWeek || "Not set",
    maxDaysPerMonth: p.maxDaysPerMonth || "Not set",
    months: p.months.length ? p.months.map((m) => MONTH_LABELS[m]) : "Year-round",
    outsideWork: p.outsideWork || "Not set",
    outsideHoursPerWeek: p.outsideHours,
    contractorWrote: { conflicts: p.conflicts, notes: p.notes },
  };
}

/** Weekdays from specific dates plus inclusive ranges, sorted and capped. */
export function expandDays(dates: string[] = [], ranges: { start: string; end: string }[] = []) {
  const days = new Set(dates.filter(isWeekday));
  for (const r of ranges) {
    if (r.end < r.start) continue;
    const end = r.end > addDays(r.start, MAX_SEARCH_DAYS * 2) ? addDays(r.start, MAX_SEARCH_DAYS * 2) : r.end;
    dateRange(r.start, end).filter(isWeekday).forEach((d) => days.add(d));
  }
  return [...days].sort().slice(0, MAX_SEARCH_DAYS);
}

export interface SearchInput {
  dates?: string[];
  ranges?: { start: string; end: string }[];
  format: "inperson" | "virtual";
  state?: string;
  role?: string;
  fullDay?: boolean;
  contentArea?: string;
}

/** Who can take a set of days: the admin page's "Find contractors" search. */
export function findAvailable(contractors: Contractor[], input: SearchInput) {
  const days = expandDays(input.dates, input.ranges);
  if (!days.length) return { error: "No weekdays in those dates." };
  const state = (input.state ?? "").toUpperCase();
  if (input.format === "inperson" && !STATES[state]) {
    return { error: "In-person searches need a two-letter US state code for where the work is." };
  }
  const matches = searchAvailability(contractors, {
    days,
    role: input.role ?? "",
    format: input.format,
    state,
    fullDay: input.fullDay ?? true,
    contentArea: input.contentArea ?? "",
  });
  const eligible = matches.filter((m) => m.eligible && m.openDays > 0);
  const ruledOut: Record<string, number> = {};
  matches
    .filter((m) => !m.eligible)
    .forEach((m) => m.reasons.forEach((r) => (ruledOut[r] = (ruledOut[r] ?? 0) + 1)));
  return {
    days,
    contractorsChecked: matches.length,
    openOnEveryDay: eligible.filter((m) => m.openDays === days.length).length,
    available: eligible.map((m) => ({
      name: m.contractor.name,
      email: m.contractor.email,
      openDays: `${m.openDays} of ${days.length}`,
      travelNote: m.travelNote,
      notOpen: m.perDay
        .filter((d) => d.status.state !== "free")
        .map((d) => ({ day: d.day, why: d.status.reason })),
    })),
    eligibleButBookedEveryDay: matches.filter((m) => m.eligible && m.openDays === 0).length,
    ruledOutCounts: ruledOut,
  };
}

const matchName = (contractors: Contractor[], query: string) => {
  const q = query.trim().toLowerCase();
  const exact = contractors.filter((c) => c.name.toLowerCase() === q);
  if (exact.length) return exact;
  const words = q.split(/\s+/).filter(Boolean);
  return contractors.filter((c) => words.every((w) => c.name.toLowerCase().includes(w)));
};

/** Named contractors' profiles, bookouts and open weekdays over a date range. */
export function contractorSchedules(
  contractors: Contractor[],
  input: { names: string[]; start: string; end: string },
  today: string
) {
  const days = dateRange(input.start, input.end > input.start ? input.end : input.start).filter(isWeekday);
  return input.names.map((query) => {
    const found = matchName(contractors, query);
    if (!found.length) return { query, found: false as const };
    return {
      query,
      found: true as const,
      contractors: found.slice(0, 5).map((c) => {
        const statuses = days.map((d) => dayStatus(c.profile, c.bookouts, d, true).state);
        return {
          ...contractorSummary(c, today),
          range: { start: input.start, end: input.end, weekdays: days.length },
          openWeekdays: statuses.filter((s) => s === "free").length,
          bookedWeekdays: statuses.filter((s) => s === "booked" || s === "partial").length,
          offWeekdays: statuses.filter((s) => s === "off").length,
          bookouts: c.bookouts
            .filter((b) => b.end >= input.start && b.start <= input.end)
            .map((b) => ({
              type: bookoutTypeLabel(b.type),
              start: b.start,
              end: b.end,
              portion: b.portion,
              note: b.note,
              ...(b.source === "logistics" && { fromLogisticsBoard: true }),
            })),
        };
      }),
    };
  });
}

export interface ListInput {
  travel?: TravelReach;
  workType?: string;
  minDaysPerWeek?: number;
  load?: LoadStatus;
  gap?: GapStatus;
  noOutsideWork?: boolean;
}

/** Contractors matching profile filters, with the free text to judge the rest. */
export function listContractors(contractors: Contractor[], input: ListInput, today: string) {
  const filtered = contractors.filter((c) => {
    const p = c.profile;
    if (input.travel && travelReach(p) !== input.travel) return false;
    if (input.workType && !p.support.includes(input.workType)) return false;
    if (input.minDaysPerWeek && p.daysPerWeek < input.minDaysPerWeek) return false;
    if (input.load && loadStatus(p, c.bookouts, today) !== input.load) return false;
    if (input.gap && gapStatus(p, today) !== input.gap) return false;
    if (input.noOutsideWork && p.outsideWork !== "None") return false;
    return true;
  });
  return {
    total: contractors.length,
    matching: filtered.length,
    contractors: filtered.map((c) => contractorSummary(c, today)),
  };
}

/** The admin page's headline numbers: the next four weeks, as of today. */
export function nextFourWeeks(contractors: Contractor[], today: string) {
  const s = staffingSnapshot(contractors, today);
  const label = <K extends string>(counts: Record<K, number>, labels: Record<K, string>) =>
    Object.fromEntries(Object.entries<number>(counts).map(([k, n]) => [labels[k as K], n]));
  return {
    window: { start: s.start, end: s.end },
    activeContractors: contractors.length,
    tlDaysBooked: s.tlBooked,
    targetDays: Math.round(s.capacity),
    utilization: s.capacity ? Math.round((s.tlBooked / s.capacity) * 100) / 100 : null,
    contractorsWithATarget: s.withTarget,
    contractorsWithRoom: s.withRoom,
    openDaysAmongThem: s.openDaysWithRoom,
    loadCounts: label(s.load, LOAD_STATUS_LABELS),
    gapCounts: label(s.gap, GAP_STATUS_LABELS),
    doubleBookedContractors: s.doubleBooked,
    doubleBookedDays: s.doubleBookedDays,
  };
}

/** The admin page's roll-ups for one calendar month (month is 1-12). */
export function monthSummary(contractors: Contractor[], year: number, month: number, today: string) {
  const byType = bookoutDaysByType(contractors, year, month - 1);
  const now = parseDate(today);
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month - 1;
  const monthStart = toIsoDate(new Date(year, month - 1, 1));
  const monthEnd = toIsoDate(new Date(year, month, 0));
  return {
    month: `${MONTH_LABELS[month - 1]} ${year}`,
    activeContractors: contractors.length,
    weekdayBookoutDaysByType: Object.fromEntries(BOOKOUT_TYPES.map((t) => [t.label, byType[t.value]])),
    tlDaysBooked: contractors.reduce((sum, c) => sum + tlDaysInMonth(c.bookouts, year, month - 1), 0),
    contractorsWithBookouts: contractors.filter((c) =>
      c.bookouts.some((b) => b.end >= monthStart && b.start <= monthEnd)
    ).length,
    ...(isCurrentMonth && { openContractorDaysLeftThisMonth: openDaysLeftInMonth(contractors, today) }),
  };
}

const supportEnum = z.enum(SUPPORT_OPTIONS as [string, ...string[]]);

/** The tool set for one request, closed over the roster loaded for it. */
export function staffingTools(contractors: Contractor[], today: string) {
  return {
    findAvailable: tool({
      description:
        "Find contractors who can take specific weekdays, the same search as the page's 'Find contractors' tool. Checks work type, content area, travel to the state (in person) and each day's bookouts, months and usual weekdays. Weekends are skipped. Use for 'who is available on/for ...'.",
      inputSchema: z.object({
        dates: z.array(isoDate).optional().describe("Specific days"),
        ranges: z
          .array(z.object({ start: isoDate, end: isoDate }))
          .optional()
          .describe("Inclusive ranges, e.g. a week Mon-Fri"),
        format: z.enum(["inperson", "virtual"]),
        state: z.string().optional().describe("Two-letter state where in-person work happens, e.g. NY for NYC"),
        role: supportEnum.optional(),
        fullDay: z.boolean().optional().describe("Whole day needed (default true); false accepts a free half day"),
        contentArea: z.string().optional(),
      }),
      execute: async (input) => findAvailable(contractors, input),
    }),
    contractorSchedules: tool({
      description:
        "Profiles, bookouts and open/booked weekday counts for named contractors over a date range. Use for 'check availability for <names>'. Names match loosely; ask the user if a name matches several people.",
      inputSchema: z.object({
        names: z.array(z.string()).min(1).max(10),
        start: isoDate,
        end: isoDate,
      }),
      execute: async (input) => contractorSchedules(contractors, input, today),
    }),
    listContractors: tool({
      description:
        "Contractors' standing profiles (travel, work types, days per week, months, outside work, conflicts, notes), filtered. Filters are exact; judge anything else, like whether written conflicts rule someone out, from the returned fields.",
      inputSchema: z.object({
        travel: z
          .enum(["any", "regional", "local", "virtual"])
          .optional()
          .describe("any = will travel anywhere in the country"),
        workType: supportEnum.optional(),
        minDaysPerWeek: z.number().min(1).max(5).optional(),
        load: z
          .enum(["over", "booked", "room", "unset"])
          .optional()
          .describe("TL load over the next four weeks against their target; unset = no target"),
        gap: z.enum(["current", "stale", "never"]).optional().describe("stale = profile not confirmed in 90 days"),
        noOutsideWork: z.boolean().optional().describe("Only those whose outside work is 'None'"),
      }),
      execute: async (input) => listContractors(contractors, input, today),
    }),
    monthSummary: tool({
      description:
        "Totals for a calendar month: bookout days by type, TL days booked, contractors with bookouts. For load, utilization, room or GAP counts use nextFourWeeks.",
      inputSchema: z.object({
        year: z.number().int().min(2024).max(2100),
        month: z.number().int().min(1).max(12),
      }),
      execute: async ({ year, month }) => monthSummary(contractors, year, month, today),
    }),
    nextFourWeeks: tool({
      description:
        "The admin page's headline numbers for the next four weeks: TL utilization against targets, contractors with room (current GAP, under target, an open day), load and GAP counts, double bookings.",
      inputSchema: z.object({}),
      execute: async () => nextFourWeeks(contractors, today),
    }),
  };
}
