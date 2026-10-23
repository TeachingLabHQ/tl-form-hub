// TL facilitation and coaching sessions from the partnership logistics boards,
// read from the daily FY27 session calendar and shown as read-only bookouts.
import { addDays, dateRange } from "./availability";
import type { Bookout, DayPortion } from "./model";

export type SessionKind = "facilitation" | "coaching";

// One calendar row, one person per row
export interface SessionRow {
  date: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD, inclusive; same as date for one-day sessions
  person: string; // the Monday user's display name
  kind: SessionKind;
  project: string;
}

export interface MondayUser {
  name: string;
  email: string;
}

// ASSUMPTION (2026-10-23, to revisit): the calendar rarely has session times,
// so how much of a day a session takes is a guess. A facilitation day blocks
// the whole day; coaching sessions are usually short, so a coaching day counts
// as half. Change these to change how synced sessions count everywhere (search,
// capacity grid, monthly TL days, Mostly booked status and Ask AI).
export const SESSION_DAY_PORTION: Record<SessionKind, DayPortion> = {
  facilitation: "Full day",
  coaching: "Half day",
};

export const SESSION_PORTION_NOTE = `From the logistics boards. Facilitation counts as a ${SESSION_DAY_PORTION.facilitation.toLowerCase()} and coaching as a ${SESSION_DAY_PORTION.coaching.toLowerCase()} until session times are tracked.`;

const KIND_LABEL: Record<SessionKind, string> = { facilitation: "Facilitation", coaching: "Coaching" };

const normalizeName = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Each person's sessions as one bookout per day from `fromDate` on, keyed by
 * email. Calendar names are Monday display names, so they're matched to
 * emails through Monday users. A day with any facilitation counts as
 * facilitation.
 */
export function sessionBookouts(rows: SessionRow[], users: MondayUser[], fromDate: string): Map<string, Bookout[]> {
  const emailByName = new Map(users.map((u) => [normalizeName(u.name), u.email.toLowerCase()]));
  const days = new Map<string, { email: string; day: string; kind: SessionKind; projects: Set<string> }>();
  for (const row of rows) {
    const email = emailByName.get(normalizeName(row.person));
    if (!email || row.endDate < fromDate) continue;
    // A multi-week "session" is a data-entry slip, not two weeks of facilitation
    const end = row.endDate > addDays(row.date, 13) ? row.date : row.endDate;
    for (const day of dateRange(row.date < fromDate ? fromDate : row.date, end)) {
      const key = `${email}|${day}`;
      const hit = days.get(key) ?? { email, day, kind: row.kind, projects: new Set<string>() };
      if (row.kind === "facilitation") hit.kind = "facilitation";
      if (row.project) hit.projects.add(row.project);
      days.set(key, hit);
    }
  }
  const byEmail = new Map<string, Bookout[]>();
  for (const { email, day, kind, projects } of days.values()) {
    const [first, ...rest] = [...projects];
    const bookout: Bookout = {
      id: `logistics-${email}-${day}`,
      type: "fac",
      start: day,
      end: day,
      portion: SESSION_DAY_PORTION[kind],
      note: [KIND_LABEL[kind], first && first + (rest.length ? ` +${rest.length} more` : "")].filter(Boolean).join(" · "),
      source: "logistics",
    };
    byEmail.set(email, [...(byEmail.get(email) ?? []), bookout]);
  }
  return byEmail;
}
