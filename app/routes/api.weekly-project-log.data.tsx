import { json, type ActionFunctionArgs } from "@remix-run/node";
import { projectRepository } from "~/domains/project/repository";
import { projectService } from "~/domains/project/service";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return json({ error: "Email is required" }, { status: 400 });
    }

    const newProjectService = projectService(projectRepository());
    
    const [employeeBudgetedHours, projectSourceNames] = await Promise.all([
      newProjectService.fetchBudgetedHoursByEmployee(email),
      newProjectService.fetchProjectSourceNames(),
    ]);

    if (employeeBudgetedHours.error) {
      console.error("Error fetching employee budgeted hours:", employeeBudgetedHours.error);
    }
    if (projectSourceNames.error) {
      console.error("Error fetching project source names:", projectSourceNames.error);
    }

    return json({
      employeeBudgetedHours: employeeBudgetedHours.data || [],
      projectSourceNames: projectSourceNames.data || [],
    });
  } catch (error) {
    console.error("Error in fetch-data API:", error);
    return json(
      { 
        error: "Failed to fetch project data",
        employeeBudgetedHours: [],
        projectSourceNames: [],
      },
      { status: 500 }
    );
  }
};

