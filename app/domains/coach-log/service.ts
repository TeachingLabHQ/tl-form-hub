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
          schools: uniqueSorted(d.schools),
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
