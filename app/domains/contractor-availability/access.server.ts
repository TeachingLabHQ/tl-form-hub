import { json } from "@remix-run/node";
import { employeeRepository } from "~/domains/employee/repository";
import { employeeService } from "~/domains/employee/service";
import { getSignedInUser, type AuthenticatedUser } from "~/utils/auth.server";

export type ContractorAccess =
  | { response: null; user: AuthenticatedUser; email: string }
  | { response: Response; user: null; email: null };

// Staff are people on the Employee board, matching how useSession() decides
// businessFunction. Contractors sign in with @teachinglab.org emails too, so
// the domain alone doesn't tell them apart. A failed lookup counts as not
// staff, so staff-only access fails closed during a Monday hiccup.
const isStaff = async (email: string) => {
  const { data } = await employeeService(employeeRepository()).fetchMondayEmployee(email);
  return Boolean(data);
};

const deny = (error: string, status: number, headers?: Headers): ContractorAccess => ({
  response: json({ ok: false, error }, { status, headers }),
  user: null,
  email: null,
});

/**
 * Resolves who is calling a CBS route and which contractor they act on. The
 * email in the body is untrusted: anyone may act on their own email, and only
 * staff may act on someone else's (the "Contractor view" tab) or, with
 * staffOnly, call the route at all. Defaults to the signed-in user's email.
 */
export async function authorizeContractorAccess(
  request: Request,
  requestedEmail?: string,
  { staffOnly = false }: { staffOnly?: boolean } = {}
): Promise<ContractorAccess> {
  const user = await getSignedInUser(request);
  if (!user) {
    return deny("Please sign in to continue.", 401);
  }
  const email = requestedEmail?.trim() || user.email;
  const isSelf = email.toLowerCase() === user.email.toLowerCase();
  if ((staffOnly || !isSelf) && !(await isStaff(user.email))) {
    console.warn(`Rejected contractor-availability access from ${user.email} for ${email}`);
    return deny(
      staffOnly ? "This view is for Teaching Lab staff." : "You can only manage your own availability.",
      403,
      user.headers
    );
  }
  return { response: null, user, email };
}
