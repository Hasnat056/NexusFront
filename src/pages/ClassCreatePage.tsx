import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Select } from "../components/ui/Select";
import { apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiFormErrors } from "../lib/api";
import type { AdminClass, AdminProgram } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonCreatePage.module.css";

export function ClassCreatePage() {
  const navigate = useNavigate();
  useAdminPageConfig("New class");
  const [programs, setPrograms] = useState<AdminProgram[]>([]);
  const [value, setValue] = useState({ program: "", batch_year: String(new Date().getFullYear()) });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cached("admin:programs", () => apiGetAllPages<AdminProgram>("/admin/programs/"))
      .then((res) => {
        setPrograms(res);
        setValue((v) => (v.program ? v : { ...v, program: res[0]?.program_id ?? "" }));
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login", { replace: true });
      });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const record = await apiMutate<AdminClass>("/admin/classes/", "POST", {
        program: value.program,
        batch_year: value.batch_year ? Number(value.batch_year) : null,
      });
      invalidateCache("admin:classes");
      navigate(`/admin/classes/${record.class_id}`);
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
          { label: "Classes", href: "/admin/classes" },
          { label: "New class" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New class</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/classes/ (AdminModule/views.py::ClassListCreateAPIView) — only
          program and batch year are set here. ClassSerializer.create() ignores scheme_of_studies
          entirely and instead auto-generates a blank semester for each of the program's
          total_semesters; you'll assign sessions and courses to those on the class's own page.
        </p>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        <div className={formStyles.row}>
          <div className={formStyles.field} data-invalid={fieldErrors.program ? "true" : undefined}>
            <label htmlFor="program">Program</label>
            <Select
              id="program"
              value={value.program}
              onChange={(next) => setValue({ ...value, program: next })}
              placeholder="Select a program…"
              invalid={Boolean(fieldErrors.program)}
              options={programs.map((p) => ({ value: p.program_id, label: `${p.program_id} — ${p.program_name}` }))}
            />
            {fieldErrors.program && <span className={formStyles.fieldError}>{fieldErrors.program}</span>}
          </div>
          <div className={formStyles.field} data-invalid={fieldErrors.batch_year ? "true" : undefined}>
            <label htmlFor="batch_year">Batch year</label>
            <input
              id="batch_year"
              inputMode="numeric"
              value={value.batch_year}
              onChange={(e) => setValue({ ...value, batch_year: e.target.value })}
              required
            />
            {fieldErrors.batch_year && <span className={formStyles.fieldError}>{fieldErrors.batch_year}</span>}
          </div>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primaryButton} disabled={submitting}>
            {submitting ? "Creating…" : "Create class"}
          </button>
          <Link to="/admin/classes" className={formStyles.secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
