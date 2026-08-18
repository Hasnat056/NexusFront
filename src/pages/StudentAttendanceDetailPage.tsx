import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconCalendar, IconGrid, IconPerson, IconScroll, IconTerminal, IconUserCheck } from "../components/icons/Icons";
import { AttendanceDots } from "../components/ui/AttendanceDots";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { FilterBar } from "../components/ui/FilterBar";
import { Panel } from "../components/ui/Panel";
import { Table } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { attendancePercentageTone, getStudentAttendanceForEnrollment } from "../data/studentAttendance";
import { mockStudentDashboardResponse } from "../data/studentDashboard";
import styles from "./PersonDetailPage.module.css";
import pageStyles from "./StudentAttendanceDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/student/dashboard" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/student/enrollments" },
  { id: "transcript", label: "Transcript", icon: IconScroll, href: "/student/transcript" },
  { id: "attendance", label: "Attendance", icon: IconCalendar, href: "/student/attendance" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/student/profile" },
  { id: "scratchpad", label: "Scratchpad", icon: IconTerminal, href: "/student/scratchpad" },
];

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function StudentAttendanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const enrollmentId = id ? Number(id) : NaN;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const dashboard = mockStudentDashboardResponse;
  const avatarInitials = `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase();

  const summary = getStudentAttendanceForEnrollment(enrollmentId);

  const filtered = useMemo(() => {
    if (!summary) return [];
    return summary.attendance_details.filter((d) => {
      if (status === "present" && !d.is_present) return false;
      if (status === "absent" && d.is_present) return false;
      if (search && !formatDate(d.attendance_date).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [summary, search, status]);

  if (!summary) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="attendance"
        homeHref="/student/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Attendance"
        subtitle={dashboard.institutional_email}
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/student/dashboard" },
            { label: "Attendance", href: "/student/attendance" },
            { label: id ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Enrollment {id} was not found.</p>
      </DashboardShell>
    );
  }

  const { course_details: course, faculty_details: faculty, attendance_details, percentage } = summary;
  const tone = attendancePercentageTone(percentage);
  const attended = attendance_details.filter((d) => d.is_present).length;

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="attendance"
      homeHref="/student/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={course?.course_name ?? course?.course_code ?? "Attendance"}
      subtitle={dashboard.institutional_email}
    >
      <div className={pageStyles.backRow}>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/student/dashboard" },
            { label: "Attendance", href: "/student/attendance" },
            { label: course?.course_name ?? course?.course_code ?? "Attendance" },
          ]}
        />
        <Link to={`/student/enrollments/${enrollmentId}`} className={styles.back}>
          View course →
        </Link>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.profileMain}>
          <h1 className={styles.name}>{course?.course_name ?? "Untitled course"}</h1>
          <p className={styles.subline}>
            {course?.course_code ?? "—"}
            {faculty ? ` · ${faculty.first_name} ${faculty.last_name}` : ""}
          </p>
        </div>
        <Tag tone={tone}>{`${percentage}%`}</Tag>
      </div>

      {attendance_details.length > 0 && (
        <div className={pageStyles.dotsCard}>
          <span className={pageStyles.dotsLabel}>Lecture pattern</span>
          <AttendanceDots attendance={attendance_details} />
        </div>
      )}

      <Panel
        title="Lecture history"
        hint={`${attended}/${attendance_details.length} attended`}
      >
        {attendance_details.length > 0 ? (
          <>
            <div className={styles.panelBody}>
              <FilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by date…"
                selects={[
                  {
                    id: "status",
                    value: status,
                    onChange: setStatus,
                    placeholder: "All lectures",
                    options: STATUS_OPTIONS,
                  },
                ]}
              />
            </div>
            {filtered.length > 0 ? (
              <Table
                columns={[
                  { key: "lecture", header: "Lecture", render: (r) => `#${r.lecture}` },
                  { key: "date", header: "Date", render: (r) => formatDate(r.attendance_date) },
                  {
                    key: "present",
                    header: "Status",
                    align: "right",
                    render: (r) => <Tag tone={r.is_present ? "good" : "critical"}>{r.is_present ? "Present" : "Absent"}</Tag>,
                  },
                ]}
                rows={filtered}
                rowKey={(r) => String(r.lecture)}
              />
            ) : (
              <p className={styles.empty}>No lectures match these filters.</p>
            )}
          </>
        ) : (
          <p className={styles.empty}>No lectures recorded yet.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
