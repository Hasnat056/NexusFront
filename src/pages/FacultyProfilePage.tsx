import { useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconBook, IconGrid, IconPerson } from "../components/icons/Icons";
import { Panel } from "../components/ui/Panel";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import {
  FACULTY_LOCKED_PERSON_FIELDS,
  facultyProfileFormValueFromRecord,
  mockFacultyProfile,
  updateFacultyProfile,
  type FacultyProfileFormValue,
} from "../data/facultyProfile";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/faculty/dashboard" },
  { id: "allocations", label: "Allocations", icon: IconBook, href: "/faculty/allocations" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/faculty/profile" },
];

export function FacultyProfilePage() {
  const record = mockFacultyProfile;
  const avatarInitials = `${record.person.first_name[0]}${record.person.last_name[0]}`.toUpperCase();

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<FacultyProfileFormValue | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function startEditing() {
    setFormValue(facultyProfileFormValueFromRecord(record));
    setEditing(true);
    setMessage(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue) return;
    updateFacultyProfile(formValue);
    setEditing(false);
    setMessage("Profile updated.");
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="profile"
      homeHref="/faculty/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={editing ? "Edit profile" : "My profile"}
      subtitle={record.person.institutional_email}
    >
      {message && <div className={formStyles.banner}>{message}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <PersonFormFields value={formValue} onChange={setFormValue} isCreate={false} lockedFields={FACULTY_LOCKED_PERSON_FIELDS} />

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
            Department, designation, and joining date are locked — FacultySerializer marks them
            read_only when a faculty member edits their own record.
          </span>

          <div className={formStyles.actions}>
            <button type="submit" className={formStyles.primaryButton}>
              Save changes
            </button>
            <button type="button" className={formStyles.secondaryButton} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>{avatarInitials}</div>
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
