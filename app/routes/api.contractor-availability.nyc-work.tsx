import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authorizeContractorAccess } from "~/domains/contractor-availability/access.server";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";

// TL session work in NYC by day and school district, for the NYC admin view's
// map. Staff only, like the roster it's drawn against.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  const access = await authorizeContractorAccess(request, undefined, { staffOnly: true });
  if (access.response) return access.response;
  const { headers } = access.user;

  const service = contractorAvailabilityService(contractorAvailabilityRepository());
  const { data, error } = await service.fetchNycWork();
  if (error) {
    console.error("Error fetching NYC session work:", error);
    return json({ ok: false, error: "Failed to load NYC sessions" }, { status: 500, headers });
  }
  return json({ ok: true, work: data }, { headers });
};
