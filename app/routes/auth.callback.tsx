import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { createSupabaseServerClient } from "../../supabase/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";

  const { supabaseClient, headers } = createSupabaseServerClient(request);

  if (!code) {
    throw redirect("/", { headers });
  }

  const { error } = await supabaseClient.auth.exchangeCodeForSession(code);

  if (error) {
    throw redirect(
      `/?authError=${encodeURIComponent(
        "Authentication failed. Please try again."
      )}`,
      { headers }
    );
  }

  throw redirect(next, { headers });
};

export default function AuthCallback() {
  // This route is server-only; user will be redirected immediately by the loader.
  return null;
}


