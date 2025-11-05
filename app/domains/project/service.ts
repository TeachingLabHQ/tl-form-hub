import { EmployeeBudgetedHours, ProgramProject, projectsByTypes } from "./model";
import { ProjectRepository } from "./repository";
import { Errorable } from "~/utils/errorable";

export interface ProjectService {
  fetchAllProjects: () => Promise<{ data: projectsByTypes[] | null }>;
  fetchProgramProjects: () => Promise<{ data: string[] | null | undefined }>;
  fetchProgramProjectsStaffing: (mondayProfileId: string) => Promise<Errorable<ProgramProject[]>>;
  fetchBudgetedHoursByEmployee: (employeeEmail: string) => Promise<Errorable<EmployeeBudgetedHours[]>>;
  fetchProjectSourceNames: () => Promise<Errorable<string[]>>;
}

export function projectService(projectRepository: ProjectRepository): ProjectService {
  return {
    fetchAllProjects: async () => {
      const { data: allProjects } = await projectRepository.fetchAllProjects();
      allProjects
        ?.find((project) => project.projectType === "Program-related Project")
        ?.projects.sort((a, b) => a.localeCompare(b));
      allProjects
        ?.find((project) => project.projectType === "Internal Project")
        ?.projects.sort((a, b) => a.localeCompare(b));
      return { data: allProjects };
    },
    fetchProgramProjects: async () => {
      const { data: allProjects } = await projectRepository.fetchAllProjects();
      const programProjects = allProjects
        ?.find((project) => project.projectType === "Program-related Project")
        ?.projects.sort((a, b) => a.localeCompare(b));
      console.log(programProjects);
      return { data: programProjects };
    },
    fetchProgramProjectsStaffing: projectRepository.fetchProgramProjects,
    fetchBudgetedHoursByEmployee: async (employeeEmail: string) => {
        const allBudgetedHoursResult = await projectRepository.fetchAllBudgetedHours();
        
        if (allBudgetedHoursResult.error) {
          console.error("Error fetching all budgeted hours:", allBudgetedHoursResult.error);
          return { data: null, error: allBudgetedHoursResult.error };
        }
        
        if (!allBudgetedHoursResult.data) {
          console.log("No budgeted hours data found");
          return { data: [], error: null };
        }

        // Fetch project names to enrich the data
        // NOTE: Fetch project name column separately bc cant read dropdown doesnt with fetchAllBudgetedHours
        const projectNamesResult = await projectRepository.fetchProjectColumnBAD();
        const projectNamesMap = projectNamesResult.data || {};  
        
        // Filter items that match the employee email
        const matchedBudgetedHours = allBudgetedHoursResult.data.filter((item: any) => {
          const emailMatch = item.column_values?.some((col: any) => {
            if (col.id === "lookup_mksmfdnr") {
              return col.display_value === employeeEmail || col.text === employeeEmail;
            }
            return false;
          });
          return emailMatch;
        });

        // Transform filtered data to EmployeeBudgetedHours format
        const transformedData = matchedBudgetedHours.map((item: any) => {
          // Email (lookup_mksmfdnr)
          const emailValue = item.column_values?.find(
            (col: any) => col.id === "lookup_mksmfdnr"
          )?.display_value || item.column_values?.find(
            (col: any) => col.id === "lookup_mksmfdnr"
          )?.text || "";

          // Project Name - use the mapping from fetchProjectColumnBAD
          const projectNameValue = projectNamesMap[item.id] || "";

          // Project Role (color_mknhq0s3)
          const projectRoleValue = item.column_values?.find(
            (col: any) => col.id === "color_mknhq0s3"
          )?.label || item.column_values?.find(
            (col: any) => col.id === "color_mknhq0s3"
          )?.text || "";

          // Budgeted Hours (numeric_mknhqm6d)
          const budgetedHoursValue = item.column_values?.find(
            (col: any) => col.id === "numeric_mknhqm6d"
          )?.text || "0";

          return {
            itemId: item.id,
            itemName: item.name,
            email: emailValue,
            projectName: projectNameValue,
            projectRole: projectRoleValue,
            budgetedHours: parseFloat(budgetedHoursValue) || 0
          } as EmployeeBudgetedHours;
        });
       
        return { data: transformedData, error: null };
      },
    fetchProjectSourceNames: async () => {
      const result = await projectRepository.fetchProjectSourceNames();
      
      if (result.error) {
        console.error("Error fetching project source names:", result.error);
        return { data: null, error: result.error };
      }
      
      if (!result.data) {
        console.log("No project source names found");
        return { data: [], error: null };
      }
      
      // Sort project names alphabetically
      const sortedProjectNames = result.data.sort((a, b) => a.localeCompare(b));
      
      return { data: sortedProjectNames, error: null };
    },
  };
}
