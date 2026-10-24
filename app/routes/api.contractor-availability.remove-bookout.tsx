import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authorizeContractorAccess } from "~/domains/contractor-availability/access.server";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";

// Removes one of a contractor's bookouts (their own, or anyone's for staff).
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      bookoutId?: string;
    };
    const access = await authorizeContractorAccess(request, body.email);
    if (access.response) return access.response;
    const { email } = access;
    const { headers } = access.user;

    const bookoutId = body.bookoutId?.trim();
    if (!bookoutId) {
      return json({ ok: false, error: "Missing bookout id" }, { status: 400, headers });
    }
    const service = contractorAvailabilityService(contractorAvailabilityRepository());
    const { data, error } = await service.removeBookout(email, bookoutId);
    if (error) {
      const notFound = error.message === "Bookout not found";
      if (!notFound) console.error("Error removing bookout:", error);
      return json(
        { ok: false, error: notFound ? "Bookout not found" : "Failed to remove the bookout" },
        { status: notFound ? 404 : 500, headers }
      );
    }
    return json({ ok: true, id: data }, { headers });
  } catch (error) {
    console.error("Error in contractor-availability remove-bookout API:", error);
    return json({ ok: false, error: "Failed to remove the bookout" }, { status: 500 });
  }
};
