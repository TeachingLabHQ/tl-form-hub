import { Errorable } from "~/utils/errorable";
import {
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

// The parquet calendar is read from disk, which only works in local dev. On
// deployed (Vercel) environments we serve these placeholder dates instead, until
// the AWS-backed session-date source lands.
const DUMMY_SESSION_DATES: SessionDateOption[] = [
  "2026-06-01",
  "2026-06-03",
  "2026-06-08",
  "2026-06-10",
  "2026-06-15",
].map((ymd) => ({ value: ymd, label: dateLabel(ymd) }));

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
      // Deployed environments can't read the parquet from disk — use placeholders.
      if (process.env.VERCEL) {
        return { data: DUMMY_SESSION_DATES, error: null };
      }

      const result = await repository.fetchSessionDates(coachName, district);
      if (result.error || !result.data) return result;

      const options = uniqueSorted(result.data).map((ymd) => ({
        value: ymd,
        label: dateLabel(ymd),
      }));
      return { data: options, error: null };
    },
  };
}
