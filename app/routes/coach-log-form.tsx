import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useSession } from "~/components/auth/hooks/useSession";
import { CoachLogForm } from "~/components/coach-log/coach-log-form";
import { coachLogRepository } from "~/domains/coach-log/repository";
import { coachLogService } from "~/domains/coach-log/service";
import { LoadingSpinner } from "~/utils/LoadingSpinner";

// District -> schools tree is user-independent reference data, so resolve it in
// the loader (server-side, up front) rather than via a client fetch. Coachees,
// by contrast, depend on the in-page district/school selection and stay a
// client fetch (see /api/coach-log/coachees).
export const loader = async () => {
  const service = coachLogService(coachLogRepository());
  const { data, error } = await service.fetchDistrictsWithSchools();
  if (error) {
    console.error("Error fetching districts/schools:", error);
  }
  return json({ districts: data ?? [] });
};

export default function CoachLogFormRoute() {
  const { mondayProfile, isLoading: isSessionLoading } = useSession();
  const { districts } = useLoaderData<typeof loader>();

  if (isSessionLoading || mondayProfile === null) {
    return <LoadingSpinner message="Loading session..." />;
  }

  return (
    <div className="min-h-screen w-full overflow-auto">
      <CoachLogForm districts={districts} />
    </div>
  );
}
