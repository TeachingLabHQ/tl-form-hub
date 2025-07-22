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
            <p className="text-blue">Hi {mondayProfile?.name}!</p>
            <Button variant="outline" onClick={logOut}>
              Log Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
