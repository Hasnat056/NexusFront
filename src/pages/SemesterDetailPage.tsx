import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { CourseCard } from "../components/ui/CourseCard";
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
import styles from "./SemesterDetailPage.module.css";

const SEMESTER_STATUS_TONE: Record<SemesterStatus, StatusTone> = {
  Inactive: "warning",
  Active: "good",
  Completed: "critical",
};
const ALLOCATION_STATUS_TONE: Record<CourseAllocationStatus, StatusTone> = {
  Active: "good",
  Locked: "warning",
  Completed: "good",
  Inactive: "warning",
  Cancelled: "critical",
};

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

  // Activation and closing no longer live on the semester itself — they're set once on the
  // session and cascade down to every semester bound to it. A semester's own `session` field stays
  // writable only while it's still Inactive.
  const boundSession = sessions.find((s) => s.id === semester.session);
  const sessionLocked = semester.status !== "Inactive";

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
            {sessionLocked ? (
              "Locked. A semester's session is fixed once it's no longer Inactive."
            ) : (
              "Also editable from the class's own scheme of studies, same underlying field."
            )}
          </span>
        </form>
      </Panel>

      {Boolean(boundSession?.closing_deadline) && (
        <Panel title="Transcripts">
          <div className={detailStyles.panelBody}>
            {ungradedCount > 0 ? (
              <span className={formStyles.hint}>
                {ungradedCount} of {enrolledCount} enrollments here still need a result.
              </span>
            ) : (
              hasTranscripts && (
                <span className={formStyles.hint}>Transcripts already exist for at least one student here.</span>
              )
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

      <Panel title="Courses list" hint="Read-only here, edit from the class page">
        <div className={detailStyles.panelBody}>
          {courseCodes.length === 0 ? (
            <span className={formStyles.hint}>No courses assigned yet.</span>
          ) : (
            <div className={styles.courseGrid}>
              {courseCodes.map((code) => {
                const course = courses.find((c) => c.course_code === code);
                const meta: string[] = [];
                if (course?.lab) meta.push("Lab");
                if (course?.pre_requisite) meta.push(`Pre-req: ${course.pre_requisite}`);
                return (
                  <CourseCard
                    key={code}
                    id={code}
                    kicker={code}
                    title={course?.course_name ?? "—"}
                    status={{ label: course ? `${course.credit_hours} cr` : "—", tone: "good" }}
                    meta={meta}
                    href={`/admin/courses/${code}`}
                  />
                );
              })}
            </div>
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
                    {a.course} · {a.faculty}
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
