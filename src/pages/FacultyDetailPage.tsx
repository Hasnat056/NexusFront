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
  DESIGNATIONS,
  facultyFormValueFromRecord,
  getFacultyById,
  requestFacultyDeletion,
  updateFacultyRecord,
  type FacultyFormValue,
} from "../data/facultyDirectory";
import { DEPARTMENTS } from "../data/academicStructure";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { AdminCourseAllocationSummary } from "../types/api";
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
  const record = employeeId ? getFacultyById(employeeId) : undefined;
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<FacultyFormValue | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!record) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="faculty"
        homeHref="/admin/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Faculty"
        sessionLabel={mockCurrentSession}
        subtitle={admin.institutional_email}
        profileHref="/admin/profile"
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Faculty", href: "/admin/faculty" },
            { label: employeeId ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Faculty member {employeeId} was not found.</p>
      </DashboardShell>
    );
  }

  function startEditing() {
    setFormValue(facultyFormValueFromRecord(record!));
    setEditing(true);
    setMessage(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue || !employeeId) return;
    updateFacultyRecord(employeeId, formValue);
    setEditing(false);
    setMessage("Faculty record updated.");
  }

  function handleDeleteRequest() {
    if (!employeeId) return;
    const result = requestFacultyDeletion(employeeId);
    setMessage(result.message);
  }

  const facultyAvatarInitials = `${record.person.first_name[0]}${record.person.last_name[0]}`.toUpperCase();

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="faculty"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={editing ? "Edit faculty" : "Faculty"}
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Faculty", href: "/admin/faculty" },
          { label: `${record.person.first_name} ${record.person.last_name}` },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <PersonFormFields value={formValue} onChange={setFormValue} isCreate={false} />

          <h3 className={formStyles.sectionTitle}>Faculty details</h3>
          <div className={formStyles.row}>
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
            <div className={formStyles.field}>
              <label htmlFor="designation">Designation</label>
              <select
                id="designation"
                value={formValue.designation}
                onChange={(e) => setFormValue({ ...formValue, designation: e.target.value as FacultyFormValue["designation"] })}
              >
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="joining_date">Joining date</label>
              <input
                id="joining_date"
                type="date"
                value={formValue.joining_date}
                onChange={(e) => setFormValue({ ...formValue, joining_date: e.target.value })}
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
            <div className={styles.avatar}>{facultyAvatarInitials}</div>
            <div className={styles.profileMain}>
              <h1 className={styles.name}>
                {record.person.first_name} {record.person.last_name}
              </h1>
              <p className={styles.subline}>
                {record.person.person_id} · {record.designation} · {record.department}
              </p>
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
        </>
      )}
    </DashboardShell>
  );
}
