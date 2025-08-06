import { LoaderFunctionArgs } from "@remix-run/node";
import { useSession } from "~/components/auth/hooks/useSession";
import { AccessDeniedState } from "~/components/vendor-payment-form/access-denied-state";
import { ProjectLogForm } from "~/components/weekly-project-log/project-log-form";
import { LoadingSpinner } from "~/utils/LoadingSpinner";

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
  if (mondayProfile?.businessFunction === "contractor") {
    return <AccessDeniedState errorMessage="This form is only accessible to FTE/PTE employees. If you believe this is an error, please contact your administrator." />;
  }
  else {
  return (
    <div className="min-h-screen w-full overflow-auto">
      <ProjectLogForm />
    </div>
  );} }