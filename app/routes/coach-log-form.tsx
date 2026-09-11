import { json } from "@remix-run/node";
import { useLoaderData, type ShouldRevalidateFunction } from "@remix-run/react";
import { useSession } from "~/components/auth/hooks/useSession";
import { CoachLogForm } from "~/components/coach-log/coach-log-form";
import { AccessDeniedState } from "~/components/vendor-payment-form/access-denied-state";
import { coachLogRepository } from "~/domains/coach-log/repository";
import { coachLogService } from "~/domains/coach-log/service";
import { LoadingSpinner } from "~/utils/LoadingSpinner";

// District -> schools tree, the sub-school map, and the NYC DBN-by-district
// map are all user-independent reference data (the latter two sourced from
// separate Google Sheets), so resolve them in the loader (server-side, up
// front). They're fetched concurrently; the sub-school map is then filtered
// client-side by the selected district + school. Coachees, by contrast, come
// from a large dynamic Monday board and stay a client fetch (see
// /api/coach-log/coachees).
export const loader = async () => {
  const service = coachLogService(coachLogRepository());
  const [districts, subSchools, dbnsByDistrict] = await Promise.all([
    service.fetchDistrictsWithSchools(),
    service.fetchSubSchoolMap(),
    service.fetchDbnsByDistrict(),
  ]);
  if (districts.error) {
    console.error("Error fetching districts/schools:", districts.error);
  }
  if (subSchools.error) {
    console.error("Error fetching sub-schools:", subSchools.error);
  }
  if (dbnsByDistrict.error) {
    console.error("Error fetching DBNs by district:", dbnsByDistrict.error);
  }
  return json({
    districts: districts.data ?? [],
    subSchools: subSchools.data ?? {},
    dbnsByDistrict: dbnsByDistrict.data ?? {},
  });
};

// The loader only returns static reference data (districts/sub-schools) that
// doesn't depend on the URL. Skip revalidation when we're just navigating within
// the same page — e.g. the ?tab= switch — so tab changes are instant instead of
// waiting on a fresh Google Sheets fetch.
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
}) => currentUrl.pathname !== nextUrl.pathname;

export default function CoachLogFormRoute() {
  const { mondayProfile, isLoading: isSessionLoading } = useSession();
  const { districts, subSchools, dbnsByDistrict } = useLoaderData<typeof loader>();

  if (isSessionLoading || mondayProfile === null) {
    return <LoadingSpinner message="Loading session..." />;
  }

  // FTE/PTE employees are resolved via the employee board's "people" column,
  // which links their Monday user account. Coaches/facilitators resolved via
  // the coach/facilitator board fallback never have this link (that board
  // doesn't carry a person id), so only require it outside that fallback path.
  if (mondayProfile.businessFunction !== "contractor" && !mondayProfile.mondayProfileId) {
    return (
      <AccessDeniedState errorMessage="Your Monday profile isn't fully linked yet (missing the People-column assignment on the Employee board), so we can't attribute coach log submissions to you. Please contact the operations team to get this fixed, then try again." />
    );
  }

  return (
    <div className="min-h-screen w-full overflow-auto">
      <CoachLogForm
        districts={districts}
        subSchools={subSchools}
        dbnsByDistrict={dbnsByDistrict}
      />
    </div>
  );
}
