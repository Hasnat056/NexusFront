import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Select } from "../components/ui/Select";
import { Table, type Column } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import { useToast } from "../components/ui/ToastContext";
import { STUDENT_STATUSES, studentFormValueFromRecord } from "../data/studentDirectory";
import type { StudentFormValue } from "../data/studentDirectory";
import { apiGet, apiGetAllPages, apiMutate, apiMutateForm, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors, remapListFieldErrors, splitFieldErrors } from "../lib/api";
import { nonBlankQualificationIndices } from "../data/qualificationForm";
import type { AdminClass, AdminEnrollmentSummary, AdminProgram, AdminStudentDetail } from "../types/api";
import type { StatusTone } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

function classLabel(cls: Pick<AdminClass, "program" | "batch_year">): string {
  return `${cls.program}-${cls.batch_year ?? "?"}`;
}

const ENROLLMENT_TONE: Record<AdminEnrollmentSummary["status"], StatusTone> = {
  Active: "good",
  Locked: "warning",
  Completed: "good",
  Inactive: "warning",
  Dropped: "critical",
};

const enrollmentColumns: Column<AdminEnrollmentSummary>[] = [
  { key: "enrollment_id", header: "Enrollment", render: (row) => `#${row.enrollment_id}` },
  { key: "allocation", header: "Allocation", render: (row) => `ALLOC-${row.allocation}` },
  { key: "enrollment_date", header: "Enrolled", render: (row) => row.enrollment_date },
  {
    key: "status",
    header: "Status",
    render: (row) => <Tag tone={ENROLLMENT_TONE[row.status]}>{row.status}</Tag>,
  },
  {
    key: "result",
    header: "Result",
    render: (row) => (row.result?.course_gpa != null ? `${row.result.obtained_marks ?? "—"} (GPA ${row.result.course_gpa})` : "—"),
  },
];

const STATUS_TONE: Record<string, StatusTone> = {
  Active: "good",
  Graduated: "good",
  "On Probation": "warning",
  Frozen: "warning",
  Dropped: "critical",
};

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const viewPath = `/admin/students/${studentId}`;
  const editing = location.pathname.endsWith("/edit");
  const [record, setRecord] = useState<AdminStudentDetail | null>(null);
  const [programs, setPrograms] = useState<AdminProgram[]>([]);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formValue, setFormValue] = useState<StudentFormValue | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useAdminPageConfig(editing ? "Edit student" : "Student");

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    Promise.all([
      apiGet<AdminStudentDetail>(`/admin/students/${studentId}/`),
      cached("admin:programs", () => apiGetAllPages<AdminProgram>("/admin/programs/")),
      cached("admin:classes", () => apiGetAllPages<AdminClass>("/admin/classes/")),
    ])
      .then(([recordRes, programsRes, classesRes]) => {
        if (cancelled) return;
        setRecord(recordRes);
        setPrograms(programsRes);
        setClasses(classesRes);
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
  }, [studentId, navigate, refreshKey]);

  useEffect(() => {
    if (editing && record) {
      setFormValue(studentFormValueFromRecord(record));
      setImageFile(null);
      setSaveError(null);
      setFieldErrors({});
    }
  }, [editing, record]);

  const classesForProgram = useMemo(
    () => (formValue ? classes.filter((c) => c.program === formValue.program) : []),
    [classes, formValue],
  );

  if (notFound) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Students", href: "/admin/students" },
            { label: studentId ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Student {studentId} was not found.</p>
      </>
    );
  }

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!record) {
    return <p className={styles.notFound}>Loading student…</p>;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue || !studentId) return;
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    try {
      await apiMutate(`/admin/students/${studentId}/`, "PATCH", {
        person: {
          first_name: formValue.first_name,
          last_name: formValue.last_name,
          father_name: formValue.father_name,
          gender: formValue.gender,
          dob: formValue.dob,
          cnic: formValue.cnic,
          institutional_email: formValue.institutional_email,
          personal_email: formValue.personal_email || null,
          contact_number: formValue.contact_number,
          religion: formValue.religion || null,
          address: {
            country: formValue.address.country,
            province: formValue.address.province || null,
            city: formValue.address.city,
            zipcode: formValue.address.zipcode ? Number(formValue.address.zipcode) : null,
            street_address: formValue.address.street_address || null,
          },
          qualification_set: formValue.qualification_set
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
        program: formValue.program,
        student_class: formValue.student_class,
        admission_date: formValue.admission_date,
        status: formValue.status,
      });

      if (imageFile) {
        const form = new FormData();
        form.append("person.image", imageFile);
        await apiMutateForm(`/admin/students/${studentId}/`, "PATCH", form);
      }

      invalidateCache("admin:all-students");
      navigate(viewPath);
      showToast("Student record updated.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      const { banner, fields } = apiFormErrors(err);
      setSaveError(banner);
      setFieldErrors(remapListFieldErrors(fields, "person.qualification_set", nonBlankQualificationIndices(formValue.qualification_set)));
    } finally {
      setSaving(false);
    }
  }

  const { matched: personFieldErrors, rest: studentFieldErrors } = splitFieldErrors(fieldErrors, "person");

  const studentAvatarInitials = `${record.person.first_name[0]}${record.person.last_name[0]}`.toUpperCase();

  return (
    <>
      <Breadcrumbs
        items={
          editing
            ? [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Students", href: "/admin/students" },
                { label: `${record.person.first_name} ${record.person.last_name}`, href: viewPath },
                { label: "Edit" },
              ]
            : [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Students", href: "/admin/students" },
                { label: `${record.person.first_name} ${record.person.last_name}` },
              ]
        }
      />

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          {saveError && <div className={formStyles.errorBanner}>{saveError}</div>}

          <PersonFormFields
            value={formValue}
            onChange={setFormValue}
            isCreate={false}
            onImageFile={setImageFile}
            fieldErrors={personFieldErrors}
          />

          <h3 className={formStyles.sectionTitle}>Enrollment details</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field} data-invalid={studentFieldErrors.program ? "true" : undefined}>
              <label htmlFor="program">Program</label>
              <Select
                id="program"
                value={formValue.program}
                onChange={(program) => {
                  const firstClass = classes.find((c) => c.program === program);
                  setFormValue({ ...formValue, program, student_class: firstClass?.class_id ?? formValue.student_class });
                }}
                placeholder="Select a program…"
                invalid={Boolean(studentFieldErrors.program)}
                options={programs.map((p) => ({ value: p.program_id, label: p.program_name }))}
              />
              {studentFieldErrors.program && <span className={formStyles.fieldError}>{studentFieldErrors.program}</span>}
            </div>
            <div className={formStyles.field} data-invalid={studentFieldErrors.student_class ? "true" : undefined}>
              <label htmlFor="student_class">Class</label>
              <Select
                id="student_class"
                value={String(formValue.student_class)}
                onChange={(next) => setFormValue({ ...formValue, student_class: Number(next) })}
                placeholder="Select a class…"
                invalid={Boolean(studentFieldErrors.student_class)}
                options={classesForProgram.map((c) => ({ value: String(c.class_id), label: classLabel(c) }))}
              />
              {studentFieldErrors.student_class && <span className={formStyles.fieldError}>{studentFieldErrors.student_class}</span>}
            </div>
            <div className={formStyles.field} data-invalid={studentFieldErrors.status ? "true" : undefined}>
              <label htmlFor="status">Status</label>
              <Select
                id="status"
                value={formValue.status}
                onChange={(next) => setFormValue({ ...formValue, status: next as StudentFormValue["status"] })}
                placeholder="Select status…"
                invalid={Boolean(studentFieldErrors.status)}
                options={STUDENT_STATUSES.map((s) => ({ value: s, label: s }))}
              />
              {studentFieldErrors.status && <span className={formStyles.fieldError}>{studentFieldErrors.status}</span>}
            </div>
          </div>
          <div className={formStyles.row}>
            <div className={formStyles.field} data-invalid={studentFieldErrors.admission_date ? "true" : undefined}>
              <label htmlFor="admission_date">Admission date</label>
              <input
                id="admission_date"
                type="date"
                value={formValue.admission_date}
                onChange={(e) => setFormValue({ ...formValue, admission_date: e.target.value })}
              />
              {studentFieldErrors.admission_date && <span className={formStyles.fieldError}>{studentFieldErrors.admission_date}</span>}
            </div>
          </div>

          <div className={formStyles.actions}>
            <button type="submit" className={formStyles.primaryButton} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className={formStyles.secondaryButton} onClick={() => navigate(viewPath)} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>{record.person.image ? <img src={record.person.image} alt="" /> : studentAvatarInitials}</div>
            <div className={styles.profileMain}>
              <h1 className={styles.name}>
                {record.person.first_name} {record.person.last_name}
              </h1>
              <p className={styles.subline}>
                {record.person.person_id} · {record.program} · Class {record.student_class}
              </p>
              <Tag tone={STATUS_TONE[record.status]}>{record.status}</Tag>
            </div>
            <div className={formStyles.actions}>
              <Link to={`${viewPath}/edit`} className={formStyles.secondaryButton}>
                Edit
              </Link>
            </div>
          </div>

          <div className={styles.detailGrid}>
            <Panel title="Contact">
              <dl className={styles.fields}>
                <dt>Institutional email</dt>
                <dd>{record.person.institutional_email}</dd>
                <dt>Personal email</dt>
                <dd>{record.person.personal_email ?? "—"}</dd>
                <dt>Contact number</dt>
                <dd>{record.person.contact_number}</dd>
                <dt>Gender</dt>
                <dd>{record.person.gender}</dd>
                <dt>Date of birth</dt>
                <dd>{record.person.dob}</dd>
                <dt>CNIC</dt>
                <dd>{record.person.cnic}</dd>
                <dt>Admission date</dt>
                <dd>{record.admission_date}</dd>
              </dl>
            </Panel>

            <Panel title="Address">
              {record.person.address ? (
                <dl className={styles.fields}>
                  <dt>City</dt>
                  <dd>{record.person.address.city || "—"}</dd>
                  <dt>Province</dt>
                  <dd>{record.person.address.province ?? "—"}</dd>
                  <dt>Country</dt>
                  <dd>{record.person.address.country || "—"}</dd>
                  <dt>Street</dt>
                  <dd>{record.person.address.street_address ?? "—"}</dd>
                </dl>
              ) : (
                <p className={styles.empty}>No address on file.</p>
              )}
            </Panel>
          </div>

          <Panel title="Enrollments" hint={`${record.enrollment_set.length} total`}>
            {record.enrollment_set.length > 0 ? (
              <Table columns={enrollmentColumns} rows={record.enrollment_set} rowKey={(row) => String(row.enrollment_id)} />
            ) : (
              <p className={styles.empty}>No enrollments.</p>
            )}
          </Panel>

          <p className={formStyles.hint}>There's no way to delete a student record from here.</p>
        </>
      )}
    </>
  );
}
