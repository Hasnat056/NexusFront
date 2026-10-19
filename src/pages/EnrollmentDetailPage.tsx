import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Select } from "../components/ui/Select";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import { apiGet, apiMutate, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import type { AdminCourseAllocationSummary, AdminEnrollmentSummary, EnrollmentStatus } from "../types/api";
import type { StatusTone } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

// Locked is a lifecycle-driven state (set alongside the allocation when the session's
// closing_deadline is reached), not something Admin sets by hand — left out of the manually
// selectable options here, same as Completed already effectively is once the object itself is
// Locked/Completed (AdminEnrollmentPermissions.has_object_permission narrows those to GET-only).
const STATUS_OPTIONS: EnrollmentStatus[] = ["Inactive", "Active", "Completed", "Dropped"];
const ENROLLMENT_STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  Inactive: "warning",
  Active: "good",
  Locked: "warning",
  Completed: "critical",
  Dropped: "critical",
};

export function EnrollmentDetailPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const viewPath = `/admin/enrollments/${enrollmentId}`;
  const editing = location.pathname.endsWith("/edit");
  useAdminPageConfig(editing ? "Edit enrollment" : "Enrollment");
  const [record, setRecord] = useState<AdminEnrollmentSummary | null>(null);
  const [allocation, setAllocation] = useState<AdminCourseAllocationSummary | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [status, setStatus] = useState<EnrollmentStatus>("Inactive");
  const [actionError, setActionError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!enrollmentId) return;
    let cancelled = false;
    apiGet<AdminEnrollmentSummary>(`/admin/enrollments/${enrollmentId}/`)
      .then((recordRes) => {
        if (cancelled) return;
        setRecord(recordRes);
        return apiGet<AdminCourseAllocationSummary>(`/admin/allocations/${recordRes.allocation}/`).then((allocationRes) => {
          if (!cancelled) setAllocation(allocationRes);
        });
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
  }, [enrollmentId, navigate, refreshKey]);

  useEffect(() => {
    if (editing && record) {
      setStatus(record.status);
      setActionError(null);
      setFieldErrors({});
    }
  }, [editing, record]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollmentId) return;
    setActionError(null);
    setFieldErrors({});
    try {
      await apiMutate<AdminEnrollmentSummary>(`/admin/enrollments/${enrollmentId}/`, "PATCH", { status });
      invalidateCache("admin:enrollments");
      navigate(viewPath);
      showToast("Enrollment updated.");
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
    if (!enrollmentId) return;
    setActionError(null);
    try {
      await apiMutate(`/admin/enrollments/${enrollmentId}/`, "DELETE");
      invalidateCache("admin:enrollments");
      navigate("/admin/enrollments");
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
            { label: "Enrollments", href: "/admin/enrollments" },
            { label: enrollmentId ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Enrollment {enrollmentId} was not found.</p>
      </>
    );
  }

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!record) {
    return <p className={styles.empty}>Loading enrollment…</p>;
  }

  const locked = record.status === "Locked" || record.status === "Completed";
  const deletable = !locked && !record.result?.course_gpa;

  return (
    <>
      <Breadcrumbs
        items={
          editing
            ? [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Enrollments", href: "/admin/enrollments" },
                { label: `#${record.enrollment_id}`, href: viewPath },
                { label: "Edit" },
              ]
            : [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Enrollments", href: "/admin/enrollments" },
                { label: `#${record.enrollment_id}` },
              ]
        }
      />

      {actionError && <div className={formStyles.errorBanner}>{actionError}</div>}

      {editing ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <h3 className={formStyles.sectionTitle}>Enrollment</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field} data-invalid={fieldErrors.status ? "true" : undefined}>
              <label htmlFor="status">Status</label>
              <Select
                id="status"
                value={status}
                onChange={(next) => setStatus(next as EnrollmentStatus)}
                placeholder="Select status…"
                invalid={Boolean(fieldErrors.status)}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
              {fieldErrors.status && <span className={formStyles.fieldError}>{fieldErrors.status}</span>}
            </div>
          </div>
          <span className={formStyles.hint}>
            Student and allocation aren't editable after creation. Only status moves here.
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
            <h1 className={styles.name}>{record.student_info?.student_name ?? record.student}</h1>
            <p className={styles.subline}>
              Enrollment #{record.enrollment_id} · {allocation ? `${allocation.course} · ${allocation.faculty}` : `Allocation #${record.allocation}`}{" "}
              · Enrolled {record.enrollment_date}
            </p>
          </div>
          <div className={formStyles.actions}>
            <Tag tone={ENROLLMENT_STATUS_TONE[record.status]}>{record.status}</Tag>
            {locked ? (
              <button type="button" className={formStyles.secondaryButton} disabled>
                Edit
              </button>
            ) : (
              <Link to={`${viewPath}/edit`} className={formStyles.secondaryButton}>
                Edit
              </Link>
            )}
            <button type="button" className={formStyles.dangerButton} onClick={handleDelete} disabled={!deletable}>
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

      {record.result && (
        <div className={styles.profileCard}>
          <h3 className={formStyles.sectionTitle}>Result</h3>
          <p className={styles.subline}>
            Obtained marks {record.result.obtained_marks ?? "—"} · Course GPA {record.result.course_gpa ?? "—"}
          </p>
        </div>
      )}

      {!editing && locked && (
        <p className={formStyles.hint}>
          Read-only. Marks and edits freeze once an enrollment is Locked or Completed.
        </p>
      )}
      {!editing && !locked && !deletable && (
        <p className={formStyles.hint}>Deletion is blocked once this enrollment's result has a course GPA set.</p>
      )}
    </>
  );
}
