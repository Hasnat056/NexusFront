import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconCalendar, IconGrid, IconPerson, IconScroll, IconTerminal, IconUserCheck } from "../components/icons/Icons";
import { FilterBar } from "../components/ui/FilterBar";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import type { StatusTone } from "../types/dashboard";
import type { EnrollmentStatus, StudentEnrollment } from "../types/api";
import { mockAllEnrollmentsResponse } from "../data/studentEnrollments";
import { mockStudentDashboardResponse } from "../data/studentDashboard";
import { mockCurrentSession } from "../data/session";
import formStyles from "../components/ui/Form.module.css";
import styles from "./FacultyListPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/student/dashboard" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/student/enrollments" },
  { id: "transcript", label: "Transcript", icon: IconScroll, href: "/student/transcript" },
  { id: "attendance", label: "Attendance", icon: IconCalendar, href: "/student/attendance" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/student/profile" },
  { id: "scratchpad", label: "Scratchpad", icon: IconTerminal, href: "/student/scratchpad" },
];

const ENROLLMENT_STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  Active: "good",
  Completed: "good",
  Inactive: "warning",
  Dropped: "critical",
};

const STATUS_OPTIONS: EnrollmentStatus[] = ["Active", "Completed", "Inactive", "Dropped"];

function facultyName(enrollment: StudentEnrollment): string {
  const details = enrollment.allocation_details.faculty_details;
  return "first_name" in details ? `${details.first_name} ${details.last_name}` : "—";
}

const columns: Column<StudentEnrollment>[] = [
  {
    key: "course",
    header: "Course",
    render: (e) => {
      const course = e.allocation_details.course_details;
      return (
        <>
          <Link to={`/student/enrollments/${e.enrollment_id}`} className={styles.nameLink}>
            {course?.course_name ?? "Untitled course"}
          </Link>
          <div>{course?.course_code ?? "—"}</div>
        </>
      );
    },
  },
  { key: "faculty", header: "Faculty", render: facultyName },
  { key: "semester", header: "Semester", render: (e) => `Semester ${e.allocation_details.semester_id}` },
  { key: "session", header: "Session", render: (e) => e.allocation_details.session },
  { key: "status", header: "Status", render: (e) => <Tag tone={ENROLLMENT_STATUS_TONE[e.status]}>{e.status}</Tag> },
  {
    key: "result",
    header: "",
    align: "right",
    render: (e) =>
      e.status === "Completed" ? (
        <Link
          to={`/student/transcript/${e.allocation_details.semester_id}?course=${e.enrollment_id}`}
          className={formStyles.secondaryButton}
        >
          View result
        </Link>
      ) : (
        "—"
      ),
  },
];

export function StudentEnrollmentListPage() {
  const dashboard = mockStudentDashboardResponse;
  const avatarInitials = `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const allEnrollments = mockAllEnrollmentsResponse().results;

  const rows = allEnrollments.filter((e) => {
    if (status && e.status !== status) return false;
    if (search) {
      const course = e.allocation_details.course_details;
      const haystack = `${course?.course_code ?? ""} ${course?.course_name ?? ""} ${facultyName(e)}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="enrollments"
      homeHref="/student/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Enrollments"
      sessionLabel={mockCurrentSession}
      subtitle={dashboard.institutional_email}
      profileHref="/student/profile"
    >
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by course or faculty…"
        selects={[
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      <Panel title="Enrollments" hint={`${rows.length} of ${allEnrollments.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(e) => String(e.enrollment_id)} />
        ) : (
          <p className={styles.empty}>No enrollments match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
