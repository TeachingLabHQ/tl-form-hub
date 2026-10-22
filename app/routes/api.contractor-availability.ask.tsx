import { json, type ActionFunctionArgs } from "@remix-run/node";
import { safeValidateUIMessages } from "ai";
import { authorizeContractorAccess } from "~/domains/contractor-availability/access.server";
import { todayIso } from "~/domains/contractor-availability/availability";
import { contractorAvailabilityRepository } from "~/domains/contractor-availability/repository";
import { contractorAvailabilityService } from "~/domains/contractor-availability/service";
import { staffingAssistantRepository } from "~/domains/staffing-assistant/repository";
import { MAX_QUESTION_CHARS } from "~/domains/staffing-assistant/model";
import { latestQuestion, staffingAssistantService } from "~/domains/staffing-assistant/service";
import { createSupabaseServerClient } from "../../supabase/supabase.server";

// The admin page's "Ask AI" bubble: streams Claude's answer to a staff
// question about contractor availability. Staff only, like the roster it
// reads; Claude gets read-only tools over that roster and nothing else.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  const access = await authorizeContractorAccess(request, undefined, { staffOnly: true });
  if (access.response) return access.response;
  const { email, headers } = access.user;

  const body = await request.json().catch(() => null);
  const validated = await safeValidateUIMessages({ messages: body?.messages });
  if (!validated.success) {
    return json({ ok: false, error: "Invalid chat messages" }, { status: 400, headers });
  }
  if (!latestQuestion(validated.data)) {
    return json(
      { ok: false, error: `Ask a question of up to ${MAX_QUESTION_CHARS} characters.` },
      { status: 400, headers }
    );
  }

  const roster = await contractorAvailabilityService(contractorAvailabilityRepository()).fetchRoster();
  if (roster.error) {
    console.error("Error fetching contractor roster for the assistant:", roster.error);
    return json({ ok: false, error: "Failed to load contractors" }, { status: 500, headers });
  }

  const { supabaseClient } = createSupabaseServerClient(request);
  const assistant = staffingAssistantService(staffingAssistantRepository(supabaseClient));
  const { data, error } = await assistant.ask({
    messages: validated.data,
    contractors: roster.data,
    userEmail: email,
    headers,
    today: todayIso(),
  });
  if (error) {
    console.error("Error asking the staffing assistant:", error);
    return json({ ok: false, error: "The assistant isn't available right now" }, { status: 500, headers });
  }
  return data;
};
