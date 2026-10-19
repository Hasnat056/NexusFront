import { Outlet, useLocation } from "react-router-dom";
import { DashboardShell } from "./DashboardShell";
import { ADMIN_RAIL_ITEMS } from "./adminRailItems";
import { AdminShellProvider, useAdminShellConfig } from "./AdminShellContext";
import { useAdminIdentity } from "../../hooks/useAdminIdentity";
import { useCurrentSessionPill } from "../../hooks/useCurrentSession";

function AdminLayoutShell() {
  const location = useLocation();
  const { avatarInitials, avatarSrc, subtitle } = useAdminIdentity();
  const { pageTitle, sidePanel } = useAdminShellConfig();
  const sessionPill = useCurrentSessionPill();

  const activeRailId =
    ADMIN_RAIL_ITEMS.find(
      (item) => item.href && (location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)),
    )?.id ?? "";

  return (
    <DashboardShell
      railItems={ADMIN_RAIL_ITEMS}
      activeRailId={activeRailId}
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      avatarSrc={avatarSrc}
      pageTitle={pageTitle}
      sessionPill={sessionPill}
      subtitle={subtitle}
      profileHref="/admin/profile"
      sidePanel={sidePanel ?? undefined}
    >
      <Outlet />
    </DashboardShell>
  );
}

/** Wraps every /admin/* route — persists across navigation between them
 * (React Router only swaps the Outlet's content, not this layout), so the
 * rail and top bar never unmount/remount on navigation the way they would if
 * each page rendered its own DashboardShell. */
export function AdminLayout() {
  return (
    <AdminShellProvider>
      <AdminLayoutShell />
    </AdminShellProvider>
  );
}
