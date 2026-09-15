import { createSupabaseServerClient } from "../../supabase/supabase.server";

export type AuthenticatedUser = {
  email: string;
  // Carries any Set-Cookie from a token refresh; pass it on the response
  headers: Headers;
};

// Resolves the signed-in user from the Supabase session cookie. getUser()
// validates the token with Supabase rather than trusting the cookie.
// Contractors sign in with non-Teaching Lab emails, so any domain passes.
export const getSignedInUser = async (
  request: Request
): Promise<AuthenticatedUser | null> => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  // Kept in its original case: Monday email lookups match on exact text
  const email = user?.email?.trim();
  if (!email) {
    return null;
  }
  return { email, headers };
};

// Same as getSignedInUser, restricted to @teachinglab.org accounts.
export const getTeachingLabUser = async (
  request: Request
): Promise<AuthenticatedUser | null> => {
  const user = await getSignedInUser(request);
  if (!user || !user.email.toLowerCase().endsWith("@teachinglab.org")) {
    return null;
  }
  return user;
};
