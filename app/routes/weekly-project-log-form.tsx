import { defer, LoaderFunctionArgs } from "@remix-run/node";
import { Await, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";
import { useSession } from "~/components/auth/hooks/useSession";
import { AccessDeniedState } from "~/components/vendor-payment-form/access-denied-state";
import { ProjectLogForm } from "~/components/weekly-project-log/project-log-form";
import { LoadingSpinner } from "~/utils/LoadingSpinner";
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

  // Create a promise for the data fetching
  const projectDataPromise = (async () => {
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

    // Handle errors by providing fallback values
    if (programProjectsStaffing.error) {
      console.error("Error fetching program projects staffing:", programProjectsStaffing.error);
    }
    if (employeeBudgetedHours.error) {
      console.error("Error fetching employee budgeted hours:", employeeBudgetedHours.error);
    }
    if (projectSourceNames.error) {
      console.error("Error fetching project source names:", projectSourceNames.error);
    }

    return {
      programProjectsStaffing: programProjectsStaffing.data || [],
      employeeBudgetedHours: employeeBudgetedHours.data || [],
      projectSourceNames: projectSourceNames.data || [],
    };
  })();

  // Defer the data - this allows the page to render before the data is ready
  return defer({
    projectData: projectDataPromise,
  });
};

export default function WeeklyProjectLogForm() {
  const { mondayProfile } = useSession();
  const { projectData } = useLoaderData<typeof loader>();

  if (mondayProfile === null) {
    return <LoadingSpinner />;
  }
  if (mondayProfile?.businessFunction === "contractor") {
    return <AccessDeniedState errorMessage="This form is only accessible to FTE/PTE employees. If you believe this is an error, please contact your administrator." />;
  }

  return (
    <div className="min-h-screen w-full overflow-auto">
      <Suspense fallback={<LoadingSpinner />}>
        <Await resolve={projectData}>
          {(resolvedData) => <ProjectLogForm projectData={resolvedData} />}
        </Await>
      </Suspense>
    </div>
  );
}