import { json } from "@remix-run/node";
import { coachLogRepository } from "~/domains/coach-log/repository";
import { coachLogService } from "~/domains/coach-log/service";

// Returns the coach options (name + Monday profile id) for the testing-only
// coach override. Sourced from Monday users, so only fetched by the form for an
// allow-listed admin. User-independent with no params, so it's a GET loader.
export const loader = async () => {
  try {
    const service = coachLogService(coachLogRepository());
    const { data, error } = await service.fetchCoaches();
    if (error) {
      console.error("Error fetching coaches:", error);
    }
    return json({ coaches: data || [] });
  } catch (error) {
    console.error("Error in coach-log coach-names API:", error);
    return json(
      { coaches: [], error: "Failed to fetch coaches" },
      { status: 500 }
    );
  }
};
