import { Errorable } from "~/utils/errorable";
import {
  CoachLogIdentity,
  CoachOption,
  DistrictWithSchools,
  SessionDateOption,
  SubSchoolMap,
  subSchoolKey,
} from "./model";
import { CoachLogRepository } from "./repository";

export interface CoachLogService {
  fetchDistrictsWithSchools: () => Promise<Errorable<DistrictWithSchools[]>>;
  fetchCoachees: (
    district: string,
    school: string
  ) => Promise<Errorable<string[]>>;
  fetchSubSchoolMap: () => Promise<Errorable<SubSchoolMap>>;
  fetchSessionDates: (
    coachName: string,
    district: string
  ) => Promise<Errorable<SessionDateOption[]>>;
  fetchCoaches: () => Promise<Errorable<CoachOption[]>>;
  hasExistingLog: (query: CoachLogIdentity) => Promise<Errorable<boolean>>;
}

const uniqueSorted = (values: string[]) =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b));

// "2026-06-01" -> "Monday, June 1, 2026" (UTC so the calendar date never shifts).
const dateLabel = (ymd: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ymd}T00:00:00Z`));

// Build the school dropdown options for a district. Districts with no schools
// fall back to a single "N/A" entry; otherwise we prepend an "All Schools"
// aggregate option (matching the legacy form). The coachee roster lookup
// treats "All Schools" specially — see fetchCoachees in the repository.
const schoolOptions = (schools: string[]) => {
  const real = uniqueSorted(schools.filter((s) => s.trim() !== ""));
  if (real.length === 0) return ["N/A"];
  return ["All Schools", ...real];
};

export function coachLogService(
  repository: CoachLogRepository
): CoachLogService {
  return {
    fetchDistrictsWithSchools: async () => {
      const result = await repository.fetchDistrictsWithSchools();
      if (result.error || !result.data) return result;

      const sorted = result.data
        .map((d) => ({
          district: d.district,
          schools: schoolOptions(d.schools),
        }))
        .sort((a, b) => a.district.localeCompare(b.district));

      return { data: sorted, error: null };
    },

    fetchCoachees: async (district: string, school: string) => {
      const result = await repository.fetchCoachees(district, school);
      if (result.error || !result.data) return result;
      return { data: uniqueSorted(result.data), error: null };
    },

    fetchSubSchoolMap: async () => {
      const result = await repository.fetchSubSchoolRows();
      if (result.error || !result.data) return result;

      // Group sub-schools by (district, school), deduped and sorted.
      const grouped: SubSchoolMap = {};
      for (const row of result.data) {
        const key = subSchoolKey(row.district, row.school);
        (grouped[key] ??= []).push(row.subSchool);
      }
      const map: SubSchoolMap = {};
      for (const [key, list] of Object.entries(grouped)) {
        map[key] = uniqueSorted(list);
      }

      return { data: map, error: null };
    },

    fetchSessionDates: async (coachName: string, district: string) => {
      const result = await repository.fetchSessionDates(coachName, district);
      if (result.error || !result.data) return result;

      // Raw YYYY-MM-DD strings -> deduped, sorted, human-labeled options.
      const options = uniqueSorted(result.data).map((ymd) => ({
        value: ymd,
        label: dateLabel(ymd),
      }));

      return { data: options, error: null };
    },

    fetchCoaches: async () => {
      const result = await repository.fetchCoaches();
      if (result.error || !result.data) return result;

      // Dedupe by Monday id, then sort by name for the dropdown.
      const seen = new Set<string>();
      const unique = result.data.filter((c) => {
        if (seen.has(c.mondayId)) return false;
        seen.add(c.mondayId);
        return true;
      });
      unique.sort((a, b) => a.name.localeCompare(b.name));

      return { data: unique, error: null };
    },

    hasExistingLog: (query) => repository.hasExistingLog(query),
  };
}
