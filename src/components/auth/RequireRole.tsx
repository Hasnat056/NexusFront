import { Navigate, Outlet } from "react-router-dom";
import { getAccessToken, getStoredRole, type Role } from "../../lib/auth";

export function RequireRole({ role }: { role: Role }) {
  const authenticated = getAccessToken() !== null && getStoredRole() === role;
  return authenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
