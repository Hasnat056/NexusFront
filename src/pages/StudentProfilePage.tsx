import { useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconCalendar, IconGrid, IconPerson, IconScroll, IconTerminal, IconUserCheck } from "../components/icons/Icons";
import { Panel } from "../components/ui/Panel";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import {
  STUDENT_LOCKED_PERSON_FIELDS,
  mockStudentProfile,
  studentProfileFormValueFromRecord,
  updateStudentProfile,
  type StudentProfileFormValue,
} from "../data/studentProfile";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/student/dashboard" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/student/enrollments" },
  { id: "transcript", label: "Transcript", icon: IconScroll, href: "/student/transcript" },
  { id: "attendance", label: "Attendance", icon: IconCalendar, href: "/student/attendance" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/student/profile" },
  { id: "scratchpad", label: "Scratchpad", icon: IconTerminal, href: "/student/scratchpad" },
];

export function StudentProfilePage() {
  const record = mockStudentProfile;
  const avatarInitials = `${record.person.first_name[0]}${record.person.last_name[0]}`.toUpperCase();

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<StudentProfileFormValue | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function startEditing() {
    setFormValue(studentProfileFormValueFromRecord(record));
    setEditing(true);
    setMessage(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue) return;
    updateStudentProfile(formValue);
    setEditing(false);
    setMessage("Profile updated.");
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="profile"
      homeHref="/student/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={editing ? "Edit profile" : "My profile"}
      subtitle={record.person.institutional_email}
    >
      {message && <div className={formStyles.banner}>{message}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <PersonFormFields value={formValue} onChange={setFormValue} isCreate={false} lockedFields={STUDENT_LOCKED_PERSON_FIELDS} />

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
