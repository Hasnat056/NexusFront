import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import type { AdminDepartment, AdminProgram } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonCreatePage.module.css";

interface ProgramFormValue {
  program_id: string;
  program_name: string;
  department: string;
  total_semesters: string;
  fee_per_semester: string;
}

export function ProgramCreatePage() {
  const navigate = useNavigate();
  useAdminPageConfig("New program");
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [value, setValue] = useState<ProgramFormValue>({
    program_id: "",
    program_name: "",
    department: "",
    total_semesters: "8",
    fee_per_semester: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cached("admin:departments", () => apiGetAllPages<AdminDepartment>("/admin/departments/"))
      .then((res) => {
        setDepartments(res);
        setValue((v) => (v.department ? v : { ...v, department: res[0]?.department_id ?? "" }));
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(apiErrorMessage(err));
      });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const record = await apiMutate<AdminProgram>("/admin/programs/", "POST", {
        program_id: value.program_id,
        program_name: value.program_name,
        department: value.department,
        total_semesters: Number(value.total_semesters) || 8,
        fee_per_semester: value.fee_per_semester ? Number(value.fee_per_semester) : null,
      });
      invalidateCache("admin:programs");
      navigate(`/admin/programs/${record.program_id}`);
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
          { label: "Programs", href: "/admin/programs" },
          { label: "New program" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New program</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/programs/ (AdminModule/views.py::ProgramListCreateAPIView) — unlike
          Faculty/Student, program_id has no server-side generation, so it's entered here directly.
        </p>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        <div className={formStyles.row}>
          <div className={formStyles.field} data-invalid={fieldErrors.program_id ? "true" : undefined}>
            <label htmlFor="program_id">Program ID</label>
            <input
              id="program_id"
              value={value.program_id}
              onChange={(e) => setValue({ ...value, program_id: e.target.value })}
              placeholder="CS-BS"
              required
            />
            {fieldErrors.program_id && <span className={formStyles.fieldError}>{fieldErrors.program_id}</span>}
          </div>
          <div className={formStyles.field} data-invalid={fieldErrors.program_name ? "true" : undefined}>
            <label htmlFor="program_name">Program name</label>
            <input
              id="program_name"
              value={value.program_name}
              onChange={(e) => setValue({ ...value, program_name: e.target.value })}
              required
            />
            {fieldErrors.program_name && <span className={formStyles.fieldError}>{fieldErrors.program_name}</span>}
          </div>
          <div className={formStyles.field} data-invalid={fieldErrors.department ? "true" : undefined}>
            <label htmlFor="department">Department</label>
            <select id="department" value={value.department} onChange={(e) => setValue({ ...value, department: e.target.value })}>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.department_name}
                </option>
              ))}
            </select>
            {fieldErrors.department && <span className={formStyles.fieldError}>{fieldErrors.department}</span>}
          </div>
        </div>
        <div className={formStyles.row}>
          <div className={formStyles.field} data-invalid={fieldErrors.total_semesters ? "true" : undefined}>
            <label htmlFor="total_semesters">Total semesters</label>
            <input
              id="total_semesters"
              inputMode="numeric"
              value={value.total_semesters}
              onChange={(e) => setValue({ ...value, total_semesters: e.target.value })}
            />
            {fieldErrors.total_semesters && <span className={formStyles.fieldError}>{fieldErrors.total_semesters}</span>}
          </div>
          <div className={formStyles.field} data-invalid={fieldErrors.fee_per_semester ? "true" : undefined}>
            <label htmlFor="fee_per_semester">Fee per semester</label>
            <input
              id="fee_per_semester"
              inputMode="numeric"
              value={value.fee_per_semester}
              onChange={(e) => setValue({ ...value, fee_per_semester: e.target.value })}
            />
            {fieldErrors.fee_per_semester && <span className={formStyles.fieldError}>{fieldErrors.fee_per_semester}</span>}
          </div>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primaryButton} disabled={submitting}>
            {submitting ? "Creating…" : "Create program"}
          </button>
          <Link to="/admin/programs" className={formStyles.secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
