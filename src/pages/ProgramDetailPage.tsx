import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { useToast } from "../components/ui/ToastContext";
import { apiGet, apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors } from "../lib/api";
import type { AdminDepartment, AdminProgram } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

interface ProgramFormValue {
  program_id: string;
  program_name: string;
  department: string;
  total_semesters: string;
  fee_per_semester: string;
}

function formValueFromRecord(record: AdminProgram): ProgramFormValue {
  return {
    program_id: record.program_id,
    program_name: record.program_name,
    department: record.department,
    total_semesters: String(record.total_semesters),
    fee_per_semester: record.fee_per_semester ? String(record.fee_per_semester) : "",
  };
}

export function ProgramDetailPage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const viewPath = `/admin/programs/${programId}`;
  const editing = location.pathname.endsWith("/edit");
  const [record, setRecord] = useState<AdminProgram | null>(null);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formValue, setFormValue] = useState<ProgramFormValue | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useAdminPageConfig(editing ? "Edit program" : "Program");

  useEffect(() => {
    if (!programId) return;
    let cancelled = false;
    Promise.all([
      apiGet<AdminProgram>(`/admin/programs/${programId}/`),
      cached("admin:departments", () => apiGetAllPages<AdminDepartment>("/admin/departments/")),
    ])
      .then(([programRes, departmentsRes]) => {
        if (cancelled) return;
        setRecord(programRes);
        setDepartments(departmentsRes);
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
  }, [programId, navigate, refreshKey]);

  useEffect(() => {
    if (editing && record) {
      setFormValue(formValueFromRecord(record));
      setActionError(null);
      setFieldErrors({});
    }
  }, [editing, record]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue || !programId) return;
    setActionError(null);
    setFieldErrors({});
    try {
      await apiMutate<AdminProgram>(`/admin/programs/${programId}/`, "PATCH", {
        program_name: formValue.program_name,
        department: formValue.department,
        total_semesters: Number(formValue.total_semesters) || 8,
        fee_per_semester: formValue.fee_per_semester ? Number(formValue.fee_per_semester) : null,
      });
      invalidateCache("admin:programs");
      navigate(viewPath);
      showToast("Program updated.");
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
    if (!programId) return;
    setActionError(null);
    try {
      await apiMutate(`/admin/programs/${programId}/`, "DELETE");
      invalidateCache("admin:programs");
      navigate("/admin/programs");
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
            { label: "Programs", href: "/admin/programs" },
            { label: programId ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Program {programId} was not found.</p>
      </>
    );
  }

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!record) {
    return <p className={styles.empty}>Loading program…</p>;
  }

  return (
    <>
      <Breadcrumbs
        items={
          editing
            ? [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Programs", href: "/admin/programs" },
                { label: record.program_name, href: viewPath },
                { label: "Edit" },
              ]
            : [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Programs", href: "/admin/programs" },
                { label: record.program_name },
              ]
        }
      />

      {actionError && <div className={formStyles.errorBanner}>{actionError}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <h3 className={formStyles.sectionTitle}>Program</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="program_id">Program ID</label>
              <input id="program_id" value={formValue.program_id} readOnly />
            </div>
            <div className={formStyles.field} data-invalid={fieldErrors.program_name ? "true" : undefined}>
              <label htmlFor="program_name">Program name</label>
              <input
                id="program_name"
                value={formValue.program_name}
                onChange={(e) => setFormValue({ ...formValue, program_name: e.target.value })}
                required
              />
              {fieldErrors.program_name && <span className={formStyles.fieldError}>{fieldErrors.program_name}</span>}
            </div>
            <div className={formStyles.field} data-invalid={fieldErrors.department ? "true" : undefined}>
              <label htmlFor="department">Department</label>
              <select
                id="department"
                value={formValue.department}
                onChange={(e) => setFormValue({ ...formValue, department: e.target.value })}
              >
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
                value={formValue.total_semesters}
                onChange={(e) => setFormValue({ ...formValue, total_semesters: e.target.value })}
              />
              {fieldErrors.total_semesters && <span className={formStyles.fieldError}>{fieldErrors.total_semesters}</span>}
            </div>
            <div className={formStyles.field} data-invalid={fieldErrors.fee_per_semester ? "true" : undefined}>
              <label htmlFor="fee_per_semester">Fee per semester</label>
              <input
                id="fee_per_semester"
                inputMode="numeric"
                value={formValue.fee_per_semester}
                onChange={(e) => setFormValue({ ...formValue, fee_per_semester: e.target.value })}
              />
              {fieldErrors.fee_per_semester && <span className={formStyles.fieldError}>{fieldErrors.fee_per_semester}</span>}
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
            <h1 className={styles.name}>{record.program_name}</h1>
            <p className={styles.subline}>
              {record.program_id} · {record.department} · {record.total_semesters} semesters
            </p>
          </div>
          <div className={formStyles.actions}>
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
        <Panel title="Fees">
          <dl className={styles.fields}>
            <dt>Fee per semester</dt>
            <dd>{record.fee_per_semester != null ? record.fee_per_semester.toLocaleString("en-US") : "—"}</dd>
          </dl>
        </Panel>
      )}
    </>
  );
}
