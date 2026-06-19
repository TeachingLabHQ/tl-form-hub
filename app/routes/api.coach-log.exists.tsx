import { json, type ActionFunctionArgs } from "@remix-run/node";
import type { CoachLogIdentity } from "~/domains/coach-log/model";
import { coachLogRepository } from "~/domains/coach-log/repository";
import { coachLogService } from "~/domains/coach-log/service";

// Pre-submit check: does a coach log already exist for this coach + district +
// school + date? Used by the form to warn early and disable Submit. The submit
// route enforces the same rule authoritatively.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const query = (await request.json()) as Partial<CoachLogIdentity>;
    const { district, school, sessionDate } = query;
    if (!district || !school || !sessionDate) {
      return json({ exists: false });
    }

    const service = coachLogService(coachLogRepository());
    const { data, error } = await service.hasExistingLog({
      coachMondayId: query.coachMondayId ?? "",
      coachName: query.coachName ?? "",
      district,
      school,
      sessionDate,
    });
    if (error) {
      console.error("Error checking for existing coach log:", error);
      // On error, don't block the coach client-side — the submit route still
      // enforces the rule.
      return json({ exists: false });
    }
    return json({ exists: data ?? false });
  } catch (error) {
    console.error("Error in coach-log exists API:", error);
    return json({ exists: false }, { status: 500 });
  }
};
