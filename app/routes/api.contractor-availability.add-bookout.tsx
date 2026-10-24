import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authorizeContractorAccess } from "~/domains/contractor-availability/access.server";
import type { NewBookout } from "~/domains/contractor-availability/model";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import {
  contractorAvailabilityService,
  validateBookout,
} from "~/domains/contractor-availability/service";

// Logs one bookout for a contractor (a subitem under their CBS board item).
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      bookout?: Partial<NewBookout>;
    };
    const access = await authorizeContractorAccess(request, body.email);
    if (access.response) return access.response;
    const { email } = access;
    const { headers } = access.user;

    if (!body.bookout) {
      return json({ ok: false, error: "Missing bookout" }, { status: 400, headers });
    }
    const valid = validateBookout(body.bookout);
    if (valid.error) {
      return json({ ok: false, error: valid.error.message }, { status: 400, headers });
    }
    const service = contractorAvailabilityService(contractorAvailabilityRepository());
    const { data, error } = await service.addBookout(email, valid.data);
    if (error) {
      console.error("Error adding bookout:", error);
      return json({ ok: false, error: "Failed to save the bookout" }, { status: 500, headers });
    }
    return json({ ok: true, id: data }, { headers });
  } catch (error) {
    console.error("Error in contractor-availability add-bookout API:", error);
    return json({ ok: false, error: "Failed to save the bookout" }, { status: 500 });
  }
};
