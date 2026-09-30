import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import React, { useState } from "react";
import TLLogo from "../../assets/tllogo.png";
import { employeeRepository } from "../../domains/employee/repository";
import { employeeService } from "../../domains/employee/service";
import { Button } from "@mantine/core";
import { Link, useNavigate } from "@remix-run/react";
import { useSession } from "../auth/hooks/useSession";
import { supabase } from "../../../supabase/supabase.client";
import { ColorSchemeToggle } from "./color-scheme-toggle";

export const Navbar = () => {
  const {
    mondayProfile,
    isAuthenticated,
    setIsAuthenticated,
    setMondayProfile,
  } = useSession();
  console.log("isAuthenticated", isAuthenticated);
  const navigate = useNavigate();
  // const responseMessage = async (response: any) => {
  //   try {
  //     // Decode the JWT credential
  //     const decodedToken: any = jwtDecode(response.credential);

  //     // Extract user details from the decoded token
  //     const { email } = decodedToken;
  //     try {
  //       const { data: mondayEmployeeInfo, error } =
  //         await newEmployeeService.fetchMondayEmployee(email);
  //       if (error || !mondayEmployeeInfo) {
  //         console.error(
  //           "Failed to get employee information from Monday",
  //           error
  //         );
  //         //pass in email to verify if it's TL associated
  //         setSession({
  //           name: "",
  //           email: email,
  //           buesinessFunction: "",
  //         });
  //         return;
  //       }
  //       setSession({
  //         name: mondayEmployeeInfo?.name || "",
  //         email: mondayEmployeeInfo?.email || "",
  //         buesinessFunction: mondayEmployeeInfo?.businessFunction || "",
  //       });
  //     } catch (e) {
  //       console.error(e);
  //     }

  //     // Set the user details in the state
  //   } catch (error) {
  //     console.error("Error decoding token:", error);
  //   }
  // };
  // const errorMessage = () => {
  //   console.log("Login failed");
  // };

  const logOut = async () => {
    // Clear Supabase session
    await supabase.auth.signOut();
    // Clear Monday profile from localStorage
    localStorage.removeItem("mondayProfile");
    setMondayProfile(null);
    setIsAuthenticated(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-8 lg:px-16 py-3 flex justify-between items-center gap-4 bg-[var(--mantine-color-body)] border-b border-[var(--mantine-color-default-border)] shadow-sm">
      <Link to="/" className="flex gap-3 items-center min-w-0">
        <img
          src={TLLogo}
          alt=""
          className="h-9 w-9 shrink-0 dark:rounded-full dark:bg-white/90 dark:p-0.5"
        />
        <span className="text-lg sm:text-xl font-semibold truncate">
          Teaching Lab Form Hub
        </span>
      </Link>
      <div className="flex flex-row gap-3 items-center shrink-0">
        {isAuthenticated && (
          <>
            <span className="hidden md:inline text-sm text-[var(--mantine-color-dimmed)]">
              Hi {mondayProfile?.name}!
            </span>
            <Button variant="default" onClick={logOut}>
              Log Out
            </Button>
          </>
        )}
        <ColorSchemeToggle />
      </div>
    </header>
  );
};
