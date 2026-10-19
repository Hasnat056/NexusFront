import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { FACULTY_RAIL_ITEMS } from "../components/layout/facultyRailItems";
import { Panel } from "../components/ui/Panel";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import { useToast } from "../components/ui/ToastContext";
import {
  FACULTY_LOCKED_PERSON_FIELDS,
  facultyProfileFormValueFromRecord,
  type FacultyProfileFormValue,
} from "../data/facultyProfile";
import { nonBlankQualificationIndices } from "../data/qualificationForm";
import { apiGet, apiMutate, apiMutateForm } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors, remapListFieldErrors, splitFieldErrors } from "../lib/api";
import type { FacultyProfileDetail } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

export function FacultyProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [record, setRecord] = useState<FacultyProfileDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<FacultyProfileFormValue | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<FacultyProfileDetail>("/faculty/profile/")
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
    setFormValue(facultyProfileFormValueFromRecord(record));
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
      // FacultyProfileView.put() is a full update — FacultySerializer locks the identity fields
      // (first/last name, father_name, cnic, dob, gender, institutional_email, user) plus
      // department/designation/joining_date read_only whenever the caller is in the Faculty
      // group, so none of those are sent.
      await apiMutate<FacultyProfileDetail>("/faculty/profile/", "PUT", {
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
        await apiMutateForm<FacultyProfileDetail>("/faculty/profile/", "PUT", form);
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
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="profile"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials="—"
        pageTitle="My profile"
        subtitle=""
      >
        <div className={formStyles.errorBanner}>{loadError}</div>
      </DashboardShell>
    );
  }

  if (!record) {
    return (
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="profile"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials="—"
        pageTitle="My profile"
        subtitle=""
      >
        <p className={styles.notFound}>Loading profile…</p>
      </DashboardShell>
    );
  }

  const { matched: personFieldErrors } = splitFieldErrors(fieldErrors, "person");

  return (
    <DashboardShell
      railItems={FACULTY_RAIL_ITEMS}
      activeRailId="profile"
      homeHref="/faculty/dashboard"
      profileHref="/faculty/profile"
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
            lockedFields={FACULTY_LOCKED_PERSON_FIELDS}
            onImageFile={setImageFile}
            fieldErrors={personFieldErrors}
          />

          <h3 className={formStyles.sectionTitle}>Employment</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="department">Department</label>
              <input id="department" value={formValue.department} readOnly />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="designation">Designation</label>
              <input id="designation" value={formValue.designation} readOnly />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="joining_date">Joining date</label>
              <input id="joining_date" value={formValue.joining_date} readOnly />
            </div>
          </div>
          <span className={formStyles.hint}>
            Department, designation, and joining date are locked when a faculty member edits their
            own record.
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
                {record.person.person_id} · {record.designation} · {record.department}
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

          <Panel title="Employment">
            <dl className={styles.fields}>
              <dt>Department</dt>
              <dd>{record.department}</dd>
              <dt>Designation</dt>
              <dd>{record.designation}</dd>
              <dt>Joining date</dt>
              <dd>{record.joining_date}</dd>
            </dl>
          </Panel>
        </>
      )}
    </DashboardShell>
  );
}
