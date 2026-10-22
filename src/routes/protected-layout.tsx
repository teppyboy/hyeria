import { Navigate, Outlet, useLocation } from "react-router";
import { useSessionStore } from "@/stores/session";
import { AppShell } from "@/components/shell/AppShell";

function safeReturnPath(path: string): string {
  return path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\") &&
    !path.startsWith("/login")
    ? path
    : "/";
}

export function ProtectedLayout() {
  const authenticated = useSessionStore((state) => state.isAuthenticated);
  const location = useLocation();
  if (!authenticated)
    return <Navigate to="/login" replace state={{ from: safeReturnPath(location.pathname) }} />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
