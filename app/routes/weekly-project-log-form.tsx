import { LoaderFunctionArgs } from "@remix-run/node";
import { ProjectLogForm } from "~/components/weekly-project-log/project-log-form";
import { LoadingSpinner } from "~/utils/LoadingSpinner";
import { Suspense } from "react";

// We can make this even simpler since we don't need server-side data anymore
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Just return empty data since everything is handled client-side now
  return {};
};

export default function WeeklyProjectLogForm() {
  const { mondayProfile } = useSession();
  if (mondayProfile === null) {
    return <LoadingSpinner />;
  }
  if (mondayProfile?.businessFunction === "coach/facilitator") {
    return <AccessDeniedState errorMessage="This form is only accessible to FTE/PTE employees. If you believe this is an error, please contact your administrator." />;
  }
  return (
    <div className="min-h-screen w-full overflow-auto">
      <ProjectLogForm />
    </div>
  );
}
