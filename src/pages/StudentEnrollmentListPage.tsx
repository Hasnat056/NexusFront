import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { STUDENT_RAIL_ITEMS } from "../components/layout/studentRailItems";
import { FilterBar } from "../components/ui/FilterBar";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import type { StatusTone } from "../types/dashboard";
import type { EnrollmentStatus, StudentDashboardResponse, StudentEnrollment } from "../types/api";
import { useCurrentSessionLabel } from "../hooks/useCurrentSession";
import { apiGet, apiGetAllPages } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./FacultyListPage.module.css";

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
    header: "Result",
    align: "right",
    render: (e) =>
      e.status === "Completed" && e.result?.course_gpa != null ? (
        <Link to={`/student/transcript/${e.allocation_details.semester_id}?course=${e.enrollment_id}`} className={styles.nameLink}>
          {`GPA ${e.result.course_gpa.toFixed(2)}`}
        </Link>
      ) : e.status === "Completed" ? (
        "Pending"
      ) : (
        "—"
      ),
  },
];

export function StudentEnrollmentListPage() {
  const navigate = useNavigate();
  const sessionLabel = useCurrentSessionLabel();
  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<StudentDashboardResponse>("/student/dashboard/"),
      apiGetAllPages<StudentEnrollment>("/student/enrollments/"),
    ])
      .then(([dashboardRes, enrollmentsRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        setEnrollments(enrollmentsRes);
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
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="enrollments" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Enrollments" subtitle="">
        <div className={formStyles.errorBanner}>{error}</div>
      </DashboardShell>
    );
  }

  if (!dashboard || !enrollments) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="enrollments" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Enrollments" subtitle="">
        <p className={styles.empty}>Loading enrollments…</p>
      </DashboardShell>
    );
  }

  const rows = enrollments.filter((e) => {
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
      railItems={STUDENT_RAIL_ITEMS}
      activeRailId="enrollments"
      homeHref="/student/dashboard"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.image}
      pageTitle="Enrollments"
      sessionLabel={sessionLabel ?? undefined}
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

      <Panel title="Enrollments" hint={`${rows.length} of ${enrollments.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(e) => String(e.enrollment_id)} />
        ) : (
          <p className={styles.empty}>No enrollments match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
