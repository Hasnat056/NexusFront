import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import {
  IconScroll,
  IconHourglass,
  IconInbox,
  IconBars,
  IconBook,
  IconBuilding,
  IconCalendar,
  IconClipboard,
  IconGraduationCap,
  IconLayers,
  IconGrid,
  IconPeople,
  IconPerson,
  IconUserCheck,
} from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Tag } from "../components/ui/Tag";
import {
  ALLOCATION_STATUS_TONE,
  deleteAllocation,
  eligibleSemestersForAllocation,
  getAllocationById,
  isAllocationEditable,
  semesterRefById,
  updateAllocation,
  type AllocationFormValue,
} from "../data/allocationDirectory";
import { mockFacultyDirectory } from "../data/facultyDirectory";
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

export function AllocationDetailPage() {
  const { allocationId } = useParams<{ allocationId: string }>();
  const navigate = useNavigate();
  const record = allocationId ? getAllocationById(Number(allocationId)) : undefined;
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [editing, setEditing] = useState(false);
  const [formValue, setFormValue] = useState<AllocationFormValue | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!record) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="allocations"
        homeHref="/admin/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Allocation"
        sessionLabel={mockCurrentSession}
        subtitle={admin.institutional_email}
        profileHref="/admin/profile"
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Allocations", href: "/admin/allocations" },
            { label: allocationId ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Allocation {allocationId} was not found.</p>
      </DashboardShell>
    );
  }

  const semester = semesterRefById(record.semester);
  const editable = isAllocationEditable(record);
  const eligibleSemesters = eligibleSemestersForAllocation();
  const semesterChoices = semester && !eligibleSemesters.some((s) => s.semesterId === semester.semesterId)
    ? [semester, ...eligibleSemesters]
    : eligibleSemesters;
  const selectedSemester = formValue ? semesterRefById(Number(formValue.semester)) : undefined;

  function startEditing() {
    setFormValue({ faculty: record!.faculty, course: record!.course, semester: String(record!.semester) });
    setEditing(true);
    setMessage(null);
    setError(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formValue) return;
    const result = updateAllocation(record!.allocation_id, formValue);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    setEditing(false);
    setMessage("Allocation updated.");
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteAllocation(record!.allocation_id);
    navigate("/admin/allocations");
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="allocations"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={editing ? "Edit allocation" : "Allocation"}
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Allocations", href: "/admin/allocations" },
          { label: record.course },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}
      {error && <div className={formStyles.errorBanner}>{error}</div>}

      {editing && formValue ? (
        <form className={styles.editCard} onSubmit={handleSave}>
          <h3 className={formStyles.sectionTitle}>Allocation</h3>
          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <label htmlFor="faculty">Faculty</label>
              <select id="faculty" value={formValue.faculty} onChange={(e) => setFormValue({ ...formValue, faculty: e.target.value })}>
                {mockFacultyDirectory.map((f) => (
                  <option key={f.person.person_id} value={f.person.person_id}>
                    {f.person.person_id} — {f.person.first_name} {f.person.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="semester">Semester</label>
              <select
                id="semester"
                value={formValue.semester}
                onChange={(e) => setFormValue({ ...formValue, semester: e.target.value, course: "" })}
              >
                {semesterChoices.map((s) => (
                  <option key={s.semesterId} value={s.semesterId}>
                    {s.classLabel} · Semester {s.semesterNo}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.field}>
              <label htmlFor="course">Course</label>
              <select id="course" value={formValue.course} onChange={(e) => setFormValue({ ...formValue, course: e.target.value })}>
                <option value="">Select course…</option>
                {selectedSemester?.courseCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <span className={formStyles.hint}>
            Session and status aren't editable here — session is a copy taken from the semester at
            creation time, and status only ever moves outside this endpoint.
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
        <div className={styles.profileCard}>
          <div className={styles.profileMain}>
            <h1 className={styles.name}>
              {record.course} — {record.faculty}
            </h1>
            <p className={styles.subline}>
              Allocation #{record.allocation_id} · {semester ? `${semester.classLabel} · Semester ${semester.semesterNo}` : `Semester #${record.semester}`} · {record.session}
            </p>
          </div>
          <div className={formStyles.actions}>
            <Tag tone={ALLOCATION_STATUS_TONE[record.status]}>{record.status}</Tag>
            <button type="button" className={formStyles.secondaryButton} onClick={startEditing} disabled={!editable}>
              Edit
            </button>
            <button type="button" className={formStyles.dangerButton} onClick={handleDelete} disabled={!editable}>
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

      {!editing && !editable && (
        <p className={formStyles.hint}>
          Locked — AdminCourseAllocationPermissions only allows editing or deleting an allocation
          while its status is "Inactive"; once it moves to Ongoing, Completed, or Cancelled it's
          read-only for Admin.
        </p>
      )}
    </DashboardShell>
  );
}
