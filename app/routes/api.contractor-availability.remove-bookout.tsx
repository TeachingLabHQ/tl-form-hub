import { json, type ActionFunctionArgs } from "@remix-run/node";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";

// Removes one of the contractor's own bookouts.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  try {
    const { email, bookoutId } = (await request.json()) as {
      email?: string;
      bookoutId?: string;
    };
    if (!email?.trim() || !bookoutId?.trim()) {
      return json({ ok: false, error: "Missing email or bookout id" }, { status: 400 });
    }
    const service = contractorAvailabilityService(contractorAvailabilityRepository());
    const { data, error } = await service.removeBookout(email, bookoutId);
    if (error) {
      const notFound = error.message === "Bookout not found";
      if (!notFound) console.error("Error removing bookout:", error);
      return json(
        { ok: false, error: notFound ? "Bookout not found" : "Failed to remove the bookout" },
        { status: notFound ? 404 : 500 }
      );
    }
    return json({ ok: true, id: data });
  } catch (error) {
    console.error("Error in contractor-availability remove-bookout API:", error);
    return json({ ok: false, error: "Failed to remove the bookout" }, { status: 500 });
  }
};
