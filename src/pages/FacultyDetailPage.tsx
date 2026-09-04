import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Select } from "../components/ui/Select";
import { Table, type Column } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import { useToast } from "../components/ui/ToastContext";
import { DESIGNATIONS, facultyFormValueFromRecord } from "../data/facultyDirectory";
import { apiGet, apiGetAllPages, apiMutate, apiMutateForm, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors, remapListFieldErrors, splitFieldErrors } from "../lib/api";
import { nonBlankQualificationIndices } from "../data/qualificationForm";
import type { AdminCourseAllocationSummary, AdminDepartment, AdminFacultyDetail } from "../types/api";
import type { FacultyFormValue } from "../data/facultyDirectory";
import type { StatusTone } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const ALLOCATION_TONE: Record<AdminCourseAllocationSummary["status"], StatusTone> = {
  Ongoing: "good",
  Completed: "good",
  Inactive: "warning",
  Cancelled: "critical",
};

const allocationColumns: Column<AdminCourseAllocationSummary>[] = [
  { key: "allocation_id", header: "Allocation", render: (row) => `ALLOC-${row.allocation_id}` },
  { key: "course", header: "Course", render: (row) => row.course },
  { key: "session", header: "Session", render: (row) => row.session },
  {
    key: "status",
    header: "Status",
    render: (row) => <Tag tone={ALLOCATION_TONE[row.status]}>{row.status}</Tag>,
  },
];

export function FacultyDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const viewPath = `/admin/faculty/${employeeId}`;
  const editing = location.pathname.endsWith("/edit");
  const [record, setRecord] = useState<AdminFacultyDetail | null>(null);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formValue, setFormValue] = useState<FacultyFormValue | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useAdminPageConfig(editing ? "Edit faculty" : "Faculty");

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    Promise.all([
      apiGet<AdminFacultyDetail>(`/admin/faculty/${employeeId}/`),
      cached("admin:departments", () => apiGetAllPages<AdminDepartment>("/admin/departments/")),
    ])
      .then(([recordRes, departmentsRes]) => {
        if (cancelled) return;
        setRecord(recordRes);
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
  }, [employeeId, navigate, refreshKey]);

  useEffect(() => {
    if (editing && record) {
      setFormValue(facultyFormValueFromRecord(record));
      setImageFile(null);
      setSaveError(null);
      setFieldErrors({});
    }
  }, [editing, record]);

  if (notFound) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Faculty", href: "/admin/faculty" },
            { label: employeeId ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Faculty member {employeeId} was not found.</p>
      </>
    );
  }

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!record) {
    return <p className={styles.notFound}>Loading faculty…</p>;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue || !employeeId) return;
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    try {
      await apiMutate(`/admin/faculty/${employeeId}/`, "PATCH", {
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
        department: formValue.department,
        designation: formValue.designation,
        joining_date: formValue.joining_date,
      });

      if (imageFile) {
        const form = new FormData();
        form.append("person.image", imageFile);
        await apiMutateForm(`/admin/faculty/${employeeId}/`, "PATCH", form);
      }

      invalidateCache("admin:all-faculty");
      navigate(viewPath);
      showToast("Faculty record updated.");
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

  const { matched: personFieldErrors, rest: facultyFieldErrors } = splitFieldErrors(fieldErrors, "person");

  const facultyAvatarInitials = `${record.person.first_name[0]}${record.person.last_name[0]}`.toUpperCase();

  return (
    <>
      <Breadcrumbs
        items={
          editing
            ? [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Faculty", href: "/admin/faculty" },
                { label: `${record.person.first_name} ${record.person.last_name}`, href: viewPath },
                { label: "Edit" },
              ]
            : [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "Faculty", href: "/admin/faculty" },
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

          <h3 className={formStyles.sectionTitle}>Faculty details</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field} data-invalid={facultyFieldErrors.department ? "true" : undefined}>
              <label htmlFor="department">Department</label>
              <Select
                id="department"
                value={formValue.department}
                onChange={(next) => setFormValue({ ...formValue, department: next })}
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
                value={formValue.designation}
                onChange={(next) => setFormValue({ ...formValue, designation: next as FacultyFormValue["designation"] })}
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
                value={formValue.joining_date}
                onChange={(e) => setFormValue({ ...formValue, joining_date: e.target.value })}
              />
              {facultyFieldErrors.joining_date && <span className={formStyles.fieldError}>{facultyFieldErrors.joining_date}</span>}
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
            <div className={styles.avatar}>{record.person.image ? <img src={record.person.image} alt="" /> : facultyAvatarInitials}</div>
            <div className={styles.profileMain}>
              <h1 className={styles.name}>
                {record.person.first_name} {record.person.last_name}
              </h1>
              <p className={styles.subline}>
                {record.person.person_id} · {record.designation} · {record.department}
              </p>
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
                <dt>Joining date</dt>
                <dd>{record.joining_date}</dd>
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

          <Panel title="Course allocations" hint={`${record.courseallocation_set.length} total`}>
            {record.courseallocation_set.length > 0 ? (
              <Table
                columns={allocationColumns}
                rows={record.courseallocation_set}
                rowKey={(row) => String(row.allocation_id)}
              />
            ) : (
              <p className={styles.empty}>No course allocations.</p>
            )}
          </Panel>

          <p className={formStyles.hint}>
            FacultyRetrieveUpdateAPIView only wires GET/PUT/PATCH — there's no DELETE route for a
            faculty record, so this app has no deletion action here (destroy_mixin exists on the
            view but nothing routes DELETE to it).
          </p>
        </>
      )}
    </>
  );
}
