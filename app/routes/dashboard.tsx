import { FormHubLanding } from "~/components/form-hub-landing";
import { useSession } from "../components/auth/hooks/useSession";
import { useNavigate } from "@remix-run/react";

export default function Dashboard() {
  const { mondayProfile, isAuthenticated } = useSession();
  const navigate = useNavigate();

  return (
    // Top-aligned (not vertically centered) so the greeting sits just under
    // the navbar on tall screens
    <div className="min-h-screen w-full">
      <FormHubLanding userName={mondayProfile?.name || ""} />
    </div>
  );
}
