import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authorizeContractorAccess } from "~/domains/contractor-availability/access.server";
import type { AvailabilityProfile } from "~/domains/contractor-availability/model";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";

// Saves (or confirms unchanged) a contractor's availability profile. The
// service drops unknown labels and stamps today as the confirmed date.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      profile?: AvailabilityProfile;
    };
    const access = await authorizeContractorAccess(request, body.email);
    if (access.response) return access.response;
    const { email } = access;
    const { headers } = access.user;

    const { profile } = body;
    if (!profile || typeof profile !== "object") {
      return json({ ok: false, error: "Missing profile" }, { status: 400, headers });
    }
    const service = contractorAvailabilityService(contractorAvailabilityRepository());
    const { data, error } = await service.saveProfile(email, profile);
    if (error) {
      console.error("Error saving availability profile:", error);
      return json({ ok: false, error: "Failed to save your profile" }, { status: 500, headers });
    }
    return json({ ok: true, contractor: data }, { headers });
  } catch (error) {
    console.error("Error in contractor-availability save-profile API:", error);
    return json({ ok: false, error: "Failed to save your profile" }, { status: 500 });
  }
};
