import TLLogo from "../../assets/tllogo.png";
import { Button } from "@mantine/core";
import { Link, useMatches, useNavigate } from "@remix-run/react";
import { useSession } from "../auth/hooks/useSession";
import { supabase } from "../../../supabase/supabase.client";
import type { EmployeeProfile } from "~/domains/employee/model";

export const Navbar = () => {
  const { isAuthenticated, setIsAuthenticated } = useSession();
  const navigate = useNavigate();

  const matches = useMatches();
  const mondayProfile =
    (matches.find((m) => (m.data as any)?.mondayProfile)?.data as any)
      ?.mondayProfile ?? null;

  const logOut = async () => {
    // Clear Supabase session
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    navigate("/");
  };

  return (
    <div className="w-full px-16 py-5 flex bg-[#F7FAFC] justify-between items-center">
      <div className="flex flex-row gap-5 items-center">
        <Link to="/">
          <div className="flex gap-2 items-center">
            <img src={TLLogo} className="h-[40px]" />
            <p className="text-2xl">Teaching Lab Form Hub</p>
          </div>
        </Link>
        {isAuthenticated && (
          <div className="flex gap-4">
          
          </div>
        )}
      </div>
      <div>
        {isAuthenticated && (
          <div className="flex flex-row gap-4 items-center">
            <p className="text-blue">Hi {(mondayProfile as EmployeeProfile | null)?.name || ""}!</p>
            <Button variant="outline" onClick={logOut}>
              Log Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
