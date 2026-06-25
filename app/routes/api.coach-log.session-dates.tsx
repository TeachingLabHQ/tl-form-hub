import { json, type ActionFunctionArgs } from "@remix-run/node";
import { coachLogRepository } from "~/domains/coach-log/repository";
import { coachLogService } from "~/domains/coach-log/service";

// Returns the session-date options for a coach + district, read from the
// coaching PL calendar (TL data service). Depends on the logged-in coach
// (client-side) and the selected district, so it's a client-driven POST
// rather than a loader.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { coachName, district } = await request.json();
    if (!coachName || !district) {
      return json({ dates: [] });
    }

    const service = coachLogService(coachLogRepository());
    const { data, error } = await service.fetchSessionDates(coachName, district);
    if (error) {
      console.error("Error fetching session dates:", error);
    }
    return json({ dates: data || [] });
  } catch (error) {
    console.error("Error in coach-log session-dates API:", error);
    return json(
      { dates: [], error: "Failed to fetch session dates" },
      { status: 500 }
    );
  }
};
