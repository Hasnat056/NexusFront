import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { STUDENT_RAIL_ITEMS } from "../components/layout/studentRailItems";
import { Panel } from "../components/ui/Panel";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import { useToast } from "../components/ui/ToastContext";
import {
  STUDENT_LOCKED_PERSON_FIELDS,
  studentProfileFormValueFromRecord,
  type StudentProfileFormValue,
} from "../data/studentProfile";
import { nonBlankQualificationIndices } from "../data/qualificationForm";
import { apiGet, apiMutate, apiMutateForm } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors, remapListFieldErrors, splitFieldErrors } from "../lib/api";
import type { StudentProfileDetail } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

export function StudentProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [record, setRecord] = useState<StudentProfileDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<StudentProfileFormValue | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<StudentProfileDetail>("/student/profile/")
      .then((res) => {
        if (!cancelled) setRecord(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setLoadError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, refreshKey]);

  function startEditing() {
    if (!record) return;
    setFormValue(studentProfileFormValueFromRecord(record));
    setImageFile(null);
    setEditing(true);
    setSaveError(null);
    setFieldErrors({});
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue) return;
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    try {
      // StudentProfileView.put() is a full update — StudentSerializer locks the identity fields
      // (first/last name, father_name, cnic, dob, gender, institutional_email) plus program/
      // student_class/admission_date/status read_only whenever the caller is in the Student
      // group, so none of those are sent.
      await apiMutate<StudentProfileDetail>("/student/profile/", "PUT", {
        person: {
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
      });

      if (imageFile) {
        const form = new FormData();
        form.append("person.image", imageFile);
        form.append("person.contact_number", formValue.contact_number);
        await apiMutateForm<StudentProfileDetail>("/student/profile/", "PUT", form);
      }

      setEditing(false);
      showToast("Profile updated.");
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

  const avatarInitials = record ? `${record.person.first_name[0]}${record.person.last_name[0]}`.toUpperCase() : "—";

  if (loadError) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="profile" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials="—" pageTitle="My profile" subtitle="">
        <div className={formStyles.errorBanner}>{loadError}</div>
      </DashboardShell>
    );
  }

  if (!record) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="profile" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials="—" pageTitle="My profile" subtitle="">
        <p className={styles.notFound}>Loading profile…</p>
      </DashboardShell>
    );
  }

  const { matched: personFieldErrors } = splitFieldErrors(fieldErrors, "person");

  return (
    <DashboardShell
      railItems={STUDENT_RAIL_ITEMS}
      activeRailId="profile"
      homeHref="/student/dashboard"
      profileHref="/student/profile"
      avatarInitials={avatarInitials}
      avatarSrc={record.person.image}
      pageTitle={editing ? "Edit profile" : "My profile"}
      subtitle={record.person.institutional_email}
    >
      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          {saveError && <div className={formStyles.errorBanner}>{saveError}</div>}

          <PersonFormFields
            value={formValue}
            onChange={setFormValue}
            isCreate={false}
            lockedFields={STUDENT_LOCKED_PERSON_FIELDS}
            onImageFile={setImageFile}
            fieldErrors={personFieldErrors}
          />

          <h3 className={formStyles.sectionTitle}>Enrollment</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="program">Program</label>
              <input id="program" value={record.program} readOnly />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="admission_date">Admission date</label>
              <input id="admission_date" value={record.admission_date} readOnly />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="status">Status</label>
              <input id="status" value={record.status} readOnly />
            </div>
          </div>
          <span className={formStyles.hint}>
            Program, class, admission date, and status are locked — the serializer marks them
            read_only when a student edits their own record.
          </span>

          <div className={formStyles.actions}>
            <button type="submit" className={formStyles.primaryButton} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className={formStyles.secondaryButton} onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>{record.person.image ? <img src={record.person.image} alt="" /> : avatarInitials}</div>
            <div className={styles.profileMain}>
              <h1 className={styles.name}>
                {record.person.first_name} {record.person.last_name}
              </h1>
              <p className={styles.subline}>
                {record.person.person_id} · {record.program} · {record.status}
              </p>
            </div>
            <div className={formStyles.actions}>
              <button type="button" className={formStyles.secondaryButton} onClick={startEditing}>
                Edit
              </button>
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

          <Panel title="Enrollment">
            <dl className={styles.fields}>
              <dt>Program</dt>
              <dd>{record.program}</dd>
              <dt>Class</dt>
              <dd>#{record.student_class}</dd>
              <dt>Admission date</dt>
              <dd>{record.admission_date}</dd>
              <dt>Status</dt>
              <dd>{record.status}</dd>
            </dl>
          </Panel>
        </>
      )}
    </DashboardShell>
  );
}
