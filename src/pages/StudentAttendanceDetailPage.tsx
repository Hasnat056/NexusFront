import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { STUDENT_RAIL_ITEMS } from "../components/layout/studentRailItems";
import { AttendanceDots } from "../components/ui/AttendanceDots";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { FilterBar } from "../components/ui/FilterBar";
import { Panel } from "../components/ui/Panel";
import { Table } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { attendancePercentageTone } from "../data/studentAttendance";
import { apiGet } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { StudentAttendanceSummary, StudentDashboardResponse } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";
import pageStyles from "./StudentAttendanceDetailPage.module.css";

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function StudentAttendanceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const enrollmentId = id ? Number(id) : NaN;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<StudentDashboardResponse>("/student/dashboard/"),
      apiGet<StudentAttendanceSummary>(`/student/attendance/${enrollmentId}/`),
    ])
      .then(([dashboardRes, summaryRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        setSummary(summaryRes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setLoadError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, enrollmentId]);

  const filtered = useMemo(() => {
    if (!summary) return [];
    return summary.attendance_details.filter((d) => {
      if (status === "present" && !d.is_present) return false;
      if (status === "absent" && d.is_present) return false;
      if (search && !formatDate(d.attendance_date).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [summary, search, status]);

  const avatarInitials = dashboard ? `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase() : "—";

  if (loadError) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="attendance" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Attendance" subtitle="">
        <div className={formStyles.errorBanner}>{loadError}</div>
      </DashboardShell>
    );
  }

  if (notFound) {
    return (
      <DashboardShell
        railItems={STUDENT_RAIL_ITEMS}
        activeRailId="attendance"
        homeHref="/student/dashboard"
        profileHref="/student/profile"
        avatarInitials={avatarInitials}
        pageTitle="Attendance"
        subtitle={dashboard?.institutional_email ?? ""}
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

  if (!dashboard || !summary) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="attendance" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Attendance" subtitle="">
        <p className={styles.notFound}>Loading attendance…</p>
      </DashboardShell>
    );
  }

  const { course_details: course, faculty_details: faculty, attendance_details, percentage } = summary;
  const tone = attendancePercentageTone(percentage);
  const attended = attendance_details.filter((d) => d.is_present).length;

  return (
    <DashboardShell
      railItems={STUDENT_RAIL_ITEMS}
      activeRailId="attendance"
      homeHref="/student/dashboard"
      profileHref="/student/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.image}
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
