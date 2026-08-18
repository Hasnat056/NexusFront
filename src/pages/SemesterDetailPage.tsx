import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import {
  IconBars,
  IconBook,
  IconBuilding,
  IconCalendar,
  IconClipboard,
  IconGraduationCap,
  IconHourglass,
  IconInbox,
  IconLayers,
  IconGrid,
  IconPeople,
  IconPerson,
  IconScroll,
  IconUserCheck,
} from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import { ALLOCATION_STATUS_TONE, mockAllocations } from "../data/allocationDirectory";
import { SEMESTER_STATUS_TONE } from "../data/classDirectory";
import { mockCourses } from "../data/courseDirectory";
import { mockEnrollments } from "../data/enrollmentDirectory";
import {
  getSemesterView,
  isActivationDeadlineLocked,
  isClosingDeadlineLocked,
  isSessionLocked,
  setSemesterActivationDeadline,
  setSemesterClosingDeadline,
  setSemesterSession,
} from "../data/semesterDirectory";
import { mockSessions } from "../data/sessionDirectory";
import { generateTranscripts, mockTranscripts, type TranscriptStudentError } from "../data/transcriptDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/admin/dashboard" },
  { id: "faculty", label: "Faculty", icon: IconPerson, href: "/admin/faculty" },
  { id: "students", label: "Students", icon: IconPeople, href: "/admin/students" },
  { id: "departments", label: "Departments", icon: IconBuilding, href: "/admin/departments" },
  { id: "programs", label: "Programs", icon: IconLayers, href: "/admin/programs" },
  { id: "courses", label: "Courses", icon: IconBook, href: "/admin/courses" },
  { id: "classes", label: "Classes", icon: IconGraduationCap, href: "/admin/classes" },
  { id: "allocations", label: "Allocations", icon: IconClipboard, href: "/admin/allocations" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/admin/enrollments" },
  { id: "sessions", label: "Sessions", icon: IconCalendar, href: "/admin/sessions" },
  { id: "semesters", label: "Semesters", icon: IconHourglass, href: "/admin/semesters" },
  { id: "transcripts", label: "Transcripts", icon: IconScroll, href: "/admin/transcripts" },
  { id: "requests", label: "Requests", icon: IconInbox, href: "/admin/requests" },
  { id: "reports", label: "Reports", icon: IconBars },
];

/** datetime-local inputs want "YYYY-MM-DDTHH:mm" with no timezone — this is local time, same as
 * what the input will hand back on change. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SemesterDetailPage() {
  const { semesterId } = useParams<{ semesterId: string }>();
  const semester = semesterId ? getSemesterView(Number(semesterId)) : undefined;
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [sessionInput, setSessionInput] = useState(() => (semester?.session !== null ? String(semester?.session) : ""));
  const [activationInput, setActivationInput] = useState(() => toLocalInputValue(semester?.activation_deadline ?? null));
  const [closingInput, setClosingInput] = useState(() => toLocalInputValue(semester?.closing_deadline ?? null));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studentErrors, setStudentErrors] = useState<TranscriptStudentError[] | null>(null);
  const [, setTick] = useState(0);

  if (!semester) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="semesters"
        homeHref="/admin/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Semester"
        sessionLabel={mockCurrentSession}
        subtitle={admin.institutional_email}
        profileHref="/admin/profile"
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Semesters", href: "/admin/semesters" },
            { label: semesterId ?? "Not found" },
          ]}
        />
        <p className={detailStyles.notFound}>Semester {semesterId} was not found.</p>
      </DashboardShell>
    );
  }

  const allocations = mockAllocations.filter((a) => a.semester === semester.semesterId);
  const allocationIds = allocations.map((a) => a.allocation_id);
  const semesterEnrollments = mockEnrollments.filter((e) => allocationIds.includes(e.allocation));
  const ungraded = semesterEnrollments.filter((e) => e.result === null);

  const sessionLocked = isSessionLocked(semester);
  const activationLocked = isActivationDeadlineLocked(semester);
  const closingLocked = isClosingDeadlineLocked(semester);

  function handleSetSession(e: React.FormEvent) {
    e.preventDefault();
    setSemesterSession(semester!.semesterId, sessionInput ? Number(sessionInput) : null);
    setMessage("Session updated.");
    setError(null);
    setTick((t) => t + 1);
  }

  function handleSetActivation(e: React.FormEvent) {
    e.preventDefault();
    const iso = new Date(activationInput).toISOString();
    const result = setSemesterActivationDeadline(semester!.semesterId, iso);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    setError(null);
    setMessage("Activation deadline set. The move to Active happens automatically at that time (semester_activation_task) — not modeled here, no scheduler in this mock.");
    setTick((t) => t + 1);
  }

  function handleSetClosing(e: React.FormEvent) {
    e.preventDefault();
    const iso = new Date(closingInput).toISOString();
    const result = setSemesterClosingDeadline(semester!.semesterId, iso, ungraded.length);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    setError(null);
    setMessage("Closing deadline set. The move to Completed happens automatically at that time (semester_closing_task) — not modeled here, no scheduler in this mock.");
    setTick((t) => t + 1);
  }

  function handleGenerateTranscripts() {
    setStudentErrors(null);
    const result = generateTranscripts(semester!.semesterId);
    if (result.ok) {
      setError(null);
      setMessage(`${result.created.length} transcript${result.created.length === 1 ? "" : "s"} generated.`);
      setTick((t) => t + 1);
      return;
    }
    setMessage(null);
    if ("studentErrors" in result) {
      setError("Some students aren't ready — nothing was generated.");
      setStudentErrors(result.studentErrors);
    } else {
      setError(result.message);
    }
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="semesters"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Semester"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Semesters", href: "/admin/semesters" },
          { label: `${semester.classLabel} · Semester ${semester.semesterNo}` },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}
      {error && <div className={formStyles.errorBanner}>{error}</div>}

      <div className={detailStyles.profileCard}>
        <div className={detailStyles.profileMain}>
          <h1 className={detailStyles.name}>
            {semester.classLabel} · Semester {semester.semesterNo}
          </h1>
          <p className={detailStyles.subline}>
            Semester #{semester.semesterId} ·{" "}
            <Link to={`/admin/classes/${semester.classId}`} className={detailStyles.back}>
              View class
            </Link>
          </p>
        </div>
        <Tag tone={SEMESTER_STATUS_TONE[semester.status]}>{semester.status}</Tag>
      </div>

      <Panel title="Term">
        <form className={detailStyles.panelBody} onSubmit={handleSetSession}>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="session">Session</label>
              <select id="session" value={sessionInput} onChange={(e) => setSessionInput(e.target.value)} disabled={sessionLocked}>
                <option value="">Unassigned</option>
                {mockSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.period} {s.year}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.secondaryButton} disabled={sessionLocked}>
                Save session
              </button>
            </div>
          </div>
          <span className={formStyles.hint}>
            {sessionLocked
              ? "Locked — once activation_deadline has passed, session can no longer change (SemesterSerializer.get_extra_kwargs)."
              : "Also editable from the class's own scheme of studies — same underlying field."}
          </span>
        </form>
      </Panel>

      <Panel title="Activation">
        <form className={detailStyles.panelBody} onSubmit={handleSetActivation}>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="activation_deadline">Activation deadline</label>
              <input
                id="activation_deadline"
                type="datetime-local"
                value={activationInput}
                onChange={(e) => setActivationInput(e.target.value)}
                disabled={activationLocked}
                required
              />
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.primaryButton} disabled={activationLocked}>
                Set activation deadline
              </button>
            </div>
          </div>
          <span className={formStyles.hint}>
            {activationLocked
              ? "Locked — activation deadline has already passed."
              : "A class can only have one semester active or activating at a time — setting this will fail if another semester in this class already is."}
          </span>
        </form>
      </Panel>

      <Panel title="Closing">
        <form className={detailStyles.panelBody} onSubmit={handleSetClosing}>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="closing_deadline">Closing deadline</label>
              <input
                id="closing_deadline"
                type="datetime-local"
                value={closingInput}
                onChange={(e) => setClosingInput(e.target.value)}
                disabled={closingLocked}
                required
              />
            </div>
            <div className={formStyles.field}>
              <label>&nbsp;</label>
              <button type="submit" className={formStyles.primaryButton} disabled={closingLocked}>
                Set closing deadline
              </button>
            </div>
          </div>
          <span className={formStyles.hint}>
            {closingLocked
              ? "Locked until this semester has an activation deadline and has actually activated."
              : ungraded.length > 0
                ? `${ungraded.length} of ${semesterEnrollments.length} enrollments here still need a result before this can be set.`
                : "All enrollments here already have a result — ready to close."}
          </span>
        </form>
      </Panel>

      {semester.closing_deadline !== null && (
        <Panel title="Transcripts">
          <div className={detailStyles.panelBody}>
            <span className={formStyles.hint}>
              Mirrors POST /api/admin/semesters/{semester.semesterId}/transcripts-create/
              (TranscriptBulkCreateAPIView) — only shown here because closing_deadline is set,
              matching when the real transcript_generation_url actually appears on this resource.
              {mockTranscripts.some((t) => t.semester === semester.semesterId) &&
                " Transcripts already exist for at least one student here."}
            </span>
            {studentErrors && (
              <ul>
                {studentErrors.map((e) => (
                  <li key={e.student}>
                    {e.student}: {e.message}
                  </li>
                ))}
              </ul>
            )}
            <div className={formStyles.actions}>
              <button type="button" className={formStyles.primaryButton} onClick={handleGenerateTranscripts}>
                Generate transcripts
              </button>
              <Link to="/admin/transcripts" className={formStyles.secondaryButton}>
                View transcripts
              </Link>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Scheme of studies" hint="Read-only here — edit from the class page">
        <div className={detailStyles.panelBody}>
          {semester.courseCodes.length === 0 ? (
            <span className={formStyles.hint}>No courses assigned yet.</span>
          ) : (
            <ul>
              {semester.courseCodes.map((code) => {
                const course = mockCourses.find((c) => c.course_code === code);
                return (
                  <li key={code}>
                    <Link to={`/admin/courses/${code}`} className={detailStyles.back}>
                      {code}
                    </Link>{" "}
                    {course && `— ${course.course_name}`}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>

      <Panel title="Allocations" hint={`${allocations.length} allocation${allocations.length === 1 ? "" : "s"}`}>
        <div className={detailStyles.panelBody}>
          {allocations.length === 0 ? (
            <span className={formStyles.hint}>No course allocations for this semester yet.</span>
          ) : (
            <ul>
              {allocations.map((a) => (
                <li key={a.allocation_id}>
                  <Link to={`/admin/allocations/${a.allocation_id}`} className={detailStyles.back}>
                    {a.course} — {a.faculty}
                  </Link>{" "}
                  <Tag tone={ALLOCATION_STATUS_TONE[a.status]}>{a.status}</Tag>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
    </DashboardShell>
  );
}
