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
    district: string,
    school: string
  ) => Promise<Errorable<SessionDateOption[]>>;
  fetchCoaches: () => Promise<Errorable<CoachOption[]>>;
  hasExistingLog: (query: CoachLogIdentity) => Promise<Errorable<boolean>>;
}

const uniqueSorted = (values: string[]) =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b));

/**
 * Resolve a calendar `subsite` label to one of a district's canonical school
 * names (from the district/school sheet). The calendar decorates the school name
 * with a trailing site detail — e.g. "Force Elementary_Coaching",
 * "Force Elementary; Coaching" — and the separator is inconsistent (underscore,
 * semicolon, colon, space), while school names can themselves contain those
 * characters. So instead of splitting the string we match it against the known
 * school list: return the longest canonical school whose name is a prefix of the
 * subsite (up to a non-alphanumeric boundary, so "Forest" never matches
 * "Forestville"). Longest wins so "Lincoln Elementary_Coaching" resolves to
 * "Lincoln Elementary" rather than a shorter "Lincoln". Returns "" when nothing
 * matches (e.g. district-level rows like "M035: _Direct to Teacher").
 */
const resolveSubsiteSchool = (subsite: string, schools: string[]): string => {
  const s = subsite.trim().toLowerCase();
  if (!s) return "";

  let best = "";
  for (const school of schools) {
    const c = school.trim().toLowerCase();
    if (!c || c.length <= best.length) continue;
    if (s === c) {
      best = school;
      continue;
    }
    // Prefix match, but only at a word boundary: the char after the school name
    // must be a separator (non-alphanumeric), not the middle of a longer word.
    if (s.startsWith(c) && /^[^a-z0-9]/.test(s.slice(c.length))) {
      best = school;
    }
  }
  return best;
};

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

    fetchSessionDates: async (
      coachName: string,
      district: string,
      school: string
    ) => {
      const result = await repository.fetchSessionDates(coachName, district);
      if (result.error || !result.data) return result;

      let rows = result.data;

      // Scope to the selected school when a specific one is chosen. "All Schools"
      // and "N/A" are aggregate/placeholder options (see schoolOptions), so they
      // keep every date for the district. We resolve each row's free-form
      // `subsite` against the district's canonical school list rather than
      // parsing it — see resolveSubsiteSchool.
      const selected = school.trim();
      if (selected && selected !== "All Schools" && selected !== "N/A") {
        const districtsResult = await repository.fetchDistrictsWithSchools();
        if (districtsResult.error || !districtsResult.data) {
          return { data: null, error: districtsResult.error };
        }
        const canonicalSchools =
          districtsResult.data.find(
            (d) => d.district.trim().toLowerCase() === district.trim().toLowerCase()
          )?.schools ?? [];
        const target = selected.toLowerCase();
        rows = rows.filter(
          (r) =>
            resolveSubsiteSchool(r.subsite, canonicalSchools).toLowerCase() ===
            target
        );
      }

      // Raw YYYY-MM-DD strings -> deduped, sorted, human-labeled options.
      const options = uniqueSorted(rows.map((r) => r.date)).map((ymd) => ({
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
