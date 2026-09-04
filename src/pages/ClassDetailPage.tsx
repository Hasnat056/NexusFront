import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Select } from "../components/ui/Select";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import { apiGet, apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import type { AdminClass, AdminCourse, AdminProgram, AdminSession, SemesterStatus } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";
import styles from "./ClassDetailPage.module.css";

const SEMESTER_STATUS_TONE: Record<SemesterStatus, "warning" | "good" | "critical"> = {
  Inactive: "warning",
  Active: "good",
  Completed: "critical",
};

function classLabel(cls: Pick<AdminClass, "program" | "batch_year">): string {
  return `${cls.program}-${cls.batch_year ?? "?"}`;
}

interface SchemeSemesterEdit {
  semester_id: number;
  semester_no: number;
  status: SemesterStatus;
  session: string;
  courses: string[];
}

function schemeEditFromRecord(record: AdminClass): SchemeSemesterEdit[] {
  return (record.scheme_of_studies ?? []).map((s) => ({
    semester_id: s.semester_id,
    semester_no: s.semester_no,
    status: s.status,
    session: s.session !== null ? String(s.session) : "",
    courses: s.semesterdetails_set.map((d) => d.course).filter((c): c is string => c !== null),
  }));
}

export function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const viewPath = `/admin/classes/${classId}`;
  const editing = location.pathname.endsWith("/edit");
  const [record, setRecord] = useState<AdminClass | null>(null);
  const [programs, setPrograms] = useState<AdminProgram[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formValue, setFormValue] = useState<{ program: string; batch_year: string } | null>(null);
  const [schemeEdits, setSchemeEdits] = useState<SchemeSemesterEdit[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [schemeError, setSchemeError] = useState<string | null>(null);

  useAdminPageConfig(editing ? "Edit class" : "Class");

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    Promise.all([
      apiGet<AdminClass>(`/admin/classes/${classId}/`),
      cached("admin:programs", () => apiGetAllPages<AdminProgram>("/admin/programs/")),
      cached("admin:sessions", () => apiGetAllPages<AdminSession>("/admin/sessions/")),
      cached("admin:courses", () => apiGetAllPages<AdminCourse>("/admin/courses/")),
    ])
      .then(([classRes, programsRes, sessionsRes, coursesRes]) => {
        if (cancelled) return;
        setRecord(classRes);
        setSchemeEdits(schemeEditFromRecord(classRes));
        setPrograms(programsRes);
        setSessions(sessionsRes);
        setCourses(coursesRes);
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
  }, [classId, navigate, refreshKey]);

  useEffect(() => {
    if (editing && record) {
      setFormValue({ program: record.program, batch_year: record.batch_year !== null ? String(record.batch_year) : "" });
      setActionError(null);
      setFieldErrors({});
    }
  }, [editing, record]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue || !classId) return;
    setActionError(null);
    setFieldErrors({});
    try {
      await apiMutate<AdminClass>(`/admin/classes/${classId}/`, "PATCH", {
        program: formValue.program,
        batch_year: formValue.batch_year ? Number(formValue.batch_year) : null,
      });
      invalidateCache("admin:classes");
      navigate(viewPath);
      showToast("Class updated.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setActionError(banner);
      setFieldErrors(fields);
    }
  }

  function setSemesterSession(semesterId: number, session: string) {
    setSchemeEdits((edits) => edits.map((edit) => (edit.semester_id === semesterId ? { ...edit, session } : edit)));
  }

  function addCourseRow(semesterId: number) {
    setSchemeEdits((edits) =>
      edits.map((edit) => (edit.semester_id === semesterId ? { ...edit, courses: [...edit.courses, ""] } : edit)),
    );
  }

  function setCourseRow(semesterId: number, courseIndex: number, courseCode: string) {
    setSchemeEdits((edits) =>
      edits.map((edit) =>
        edit.semester_id === semesterId
          ? { ...edit, courses: edit.courses.map((c, i) => (i === courseIndex ? courseCode : c)) }
          : edit,
      ),
    );
  }

  function removeCourseRow(semesterId: number, courseIndex: number) {
    setSchemeEdits((edits) =>
      edits.map((edit) =>
        edit.semester_id === semesterId ? { ...edit, courses: edit.courses.filter((_, i) => i !== courseIndex) } : edit,
      ),
    );
  }

  async function handleSaveScheme(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) return;
    setActionError(null);
    const cleaned = schemeEdits.map((edit) => ({ ...edit, courses: edit.courses.filter((c) => c !== "") }));
    setSchemeError(null);
    try {
      await apiMutate<AdminClass>(`/admin/classes/${classId}/`, "PATCH", {
        scheme_of_studies: cleaned.map((edit) => ({
          semester_id: edit.semester_id,
          session: edit.session ? Number(edit.session) : null,
          semesterdetails_set: edit.courses.length > 0 ? edit.courses.map((code) => ({ course: code })) : [{ course: null }],
        })),
      });
      invalidateCache("admin:classes");
      showToast("Scheme of studies updated.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSchemeError(apiErrorMessage(err));
    }
  }

  if (notFound) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Classes", href: "/admin/classes" },
            { label: classId ?? "Not found" },
          ]}
        />
        <p className={detailStyles.notFound}>Class {classId} was not found.</p>
      </>
    );
  }

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!record) {
    return <p className={detailStyles.empty}>Loading class…</p>;
  }

  function sessionLabel(sessionId: number): string {
    const session = sessions.find((s) => s.id === sessionId);
    return session ? `${session.period} ${session.year}` : `#${sessionId}`;
  }

  return (
    <>
      <Breadcrumbs
        items={
          editing
            ? [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Classes", href: "/admin/classes" },
                { label: classLabel(record), href: viewPath },
                { label: "Edit" },
              ]
            : [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Classes", href: "/admin/classes" },
                { label: classLabel(record) },
              ]
        }
      />

      {actionError && <div className={formStyles.errorBanner}>{actionError}</div>}

      {editing && formValue ? (
        <form className={detailStyles.editCard} onSubmit={handleSave}>
          <h3 className={formStyles.sectionTitle}>Class</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field} data-invalid={fieldErrors.program ? "true" : undefined}>
              <label htmlFor="program">Program</label>
              <Select
                id="program"
                value={formValue.program}
                onChange={(next) => setFormValue({ ...formValue, program: next })}
                placeholder="Select a program…"
                invalid={Boolean(fieldErrors.program)}
                options={programs.map((p) => ({
                  value: p.program_id,
                  label: `${p.program_id} — ${p.program_name}`,
                }))}
              />
              {fieldErrors.program && <span className={formStyles.fieldError}>{fieldErrors.program}</span>}
            </div>
            <div className={formStyles.field} data-invalid={fieldErrors.batch_year ? "true" : undefined}>
              <label htmlFor="batch_year">Batch year</label>
              <input
                id="batch_year"
                inputMode="numeric"
                value={formValue.batch_year}
                onChange={(e) => setFormValue({ ...formValue, batch_year: e.target.value })}
                required
              />
              {fieldErrors.batch_year && <span className={formStyles.fieldError}>{fieldErrors.batch_year}</span>}
            </div>
          </div>
          <span className={formStyles.hint}>
            No lock rules here — ClassSerializer has no read_only fields at all, program and batch
            year stay editable for the life of the class.
          </span>
          <div className={formStyles.actions}>
            <button type="submit" className={formStyles.primaryButton}>
              Save changes
            </button>
            <button type="button" className={formStyles.secondaryButton} onClick={() => navigate(viewPath)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className={detailStyles.profileCard}>
          <div className={detailStyles.profileMain}>
            <h1 className={detailStyles.name}>{classLabel(record)}</h1>
            <p className={detailStyles.subline}>
              Class #{record.class_id} · {record.program}
            </p>
          </div>
          <div className={formStyles.actions}>
            <Link to={`${viewPath}/edit`} className={formStyles.secondaryButton}>
              Edit
            </Link>
          </div>
        </div>
      )}

      {!editing && (
        <Panel title="Scheme of studies">
          <form className={detailStyles.panelBody} onSubmit={handleSaveScheme}>
            {schemeError && <div className={formStyles.errorBanner}>{schemeError}</div>}

            {schemeEdits.map((edit) => (
              <div className={formStyles.qualRow} key={edit.semester_id}>
                <div className={formStyles.qualRowFooter}>
                  <strong>Semester {edit.semester_no}</strong>
                  <Tag tone={SEMESTER_STATUS_TONE[edit.status]}>{edit.status}</Tag>
                </div>
                <div className={formStyles.row}>
                  <div className={formStyles.field}>
                    <label htmlFor={`session_${edit.semester_id}`}>Session</label>
                    <Select
                      id={`session_${edit.semester_id}`}
                      value={edit.session}
                      onChange={(next) => setSemesterSession(edit.semester_id, next)}
                      placeholder="Unassigned"
                      options={[
                        { value: "", label: "Unassigned" },
                        ...sessions.map((s) => ({ value: String(s.id), label: sessionLabel(s.id) })),
                      ]}
                    />
                  </div>
                </div>

                {edit.courses.length > 0 && (
                  <>
                    <label>Courses</label>
                    <div className={styles.courseGrid}>
                      {edit.courses.map((code, courseIndex) => (
                        <div className={styles.courseItem} key={courseIndex}>
                          <Select
                            ariaLabel={`Course ${courseIndex + 1} for semester ${edit.semester_no}`}
                            value={code}
                            onChange={(next) => setCourseRow(edit.semester_id, courseIndex, next)}
                            placeholder="Select a course…"
                            searchPlaceholder="Search courses…"
                            noResultsLabel={(query) => `No courses found for "${query}"`}
                            options={courses.map((c) => ({
                              value: c.course_code,
                              label: c.course_code,
                              sublabel: c.course_name,
                              triggerLabel: `${c.course_code} — ${c.course_name}`,
                            }))}
                          />
                          <button
                            type="button"
                            className={formStyles.linkButton}
                            onClick={() => removeCourseRow(edit.semester_id, courseIndex)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <button type="button" className={formStyles.linkButton} onClick={() => addCourseRow(edit.semester_id)}>
                  + Add course
                </button>
              </div>
            ))}

            <div className={formStyles.actions}>
              <button type="submit" className={formStyles.primaryButton}>
                Save scheme
              </button>
            </div>
          </form>
        </Panel>
      )}
    </>
  );
}
