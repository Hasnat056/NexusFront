import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import { STUDENT_STATUSES, emptyStudentFormValue } from "../data/studentDirectory";
import { apiGetAllPages, apiMutate, apiMutateForm, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiFormErrors, remapListFieldErrors, splitFieldErrors } from "../lib/api";
import { nonBlankQualificationIndices } from "../data/qualificationForm";
import type { AdminClass, AdminProgram, AdminStudentDetail, StudentStatus } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonCreatePage.module.css";

function classLabel(cls: Pick<AdminClass, "program" | "batch_year">): string {
  return `${cls.program}-${cls.batch_year ?? "?"}`;
}

export function StudentCreatePage() {
  const navigate = useNavigate();
  useAdminPageConfig("New student");
  const [value, setValue] = useState(emptyStudentFormValue());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [programs, setPrograms] = useState<AdminProgram[]>([]);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cached("admin:programs", () => apiGetAllPages<AdminProgram>("/admin/programs/")),
      cached("admin:classes", () => apiGetAllPages<AdminClass>("/admin/classes/")),
    ])
      .then(([programsRes, classesRes]) => {
        if (cancelled) return;
        setPrograms(programsRes);
        setClasses(classesRes);
        if (programsRes.length > 0) {
          const firstProgram = programsRes[0].program_id;
          const firstClass = classesRes.find((c) => c.program === firstProgram);
          setValue((v) =>
            v.program ? v : { ...v, program: firstProgram, student_class: firstClass?.class_id ?? v.student_class },
          );
        }
      })
      .catch(() => {
        // Non-fatal: the dropdowns just stay empty.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const classesForProgram = useMemo(() => classes.filter((c) => c.program === value.program), [classes, value.program]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.password !== value.confirm_password) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const created = await apiMutate<AdminStudentDetail>("/admin/students/", "POST", {
        person: {
          user: { password: value.password },
          first_name: value.first_name,
          last_name: value.last_name,
          father_name: value.father_name,
          gender: value.gender,
          dob: value.dob,
          cnic: value.cnic,
          institutional_email: value.institutional_email,
          personal_email: value.personal_email || null,
          contact_number: value.contact_number,
          religion: value.religion || null,
          address:
            value.address.country || value.address.city
              ? {
                  country: value.address.country,
                  province: value.address.province || null,
                  city: value.address.city,
                  zipcode: value.address.zipcode ? Number(value.address.zipcode) : null,
                  street_address: value.address.street_address || null,
                }
              : undefined,
          qualification_set: value.qualification_set
            .filter((q) => q.degree_title.trim() || q.institution.trim())
            .map((q) => ({
              degree_title: q.degree_title,
              education_board: q.education_board || null,
              passing_year: q.passing_year ? Number(q.passing_year) : null,
              institution: q.institution,
              total_marks: q.total_marks ? Number(q.total_marks) : null,
              obtained_marks: q.obtained_marks ? Number(q.obtained_marks) : null,
              is_current: q.is_current,
            })),
        },
        program: value.program,
        student_class: value.student_class,
        admission_date: value.admission_date,
        status: value.status,
      });

      const personId = created.person.person_id;
      if (imageFile) {
        const form = new FormData();
        form.append("person.image", imageFile);
        await apiMutateForm(`/admin/students/${personId}/`, "PATCH", form);
      }

      invalidateCache("admin:all-students");
      navigate(`/admin/students/${personId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      const { banner, fields } = apiFormErrors(err);
      setError(banner);
      setFieldErrors(remapListFieldErrors(fields, "person.qualification_set", nonBlankQualificationIndices(value.qualification_set)));
      setSubmitting(false);
    }
  }

  const { matched: personFieldErrors, rest: studentFieldErrors } = splitFieldErrors(fieldErrors, "person");

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Students", href: "/admin/students" },
          { label: "New student" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New student</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/students/ (AdminModule/views.py::StudentListCreateAPIView) — person_id and
          username are generated server-side, not entered here.
        </p>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        <PersonFormFields value={value} onChange={setValue} isCreate onImageFile={setImageFile} fieldErrors={personFieldErrors} />

        <h3 className={formStyles.sectionTitle}>Enrollment details</h3>
        <div className={formStyles.row}>
          <div className={formStyles.field} data-invalid={studentFieldErrors.program ? "true" : undefined}>
            <label htmlFor="program">Program</label>
            <select
              id="program"
              value={value.program}
              onChange={(e) => {
                const program = e.target.value;
                const firstClass = classes.find((c) => c.program === program);
                setValue({ ...value, program, student_class: firstClass?.class_id ?? value.student_class });
              }}
              disabled={programs.length === 0}
            >
              {programs.map((p) => (
                <option key={p.program_id} value={p.program_id}>
                  {p.program_name}
                </option>
              ))}
            </select>
            {studentFieldErrors.program && <span className={formStyles.fieldError}>{studentFieldErrors.program}</span>}
          </div>
          <div className={formStyles.field} data-invalid={studentFieldErrors.student_class ? "true" : undefined}>
            <label htmlFor="student_class">Class</label>
            <select
              id="student_class"
              value={value.student_class}
              onChange={(e) => setValue({ ...value, student_class: Number(e.target.value) })}
              disabled={classesForProgram.length === 0}
            >
              {classesForProgram.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {classLabel(c)}
                </option>
              ))}
            </select>
            {studentFieldErrors.student_class && <span className={formStyles.fieldError}>{studentFieldErrors.student_class}</span>}
          </div>
          <div className={formStyles.field} data-invalid={studentFieldErrors.status ? "true" : undefined}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={value.status}
              onChange={(e) => setValue({ ...value, status: e.target.value as StudentStatus })}
            >
              {STUDENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {studentFieldErrors.status && <span className={formStyles.fieldError}>{studentFieldErrors.status}</span>}
          </div>
          <div className={formStyles.field} data-invalid={studentFieldErrors.admission_date ? "true" : undefined}>
            <label htmlFor="admission_date">Admission date</label>
            <input
              id="admission_date"
              type="date"
              value={value.admission_date}
              onChange={(e) => setValue({ ...value, admission_date: e.target.value })}
              required
            />
            <span className={formStyles.hint}>Must fall within the current calendar year (StudentSerializer.validate_admission_date).</span>
            {studentFieldErrors.admission_date && <span className={formStyles.fieldError}>{studentFieldErrors.admission_date}</span>}
          </div>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primaryButton} disabled={submitting}>
            {submitting ? "Creating…" : "Create student"}
          </button>
          <Link to="/admin/students" className={formStyles.secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
