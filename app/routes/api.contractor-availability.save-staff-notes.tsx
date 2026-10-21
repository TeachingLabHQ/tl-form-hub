import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authorizeContractorAccess } from "~/domains/contractor-availability/access.server";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";

// Saves internal staffing notes on a contractor's record. Staff only: the
// notes are never shown to the contractor.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string; notes?: unknown };
    if (!body.email?.trim() || typeof body.notes !== "string") {
      return json({ ok: false, error: "Missing contractor email or notes" }, { status: 400 });
    }
    const access = await authorizeContractorAccess(request, body.email, { staffOnly: true });
    if (access.response) return access.response;
    const { email } = access;
    const { headers } = access.user;

    const service = contractorAvailabilityService(contractorAvailabilityRepository());
    const { data, error } = await service.saveStaffNotes(email, body.notes);
    if (error) {
      const notFound = error.message === "Contractor not found";
      if (!notFound) console.error("Error saving staff notes:", error);
      return json(
        { ok: false, error: notFound ? "Contractor not found" : "Failed to save the notes" },
        { status: notFound ? 404 : 500, headers }
      );
    }
    return json({ ok: true, id: data }, { headers });
  } catch (error) {
    console.error("Error in contractor-availability save-staff-notes API:", error);
    return json({ ok: false, error: "Failed to save the notes" }, { status: 500 });
  }
};
