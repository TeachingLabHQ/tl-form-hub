import { useContext } from "react";
import { Navigate, useLocation } from "@remix-run/react";
import { SessionContext } from "./context/sessionContext";
import { LoadingSpinner } from "~/utils/LoadingSpinner";

// List of public routes that don't require authentication
const publicRoutes = ["/", "/privacy-policy"];

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, isLoading } = useContext(SessionContext);
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <LoadingSpinner/>
    );
  }

  // Check if the current route is public
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // Use replace to prevent back-button issues
  if (!session && !isPublicRoute) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
