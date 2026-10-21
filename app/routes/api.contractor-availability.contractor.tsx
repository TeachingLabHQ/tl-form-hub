import { json, type ActionFunctionArgs } from "@remix-run/node";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";

// One contractor's profile and bookouts, looked up by their email.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email?.trim()) {
      return json({ ok: false, error: "Missing email" }, { status: 400 });
    }
    const service = contractorAvailabilityService(contractorAvailabilityRepository());
    const { data, error } = await service.fetchContractor(email);
    if (error) {
      console.error("Error fetching contractor:", error);
      return json({ ok: false, error: "Failed to load your profile" }, { status: 500 });
    }
    if (!data) {
      return json({ ok: false, error: "Contractor not found" }, { status: 404 });
    }
    return json({ ok: true, contractor: data });
  } catch (error) {
    console.error("Error in contractor-availability contractor API:", error);
    return json({ ok: false, error: "Failed to load your profile" }, { status: 500 });
  }
};
