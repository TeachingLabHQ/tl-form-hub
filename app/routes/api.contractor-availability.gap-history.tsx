import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authorizeContractorAccess } from "~/domains/contractor-availability/access.server";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";

// A contractor's GAP saves and confirms, newest first: the caller's own, or anyone's for staff.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const access = await authorizeContractorAccess(request, body.email);
    if (access.response) return access.response;
    const { email } = access;
    const { headers } = access.user;

    const service = contractorAvailabilityService(contractorAvailabilityRepository());
    const { data, error } = await service.fetchGapHistory(email);
    if (error) {
      console.error("Error fetching GAP history:", error);
      return json({ ok: false, error: "Failed to load the history" }, { status: 500, headers });
    }
    return json({ ok: true, history: data }, { headers });
  } catch (error) {
    console.error("Error in contractor-availability gap-history API:", error);
    return json({ ok: false, error: "Failed to load the history" }, { status: 500 });
  }
};
