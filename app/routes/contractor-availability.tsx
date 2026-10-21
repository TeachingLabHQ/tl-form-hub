import { useSession } from "~/components/auth/hooks/useSession";
import { ContractorAvailability } from "~/components/contractor-availability/contractor-availability";
import { FormSkeleton } from "~/components/form-kit";

// Contractor Bookout System. All data depends on who's signed in (a contractor
// sees only their own record), so it's fetched client-side via the
// /api/contractor-availability/* routes rather than in a loader.
export default function ContractorAvailabilityRoute() {
  const { mondayProfile, isLoading: isSessionLoading } = useSession();

  if (isSessionLoading || mondayProfile === null) {
    return <FormSkeleton message="Loading session…" rows={7} />;
  }

  return (
    <div className="min-h-screen w-full overflow-auto">
      <ContractorAvailability />
    </div>
  );
}
