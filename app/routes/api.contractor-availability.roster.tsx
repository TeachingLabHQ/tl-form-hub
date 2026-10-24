import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authorizeContractorAccess } from "~/domains/contractor-availability/access.server";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";

// Every active contractor with their profile and bookouts, for the staffing
// view. Staff only: it carries every contractor's contact details and notes.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  const access = await authorizeContractorAccess(request, undefined, { staffOnly: true });
  if (access.response) return access.response;
  const { headers } = access.user;

  const service = contractorAvailabilityService(contractorAvailabilityRepository());
  const { data, error } = await service.fetchRoster();
  if (error) {
    console.error("Error fetching contractor roster:", error);
    return json({ ok: false, error: "Failed to load contractors" }, { status: 500, headers });
  }
  return json({ ok: true, contractors: data }, { headers });
};
