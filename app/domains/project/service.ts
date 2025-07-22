import { ProjectMember } from "./model";
import { ProjectRepository } from "./repository";

export function projectService(projectRepository: ProjectRepository) {
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
    fetchAllBudgetedHours: projectRepository.fetchAllBudgetedHours,
  };
}
