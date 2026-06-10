import { Errorable } from "~/utils/errorable";
import { DistrictWithSchools } from "./model";
import { CoachLogRepository } from "./repository";

export interface CoachLogService {
  fetchDistrictsWithSchools: () => Promise<Errorable<DistrictWithSchools[]>>;
  fetchCoachees: (
    district: string,
    school: string
  ) => Promise<Errorable<string[]>>;
}

const uniqueSorted = (values: string[]) =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b));

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
  };
}
