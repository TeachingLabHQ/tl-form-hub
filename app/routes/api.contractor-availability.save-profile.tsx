import { json, type ActionFunctionArgs } from "@remix-run/node";
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
    const { email, profile } = (await request.json()) as {
      email?: string;
      profile?: AvailabilityProfile;
    };
    if (!email?.trim() || !profile || typeof profile !== "object") {
      return json({ ok: false, error: "Missing email or profile" }, { status: 400 });
    }
    const service = contractorAvailabilityService(contractorAvailabilityRepository());
    const { data, error } = await service.saveProfile(email, profile);
    if (error) {
      console.error("Error saving availability profile:", error);
      return json({ ok: false, error: "Failed to save your profile" }, { status: 500 });
    }
    return json({ ok: true, contractor: data });
  } catch (error) {
    console.error("Error in contractor-availability save-profile API:", error);
    return json({ ok: false, error: "Failed to save your profile" }, { status: 500 });
  }
};
