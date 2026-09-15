import { executiveAssistantMappings } from "~/components/weekly-project-log/utils";
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
    deleteItem: weeklyProjectLogRepository.deleteItem,
    fetchEmployeePeopleTags: employees.fetchEmployeePeopleTags,

    // Whether `email` may submit a log for `employeeId`: their own, or an
    // executive they're mapped to as an executive assistant.
    canSubmitFor: async (
      email: string,
      employeeId: string
    ): Promise<Errorable<boolean>> => {
      const trimmedId = String(employeeId ?? "").trim();
      const isAssistantFor = executiveAssistantMappings.some(
        (mapping) =>
          mapping.executiveAssistantEmail.toLowerCase() === email.toLowerCase() &&
          mapping.executiveId === trimmedId
      );
      if (isAssistantFor) {
        return { data: true, error: null };
      }
      const { data: employee, error } = await employees.fetchMondayEmployee(email);
      if (error || !employee) {
        return { data: null, error: error ?? new Error("Employee not found") };
      }
      return { data: employee.employeeId.trim() === trimmedId, error: null };
    },
  };
}
