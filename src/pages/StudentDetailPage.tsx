import { useState } from "react";
import { useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { Tag } from "../components/ui/Tag";
import { PersonFormFields } from "../components/ui/PersonFormFields";
import {
  STUDENT_STATUSES,
  getStudentById,
  requestStudentDeletion,
  studentFormValueFromRecord,
  updateStudentRecord,
  type StudentFormValue,
} from "../data/studentDirectory";
import { CLASSES, PROGRAMS, classLabel } from "../data/academicStructure";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { AdminEnrollmentSummary } from "../types/api";
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

const ENROLLMENT_TONE: Record<AdminEnrollmentSummary["status"], StatusTone> = {
  Active: "good",
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
  { key: "result", header: "Result", render: (row) => (row.result ? `${row.result.obtained_marks} (GPA ${row.result.course_gpa})` : "—") },
];

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const record = studentId ? getStudentById(studentId) : undefined;
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<StudentFormValue | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!record) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="students"
        homeHref="/admin/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Student"
        sessionLabel={mockCurrentSession}
        subtitle={admin.institutional_email}
        profileHref="/admin/profile"
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Students", href: "/admin/students" },
            { label: studentId ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Student {studentId} was not found.</p>
      </DashboardShell>
    );
  }

  function startEditing() {
    setFormValue(studentFormValueFromRecord(record!));
    setEditing(true);
    setMessage(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue || !studentId) return;
    updateStudentRecord(studentId, formValue);
    setEditing(false);
    setMessage("Student record updated.");
  }

  function handleDeleteRequest() {
    if (!studentId) return;
    const result = requestStudentDeletion(studentId);
    setMessage(result.message);
  }

  const classesForProgram = formValue ? CLASSES.filter((c) => c.program === formValue.program) : [];
  const studentAvatarInitials = `${record.person.first_name[0]}${record.person.last_name[0]}`.toUpperCase();

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="students"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={editing ? "Edit student" : "Student"}
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Students", href: "/admin/students" },
          { label: `${record.person.first_name} ${record.person.last_name}` },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <PersonFormFields value={formValue} onChange={setFormValue} isCreate={false} />

          <h3 className={formStyles.sectionTitle}>Enrollment details</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="program">Program</label>
              <select
                id="program"
                value={formValue.program}
                onChange={(e) => {
                  const program = e.target.value;
                  const firstClass = CLASSES.find((c) => c.program === program);
                  setFormValue({ ...formValue, program, student_class: firstClass?.class_id ?? formValue.student_class });
                }}
              >
                {PROGRAMS.map((p) => (
                  <option key={p.program_id} value={p.program_id}>
                    {p.program_name}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="student_class">Class</label>
              <select
                id="student_class"
                value={formValue.student_class}
                onChange={(e) => setFormValue({ ...formValue, student_class: Number(e.target.value) })}
              >
                {classesForProgram.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {classLabel(c.class_id)}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formValue.status}
                onChange={(e) => setFormValue({ ...formValue, status: e.target.value as StudentFormValue["status"] })}
              >
                {STUDENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="admission_date">Admission date</label>
              <input
                id="admission_date"
                type="date"
                value={formValue.admission_date}
                onChange={(e) => setFormValue({ ...formValue, admission_date: e.target.value })}
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
        <>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>{studentAvatarInitials}</div>
            <div className={styles.profileMain}>
              <h1 className={styles.name}>
                {record.person.first_name} {record.person.last_name}
              </h1>
              <p className={styles.subline}>
                {record.person.person_id} · {record.program} · {classLabel(record.student_class)}
              </p>
              <Tag tone={STATUS_TONE[record.status]}>{record.status}</Tag>
              {record.pendingDeletion && <Tag tone="critical">Deletion pending confirmation</Tag>}
            </div>
            <div className={formStyles.actions}>
              <button type="button" className={formStyles.secondaryButton} onClick={startEditing}>
                Edit
              </button>
              <button
                type="button"
                className={formStyles.dangerButton}
                onClick={handleDeleteRequest}
                disabled={record.pendingDeletion}
              >
                Request deletion
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
        </>
      )}
    </DashboardShell>
  );
}

const STATUS_TONE: Record<string, StatusTone> = {
  Active: "good",
  Graduated: "good",
  "On Probation": "warning",
  Frozen: "warning",
  Dropped: "critical",
};
