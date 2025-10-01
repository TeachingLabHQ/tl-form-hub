import { json, LoaderFunctionArgs } from "@remix-run/node";
import { projectRepository } from "~/domains/project/repository";
import { projectService } from "~/domains/project/service";
import { createSupabaseServerClient } from "../../supabase/supabase.server";
import { employeeRepository } from "~/domains/employee/repository";
import { employeeService } from "~/domains/employee/service";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient } = createSupabaseServerClient(request);
  
  // Get session from server-side Supabase client
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  let mondayProfileId = "";
  let employeeId = "";
  
  // If user is authenticated, fetch their Monday profile
  if (session?.user?.email) {
    const newEmployeeService = employeeService(employeeRepository());
    const { data: employee, error } = await newEmployeeService.fetchMondayEmployee(session?.user?.email || "");
    
    if (employee && !error) {
      mondayProfileId = employee.mondayProfileId;
      employeeId = employee.employeeId;
    }
  }

  const newProjectService = projectService(projectRepository());
  
  // Fetch data in parallel using Promise.all
  const [
    programProjectsStaffing,
    employeeBudgetedHours,
    projectSourceNames,
  ] = await Promise.all([
    newProjectService.fetchProgramProjectsStaffing(mondayProfileId),
    newProjectService.fetchBudgetedHoursByEmployee(session?.user?.email || ""),
    newProjectService.fetchProjectSourceNames(),
  ]);

  return json({
    programProjectsStaffing: programProjectsStaffing.data,
    employeeBudgetedHours: employeeBudgetedHours.data,
    projectSourceNames: projectSourceNames.data,
  }, { status: 200 });
}; 