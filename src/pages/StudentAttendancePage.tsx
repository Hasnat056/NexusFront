import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { STUDENT_RAIL_ITEMS } from "../components/layout/studentRailItems";
import { AttendanceCard } from "../components/ui/AttendanceCard";
import { apiGet, apiGetAllPages } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { StudentAttendanceSummary, StudentDashboardResponse } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./StudentAttendancePage.module.css";
import pageStyles from "./PersonDetailPage.module.css";

export function StudentAttendancePage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendanceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<StudentDashboardResponse>("/student/dashboard/"),
      apiGetAllPages<StudentAttendanceSummary>("/student/attendance/"),
    ])
      .then(([dashboardRes, attendanceRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        setAttendance(attendanceRes);
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

  const avatarInitials = dashboard ? `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase() : "—";

  if (error) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="attendance" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Attendance" subtitle="">
        <div className={formStyles.errorBanner}>{error}</div>
      </DashboardShell>
    );
  }

  if (!dashboard || !attendance) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="attendance" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Attendance" subtitle="">
        <p className={pageStyles.empty}>Loading attendance…</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      railItems={STUDENT_RAIL_ITEMS}
      activeRailId="attendance"
      homeHref="/student/dashboard"
      profileHref="/student/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.image}
      pageTitle="Attendance"
      subtitle={dashboard.institutional_email}
    >
      {attendance.length > 0 ? (
        <div className={styles.grid}>
          {attendance.map((summary) => (
            <AttendanceCard key={summary.url} summary={summary} />
          ))}
        </div>
      ) : (
        <p className={pageStyles.empty}>No active enrollments.</p>
      )}
    </DashboardShell>
  );
}
