import { Errorable } from "~/utils/errorable";
import { formatRange, isIsoDate, todayIso } from "./availability";
import {
  type AvailabilityProfile,
  type Contractor,
  type ContractorIntake,
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
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface ContractorAvailabilityService extends ContractorAvailabilityRepository {
  fetchRoster(): Promise<Errorable<Contractor[]>>;
  fetchContractor(email: string): Promise<Errorable<Contractor | null>>;
  saveProfile(email: string, profile: AvailabilityProfile): Promise<Errorable<Contractor>>;
  addBookout(email: string, bookout: NewBookout): Promise<Errorable<string>>;
  removeBookout(email: string, bookoutId: string): Promise<Errorable<string>>;
}

export function contractorAvailabilityService(
  repository: ContractorAvailabilityRepository
): ContractorAvailabilityService {
  const fetchRoster = async (): Promise<Errorable<Contractor[]>> => {
    const [intake, saved] = await Promise.all([
      repository.fetchContractors(),
      repository.fetchSavedProfiles(),
    ]);
    if (intake.error) return intake;
    if (saved.error) return saved;
    return { data: mergeRoster(intake.data, saved.data), error: null };
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

  // The contractor's CBS item, created from their current profile if needed
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

    fetchRoster,
    fetchContractor,

    saveProfile: async (email, profile) => {
      const found = await fetchContractor(email);
      if (found.error) return found;
      if (!found.data) return { data: null, error: new Error("Contractor not found") };
      const saved = { ...sanitizeProfile(profile), confirmedOn: todayIso() };
      const result = found.data.profileItemId
        ? await repository.updateProfile(found.data.profileItemId, saved)
        : await repository.createProfile(found.data, saved);
      if (result.error) return result;
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
      if (!found.data?.bookouts.some((b) => b.id === bookoutId)) {
        return { data: null, error: new Error("Bookout not found") };
      }
      return repository.deleteBookout(bookoutId);
    },
  };
}
