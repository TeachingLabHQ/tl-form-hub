import { json, type ActionFunctionArgs } from "@remix-run/node";
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
    const { email, bookout } = (await request.json()) as {
      email?: string;
      bookout?: Partial<NewBookout>;
    };
    if (!email?.trim() || !bookout) {
      return json({ ok: false, error: "Missing email or bookout" }, { status: 400 });
    }
    const valid = validateBookout(bookout);
    if (valid.error) {
      return json({ ok: false, error: valid.error.message }, { status: 400 });
    }
    const service = contractorAvailabilityService(contractorAvailabilityRepository());
    const { data, error } = await service.addBookout(email, valid.data);
    if (error) {
      console.error("Error adding bookout:", error);
      return json({ ok: false, error: "Failed to save the bookout" }, { status: 500 });
    }
    return json({ ok: true, id: data });
  } catch (error) {
    console.error("Error in contractor-availability add-bookout API:", error);
    return json({ ok: false, error: "Failed to save the bookout" }, { status: 500 });
  }
};
