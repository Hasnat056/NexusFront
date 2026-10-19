import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { FACULTY_RAIL_ITEMS } from "../components/layout/facultyRailItems";
import { ProfileStrip } from "../components/ui/ProfileStrip";
import { CourseCard } from "../components/ui/CourseCard";
import { NotificationsPanel } from "../components/ui/NotificationsPanel";
import { useNotifications } from "../hooks/useNotifications";
import { selectFacultyCourseCards } from "../data/facultyAllocations";
import { apiGet, apiGetAllPages } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { FacultyCourseAllocation, FacultyDashboardResponse } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./FacultyDashboardPage.module.css";

export function FacultyDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<FacultyDashboardResponse | null>(null);
  const [ongoingAllocations, setOngoingAllocations] = useState<FacultyCourseAllocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotifications();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<FacultyDashboardResponse>("/faculty/dashboard/"),
      // FacultyCourseAllocationView.get_queryset() ignores any `status` query param and always
      // returns Active + Locked + Completed — filtered client-side to just the still-current ones.
      apiGetAllPages<FacultyCourseAllocation>("/faculty/allocations/"),
    ])
      .then(([dashboardRes, allocationsRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        setOngoingAllocations(allocationsRes.filter((a) => a.status === "Active" || a.status === "Locked"));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="dashboard"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials="—"
        pageTitle="Faculty dashboard"
        subtitle=""
      >
        <div className={formStyles.errorBanner}>{error}</div>
      </DashboardShell>
    );
  }

  if (!dashboard) {
    return (
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="dashboard"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials="—"
        pageTitle="Faculty dashboard"
        subtitle=""
      >
        <p className={styles.empty}>Loading dashboard…</p>
      </DashboardShell>
    );
  }

  const courseCards = selectFacultyCourseCards(ongoingAllocations);
  const avatarInitials = `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase();

  return (
    <DashboardShell
      railItems={FACULTY_RAIL_ITEMS}
      activeRailId="dashboard"
      homeHref="/faculty/dashboard"
      profileHref="/faculty/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.faculty.image}
      pageTitle="Faculty dashboard"
      subtitle={dashboard.faculty.institutional_email}
      sidePanel={
        <NotificationsPanel
          items={notifications.items}
          unreadCount={notifications.unreadCount}
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          onOpen={() => setNotificationsOpen(true)}
          onMarkRead={notifications.markRead}
          onMarkAllRead={notifications.markAllRead}
          onDismiss={notifications.dismiss}
        />
      }
    >
      <ProfileStrip
        avatarInitials={avatarInitials}
        name={`${dashboard.faculty.first_name} ${dashboard.faculty.last_name}`}
        meta={[dashboard.faculty.employee_id]}
        stats={[
          { value: dashboard.course_allocation_count, label: "Allocations" },
          { value: dashboard.active_allocations, label: "Ongoing" },
          { value: dashboard.completed_allocations, label: "Completed" },
        ]}
      />

      <div className={styles.sectionHead}>
        <h2>Ongoing courses</h2>
        <Link to="/faculty/allocations">View all allocations →</Link>
      </div>
      <div className={styles.courseGrid}>
        {courseCards.map((card) => (
          <CourseCard key={card.id} {...card} />
        ))}
      </div>
      {courseCards.length === 0 && <p className={styles.empty}>No ongoing allocations right now.</p>}
    </DashboardShell>
  );
}
