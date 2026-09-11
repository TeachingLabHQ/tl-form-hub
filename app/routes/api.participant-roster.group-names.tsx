import { json, type ActionFunctionArgs } from "@remix-run/node";
import { participantRosterRepository } from "~/domains/participant-roster/repository";
import { participantRosterService } from "~/domains/participant-roster/service";

// Returns the distinct Group Coaching Names already on the roster for a
// given district + school, for the group-name autocomplete.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { district, school } = await request.json();
    if (!district || !school) {
      return json({ groupNames: [] });
    }

    const service = participantRosterService(participantRosterRepository());
    const { data, error } = await service.fetchGroupCoachingNames(
      district,
      school
    );
    if (error) {
      console.error("Error fetching group coaching names:", error);
    }
    return json({ groupNames: data || [] });
  } catch (error) {
    console.error("Error in participant-roster group-names API:", error);
    return json(
      { groupNames: [], error: "Failed to fetch group coaching names" },
      { status: 500 }
    );
  }
};
