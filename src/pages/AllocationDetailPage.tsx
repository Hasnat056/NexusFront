import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Select } from "../components/ui/Select";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import { apiGet, apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import { semesterChoice } from "../lib/allocationEligibility";
import type {
  AdminClass,
  AdminCourseAllocationSummary,
  AdminFacultyListItem,
  AdminSemester,
  CourseAllocationStatus,
} from "../types/api";
import type { StatusTone } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const ALLOCATION_STATUS_TONE: Record<CourseAllocationStatus, StatusTone> = {
  Inactive: "warning",
  Active: "good",
  Locked: "warning",
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
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formValue, setFormValue] = useState<{ faculty: string } | null>(null);
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
      cached("admin:classes", () => apiGetAllPages<AdminClass>("/admin/classes/")),
    ])
      .then(([recordRes, facultyRes, semestersRes, classesRes]) => {
        if (cancelled) return;
        setRecord(recordRes);
        setFaculty(facultyRes);
        setSemesters(semestersRes);
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

  const currentChoice = record ? semesterChoice(record.semester, semesters, classes) : undefined;

  useEffect(() => {
    if (editing && record) {
      setFormValue({ faculty: record.faculty });
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
      // Course and semester come from the scheme of studies and are always read-only for Admin on
      // an existing allocation — only faculty can be reassigned here.
      await apiMutate<AdminCourseAllocationSummary>(`/admin/allocations/${allocationId}/`, "PATCH", {
        faculty: formValue.faculty,
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

  const editable = record.status === "Inactive" || record.status === "Locked";

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
                  label: `${f.person.person_id} · ${f.person.first_name} ${f.person.last_name}`,
                }))}
              />
              {fieldErrors.faculty && <span className={formStyles.fieldError}>{fieldErrors.faculty}</span>}
            </div>
          </div>
          <span className={formStyles.hint}>
            Course and semester come from the scheme of studies and aren't editable here — only the
            teacher can be reassigned. Session and status aren't editable either: session is a copy
            taken from the semester at creation time, and status only ever moves outside this
            endpoint.
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
              {record.course} · {record.faculty}
            </h1>
            <p className={styles.subline}>
              Allocation #{record.allocation_id} · {currentChoice ? currentChoice.label : `Semester #${record.semester}`} ·{" "}
              {record.session} · Passing threshold {record.passing_threshold}%
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
          Reassigning or deleting is only allowed while status is "Inactive" or "Locked". Once it
          moves to Active or Completed it's read-only for Admin; Cancelled is always read-only.
        </p>
      )}
    </>
  );
}
