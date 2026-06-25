import { json } from "@remix-run/node";
import { coachLogRepository } from "~/domains/coach-log/repository";
import { coachLogService } from "~/domains/coach-log/service";

// Returns every distinct coach/facilitator in the coaching PL calendar.
// Testing-only: the form fetches this just for an allow-listed admin so they can
// impersonate any coach and confirm session dates populate. It's user-independent
// reference data with no params, so it's a GET loader rather than a POST action.
export const loader = async () => {
  try {
    const service = coachLogService(coachLogRepository());
    const { data, error } = await service.fetchCoachNames();
    if (error) {
      console.error("Error fetching coach names:", error);
    }
    return json({ coaches: data || [] });
  } catch (error) {
    console.error("Error in coach-log coach-names API:", error);
    return json(
      { coaches: [], error: "Failed to fetch coach names" },
      { status: 500 }
    );
  }
};
