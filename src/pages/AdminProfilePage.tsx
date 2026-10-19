import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Select } from "../components/ui/Select";
import { Tag } from "../components/ui/Tag";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import { useToast } from "../components/ui/ToastContext";
import { ADMIN_LOCKED_PERSON_FIELDS, MARITAL_STATUSES, adminProfileFormValueFromRecord, type AdminProfileFormValue } from "../data/adminProfile";
import { apiGet, apiMutate, apiMutateForm } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFormErrors, remapListFieldErrors, splitFieldErrors } from "../lib/api";
import { nonBlankQualificationIndices } from "../data/qualificationForm";
import type { AdminSelfProfile, AdminStatus } from "../types/api";
import type { StatusTone } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const STATUS_TONE: Record<AdminStatus, StatusTone> = {
  Active: "good",
  Acting: "warning",
  Suspended: "critical",
};

export function AdminProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  // Edit mode is a real URL (/admin/profile/edit), not local state — so the breadcrumb, browser
  // Back, and a refresh all agree on whether you're editing (see FacultyDetailPage etc. for the
  // same pattern, established after the state-only version broke all three).
  const editing = location.pathname.endsWith("/edit");
  const [record, setRecord] = useState<AdminSelfProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formValue, setFormValue] = useState<AdminProfileFormValue | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useAdminPageConfig(editing ? "Edit profile" : "My profile");

  useEffect(() => {
    let cancelled = false;
    apiGet<AdminSelfProfile>("/admin/profile/")
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

  // Populates the form whenever the URL lands on /edit — covers clicking "Edit", a direct link,
  // and a refresh while already on the edit URL (record arrives a tick later than the route does).
  useEffect(() => {
    if (editing && record) {
      setFormValue(adminProfileFormValueFromRecord(record));
      setImageFile(null);
      setSaveError(null);
      setFieldErrors({});
    }
  }, [editing, record]);

  if (loadError) {
    return <div className={formStyles.errorBanner}>{loadError}</div>;
  }

  if (!record) {
    return <p className={styles.notFound}>Loading profile…</p>;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue) return;
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    try {
      // AdminProfileAPIView.put() is a full update, not partial (no PATCH route at all) — but
      // AdminSerializer.get_fields() locks first_name/last_name/father_name/person_id/
      // institutional_email/cnic/gender/dob/user read_only whenever the caller is in the Admin
      // group, which is always true here, so none of those need to be (or can be) sent.
      const updated = await apiMutate<AdminSelfProfile>("/admin/profile/", "PUT", {
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
        marital_status: formValue.marital_status,
        office_location: formValue.office_location || null,
      });

      if (imageFile) {
        // Also a full PUT, so person.contact_number (the one non-locked, non-optional Person
        // field) has to travel again here even though only the image actually changed.
        const form = new FormData();
        form.append("person.image", imageFile);
        form.append("person.contact_number", updated.person.contact_number);
        form.append("marital_status", updated.marital_status ?? "");
        await apiMutateForm(`/admin/profile/`, "PUT", form);
      }

      navigate("/admin/profile");
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

  const { matched: personFieldErrors, rest: adminFieldErrors } = splitFieldErrors(fieldErrors, "person");

  const avatarInitials = `${record.person.first_name[0]}${record.person.last_name[0]}`.toUpperCase();

  return (
    <>
      <Breadcrumbs
        items={
          editing
            ? [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "My profile", href: "/admin/profile" },
                { label: "Edit profile" },
              ]
            : [
                { label: "Dashboard", href: "/admin/dashboard" },
                { label: "My profile" },
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
            lockedFields={ADMIN_LOCKED_PERSON_FIELDS}
            onImageFile={setImageFile}
            fieldErrors={personFieldErrors}
          />

          <h3 className={formStyles.sectionTitle}>Admin details</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field} data-invalid={adminFieldErrors.marital_status ? "true" : undefined}>
              <label htmlFor="marital_status">Marital status</label>
              <Select
                id="marital_status"
                value={formValue.marital_status}
                onChange={(next) =>
                  setFormValue({ ...formValue, marital_status: next as AdminProfileFormValue["marital_status"] })
                }
                placeholder="Select status…"
                invalid={Boolean(adminFieldErrors.marital_status)}
                options={MARITAL_STATUSES.map((m) => ({ value: m, label: m }))}
              />
              {adminFieldErrors.marital_status && <span className={formStyles.fieldError}>{adminFieldErrors.marital_status}</span>}
            </div>
            <div className={formStyles.field} data-invalid={adminFieldErrors.office_location ? "true" : undefined}>
              <label htmlFor="office_location">Office location</label>
              <input
                id="office_location"
                value={formValue.office_location}
                onChange={(e) => setFormValue({ ...formValue, office_location: e.target.value })}
              />
              {adminFieldErrors.office_location && <span className={formStyles.fieldError}>{adminFieldErrors.office_location}</span>}
            </div>
          </div>
          <span className={formStyles.hint}>
            Joining date, leaving date, and status are locked when an admin edits their own record.
          </span>

          <div className={formStyles.actions}>
            <button type="submit" className={formStyles.primaryButton} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              className={formStyles.secondaryButton}
              onClick={() => navigate("/admin/profile")}
              disabled={saving}
            >
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
                {record.person.person_id} · {record.office_location ?? "No office on file"}
              </p>
              <Tag tone={STATUS_TONE[record.status]}>{record.status}</Tag>
            </div>
            <div className={formStyles.actions}>
              <Link to="/admin/profile/edit" className={formStyles.secondaryButton}>
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
              <dt>Joining date</dt>
              <dd>{record.joining_date}</dd>
              <dt>Leaving date</dt>
              <dd>{record.leaving_date ?? "—"}</dd>
              <dt>Status</dt>
              <dd>{record.status}</dd>
            </dl>
          </Panel>
        </>
      )}
    </>
  );
}
