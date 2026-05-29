import { redirect } from "@remix-run/node";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../supabase/supabase.server";
import type { EmployeeProfile } from "~/domains/employee/model";
import { employeeRepository } from "~/domains/employee/repository";
import { employeeService } from "~/domains/employee/service";
import { coachFacilitatorRepository } from "~/domains/coachFacilitator/repository";
import { coachFacilitatorService } from "~/domains/coachFacilitator/service";

export type MondayProfileResult =
  | { ok: true; profile: EmployeeProfile }
  | { ok: false; kind: "unauthorized"; message: string }
  | { ok: false; kind: "unavailable"; message: string };

export async function requireSupabaseSession(request: Request): Promise<{
  session: Session;
  headers: Headers;
  supabaseClient: ReturnType<typeof createSupabaseServerClient>["supabaseClient"];
}> {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    throw redirect("/", { headers });
  }

  return { session, headers, supabaseClient };
}

export async function getMondayProfileByEmail(
  email: string
): Promise<MondayProfileResult> {
  const newEmployeeService = employeeService(employeeRepository());
  const { data: employee, error: employeeError } =
    await newEmployeeService.fetchMondayEmployee(email);

  if (employee) {
    return { ok: true, profile: employee };
  }

  const newCoachFacilitatorService = coachFacilitatorService(
    coachFacilitatorRepository()
  );
  const { data: coachFacilitatorData, error: coachFacilitatorError } =
    await newCoachFacilitatorService.fetchCoachFacilitatorDetails(email);

  if (coachFacilitatorData) {
    const contractorProfile: EmployeeProfile = {
      name: coachFacilitatorData.name,
      email: coachFacilitatorData.email,
      businessFunction: "contractor",
      mondayProfileId: "",
      employeeId: "",
    };
    return { ok: true, profile: contractorProfile };
  }

  // If either lookup errored in a non "not found" way, treat as temporarily unavailable.
  // Note: the employee repo returns an Error for "does not exist" (which is actually "not found").
  const employeeNotFound =
    employeeError?.message?.toLowerCase().includes("does not exist") ?? false;
  const hasHardEmployeeError = !!employeeError && !employeeNotFound;

  if (hasHardEmployeeError || coachFacilitatorError) {
    return {
      ok: false,
      kind: "unavailable",
      message:
        "We couldn't verify your authorization right now. Please try again in a moment.",
    };
  }

  return {
    ok: false,
    kind: "unauthorized",
    message:
      "You are not authorized to access this page. Please contact the operations team.",
  };
}

export async function requireMondayProfile(request: Request): Promise<{
  session: Session;
  headers: Headers;
  mondayProfile: EmployeeProfile;
}> {
  const { session, headers, supabaseClient } = await requireSupabaseSession(
    request
  );

  const email = session.user.email;
  if (!email) {
    await supabaseClient.auth.signOut();
    throw redirect("/", { headers });
  }

  const monday = await getMondayProfileByEmail(email);

  if (monday.ok) {
    return { session, headers, mondayProfile: monday.profile };
  }

  if (monday.kind === "unauthorized") {
    // Match previous behavior (user gets sent back to login), but do it server-side.
    await supabaseClient.auth.signOut();
    throw redirect(`/?authError=${encodeURIComponent(monday.message)}`, {
      headers,
    });
  }

  // "Unavailable": keep the Supabase session, but redirect with a friendly error.
  throw redirect(`/?authError=${encodeURIComponent(monday.message)}`, {
    headers,
  });
}


