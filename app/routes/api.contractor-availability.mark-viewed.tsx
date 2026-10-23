import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authorizeContractorAccess } from "~/domains/contractor-availability/access.server";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";

// Stamps today as the day staff last viewed a contractor, so the contractor
// can see their changes were seen. Staff only.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    if (!body.email?.trim()) {
      return json({ ok: false, error: "Missing contractor email" }, { status: 400 });
    }
    const access = await authorizeContractorAccess(request, body.email, { staffOnly: true });
    if (access.response) return access.response;
    const { email } = access;
    const { headers } = access.user;

    const service = contractorAvailabilityService(contractorAvailabilityRepository());
    const { data, error } = await service.markStaffViewed(email);
    if (error) {
      console.error("Error stamping staff view:", error);
      return json({ ok: false, error: "Failed to record the view" }, { status: 500, headers });
    }
    return json({ ok: true, viewedOn: data }, { headers });
  } catch (error) {
    console.error("Error in contractor-availability mark-viewed API:", error);
    return json({ ok: false, error: "Failed to record the view" }, { status: 500 });
  }
};
