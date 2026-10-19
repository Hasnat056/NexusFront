import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Select } from "../components/ui/Select";
import { apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiFormErrors } from "../lib/api";
import type { AdminCourse } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonCreatePage.module.css";

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

export function CourseCreatePage() {
  const navigate = useNavigate();
  useAdminPageConfig("New course");
  const [existingCourses, setExistingCourses] = useState<AdminCourse[]>([]);
  const [value, setValue] = useState<CourseFormValue>({
    course_code: "",
    course_name: "",
    credit_hours: "3",
    lab: false,
    pre_requisite: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cached("admin:courses", () => apiGetAllPages<AdminCourse>("/admin/courses/"))
      .then(setExistingCourses)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
        }
      });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const creditHoursError = validateCreditHours(Number(value.credit_hours));
    if (creditHoursError) {
      setError(creditHoursError);
      return;
    }
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const record = await apiMutate<AdminCourse>("/admin/courses/", "POST", {
        course_code: value.course_code,
        course_name: value.course_name,
        credit_hours: Number(value.credit_hours) || 0,
        lab: value.lab,
        pre_requisite: value.pre_requisite || null,
        description: value.description || null,
      });
      invalidateCache("admin:courses");
      navigate(`/admin/courses/${record.course_code}`);
    } catch (err) {
      const { banner, fields } = apiFormErrors(err);
      setError(banner);
      setFieldErrors(fields);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Courses", href: "/admin/courses" },
          { label: "New course" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New course</h1>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        <div className={formStyles.row}>
          <div className={formStyles.field} data-invalid={fieldErrors.course_code ? "true" : undefined}>
            <label htmlFor="course_code">Course code</label>
            <input
              id="course_code"
              value={value.course_code}
              onChange={(e) => setValue({ ...value, course_code: e.target.value })}
              placeholder="CS-1101"
              required
            />
            {fieldErrors.course_code && <span className={formStyles.fieldError}>{fieldErrors.course_code}</span>}
          </div>
          <div className={formStyles.field} data-invalid={fieldErrors.course_name ? "true" : undefined}>
            <label htmlFor="course_name">Course name</label>
            <input
              id="course_name"
              value={value.course_name}
              onChange={(e) => setValue({ ...value, course_name: e.target.value })}
              required
            />
            {fieldErrors.course_name && <span className={formStyles.fieldError}>{fieldErrors.course_name}</span>}
          </div>
          <div className={formStyles.field} data-invalid={fieldErrors.pre_requisite ? "true" : undefined}>
            <label htmlFor="pre_requisite">Prerequisite</label>
            <Select
              id="pre_requisite"
              value={value.pre_requisite}
              onChange={(next) => setValue({ ...value, pre_requisite: next })}
              placeholder="None"
              invalid={Boolean(fieldErrors.pre_requisite)}
              options={[
                { value: "", label: "None" },
                ...existingCourses.map((c) => ({ value: c.course_code, label: `${c.course_code} · ${c.course_name}` })),
              ]}
            />
            {fieldErrors.pre_requisite && <span className={formStyles.fieldError}>{fieldErrors.pre_requisite}</span>}
          </div>
        </div>

        <div className={formStyles.row}>
          <div className={formStyles.field} data-invalid={fieldErrors.credit_hours ? "true" : undefined}>
            <label htmlFor="credit_hours">Lecture credit hours</label>
            <input
              id="credit_hours"
              inputMode="numeric"
              value={value.credit_hours}
              onChange={(e) => setValue({ ...value, credit_hours: e.target.value })}
            />
            <span className={formStyles.hint}>
              If this course has a lab, 1 credit hour is added automatically on save. Enter the
              lecture portion only.
            </span>
            {fieldErrors.credit_hours && <span className={formStyles.fieldError}>{fieldErrors.credit_hours}</span>}
          </div>
          <div className={formStyles.field} data-invalid={fieldErrors.lab ? "true" : undefined}>
            <label className={formStyles.checkboxField}>
              <input
                type="checkbox"
                checked={value.lab}
                onChange={(e) => setValue({ ...value, lab: e.target.checked })}
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
              value={value.description}
              onChange={(e) => setValue({ ...value, description: e.target.value })}
            />
            {fieldErrors.description && <span className={formStyles.fieldError}>{fieldErrors.description}</span>}
          </div>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primaryButton} disabled={submitting}>
            {submitting ? "Creating…" : "Create course"}
          </button>
          <Link to="/admin/courses" className={formStyles.secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
