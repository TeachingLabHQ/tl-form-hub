import { FormHubLanding } from "~/components/form-hub-landing";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { requireMondayProfile } from "~/utils/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { mondayProfile, headers } = await requireMondayProfile(request);
  return json({ mondayProfile }, { headers });
};

export default function Dashboard() {
  const { mondayProfile } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <FormHubLanding userName={mondayProfile?.name || ""} />
    </div>
  );
}
