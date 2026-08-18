import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconCalendar, IconGrid, IconPerson, IconScroll, IconTerminal, IconUserCheck } from "../components/icons/Icons";
import { Panel } from "../components/ui/Panel";
import { StatTile } from "../components/ui/StatTile";
import { Table } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { EnrollmentTrendChart } from "../components/charts/EnrollmentTrendChart";
import { downloadTranscriptPdf } from "../lib/pdf/transcriptPdf";
import { imageToDataUrl } from "../lib/pdf/imageToDataUrl";
import type { StatusTone } from "../types/dashboard";
import { selectCourseResults } from "../data/studentResults";
import { cumulativeGpa, mockStudentTranscript, selectGpaTrend } from "../data/studentTranscript";
import { mockStudentDashboardResponse } from "../data/studentDashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";
import pageStyles from "./StudentTranscriptPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/student/dashboard" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/student/enrollments" },
  { id: "transcript", label: "Transcript", icon: IconScroll, href: "/student/transcript" },
  { id: "attendance", label: "Attendance", icon: IconCalendar, href: "/student/attendance" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/student/profile" },
  { id: "scratchpad", label: "Scratchpad", icon: IconTerminal, href: "/student/scratchpad" },
];

function gpaTone(gpa: number): StatusTone {
  if (gpa >= 3.0) return "good";
  if (gpa >= 2.0) return "warning";
  return "critical";
}

function formatIssuedDate(): string {
  return new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

export function StudentTranscriptPage() {
  const [downloading, setDownloading] = useState(false);
  const dashboard = mockStudentDashboardResponse;
  const avatarInitials = `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase();
  const studentName = `${dashboard.first_name} ${dashboard.last_name}`;

  const transcript = mockStudentTranscript();
  const results = selectCourseResults();
  const cgpa = cumulativeGpa(transcript);
  const totalCredits = transcript.reduce((sum, r) => sum + r.total_credits, 0);
  const gpaTrend = selectGpaTrend(transcript);

  async function handleExport() {
    setDownloading(true);
    try {
      const studentImageDataUrl = dashboard.image ? await imageToDataUrl(dashboard.image) : null;
      downloadTranscriptPdf({
        studentName,
        studentId: dashboard.student_id,
        program: dashboard.program,
        studentClass: dashboard.class,
        studentImageDataUrl,
        avatarInitials,
        transcript,
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
      railItems={RAIL_ITEMS}
      activeRailId="transcript"
      homeHref="/student/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Transcript"
      subtitle={dashboard.institutional_email}
    >
      <p className={pageStyles.devNote}>
        No student-facing results/transcript endpoint exists in the real backend yet (Admin can
        generate and view transcripts; a student has no route to read their own) — this page
        computes both using the exact same grading and GPA formulas the backend uses, from the
        Results this student's completed courses already have. Cumulative GPA isn't a real
        backend field either, on either role — it's computed here for convenience.
      </p>

      <Panel
        title="Overview"
        hint={`${transcript.length} semester${transcript.length === 1 ? "" : "s"} completed`}
        headerExtra={
          <button type="button" className={formStyles.primaryButton} onClick={handleExport} disabled={downloading}>
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

      {transcript.length > 0 ? (
        transcript.map((row) => {
          const courses = results.filter((r) => r.semesterId === row.semester);
          return (
            <Panel
              key={row.semester}
              title={`${row.session} · Semester ${row.semester}`}
              hint={`${row.total_credits} credits`}
              headerExtra={<Tag tone={gpaTone(row.semester_gpa)}>{`GPA ${row.semester_gpa.toFixed(2)}`}</Tag>}
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
                  { key: "gpa", header: "Grade GPA", align: "right", render: (c) => c.courseGpa.toFixed(2) },
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
