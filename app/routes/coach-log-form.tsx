import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useSession } from "~/components/auth/hooks/useSession";
import { CoachLogForm } from "~/components/coach-log/coach-log-form";
import { coachLogRepository } from "~/domains/coach-log/repository";
import { coachLogService } from "~/domains/coach-log/service";
import { LoadingSpinner } from "~/utils/LoadingSpinner";

// District -> schools tree and the sub-school map are both user-independent
// reference data sourced from the same Google Sheet, so resolve them in the
// loader (server-side, up front). They're fetched concurrently; the sub-school
// map is then filtered client-side by the selected district + school. Coachees,
// by contrast, come from a large dynamic Monday board and stay a client fetch
// (see /api/coach-log/coachees).
export const loader = async () => {
  const service = coachLogService(coachLogRepository());
  const [districts, subSchools] = await Promise.all([
    service.fetchDistrictsWithSchools(),
    service.fetchSubSchoolMap(),
  ]);
  if (districts.error) {
    console.error("Error fetching districts/schools:", districts.error);
  }
  if (subSchools.error) {
    console.error("Error fetching sub-schools:", subSchools.error);
  }
  return json({
    districts: districts.data ?? [],
    subSchools: subSchools.data ?? {},
  });
};

export default function CoachLogFormRoute() {
  const { mondayProfile, isLoading: isSessionLoading } = useSession();
  const { districts, subSchools } = useLoaderData<typeof loader>();

  if (isSessionLoading || mondayProfile === null) {
    return <LoadingSpinner message="Loading session..." />;
  }

  return (
    <div className="min-h-screen w-full overflow-auto">
      <CoachLogForm districts={districts} subSchools={subSchools} />
    </div>
  );
}
