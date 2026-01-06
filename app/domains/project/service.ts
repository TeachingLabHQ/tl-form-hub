import { EmployeeBudgetedHours, ProgramProject, projectsByTypes } from "./model";
import { ProjectRepository } from "./repository";
import { Errorable } from "~/utils/errorable";

export interface ProjectService {
  fetchAllProjects: () => Promise<{ data: projectsByTypes[] | null }>;
  fetchProgramProjects: () => Promise<{ data: string[] | null | undefined }>;
  fetchProgramProjectsStaffing: (mondayProfileId: string) => Promise<Errorable<ProgramProject[]>>;
  // Prefer designated employee ID (lookup_mkpvs1wj). Fall back to employee email (lookup_mksmfdnr).
  fetchBudgetedHoursByEmployee: (
    employeeId?: string | null,
    employeeEmail?: string | null
  ) => Promise<Errorable<EmployeeBudgetedHours[]>>;
  fetchProjectSourceNames: () => Promise<Errorable<string[]>>;
}

type BudgetedHoursIndex = {
  byEmployeeId: Map<string, EmployeeBudgetedHours[]>;
  byEmail: Map<string, EmployeeBudgetedHours[]>;
};

// Helper function to build inverted indices for O(1) employee lookup
function buildBudgetedHoursIndex(allItems: any[]): BudgetedHoursIndex {
  const byEmployeeId = new Map<string, EmployeeBudgetedHours[]>();
  const byEmail = new Map<string, EmployeeBudgetedHours[]>();

  for (const item of allItems) {
    // Extract designated employee ID from lookup column
    const employeeIdValueRaw =
      item.column_values?.find((col: any) => col.id === "lookup_mkpvs1wj")?.display_value ||
      "";
    const employeeIdValue = typeof employeeIdValueRaw === "string" ? employeeIdValueRaw.trim() : "";

    // Transform item to EmployeeBudgetedHours format
    const emailValue =
      item.column_values?.find((col: any) => col.id === "lookup_mksmfdnr")?.display_value ||
      "";
    const emailValueTrimmed = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";

    // If we can't identify the employee at all, skip this row.
    if (!employeeIdValue && !emailValueTrimmed) continue;

    const transformed: EmployeeBudgetedHours = {
      itemId: item.id,
      itemName: item.name,
      email: emailValueTrimmed,
      projectName: item.column_values?.find((col: any) => col.id === "dropdown_mkttdgrw")?.text || "",
      projectRole: item.column_values?.find((col: any) => col.id === "color_mknhq0s3")?.label || 
                   item.column_values?.find((col: any) => col.id === "color_mknhq0s3")?.text || "",
      budgetedHours: parseFloat(item.column_values?.find((col: any) => col.id === "numeric_mknhqm6d")?.text || "0") || 0
    };
    
    if (employeeIdValue) {
      if (!byEmployeeId.has(employeeIdValue)) {
        byEmployeeId.set(employeeIdValue, []);
      }
      byEmployeeId.get(employeeIdValue)!.push(transformed);
    }

    if (emailValueTrimmed) {
      if (!byEmail.has(emailValueTrimmed)) {
        byEmail.set(emailValueTrimmed, []);
      }
      byEmail.get(emailValueTrimmed)!.push(transformed);
    }
  }

  return { byEmployeeId, byEmail };
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
    fetchBudgetedHoursByEmployee: async (employeeId?: string | null, employeeEmail?: string | null) => {
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
        const idKey = typeof employeeId === "string" ? employeeId.trim() : "";
        const emailKey = typeof employeeEmail === "string" ? employeeEmail.trim().toLowerCase() : "";

        const employeeData =
          (idKey ? index.byEmployeeId.get(idKey) : undefined) ||
          (emailKey ? index.byEmail.get(emailKey) : undefined) ||
          [];
        
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
