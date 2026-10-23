import { Errorable } from "~/utils/errorable";
import {
  EMAIL_PATTERN,
  formatRange,
  GAP_FIELDS,
  isIsoDate,
  nameFromEmail,
  todayIso,
  todayIsoEastern,
} from "./availability";
import {
  type AvailabilityProfile,
  type Bookout,
  type Contractor,
  type ContractorIntake,
  type GapHistoryEntry,
  type NewBookout,
  type SavedProfile,
  type TravelFormat,
  type Weekday,
  BOOKOUT_TYPES,
  DAY_PORTIONS,
  LONGEST_TRIP_OPTIONS,
  OUTSIDE_WORK_OPTIONS,
  REGIONS,
  SUPPORT_OPTIONS,
  TRAVEL_FORMATS,
  WEEKDAYS,
} from "./model";
import { ContractorAvailabilityRepository } from "./repository";
import { sessionBookouts } from "./sessions";

const clampNumber = (v: unknown, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
};
const pick = <T extends string>(values: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(values) ? allowed.filter((a) => values.includes(a)) : [];
const one = (value: unknown, allowed: string[]) =>
  typeof value === "string" && allowed.includes(value) ? value : "";
const str = (value: unknown, max = 2000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Keeps only known labels and sane numbers from a client-sent profile. */
export function sanitizeProfile(input: Partial<AvailabilityProfile>): AvailabilityProfile {
  return {
    formats: pick<TravelFormat>(input.formats, TRAVEL_FORMATS.map((f) => f.value)),
    regions: pick(input.regions, REGIONS),
    longestTrip: one(input.longestTrip, LONGEST_TRIP_OPTIONS),
    outsideWork: one(input.outsideWork, OUTSIDE_WORK_OPTIONS),
    outsideHours: clampNumber(input.outsideHours, 80),
    conflicts: str(input.conflicts),
    support: pick(input.support, SUPPORT_OPTIONS),
    weekdays: pick<Weekday>(input.weekdays, WEEKDAYS),
    daysPerWeek: clampNumber(input.daysPerWeek, 5),
    maxDaysPerMonth: clampNumber(input.maxDaysPerMonth, 23),
    months: Array.isArray(input.months)
      ? [...new Set(input.months.map(Number))].filter((m) => Number.isInteger(m) && m >= 0 && m < 12).sort((a, b) => a - b)
      : [],
    notes: str(input.notes),
    confirmedOn: isIsoDate(input.confirmedOn) ? input.confirmedOn : null,
  };
}

/** Validates a client-sent bookout; returns an error message or the bookout. */
export function validateBookout(input: Partial<NewBookout>): Errorable<NewBookout> {
  if (!BOOKOUT_TYPES.some((t) => t.value === input.type)) {
    return { data: null, error: new Error("Pick what kind of bookout this is.") };
  }
  if (!isIsoDate(input.start)) {
    return { data: null, error: new Error("Pick a start date.") };
  }
  const end = isIsoDate(input.end) ? input.end : input.start;
  if (end < input.start) {
    return { data: null, error: new Error("The end date is before the start date.") };
  }
  return {
    data: {
      type: input.type!,
      start: input.start,
      end,
      portion: DAY_PORTIONS.includes(input.portion!) ? input.portion! : "Full day",
      note: str(input.note, 500),
    },
    error: null,
  };
}

/** Joins the intake roster with saved CBS profiles (matched by email). */
export function mergeRoster(intake: ContractorIntake[], saved: SavedProfile[]): Contractor[] {
  const byEmail = new Map(saved.map((s) => [s.email, s]));
  return intake
    .map(({ intakeProfile, ...c }): Contractor => {
      const s = byEmail.get(c.email);
      return {
        ...c,
        profileItemId: s?.itemId ?? null,
        profile: s ? s.profile : intakeProfile,
        // An item created only to hold bookouts has never been confirmed
        profileSource: s?.profile.confirmedOn ? "saved" : "intake",
        bookouts: (s?.bookouts ?? []).sort((a, b) => a.start.localeCompare(b.start)),
        staffNotes: s?.staffNotes ?? "",
        staffViewedOn: s?.staffViewedOn ?? null,
        intakeNotes: intakeProfile.notes,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Adds each contractor's synced sessions to their bookouts, by email. */
export function withSessions(contractors: Contractor[], sessions: Map<string, Bookout[]>): Contractor[] {
  return contractors.map((c) => {
    const synced = sessions.get(c.email);
    return synced
      ? { ...c, bookouts: [...c.bookouts, ...synced].sort((a, b) => a.start.localeCompare(b.start)) }
      : c;
  });
}

// GAP history entries are the CBS item's updates that start with this
export const GAP_HISTORY_PREFIX = "GAP ";

/** What changed between two versions of a GAP, one readable line per field. */
export function gapChanges(before: AvailabilityProfile, after: AvailabilityProfile): string[] {
  return GAP_FIELDS.filter((f) => f.show(before) !== f.show(after)).map((f) =>
    f.freeText ? `${f.label} edited` : `${f.label}: ${f.show(before)} → ${f.show(after)}`
  );
}

/** The history entry for one save or confirm. */
export function gapHistoryText(
  before: AvailabilityProfile,
  after: AvailabilityProfile,
  firstSave: boolean,
  savedBy: string
): string {
  const by = nameFromEmail(savedBy);
  if (firstSave) return `${GAP_HISTORY_PREFIX}saved for the first time by ${by}.`;
  const changes = gapChanges(before, after);
  return changes.length
    ? `${GAP_HISTORY_PREFIX}updated by ${by}. ${changes.join("; ")}.`
    : `${GAP_HISTORY_PREFIX}confirmed with no changes by ${by}.`;
}

export interface ContractorAvailabilityService extends ContractorAvailabilityRepository {
  fetchRoster(): Promise<Errorable<Contractor[]>>;
  fetchContractor(email: string): Promise<Errorable<Contractor | null>>;
  /** fetchContractor plus their synced sessions, for showing their page. */
  fetchContractorWithSessions(email: string): Promise<Errorable<Contractor | null>>;
  /** Saves or confirms the GAP and adds a history entry naming who saved it. */
  saveProfile(email: string, profile: AvailabilityProfile, savedBy: string): Promise<Errorable<Contractor>>;
  /** The contractor's GAP saves and confirms, newest first. */
  fetchGapHistory(email: string): Promise<Errorable<GapHistoryEntry[]>>;
  /** Stamps today as the day staff last viewed the contractor; returns the date, or null if there's nothing to stamp. */
  markStaffViewed(email: string): Promise<Errorable<string | null>>;
  addBookout(email: string, bookout: NewBookout): Promise<Errorable<string>>;
  removeBookout(email: string, bookoutId: string): Promise<Errorable<string>>;
  /** Saves internal staffing notes on the contractor's CBS item (staff only). */
  saveStaffNotes(email: string, notes: string): Promise<Errorable<string>>;
}

export function contractorAvailabilityService(
  repository: ContractorAvailabilityRepository
): ContractorAvailabilityService {
  // Sessions from this month on, by email. The calendar is supplementary, so
  // if it or the user list can't be read, CBS still works without it.
  const fetchSessions = async (): Promise<Map<string, Bookout[]>> => {
    const [calendar, users] = await Promise.all([repository.fetchSessionCalendar(), repository.fetchMondayUsers()]);
    if (calendar.error || users.error) {
      console.error("Skipping synced sessions:", calendar.error ?? users.error);
      return new Map();
    }
    return sessionBookouts(calendar.data, users.data, `${todayIsoEastern().slice(0, 8)}01`);
  };

  const fetchRoster = async (): Promise<Errorable<Contractor[]>> => {
    const [intake, saved, sessions] = await Promise.all([
      repository.fetchContractors(),
      repository.fetchSavedProfiles(),
      fetchSessions(),
    ]);
    if (intake.error) return intake;
    if (saved.error) return saved;
    return { data: withSessions(mergeRoster(intake.data, saved.data), sessions), error: null };
  };

  // Two filtered reads instead of the whole roster
  const fetchContractor = async (email: string): Promise<Errorable<Contractor | null>> => {
    const [intake, saved] = await Promise.all([
      repository.fetchContractorByEmail(email),
      repository.fetchSavedProfileByEmail(email),
    ]);
    if (intake.error) return intake;
    if (saved.error) return saved;
    if (!intake.data) return { data: null, error: null };
    return { data: mergeRoster([intake.data], saved.data ? [saved.data] : [])[0] ?? null, error: null };
  };

  // The contractor's CBS item, created from their current profile if needed.
  // Not atomic: two first-ever writes at once (Monday has no create-if-absent)
  // can each create an item, and reads then use only the first one Monday returns.
  const ensureProfileItem = async (contractor: Contractor): Promise<Errorable<string>> =>
    contractor.profileItemId
      ? { data: contractor.profileItemId, error: null }
      : repository.createProfile(contractor, contractor.profile);

  return {
    fetchContractors: repository.fetchContractors,
    fetchContractorByEmail: repository.fetchContractorByEmail,
    fetchSavedProfiles: repository.fetchSavedProfiles,
    fetchSavedProfileByEmail: repository.fetchSavedProfileByEmail,
    createProfile: repository.createProfile,
    updateProfile: repository.updateProfile,
    createBookout: repository.createBookout,
    deleteBookout: repository.deleteBookout,
    updateStaffNotes: repository.updateStaffNotes,
    updateStaffViewed: repository.updateStaffViewed,
    createItemUpdate: repository.createItemUpdate,
    fetchItemUpdates: repository.fetchItemUpdates,
    fetchSessionCalendar: repository.fetchSessionCalendar,
    fetchMondayUsers: repository.fetchMondayUsers,

    fetchRoster,
    fetchContractor,

    fetchContractorWithSessions: async (email) => {
      const [found, sessions] = await Promise.all([fetchContractor(email), fetchSessions()]);
      if (found.error || !found.data) return found;
      return { data: withSessions([found.data], sessions)[0]!, error: null };
    },

    saveProfile: async (email, profile, savedBy) => {
      const found = await fetchContractor(email);
      if (found.error) return found;
      if (!found.data) return { data: null, error: new Error("Contractor not found") };
      const saved = { ...sanitizeProfile(profile), confirmedOn: todayIso() };
      const result = found.data.profileItemId
        ? await repository.updateProfile(found.data.profileItemId, saved)
        : await repository.createProfile(found.data, saved);
      if (result.error) return result;
      // History is a record, not part of the save, so a failed post doesn't fail it
      const entry = await repository.createItemUpdate(
        result.data,
        gapHistoryText(found.data.profile, saved, found.data.profileSource === "intake", savedBy)
      );
      if (entry.error) console.error("Couldn't add the GAP history entry:", entry.error);
      return {
        data: { ...found.data, profileItemId: result.data, profile: saved, profileSource: "saved" },
        error: null,
      };
    },

    addBookout: async (email, bookout) => {
      const found = await fetchContractor(email);
      if (found.error) return found;
      if (!found.data) return { data: null, error: new Error("Contractor not found") };
      const parent = await ensureProfileItem(found.data);
      if (parent.error) return parent;
      const typeLabel = BOOKOUT_TYPES.find((t) => t.value === bookout.type)!.label;
      return repository.createBookout(
        parent.data,
        `${typeLabel} · ${formatRange(bookout.start, bookout.end)}`,
        bookout
      );
    },

    // Only deletes a subitem that belongs to this contractor's CBS item, so a
    // crafted request can't delete arbitrary Monday items.
    removeBookout: async (email, bookoutId) => {
      const found = await fetchContractor(email);
      if (found.error) return found;
      if (!found.data) return { data: null, error: new Error("Contractor not found") };
      if (!found.data.bookouts.some((b) => b.id === bookoutId && !b.source)) {
        return { data: null, error: new Error("Bookout not found") };
      }
      return repository.deleteBookout(bookoutId);
    },

    fetchGapHistory: async (email) => {
      const saved = await repository.fetchSavedProfileByEmail(email);
      if (saved.error) return saved;
      if (!saved.data) return { data: [], error: null };
      const updates = await repository.fetchItemUpdates(saved.data.itemId);
      if (updates.error) return updates;
      return {
        data: updates.data
          .filter((u) => u.text.startsWith(GAP_HISTORY_PREFIX))
          // Entries saved before names were used say who by email
          .map((u) => ({ ...u, text: u.text.replace(EMAIL_PATTERN, nameFromEmail) }))
          .sort((a, b) => b.at.localeCompare(a.at)),
        error: null,
      };
    },

    // Only stamps an existing CBS item: viewing someone shouldn't create one.
    // Once a day is enough for "last viewed on [date]".
    markStaffViewed: async (email) => {
      const saved = await repository.fetchSavedProfileByEmail(email);
      if (saved.error) return saved;
      if (!saved.data) return { data: null, error: null };
      const today = todayIsoEastern();
      if (saved.data.staffViewedOn === today) return { data: today, error: null };
      const result = await repository.updateStaffViewed(saved.data.itemId, today);
      return result.error ? result : { data: today, error: null };
    },

    saveStaffNotes: async (email, notes) => {
      const found = await fetchContractor(email);
      if (found.error) return found;
      if (!found.data) return { data: null, error: new Error("Contractor not found") };
      const item = await ensureProfileItem(found.data);
      if (item.error) return item;
      return repository.updateStaffNotes(item.data, str(notes, 5000));
    },
  };
}
