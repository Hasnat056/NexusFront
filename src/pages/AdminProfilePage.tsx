import { useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import {
  ADMIN_LOCKED_PERSON_FIELDS,
  MARITAL_STATUSES,
  adminProfileFormValueFromRecord,
  mockAdminProfile,
  updateAdminProfile,
  type AdminProfileFormValue,
} from "../data/adminProfile";
import { mockCurrentSession } from "../data/session";
import type { AdminStatus } from "../types/api";
import type { StatusTone } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/admin/dashboard" },
  { id: "faculty", label: "Faculty", icon: IconPerson, href: "/admin/faculty" },
  { id: "students", label: "Students", icon: IconPeople, href: "/admin/students" },
  { id: "departments", label: "Departments", icon: IconBuilding, href: "/admin/departments" },
  { id: "programs", label: "Programs", icon: IconLayers, href: "/admin/programs" },
  { id: "courses", label: "Courses", icon: IconBook, href: "/admin/courses" },
  { id: "classes", label: "Classes", icon: IconGraduationCap, href: "/admin/classes" },
  { id: "allocations", label: "Allocations", icon: IconClipboard, href: "/admin/allocations" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/admin/enrollments" },
  { id: "sessions", label: "Sessions", icon: IconCalendar, href: "/admin/sessions" },
  { id: "semesters", label: "Semesters", icon: IconHourglass, href: "/admin/semesters" },
  { id: "transcripts", label: "Transcripts", icon: IconScroll, href: "/admin/transcripts" },
  { id: "requests", label: "Requests", icon: IconInbox, href: "/admin/requests" },
  { id: "reports", label: "Reports", icon: IconBars },
];

const STATUS_TONE: Record<AdminStatus, StatusTone> = {
  Active: "good",
  Acting: "warning",
  Suspended: "critical",
};

export function AdminProfilePage() {
  const record = mockAdminProfile;
  const avatarInitials = `${record.person.first_name[0]}${record.person.last_name[0]}`.toUpperCase();

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<AdminProfileFormValue | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function startEditing() {
    setFormValue(adminProfileFormValueFromRecord(record));
    setEditing(true);
    setMessage(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue) return;
    updateAdminProfile(formValue);
    setEditing(false);
    setMessage("Profile updated.");
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="profile"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={editing ? "Edit profile" : "My profile"}
      sessionLabel={mockCurrentSession}
      subtitle={record.person.institutional_email}
      profileHref="/admin/profile"
    >
      {message && <div className={formStyles.banner}>{message}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <PersonFormFields value={formValue} onChange={setFormValue} isCreate={false} lockedFields={ADMIN_LOCKED_PERSON_FIELDS} />

          <h3 className={formStyles.sectionTitle}>Admin details</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="marital_status">Marital status</label>
              <select
                id="marital_status"
                value={formValue.marital_status}
                onChange={(e) => setFormValue({ ...formValue, marital_status: e.target.value as AdminProfileFormValue["marital_status"] })}
              >
                {MARITAL_STATUSES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="office_location">Office location</label>
              <input
                id="office_location"
                value={formValue.office_location}
                onChange={(e) => setFormValue({ ...formValue, office_location: e.target.value })}
              />
            </div>
          </div>
          <span className={formStyles.hint}>
            Joining date, leaving date, and status are locked — AdminSerializer marks them read_only when an
            admin edits their own record.
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
                {record.person.person_id} · {record.marital_status ?? "—"} · {record.office_location ?? "No office on file"}
              </p>
              <Tag tone={STATUS_TONE[record.status]}>{record.status}</Tag>
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
    </DashboardShell>
  );
}
