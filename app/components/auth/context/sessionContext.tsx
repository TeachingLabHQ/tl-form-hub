import { createContext, useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../../../../supabase/supabase.client";
export const SessionContext = createContext<{
  session: Session | null;
  setSession: (session: Session | null) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  errorMessage: string;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
}>({
  session: null,
  setSession: () => {},
  isLoading: true,
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  errorMessage: "",
  setErrorMessage: () => {},
});

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  return (
    <SessionContext.Provider
      value={{
        session,
        setSession,
        isLoading,
        isAuthenticated,
        setIsAuthenticated,
        errorMessage,
        setErrorMessage,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};
