import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import { Select } from "../components/ui/Select";
import { apiGetAllPages, apiMutate, apiMutateForm, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiFormErrors, remapListFieldErrors, splitFieldErrors } from "../lib/api";
import { nonBlankQualificationIndices } from "../data/qualificationForm";
import { DESIGNATIONS, emptyFacultyFormValue } from "../data/facultyDirectory";
import type { AdminDepartment, AdminFacultyDetail, FacultyDesignation } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonCreatePage.module.css";

export function FacultyCreatePage() {
  const navigate = useNavigate();
  useAdminPageConfig("New faculty");
  const [value, setValue] = useState(emptyFacultyFormValue());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    cached("admin:departments", () => apiGetAllPages<AdminDepartment>("/admin/departments/"))
      .then((res) => {
        if (cancelled) return;
        setDepartments(res);
        if (res.length > 0) setValue((v) => (v.department ? v : { ...v, department: res[0].department_id }));
      })
      .catch(() => {
        // Non-fatal: the dropdown just stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      const created = await apiMutate<AdminFacultyDetail>("/admin/faculty/", "POST", {
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
        department: value.department,
        designation: value.designation,
        joining_date: value.joining_date,
      });

      const personId = created.person.person_id;
      if (imageFile) {
        const form = new FormData();
        form.append("person.image", imageFile);
        await apiMutateForm(`/admin/faculty/${personId}/`, "PATCH", form);
      }

      invalidateCache("admin:all-faculty");
      navigate(`/admin/faculty/${personId}`);
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

  const { matched: personFieldErrors, rest: facultyFieldErrors } = splitFieldErrors(fieldErrors, "person");

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Faculty", href: "/admin/faculty" },
          { label: "New faculty" },
        ]}
      />

      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.headline}>New faculty member</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/faculty/ (AdminModule/views.py::FacultyListCreateAPIView) — person_id and
          username are generated server-side, not entered here.
        </p>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        <PersonFormFields value={value} onChange={setValue} isCreate onImageFile={setImageFile} fieldErrors={personFieldErrors} />

        <h3 className={formStyles.sectionTitle}>Faculty details</h3>
        <div className={formStyles.row}>
          <div className={formStyles.field} data-invalid={facultyFieldErrors.department ? "true" : undefined}>
            <label htmlFor="department">Department</label>
            <Select
              id="department"
              value={value.department}
              onChange={(next) => setValue({ ...value, department: next })}
              disabled={departments.length === 0}
              placeholder="Select a department…"
              invalid={Boolean(facultyFieldErrors.department)}
              options={departments.map((d) => ({ value: d.department_id, label: d.department_name }))}
            />
            {facultyFieldErrors.department && <span className={formStyles.fieldError}>{facultyFieldErrors.department}</span>}
          </div>
          <div className={formStyles.field} data-invalid={facultyFieldErrors.designation ? "true" : undefined}>
            <label htmlFor="designation">Designation</label>
            <Select
              id="designation"
              value={value.designation}
              onChange={(next) => setValue({ ...value, designation: next as FacultyDesignation })}
              placeholder="Select designation…"
              invalid={Boolean(facultyFieldErrors.designation)}
              options={DESIGNATIONS.map((d) => ({ value: d, label: d }))}
            />
            {facultyFieldErrors.designation && <span className={formStyles.fieldError}>{facultyFieldErrors.designation}</span>}
          </div>
          <div className={formStyles.field} data-invalid={facultyFieldErrors.joining_date ? "true" : undefined}>
            <label htmlFor="joining_date">Joining date</label>
            <input
              id="joining_date"
              type="date"
              value={value.joining_date}
              onChange={(e) => setValue({ ...value, joining_date: e.target.value })}
              required
            />
            {facultyFieldErrors.joining_date && <span className={formStyles.fieldError}>{facultyFieldErrors.joining_date}</span>}
          </div>
        </div>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primaryButton} disabled={submitting}>
            {submitting ? "Creating…" : "Create faculty"}
          </button>
          <Link to="/admin/faculty" className={formStyles.secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
