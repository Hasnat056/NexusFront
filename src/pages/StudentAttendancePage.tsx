import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconCalendar, IconGrid, IconPerson, IconScroll, IconTerminal, IconUserCheck } from "../components/icons/Icons";
import { AttendanceCard } from "../components/ui/AttendanceCard";
import { mockStudentAttendance } from "../data/studentAttendance";
import { mockStudentDashboardResponse } from "../data/studentDashboard";
import styles from "./StudentAttendancePage.module.css";
import pageStyles from "./PersonDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/student/dashboard" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/student/enrollments" },
  { id: "transcript", label: "Transcript", icon: IconScroll, href: "/student/transcript" },
  { id: "attendance", label: "Attendance", icon: IconCalendar, href: "/student/attendance" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/student/profile" },
  { id: "scratchpad", label: "Scratchpad", icon: IconTerminal, href: "/student/scratchpad" },
];

export function StudentAttendancePage() {
  const dashboard = mockStudentDashboardResponse;
  const avatarInitials = `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase();

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="attendance"
      homeHref="/student/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Attendance"
      subtitle={dashboard.institutional_email}
    >
      {mockStudentAttendance.length > 0 ? (
        <div className={styles.grid}>
          {mockStudentAttendance.map((summary) => (
            <AttendanceCard key={summary.url} summary={summary} />
          ))}
        </div>
      ) : (
        <p className={pageStyles.empty}>No active enrollments.</p>
      )}
    </DashboardShell>
  );
}
