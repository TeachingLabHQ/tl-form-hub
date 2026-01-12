import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { query, variables } = body;

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
    return json(result);
  } catch (error) {
    console.error("Error proxying Monday.com request:", error);
    return json(
      { error: "Failed to fetch from Monday.com" },
      { status: 500 }
    );
  }
}

