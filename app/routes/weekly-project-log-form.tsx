import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AccessDeniedState } from "~/components/vendor-payment-form/access-denied-state";
import { ProjectLogForm } from "~/components/weekly-project-log/project-log-form";
import { LoadingSpinner } from "~/utils/LoadingSpinner";
import { projectRepository } from "~/domains/project/repository";
import { projectService } from "~/domains/project/service";
import { requireMondayProfile } from "~/utils/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { mondayProfile, headers } = await requireMondayProfile(request);

  if (mondayProfile.businessFunction === "contractor") {
    return json(
      {
        mondayProfile,
        denied: true,
        deniedMessage:
          "This form is only accessible to FTE/PTE employees. If you believe this is an error, please contact your administrator.",
        projectData: null,
      },
      { headers }
    );
  }

  const newProjectService = projectService(projectRepository());
  const [employeeBudgetedHours, projectSourceNames] = await Promise.all([
    newProjectService.fetchBudgetedHoursByEmployee(
      mondayProfile.employeeId,
      mondayProfile.email
    ),
    newProjectService.fetchProjectSourceNames(),
  ]);

  return json(
    {
      mondayProfile,
      denied: false,
      deniedMessage: "",
      projectData: {
        employeeBudgetedHours: employeeBudgetedHours.data || [],
        projectSourceNames: projectSourceNames.data || [],
      },
    },
    { headers }
  );
};

export default function WeeklyProjectLogForm() {
  const { denied, deniedMessage, projectData } = useLoaderData<typeof loader>();

  if (denied) {
    return <AccessDeniedState errorMessage={deniedMessage} />;
  }

  if (!projectData) {
    return <LoadingSpinner message="Loading project data..." />;
  }

  return (
    <div className="min-h-screen w-full overflow-auto">
      <ProjectLogForm projectData={projectData} />
    </div>
  );
}