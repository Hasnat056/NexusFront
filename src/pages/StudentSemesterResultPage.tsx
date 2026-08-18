import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconCalendar, IconGrid, IconPerson, IconScroll, IconTerminal, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { StatTile } from "../components/ui/StatTile";
import { Table } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { downloadSemesterResultPdf } from "../lib/pdf/semesterResultPdf";
import { imageToDataUrl } from "../lib/pdf/imageToDataUrl";
import type { StatusTone } from "../types/dashboard";
import { selectCourseResults } from "../data/studentResults";
import { mockStudentTranscript } from "../data/studentTranscript";
import { mockStudentDashboardResponse } from "../data/studentDashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";
import pageStyles from "./StudentSemesterResultPage.module.css";

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

export function StudentSemesterResultPage() {
  const { id } = useParams<{ id: string }>();
  const semesterId = id ? Number(id) : NaN;
  const [searchParams] = useSearchParams();
  const linkedCourseId = Number(searchParams.get("course")) || null;
  const [expanded, setExpanded] = useState<Set<number>>(() => (linkedCourseId ? new Set([linkedCourseId]) : new Set()));
  const [downloading, setDownloading] = useState(false);
  const linkedCourseRef = useRef<HTMLDivElement>(null);

  const dashboard = mockStudentDashboardResponse;
  const avatarInitials = `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase();
  const studentName = `${dashboard.first_name} ${dashboard.last_name}`;

  const semester = mockStudentTranscript().find((r) => r.semester === semesterId);
  const courses = selectCourseResults().filter((c) => c.semesterId === semesterId);

  useEffect(() => {
    linkedCourseRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  function toggleExpanded(enrollmentId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  }

  async function handleExport() {
    if (!semester) return;
    setDownloading(true);
    try {
      const studentImageDataUrl = dashboard.image ? await imageToDataUrl(dashboard.image) : null;
      downloadSemesterResultPdf({
        studentName,
        studentId: dashboard.student_id,
        program: dashboard.program,
        studentClass: dashboard.class,
        studentImageDataUrl,
        avatarInitials,
        session: semester.session,
        semesterId: semester.semester,
        courses,
        totalCredits: semester.total_credits,
        semesterGpa: semester.semester_gpa,
        issuedOn: formatIssuedDate(),
      });
    } finally {
      setDownloading(false);
    }
  }

  if (!semester) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="transcript"
        homeHref="/student/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Semester result"
        subtitle={dashboard.institutional_email}
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/student/dashboard" },
            { label: "Transcript", href: "/student/transcript" },
            { label: id ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Semester {id} was not found.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="transcript"
      homeHref="/student/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={`${semester.session} · Semester ${semester.semester}`}
      subtitle={dashboard.institutional_email}
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/student/dashboard" },
          { label: "Transcript", href: "/student/transcript" },
          { label: `${semester.session} · Semester ${semester.semester}` },
        ]}
      />

      <Panel
        title="Overview"
        hint={`${courses.length} courses`}
        headerExtra={
          <button type="button" className={formStyles.primaryButton} onClick={handleExport} disabled={downloading}>
            {downloading ? "Preparing…" : "Export semester result (PDF)"}
          </button>
        }
      >
        <div className={pageStyles.overviewStats}>
          <StatTile id="gpa" label="Semester GPA" value={semester.semester_gpa.toFixed(2)} />
          <StatTile id="credits" label="Credits earned" value={String(semester.total_credits)} />
        </div>
      </Panel>

      <Panel title="Courses" hint="Click a course to see its assessment details">
        <div className={pageStyles.courseList}>
          {courses.map((c) => {
            const isOpen = expanded.has(c.enrollmentId);
            const isLinked = c.enrollmentId === linkedCourseId;
            return (
              <div
                key={c.enrollmentId}
                ref={isLinked ? linkedCourseRef : undefined}
                className={`${pageStyles.courseBlock} ${isLinked ? pageStyles.courseBlockLinked : ""}`}
              >
                <div className={pageStyles.courseHead}>
                  <div>
                    <strong>{c.courseName}</strong>
                    <div className={pageStyles.courseCode}>{c.courseCode}</div>
                  </div>
                  <div className={pageStyles.courseStats}>
                    <span>{c.creditHours} credits</span>
                    <span>{c.obtainedMarks.toFixed(2)} / 100</span>
                    <Tag tone={gpaTone(c.courseGpa)}>{`GPA ${c.courseGpa.toFixed(2)}`}</Tag>
                    <button type="button" className={formStyles.linkButton} onClick={() => toggleExpanded(c.enrollmentId)}>
                      {isOpen ? "Hide details" : "View details"}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <Table
                    columns={[
                      {
                        key: "assessment",
                        header: "Assessment",
                        render: (a) => (
                          <>
                            <strong>{a.name}</strong>
                            <div>{a.type}</div>
                          </>
                        ),
                      },
                      { key: "marks", header: "Marks", align: "right", render: (a) => `${a.obtained ?? "—"} / ${a.totalMarks}` },
                      { key: "weightage", header: "Weightage", align: "right", render: (a) => `${a.weightage}%` },
                      { key: "contribution", header: "Contributes", align: "right", render: (a) => `${a.contribution.toFixed(2)} pts` },
                    ]}
                    rows={c.breakdown}
                    rowKey={(a) => String(a.assessmentId)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </DashboardShell>
  );
}
