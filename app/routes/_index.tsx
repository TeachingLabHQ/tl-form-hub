import { useSession } from "~/components/auth/hooks/useSession";
import { FormHubLanding } from "~/components/form-hub-landing";
import { LoginPage } from "~/components/auth/login-page";
import { useEffect } from "react";
import { useNavigate } from "@remix-run/react";
export const headers = () => {
  return {
    "Cross-Origin-Opener-Policy": "unsafe-none",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
};

export default function Index() {
  const { session, isAuthenticated, errorMessage } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <LoginPage errorMessage={errorMessage} />
    </div>
  );
}
