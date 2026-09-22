import { Errorable } from "~/utils/errorable";
import { EmployeeRepository } from "../employee/repository";
import { employeeService } from "../employee/service";
import { WeeklyProjectLogRepository } from "./repository";

export function weeklyProjectLogService(
  weeklyProjectLogRepository: WeeklyProjectLogRepository,
  employeeRepository: EmployeeRepository
) {
  const employees = employeeService(employeeRepository);
  return {
    fetchSubmittedWeeks: weeklyProjectLogRepository.fetchSubmittedWeeks,
    createParentItem: weeklyProjectLogRepository.createParentItem,
    createSubitems: weeklyProjectLogRepository.createSubitems,
    updateItemColumns: weeklyProjectLogRepository.updateItemColumns,
    deleteItem: weeklyProjectLogRepository.deleteItem,
    fetchEmployeePeopleTags: employees.fetchEmployeePeopleTags,

    // Whether `email` may submit a log for `employeeId`. Everyone submits for
    // themselves only.
    canSubmitFor: async (
      email: string,
      employeeId: string
    ): Promise<Errorable<boolean>> => {
      const trimmedId = String(employeeId ?? "").trim();
      const { data: employee, error } = await employees.fetchMondayEmployee(email);
      if (error || !employee) {
        return { data: null, error: error ?? new Error("Employee not found") };
      }
      return { data: employee.employeeId.trim() === trimmedId, error: null };
    },
  };
}
