import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { STUDENT_RAIL_ITEMS } from "../components/layout/studentRailItems";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { StatTile } from "../components/ui/StatTile";
import { Table } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { downloadSemesterResultPdf } from "../lib/pdf/semesterResultPdf";
import { imageToDataUrl } from "../lib/pdf/imageToDataUrl";
import type { StatusTone } from "../types/dashboard";
import type { StudentDashboardResponse, StudentEnrollment, StudentTranscript } from "../types/api";
import { selectCourseResults } from "../data/studentResults";
import { apiGet, apiGetAllPages } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";
import pageStyles from "./StudentSemesterResultPage.module.css";

function gpaTone(gpa: number): StatusTone {
  if (gpa >= 3.0) return "good";
  if (gpa >= 2.0) return "warning";
  return "critical";
}

function formatIssuedDate(): string {
  return new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

export function StudentSemesterResultPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const semesterId = id ? Number(id) : NaN;
  const [searchParams] = useSearchParams();
  const linkedCourseId = Number(searchParams.get("course")) || null;
  const [expanded, setExpanded] = useState<Set<number>>(() => (linkedCourseId ? new Set([linkedCourseId]) : new Set()));
  const [downloading, setDownloading] = useState(false);
  const linkedCourseRef = useRef<HTMLDivElement>(null);

  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [transcripts, setTranscripts] = useState<StudentTranscript[] | null>(null);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [navigate, semesterId]);

  useEffect(() => {
    linkedCourseRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const avatarInitials = dashboard ? `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase() : "—";

  function toggleExpanded(enrollmentId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  }

  if (error) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="transcript" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Semester result" subtitle="">
        <div className={formStyles.errorBanner}>{error}</div>
      </DashboardShell>
    );
  }

  if (!dashboard || !transcripts || !enrollments) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="transcript" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Semester result" subtitle="">
        <p className={styles.notFound}>Loading semester result…</p>
      </DashboardShell>
    );
  }

  const semester = transcripts.find((t) => t.semester === semesterId);
  const courses = selectCourseResults(enrollments).filter((c) => c.semesterId === semesterId);
  const session = enrollments.find((e) => e.allocation_details.semester_id === semesterId)?.allocation_details.session ?? `Semester ${semesterId}`;
  const studentName = `${dashboard.first_name} ${dashboard.last_name}`;

  async function handleExport() {
    if (!semester) return;
    setDownloading(true);
    try {
      const studentImageDataUrl = dashboard!.image ? await imageToDataUrl(dashboard!.image) : null;
      downloadSemesterResultPdf({
        studentName,
        studentId: dashboard!.student_id,
        program: dashboard!.program,
        studentClass: dashboard!.class,
        studentImageDataUrl,
        avatarInitials,
        session,
        semesterId: semester.semester,
        courses,
        totalCredits: semester.total_credits,
        semesterGpa: Number(semester.semester_gpa),
        issuedOn: formatIssuedDate(),
      });
    } finally {
      setDownloading(false);
    }
  }

  if (!semester) {
    return (
      <DashboardShell
        railItems={STUDENT_RAIL_ITEMS}
        activeRailId="transcript"
        homeHref="/student/dashboard"
        profileHref="/student/profile"
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
        <p className={styles.notFound}>Semester {id} was not found. No result has been generated for it yet.</p>
      </DashboardShell>
    );
  }

  const semesterGpa = Number(semester.semester_gpa);

  return (
    <DashboardShell
      railItems={STUDENT_RAIL_ITEMS}
      activeRailId="transcript"
      homeHref="/student/dashboard"
      profileHref="/student/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.image}
      pageTitle={`Semester ${semester.semester} Result`}
      subtitle={`${session} · ${dashboard.institutional_email}`}
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/student/dashboard" },
          { label: "Transcript", href: "/student/transcript" },
          { label: `Semester ${semester.semester} Result` },
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
          <StatTile id="gpa" label="Semester GPA" value={semesterGpa.toFixed(2)} />
          <StatTile id="credits" label="Credits earned" value={String(semester.total_credits)} />
        </div>
      </Panel>

      <Panel title="Courses" hint="Click a course to see its assessment marks">
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
                    <span>{c.obtainedMarks != null ? `${c.obtainedMarks.toFixed(2)} / 100` : "—"}</span>
                    <Tag tone={c.courseGpa != null ? gpaTone(c.courseGpa) : "warning"}>
                      {c.courseGpa != null ? `GPA ${c.courseGpa.toFixed(2)}` : "Pending"}
                    </Tag>
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
                    ]}
                    rows={c.assessments}
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
