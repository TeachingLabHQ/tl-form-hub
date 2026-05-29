import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useState } from "react";
import { LoadingSpinner } from "~/utils/LoadingSpinner";
import { requireSupabaseSession } from "~/utils/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { headers } = await requireSupabaseSession(request);
  return json({}, { headers });
};

export default function StaffingDashboard() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="min-h-screen w-full overflow-auto">
      <div className="w-full h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Staffing Utilization Dashboard</h1>
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
    </div>
  );
}
