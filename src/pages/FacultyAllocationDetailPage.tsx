import { useState } from "react";
import { useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconBook, IconGrid, IconPerson } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { CourseCard } from "../components/ui/CourseCard";
import { Panel } from "../components/ui/Panel";
import { StatTile } from "../components/ui/StatTile";
import { Table } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { ResultsDistributionChart } from "../components/charts/ResultsDistributionChart";
import type { StatusTone } from "../types/dashboard";
import type { EnrollmentStatus } from "../types/api";
import { countUngradedForAllocation, getFacultyAllocationDetail } from "../data/facultyAllocationDetail";
import { requestResultCalculation } from "../data/facultyRequests";
import { mockFacultyDashboardResponse } from "../data/facultyDashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/faculty/dashboard" },
  { id: "allocations", label: "Allocations", icon: IconBook, href: "/faculty/allocations" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/faculty/profile" },
];

const ALLOCATION_STATUS_TONE: Record<string, StatusTone> = {
  Ongoing: "good",
  Completed: "good",
  Inactive: "warning",
  Cancelled: "critical",
};

const ENROLLMENT_STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  Active: "good",
  Completed: "good",
  Inactive: "warning",
  Dropped: "critical",
};

export function FacultyAllocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const allocationId = id ? Number(id) : NaN;
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const dashboard = mockFacultyDashboardResponse;
  const avatarInitials = `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase();

  const detail = getFacultyAllocationDetail(allocationId);

  function refresh() {
    setTick((t) => t + 1);
  }

  if (!detail) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="allocations"
        homeHref="/faculty/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Allocation"
        subtitle={dashboard.faculty.institutional_email}
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/faculty/dashboard" },
            { label: "Allocations", href: "/faculty/allocations" },
            { label: id ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Allocation {id} was not found.</p>
      </DashboardShell>
    );
  }

  const ungraded = countUngradedForAllocation(allocationId);
  const locked = detail.status === "Completed";
  const resultPoints = detail.enrollment_set
    .filter((e) => e.result !== null)
    .map((e) => ({
      enrollmentId: e.enrollment_id,
      studentName: e.student_info?.student_name ?? e.student,
      studentId: e.student_info?.student_id ?? e.student,
      obtainedMarks: e.result!.obtained_marks,
      courseGpa: e.result!.course_gpa,
    }));
  const averageMarks = resultPoints.length
    ? (resultPoints.reduce((sum, p) => sum + p.obtainedMarks, 0) / resultPoints.length).toFixed(1)
    : "—";
  const averageGpa = resultPoints.length
    ? (resultPoints.reduce((sum, p) => sum + p.courseGpa, 0) / resultPoints.length).toFixed(2)
    : "—";

  function handleRequestCalculation() {
    const request = requestResultCalculation(allocationId);
    setError(null);
    setMessage(
      request.status === "pending" && request.confirmed_at === null
        ? "Result calculation requested — waiting on admin confirmation."
        : `A ${request.status} request already covers this allocation.`,
    );
    refresh();
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="allocations"
      homeHref="/faculty/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={detail.course}
      subtitle={`${detail.session} · Semester ${detail.semester} · ${dashboard.faculty.institutional_email}`}
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/faculty/dashboard" },
          { label: "Allocations", href: "/faculty/allocations" },
          { label: detail.course },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}
      {error && <div className={formStyles.errorBanner}>{error}</div>}

      <div className={styles.profileCard}>
        <div className={styles.profileMain}>
          <h1 className={styles.name}>{detail.course}</h1>
          <p className={styles.subline}>
            Allocation #{detail.allocation_id} · {detail.enrollment_set.length} enrolled
          </p>
        </div>
        <div className={formStyles.actions}>
          <Tag tone={ALLOCATION_STATUS_TONE[detail.status]}>{detail.status}</Tag>
          <button type="button" className={formStyles.primaryButton} onClick={handleRequestCalculation} disabled={locked}>
            Request result calculation
          </button>
        </div>
      </div>
      {ungraded > 0 && (
        <p className={formStyles.hint}>{ungraded} assessment mark(s) are still ungraded across this allocation's roster.</p>
      )}

      <div className={styles.detailGrid}>
        <CourseCard
          id="assessments"
          kicker="ASSESSMENTS"
          title={detail.assessment_set.length === 1 ? "1 assessment" : `${detail.assessment_set.length} assessments`}
          status={ungraded > 0 ? { label: `${ungraded} ungraded`, tone: "warning" } : { label: "All graded", tone: "good" }}
          meta={["Grading & weightage"]}
          href={`/faculty/allocations/${allocationId}/assessments`}
        />

        <CourseCard
          id="lectures"
          kicker="LECTURES"
          title={detail.lecture_set.length === 1 ? "1 lecture" : `${detail.lecture_set.length} lectures`}
          status={{ label: `${detail.enrollment_set.length} on roster`, tone: "good" }}
          meta={["Attendance"]}
          href={`/faculty/allocations/${allocationId}/lectures`}
        />
      </div>

      {locked && resultPoints.length > 0 && (
        <>
          <div className={styles.detailGrid}>
            <StatTile id="avg-marks" label="Class average marks" value={averageMarks} />
            <StatTile id="avg-gpa" label="Class average GPA" value={averageGpa} />
          </div>
          <Panel title="Results" hint="Final marks per student, out of 100">
            <ResultsDistributionChart points={resultPoints} />
          </Panel>
        </>
      )}

      <Panel title="Enrolled students">
        <Table
          columns={[
            {
              key: "student",
              header: "Student",
              render: (r) => (r.student_info ? `${r.student_info.student_name} — ${r.student_info.student_id}` : r.student),
            },
            { key: "status", header: "Status", render: (r) => <Tag tone={ENROLLMENT_STATUS_TONE[r.status]}>{r.status}</Tag> },
            {
              key: "result",
              header: "Result",
              align: "right",
              render: (r) => (r.result ? `${r.result.obtained_marks} marks · GPA ${r.result.course_gpa}` : "—"),
            },
          ]}
          rows={detail.enrollment_set}
          rowKey={(r) => String(r.enrollment_id)}
        />
      </Panel>
    </DashboardShell>
  );
}
