import { useContext } from "react";
import { SessionContext } from "../context/sessionContext";

export const useSession = () => {
  const {
    session,
    setSession,
    isLoading,
    isAuthenticated,
    setIsAuthenticated,
  } = useContext(SessionContext);

  return {
    session,
    setSession,
    isLoading,
    isAuthenticated,
    setIsAuthenticated,
  };
};
