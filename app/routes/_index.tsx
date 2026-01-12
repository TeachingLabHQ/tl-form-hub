import { LoginPage } from "~/components/auth/login-page";
import BackgroundImg from "../assets/background.png";
import { useSearchParams } from "@remix-run/react";
import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { createSupabaseServerClient } from "../../supabase/supabase.server";
export const headers = () => {
  return {
    "Cross-Origin-Opener-Policy": "unsafe-none",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    throw redirect("/dashboard", { headers });
  }

  return null;
};

export default function Index() {
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get("authError") ?? "";

  return (
    <div
      className="min-h-screen bg-no-repeat bg-cover w-full flex items-center justify-center"
      style={{
        backgroundImage: `url(${BackgroundImg})`,
      }}
    >
      <LoginPage errorMessage={errorMessage} />
    </div>
  );
}
