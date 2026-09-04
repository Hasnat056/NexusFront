import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Select } from "../components/ui/Select";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import { apiGet, apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import { eligibleSemestersForAllocation, semesterChoice } from "../lib/allocationEligibility";
import type {
  AdminClass,
  AdminCourseAllocationSummary,
  AdminFacultyListItem,
  AdminSemester,
  AdminSession,
  CourseAllocationStatus,
} from "../types/api";
import type { StatusTone } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const ALLOCATION_STATUS_TONE: Record<CourseAllocationStatus, StatusTone> = {
  Inactive: "warning",
  Ongoing: "good",
  Completed: "critical",
  Cancelled: "critical",
};

export function AllocationDetailPage() {
  const { allocationId } = useParams<{ allocationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const viewPath = `/admin/allocations/${allocationId}`;
  const editing = location.pathname.endsWith("/edit");
  const [record, setRecord] = useState<AdminCourseAllocationSummary | null>(null);
  const [faculty, setFaculty] = useState<AdminFacultyListItem[]>([]);
  const [semesters, setSemesters] = useState<AdminSemester[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formValue, setFormValue] = useState<{ faculty: string; course: string; semester: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useAdminPageConfig(editing ? "Edit allocation" : "Allocation");

  useEffect(() => {
    if (!allocationId) return;
    let cancelled = false;
    Promise.all([
      apiGet<AdminCourseAllocationSummary>(`/admin/allocations/${allocationId}/`),
      cached("admin:all-faculty", () => apiGetAllPages<AdminFacultyListItem>("/admin/faculty/")),
      apiGetAllPages<AdminSemester>("/admin/semesters/"),
      cached("admin:sessions", () => apiGetAllPages<AdminSession>("/admin/sessions/")),
      cached("admin:classes", () => apiGetAllPages<AdminClass>("/admin/classes/")),
    ])
      .then(([recordRes, facultyRes, semestersRes, sessionsRes, classesRes]) => {
        if (cancelled) return;
        setRecord(recordRes);
        setFaculty(facultyRes);
        setSemesters(semestersRes);
        setSessions(sessionsRes);
        setClasses(classesRes);
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
  }, [allocationId, navigate, refreshKey]);

  const eligibleSemesters = useMemo(() => eligibleSemestersForAllocation(semesters, sessions, classes), [semesters, sessions, classes]);
  const currentChoice = record ? semesterChoice(record.semester, semesters, classes) : undefined;
  const semesterChoices =
    currentChoice && !eligibleSemesters.some((s) => s.semesterId === currentChoice.semesterId)
      ? [currentChoice, ...eligibleSemesters]
      : eligibleSemesters;
  const selectedSemester = formValue ? semesterChoice(Number(formValue.semester), semesters, classes) : undefined;

  useEffect(() => {
    if (editing && record) {
      setFormValue({ faculty: record.faculty, course: record.course, semester: String(record.semester) });
      setActionError(null);
      setFieldErrors({});
    }
  }, [editing, record]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue || !allocationId) return;
    setActionError(null);
    setFieldErrors({});
    try {
      await apiMutate<AdminCourseAllocationSummary>(`/admin/allocations/${allocationId}/`, "PATCH", {
        faculty: formValue.faculty,
        course: formValue.course,
        semester: Number(formValue.semester),
      });
      invalidateCache("admin:allocations");
      navigate(viewPath);
      showToast("Allocation updated.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setActionError(banner);
      setFieldErrors(fields);
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    if (!allocationId) return;
    setActionError(null);
    try {
      await apiMutate(`/admin/allocations/${allocationId}/`, "DELETE");
      invalidateCache("admin:allocations");
      navigate("/admin/allocations");
    } catch (err) {
      setActionError(apiErrorMessage(err));
      setConfirmingDelete(false);
    }
  }

  if (notFound) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Allocations", href: "/admin/allocations" },
            { label: allocationId ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Allocation {allocationId} was not found.</p>
      </>
    );
  }

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!record) {
    return <p className={styles.empty}>Loading allocation…</p>;
  }

  const editable = record.status === "Inactive";

  return (
    <>
      <Breadcrumbs
        items={
          editing
            ? [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Allocations", href: "/admin/allocations" },
                { label: record.course, href: viewPath },
                { label: "Edit" },
              ]
            : [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Allocations", href: "/admin/allocations" },
                { label: record.course },
              ]
        }
      />

      {actionError && <div className={formStyles.errorBanner}>{actionError}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <h3 className={formStyles.sectionTitle}>Allocation</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field} data-invalid={fieldErrors.faculty ? "true" : undefined}>
              <label htmlFor="faculty">Faculty</label>
              <Select
                id="faculty"
                value={formValue.faculty}
                onChange={(next) => setFormValue({ ...formValue, faculty: next })}
                placeholder="Select faculty…"
                invalid={Boolean(fieldErrors.faculty)}
                options={faculty.map((f) => ({
                  value: f.person.person_id,
                  label: `${f.person.person_id} — ${f.person.first_name} ${f.person.last_name}`,
                }))}
              />
              {fieldErrors.faculty && <span className={formStyles.fieldError}>{fieldErrors.faculty}</span>}
            </div>
            <div className={formStyles.field} data-invalid={fieldErrors.semester ? "true" : undefined}>
              <label htmlFor="semester">Semester</label>
              <Select
                id="semester"
                value={formValue.semester}
                onChange={(next) => setFormValue({ ...formValue, semester: next, course: "" })}
                placeholder="Select semester…"
                invalid={Boolean(fieldErrors.semester)}
                options={semesterChoices.map((s) => ({ value: String(s.semesterId), label: s.label }))}
              />
              {fieldErrors.semester && <span className={formStyles.fieldError}>{fieldErrors.semester}</span>}
            </div>
            <div className={formStyles.field} data-invalid={fieldErrors.course ? "true" : undefined}>
              <label htmlFor="course">Course</label>
              <Select
                id="course"
                value={formValue.course}
                onChange={(next) => setFormValue({ ...formValue, course: next })}
                placeholder="Select course…"
                invalid={Boolean(fieldErrors.course)}
                options={(selectedSemester?.courseCodes ?? []).map((code) => ({ value: code, label: code }))}
              />
              {fieldErrors.course && <span className={formStyles.fieldError}>{fieldErrors.course}</span>}
            </div>
          </div>
          <span className={formStyles.hint}>
            Session and status aren't editable here — session is a copy taken from the semester at
            creation time, and status only ever moves outside this endpoint.
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
        <div className={styles.profileCard}>
          <div className={styles.profileMain}>
            <h1 className={styles.name}>
              {record.course} — {record.faculty}
            </h1>
            <p className={styles.subline}>
              Allocation #{record.allocation_id} · {currentChoice ? currentChoice.label : `Semester #${record.semester}`} ·{" "}
              {record.session}
            </p>
          </div>
          <div className={formStyles.actions}>
            <Tag tone={ALLOCATION_STATUS_TONE[record.status]}>{record.status}</Tag>
            {editable ? (
              <Link to={`${viewPath}/edit`} className={formStyles.secondaryButton}>
                Edit
              </Link>
            ) : (
              <button type="button" className={formStyles.secondaryButton} disabled>
                Edit
              </button>
            )}
            <button type="button" className={formStyles.dangerButton} onClick={handleDelete} disabled={!editable}>
              {confirmingDelete ? "Confirm delete" : "Delete"}
            </button>
            {confirmingDelete && (
              <button type="button" className={formStyles.secondaryButton} onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {!editing && !editable && (
        <p className={formStyles.hint}>
          Locked — AdminCourseAllocationPermissions only allows editing or deleting an allocation
          while its status is "Inactive"; once it moves to Ongoing, Completed, or Cancelled it's
          read-only for Admin.
        </p>
      )}
    </>
  );
}
