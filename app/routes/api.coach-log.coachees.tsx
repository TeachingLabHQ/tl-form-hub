import { json, type ActionFunctionArgs } from "@remix-run/node";
import { coachLogRepository } from "~/domains/coach-log/repository";
import { coachLogService } from "~/domains/coach-log/service";

// Returns the coachee/teacher names for a given district + school.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { district, school } = await request.json();
    if (!district || !school) {
      return json({ coachees: [] });
    }

    const service = coachLogService(coachLogRepository());
    const { data, error } = await service.fetchCoachees(district, school);
    if (error) {
      console.error("Error fetching coachees:", error);
    }
    return json({ coachees: data || [] });
  } catch (error) {
    console.error("Error in coach-log coachees API:", error);
    return json(
      { coachees: [], error: "Failed to fetch coachees" },
      { status: 500 }
    );
  }
};
