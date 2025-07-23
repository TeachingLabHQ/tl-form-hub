import { useContext, useState, useEffect } from "react";
import { SessionContext } from "../context/sessionContext";
import { employeeRepository } from "~/domains/employee/repository";
import { employeeService } from "~/domains/employee/service";
import { useNavigate } from "@remix-run/react";
import { EmployeeProfile } from "~/domains/employee/model";
import { supabase } from "../../../../supabase/supabase.client";
import { coachFacilitatorRepository } from "~/domains/coachFacilitator/repository";
import { coachFacilitatorService } from "~/domains/coachFacilitator/service";

const MONDAY_PROFILE_KEY = "mondayProfile";

export const useSession = () => {
  const { session, setSession, isAuthenticated, setIsAuthenticated } =
    useContext(SessionContext);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mondayProfile, setMondayProfile] = useState<EmployeeProfile | null>(
    null
  );
  const navigate = useNavigate();

  // Initialize Monday profile from localStorage on client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedProfile = localStorage.getItem(MONDAY_PROFILE_KEY);
        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          setMondayProfile(parsedProfile);
        }
      } catch (error) {
        console.error("Error reading Monday profile from localStorage:", error);
        localStorage.removeItem(MONDAY_PROFILE_KEY);
      }
    }
  }, []);

  // Check Monday profile only when session changes (login/logout)
  useEffect(() => {
    const checkMondayProfile = async () => {
      if (!session?.user?.email) {
        setMondayProfile(null);
        localStorage.removeItem(MONDAY_PROFILE_KEY);
        setIsAuthenticated(false);
        return;
      }

      try {
        let storedProfile = null;
        if (typeof window !== "undefined") {
          storedProfile = window.localStorage.getItem(MONDAY_PROFILE_KEY);
        }
        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          if (parsedProfile.email === session.user.email) {
            setMondayProfile(parsedProfile);
            setIsAuthenticated(true);
            return;
          }
        }

        setIsLoading(true);
        const newEmployeeService = employeeService(employeeRepository());
        const { data: employee, error } =
          await newEmployeeService.fetchMondayEmployee(session.user.email);

        if (error || !employee) {
          // If employee is not found, check if they are a coach or facilitator
          const newCoachFacilitatorService = coachFacilitatorService(
            coachFacilitatorRepository()
          );
          const { data: coachFacilitatorData, error: coachFacilitatorError } =
            await newCoachFacilitatorService.fetchCoachFacilitatorDetails(
              session.user.email
            );
          if (coachFacilitatorError || !coachFacilitatorData) {
            setErrorMessage(
              "You are not authorized to access this page. Please contact the operations team."
            );
            await supabase.auth.signOut();
            setIsAuthenticated(false);
            return;
          }
          const coachFacilitatorProfile = {
            name: coachFacilitatorData?.name,
            email: coachFacilitatorData?.email,
            businessFunction: "contractor",
            mondayProfileId: "",
            employeeId: "",
          };
          setMondayProfile(coachFacilitatorProfile);
          localStorage.setItem(
            MONDAY_PROFILE_KEY,
            JSON.stringify(coachFacilitatorProfile)
          );
          setIsAuthenticated(true);
          return;
        }

        const newProfile = {
          name: employee.name,
          email: employee.email,
          businessFunction: employee.businessFunction,
          mondayProfileId: employee.mondayProfileId,
          employeeId: employee.employeeId,
        };
        setMondayProfile(newProfile);
        localStorage.setItem(MONDAY_PROFILE_KEY, JSON.stringify(newProfile));
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error checking Monday profile:", error);
        setErrorMessage(
          "An error occurred while checking authorization. Please try again later."
        );
        setIsAuthenticated(false);
        await supabase.auth.signOut();
      } finally {
        setIsLoading(false);
      }
    };

    checkMondayProfile();
  }, [session?.user?.email]);

  return {
    session,
    setSession,
    isAuthenticated,
    setIsAuthenticated,
    errorMessage,
    isLoading,
    mondayProfile,
    setMondayProfile,
  };
};
