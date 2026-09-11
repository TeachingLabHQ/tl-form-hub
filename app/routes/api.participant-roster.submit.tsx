import { json, type ActionFunctionArgs } from "@remix-run/node";
import type { ParticipantRosterSubmission } from "~/domains/participant-roster/model";
import { participantRosterRepository } from "~/domains/participant-roster/repository";
import { participantRosterService } from "~/domains/participant-roster/service";

// Creates one participant on the roster board. Client-driven POST from the
// roster tab. The form validates the full field set; this re-guards the
// required fields before writing to Monday.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = (await request.json()) as ParticipantRosterSubmission;
    if (
      !body.firstName?.trim() ||
      !body.lastName?.trim() ||
      !body.email?.trim() ||
      !body.role?.trim() ||
      !body.district?.trim() ||
      !body.school?.trim()
    ) {
      return json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const service = participantRosterService(participantRosterRepository());

    // One entry per coachee: block if this email is already on the roster for
    // the same district + school. (Authoritative check; the form surfaces it.)
    const duplicate = await service.participantExists(
      body.email,
      body.district,
      body.school
    );
    if (duplicate.error) {
      console.error("Error checking for existing participant:", duplicate.error);
      return json(
        { ok: false, error: "Could not verify whether this participant already exists" },
        { status: 500 }
      );
    }
    if (duplicate.data) {
      return json(
        { ok: false, duplicate: true, error: "Participant already on the roster" },
        { status: 409 }
      );
    }

    const { data, error } = await service.submitParticipant(body);
    if (error || !data) {
      console.error("Error creating participant roster entry:", error);
      return json({ ok: false, error: "Failed to add participant" }, { status: 500 });
    }
    return json({ ok: true, id: data });
  } catch (error) {
    console.error("Error in participant-roster submit API:", error);
    return json({ ok: false, error: "Failed to add participant" }, { status: 500 });
  }
};
