import { json, type ActionFunctionArgs } from "@remix-run/node";
import { weeklyProjectLogRepository } from "~/domains/weekly-project-log/repository";
import { getTeachingLabUser } from "~/utils/auth.server";

// Weeks an employee has already logged, so the form can block a second
// submission for the same week before the user fills it out. The submit
// route enforces the same rule.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const user = await getTeachingLabUser(request);
  if (!user) {
    return json({ error: "Please sign in with your Teaching Lab account." }, { status: 401 });
  }
  const { headers } = user;

  try {
    const { employeeId } = await request.json();
    const repository = weeklyProjectLogRepository();

    const { data: isAllowed } = await repository.canSubmitFor(user.email, String(employeeId ?? ""));
    if (!isAllowed) {
      return json({ error: "Not allowed" }, { status: 403, headers });
    }

    const { data, error } = await repository.fetchSubmittedWeeks(String(employeeId));
    if (error) {
      console.error("Error fetching submitted weeks:", error.message);
      return json({ submittedWeeks: [], error: true }, { status: 502, headers });
    }
    return json({ submittedWeeks: data, error: false }, { headers });
  } catch (error) {
    console.error("Error in submitted-weeks API:", error);
    return json({ submittedWeeks: [], error: true }, { status: 500, headers });
  }
};
