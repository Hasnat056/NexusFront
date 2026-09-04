import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Select } from "../components/ui/Select";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import { apiGet, apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import type {
  AdminClass,
  AdminCourse,
  AdminCourseAllocationSummary,
  AdminEnrollmentSummary,
  AdminSemester,
  AdminSession,
  AdminTranscript,
  CourseAllocationStatus,
  SemesterStatus,
} from "../types/api";
import type { StatusTone } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";

const SEMESTER_STATUS_TONE: Record<SemesterStatus, StatusTone> = {
  Inactive: "warning",
  Active: "good",
  Completed: "critical",
};
const ALLOCATION_STATUS_TONE: Record<CourseAllocationStatus, StatusTone> = {
  Ongoing: "good",
  Completed: "good",
  Inactive: "warning",
  Cancelled: "critical",
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isActivationDeadlineLocked(activationDeadline: string | null): boolean {
  return activationDeadline !== null && new Date(activationDeadline) < new Date();
}

function isClosingDeadlineLocked(activationDeadline: string | null, status: SemesterStatus): boolean {
  if (!activationDeadline) return true;
  const activationPassed = new Date(activationDeadline) < new Date();
  if (!activationPassed && status === "Inactive") return true;
  return false;
}

function validateDeadline(iso: string): string | null {
  const value = new Date(iso);
  const now = new Date();
  if (value < now) return "Deadline cannot be in the past.";
  if (value.getTime() - now.getTime() < 7 * 60 * 1000) return "Deadline must be at least a few minutes from now.";
  return null;
}

export function SemesterDetailPage() {
  const { semesterId } = useParams<{ semesterId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [semester, setSemester] = useState<AdminSemester | null>(null);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [allocations, setAllocations] = useState<AdminCourseAllocationSummary[]>([]);
  const [ungradedCount, setUngradedCount] = useState(0);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [hasTranscripts, setHasTranscripts] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [sessionInput, setSessionInput] = useState("");
  const [activationInput, setActivationInput] = useState("");
  const [closingInput, setClosingInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useAdminPageConfig("Semester");

  useEffect(() => {
    if (!semesterId) return;
    let cancelled = false;
    Promise.all([
      apiGet<AdminSemester>(`/admin/semesters/${semesterId}/`),
      cached("admin:classes", () => apiGetAllPages<AdminClass>("/admin/classes/")),
      cached("admin:sessions", () => apiGetAllPages<AdminSession>("/admin/sessions/")),
      cached("admin:courses", () => apiGetAllPages<AdminCourse>("/admin/courses/")),
      apiGetAllPages<AdminCourseAllocationSummary>(`/admin/allocations/?semester=${semesterId}`),
      apiGetAllPages<AdminEnrollmentSummary>(`/admin/enrollments/?allocation__semester=${semesterId}`),
      apiGetAllPages<AdminTranscript>(`/admin/transcripts/?semester=${semesterId}`),
    ])
      .then(([semRes, classesRes, sessionsRes, coursesRes, allocRes, enrollRes, transcriptRes]) => {
        if (cancelled) return;
        setSemester(semRes);
        setClasses(classesRes);
        setSessions(sessionsRes);
        setCourses(coursesRes);
        setAllocations(allocRes);
        setEnrolledCount(enrollRes.length);
        setUngradedCount(enrollRes.filter((e) => e.result === null).length);
        setHasTranscripts(transcriptRes.length > 0);
        setSessionInput(semRes.session !== null ? String(semRes.session) : "");
        setActivationInput(toLocalInputValue(semRes.activation_deadline));
        setClosingInput(toLocalInputValue(semRes.closing_deadline));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setLoadError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [semesterId, navigate, refreshKey]);

  async function handleSetSession(e: React.FormEvent) {
    e.preventDefault();
    if (!semesterId) return;
    setError(null);
    setFieldErrors({});
    try {
      await apiMutate<AdminSemester>(`/admin/semesters/${semesterId}/`, "PATCH", {
        session: sessionInput ? Number(sessionInput) : null,
      });
      invalidateCache("admin:classes");
      showToast("Session updated.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setError(banner);
      setFieldErrors(fields);
    }
  }

  async function handleSetActivation(e: React.FormEvent) {
    e.preventDefault();
    if (!semesterId) return;
    setError(null);
    setFieldErrors({});
    const iso = new Date(activationInput).toISOString();
    const validationError = validateDeadline(iso);
    if (validationError) {
      setFieldErrors({ activation_deadline: validationError });
      return;
    }
    try {
      await apiMutate<AdminSemester>(`/admin/semesters/${semesterId}/`, "PATCH", { activation_deadline: iso });
      showToast("Activation deadline set. The move to Active happens automatically at that time (semester_activation_task).");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setError(banner);
      setFieldErrors(fields);
    }
  }

  async function handleSetClosing(e: React.FormEvent) {
    e.preventDefault();
    if (!semesterId) return;
    setError(null);
    setFieldErrors({});
    const iso = new Date(closingInput).toISOString();
    const validationError = validateDeadline(iso);
    if (validationError) {
      setFieldErrors({ closing_deadline: validationError });
      return;
    }
    try {
      await apiMutate<AdminSemester>(`/admin/semesters/${semesterId}/`, "PATCH", { closing_deadline: iso });
      showToast("Closing deadline set. The move to Completed happens automatically at that time (semester_closing_task).");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setError(banner);
      setFieldErrors(fields);
    }
  }

  async function handleGenerateTranscripts() {
    if (!semesterId) return;
    setError(null);
    setFieldErrors({});
    try {
      const result = await apiMutate<{ created?: unknown[] }>(`/admin/semesters/${semesterId}/transcripts-create/`, "POST", {
        confirm: true,
      });
      showToast("Transcripts generated.");
      void result;
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (notFound) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Semesters", href: "/admin/semesters" },
            { label: semesterId ?? "Not found" },
          ]}
        />
        <p className={detailStyles.notFound}>Semester {semesterId} was not found.</p>
      </>
    );
  }

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!semester) {
    return <p className={detailStyles.empty}>Loading semester…</p>;
  }

  const matchingClass = classes.find((c) => `${c.program}-${c.batch_year ?? "?"}` === semester.associated_class);
  const semesterDetail = matchingClass?.scheme_of_studies?.find((s) => s.semester_id === semester.semester_id);
  const courseCodes = semesterDetail?.semesterdetails_set.map((d) => d.course).filter((c): c is string => c !== null) ?? [];

  const activationLocked = isActivationDeadlineLocked(semester.activation_deadline);
  const closingLocked = isClosingDeadlineLocked(semester.activation_deadline, semester.status);
  const sessionLocked = activationLocked;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Semesters", href: "/admin/semesters" },
          { label: `${semester.associated_class} · Semester ${semester.semester_no}` },
        ]}
      />

      {error && <div className={formStyles.errorBanner}>{error}</div>}

      <div className={detailStyles.profileCard}>
        <div className={detailStyles.profileMain}>
          <h1 className={detailStyles.name}>
            {semester.associated_class} · Semester {semester.semester_no}
          </h1>
          <p className={detailStyles.subline}>
            Semester #{semester.semester_id} ·{" "}
            {matchingClass ? (
              <Link to={`/admin/classes/${matchingClass.class_id}`} className={detailStyles.back}>
                View class
              </Link>
            ) : (
              semester.associated_class
            )}
          </p>
        </div>
        <Tag tone={SEMESTER_STATUS_TONE[semester.status]}>{semester.status}</Tag>
      </div>

      <Panel title="Term">
        <form className={detailStyles.panelBody} onSubmit={handleSetSession}>
          <div className={formStyles.row}>
            <div className={formStyles.field} data-invalid={fieldErrors.session ? "true" : undefined}>
              <label htmlFor="session">Session</label>
              <Select
                id="session"
                value={sessionInput}
                onChange={setSessionInput}
                disabled={sessionLocked}
                placeholder="Unassigned"
                invalid={Boolean(fieldErrors.session)}
                options={[
                  { value: "", label: "Unassigned" },
                  ...sessions.map((s) => ({ value: String(s.id), label: `${s.period} ${s.year}` })),
                ]}
              />
              {fieldErrors.session && <span className={formStyles.fieldError}>{fieldErrors.session}</span>}
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
            <div className={formStyles.field} data-invalid={fieldErrors.activation_deadline ? "true" : undefined}>
              <label htmlFor="activation_deadline">Activation deadline</label>
              <input
                id="activation_deadline"
                type="datetime-local"
                value={activationInput}
                onChange={(e) => setActivationInput(e.target.value)}
                disabled={activationLocked}
                required
              />
              {fieldErrors.activation_deadline && <span className={formStyles.fieldError}>{fieldErrors.activation_deadline}</span>}
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
            <div className={formStyles.field} data-invalid={fieldErrors.closing_deadline ? "true" : undefined}>
              <label htmlFor="closing_deadline">Closing deadline</label>
              <input
                id="closing_deadline"
                type="datetime-local"
                value={closingInput}
                onChange={(e) => setClosingInput(e.target.value)}
                disabled={closingLocked}
                required
              />
              {fieldErrors.closing_deadline && <span className={formStyles.fieldError}>{fieldErrors.closing_deadline}</span>}
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
              : ungradedCount > 0
                ? `${ungradedCount} of ${enrolledCount} enrollments here still need a result before this can be set.`
                : "All enrollments here already have a result — ready to close."}
          </span>
        </form>
      </Panel>

      {semester.closing_deadline !== null && (
        <Panel title="Transcripts">
          <div className={detailStyles.panelBody}>
            <span className={formStyles.hint}>
              Mirrors POST /api/admin/semesters/{semester.semester_id}/transcripts-create/
              (TranscriptBulkCreateAPIView) — only shown here because closing_deadline is set,
              matching when the real transcript_generation_url actually appears on this resource.
              {hasTranscripts && " Transcripts already exist for at least one student here."}
            </span>
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
          {courseCodes.length === 0 ? (
            <span className={formStyles.hint}>No courses assigned yet.</span>
          ) : (
            <ul>
              {courseCodes.map((code) => {
                const course = courses.find((c) => c.course_code === code);
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
    </>
  );
}
