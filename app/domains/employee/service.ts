import { EmployeeRepository } from "./repository";

export function employeeService(employeeRepository: EmployeeRepository) {
  return {
    fetchMondayEmployee: employeeRepository.fetchEmployee,
    fetchEmployeePeopleTags: employeeRepository.fetchEmployeePeopleTags,
  };
}
