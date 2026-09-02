import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import { apiGet, apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import type { AdminCourse } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

interface CourseFormValue {
  course_code: string;
  course_name: string;
  credit_hours: string;
  lab: boolean;
  pre_requisite: string;
  description: string;
}

function validateCreditHours(value: number): string | null {
  if (value < 0) return "Credit hours cannot be negative.";
  if (value > 5) return "Credit hours cannot be greater than 5.";
  return null;
}

function formValueFromRecord(record: AdminCourse): CourseFormValue {
  return {
    course_code: record.course_code,
    course_name: record.course_name,
    credit_hours: String(record.credit_hours),
    lab: record.lab,
    pre_requisite: record.pre_requisite ?? "",
    description: record.description ?? "",
  };
}

export function CourseDetailPage() {
  const { courseCode } = useParams<{ courseCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const viewPath = `/admin/courses/${courseCode}`;
  const editing = location.pathname.endsWith("/edit");
  const [record, setRecord] = useState<AdminCourse | null>(null);
  const [otherCourses, setOtherCourses] = useState<AdminCourse[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formValue, setFormValue] = useState<CourseFormValue | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useAdminPageConfig(editing ? "Edit course" : "Course");

  useEffect(() => {
    if (!courseCode) return;
    let cancelled = false;
    Promise.all([
      apiGet<AdminCourse>(`/admin/courses/${courseCode}/`),
      cached("admin:courses", () => apiGetAllPages<AdminCourse>("/admin/courses/")),
    ])
      .then(([courseRes, allCourses]) => {
        if (cancelled) return;
        setRecord(courseRes);
        setOtherCourses(allCourses.filter((c) => c.course_code !== courseCode));
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
  }, [courseCode, navigate, refreshKey]);

  useEffect(() => {
    if (editing && record) {
      setFormValue(formValueFromRecord(record));
      setActionError(null);
      setFieldErrors({});
    }
  }, [editing, record]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue || !courseCode) return;
    const creditHoursError = validateCreditHours(Number(formValue.credit_hours));
    if (creditHoursError) {
      setActionError(creditHoursError);
      return;
    }
    setActionError(null);
    setFieldErrors({});
    try {
      await apiMutate<AdminCourse>(`/admin/courses/${courseCode}/`, "PATCH", {
        course_name: formValue.course_name,
        credit_hours: Number(formValue.credit_hours) || 0,
        lab: formValue.lab,
        pre_requisite: formValue.pre_requisite || null,
        description: formValue.description || null,
      });
      invalidateCache("admin:courses");
      navigate(viewPath);
      showToast("Course updated.");
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
    if (!courseCode) return;
    setActionError(null);
    try {
      await apiMutate(`/admin/courses/${courseCode}/`, "DELETE");
      invalidateCache("admin:courses");
      navigate("/admin/courses");
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
            { label: "Courses", href: "/admin/courses" },
            { label: courseCode ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Course {courseCode} was not found.</p>
      </>
    );
  }

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!record) {
    return <p className={styles.empty}>Loading course…</p>;
  }

  return (
    <>
      <Breadcrumbs
        items={
          editing
            ? [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Courses", href: "/admin/courses" },
                { label: record.course_name, href: viewPath },
                { label: "Edit" },
              ]
            : [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Courses", href: "/admin/courses" },
                { label: record.course_name },
              ]
        }
      />

      {actionError && <div className={formStyles.errorBanner}>{actionError}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <h3 className={formStyles.sectionTitle}>Course</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="course_code">Course code</label>
              <input id="course_code" value={formValue.course_code} readOnly />
            </div>
            <div className={formStyles.field} data-invalid={fieldErrors.course_name ? "true" : undefined}>
              <label htmlFor="course_name">Course name</label>
              <input
                id="course_name"
                value={formValue.course_name}
                onChange={(e) => setFormValue({ ...formValue, course_name: e.target.value })}
                required
              />
              {fieldErrors.course_name && <span className={formStyles.fieldError}>{fieldErrors.course_name}</span>}
            </div>
            <div className={formStyles.field} data-invalid={fieldErrors.pre_requisite ? "true" : undefined}>
              <label htmlFor="pre_requisite">Prerequisite</label>
              <select
                id="pre_requisite"
                value={formValue.pre_requisite}
                onChange={(e) => setFormValue({ ...formValue, pre_requisite: e.target.value })}
              >
                <option value="">None</option>
                {otherCourses.map((c) => (
                  <option key={c.course_code} value={c.course_code}>
                    {c.course_code} — {c.course_name}
                  </option>
                ))}
              </select>
              {fieldErrors.pre_requisite && <span className={formStyles.fieldError}>{fieldErrors.pre_requisite}</span>}
            </div>
          </div>
          <div className={formStyles.row}>
            <div className={formStyles.field} data-invalid={fieldErrors.credit_hours ? "true" : undefined}>
              <label htmlFor="credit_hours">Lecture credit hours</label>
              <input
                id="credit_hours"
                inputMode="numeric"
                value={formValue.credit_hours}
                onChange={(e) => setFormValue({ ...formValue, credit_hours: e.target.value })}
              />
              <span className={formStyles.hint}>
                Toggling the lab checkbox adjusts the stored credit hours by ±1 on save.
              </span>
              {fieldErrors.credit_hours && <span className={formStyles.fieldError}>{fieldErrors.credit_hours}</span>}
            </div>
            <div className={formStyles.field} data-invalid={fieldErrors.lab ? "true" : undefined}>
              <label className={formStyles.checkboxField}>
                <input
                  type="checkbox"
                  checked={formValue.lab}
                  onChange={(e) => setFormValue({ ...formValue, lab: e.target.checked })}
                />
                Has a lab component
              </label>
              {fieldErrors.lab && <span className={formStyles.fieldError}>{fieldErrors.lab}</span>}
            </div>
          </div>
          <div className={formStyles.row}>
            <div className={formStyles.field} data-invalid={fieldErrors.description ? "true" : undefined}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows={3}
                value={formValue.description}
                onChange={(e) => setFormValue({ ...formValue, description: e.target.value })}
              />
              {fieldErrors.description && <span className={formStyles.fieldError}>{fieldErrors.description}</span>}
            </div>
          </div>

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
            <h1 className={styles.name}>{record.course_name}</h1>
            <p className={styles.subline}>
              {record.course_code} · {record.credit_hours} credit hours
              {record.lab && " · Lab"}
            </p>
            {record.pre_requisite && <p className={styles.subline}>Requires {record.pre_requisite}</p>}
          </div>
          <div className={formStyles.actions}>
            {record.lab && <Tag tone="good">Lab</Tag>}
            <Link to={`${viewPath}/edit`} className={formStyles.secondaryButton}>
              Edit
            </Link>
            <button type="button" className={formStyles.dangerButton} onClick={handleDelete}>
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

      {!editing && (
        <Panel title="Description">
          <p className={styles.empty}>{record.description ?? "No description on file."}</p>
        </Panel>
      )}
    </>
  );
}
