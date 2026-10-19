import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Select } from "../components/ui/Select";
import { apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiFormErrors } from "../lib/api";
import type { AdminCourseAllocationSummary, AdminEnrollmentSummary, AdminStudentListItem } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonCreatePage.module.css";

export function EnrollmentCreatePage() {
  const navigate = useNavigate();
  useAdminPageConfig("New enrollment");
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [allocations, setAllocations] = useState<AdminCourseAllocationSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState({ student: "", allocation: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cached("admin:all-students", () => apiGetAllPages<AdminStudentListItem>("/admin/students/")),
      apiGetAllPages<AdminCourseAllocationSummary>("/admin/allocations/?status=Active"),
    ])
      .then(([studentsRes, allocationsRes]) => {
        if (cancelled) return;
        setStudents(studentsRes);
        setAllocations(allocationsRes);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const record = await apiMutate<AdminEnrollmentSummary>("/admin/enrollments/", "POST", {
        student: value.student,
        allocation: Number(value.allocation),
      });
      invalidateCache("admin:enrollments");
      navigate(`/admin/enrollments/${record.enrollment_id}`);
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
          { label: "Enrollments", href: "/admin/enrollments" },
          { label: "New enrollment" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New enrollment</h1>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        {!loaded ? (
          <p className={formStyles.hint}>Loading…</p>
        ) : allocations.length === 0 ? (
          <p className={formStyles.hint}>
            No allocation is currently "Active". An allocation needs to move past "Inactive"
            before a student can enroll in it.
          </p>
        ) : (
          <>
            <div className={formStyles.row}>
              <div className={formStyles.field} data-invalid={fieldErrors.student ? "true" : undefined}>
                <label htmlFor="student">Student</label>
                <Select
                  id="student"
                  value={value.student}
                  onChange={(next) => setValue({ ...value, student: next })}
                  placeholder="Select student…"
                  invalid={Boolean(fieldErrors.student)}
                  options={students.map((s) => ({
                    value: s.person.person_id,
                    label: `${s.person.person_id} · ${s.person.first_name} ${s.person.last_name}`,
                  }))}
                />
                {fieldErrors.student && <span className={formStyles.fieldError}>{fieldErrors.student}</span>}
              </div>
              <div className={formStyles.field} data-invalid={fieldErrors.allocation ? "true" : undefined}>
                <label htmlFor="allocation">Allocation</label>
                <Select
                  id="allocation"
                  value={value.allocation}
                  onChange={(next) => setValue({ ...value, allocation: next })}
                  placeholder="Select allocation…"
                  invalid={Boolean(fieldErrors.allocation)}
                  options={allocations.map((a) => ({
                    value: String(a.allocation_id),
                    label: `${a.course} · ${a.faculty} · Semester #${a.semester} · ${a.session}`,
                  }))}
                />
                {fieldErrors.allocation && <span className={formStyles.fieldError}>{fieldErrors.allocation}</span>}
              </div>
            </div>

            <div className={formStyles.actions}>
              <button type="submit" className={formStyles.primaryButton} disabled={submitting}>
                {submitting ? "Creating…" : "Create enrollment"}
              </button>
              <Link to="/admin/enrollments" className={formStyles.secondaryButton}>
                Cancel
              </Link>
            </div>
          </>
        )}
      </form>
    </>
  );
}
