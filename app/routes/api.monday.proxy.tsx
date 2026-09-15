import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { getSignedInUser } from "~/utils/auth.server";

// Browser-side Monday reads (profile lookups at sign-in) go through here with
// the server's token. Signed-in users only, and read-only: every write goes
// through a dedicated API route that validates its input.
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const user = await getSignedInUser(request);
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const { headers } = user;

  try {
    const body = await request.json();
    const { query, variables } = body;

    if (typeof query !== "string" || /\bmutation\b/i.test(query)) {
      console.warn(`Rejected Monday proxy mutation from ${user.email}`);
      return json({ error: "Only read queries are allowed" }, { status: 403, headers });
    }

    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.MONDAY_API_KEY || "",
        "API-Version": "2025-07",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Monday API returned ${response.status}`);
    }

    const result = await response.json();
    return json(result, { headers });
  } catch (error) {
    console.error("Error proxying Monday.com request:", error);
    return json(
      { error: "Failed to fetch from Monday.com" },
      { status: 500, headers }
    );
  }
}
