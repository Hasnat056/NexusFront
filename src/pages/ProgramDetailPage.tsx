import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconGrid, IconLayers, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { DEPARTMENTS } from "../data/academicStructure";
import {
  deleteProgram,
  getProgramById,
  programFormValueFromRecord,
  updateProgram,
  type ProgramFormValue,
} from "../data/programDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
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

export function ProgramDetailPage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const record = programId ? getProgramById(programId) : undefined;
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<ProgramFormValue | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!record) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="programs"
        homeHref="/admin/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Program"
        sessionLabel={mockCurrentSession}
        subtitle={admin.institutional_email}
        profileHref="/admin/profile"
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Programs", href: "/admin/programs" },
            { label: programId ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Program {programId} was not found.</p>
      </DashboardShell>
    );
  }

  function startEditing() {
    setFormValue(programFormValueFromRecord(record!));
    setEditing(true);
    setMessage(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue || !programId) return;
    updateProgram(programId, formValue);
    setEditing(false);
    setMessage("Program updated.");
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    if (!programId) return;
    deleteProgram(programId);
    navigate("/admin/programs");
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="programs"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={editing ? "Edit program" : "Program"}
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Programs", href: "/admin/programs" },
          { label: record.program_name },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <h3 className={formStyles.sectionTitle}>Program</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="program_id">Program ID</label>
              <input id="program_id" value={formValue.program_id} readOnly />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="program_name">Program name</label>
              <input
                id="program_name"
                value={formValue.program_name}
                onChange={(e) => setFormValue({ ...formValue, program_name: e.target.value })}
                required
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="department">Department</label>
              <select
                id="department"
                value={formValue.department}
                onChange={(e) => setFormValue({ ...formValue, department: e.target.value })}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="total_semesters">Total semesters</label>
              <input
                id="total_semesters"
                inputMode="numeric"
                value={formValue.total_semesters}
                onChange={(e) => setFormValue({ ...formValue, total_semesters: e.target.value })}
              />
            </div>
            <div className={formStyles.field}>
              <label htmlFor="fee_per_semester">Fee per semester</label>
              <input
                id="fee_per_semester"
                inputMode="numeric"
                value={formValue.fee_per_semester}
                onChange={(e) => setFormValue({ ...formValue, fee_per_semester: e.target.value })}
              />
            </div>
          </div>

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
        <div className={styles.profileCard}>
          <div className={styles.profileMain}>
            <h1 className={styles.name}>{record.program_name}</h1>
            <p className={styles.subline}>
              {record.program_id} · {record.department} · {record.total_semesters} semesters
            </p>
          </div>
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.secondaryButton} onClick={startEditing}>
              Edit
            </button>
            <button type="button" className={formStyles.dangerButton} onClick={handleDelete}>
              {confirmingDelete ? "Confirm delete" : "Delete"}
            </button>
            {confirmingDelete && (
              <button type="button" className={formStyles.secondaryButton} onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {!editing && (
        <Panel title="Fees">
          <dl className={styles.fields}>
            <dt>Fee per semester</dt>
            <dd>{record.fee_per_semester != null ? record.fee_per_semester.toLocaleString("en-US") : "—"}</dd>
          </dl>
        </Panel>
      )}
    </DashboardShell>
  );
}
