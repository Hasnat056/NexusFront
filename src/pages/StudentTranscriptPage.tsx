import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { STUDENT_RAIL_ITEMS } from "../components/layout/studentRailItems";
import { Panel } from "../components/ui/Panel";
import { StatTile } from "../components/ui/StatTile";
import { Table } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { EnrollmentTrendChart } from "../components/charts/EnrollmentTrendChart";
import { downloadTranscriptPdf } from "../lib/pdf/transcriptPdf";
import { imageToDataUrl } from "../lib/pdf/imageToDataUrl";
import type { StatusTone } from "../types/dashboard";
import type { StudentDashboardResponse, StudentEnrollment, StudentTranscript } from "../types/api";
import { selectCourseResults } from "../data/studentResults";
import { cumulativeGpa, selectGpaTrend, withSessionLabels, type SemesterRow } from "../data/studentTranscript";
import { apiGet, apiGetAllPages } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";
import pageStyles from "./StudentTranscriptPage.module.css";

function gpaTone(gpa: number): StatusTone {
  if (gpa >= 3.0) return "good";
  if (gpa >= 2.0) return "warning";
  return "critical";
}

function formatIssuedDate(): string {
  return new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

export function StudentTranscriptPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [transcripts, setTranscripts] = useState<StudentTranscript[] | null>(null);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<StudentDashboardResponse>("/student/dashboard/"),
      apiGetAllPages<StudentTranscript>("/student/transcripts/"),
      apiGetAllPages<StudentEnrollment>("/student/enrollments/"),
    ])
      .then(([dashboardRes, transcriptsRes, enrollmentsRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        setTranscripts(transcriptsRes);
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
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="transcript" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Transcript" subtitle="">
        <div className={formStyles.errorBanner}>{error}</div>
      </DashboardShell>
    );
  }

  if (!dashboard || !transcripts || !enrollments) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="transcript" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Transcript" subtitle="">
        <p className={styles.empty}>Loading transcript…</p>
      </DashboardShell>
    );
  }

  const studentName = `${dashboard.first_name} ${dashboard.last_name}`;
  const semesterRows: SemesterRow[] = withSessionLabels(transcripts, enrollments);
  const results = selectCourseResults(enrollments);
  const cgpa = cumulativeGpa(transcripts);
  const totalCredits = transcripts.reduce((sum, r) => sum + r.total_credits, 0);
  const gpaTrend = selectGpaTrend(semesterRows);

  async function handleExport() {
    setDownloading(true);
    try {
      const studentImageDataUrl = dashboard!.image ? await imageToDataUrl(dashboard!.image) : null;
      downloadTranscriptPdf({
        studentName,
        studentId: dashboard!.student_id,
        program: dashboard!.program,
        studentClass: dashboard!.class,
        studentImageDataUrl,
        avatarInitials,
        transcript: semesterRows,
        results,
        totalCredits,
        cumulativeGpa: cgpa,
        issuedOn: formatIssuedDate(),
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <DashboardShell
      railItems={STUDENT_RAIL_ITEMS}
      activeRailId="transcript"
      homeHref="/student/dashboard"
      profileHref="/student/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.image}
      pageTitle="Transcript"
      subtitle={dashboard.institutional_email}
    >
      <Panel
        title="Overview"
        hint={`${semesterRows.length} semester${semesterRows.length === 1 ? "" : "s"} completed`}
        headerExtra={
          <button type="button" className={formStyles.primaryButton} onClick={handleExport} disabled={downloading || semesterRows.length === 0}>
            {downloading ? "Preparing…" : "Export transcript (PDF)"}
          </button>
        }
      >
        <div className={pageStyles.overviewBody}>
          <div className={pageStyles.overviewStats}>
            <StatTile id="cgpa" label="Cumulative GPA" value={cgpa.toFixed(2)} />
            <StatTile id="credits" label="Total credits earned" value={String(totalCredits)} />
            <StatTile id="courses" label="Courses completed" value={String(results.length)} />
          </div>
          {gpaTrend.length > 1 && (
            <div className={pageStyles.trendBlock}>
              <p className={pageStyles.trendLabel}>GPA by semester</p>
              <EnrollmentTrendChart
                data={gpaTrend}
                formatValue={(v) => v.toFixed(2)}
                axisLabels={gpaTrend.map((point, i) => ({ atIndex: i, label: point.label }))}
              />
            </div>
          )}
        </div>
      </Panel>

      {semesterRows.length > 0 ? (
        semesterRows.map((row) => {
          const courses = results.filter((r) => r.semesterId === row.semester);
          const semesterGpa = Number(row.semester_gpa);
          return (
            <Panel
              key={row.semester}
              title={`${row.session} · Semester ${row.semester}`}
              hint={`${row.total_credits} credits`}
              headerExtra={<Tag tone={gpaTone(semesterGpa)}>{`GPA ${semesterGpa.toFixed(2)}`}</Tag>}
            >
              <Table
                columns={[
                  {
                    key: "course",
                    header: "Course",
                    render: (c) => (
                      <>
                        <strong>{c.courseName}</strong>
                        <div>{c.courseCode}</div>
                      </>
                    ),
                  },
                  { key: "credits", header: "Credits", align: "right", render: (c) => c.creditHours },
                  { key: "gpa", header: "Grade GPA", align: "right", render: (c) => (c.courseGpa != null ? c.courseGpa.toFixed(2) : "—") },
                ]}
                rows={courses}
                rowKey={(c) => String(c.enrollmentId)}
              />
              <div className={pageStyles.panelFooter}>
                <Link to={`/student/transcript/${row.semester}`} className={formStyles.linkButton}>
                  View semester result →
                </Link>
              </div>
            </Panel>
          );
        })
      ) : (
        <p className={styles.empty}>No completed semesters yet.</p>
      )}
    </DashboardShell>
  );
}
