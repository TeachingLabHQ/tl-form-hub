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

// Helper function to build inverted index for O(1) employee lookup
function buildBudgetedHoursIndex(allItems: any[]): Map<string, EmployeeBudgetedHours[]> {
  const index = new Map<string, EmployeeBudgetedHours[]>();
  
  for (const item of allItems) {
    // Extract employee email from lookup column
    const emailValue = item.column_values?.find((col: any) => col.id === "lookup_mksmfdnr")
      ?.display_value || item.column_values?.find((col: any) => col.id === "lookup_mksmfdnr")?.text;
    
    if (!emailValue) continue; // Skip items without email
    
    // Transform item to EmployeeBudgetedHours format
    const transformed: EmployeeBudgetedHours = {
      itemId: item.id,
      itemName: item.name,
      email: emailValue,
      projectName: item.column_values?.find((col: any) => col.id === "dropdown_mkttdgrw")?.text || "",
      projectRole: item.column_values?.find((col: any) => col.id === "color_mknhq0s3")?.label || 
                   item.column_values?.find((col: any) => col.id === "color_mknhq0s3")?.text || "",
      budgetedHours: parseFloat(item.column_values?.find((col: any) => col.id === "numeric_mknhqm6d")?.text || "0") || 0
    };
    
    // Add to index - grouped by email
    if (!index.has(emailValue)) {
      index.set(emailValue, []);
    }
    index.get(emailValue)!.push(transformed);
  }
  return index;
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
        
        // Build inverted index (single pass, transforms all items)
        const index = buildBudgetedHoursIndex(allBudgetedHoursResult.data);
        const employeeData = index.get(employeeEmail) || [];
        
        return { data: employeeData, error: null };
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
