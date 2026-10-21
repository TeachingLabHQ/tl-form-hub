import { json, type ActionFunctionArgs } from "@remix-run/node";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";

// Every active contractor with their profile and bookouts, for the staffing
// view. Client-driven POST; the page only calls it for non-contractor staff.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  const service = contractorAvailabilityService(contractorAvailabilityRepository());
  const { data, error } = await service.fetchRoster();
  if (error) {
    console.error("Error fetching contractor roster:", error);
    return json({ ok: false, error: "Failed to load contractors" }, { status: 500 });
  }
  return json({ ok: true, contractors: data });
};
