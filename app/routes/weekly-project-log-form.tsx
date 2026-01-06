import { useEffect, useState } from "react";
import { useSession } from "~/components/auth/hooks/useSession";
import { AccessDeniedState } from "~/components/vendor-payment-form/access-denied-state";
import { ProjectLogForm } from "~/components/weekly-project-log/project-log-form";
import { LoadingSpinner } from "~/utils/LoadingSpinner";

export default function WeeklyProjectLogForm() {
  const { mondayProfile, isLoading: isSessionLoading } = useSession();
  const [projectData, setProjectData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!mondayProfile?.employeeId && !mondayProfile?.email) {
        setIsLoadingData(false);
        return;
      }

      try {
        const response = await fetch("/api/weekly-project-log/data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId: mondayProfile.employeeId,
            email: mondayProfile.email,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Error fetching project data:", data.error);
        }

        setProjectData({
          employeeBudgetedHours: data.employeeBudgetedHours || [],
          projectSourceNames: data.projectSourceNames || [],
        });
      } catch (error) {
        console.error("Error fetching project data:", error);
        setProjectData({
          employeeBudgetedHours: [],
          projectSourceNames: [],
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchProjectData();
  }, [mondayProfile?.employeeId, mondayProfile?.email]);

  if (isSessionLoading || mondayProfile === null) {
    return <LoadingSpinner message="Loading session..." />;
  }

  if (mondayProfile?.businessFunction === "contractor") {
    return <AccessDeniedState errorMessage="This form is only accessible to FTE/PTE employees. If you believe this is an error, please contact your administrator." />;
  }

  if (isLoadingData || !projectData) {
    return <LoadingSpinner message="Loading project data..." />;
  }

  return (
    <div className="min-h-screen w-full overflow-auto">
      <ProjectLogForm projectData={projectData} />
    </div>
  );
}