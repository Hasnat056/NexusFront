import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiFormErrors } from "../lib/api";
import { eligibleSemestersForAllocation } from "../lib/allocationEligibility";
import type { AdminClass, AdminCourseAllocationSummary, AdminFacultyListItem, AdminSemester, AdminSession } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonCreatePage.module.css";

export function AllocationCreatePage() {
  const navigate = useNavigate();
  useAdminPageConfig("New allocation");
  const [faculty, setFaculty] = useState<AdminFacultyListItem[]>([]);
  const [semesters, setSemesters] = useState<AdminSemester[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState({ faculty: "", course: "", semester: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cached("admin:all-faculty", () => apiGetAllPages<AdminFacultyListItem>("/admin/faculty/")),
      apiGetAllPages<AdminSemester>("/admin/semesters/"),
      cached("admin:sessions", () => apiGetAllPages<AdminSession>("/admin/sessions/")),
      cached("admin:classes", () => apiGetAllPages<AdminClass>("/admin/classes/")),
    ])
      .then(([facultyRes, semestersRes, sessionsRes, classesRes]) => {
        if (cancelled) return;
        setFaculty(facultyRes);
        setSemesters(semestersRes);
        setSessions(sessionsRes);
        setClasses(classesRes);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) navigate("/login", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const eligibleSemesters = useMemo(() => eligibleSemestersForAllocation(semesters, sessions, classes), [semesters, sessions, classes]);
  const selectedSemester = eligibleSemesters.find((s) => String(s.semesterId) === value.semester);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const record = await apiMutate<AdminCourseAllocationSummary>("/admin/allocations/", "POST", {
        faculty: value.faculty,
        course: value.course,
        semester: Number(value.semester),
      });
      invalidateCache("admin:allocations");
      navigate(`/admin/allocations/${record.allocation_id}`);
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
          { label: "Allocations", href: "/admin/allocations" },
          { label: "New allocation" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New allocation</h1>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        {!loaded ? (
          <p className={formStyles.hint}>Loading…</p>
        ) : eligibleSemesters.length === 0 ? (
          <p className={formStyles.hint}>
            No semester is currently eligible. Three things have to line up: a session with an
            activation deadline set (Sessions), that session assigned to a blank semester on a class
            (Classes), and that semester's own activation deadline set too (Semesters).
          </p>
        ) : (
          <>
            <div className={formStyles.row}>
              <div className={formStyles.field} data-invalid={fieldErrors.faculty ? "true" : undefined}>
                <label htmlFor="faculty">Faculty</label>
                <select id="faculty" value={value.faculty} onChange={(e) => setValue({ ...value, faculty: e.target.value })} required>
                  <option value="">Select faculty…</option>
                  {faculty.map((f) => (
                    <option key={f.person.person_id} value={f.person.person_id}>
                      {f.person.person_id} — {f.person.first_name} {f.person.last_name}
                    </option>
                  ))}
                </select>
                {fieldErrors.faculty && <span className={formStyles.fieldError}>{fieldErrors.faculty}</span>}
              </div>
              <div className={formStyles.field} data-invalid={fieldErrors.semester ? "true" : undefined}>
                <label htmlFor="semester">Semester</label>
                <select
                  id="semester"
                  value={value.semester}
                  onChange={(e) => setValue({ ...value, semester: e.target.value, course: "" })}
                  required
                >
                  <option value="">Select semester…</option>
                  {eligibleSemesters.map((s) => (
                    <option key={s.semesterId} value={s.semesterId}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.semester && <span className={formStyles.fieldError}>{fieldErrors.semester}</span>}
              </div>
              <div className={formStyles.field} data-invalid={fieldErrors.course ? "true" : undefined}>
                <label htmlFor="course">Course</label>
                <select
                  id="course"
                  value={value.course}
                  onChange={(e) => setValue({ ...value, course: e.target.value })}
                  disabled={!selectedSemester}
                  required
                >
                  <option value="">{selectedSemester ? "Select course…" : "Pick a semester first"}</option>
                  {selectedSemester?.courseCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                {fieldErrors.course && <span className={formStyles.fieldError}>{fieldErrors.course}</span>}
              </div>
            </div>

            <div className={formStyles.actions}>
              <button type="submit" className={formStyles.primaryButton} disabled={submitting}>
                {submitting ? "Creating…" : "Create allocation"}
              </button>
              <Link to="/admin/allocations" className={formStyles.secondaryButton}>
                Cancel
              </Link>
            </div>
          </>
        )}
      </form>
    </>
  );
}
