import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { FACULTY_RAIL_ITEMS } from "../components/layout/facultyRailItems";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { CourseCard } from "../components/ui/CourseCard";
import { Panel } from "../components/ui/Panel";
import { StatTile } from "../components/ui/StatTile";
import { Table } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { ResultsDistributionChart } from "../components/charts/ResultsDistributionChart";
import type { StatusTone } from "../types/dashboard";
import type { Assessment, EnrollmentStatus, FacultyAllocationDetail, FacultyDashboardResponse } from "../types/api";
import { apiGet, apiMutate } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const ALLOCATION_STATUS_TONE: Record<string, StatusTone> = {
  Active: "good",
  Locked: "warning",
  Completed: "good",
  Inactive: "warning",
  Cancelled: "critical",
};

const ENROLLMENT_STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  Active: "good",
  Locked: "warning",
  Completed: "good",
  Inactive: "warning",
  Dropped: "critical",
};

export function FacultyAllocationDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const allocationId = id ? Number(id) : NaN;
  const [dashboard, setDashboard] = useState<FacultyDashboardResponse | null>(null);
  const [detail, setDetail] = useState<FacultyAllocationDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [thresholdInput, setThresholdInput] = useState("50");
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [savingThreshold, setSavingThreshold] = useState(false);
  // AssessmentSerializer.__init__ (FacultyModule/serializers.py) only keeps assessmentchecked_set
  // when serializing a single Assessment — assessment_set nested under this allocation is a
  // many=True context, so the field is always absent there. Fetch each assessment's own detail to
  // compute how many marks are still ungraded.
  const [ungraded, setUngraded] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<FacultyDashboardResponse>("/faculty/dashboard/"),
      apiGet<FacultyAllocationDetail>(`/faculty/allocations/${allocationId}/`),
    ])
      .then(([dashboardRes, detailRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        setDetail(detailRes);
        setThresholdInput(String(detailRes.passing_threshold));
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
  }, [navigate, allocationId]);

  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    Promise.all(
      detail.assessment_set.map((a) =>
        apiGet<Assessment>(`/faculty/allocations/${allocationId}/assessments/${a.assessment_id}/`),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        setUngraded(results.reduce((sum, a) => sum + a.assessmentchecked_set.filter((c) => c.obtained === null).length, 0));
      })
      .catch(() => {
        // Best-effort — the ungraded hint just stays at 0 if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, [detail, allocationId]);

  const avatarInitials = dashboard ? `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase() : "—";

  if (loadError) {
    return (
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="allocations"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials={avatarInitials}
        pageTitle="Allocation"
        subtitle=""
      >
        <div className={formStyles.errorBanner}>{loadError}</div>
      </DashboardShell>
    );
  }

  if (notFound) {
    return (
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="allocations"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials={avatarInitials}
        pageTitle="Allocation"
        subtitle={dashboard?.faculty.institutional_email ?? ""}
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

  if (!dashboard || !detail) {
    return (
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="allocations"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials={avatarInitials}
        pageTitle="Allocation"
        subtitle=""
      >
        <p className={styles.notFound}>Loading allocation…</p>
      </DashboardShell>
    );
  }

  const locked = detail.status === "Completed";
  const resultPoints = detail.enrollment_set
    .filter((e) => e.result !== null && e.result.obtained_marks !== null && e.result.course_gpa !== null)
    .map((e) => ({
      enrollmentId: e.enrollment_id,
      studentName: e.student_info?.student_name ?? e.student,
      studentId: e.student_info?.student_id ?? e.student,
      obtainedMarks: e.result!.obtained_marks as number,
      courseGpa: e.result!.course_gpa as number,
    }));
  const averageMarks = resultPoints.length
    ? (resultPoints.reduce((sum, p) => sum + p.obtainedMarks, 0) / resultPoints.length).toFixed(1)
    : "—";
  const averageGpa = resultPoints.length
    ? (resultPoints.reduce((sum, p) => sum + p.courseGpa, 0) / resultPoints.length).toFixed(2)
    : "—";

  async function handleRequestCalculation() {
    setRequesting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiGet<{ message: string }>(`/faculty/allocations/${allocationId}/calculate-result/`);
      setMessage(res.message);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
    } finally {
      setRequesting(false);
    }
  }

  async function handleSaveThreshold(e: React.FormEvent) {
    e.preventDefault();
    setThresholdError(null);
    setSavingThreshold(true);
    try {
      const updated = await apiMutate<FacultyAllocationDetail>(`/faculty/allocations/${allocationId}/`, "PATCH", {
        passing_threshold: Number(thresholdInput),
      });
      setDetail((prev) => (prev ? { ...prev, passing_threshold: updated.passing_threshold } : prev));
      setMessage("Passing threshold updated.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      const { banner } = apiFormErrors(err);
      setThresholdError(banner ?? apiErrorMessage(err));
    } finally {
      setSavingThreshold(false);
    }
  }

  return (
    <DashboardShell
      railItems={FACULTY_RAIL_ITEMS}
      activeRailId="allocations"
      homeHref="/faculty/dashboard"
      profileHref="/faculty/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.faculty.image}
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
          <button
            type="button"
            className={formStyles.primaryButton}
            onClick={handleRequestCalculation}
            disabled={locked || requesting}
          >
            {requesting ? "Requesting…" : "Request result calculation"}
          </button>
        </div>
      </div>

      <form className={formStyles.row} onSubmit={handleSaveThreshold}>
        <div className={formStyles.field} data-invalid={thresholdError ? "true" : undefined}>
          <label htmlFor="passing_threshold">Passing threshold</label>
          <input
            id="passing_threshold"
            type="number"
            min={30}
            max={50}
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
            disabled={locked}
          />
          {thresholdError && <span className={formStyles.fieldError}>{thresholdError}</span>}
        </div>
        <div className={formStyles.field}>
          <label>&nbsp;</label>
          <button type="submit" className={formStyles.secondaryButton} disabled={locked || savingThreshold}>
            {savingThreshold ? "Saving…" : "Save threshold"}
          </button>
        </div>
      </form>
      <p className={formStyles.hint}>
        Percentage a student must reach to pass this course (30-50). Stays editable while the
        allocation is Locked so results can be recalculated under a different cutoff — it freezes
        once the allocation is Completed.
      </p>

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
              render: (r) => (r.student_info ? `${r.student_info.student_name} · ${r.student_info.student_id}` : r.student),
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
