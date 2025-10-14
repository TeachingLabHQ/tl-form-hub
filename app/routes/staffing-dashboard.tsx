import { useSession } from "~/components/auth/hooks/useSession";
import BackgroundImg from "~/assets/background.png";
import { useState } from "react";
import { LoadingSpinner } from "~/utils/LoadingSpinner";

export default function StaffingDashboard() {
  const { isAuthenticated, errorMessage } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="min-h-screen w-full overflow-auto">
      {isAuthenticated ? (
        <div className="w-full h-screen p-4">
          <h1 className="text-2xl font-bold mb-4">
            Staffing Utilization Dashboard
          </h1>
          <div className="w-full h-[calc(100vh-120px)] rounded-lg overflow-hidden border border-gray-300 relative">
            {isLoading && <LoadingSpinner />}
            <iframe
              src="https://tl-data.teachinglab.org/project_log_tl/"
              className="w-full h-full"
              title="Staffing Utilization Dashboard"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </div>
      ) : (
        <> </>
      )}
    </div>
  );
}
